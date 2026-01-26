import { queryAll, queryOne, run, runWithId, getDb } from '../database/db';

// Types
interface DoctorCommission {
    id: number;
    invoice_id: number;
    invoice_item_id: number | null;
    doctor_id: number;
    patient_id: number;
    test_id: number | null;
    test_description: string | null;
    commission_model: 'PERCENTAGE' | 'FLAT';
    commission_rate: number;
    test_price: number;
    commission_amount: number;
    calculated_at: string;
    settlement_id: number | null;
    is_cancelled: number;
}

interface CommissionSettlement {
    id: number;
    doctor_id: number;
    period_month: number;
    period_year: number;
    total_commission: number;
    paid_amount: number;
    payment_status: 'PENDING' | 'PARTIALLY_PAID' | 'PAID';
    payment_date: string | null;
    payment_mode: string | null;
    payment_reference: string | null;
    remarks: string | null;
    created_at: string;
}

interface CommissionStatementItem {
    patient_name: string;
    patient_uid: string;
    invoice_number: string;
    invoice_date: string;
    test_description: string;
    test_price: number;
    commission_amount: number;
}

// ==================== COMMISSION CALCULATION ====================

/**
 * Calculate and record commission for an invoice
 * This is called automatically when an invoice is created
 */
export function calculateAndRecordCommission(
    invoiceId: number,
    doctorId: number,
    patientId: number
): { success: boolean; totalCommission?: number; error?: string } {
    try {
        // Get doctor commission configuration
        const doctor = queryOne<{
            id: number;
            commission_model: string;
            commission_rate: number;
        }>('SELECT id, commission_model, commission_rate FROM doctors WHERE id = ?', [doctorId]);

        if (!doctor) {
            return { success: false, error: 'Doctor not found' };
        }

        if (doctor.commission_model === 'NONE' || doctor.commission_rate === 0) {
            // No commission for this doctor
            return { success: true, totalCommission: 0 };
        }

        // Get invoice items (each test)
        const invoiceItems = queryAll<{
            id: number;
            test_id: number | null;
            description: string;
            unit_price: number;
        }>(`
      SELECT id, test_id, description, unit_price
      FROM invoice_items
      WHERE invoice_id = ?
    `, [invoiceId]);

        if (invoiceItems.length === 0) {
            return { success: false, error: 'No invoice items found' };
        }

        let totalCommission = 0;

        // Calculate commission for each test
        for (const item of invoiceItems) {
            let commissionAmount = 0;

            if (doctor.commission_model === 'PERCENTAGE') {
                commissionAmount = (item.unit_price * doctor.commission_rate) / 100;
            } else if (doctor.commission_model === 'FLAT') {
                commissionAmount = doctor.commission_rate;
            }

            // Record commission for this test
            run(`
        INSERT INTO doctor_commissions (
          invoice_id, invoice_item_id, doctor_id, patient_id, test_id,
          test_description, commission_model, commission_rate,
          test_price, commission_amount
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
                invoiceId,
                item.id,
                doctorId,
                patientId,
                item.test_id,
                item.description,
                doctor.commission_model,
                doctor.commission_rate,
                item.unit_price,
                commissionAmount
            ]);

            totalCommission += commissionAmount;
        }

        // Log audit
        run(`
      INSERT INTO audit_log (entity, entity_id, action, new_value, performed_at)
      VALUES ('commission', ?, 'CALCULATE', ?, datetime('now'))
    `, [invoiceId, JSON.stringify({ doctorId, totalCommission })]);

        return { success: true, totalCommission };
    } catch (error: any) {
        console.error('Calculate commission error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Reverse commission when an invoice is cancelled
 */
export function reverseCommission(invoiceId: number): { success: boolean; error?: string } {
    try {
        run(`
      UPDATE doctor_commissions
      SET is_cancelled = 1
      WHERE invoice_id = ?
    `, [invoiceId]);

        // Log audit
        run(`
      INSERT INTO audit_log (entity, entity_id, action, performed_at)
      VALUES ('commission', ?, 'REVERSE', datetime('now'))
    `, [invoiceId]);

        return { success: true };
    } catch (error: any) {
        console.error('Reverse commission error:', error);
        return { success: false, error: error.message };
    }
}

// ==================== COMMISSION QUERIES ====================

/**
 * Get all commissions for a doctor (optionally filtered by period)
 */
export function getDoctorCommissions(
    doctorId: number,
    month?: number,
    year?: number
): DoctorCommission[] {
    let sql = `
    SELECT dc.*
    FROM doctor_commissions dc
    JOIN invoices i ON dc.invoice_id = i.id
    WHERE dc.doctor_id = ? AND dc.is_cancelled = 0
  `;
    const params: any[] = [doctorId];

    if (month !== undefined && year !== undefined) {
        sql += ` AND CAST(strftime('%m', i.created_at) AS INTEGER) = ?`;
        sql += ` AND CAST(strftime('%Y', i.created_at) AS INTEGER) = ?`;
        params.push(month, year);
    }

    sql += ` ORDER BY i.created_at DESC`;

    return queryAll<DoctorCommission>(sql, params);
}

/**
 * Get monthly commission summary for a doctor
 */
export function getMonthlyCommissionSummary(
    doctorId: number,
    month: number,
    year: number
): {
    totalCommission: number;
    testCount: number;
    patientCount: number;
    invoiceCount: number;
} {
    const summary = queryOne<{
        total_commission: number;
        test_count: number;
        patient_count: number;
        invoice_count: number;
    }>(`
    SELECT 
      COALESCE(SUM(dc.commission_amount), 0) as total_commission,
      COUNT(dc.id) as test_count,
      COUNT(DISTINCT dc.patient_id) as patient_count,
      COUNT(DISTINCT dc.invoice_id) as invoice_count
    FROM doctor_commissions dc
    JOIN invoices i ON dc.invoice_id = i.id
    WHERE dc.doctor_id = ?
      AND dc.is_cancelled = 0
      AND CAST(strftime('%m', i.created_at) AS INTEGER) = ?
      AND CAST(strftime('%Y', i.created_at) AS INTEGER) = ?
  `, [doctorId, month, year]);

    return {
        totalCommission: summary?.total_commission || 0,
        testCount: summary?.test_count || 0,
        patientCount: summary?.patient_count || 0,
        invoiceCount: summary?.invoice_count || 0
    };
}

/**
 * Get detailed commission statement for a doctor (month/year)
 * Returns list of patients, tests, and commission per test
 */
export function getCommissionStatement(
    doctorId: number,
    month: number,
    year: number
): {
    doctor: {
        id: number;
        name: string;
        doctor_code: string;
        commission_model: string;
        commission_rate: number;
    } | null;
    period: { month: number; year: number };
    summary: {
        totalCommission: number;
        testCount: number;
        patientCount: number;
        invoiceCount: number;
    };
    items: CommissionStatementItem[];
    settlement: { id: number; paid_amount: number; payment_status: string } | null;
    payments: any[];
} {
    // Get doctor info
    const doctor = queryOne<{
        id: number;
        name: string;
        doctor_code: string;
        commission_model: string;
        commission_rate: number;
    }>(`
    SELECT id, name, doctor_code, commission_model, commission_rate
    FROM doctors
    WHERE id = ?
  `, [doctorId]);

    // Get summary
    const summary = getMonthlyCommissionSummary(doctorId, month, year);

    // Get detailed items (each test for each patient)
    const items = queryAll<CommissionStatementItem>(`
    SELECT 
      p.full_name as patient_name,
      p.patient_uid,
      i.invoice_number,
      i.created_at as invoice_date,
      dc.test_description,
      dc.test_price,
      dc.commission_amount
    FROM doctor_commissions dc
    JOIN invoices i ON dc.invoice_id = i.id
    JOIN patients p ON dc.patient_id = p.id
    WHERE dc.doctor_id = ?
      AND dc.is_cancelled = 0
      AND CAST(strftime('%m', i.created_at) AS INTEGER) = ?
      AND CAST(strftime('%Y', i.created_at) AS INTEGER) = ?
    ORDER BY i.created_at ASC, p.full_name ASC, dc.test_description ASC
  `, [doctorId, month, year]);

    // Get settlement and payments
    let settlement = null;
    let payments: any[] = [];

    const settlementRow = queryOne<{ id: number; paid_amount: number; payment_status: string }>(`
      SELECT id, paid_amount, payment_status
      FROM commission_settlements
      WHERE doctor_id = ? AND period_month = ? AND period_year = ?
    `, [doctorId, month, year]);

    if (settlementRow) {
        settlement = settlementRow;
        payments = queryAll(`
        SELECT * FROM commission_payments WHERE settlement_id = ? ORDER BY payment_date DESC
      `, [settlementRow.id]);
    }

    return {
        doctor: doctor || null,
        period: { month, year },
        summary,
        items,
        settlement,
        payments
    };
}

/**
 * Get all doctors with pending commissions for a given month/year
 */
export function getDoctorsWithPendingCommissions(month: number, year: number) {
    return queryAll<{
        doctor_id: number;
        doctor_name: string;
        doctor_code: string;
        total_commission: number;
        test_count: number;
        patient_count: number;
    }>(`
    SELECT 
      d.id as doctor_id,
      d.name as doctor_name,
      d.doctor_code,
      COALESCE(SUM(dc.commission_amount), 0) as total_commission,
      COUNT(dc.id) as test_count,
      COUNT(DISTINCT dc.patient_id) as patient_count
    FROM doctors d
    JOIN doctor_commissions dc ON d.id = dc.doctor_id
    JOIN invoices i ON dc.invoice_id = i.id
    WHERE dc.is_cancelled = 0
      AND dc.settlement_id IS NULL
      AND CAST(strftime('%m', i.created_at) AS INTEGER) = ?
      AND CAST(strftime('%Y', i.created_at) AS INTEGER) = ?
    GROUP BY d.id, d.name, d.doctor_code
    HAVING total_commission > 0
    ORDER BY d.name ASC
  `, [month, year]);
}

// ==================== COMMISSION SETTLEMENT ====================

/**
 * Create or get commission settlement for a doctor/period
 */
export function getOrCreateSettlement(
    doctorId: number,
    month: number,
    year: number,
    userId?: number
): { success: boolean; settlementId?: number; error?: string } {
    try {
        // Check if settlement already exists
        const existing = queryOne<{ id: number }>(`
      SELECT id FROM commission_settlements
      WHERE doctor_id = ? AND period_month = ? AND period_year = ?
    `, [doctorId, month, year]);

        if (existing) {
            return { success: true, settlementId: existing.id };
        }

        // Calculate total commission for the period
        const summary = getMonthlyCommissionSummary(doctorId, month, year);

        if (summary.totalCommission === 0) {
            return { success: false, error: 'No commission to settle for this period' };
        }

        // Create settlement
        const settlementId = runWithId(`
      INSERT INTO commission_settlements (
        doctor_id, period_month, period_year, total_commission, created_by
      ) VALUES (?, ?, ?, ?, ?)
    `, [doctorId, month, year, summary.totalCommission, userId || null]);

        // Link all commissions to this settlement
        run(`
      UPDATE doctor_commissions
      SET settlement_id = ?
      WHERE doctor_id = ?
        AND is_cancelled = 0
        AND settlement_id IS NULL
        AND invoice_id IN (
          SELECT id FROM invoices
          WHERE CAST(strftime('%m', created_at) AS INTEGER) = ?
            AND CAST(strftime('%Y', created_at) AS INTEGER) = ?
        )
    `, [settlementId, doctorId, month, year]);

        // Log audit
        run(`
      INSERT INTO audit_log (entity, entity_id, action, new_value, performed_by, performed_at)
      VALUES ('settlement', ?, 'CREATE', ?, ?, datetime('now'))
    `, [settlementId, JSON.stringify({ doctorId, month, year, totalCommission: summary.totalCommission }), userId || null]);

        return { success: true, settlementId };
    } catch (error: any) {
        console.error('Create settlement error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Record payment for a settlement (can be partial or full)
 */
export function recordSettlementPayment(
    settlementId: number,
    amount: number,
    paymentMode: string,
    paymentReference?: string,
    remarks?: string,
    userId?: number
): { success: boolean; error?: string } {
    try {
        const settlement = queryOne<CommissionSettlement>(`
      SELECT * FROM commission_settlements WHERE id = ?
    `, [settlementId]);

        if (!settlement) {
            return { success: false, error: 'Settlement not found' };
        }

        // Record payment
        runWithId(`
      INSERT INTO commission_payments (
        settlement_id, amount, payment_mode, payment_reference, remarks, created_by
      ) VALUES (?, ?, ?, ?, ?, ?)
    `, [settlementId, amount, paymentMode, paymentReference || null, remarks || null, userId || null]);

        // Update settlement
        const newPaidAmount = settlement.paid_amount + amount;
        const newStatus =
            newPaidAmount >= settlement.total_commission
                ? 'PAID'
                : newPaidAmount > 0
                    ? 'PARTIALLY_PAID'
                    : 'PENDING';

        run(`
      UPDATE commission_settlements
      SET paid_amount = ?,
          payment_status = ?,
          payment_date = CASE WHEN ? = 'PAID' THEN datetime('now') ELSE payment_date END,
          payment_mode = ?,
          payment_reference = ?
      WHERE id = ?
    `, [newPaidAmount, newStatus, newStatus, paymentMode, paymentReference || null, settlementId]);

        // Log audit
        run(`
      INSERT INTO audit_log (entity, entity_id, action, new_value, performed_by, performed_at)
      VALUES ('settlement', ?, 'PAYMENT', ?, ?, datetime('now'))
    `, [settlementId, JSON.stringify({ amount, paymentMode, newPaidAmount, newStatus }), userId || null]);

        return { success: true };
    } catch (error: any) {
        console.error('Record settlement payment error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Get settlement details with payment history
 */
export function getSettlement(settlementId: number) {
    const settlement = queryOne<
        CommissionSettlement & {
            doctor_name: string;
            doctor_code: string;
        }
    >(`
    SELECT cs.*, d.name as doctor_name, d.doctor_code
    FROM commission_settlements cs
    JOIN doctors d ON cs.doctor_id = d.id
    WHERE cs.id = ?
  `, [settlementId]);

    if (!settlement) return null;

    const payments = queryAll<{
        id: number;
        amount: number;
        payment_date: string;
        payment_mode: string;
        payment_reference: string | null;
        remarks: string | null;
        created_by_name: string | null;
    }>(`
    SELECT cp.*, u.full_name as created_by_name
    FROM commission_payments cp
    LEFT JOIN users u ON cp.created_by = u.id
    WHERE cp.settlement_id = ?
    ORDER BY cp.payment_date DESC
  `, [settlementId]);

    return {
        ...settlement,
        payments
    };
}

/**
 * List all settlements (optionally filtered)
 */
export function listSettlements(options: {
    doctorId?: number;
    status?: string;
    year?: number;
    limit?: number;
    offset?: number;
} = {}) {
    const { doctorId, status, year, limit = 50, offset = 0 } = options;

    let sql = `
    SELECT cs.*, d.name as doctor_name, d.doctor_code
    FROM commission_settlements cs
    JOIN doctors d ON cs.doctor_id = d.id
    WHERE 1=1
  `;
    const params: any[] = [];

    if (doctorId) {
        sql += ` AND cs.doctor_id = ?`;
        params.push(doctorId);
    }
    if (status) {
        sql += ` AND cs.payment_status = ?`;
        params.push(status);
    }
    if (year) {
        sql += ` AND cs.period_year = ?`;
        params.push(year);
    }

    sql += ` ORDER BY cs.period_year DESC, cs.period_month DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    return queryAll<
        CommissionSettlement & {
            doctor_name: string;
            doctor_code: string;
        }
    >(sql, params);
}

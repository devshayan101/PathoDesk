import { queryAll, queryOne, run, runWithId } from '../database/db';

// Types
interface PaymentRow {
    id: number;
    invoice_id: number;
    amount: number;
    payment_mode: 'CASH' | 'CARD' | 'UPI' | 'CREDIT';
    reference_number: string | null;
    payment_date: string;
    received_by: number | null;
    received_by_name?: string;
    remarks: string | null;
}

// ==================== PAYMENT OPERATIONS ====================

export function recordPayment(data: {
    invoiceId: number;
    amount: number;
    paymentMode: 'CASH' | 'CARD' | 'UPI' | 'CREDIT';
    referenceNumber?: string;
    receivedBy?: number;
    remarks?: string;
}): { success: boolean; paymentId?: number; error?: string } {
    try {
        // Validate invoice exists and is finalized
        const invoice = queryOne<{ id: number; status: string; total_amount: number }>(`
      SELECT id, status, total_amount FROM invoices WHERE id = ?
    `, [data.invoiceId]);

        if (!invoice) {
            return { success: false, error: 'Invoice not found' };
        }

        // Get current paid amount
        const paid = queryOne<{ total: number }>(`
      SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE invoice_id = ?
    `, [data.invoiceId]);

        const currentPaid = paid?.total || 0;
        const remaining = invoice.total_amount - currentPaid;

        if (data.amount > remaining + 0.01) { // Allow small float variance
            return { success: false, error: `Payment amount exceeds balance. Remaining: ₹${remaining.toFixed(2)}` };
        }

        const paymentId = runWithId(`
      INSERT INTO payments (invoice_id, amount, payment_mode, reference_number, received_by, remarks)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [
            data.invoiceId,
            data.amount,
            data.paymentMode,
            data.referenceNumber || null,
            data.receivedBy || null,
            data.remarks || null
        ]);

        // Update order payment status if fully paid
        const newTotal = currentPaid + data.amount;
        if (newTotal >= invoice.total_amount - 0.01) {
            // Get order_id from invoice
            const inv = queryOne<{ order_id: number }>(`SELECT order_id FROM invoices WHERE id = ?`, [data.invoiceId]);
            if (inv) {
                run(`UPDATE orders SET payment_status = 'PAID' WHERE id = ?`, [inv.order_id]);
            }
        }

        // Audit log
        run(`
      INSERT INTO audit_log (entity, entity_id, action, new_value, performed_by, performed_at)
      VALUES ('payment', ?, 'CREATE', ?, ?, datetime('now'))
    `, [paymentId, JSON.stringify({ amount: data.amount, mode: data.paymentMode }), data.receivedBy || null]);

        return { success: true, paymentId };
    } catch (error: any) {
        console.error('Record payment error:', error);
        return { success: false, error: error.message };
    }
}

export function listPayments(invoiceId: number): PaymentRow[] {
    return queryAll<PaymentRow>(`
    SELECT p.*, u.full_name as received_by_name
    FROM payments p
    LEFT JOIN users u ON p.received_by = u.id
    WHERE p.invoice_id = ?
    ORDER BY p.payment_date DESC
  `, [invoiceId]);
}

export function getPayment(id: number): PaymentRow | undefined {
    return queryOne<PaymentRow>(`
    SELECT p.*, u.full_name as received_by_name
    FROM payments p
    LEFT JOIN users u ON p.received_by = u.id
    WHERE p.id = ?
  `, [id]);
}

export function getPatientPaymentHistory(patientId: number): Array<PaymentRow & { invoice_number: string }> {
    return queryAll<PaymentRow & { invoice_number: string }>(`
    SELECT p.*, u.full_name as received_by_name, i.invoice_number
    FROM payments p
    JOIN invoices i ON p.invoice_id = i.id
    LEFT JOIN users u ON p.received_by = u.id
    WHERE i.patient_id = ?
    ORDER BY p.payment_date DESC
  `, [patientId]);
}

// Daily collection report
export function getDailyCollection(date?: string): {
    totalCash: number;
    totalCard: number;
    totalUpi: number;
    totalCredit: number;
    grandTotal: number;
    payments: PaymentRow[];
} {
    const targetDate = date || new Date().toISOString().split('T')[0];

    const payments = queryAll<PaymentRow>(`
    SELECT p.*, u.full_name as received_by_name
    FROM payments p
    LEFT JOIN users u ON p.received_by = u.id
    WHERE DATE(p.payment_date) = DATE(?)
    ORDER BY p.payment_date DESC
  `, [targetDate]);

    const totals = {
        totalCash: 0,
        totalCard: 0,
        totalUpi: 0,
        totalCredit: 0,
        grandTotal: 0
    };

    for (const p of payments) {
        totals.grandTotal += p.amount;
        switch (p.payment_mode) {
            case 'CASH': totals.totalCash += p.amount; break;
            case 'CARD': totals.totalCard += p.amount; break;
            case 'UPI': totals.totalUpi += p.amount; break;
            case 'CREDIT': totals.totalCredit += p.amount; break;
        }
    }

    return { ...totals, payments };
}

// Outstanding dues report
export function getOutstandingDues(): Array<{
    patient_id: number;
    patient_name: string;
    patient_uid: string;
    total_invoiced: number;
    total_paid: number;
    balance_due: number;
    oldest_invoice_date: string;
}> {
    return queryAll(`
    SELECT 
      p.id as patient_id,
      p.full_name as patient_name,
      p.patient_uid,
      COALESCE(SUM(i.total_amount), 0) as total_invoiced,
      COALESCE(SUM(paid.total_paid), 0) as total_paid,
      COALESCE(SUM(i.total_amount), 0) - COALESCE(SUM(paid.total_paid), 0) as balance_due,
      MIN(i.created_at) as oldest_invoice_date
    FROM patients p
    JOIN invoices i ON p.id = i.patient_id
    LEFT JOIN (
      SELECT invoice_id, SUM(amount) as total_paid
      FROM payments
      GROUP BY invoice_id
    ) paid ON i.id = paid.invoice_id
    WHERE i.status = 'FINALIZED'
    GROUP BY p.id
    HAVING balance_due > 0
    ORDER BY balance_due DESC
  `);
}

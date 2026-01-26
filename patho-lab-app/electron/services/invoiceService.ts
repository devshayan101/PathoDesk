import { queryAll, queryOne, run, runWithId, getDb } from '../database/db';
import { getTestPricesForTests } from './billingService';

// Types
interface InvoiceRow {
    id: number;
    invoice_number: string;
    order_id: number;
    patient_id: number;
    patient_name?: string;
    patient_uid?: string;
    price_list_id: number | null;
    price_list_name?: string;
    subtotal: number;
    discount_amount: number;
    discount_percent: number;
    discount_reason: string | null;
    discount_approved_by: number | null;
    gst_amount: number;
    total_amount: number;
    status: 'DRAFT' | 'FINALIZED' | 'CANCELLED';
    created_by: number | null;
    created_at: string;
    finalized_at: string | null;
    cancelled_at: string | null;
    cancelled_by: number | null;
    cancellation_reason: string | null;
    amount_paid?: number;
    balance_due?: number;
}

interface InvoiceItemRow {
    id: number;
    invoice_id: number;
    test_id: number | null;
    package_id: number | null;
    description: string;
    unit_price: number;
    quantity: number;
    discount_amount: number;
    gst_rate: number;
    gst_amount: number;
    line_total: number;
}

// Generate unique invoice number
function generateInvoiceNumber(): string {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const prefix = `INV${year}${month}`;

    // Get the last invoice number with this month's prefix
    const lastInvoice = queryOne<{ invoice_number: string }>(`
    SELECT invoice_number FROM invoices 
    WHERE invoice_number LIKE ? || '%'
    ORDER BY invoice_number DESC
    LIMIT 1
  `, [prefix]);

    let seq = '0001';
    if (lastInvoice && lastInvoice.invoice_number) {
        // Extract the last 4 digits
        const lastSeq = parseInt(lastInvoice.invoice_number.slice(-4));
        if (!isNaN(lastSeq)) {
            seq = (lastSeq + 1).toString().padStart(4, '0');
        }
    }

    return `${prefix}${seq}`;
}

// ==================== INVOICE OPERATIONS ====================

export function listInvoices(options: {
    limit?: number;
    offset?: number;
    status?: string;
    patientId?: number;
    fromDate?: string;
    toDate?: string;
} = {}): InvoiceRow[] {
    const { limit = 50, offset = 0, status, patientId, fromDate, toDate } = options;

    let sql = `
    SELECT i.*, 
           p.full_name as patient_name, p.patient_uid,
           pl.name as price_list_name,
           COALESCE(SUM(pay.amount), 0) as amount_paid,
           i.total_amount - COALESCE(SUM(pay.amount), 0) as balance_due
    FROM invoices i
    JOIN patients p ON i.patient_id = p.id
    LEFT JOIN price_lists pl ON i.price_list_id = pl.id
    LEFT JOIN payments pay ON i.id = pay.invoice_id
    WHERE 1=1
  `;
    const params: any[] = [];

    if (status) {
        sql += ` AND i.status = ?`;
        params.push(status);
    }
    if (patientId) {
        sql += ` AND i.patient_id = ?`;
        params.push(patientId);
    }
    if (fromDate) {
        sql += ` AND i.created_at >= ?`;
        params.push(fromDate);
    }
    if (toDate) {
        sql += ` AND i.created_at <= ?`;
        params.push(toDate);
    }

    sql += ` GROUP BY i.id ORDER BY i.created_at DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    return queryAll<InvoiceRow>(sql, params);
}

export function getInvoice(id: number) {
    const invoice = queryOne<InvoiceRow>(`
    SELECT i.*, 
           p.full_name as patient_name, p.patient_uid, p.phone as patient_phone,
           p.gender as patient_gender, p.dob as patient_dob, p.address as patient_address,
           pl.name as price_list_name,
           d.name as doctor_name,
           u.full_name as created_by_name
    FROM invoices i
    JOIN patients p ON i.patient_id = p.id
    LEFT JOIN price_lists pl ON i.price_list_id = pl.id
    LEFT JOIN orders o ON i.order_id = o.id
    LEFT JOIN doctors d ON o.referring_doctor_id = d.id
    LEFT JOIN users u ON i.created_by = u.id
    WHERE i.id = ?
  `, [id]);

    if (!invoice) return null;

    const items = queryAll<InvoiceItemRow>(`
    SELECT * FROM invoice_items WHERE invoice_id = ?
  `, [id]);

    const payments = queryAll<{
        id: number;
        amount: number;
        payment_mode: string;
        reference_number: string | null;
        payment_date: string;
        received_by_name: string | null;
        remarks: string | null;
    }>(`
    SELECT pay.*, u.full_name as received_by_name
    FROM payments pay
    LEFT JOIN users u ON pay.received_by = u.id
    WHERE pay.invoice_id = ?
    ORDER BY pay.payment_date DESC
  `, [id]);

    const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);

    return {
        ...invoice,
        items,
        payments,
        amount_paid: totalPaid,
        balance_due: invoice.total_amount - totalPaid
    };
}

export function getInvoiceByOrder(orderId: number): InvoiceRow | undefined {
    return queryOne<InvoiceRow>(`
    SELECT * FROM invoices WHERE order_id = ? AND status != 'CANCELLED'
  `, [orderId]);
}

export function createInvoice(data: {
    orderId: number;
    patientId: number;
    priceListId: number;
    testIds: number[];
    discountPercent?: number;
    discountAmount?: number;
    discountReason?: string;
    discountApprovedBy?: number;
    createdBy?: number;
}): { success: boolean; invoiceId?: number; invoiceNumber?: string; error?: string } {
    const maxRetries = 5;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            const db = getDb();

            // Check if invoice already exists for this order
            const existing = getInvoiceByOrder(data.orderId);
            if (existing) {
                return { success: false, error: 'Invoice already exists for this order' };
            }

            // Get test prices
            const testPrices = getTestPricesForTests(data.testIds, data.priceListId);

            // Calculate totals
            let subtotal = 0;
            const items: Array<{
                testId: number;
                description: string;
                unitPrice: number;
                gstRate: number;
                gstAmount: number;
                lineTotal: number;
            }> = [];

            for (const testId of data.testIds) {
                const price = testPrices.get(testId);
                if (price) {
                    const unitPrice = price.base_price;
                    const gstRate = price.gst_applicable ? price.gst_rate : 0;
                    const gstAmount = (unitPrice * gstRate) / 100;
                    const lineTotal = unitPrice + gstAmount;

                    subtotal += unitPrice;
                    items.push({
                        testId,
                        description: `${price.test_code} - ${price.test_name}`,
                        unitPrice,
                        gstRate,
                        gstAmount,
                        lineTotal
                    });
                }
            }

            // Apply discount
            let discountAmount = data.discountAmount || 0;
            if (data.discountPercent && data.discountPercent > 0) {
                discountAmount = (subtotal * data.discountPercent) / 100;
            }

            // Calculate GST on discounted amount
            const discountedSubtotal = subtotal - discountAmount;
            let totalGst = 0;
            for (const item of items) {
                if (item.gstRate > 0) {
                    const proportion = item.unitPrice / subtotal;
                    const itemDiscountedPrice = discountedSubtotal * proportion;
                    item.gstAmount = (itemDiscountedPrice * item.gstRate) / 100;
                    totalGst += item.gstAmount;
                }
            }

            const totalAmount = discountedSubtotal + totalGst;
            const invoiceNumber = generateInvoiceNumber();

            // Create invoice
            const invoiceId = runWithId(`
          INSERT INTO invoices (
            invoice_number, order_id, patient_id, price_list_id,
            subtotal, discount_amount, discount_percent, discount_reason, discount_approved_by,
            gst_amount, total_amount, status, created_by
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'DRAFT', ?)
        `, [
                invoiceNumber,
                data.orderId,
                data.patientId,
                data.priceListId,
                subtotal,
                discountAmount,
                data.discountPercent || 0,
                data.discountReason || null,
                data.discountApprovedBy || null,
                totalGst,
                totalAmount,
                data.createdBy || null
            ]);

            // Create invoice items (price snapshot)
            for (const item of items) {
                run(`
            INSERT INTO invoice_items (
              invoice_id, test_id, description, unit_price, quantity,
              discount_amount, gst_rate, gst_amount, line_total
            ) VALUES (?, ?, ?, ?, 1, 0, ?, ?, ?)
          `, [
                    invoiceId,
                    item.testId,
                    item.description,
                    item.unitPrice,
                    item.gstRate,
                    item.gstAmount,
                    item.lineTotal
                ]);
            }

            // Log audit
            run(`
          INSERT INTO audit_log (entity, entity_id, action, new_value, performed_by, performed_at)
          VALUES ('invoice', ?, 'CREATE', ?, ?, datetime('now'))
        `, [invoiceId, JSON.stringify({ invoiceNumber, totalAmount }), data.createdBy || null]);

            return { success: true, invoiceId, invoiceNumber };
        } catch (error: any) {
            // If it's a UNIQUE constraint error and we have retries left, try again
            if (error.code === 'SQLITE_CONSTRAINT_UNIQUE' && attempt < maxRetries - 1) {
                console.log(`Invoice number conflict, retrying... (attempt ${attempt + 1})`);
                // Small random delay to avoid thundering herd
                const delay = Math.random() * 50 + 10;
                const start = Date.now();
                while (Date.now() - start < delay) { /* busy wait */ }
                continue;
            }

            console.error('Create invoice error:', error);
            return { success: false, error: error.message };
        }
    }

    return { success: false, error: 'Failed to create invoice after multiple attempts' };
}

export function finalizeInvoice(id: number, userId?: number): { success: boolean; error?: string } {
    try {
        const invoice = queryOne<InvoiceRow>(`SELECT * FROM invoices WHERE id = ?`, [id]);
        if (!invoice) {
            return { success: false, error: 'Invoice not found' };
        }
        if (invoice.status !== 'DRAFT') {
            return { success: false, error: 'Only draft invoices can be finalized' };
        }

        run(`
      UPDATE invoices SET status = 'FINALIZED', finalized_at = datetime('now')
      WHERE id = ?
    `, [id]);

        // Update order payment status
        run(`UPDATE orders SET payment_status = 'INVOICED' WHERE id = ?`, [invoice.order_id]);

        // Audit log
        run(`
      INSERT INTO audit_log (entity, entity_id, action, performed_by, performed_at)
      VALUES ('invoice', ?, 'FINALIZE', ?, datetime('now'))
    `, [id, userId || null]);

        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export function cancelInvoice(id: number, reason: string, userId: number): { success: boolean; error?: string } {
    try {
        const invoice = queryOne<InvoiceRow>(`SELECT * FROM invoices WHERE id = ?`, [id]);
        if (!invoice) {
            return { success: false, error: 'Invoice not found' };
        }
        if (invoice.status === 'CANCELLED') {
            return { success: false, error: 'Invoice is already cancelled' };
        }

        // Check for payments
        const payments = queryOne<{ total: number }>(`
      SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE invoice_id = ?
    `, [id]);

        if (payments && payments.total > 0) {
            return { success: false, error: 'Cannot cancel invoice with payments. Refund first.' };
        }

        run(`
      UPDATE invoices 
      SET status = 'CANCELLED', 
          cancelled_at = datetime('now'),
          cancelled_by = ?,
          cancellation_reason = ?
      WHERE id = ?
    `, [userId, reason, id]);

        // Audit log
        run(`
      INSERT INTO audit_log (entity, entity_id, action, old_value, new_value, performed_by, performed_at)
      VALUES ('invoice', ?, 'CANCEL', ?, ?, ?, datetime('now'))
    `, [id, invoice.status, reason, userId]);

        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export function getPatientDues(patientId: number): { totalDue: number; invoices: InvoiceRow[] } {
    const invoices = queryAll<InvoiceRow>(`
    SELECT i.*, 
           COALESCE(SUM(pay.amount), 0) as amount_paid,
           i.total_amount - COALESCE(SUM(pay.amount), 0) as balance_due
    FROM invoices i
    LEFT JOIN payments pay ON i.id = pay.invoice_id
    WHERE i.patient_id = ? 
      AND i.status = 'FINALIZED'
    GROUP BY i.id
    HAVING balance_due > 0
    ORDER BY i.created_at ASC
  `, [patientId]);

    const totalDue = invoices.reduce((sum, inv) => sum + (inv.balance_due || 0), 0);

    return { totalDue, invoices };
}

// Get invoice summary for dashboard
export function getInvoiceSummary(fromDate?: string, toDate?: string) {
    const dateFilter = fromDate ? `AND created_at >= '${fromDate}'` : '';
    const toDateFilter = toDate ? `AND created_at <= '${toDate}'` : '';

    const summary = queryOne<{
        total_invoices: number;
        total_amount: number;
        total_collected: number;
        total_pending: number;
    }>(`
    SELECT 
      COUNT(*) as total_invoices,
      COALESCE(SUM(total_amount), 0) as total_amount,
      COALESCE((SELECT SUM(amount) FROM payments WHERE invoice_id IN (
        SELECT id FROM invoices WHERE status = 'FINALIZED' ${dateFilter} ${toDateFilter}
      )), 0) as total_collected
    FROM invoices
    WHERE status = 'FINALIZED' ${dateFilter} ${toDateFilter}
  `);

    return {
        ...summary,
        total_pending: (summary?.total_amount || 0) - (summary?.total_collected || 0)
    };
}

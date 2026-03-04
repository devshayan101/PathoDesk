import { queryAll, queryOne } from '../database/db';

interface DashboardStats {
    todayPatients: number;
    todayOrders: number;
    pendingResults: number;
    criticalAlerts: number;
    todayRevenue: number;
    todayPending: number;
    monthlyRevenue: number;
    monthlyPending: number;
    yearlyRevenue: number;
    yearlyPending: number;
    monthlyOrders: number;
    monthlyPatients: number;
    pendingSamples: any[];
    pendingVerification: any[];
    recentActivity: any[];
}

export function getDashboardStats(): DashboardStats {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const now = new Date();
    const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    const yearStart = `${now.getFullYear()}-01-01`;

    // Count today's unique patients from orders
    const patientCount = queryOne<{ count: number }>(
        `SELECT COUNT(DISTINCT o.patient_id) as count 
         FROM orders o 
         WHERE date(o.order_date) = date(?)`, [today]
    );

    // Count today's orders
    const orderCount = queryOne<{ count: number }>(
        `SELECT COUNT(*) as count 
         FROM orders o 
         WHERE date(o.order_date) = date(?)`, [today]
    );

    // Count pending results (samples not finalized)
    const pendingCount = queryOne<{ count: number }>(
        `SELECT COUNT(*) as count 
         FROM samples s 
         WHERE s.status NOT IN ('FINALIZED', 'REJECTED')`
    );

    // Count critical results (unflagged critical that aren't finalized)
    let criticalAlerts = 0;
    try {
        const criticalCount = queryOne<{ count: number }>(
            `SELECT COUNT(*) as count 
             FROM test_results tr 
             JOIN samples s ON tr.sample_id = s.id
             WHERE tr.abnormal_flag IN ('CRITICAL', 'CRITICAL_HIGH', 'CRITICAL_LOW') 
             AND s.status NOT IN ('FINALIZED', 'VERIFIED')`
        );
        criticalAlerts = criticalCount?.count || 0;
    } catch {
        // test_results table may not have any rows yet
    }

    // Monthly revenue (total_amount - commission)
    const monthlyRevenueData = queryOne<{ total: number | null }>(
        `SELECT COALESCE(SUM(i.total_amount), 0) - COALESCE((
            SELECT SUM(dc.commission_amount) FROM doctor_commissions dc
            WHERE dc.invoice_id IN (
                SELECT id FROM invoices WHERE date(created_at) >= date(?) AND status != 'CANCELLED'
            ) AND dc.is_cancelled = 0
        ), 0) as total
         FROM invoices i
         WHERE date(i.created_at) >= date(?)
         AND i.status != 'CANCELLED'`, [monthStart, monthStart]
    );

    // Monthly pending (total_amount - paid_amount)
    const monthlyPendingData = queryOne<{ total: number | null }>(
        `SELECT COALESCE(SUM(i.total_amount), 0) - COALESCE((
            SELECT SUM(pay.amount) FROM payments pay
            WHERE pay.invoice_id IN (
                SELECT id FROM invoices WHERE date(created_at) >= date(?) AND status != 'CANCELLED'
            )
        ), 0) as total
         FROM invoices i
         WHERE date(i.created_at) >= date(?)
         AND i.status != 'CANCELLED'`, [monthStart, monthStart]
    );

    // Yearly revenue (total_amount - commission)
    const yearlyRevenueData = queryOne<{ total: number | null }>(
        `SELECT COALESCE(SUM(i.total_amount), 0) - COALESCE((
            SELECT SUM(dc.commission_amount) FROM doctor_commissions dc
            WHERE dc.invoice_id IN (
                SELECT id FROM invoices WHERE date(created_at) >= date(?) AND status != 'CANCELLED'
            ) AND dc.is_cancelled = 0
        ), 0) as total
         FROM invoices i
         WHERE date(i.created_at) >= date(?)
         AND i.status != 'CANCELLED'`, [yearStart, yearStart]
    );

    // Yearly pending (total_amount - paid_amount)
    const yearlyPendingData = queryOne<{ total: number | null }>(
        `SELECT COALESCE(SUM(i.total_amount), 0) - COALESCE((
            SELECT SUM(pay.amount) FROM payments pay
            WHERE pay.invoice_id IN (
                SELECT id FROM invoices WHERE date(created_at) >= date(?) AND status != 'CANCELLED'
            )
        ), 0) as total
         FROM invoices i
         WHERE date(i.created_at) >= date(?)
         AND i.status != 'CANCELLED'`, [yearStart, yearStart]
    );

    // Monthly orders
    const monthlyOrderCount = queryOne<{ count: number }>(
        `SELECT COUNT(*) as count 
         FROM orders o 
         WHERE date(o.order_date) >= date(?)`, [monthStart]
    );

    // Monthly unique patients
    const monthlyPatientCount = queryOne<{ count: number }>(
        `SELECT COUNT(DISTINCT o.patient_id) as count 
         FROM orders o 
         WHERE date(o.order_date) >= date(?)`, [monthStart]
    );

    // Pending samples (not finalized)
    const pendingSamples = queryAll<any>(
        `SELECT 
            s.id, s.sample_uid, s.status,
            p.full_name as patient_name,
            tv.test_name, tv.department,
            s.received_at
         FROM samples s
         JOIN order_tests ot ON s.order_test_id = ot.id
         JOIN test_versions tv ON ot.test_version_id = tv.id
         JOIN orders o ON ot.order_id = o.id
         JOIN patients p ON o.patient_id = p.id
         WHERE s.status NOT IN ('FINALIZED', 'REJECTED')
         ORDER BY s.received_at DESC
         LIMIT 20`
    );

    // Pending verification (submitted for verification)
    const pendingVerification = queryAll<any>(
        `SELECT 
            s.id, s.sample_uid, s.status,
            p.full_name as patient_name,
            tv.test_name,
            s.received_at
         FROM samples s
         JOIN order_tests ot ON s.order_test_id = ot.id
         JOIN test_versions tv ON ot.test_version_id = tv.id
         JOIN orders o ON ot.order_id = o.id
         JOIN patients p ON o.patient_id = p.id
         WHERE s.status = 'SUBMITTED'
         ORDER BY s.received_at DESC
         LIMIT 20`
    );

    // Recent activity - last 10 finalized/verified samples
    const recentActivity = queryAll<any>(
        `SELECT 
            s.id, s.sample_uid, s.status,
            p.full_name as patient_name,
            tv.test_name,
            s.verified_at, s.received_at
         FROM samples s
         JOIN order_tests ot ON s.order_test_id = ot.id
         JOIN test_versions tv ON ot.test_version_id = tv.id
         JOIN orders o ON ot.order_id = o.id
         JOIN patients p ON o.patient_id = p.id
         WHERE s.status IN ('FINALIZED', 'VERIFIED')
         ORDER BY COALESCE(s.verified_at, s.received_at) DESC
         LIMIT 10`
    );

    // Safe revenue query (today) - revenue = total_amount - commission
    let todayRevenue = 0;
    let todayPending = 0;
    try {
        const todayRevenueData = queryOne<{ total: number | null }>(
            `SELECT COALESCE(SUM(i.total_amount), 0) - COALESCE((
                SELECT SUM(dc.commission_amount) FROM doctor_commissions dc
                WHERE dc.invoice_id IN (
                    SELECT id FROM invoices WHERE date(created_at) = date(?) AND status != 'CANCELLED'
                ) AND dc.is_cancelled = 0
            ), 0) as total
             FROM invoices i
             WHERE date(i.created_at) = date(?)
             AND i.status != 'CANCELLED'`, [today, today]
        );
        todayRevenue = todayRevenueData?.total || 0;

        // Today pending (total_amount - paid_amount)
        const todayPendingData = queryOne<{ total: number | null }>(
            `SELECT COALESCE(SUM(i.total_amount), 0) - COALESCE((
                SELECT SUM(pay.amount) FROM payments pay
                WHERE pay.invoice_id IN (
                    SELECT id FROM invoices WHERE date(created_at) = date(?) AND status != 'CANCELLED'
                )
            ), 0) as total
             FROM invoices i
             WHERE date(i.created_at) = date(?)
             AND i.status != 'CANCELLED'`, [today, today]
        );
        todayPending = todayPendingData?.total || 0;
    } catch {
        // invoices table might not exist yet
    }

    return {
        todayPatients: patientCount?.count || 0,
        todayOrders: orderCount?.count || 0,
        pendingResults: pendingCount?.count || 0,
        criticalAlerts,
        todayRevenue,
        todayPending,
        monthlyRevenue: monthlyRevenueData?.total || 0,
        monthlyPending: monthlyPendingData?.total || 0,
        yearlyRevenue: yearlyRevenueData?.total || 0,
        yearlyPending: yearlyPendingData?.total || 0,
        monthlyOrders: monthlyOrderCount?.count || 0,
        monthlyPatients: monthlyPatientCount?.count || 0,
        pendingSamples,
        pendingVerification,
        recentActivity,
    };
}

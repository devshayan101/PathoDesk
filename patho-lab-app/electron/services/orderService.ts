import { queryAll, queryOne, run, runWithId } from '../database/db';
import { getTestPricesForTests } from './billingService';


interface OrderRow {
  id: number;
  order_uid: string;
  patient_id: number;
  patient_name: string;
  patient_uid: string;
  order_date: string;
  total_amount: number;
  discount: number;
  net_amount: number;
  payment_status: string;
  report_status?: string;
}

interface OrderTestRow {
  id: number;
  order_id: number;
  test_version_id: number;
  test_code: string;
  test_name: string;
  price: number;
  status: string;
}

// List orders with pagination
export function listOrders(limit = 50, offset = 0): OrderRow[] {
  return queryAll<OrderRow>(`
    SELECT o.*, p.full_name as patient_name, p.patient_uid,
           d.name as doctor_name,
           (
              SELECT 
                CASE 
                  WHEN COUNT(*) = 0 THEN 'NO_TESTS'
                  WHEN SUM(CASE WHEN status = 'FINALIZED' THEN 1 ELSE 0 END) = COUNT(*) THEN 'FINALIZED'
                  WHEN SUM(CASE WHEN status = 'VERIFIED' THEN 1 ELSE 0 END) = COUNT(*) THEN 'VERIFIED'
                  WHEN SUM(CASE WHEN status IN ('VERIFIED', 'FINALIZED') THEN 1 ELSE 0 END) > 0 THEN 'PARTIAL'
                  WHEN SUM(CASE WHEN status = 'SUBMITTED' THEN 1 ELSE 0 END) > 0 THEN 'SUBMITTED'
                  WHEN SUM(CASE WHEN status = 'DRAFT' THEN 1 ELSE 0 END) > 0 THEN 'DRAFT'
                  WHEN SUM(CASE WHEN status = 'RECEIVED' THEN 1 ELSE 0 END) > 0 THEN 'RECEIVED'
                  ELSE 'PENDING'
                END
              FROM samples WHERE order_test_id IN (SELECT id FROM order_tests WHERE order_id = o.id)
           ) as report_status
    FROM orders o
    JOIN patients p ON o.patient_id = p.id
    LEFT JOIN doctors d ON o.referring_doctor_id = d.id
    ORDER BY o.order_date DESC
    LIMIT ? OFFSET ?
  `, [limit, offset]);
}

// Get single order with tests
export function getOrder(orderId: number) {
  const order = queryOne<OrderRow>(`
    SELECT o.*, p.full_name as patient_name, p.patient_uid,
           d.name as doctor_name
    FROM orders o
    JOIN patients p ON o.patient_id = p.id
    LEFT JOIN doctors d ON o.referring_doctor_id = d.id
    WHERE o.id = ?
  `, [orderId]);

  if (!order) return null;

  const tests = queryAll<OrderTestRow>(`
    SELECT ot.*, tv.test_name, t.test_code
    FROM order_tests ot
    JOIN test_versions tv ON ot.test_version_id = tv.id
    JOIN tests t ON tv.test_id = t.id
    WHERE ot.order_id = ?
  `, [orderId]);

  return { ...order, tests };
}

// Create new order
export function createOrder(data: {
  patientId: number;
  testVersionIds: number[];
  priceListId: number;
  discount?: number;
  referringDoctorId?: number | null;
}): { success: boolean; orderId?: number; orderUid?: string; error?: string } {
  try {
    const orderUid = `ORD-${Date.now().toString(36).toUpperCase()}`;

    // Get test IDs from version IDs
    const testIds: number[] = [];
    const versionToTestMap = new Map<number, number>();

    for (const vId of data.testVersionIds) {
      const tv = queryOne<{ test_id: number }>('SELECT test_id FROM test_versions WHERE id = ?', [vId]);
      if (tv) {
        testIds.push(tv.test_id);
        versionToTestMap.set(vId, tv.test_id);
      }
    }

    // Lookup real test prices
    const pricesMap = getTestPricesForTests(testIds, data.priceListId);

    // Calculate total from actual test prices
    let totalAmount = 0;
    for (const tId of testIds) {
      totalAmount += pricesMap.get(tId)?.base_price || 0;
    }

    const discount = data.discount || 0;
    const netAmount = totalAmount - discount;

    // Insert order
    const orderId = runWithId(`
      INSERT INTO orders (order_uid, patient_id, order_date, total_amount, discount, net_amount, payment_status, referring_doctor_id)
      VALUES (?, ?, datetime('now'), ?, ?, ?, 'PENDING', ?)
    `, [orderUid, data.patientId, totalAmount, discount, netAmount, data.referringDoctorId || null]);

    // Insert order tests and auto-generate samples
    for (const testVersionId of data.testVersionIds) {
      const tId = versionToTestMap.get(testVersionId);
      const testPrice = tId ? (pricesMap.get(tId)?.base_price || 0) : 0;

      const orderTestId = runWithId(`
        INSERT INTO order_tests (order_id, test_version_id, status, price)
        VALUES (?, ?, 'ORDERED', ?)
      `, [orderId, testVersionId, testPrice]);

      // Auto-generate sample for this test
      // unique sample UID: S + timestamp + random 3 chars
      const sampleUid = `S${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).substring(2, 5).toUpperCase()}`;

      run(`
        INSERT INTO samples (sample_uid, order_test_id, status, collected_at)
        VALUES (?, ?, 'COLLECTED', datetime('now'))
      `, [sampleUid, orderTestId]);
    }

    return { success: true, orderId, orderUid };
  } catch (error: any) {
    console.error('Create order error:', error);
    return { success: false, error: error.message };
  }
}

// Get orders for a patient
export function getPatientOrders(patientId: number): OrderRow[] {
  return queryAll<OrderRow>(`
    SELECT o.*, p.full_name as patient_name, p.patient_uid,
           d.name as doctor_name,
           (SELECT IFNULL(SUM(amount), 0) FROM payments pay JOIN invoices inv ON pay.invoice_id = inv.id WHERE inv.order_id = o.id) as paid_amount,
           (SELECT GROUP_CONCAT(tv.test_name, ', ') 
            FROM order_tests ot 
            JOIN test_versions tv ON ot.test_version_id = tv.id 
            WHERE ot.order_id = o.id) as test_names,
           (
              SELECT 
                CASE 
                  WHEN COUNT(*) = 0 THEN 'NO_TESTS'
                  WHEN SUM(CASE WHEN status = 'FINALIZED' THEN 1 ELSE 0 END) = COUNT(*) THEN 'FINALIZED'
                  WHEN SUM(CASE WHEN status = 'VERIFIED' THEN 1 ELSE 0 END) = COUNT(*) THEN 'VERIFIED'
                  WHEN SUM(CASE WHEN status IN ('VERIFIED', 'FINALIZED') THEN 1 ELSE 0 END) > 0 THEN 'PARTIAL'
                  WHEN SUM(CASE WHEN status = 'SUBMITTED' THEN 1 ELSE 0 END) > 0 THEN 'SUBMITTED'
                  WHEN SUM(CASE WHEN status = 'DRAFT' THEN 1 ELSE 0 END) > 0 THEN 'DRAFT'
                  WHEN SUM(CASE WHEN status = 'RECEIVED' THEN 1 ELSE 0 END) > 0 THEN 'RECEIVED'
                  ELSE 'PENDING'
                END
              FROM samples WHERE order_test_id IN (SELECT id FROM order_tests WHERE order_id = o.id)
           ) as report_status
    FROM orders o
    JOIN patients p ON o.patient_id = p.id
    LEFT JOIN doctors d ON o.referring_doctor_id = d.id
    WHERE o.patient_id = ?
    ORDER BY o.order_date DESC
  `, [patientId]);
}

// Update order test status
export function updateOrderTestStatus(orderTestId: number, status: string): boolean {
  try {
    run(`UPDATE order_tests SET status = ? WHERE id = ?`, [status, orderTestId]);
    return true;
  } catch {
    return false;
  }
}

// Get pending orders (for dashboard)
export function getPendingOrders(): OrderRow[] {
  return queryAll<OrderRow>(`
    SELECT o.*, p.full_name as patient_name, p.patient_uid,
           d.name as doctor_name
    FROM orders o
    JOIN patients p ON o.patient_id = p.id
    LEFT JOIN doctors d ON o.referring_doctor_id = d.id
    WHERE EXISTS (
      SELECT 1 FROM order_tests ot WHERE ot.order_id = o.id AND ot.status != 'FINALIZED'
    )
    ORDER BY o.order_date DESC
    LIMIT 20
  `);
}

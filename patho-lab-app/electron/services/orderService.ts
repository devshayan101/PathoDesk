import { queryAll, queryOne, run, runWithId } from '../database/db';


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
    SELECT o.*, p.full_name as patient_name, p.patient_uid
    FROM orders o
    JOIN patients p ON o.patient_id = p.id
    ORDER BY o.order_date DESC
    LIMIT ? OFFSET ?
  `, [limit, offset]);
}

// Get single order with tests
export function getOrder(orderId: number) {
  const order = queryOne<OrderRow>(`
    SELECT o.*, p.full_name as patient_name, p.patient_uid
    FROM orders o
    JOIN patients p ON o.patient_id = p.id
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
  discount?: number;
  referringDoctorId?: number | null;
}): { success: boolean; orderId?: number; orderUid?: string; error?: string } {
  try {
    const orderUid = `ORD-${Date.now().toString(36).toUpperCase()}`;

    // Calculate total from test prices (simplified - using fixed price for now)
    const totalAmount = data.testVersionIds.length * 500; // Placeholder price
    const discount = data.discount || 0;
    const netAmount = totalAmount - discount;

    // Insert order
    const orderId = runWithId(`
      INSERT INTO orders (order_uid, patient_id, order_date, total_amount, discount, net_amount, payment_status, referring_doctor_id)
      VALUES (?, ?, datetime('now'), ?, ?, ?, 'PENDING', ?)
    `, [orderUid, data.patientId, totalAmount, discount, netAmount, data.referringDoctorId || null]);

    // Insert order tests and auto-generate samples
    for (const testVersionId of data.testVersionIds) {
      const orderTestId = runWithId(`
        INSERT INTO order_tests (order_id, test_version_id, status, price)
        VALUES (?, ?, 'ORDERED', 500)
      `, [orderId, testVersionId]);

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
    SELECT o.*, p.full_name as patient_name, p.patient_uid
    FROM orders o
    JOIN patients p ON o.patient_id = p.id
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
    SELECT o.*, p.full_name as patient_name, p.patient_uid
    FROM orders o
    JOIN patients p ON o.patient_id = p.id
    WHERE EXISTS (
      SELECT 1 FROM order_tests ot WHERE ot.order_id = o.id AND ot.status != 'FINALIZED'
    )
    ORDER BY o.order_date DESC
    LIMIT 20
  `);
}

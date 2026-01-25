import { useState, useEffect } from 'react';
import './Orders.css';

interface Test {
    id: number;
    test_code: string;
    test_name: string;
    price: number; // Will be added to DB later, using placeholder for now
    version_id: number;
}

interface Patient {
    id: number;
    patient_uid: string;
    full_name: string;
}

interface Order {
    id: number;
    order_uid: string;
    patient_name: string;
    patient_uid: string;
    order_date: string;
    payment_status: string;
    total_amount: number;
    test_names?: string; // Derived in frontend or query
}

export default function OrdersPage() {
    const [showForm, setShowForm] = useState(false);
    const [orders, setOrders] = useState<Order[]>([]);
    const [tests, setTests] = useState<Test[]>([]);
    const [patients, setPatients] = useState<Patient[]>([]);

    // Form state
    const [selectedPatientId, setSelectedPatientId] = useState<number | ''>('');
    const [selectedTestIds, setSelectedTestIds] = useState<number[]>([]);
    const [discount, setDiscount] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            if (window.electronAPI) {
                const [ordersData, testsData, patientsData] = await Promise.all([
                    window.electronAPI.orders.list(),
                    window.electronAPI.tests.list(),
                    window.electronAPI.patients.list()
                ]);
                setOrders(ordersData);
                // Map DB tests to UI format (add placeholder price if missing)
                setTests(testsData.map((t: any) => ({ ...t, price: 500 })));
                setPatients(patientsData);
            }
        } catch (e) {
            console.error('Failed to load data:', e);
        }
        setLoading(false);
    };

    const toggleTest = (testVersionId: number) => {
        setSelectedTestIds(prev =>
            prev.includes(testVersionId) ? prev.filter(id => id !== testVersionId) : [...prev, testVersionId]
        );
    };

    const handleSubmit = async () => {
        if (!selectedPatientId || selectedTestIds.length === 0) return;

        try {
            if (window.electronAPI) {
                const result = await window.electronAPI.orders.create({
                    patientId: Number(selectedPatientId),
                    testVersionIds: selectedTestIds,
                    discount: Number(discount) || 0
                });

                if (result.success) {
                    setShowForm(false);
                    setSelectedPatientId('');
                    setSelectedTestIds([]);
                    setDiscount('');
                    loadData(); // Refresh list
                } else {
                    alert('Failed to create order: ' + result.error);
                }
            }
        } catch (e) {
            console.error('Create order error:', e);
        }
    };

    const selectedTestsData = tests.filter(t => selectedTestIds.includes(t.version_id));
    const total = selectedTestsData.reduce((sum, t) => sum + t.price, 0);
    const discountAmount = parseInt(discount) || 0;
    const finalTotal = total - discountAmount;

    return (
        <div className="orders-page">
            <div className="page-header">
                <h1 className="page-title">Orders</h1>
                <button className="btn btn-primary" onClick={() => setShowForm(true)}>
                    + New Order
                </button>
            </div>

            {showForm && (
                <div className="modal-overlay">
                    <div className="modal order-form-modal">
                        <h2>Order Creation</h2>

                        <div className="form-group">
                            <label>Select Patient</label>
                            <select
                                className="input"
                                value={selectedPatientId}
                                onChange={(e) => setSelectedPatientId(Number(e.target.value))}
                            >
                                <option value="">-- Select Patient --</option>
                                {patients.map(p => (
                                    <option key={p.id} value={p.id}>
                                        {p.full_name} ({p.patient_uid})
                                    </option>
                                ))}
                            </select>
                        </div>

                        {selectedPatientId && (
                            <>
                                {/* Test selection */}
                                <div className="test-selection">
                                    <label>Select Tests:</label>
                                    <div className="test-buttons">
                                        {tests.map(test => (
                                            <button
                                                key={test.id}
                                                type="button"
                                                className={`test-btn ${selectedTestIds.includes(test.version_id) ? 'selected' : ''}`}
                                                onClick={() => toggleTest(test.version_id)}
                                            >
                                                {test.test_code}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Order summary */}
                                {selectedTestsData.length > 0 && (
                                    <div className="order-summary">
                                        <table className="table">
                                            <thead>
                                                <tr>
                                                    <th>Test</th>
                                                    <th style={{ textAlign: 'right' }}>Price</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {selectedTestsData.map(test => (
                                                    <tr key={test.id}>
                                                        <td>{test.test_name}</td>
                                                        <td style={{ textAlign: 'right' }}>₹{test.price}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>

                                        <div className="order-total">
                                            <div className="total-row">
                                                <span>Total:</span>
                                                <span>₹{total}</span>
                                            </div>
                                            <div className="discount-row">
                                                <label>Discount:</label>
                                                <input
                                                    className="input discount-input"
                                                    type="number"
                                                    value={discount}
                                                    onChange={(e) => setDiscount(e.target.value)}
                                                    placeholder="0"
                                                />
                                            </div>
                                            <div className="total-row final">
                                                <span>Final Total:</span>
                                                <span>₹{finalTotal}</span>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div className="form-actions">
                                    <button
                                        className="btn btn-primary"
                                        onClick={handleSubmit}
                                        disabled={selectedTestIds.length === 0}
                                    >
                                        Generate Invoice
                                    </button>
                                    <button className="btn btn-secondary" onClick={() => setShowForm(false)}>
                                        Cancel
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* Orders list */}
            <div className="orders-table-container">
                {loading ? <div className="loading">Loading orders...</div> : (
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Order ID</th>
                                <th>Patient</th>
                                <th>Date</th>
                                <th>Amount</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {orders.length === 0 ? (
                                <tr><td colSpan={5} className="empty">No orders found</td></tr>
                            ) : (
                                orders.map(order => (
                                    <tr key={order.id}>
                                        <td><code>{order.order_uid}</code></td>
                                        <td>
                                            {order.patient_name} <br />
                                            <small className="text-muted">{order.patient_uid}</small>
                                        </td>
                                        <td>{new Date(order.order_date).toLocaleDateString()}</td>
                                        <td>₹{order.net_amount || order.total_amount}</td>
                                        <td>
                                            <span className={`badge ${order.payment_status === 'PAID' ? 'badge-success' : 'badge-warning'}`}>
                                                {order.payment_status}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}

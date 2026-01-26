import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import './Orders.css';

interface Test {
    id: number;
    test_code: string;
    test_name: string;
    version_id: number;
}

interface TestPrice {
    test_id: number;
    test_code: string;
    test_name: string;
    base_price: number;
    gst_rate: number;
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
    net_amount: number;
    test_names?: string;
    doctor_name?: string;
}

interface Doctor {
    id: number;
    doctor_code: string;
    name: string;
}

interface PriceList {
    id: number;
    code: string;
    name: string;
    is_default: number;
}

export default function OrdersPage() {
    const navigate = useNavigate();
    const { session } = useAuthStore();
    const [showForm, setShowForm] = useState(false);
    const [orders, setOrders] = useState<Order[]>([]);
    const [tests, setTests] = useState<Test[]>([]);
    const [patients, setPatients] = useState<Patient[]>([]);
    const [doctors, setDoctors] = useState<Doctor[]>([]);
    const [priceLists, setPriceLists] = useState<PriceList[]>([]);
    const [testPrices, setTestPrices] = useState<Map<number, TestPrice>>(new Map());

    // Form state
    const [selectedPatientId, setSelectedPatientId] = useState<number | ''>('');
    const [selectedDoctorId, setSelectedDoctorId] = useState<number | ''>('');
    const [selectedPriceListId, setSelectedPriceListId] = useState<number | ''>('');
    const [selectedTestIds, setSelectedTestIds] = useState<number[]>([]);
    const [discountPercent, setDiscountPercent] = useState('');
    const [discountReason, setDiscountReason] = useState('');
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    useEffect(() => {
        if (selectedPriceListId && selectedTestIds.length > 0) {
            loadTestPrices();
        }
    }, [selectedPriceListId, selectedTestIds]);

    const loadData = async () => {
        setLoading(true);
        try {
            const [ordersData, testsData, patientsData, doctorsData, priceListsData] = await Promise.all([
                window.electronAPI.orders.list(),
                window.electronAPI.tests.list(),
                window.electronAPI.patients.list(),
                window.electronAPI.doctors.list(),
                window.electronAPI.priceLists.list()
            ]);
            setOrders(ordersData);
            setTests(testsData);
            setPatients(patientsData);
            setDoctors(doctorsData);
            setPriceLists(priceListsData);

            // Set default price list
            const defaultPl = priceListsData.find((pl: PriceList) => pl.is_default === 1);
            if (defaultPl) {
                setSelectedPriceListId(defaultPl.id);
            } else if (priceListsData.length > 0) {
                setSelectedPriceListId(priceListsData[0].id);
            }
        } catch (e) {
            console.error('Failed to load data:', e);
        }
        setLoading(false);
    };

    const loadTestPrices = async () => {
        if (!selectedPriceListId) return;

        try {
            const testIds = selectedTestIds.map(vId => {
                const test = tests.find(t => t.version_id === vId);
                return test?.id;
            }).filter(Boolean) as number[];

            if (testIds.length > 0) {
                const pricesObj = await window.electronAPI.testPrices.getForTests(testIds, selectedPriceListId);
                const pricesMap = new Map<number, TestPrice>();
                Object.entries(pricesObj).forEach(([key, value]) => {
                    pricesMap.set(Number(key), value as TestPrice);
                });
                setTestPrices(pricesMap);
            }
        } catch (e) {
            console.error('Failed to load prices:', e);
        }
    };

    const toggleTest = (testVersionId: number) => {
        setSelectedTestIds(prev =>
            prev.includes(testVersionId) ? prev.filter(id => id !== testVersionId) : [...prev, testVersionId]
        );
    };

    const handleSubmit = async () => {
        if (!selectedPatientId || selectedTestIds.length === 0 || !selectedPriceListId) return;

        setSubmitting(true);
        try {
            // 1. Create order
            const orderResult = await window.electronAPI.orders.create({
                patientId: Number(selectedPatientId),
                testVersionIds: selectedTestIds,
                discount: 0, // Will be handled in invoice
                referringDoctorId: selectedDoctorId ? Number(selectedDoctorId) : null
            });

            if (!orderResult.success) {
                alert('Failed to create order: ' + orderResult.error);
                setSubmitting(false);
                return;
            }

            // 2. Create invoice
            const testIds = selectedTestIds.map(vId => {
                const test = tests.find(t => t.version_id === vId);
                return test?.id;
            }).filter(Boolean) as number[];

            const invoiceResult = await window.electronAPI.invoices.create({
                orderId: orderResult.orderId,
                patientId: Number(selectedPatientId),
                priceListId: selectedPriceListId,
                testIds,
                discountPercent: parseFloat(discountPercent) || 0,
                discountReason: discountReason || undefined,
                createdBy: session?.userId
            });

            if (invoiceResult.success) {
                // Finalize immediately if no discount or low discount
                const discPct = parseFloat(discountPercent) || 0;
                if (discPct <= 20) {
                    await window.electronAPI.invoices.finalize(invoiceResult.invoiceId, session?.userId);
                }

                setShowForm(false);
                resetForm();
                loadData();

                // Navigate to invoice
                navigate('/billing/invoices');
            } else {
                alert('Order created but invoice failed: ' + invoiceResult.error);
            }
        } catch (e) {
            console.error('Create order error:', e);
            alert('An error occurred');
        }
        setSubmitting(false);
    };

    const resetForm = () => {
        setSelectedPatientId('');
        setSelectedDoctorId('');
        setSelectedTestIds([]);
        setDiscountPercent('');
        setDiscountReason('');
        setTestPrices(new Map());
    };

    // Calculate totals
    const selectedTestsData = tests.filter(t => selectedTestIds.includes(t.version_id));
    const getPrice = (test: Test) => {
        const price = testPrices.get(test.id);
        return price?.base_price || 0;
    };
    const subtotal = selectedTestsData.reduce((sum, t) => sum + getPrice(t), 0);
    const discountPct = parseFloat(discountPercent) || 0;
    const discountAmount = (subtotal * discountPct) / 100;
    const finalTotal = subtotal - discountAmount;

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

                        <div className="form-row">
                            <div className="form-group flex-1">
                                <label>Select Patient *</label>
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
                            <div className="form-group flex-1">
                                <label>Price List *</label>
                                <select
                                    className="input"
                                    value={selectedPriceListId}
                                    onChange={(e) => setSelectedPriceListId(Number(e.target.value))}
                                >
                                    {priceLists.map(pl => (
                                        <option key={pl.id} value={pl.id}>
                                            {pl.name} {pl.is_default === 1 ? '(Default)' : ''}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="form-group">
                            <label>Referring Doctor (Optional)</label>
                            <select
                                className="input"
                                value={selectedDoctorId}
                                onChange={(e) => setSelectedDoctorId(e.target.value ? Number(e.target.value) : '')}
                            >
                                <option value="">-- Walk-in / No Referral --</option>
                                {doctors.map(d => (
                                    <option key={d.id} value={d.id}>
                                        {d.name} ({d.doctor_code})
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
                                                        <td style={{ textAlign: 'right' }}>₹{getPrice(test).toLocaleString()}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>

                                        <div className="order-total">
                                            <div className="total-row">
                                                <span>Subtotal:</span>
                                                <span>₹{subtotal.toLocaleString()}</span>
                                            </div>
                                            <div className="discount-row">
                                                <label>Discount %:</label>
                                                <input
                                                    className="input discount-input"
                                                    type="number"
                                                    value={discountPercent}
                                                    onChange={(e) => setDiscountPercent(e.target.value)}
                                                    placeholder="0"
                                                    min="0"
                                                    max="100"
                                                />
                                            </div>
                                            {discountPct > 0 && (
                                                <>
                                                    <div className="total-row discount">
                                                        <span>Discount ({discountPct}%):</span>
                                                        <span>- ₹{discountAmount.toLocaleString()}</span>
                                                    </div>
                                                    {discountPct > 20 && (
                                                        <div className="form-group">
                                                            <label>Discount Reason (Required for &gt;20%)</label>
                                                            <input
                                                                className="input"
                                                                type="text"
                                                                value={discountReason}
                                                                onChange={(e) => setDiscountReason(e.target.value)}
                                                                placeholder="Enter reason for discount"
                                                            />
                                                        </div>
                                                    )}
                                                </>
                                            )}
                                            <div className="total-row final">
                                                <span>Total:</span>
                                                <span>₹{finalTotal.toLocaleString()}</span>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div className="form-actions">
                                    <button
                                        className="btn btn-primary"
                                        onClick={handleSubmit}
                                        disabled={selectedTestIds.length === 0 || submitting || (discountPct > 20 && !discountReason)}
                                    >
                                        {submitting ? 'Creating...' : 'Create Order & Invoice'}
                                    </button>
                                    <button className="btn btn-secondary" onClick={() => { setShowForm(false); resetForm(); }}>
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
                                        <td>₹{(order.net_amount || order.total_amount).toLocaleString()}</td>
                                        <td>
                                            <span className={`badge ${order.payment_status === 'PAID' ? 'badge-success' : order.payment_status === 'INVOICED' ? 'badge-info' : 'badge-warning'}`}>
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

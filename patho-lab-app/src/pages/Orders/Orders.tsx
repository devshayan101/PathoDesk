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
    price_list_id?: number;
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
    const [defaultPriceListId, setDefaultPriceListId] = useState<number | ''>('');

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
                setDefaultPriceListId(defaultPl.id);
            } else if (priceListsData.length > 0) {
                setSelectedPriceListId(priceListsData[0].id);
                setDefaultPriceListId(priceListsData[0].id);
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

    // Handle doctor selection - auto-select doctor's price list if available
    const handleDoctorChange = (doctorId: number | '') => {
        setSelectedDoctorId(doctorId);

        if (doctorId) {
            // Find the selected doctor and check if they have a price list assigned
            const doctor = doctors.find(d => d.id === doctorId);
            if (doctor?.price_list_id) {
                // Auto-select the doctor's price list
                setSelectedPriceListId(doctor.price_list_id);
            } else {
                // Doctor has no specific price list, use default
                if (defaultPriceListId) {
                    setSelectedPriceListId(defaultPriceListId);
                }
            }
        } else {
            // No doctor selected (Walk-in), reset to default price list
            if (defaultPriceListId) {
                setSelectedPriceListId(defaultPriceListId);
            }
        }
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
        <div className="orders-page" style={{ padding: '1.5rem', height: '100vh', display: 'flex', flexDirection: 'column' }}>
            <div className="page-header" style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h1 className="page-title" style={{ margin: 0 }}>Orders</h1>
                <button className="btn btn-primary" onClick={() => setShowForm(true)}>
                    + New Order
                </button>
            </div>

            {showForm && (
                <div className="modal-overlay" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div className="modal order-form-modal" style={{ maxWidth: '900px', width: '95%', maxHeight: '90vh', display: 'flex', flexDirection: 'column', padding: 0 }}>
                        <div className="modal-header" style={{ padding: '1.5rem', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h2 style={{ margin: 0 }}>Create New Order</h2>
                            <button className="close-btn" onClick={() => { setShowForm(false); resetForm(); }} style={{ fontSize: '1.5rem', background: 'none', border: 'none', cursor: 'pointer' }}>×</button>
                        </div>

                        <div className="modal-body" style={{ padding: '1.5rem', overflowY: 'auto', flex: 1, display: 'grid', gridTemplateColumns: '1fr 350px', gap: '2rem' }}>
                            {/* Left Column: Form Inputs */}
                            <div className="form-column">
                                <div className="section-title" style={{ marginBottom: '1rem', fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase', fontSize: '0.8rem', letterSpacing: '0.05em' }}>Patient Details</div>
                                <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                                    <div className="form-group">
                                        <label>Select Patient *</label>
                                        <select
                                            className="input"
                                            value={selectedPatientId}
                                            onChange={(e) => setSelectedPatientId(Number(e.target.value))}
                                            style={{ width: '100%' }}
                                        >
                                            <option value="">-- Select Patient --</option>
                                            {patients.map(p => (
                                                <option key={p.id} value={p.id}>
                                                    {p.full_name} ({p.patient_uid})
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label>Referring Doctor</label>
                                        <select
                                            className="input"
                                            value={selectedDoctorId}
                                            onChange={(e) => handleDoctorChange(e.target.value ? Number(e.target.value) : '')}
                                            style={{ width: '100%' }}
                                        >
                                            <option value="">-- Walk-in / Self --</option>
                                            {doctors.map(d => (
                                                <option key={d.id} value={d.id}>
                                                    {d.name} ({d.doctor_code}){d.price_list_id ? ' ★' : ''}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div className="form-group" style={{ marginBottom: '2rem' }}>
                                    <label>Price List * (Auto-selected)</label>
                                    <select
                                        className="input"
                                        value={selectedPriceListId}
                                        onChange={(e) => setSelectedPriceListId(Number(e.target.value))}
                                        style={{ width: '100%' }}
                                    >
                                        {priceLists.map(pl => (
                                            <option key={pl.id} value={pl.id}>
                                                {pl.name} {pl.is_default === 1 ? '(Default)' : ''}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {selectedPatientId && (
                                    <>
                                        <div className="section-title" style={{ marginBottom: '1rem', fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase', fontSize: '0.8rem', letterSpacing: '0.05em' }}>Select Tests</div>
                                        <div className="test-selection-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '0.75rem' }}>
                                            {tests.map(test => (
                                                <button
                                                    key={test.id}
                                                    type="button"
                                                    className={`test-card-btn ${selectedTestIds.includes(test.version_id) ? 'selected' : ''}`}
                                                    onClick={() => toggleTest(test.version_id)}
                                                    style={{
                                                        background: selectedTestIds.includes(test.version_id) ? 'var(--color-accent)' : 'var(--color-bg-card)',
                                                        color: selectedTestIds.includes(test.version_id) ? 'white' : 'var(--color-text-primary)',
                                                        border: `1px solid ${selectedTestIds.includes(test.version_id) ? 'var(--color-accent)' : 'var(--color-border)'}`,
                                                        padding: '0.75rem',
                                                        borderRadius: 'var(--radius-md)',
                                                        cursor: 'pointer',
                                                        textAlign: 'left',
                                                        transition: 'all 0.2s',
                                                        display: 'flex',
                                                        flexDirection: 'column',
                                                        justifyContent: 'space-between',
                                                        minHeight: '80px'
                                                    }}
                                                >
                                                    <span style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.25rem', display: 'block' }}>{test.test_code}</span>
                                                    <span style={{ fontSize: '0.75rem', opacity: 0.9, lineHeight: 1.2 }}>{test.test_name}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </>
                                )}
                            </div>

                            {/* Right Column: Order Summary */}
                            <div className="summary-column" style={{ background: 'var(--color-bg-tertiary)', padding: '1.5rem', borderRadius: 'var(--radius-lg)', display: 'flex', flexDirection: 'column' }}>
                                <h3 style={{ marginTop: 0, marginBottom: '1.5rem', fontSize: '1.1rem' }}>Order Summary</h3>

                                {selectedTestsData.length > 0 ? (
                                    <>
                                        <div className="selected-items" style={{ flex: 1, overflowY: 'auto', marginBottom: '1rem' }}>
                                            {selectedTestsData.map(test => (
                                                <div key={test.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                                                    <span style={{ fontSize: '0.9rem' }}>{test.test_name}</span>
                                                    <span style={{ fontWeight: 600 }}>₹{getPrice(test).toLocaleString()}</span>
                                                </div>
                                            ))}
                                        </div>

                                        <div className="order-totals" style={{ borderTop: '2px solid var(--color-border)', paddingTop: '1rem' }}>
                                            <div className="total-row" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                                <span style={{ color: 'var(--color-text-secondary)' }}>Subtotal</span>
                                                <span>₹{subtotal.toLocaleString()}</span>
                                            </div>

                                            <div className="discount-input-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                                <label style={{ fontSize: '0.9rem' }}>Discount %</label>
                                                <input
                                                    type="number"
                                                    value={discountPercent}
                                                    onChange={(e) => setDiscountPercent(e.target.value)}
                                                    placeholder="0"
                                                    min="0"
                                                    max="100"
                                                    style={{ width: '60px', padding: '0.25rem', borderRadius: '4px', border: '1px solid var(--color-border)' }}
                                                />
                                            </div>

                                            {discountPct > 0 && (
                                                <div className="total-row discount" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', color: 'var(--color-success)' }}>
                                                    <span>Discount ({discountPct}%)</span>
                                                    <span>- ₹{discountAmount.toLocaleString()}</span>
                                                </div>
                                            )}

                                            {discountPct > 20 && (
                                                <div className="form-group" style={{ marginBottom: '1rem' }}>
                                                    <input
                                                        className="input"
                                                        type="text"
                                                        value={discountReason}
                                                        onChange={(e) => setDiscountReason(e.target.value)}
                                                        placeholder="Reason for high discount..."
                                                        style={{ width: '100%', fontSize: '0.85rem' }}
                                                    />
                                                </div>
                                            )}

                                            <div className="total-row final" style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1rem', fontSize: '1.25rem', fontWeight: 'bold' }}>
                                                <span>Total</span>
                                                <span>₹{finalTotal.toLocaleString()}</span>
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <div style={{ textAlign: 'center', color: 'var(--color-text-muted)', marginTop: '2rem' }}>
                                        No tests selected
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="modal-footer" style={{ padding: '1.5rem', borderTop: '1px solid var(--color-border)', display: 'flex', justifyContent: 'flex-end', gap: '1rem', background: 'var(--color-bg-card)' }}>
                            <button className="btn btn-secondary" onClick={() => { setShowForm(false); resetForm(); }}>
                                Cancel
                            </button>
                            <button
                                className="btn btn-primary"
                                onClick={handleSubmit}
                                disabled={selectedTestIds.length === 0 || submitting || (discountPct > 20 && !discountReason)}
                                style={{ minWidth: '150px' }}
                            >
                                {submitting ? 'Creating...' : 'Create Order'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Orders list */}
            <div className="orders-table-container" style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', flex: 1, display: 'flex', flexDirection: 'column' }}>
                {loading ? <div className="loading">Loading orders...</div> : (
                    <div style={{ overflowY: 'auto', flex: 1 }}>
                        <table className="table">
                            <thead style={{ position: 'sticky', top: 0, zIndex: 1, background: 'var(--color-bg-tertiary)' }}>
                                <tr>
                                    <th>Order ID</th>
                                    <th>Patient</th>
                                    <th>Referring Doctor</th>
                                    <th>Date</th>
                                    <th style={{ textAlign: 'right' }}>Amount</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {orders.length === 0 ? (
                                    <tr><td colSpan={6} className="empty-row" style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>No recent orders</td></tr>
                                ) : (
                                    orders.map(order => (
                                        <tr key={order.id} style={{ borderLeft: order.payment_status === 'PAID' ? '3px solid var(--color-success)' : '3px solid transparent' }}>
                                            <td><code style={{ background: 'var(--color-bg-tertiary)', padding: '0.2rem 0.4rem', borderRadius: '3px' }}>{order.order_uid}</code></td>
                                            <td>
                                                <div style={{ fontWeight: 500 }}>{order.patient_name}</div>
                                                <small className="text-muted">{order.patient_uid}</small>
                                            </td>
                                            <td>{order.doctor_name || <span className="text-muted">-</span>}</td>
                                            <td>{new Date(order.order_date).toLocaleDateString()}</td>
                                            <td style={{ textAlign: 'right', fontWeight: 600 }}>₹{(order.net_amount || order.total_amount).toLocaleString()}</td>
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
                    </div>
                )}
            </div>
        </div>
    );
}

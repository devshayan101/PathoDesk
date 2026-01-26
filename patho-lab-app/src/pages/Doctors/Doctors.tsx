import { useState, useEffect } from 'react';
import { PDFDownloadLink } from '@react-pdf/renderer';
import { PaymentReceipt } from '../../components/PaymentReceipt';
import './Doctors.css';

interface Doctor {
    id: number;
    doctor_code: string;
    name: string;
    specialty?: string;
    phone?: string;
    clinic_address?: string;
    commission_model?: string;
    commission_rate?: number;
    price_list_id?: number;
    is_active: number;
    pending_commission?: number;
}

export default function DoctorsPage() {
    const [doctors, setDoctors] = useState<Doctor[]>([]);
    const [priceLists, setPriceLists] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingDoctor, setEditingDoctor] = useState<Doctor | null>(null);
    const [formData, setFormData] = useState({
        doctorCode: '',
        name: '',
        specialty: '',
        phone: '',
        clinicAddress: '',
        commissionModel: 'NONE',
        commissionRate: 0,
        priceListId: ''
    });

    // Commission Statement State
    const [showStatementModal, setShowStatementModal] = useState(false);
    const [statementLoading, setStatementLoading] = useState(false);
    const [selectedDoctorForStatement, setSelectedDoctorForStatement] = useState<Doctor | null>(null);
    const [statementData, setStatementData] = useState<any>(null);
    const [statementPeriod, setStatementPeriod] = useState({
        month: new Date().getMonth() + 1,
        year: new Date().getFullYear()
    });

    // Payment State
    const [activeTab, setActiveTab] = useState<'statement' | 'payment'>('statement');
    const [paymentForm, setPaymentForm] = useState({
        amount: 0,
        mode: 'CASH',
        reference: '',
        remarks: ''
    });
    const [lastPayment, setLastPayment] = useState<any>(null);
    const [submittingPayment, setSubmittingPayment] = useState(false);

    useEffect(() => {
        loadDoctors();
        loadPriceLists();
    }, []);

    const loadDoctors = async () => {
        setLoading(true);
        try {
            if (window.electronAPI) {
                const data = await window.electronAPI.doctors.listAll();
                setDoctors(data);
            }
        } catch (e) {
            console.error('Failed to load doctors:', e);
        }
        setLoading(false);
    };

    const loadPriceLists = async () => {
        try {
            if (window.electronAPI) {
                // Use priceLists.list() instead of billing.listPriceLists()
                const data = await window.electronAPI.priceLists.list();
                setPriceLists(data);
            }
        } catch (e) {
            console.error('Failed to load price lists:', e);
        }
    };

    const handleViewStatement = async (doctor: Doctor) => {
        setSelectedDoctorForStatement(doctor);
        setShowStatementModal(true);
        setActiveTab('statement');
        setLastPayment(null);
        setPaymentForm({
            amount: 0, // Will be set to total commission
            mode: 'CASH',
            reference: '',
            remarks: ''
        });
        await loadStatement(doctor.id, statementPeriod.month, statementPeriod.year);
    };

    const loadStatement = async (doctorId: number, month: number, year: number) => {
        setStatementLoading(true);
        try {
            if (window.electronAPI) {
                const data = await window.electronAPI.commissions.getStatement(doctorId, month, year);
                setStatementData(data);
                // Pre-fill payment amount
                if (data?.summary?.totalCommission) {
                    setPaymentForm(prev => ({ ...prev, amount: data.summary.totalCommission }));
                }
            }
        } catch (e) {
            console.error('Failed to load statement:', e);
        }
        setStatementLoading(false);
    };

    const handleRecordPayment = async (generatePdf: boolean = false) => {
        if (!selectedDoctorForStatement || !statementData) return;

        setSubmittingPayment(true);
        try {
            // 1. Create settlement if needed
            const settlement = await window.electronAPI.commissions.createSettlement(
                selectedDoctorForStatement.id,
                statementPeriod.month,
                statementPeriod.year
            );

            if (settlement.success && settlement.settlementId) {
                // 2. Record payment
                const result = await window.electronAPI.payments.record({ // Using generic payment record or commission specific?
                    // Wait, commissionService has recordSettlementPayment.
                    // Let's check preload. commissions.recordPayment takes (settlementId, amount, ...)
                    // But in preload helper it is:
                    // recordPayment: (settlementId: number, amount: number, paymentMode: string, paymentReference?: string, remarks?: string, userId?: number)
                });

                // Let's use correct call
                const paymentResult = await window.electronAPI.commissions.recordPayment(
                    settlement.settlementId,
                    paymentForm.amount,
                    paymentForm.mode,
                    paymentForm.reference,
                    paymentForm.remarks
                );

                if (paymentResult.success) {
                    // Success!
                    setLastPayment({
                        ...paymentForm,
                        doctorName: selectedDoctorForStatement.name,
                        doctorCode: selectedDoctorForStatement.doctor_code,
                        date: new Date().toLocaleDateString(),
                        id: 'PAY-' + Date.now(), // Temporary ID for UI
                        period: `${new Date(0, statementPeriod.month - 1).toLocaleString('default', { month: 'long' })} ${statementPeriod.year}`
                    });

                    // Refresh data
                    loadStatement(selectedDoctorForStatement.id, statementPeriod.month, statementPeriod.year);
                    loadDoctors(); // To update pending dues in list
                }
            }
        } catch (e) {
            console.error('Payment error:', e);
            alert('Failed to record payment');
        }
        setSubmittingPayment(false);
    };

    const handlePeriodChange = async (newMonth: number, newYear: number) => {
        setStatementPeriod({ month: newMonth, year: newYear });
        if (selectedDoctorForStatement) {
            await loadStatement(selectedDoctorForStatement.id, newMonth, newYear);
        }
    };

    const handleOpenModal = (doctor?: Doctor) => {
        if (doctor) {
            setEditingDoctor(doctor);
            setFormData({
                doctorCode: doctor.doctor_code,
                name: doctor.name,
                specialty: doctor.specialty || '',
                phone: doctor.phone || '',
                clinicAddress: doctor.clinic_address || '',
                commissionModel: doctor.commission_model || 'NONE',
                commissionRate: doctor.commission_rate || 0,
                priceListId: doctor.price_list_id?.toString() || ''
            });
        } else {
            setEditingDoctor(null);
            setFormData({
                doctorCode: '',
                name: '',
                specialty: '',
                phone: '',
                clinicAddress: '',
                commissionModel: 'NONE',
                commissionRate: 0,
                priceListId: ''
            });
        }
        setShowModal(true);
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setEditingDoctor(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!window.electronAPI) return;

        try {
            const submitData = {
                ...formData,
                priceListId: formData.priceListId ? parseInt(formData.priceListId) : undefined
            };

            if (editingDoctor) {
                await window.electronAPI.doctors.update(editingDoctor.id, submitData);
            } else {
                await window.electronAPI.doctors.create(submitData);
            }
            handleCloseModal();
            loadDoctors();
        } catch (e) {
            console.error('Save error:', e);
        }
    };

    const handleToggleActive = async (id: number) => {
        if (!window.electronAPI) return;
        await window.electronAPI.doctors.toggleActive(id);
        loadDoctors();
    };

    return (
        <div className="doctors-page">
            <div className="page-header">
                <h1>Referring Doctors</h1>
                <button className="btn btn-primary" onClick={() => handleOpenModal()}>
                    + Add Doctor
                </button>
            </div>

            <div className="card">
                {loading ? (
                    <div className="loading">Loading doctors...</div>
                ) : (
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Code</th>
                                <th>Name</th>
                                <th>Specialty</th>
                                <th>Phone</th>
                                <th>Pending Dues</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {doctors.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="empty-row">No doctors found</td>
                                </tr>
                            ) : (
                                doctors.map(doctor => (
                                    <tr key={doctor.id} className={doctor.is_active ? '' : 'inactive-row'}>
                                        <td><code>{doctor.doctor_code}</code></td>
                                        <td
                                            onClick={() => handleViewStatement(doctor)}
                                            style={{ cursor: 'pointer', color: '#3498db', fontWeight: 500 }}
                                            title="Click to view commission statement"
                                        >
                                            {doctor.name}
                                        </td>
                                        <td>{doctor.specialty || '—'}</td>
                                        <td>{doctor.phone || '—'}</td>
                                        <td>
                                            {doctor.pending_commission && doctor.pending_commission > 0 ? (
                                                <span style={{ color: '#e74c3c', fontWeight: 'bold' }}>
                                                    ₹{doctor.pending_commission.toFixed(2)}
                                                </span>
                                            ) : (
                                                <span style={{ color: '#aaa' }}>-</span>
                                            )}
                                        </td>
                                        <td>
                                            <span className={`badge ${doctor.is_active ? 'badge-success' : 'badge-secondary'}`}>
                                                {doctor.is_active ? 'Active' : 'Inactive'}
                                            </span>
                                        </td>
                                        <td>
                                            <button
                                                className="btn btn-sm btn-secondary"
                                                onClick={() => handleOpenModal(doctor)}
                                            >
                                                Edit
                                            </button>
                                            <button
                                                className="btn btn-sm btn-warning"
                                                onClick={() => handleToggleActive(doctor.id)}
                                            >
                                                {doctor.is_active ? 'Deactivate' : 'Activate'}
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Add/Edit Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={handleCloseModal}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>{editingDoctor ? 'Edit Doctor' : 'Add New Doctor'}</h2>
                            <button className="close-btn" onClick={handleCloseModal}>×</button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="form-grid">
                                <div className="form-group">
                                    <label>Doctor Code *</label>
                                    <input
                                        type="text"
                                        className="input"
                                        value={formData.doctorCode}
                                        onChange={e => setFormData({ ...formData, doctorCode: e.target.value })}
                                        placeholder="DR001"
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Name *</label>
                                    <input
                                        type="text"
                                        className="input"
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        placeholder="Dr. Name"
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Specialty</label>
                                    <input
                                        type="text"
                                        className="input"
                                        value={formData.specialty}
                                        onChange={e => setFormData({ ...formData, specialty: e.target.value })}
                                        placeholder="General Physician"
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Phone</label>
                                    <input
                                        type="text"
                                        className="input"
                                        value={formData.phone}
                                        onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                        placeholder="+91 98765 43210"
                                    />
                                </div>
                                <div className="form-group full-width">
                                    <label>Clinic Address</label>
                                    <textarea
                                        className="input"
                                        value={formData.clinicAddress}
                                        onChange={e => setFormData({ ...formData, clinicAddress: e.target.value })}
                                        placeholder="Clinic address..."
                                        rows={2}
                                    />
                                </div>

                                {/* Commission Configuration */}
                                <div className="form-group full-width" style={{ marginTop: '1rem', borderTop: '1px solid #ddd', paddingTop: '1rem' }}>
                                    <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.95rem', color: '#555' }}>Commission Configuration</h4>
                                </div>

                                <div className="form-group">
                                    <label>Commission Model</label>
                                    <select
                                        className="input"
                                        value={formData.commissionModel}
                                        onChange={e => setFormData({ ...formData, commissionModel: e.target.value })}
                                    >
                                        <option value="NONE">No Commission</option>
                                        <option value="PERCENTAGE">Percentage (%)</option>
                                        <option value="FLAT">Flat Amount (₹)</option>
                                    </select>
                                </div>

                                <div className="form-group">
                                    <label>
                                        Commission Rate
                                        {formData.commissionModel === 'PERCENTAGE' && ' (%)'}
                                        {formData.commissionModel === 'FLAT' && ' (₹)'}
                                    </label>
                                    <input
                                        type="number"
                                        className="input"
                                        value={formData.commissionRate}
                                        onChange={e => setFormData({ ...formData, commissionRate: parseFloat(e.target.value) || 0 })}
                                        placeholder={formData.commissionModel === 'PERCENTAGE' ? '25' : '100'}
                                        min="0"
                                        step={formData.commissionModel === 'PERCENTAGE' ? '0.1' : '1'}
                                        disabled={formData.commissionModel === 'NONE'}
                                    />
                                </div>

                                <div className="form-group">
                                    <label>Default Price List (Optional)</label>
                                    <select
                                        className="input"
                                        value={formData.priceListId}
                                        onChange={e => setFormData({ ...formData, priceListId: e.target.value })}
                                    >
                                        <option value="">-- Use Standard Pricing --</option>
                                        {priceLists.map(pl => (
                                            <option key={pl.id} value={pl.id}>
                                                {pl.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div className="modal-actions">
                                <button type="button" className="btn btn-secondary" onClick={handleCloseModal}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn btn-primary">
                                    {editingDoctor ? 'Update' : 'Add Doctor'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            {/* Commission Statement Modal */}
            {showStatementModal && selectedDoctorForStatement && (
                <div className="modal-overlay" onClick={() => setShowStatementModal(false)}>
                    <div className="modal" style={{ maxWidth: '900px', width: '90%' }} onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Commission Management - {selectedDoctorForStatement.name}</h2>
                            <button className="close-btn" onClick={() => setShowStatementModal(false)}>×</button>
                        </div>

                        <div className="modal-body" style={{ padding: 0 }}>
                            {/* Tabs */}
                            <div className="tabs" style={{ display: 'flex', borderBottom: '1px solid #ddd', padding: '0 1rem', background: '#f8f9fa' }}>
                                <button
                                    className={`tab-btn ${activeTab === 'statement' ? 'active' : ''}`}
                                    onClick={() => setActiveTab('statement')}
                                    style={{
                                        padding: '1rem',
                                        border: 'none',
                                        background: 'none',
                                        borderBottom: activeTab === 'statement' ? '2px solid #3498db' : 'none',
                                        color: activeTab === 'statement' ? '#3498db' : '#666',
                                        fontWeight: activeTab === 'statement' ? 'bold' : 'normal',
                                        cursor: 'pointer'
                                    }}
                                >
                                    Statement
                                </button>
                                <button
                                    className={`tab-btn ${activeTab === 'payment' ? 'active' : ''}`}
                                    onClick={() => setActiveTab('payment')}
                                    style={{
                                        padding: '1rem',
                                        border: 'none',
                                        background: 'none',
                                        borderBottom: activeTab === 'payment' ? '2px solid #3498db' : 'none',
                                        color: activeTab === 'payment' ? '#3498db' : '#666',
                                        fontWeight: activeTab === 'payment' ? 'bold' : 'normal',
                                        cursor: 'pointer'
                                    }}
                                >
                                    Record Payment
                                </button>
                            </div>

                            <div className="tab-content" style={{ padding: '1.5rem' }}>
                                {activeTab === 'statement' ? (
                                    <>
                                        <div className="filters-row" style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', alignItems: 'center', background: '#f8f9fa', padding: '1rem', borderRadius: '8px' }}>
                                            <div className="form-group" style={{ marginBottom: 0 }}>
                                                <label>Month</label>
                                                <select
                                                    className="input"
                                                    value={statementPeriod.month}
                                                    onChange={e => handlePeriodChange(parseInt(e.target.value), statementPeriod.year)}
                                                >
                                                    {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                                                        <option key={m} value={m}>{new Date(0, m - 1).toLocaleString('default', { month: 'long' })}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className="form-group" style={{ marginBottom: 0 }}>
                                                <label>Year</label>
                                                <select
                                                    className="input"
                                                    value={statementPeriod.year}
                                                    onChange={e => handlePeriodChange(statementPeriod.month, parseInt(e.target.value))}
                                                >
                                                    {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(y => (
                                                        <option key={y} value={y}>{y}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className="summary-badges" style={{ marginLeft: 'auto', display: 'flex', gap: '1rem' }}>
                                                <div className="badge badge-info" style={{ fontSize: '1rem', padding: '0.5rem 1rem' }}>
                                                    Tests: <strong>{statementData?.summary?.testCount || 0}</strong>
                                                </div>
                                                <div className="badge badge-success" style={{ fontSize: '1rem', padding: '0.5rem 1rem' }}>
                                                    Total: <strong>₹{statementData?.summary?.totalCommission?.toFixed(2) || '0.00'}</strong>
                                                </div>
                                            </div>
                                        </div>

                                        {statementLoading ? (
                                            <div className="loading">Loading statement...</div>
                                        ) : (
                                            <div className="table-container" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                                                <table className="table">
                                                    <thead>
                                                        <tr>
                                                            <th>Date</th>
                                                            <th>Patient</th>
                                                            <th>Test</th>
                                                            <th style={{ textAlign: 'right' }}>Price</th>
                                                            <th style={{ textAlign: 'right' }}>Commission</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {!statementData?.items || statementData.items.length === 0 ? (
                                                            <tr>
                                                                <td colSpan={5} className="empty-row">No commissions found for this period</td>
                                                            </tr>
                                                        ) : (
                                                            <>
                                                                {statementData.items.map((item, index) => (
                                                                    <tr key={index}>
                                                                        <td>{new Date(item.invoice_date).toLocaleDateString()}</td>
                                                                        <td>
                                                                            <div>{item.patient_name}</div>
                                                                            <small style={{ color: '#888' }}>{item.invoice_number}</small>
                                                                        </td>
                                                                        <td>{item.test_description}</td>
                                                                        <td style={{ textAlign: 'right' }}>₹{item.test_price.toFixed(2)}</td>
                                                                        <td style={{ textAlign: 'right', fontWeight: 'bold', color: '#27ae60' }}>
                                                                            ₹{item.commission_amount.toFixed(2)}
                                                                        </td>
                                                                    </tr>
                                                                ))}
                                                                <tr style={{ background: '#f8f9fa', fontWeight: 'bold' }}>
                                                                    <td colSpan={4} style={{ textAlign: 'right' }}>Total Commission:</td>
                                                                    <td style={{ textAlign: 'right', color: '#27ae60', fontSize: '1.2rem' }}>
                                                                        ₹{statementData?.summary?.totalCommission?.toFixed(2) || '0.00'}
                                                                    </td>
                                                                </tr>
                                                            </>
                                                        )}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}

                                        <div style={{ marginTop: '1rem', textAlign: 'right' }}>
                                            <button
                                                className="btn btn-primary"
                                                onClick={() => setActiveTab('payment')}
                                                disabled={!statementData?.summary?.totalCommission || statementData.summary.totalCommission <= 0}
                                            >
                                                Proceed to Payment
                                            </button>
                                        </div>
                                    </>
                                ) : (
                                    <div className="payment-form">
                                        <h3>Record Commission Payment</h3>

                                        {lastPayment ? (
                                            <div className="success-message" style={{ textAlign: 'center', padding: '2rem', background: '#e8f5e9', borderRadius: '8px' }}>
                                                <div style={{ fontSize: '3rem', color: '#27ae60', marginBottom: '1rem' }}>✓</div>
                                                <h3>Payment Recorded Successfully!</h3>
                                                <p>₹{lastPayment.amount} has been recorded for Dr. {lastPayment.doctorName}</p>

                                                <div style={{ marginTop: '2rem' }}>
                                                    <PDFDownloadLink
                                                        document={
                                                            <PaymentReceipt
                                                                doctorName={lastPayment.doctorName}
                                                                doctorCode={lastPayment.doctorCode}
                                                                paymentId={lastPayment.id}
                                                                paymentDate={lastPayment.date}
                                                                amount={lastPayment.amount}
                                                                paymentMode={lastPayment.mode}
                                                                reference={lastPayment.reference}
                                                                period={lastPayment.period}
                                                            />
                                                        }
                                                        fileName={`receipt_${lastPayment.period.replace(/\s/g, '_')}.pdf`}
                                                        className="btn btn-primary"
                                                    >
                                                        {({ blob, url, loading, error }) =>
                                                            loading ? 'Generating Receipt...' : 'Download Receipt PDF'
                                                        }
                                                    </PDFDownloadLink>

                                                    <button
                                                        className="btn btn-secondary"
                                                        onClick={() => {
                                                            setLastPayment(null);
                                                            setActiveTab('statement');
                                                            if (selectedDoctorForStatement) {
                                                                loadStatement(selectedDoctorForStatement.id, statementPeriod.month, statementPeriod.year);
                                                            }
                                                            loadDoctors(); // Refresh doctors list to update pending dues
                                                        }}
                                                        style={{ marginLeft: '1rem' }}
                                                    >
                                                        Back to Statement
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="form-grid" style={{ maxWidth: '600px', margin: '0 auto' }}>
                                                <div className="form-group full-width">
                                                    <label>Amount (₹)</label>
                                                    <input
                                                        type="number"
                                                        className="input"
                                                        style={{ fontSize: '1.2rem', fontWeight: 'bold' }}
                                                        value={paymentForm.amount}
                                                        onChange={e => setPaymentForm({ ...paymentForm, amount: parseFloat(e.target.value) || 0 })}
                                                    />
                                                </div>
                                                <div className="form-group full-width">
                                                    <label>Payment Mode</label>
                                                    <select
                                                        className="input"
                                                        value={paymentForm.mode}
                                                        onChange={e => setPaymentForm({ ...paymentForm, mode: e.target.value })}
                                                    >
                                                        <option value="CASH">Cash</option>
                                                        <option value="UPI">UPI</option>
                                                        <option value="NEFT">NEFT/RTGS</option>
                                                        <option value="CHEQUE">Cheque</option>
                                                    </select>
                                                </div>
                                                <div className="form-group full-width">
                                                    <label>Reference # (Optional)</label>
                                                    <input
                                                        type="text"
                                                        className="input"
                                                        placeholder="Transaction ID / Cheque No."
                                                        value={paymentForm.reference}
                                                        onChange={e => setPaymentForm({ ...paymentForm, reference: e.target.value })}
                                                    />
                                                </div>
                                                <div className="form-group full-width">
                                                    <label>Remarks</label>
                                                    <textarea
                                                        className="input"
                                                        rows={2}
                                                        value={paymentForm.remarks}
                                                        onChange={e => setPaymentForm({ ...paymentForm, remarks: e.target.value })}
                                                    />
                                                </div>

                                                <div className="actions" style={{ marginTop: '1rem', display: 'flex', gap: '1rem' }}>
                                                    <button
                                                        className="btn btn-primary"
                                                        style={{ flex: 1 }}
                                                        onClick={() => handleRecordPayment()}
                                                        disabled={submittingPayment || paymentForm.amount <= 0}
                                                    >
                                                        {submittingPayment ? 'Processing...' : 'Record Payment & Generate Receipt'}
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

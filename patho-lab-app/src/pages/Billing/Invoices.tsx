import { useState, useEffect } from 'react';
import { useToastStore } from '../../stores/toastStore';

import './Invoices.css';

interface Invoice {
    id: number;
    invoice_number: string;
    order_id: number;
    patient_id: number;
    patient_name: string;
    patient_uid: string;
    price_list_name: string;
    subtotal: number;
    discount_amount: number;
    gst_amount: number;
    total_amount: number;
    status: 'DRAFT' | 'FINALIZED' | 'CANCELLED';
    created_at: string;
    amount_paid: number;
    balance_due: number;
}

export default function Invoices() {

    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<string>('');
    const [statusFilter, setStatusFilter] = useState<string>('');
    const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
    const [showInvoiceModal, setShowInvoiceModal] = useState(false);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const showToast = useToastStore(s => s.showToast);
    const [paymentData, setPaymentData] = useState({
        amount: 0,
        paymentMode: 'CASH' as 'CASH' | 'CARD' | 'UPI' | 'CREDIT',
        referenceNumber: '',
        remarks: ''
    });

    useEffect(() => {
        loadInvoices();
    }, [statusFilter]);

    const loadInvoices = async () => {
        setLoading(true);
        try {
            const data = await window.electronAPI.invoices.list({ status: statusFilter || undefined });
            setInvoices(data);
        } catch (error) {
            console.error('Error loading invoices:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleViewInvoice = async (invoice: Invoice) => {
        try {
            const data = await window.electronAPI.invoices.get(invoice.id);
            setSelectedInvoice(data);
            setShowInvoiceModal(true);
        } catch (error) {
            console.error('Error loading invoice:', error);
        }
    };

    const handleFinalizeInvoice = async (invoiceId: number) => {
        if (!confirm('Finalize this invoice? This action cannot be undone.')) return;

        try {
            await window.electronAPI.invoices.finalize(invoiceId);
            loadInvoices();
            if (selectedInvoice?.id === invoiceId) {
                const data = await window.electronAPI.invoices.get(invoiceId);
                setSelectedInvoice(data);
            }
        } catch (error) {
            console.error('Error finalizing invoice:', error);
        }
    };

    const handleOpenPayment = async (invoice: Invoice) => {
        try {
            const data = await window.electronAPI.invoices.get(invoice.id);
            setSelectedInvoice(data);
            setPaymentData({ ...paymentData, amount: data.balance_due });
            setShowPaymentModal(true);
        } catch (error) {
            console.error('Error loading invoice for payment:', error);
        }
    };

    const handleRecordPayment = async () => {
        if (!selectedInvoice) return;

        try {
            const result = await window.electronAPI.payments.record({
                invoiceId: selectedInvoice.id,
                ...paymentData
            });

            if (result.success) {
                setShowPaymentModal(false);
                setPaymentData({ amount: 0, paymentMode: 'CASH', referenceNumber: '', remarks: '' });
                // Refresh the modal data if it's open
                if (showInvoiceModal) {
                    const data = await window.electronAPI.invoices.get(selectedInvoice.id);
                    setSelectedInvoice(data);
                }
                loadInvoices();
            } else {
                showToast(result.error || 'Failed to record payment', 'error');
            }
        } catch (error) {
            console.error('Error recording payment:', error);
        }
    };

    const handlePrintInvoice = async (invoice: Invoice) => {
        try {
            const data = await window.electronAPI.invoices.get(invoice.id);
            setSelectedInvoice(data);
            setShowInvoiceModal(true);
            // Delay to allow modal to render, then trigger print
            setTimeout(() => window.print(), 300);
        } catch (error) {
            console.error('Error loading invoice for print:', error);
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 0
        }).format(amount);
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getStatusBadge = (status: string) => {
        const classes: Record<string, string> = {
            'DRAFT': 'badge-warning',
            'FINALIZED': 'badge-success',
            'CANCELLED': 'badge-danger'
        };
        return <span className={`badge ${classes[status] || ''}`}>{status}</span>;
    };

    const filteredInvoices = invoices.filter(inv =>
        filter === '' ||
        inv.invoice_number.toLowerCase().includes(filter.toLowerCase()) ||
        inv.patient_name.toLowerCase().includes(filter.toLowerCase()) ||
        inv.patient_uid.toLowerCase().includes(filter.toLowerCase())
    );

    return (
        <div className="invoices-page">
            <div className="page-header">
                <h1>🧾 Invoices</h1>
                <div className="header-actions">
                    <input
                        type="text"
                        placeholder="Search invoices..."
                        value={filter}
                        onChange={e => setFilter(e.target.value)}
                        className="search-input"
                    />
                    <select
                        value={statusFilter}
                        onChange={e => setStatusFilter(e.target.value)}
                        className="status-filter"
                    >
                        <option value="">All Status</option>
                        <option value="DRAFT">Draft</option>
                        <option value="FINALIZED">Finalized</option>
                        <option value="CANCELLED">Cancelled</option>
                    </select>
                </div>
            </div>

            {/* Full-width Invoice List */}
            <div className="invoices-list-full" style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', display: 'flex', flexDirection: 'column', flex: 1 }}>
                {loading ? (
                    <div className="loading">Loading...</div>
                ) : filteredInvoices.length === 0 ? (
                    <div className="empty-state">No invoices found</div>
                ) : (
                    <div className="table-container-invoice" style={{ overflowY: 'auto', flex: 1 }}>
                        <table className="table">
                            <thead style={{ position: 'sticky', top: 0, zIndex: 1, background: 'var(--color-bg-tertiary)' }}>
                                <tr>
                                    <th>Invoice #</th>
                                    <th>Patient</th>
                                    <th>Date</th>
                                    <th style={{ textAlign: 'right' }}>Amount</th>
                                    <th>Status</th>
                                    <th style={{ textAlign: 'right' }}>Balance</th>
                                    <th style={{ textAlign: 'center' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredInvoices.map(invoice => (
                                    <tr key={invoice.id}>
                                        <td style={{ fontWeight: 600, cursor: 'pointer' }} onClick={() => handleViewInvoice(invoice)}>{invoice.invoice_number}</td>
                                        <td style={{ cursor: 'pointer' }} onClick={() => handleViewInvoice(invoice)}>
                                            <div style={{ fontWeight: 500 }}>{invoice.patient_name}</div>
                                            <small className="text-muted">{invoice.patient_uid}</small>
                                        </td>
                                        <td style={{ cursor: 'pointer' }} onClick={() => handleViewInvoice(invoice)}>{formatDate(invoice.created_at)}</td>
                                        <td style={{ textAlign: 'right', fontWeight: 600, cursor: 'pointer' }} onClick={() => handleViewInvoice(invoice)}>{formatCurrency(invoice.total_amount)}</td>
                                        <td style={{ cursor: 'pointer' }} onClick={() => handleViewInvoice(invoice)}>{getStatusBadge(invoice.status)}</td>
                                        <td style={{ textAlign: 'right', cursor: 'pointer' }} onClick={() => handleViewInvoice(invoice)}>
                                            {invoice.status === 'FINALIZED'
                                                ? (invoice.balance_due > 0 ? (
                                                    <span style={{ color: 'var(--color-error)', fontWeight: 'bold' }}>{formatCurrency(invoice.balance_due)}</span>
                                                ) : (
                                                    <span style={{ color: 'var(--color-success)' }}>Paid</span>
                                                ))
                                                : '-'
                                            }
                                        </td>
                                        <td style={{ textAlign: 'center' }}>
                                            <div className="modal-actions-bar" style={{ justifyContent: 'center' }}>
                                                <button className="btn btn-secondary" style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem' }} onClick={() => handleViewInvoice(invoice)} title="View Invoice">
                                                    👁️
                                                </button>
                                                <button className="btn btn-secondary" style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem' }} onClick={() => handlePrintInvoice(invoice)} title="Print Invoice">
                                                    🖨️
                                                </button>
                                                {invoice.status === 'FINALIZED' && invoice.balance_due > 0 && (
                                                    <button className="btn btn-primary" style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem' }} onClick={() => handleOpenPayment(invoice)} title="Receive Payment">
                                                        💳
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Invoice Detail Modal (Fullscreen, Resizable) */}
            {showInvoiceModal && selectedInvoice && (
                <div className="modal-overlay" onClick={() => setShowInvoiceModal(false)}>
                    <div className="modal modal-fullscreen" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                <h2>INVOICE — {selectedInvoice.invoice_number}</h2>
                                {getStatusBadge(selectedInvoice.status)}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                {selectedInvoice.status === 'DRAFT' && (
                                    <button className="btn btn-success" onClick={() => handleFinalizeInvoice(selectedInvoice.id)}>
                                        ✓ Finalize
                                    </button>
                                )}
                                {selectedInvoice.status === 'FINALIZED' && selectedInvoice.balance_due > 0 && (
                                    <button className="btn btn-primary" onClick={() => {
                                        setPaymentData({ ...paymentData, amount: selectedInvoice.balance_due });
                                        setShowPaymentModal(true);
                                    }}>
                                        💳 Receive Payment
                                    </button>
                                )}
                                <button className="btn btn-secondary" onClick={() => window.print()}>
                                    🖨️ Print Invoice
                                </button>
                                <button className="modal-close-btn" onClick={() => setShowInvoiceModal(false)}>×</button>
                            </div>
                        </div>

                        <div className="modal-body">
                            <div className="invoice-paper" style={{ background: 'white', padding: '2rem', borderRadius: 'var(--radius-sm)', boxShadow: 'var(--shadow-lg)', color: 'black', maxWidth: '800px', margin: '0 auto' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem', borderBottom: '2px solid #eee', paddingBottom: '1rem' }}>
                                    <div>
                                        <h2 style={{ margin: 0, fontSize: '1.5rem', color: '#333' }}>INVOICE</h2>
                                        <div style={{ fontSize: '1.2rem', fontWeight: 'bold', margin: '0.5rem 0' }}>{selectedInvoice.invoice_number}</div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div><label style={{ color: '#666', marginRight: '0.5rem' }}>Date:</label><span style={{ fontWeight: 600 }}>{formatDate(selectedInvoice.created_at)}</span></div>
                                        <div><label style={{ color: '#666', marginRight: '0.5rem' }}>Price List:</label><span>{selectedInvoice.price_list_name || 'Standard'}</span></div>
                                    </div>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '2rem' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.75rem', textTransform: 'uppercase', color: '#666', marginBottom: '0.25rem' }}>Bill To:</label>
                                        <div style={{ fontWeight: 600, fontSize: '1.1rem' }}>{selectedInvoice.patient_name}</div>
                                        <div style={{ color: '#444' }}>ID: {selectedInvoice.patient_uid}</div>
                                        {selectedInvoice.doctor_name && (
                                            <div style={{ marginTop: '0.5rem', color: '#555' }}>Ref: {selectedInvoice.doctor_name}</div>
                                        )}
                                    </div>
                                </div>

                                <h4 style={{ borderBottom: '1px solid #000', paddingBottom: '0.5rem', marginBottom: '0.5rem', textTransform: 'uppercase', fontSize: '0.85rem' }}>Test Details</h4>
                                <table style={{ width: '100%', marginBottom: '2rem', borderCollapse: 'collapse' }}>
                                    <thead>
                                        <tr style={{ background: '#f9f9f9' }}>
                                            <th style={{ textAlign: 'left', padding: '0.5rem' }}>Description</th>
                                            <th style={{ textAlign: 'right', padding: '0.5rem', width: '100px' }}>Price</th>
                                            <th style={{ textAlign: 'right', padding: '0.5rem', width: '80px' }}>GST</th>
                                            <th style={{ textAlign: 'right', padding: '0.5rem', width: '120px' }}>Total</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {selectedInvoice.items?.map((item: any) => (
                                            <tr key={item.id} style={{ borderBottom: '1px solid #eee' }}>
                                                <td style={{ padding: '0.75rem 0.5rem' }}>{item.description}</td>
                                                <td style={{ textAlign: 'right', padding: '0.75rem 0.5rem' }}>{formatCurrency(item.unit_price)}</td>
                                                <td style={{ textAlign: 'right', padding: '0.75rem 0.5rem' }}>{item.gst_rate > 0 ? `${item.gst_rate}%` : '-'}</td>
                                                <td style={{ textAlign: 'right', padding: '0.75rem 0.5rem', fontWeight: 600 }}>{formatCurrency(item.line_total)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>

                                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                    <div style={{ width: '250px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.25rem 0' }}>
                                            <span>Subtotal</span>
                                            <span>{formatCurrency(selectedInvoice.subtotal)}</span>
                                        </div>
                                        {selectedInvoice.discount_amount > 0 && (
                                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.25rem 0', color: 'var(--color-critical)' }}>
                                                <span>Discount</span>
                                                <span>- {formatCurrency(selectedInvoice.discount_amount)}</span>
                                            </div>
                                        )}
                                        {selectedInvoice.gst_amount > 0 && (
                                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.25rem 0', color: '#666' }}>
                                                <span>GST</span>
                                                <span>{formatCurrency(selectedInvoice.gst_amount)}</span>
                                            </div>
                                        )}
                                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', marginTop: '0.5rem', borderTop: '2px solid #000', fontSize: '1.2rem', fontWeight: 'bold' }}>
                                            <span>Total</span>
                                            <span>{formatCurrency(selectedInvoice.total_amount)}</span>
                                        </div>
                                    </div>
                                </div>

                                {selectedInvoice.payments && selectedInvoice.payments.length > 0 && (
                                    <div style={{ marginTop: '2rem' }}>
                                        <h4 style={{ borderBottom: '1px solid #ccc', paddingBottom: '0.5rem', marginBottom: '0.5rem', fontSize: '0.85rem' }}>Payments</h4>
                                        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '1rem' }}>
                                            <thead>
                                                <tr style={{ background: '#f9f9f9' }}>
                                                    <th style={{ textAlign: 'left', padding: '0.5rem' }}>Date</th>
                                                    <th style={{ textAlign: 'left', padding: '0.5rem' }}>Mode</th>
                                                    <th style={{ textAlign: 'left', padding: '0.5rem' }}>Reference</th>
                                                    <th style={{ textAlign: 'right', padding: '0.5rem' }}>Amount</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {selectedInvoice.payments.map((payment: any) => (
                                                    <tr key={payment.id} style={{ borderBottom: '1px solid #eee' }}>
                                                        <td style={{ padding: '0.5rem' }}>{formatDate(payment.payment_date)}</td>
                                                        <td style={{ padding: '0.5rem' }}>{payment.payment_mode}</td>
                                                        <td style={{ padding: '0.5rem' }}>{payment.reference_number || '-'}</td>
                                                        <td style={{ textAlign: 'right', padding: '0.5rem', fontWeight: 600 }}>{formatCurrency(payment.amount)}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                            <div style={{ width: '250px' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.25rem 0' }}>
                                                    <span>Total Paid</span>
                                                    <span style={{ color: 'green', fontWeight: 600 }}>{formatCurrency(selectedInvoice.amount_paid)}</span>
                                                </div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.25rem 0', fontWeight: 600 }}>
                                                    <span>Balance Due</span>
                                                    <span style={{ color: selectedInvoice.balance_due > 0 ? 'red' : 'green' }}>{formatCurrency(selectedInvoice.balance_due)}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Payment Modal */}
            {showPaymentModal && selectedInvoice && (
                <div className="modal-overlay" onClick={() => setShowPaymentModal(false)}>
                    <div className="modal modal-sm" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Record Payment</h3>
                            <button className="modal-close-btn" onClick={() => setShowPaymentModal(false)}>×</button>
                        </div>
                        <div className="modal-body">
                            <div className="payment-info">
                                <span>Invoice: {selectedInvoice.invoice_number}</span>
                                <span>Balance Due: {formatCurrency(selectedInvoice.balance_due)}</span>
                            </div>
                            <div className="form-group">
                                <label>Amount *</label>
                                <input
                                    type="number"
                                    value={paymentData.amount}
                                    onChange={e => setPaymentData({ ...paymentData, amount: parseFloat(e.target.value) || 0 })}
                                    max={selectedInvoice.balance_due}
                                    min="0"
                                    step="1"
                                />
                            </div>
                            <div className="form-group">
                                <label>Payment Mode *</label>
                                <select
                                    value={paymentData.paymentMode}
                                    onChange={e => setPaymentData({ ...paymentData, paymentMode: e.target.value as any })}
                                >
                                    <option value="CASH">Cash</option>
                                    <option value="CARD">Card</option>
                                    <option value="UPI">UPI</option>
                                    <option value="CREDIT">Credit/Due</option>
                                </select>
                            </div>
                            {paymentData.paymentMode !== 'CASH' && (
                                <div className="form-group">
                                    <label>Reference Number</label>
                                    <input
                                        type="text"
                                        value={paymentData.referenceNumber}
                                        onChange={e => setPaymentData({ ...paymentData, referenceNumber: e.target.value })}
                                        placeholder="Transaction ID / Reference"
                                    />
                                </div>
                            )}
                            <div className="form-group">
                                <label>Remarks</label>
                                <input
                                    type="text"
                                    value={paymentData.remarks}
                                    onChange={e => setPaymentData({ ...paymentData, remarks: e.target.value })}
                                    placeholder="Optional notes"
                                />
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn" onClick={() => setShowPaymentModal(false)}>Cancel</button>
                            <button
                                className="btn btn-primary"
                                onClick={handleRecordPayment}
                                disabled={paymentData.amount <= 0 || paymentData.amount > selectedInvoice.balance_due}
                            >
                                Record Payment
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

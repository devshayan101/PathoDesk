import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
    const navigate = useNavigate();
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<string>('');
    const [statusFilter, setStatusFilter] = useState<string>('');
    const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
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
                handleViewInvoice({ id: invoiceId } as Invoice);
            }
        } catch (error) {
            console.error('Error finalizing invoice:', error);
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
                handleViewInvoice({ id: selectedInvoice.id } as Invoice);
                loadInvoices();
            } else {
                alert(result.error || 'Failed to record payment');
            }
        } catch (error) {
            console.error('Error recording payment:', error);
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

            <div className="invoices-layout">
                {/* Invoice List */}
                <div className="invoices-list-panel">
                    {loading ? (
                        <div className="loading">Loading...</div>
                    ) : filteredInvoices.length === 0 ? (
                        <div className="empty-state">No invoices found</div>
                    ) : (
                        <table className="invoices-table">
                            <thead>
                                <tr>
                                    <th>Invoice #</th>
                                    <th>Patient</th>
                                    <th>Date</th>
                                    <th>Amount</th>
                                    <th>Status</th>
                                    <th>Balance</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredInvoices.map(invoice => (
                                    <tr
                                        key={invoice.id}
                                        className={selectedInvoice?.id === invoice.id ? 'selected' : ''}
                                        onClick={() => handleViewInvoice(invoice)}
                                    >
                                        <td className="invoice-number">{invoice.invoice_number}</td>
                                        <td>
                                            <div className="patient-info">
                                                <span className="patient-name">{invoice.patient_name}</span>
                                                <span className="patient-uid">{invoice.patient_uid}</span>
                                            </div>
                                        </td>
                                        <td className="date">{formatDate(invoice.created_at)}</td>
                                        <td className="amount">{formatCurrency(invoice.total_amount)}</td>
                                        <td>{getStatusBadge(invoice.status)}</td>
                                        <td className={`balance ${invoice.balance_due > 0 ? 'due' : ''}`}>
                                            {invoice.status === 'FINALIZED'
                                                ? (invoice.balance_due > 0 ? formatCurrency(invoice.balance_due) : 'Paid')
                                                : '-'
                                            }
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* Invoice Detail */}
                <div className="invoice-detail-panel">
                    {selectedInvoice ? (
                        <>
                            <div className="detail-header">
                                <div>
                                    <h2>{selectedInvoice.invoice_number}</h2>
                                    {getStatusBadge(selectedInvoice.status)}
                                </div>
                                <div className="detail-actions">
                                    {selectedInvoice.status === 'DRAFT' && (
                                        <button
                                            className="btn btn-success"
                                            onClick={() => handleFinalizeInvoice(selectedInvoice.id)}
                                        >
                                            ✓ Finalize
                                        </button>
                                    )}
                                    {selectedInvoice.status === 'FINALIZED' && selectedInvoice.balance_due > 0 && (
                                        <button
                                            className="btn btn-primary"
                                            onClick={() => {
                                                setPaymentData({ ...paymentData, amount: selectedInvoice.balance_due });
                                                setShowPaymentModal(true);
                                            }}
                                        >
                                            💳 Record Payment
                                        </button>
                                    )}
                                    <button className="btn" onClick={() => window.print()}>
                                        🖨️ Print
                                    </button>
                                </div>
                            </div>

                            <div className="detail-body">
                                <div className="info-section">
                                    <div className="info-row">
                                        <label>Patient:</label>
                                        <span>{selectedInvoice.patient_name} ({selectedInvoice.patient_uid})</span>
                                    </div>
                                    <div className="info-row">
                                        <label>Price List:</label>
                                        <span>{selectedInvoice.price_list_name || 'Standard'}</span>
                                    </div>
                                    <div className="info-row">
                                        <label>Date:</label>
                                        <span>{formatDate(selectedInvoice.created_at)}</span>
                                    </div>
                                    {selectedInvoice.doctor_name && (
                                        <div className="info-row">
                                            <label>Referred By:</label>
                                            <span>{selectedInvoice.doctor_name}</span>
                                        </div>
                                    )}
                                </div>

                                <h4>Items</h4>
                                <table className="items-table">
                                    <thead>
                                        <tr>
                                            <th>Description</th>
                                            <th>Price</th>
                                            <th>GST</th>
                                            <th>Total</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {selectedInvoice.items?.map((item: any) => (
                                            <tr key={item.id}>
                                                <td>{item.description}</td>
                                                <td>{formatCurrency(item.unit_price)}</td>
                                                <td>{item.gst_rate > 0 ? `${item.gst_rate}%` : '-'}</td>
                                                <td>{formatCurrency(item.line_total)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>

                                <div className="totals-section">
                                    <div className="total-row">
                                        <span>Subtotal</span>
                                        <span>{formatCurrency(selectedInvoice.subtotal)}</span>
                                    </div>
                                    {selectedInvoice.discount_amount > 0 && (
                                        <div className="total-row discount">
                                            <span>Discount</span>
                                            <span>- {formatCurrency(selectedInvoice.discount_amount)}</span>
                                        </div>
                                    )}
                                    {selectedInvoice.gst_amount > 0 && (
                                        <div className="total-row">
                                            <span>GST</span>
                                            <span>{formatCurrency(selectedInvoice.gst_amount)}</span>
                                        </div>
                                    )}
                                    <div className="total-row grand-total">
                                        <span>Total</span>
                                        <span>{formatCurrency(selectedInvoice.total_amount)}</span>
                                    </div>
                                </div>

                                {selectedInvoice.payments && selectedInvoice.payments.length > 0 && (
                                    <>
                                        <h4>Payments</h4>
                                        <table className="payments-table">
                                            <thead>
                                                <tr>
                                                    <th>Date</th>
                                                    <th>Mode</th>
                                                    <th>Reference</th>
                                                    <th>Amount</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {selectedInvoice.payments.map((payment: any) => (
                                                    <tr key={payment.id}>
                                                        <td>{formatDate(payment.payment_date)}</td>
                                                        <td>{payment.payment_mode}</td>
                                                        <td>{payment.reference_number || '-'}</td>
                                                        <td className="amount">{formatCurrency(payment.amount)}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>

                                        <div className="balance-summary">
                                            <div className="balance-row">
                                                <span>Total Paid</span>
                                                <span className="paid">{formatCurrency(selectedInvoice.amount_paid)}</span>
                                            </div>
                                            <div className="balance-row">
                                                <span>Balance Due</span>
                                                <span className={selectedInvoice.balance_due > 0 ? 'due' : 'paid'}>
                                                    {formatCurrency(selectedInvoice.balance_due)}
                                                </span>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        </>
                    ) : (
                        <div className="no-selection">
                            Select an invoice to view details
                        </div>
                    )}
                </div>
            </div>

            {/* Payment Modal */}
            {showPaymentModal && selectedInvoice && (
                <div className="modal-overlay" onClick={() => setShowPaymentModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Record Payment</h3>
                            <button className="close-btn" onClick={() => setShowPaymentModal(false)}>×</button>
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

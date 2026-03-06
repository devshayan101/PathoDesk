import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useToastStore } from '../../stores/toastStore';
import ResultEntryForm from '../Results/ResultEntryForm';
import CombinedReportPreview from '../../components/Report/CombinedReportPreview';
import './OrderResults.css';

export default function OrderResultsPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const showToast = useToastStore(s => s.showToast);

    const [loading, setLoading] = useState(true);
    const [orderInfo, setOrderInfo] = useState<any>(null);
    const [samples, setSamples] = useState<any[]>([]);
    const [expandedSampleIds, setExpandedSampleIds] = useState<number[]>([]);
    const initialExpandDone = useRef(false);
    const [showReport, setShowReport] = useState(false);

    useEffect(() => {
        if (id) {
            loadOrderData(parseInt(id));
        }
    }, [id]);

    const loadOrderData = async (orderId: number) => {
        setLoading(true);
        try {
            if (window.electronAPI) {
                // 1. Get the order summary
                const orderData = await window.electronAPI.orders.get(orderId);
                if (orderData) {
                    setOrderInfo(orderData);
                }

                // 2. Get samples associated with this order's tests. 
                // Currently, samples are fetched globally. We'll filter them natively for now.
                const allSamples = await window.electronAPI.samples.list();
                const orderSamples = allSamples.filter(s => s.order_uid === orderData?.order_uid);
                setSamples(orderSamples);

                if (orderSamples.length > 0 && !initialExpandDone.current) {
                    setExpandedSampleIds(orderSamples.map(s => s.id));
                    initialExpandDone.current = true;
                }

                // 3. TODO: In the next step, fetch the parameters and existing results for each test.
            }
        } catch (e: any) {
            showToast('Failed to load order results data: ' + e.message, 'error');
        }
        setLoading(false);
    };

    if (loading) return <div className="page-container"><div className="loading">Loading Order Results...</div></div>;
    if (!orderInfo) return <div className="page-container"><div className="empty">Order not found.</div></div>;

    return (
        <div className="order-results-page">
            <div className="page-header" style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center' }}>
                <button className="btn btn-secondary btn-icon" onClick={() => navigate('/orders')} style={{ marginRight: '1rem', width: '40px', height: '40px', borderRadius: '50%' }}>
                    ←
                </button>
                <div>
                    <h1 className="page-title" style={{ margin: 0 }}>Result Entry: {orderInfo.order_uid}</h1>
                    <div style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)', marginTop: '0.25rem' }}>
                        Patient: <strong>{orderInfo.patient_name}</strong> | Doctor: {orderInfo.doctor_name || 'Self'}
                    </div>
                </div>

                <div style={{ marginLeft: 'auto', display: 'flex', gap: '1rem' }}>
                    <button className="btn btn-primary" onClick={() => setShowReport(true)}>📄 View Combined Report</button>
                    <button className="btn btn-primary" onClick={() => { }}>✓ Complete Order</button>
                </div>
            </div>

            <div className="samples-accordion-container">
                {samples.length === 0 ? (
                    <div className="empty-state" style={{ padding: '3rem', textAlign: 'center', background: 'var(--color-bg-tertiary)', borderRadius: 'var(--radius-lg)' }}>
                        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🧪</div>
                        <h3>No Samples Found</h3>
                        <p className="text-muted">Samples must be collected before entering results.</p>
                        <button className="btn btn-secondary" style={{ marginTop: '1rem' }} onClick={() => navigate('/samples')}>Go to Samples</button>
                    </div>
                ) : (
                    <div className="accordion-list">
                        {samples.map((sample: any, index: number) => {
                            const isExpanded = expandedSampleIds.includes(sample.id);

                            return (
                                <div key={sample.id} className={`accordion-item ${isExpanded ? 'expanded' : ''}`} style={{ marginBottom: '1rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', overflow: 'hidden', background: 'var(--color-bg-card)' }}>
                                    <div
                                        className="accordion-header"
                                        onClick={() => setExpandedSampleIds(isExpanded ? expandedSampleIds.filter(id => id !== sample.id) : [...expandedSampleIds, sample.id])}
                                        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.5rem', background: isExpanded ? 'var(--color-bg-tertiary)' : 'var(--color-bg-card)', cursor: 'pointer', transition: 'background 0.2s' }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--color-accent)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                                                {index + 1}
                                            </div>
                                            <div>
                                                <div style={{ fontWeight: 600, fontSize: '1.1rem' }}>{sample.test_name}</div>
                                                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginTop: '0.2rem' }}>Barcode: {sample.sample_uid} | Status: <span style={{ color: sample.status === 'VERIFIED' ? 'var(--color-success)' : 'inherit' }}>{sample.status}</span></div>
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                            {sample.status === 'VERIFIED' && <span className="badge badge-success">✓ Verified</span>}
                                            <span style={{ fontSize: '1.2rem', color: 'var(--color-text-muted)', transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.3s' }}>
                                                ▼
                                            </span>
                                        </div>
                                    </div>

                                    {isExpanded && (
                                        <div className="accordion-content" style={{ padding: '0', borderTop: '1px solid var(--color-border)' }}>
                                            {/* Reuse the existing single-test result entry form, but remove its standalone padding if needed */}
                                            <div style={{ transform: 'scale(0.98)', transformOrigin: 'top center' }}>
                                                <ResultEntryForm
                                                    sampleId={sample.id}
                                                    onClose={() => setExpandedSampleIds(expandedSampleIds.filter(id => id !== sample.id))}
                                                    onSampleUpdate={() => loadOrderData(parseInt(id || '0'))}
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {showReport && orderInfo && (
                <CombinedReportPreview
                    orderId={orderInfo.id}
                    onClose={() => setShowReport(false)}
                />
            )}
        </div>
    );
}

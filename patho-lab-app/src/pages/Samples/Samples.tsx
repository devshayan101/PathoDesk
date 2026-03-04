import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Samples.css';

interface Sample {
    id: number;
    sample_uid: string;
    order_uid: string;
    patient_name: string;
    test_name: string;
    status: string;
    collected_at: string;
}

export default function SamplesPage() {
    const navigate = useNavigate();
    const [samples, setSamples] = useState<Sample[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadSamples();
    }, []);

    const loadSamples = async () => {
        setLoading(true);
        try {
            if (window.electronAPI) {
                const data = await window.electronAPI.samples.list();
                setSamples(data);
            }
        } catch (e) {
            console.error('Failed to load samples:', e);
        }
        setLoading(false);
    };

    const handleReceive = async (sampleId: number) => {
        try {
            if (window.electronAPI) {
                await window.electronAPI.samples.receive(sampleId);
                await loadSamples();
            }
        } catch (e) {
            console.error('Failed to receive sample:', e);
        }
    };

    const handlePrintBarcode = (sample: Sample) => {
        // Create a printable barcode window
        const printContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Sample Barcode</title>
                <style>
                    body { 
                        font-family: monospace; 
                        text-align: center; 
                        padding: 20px;
                    }
                    .barcode-container {
                        border: 2px solid #000;
                        padding: 15px;
                        display: inline-block;
                        margin: 10px;
                    }
                    .sample-uid { 
                        font-size: 24px; 
                        font-weight: bold;
                        letter-spacing: 3px;
                    }
                    .barcode-lines {
                        font-size: 36px;
                        letter-spacing: -2px;
                        margin: 10px 0;
                    }
                    .details { 
                        font-size: 12px; 
                        margin-top: 10px;
                    }
                </style>
            </head>
            <body>
                <div class="barcode-container">
                    <div class="sample-uid">${sample.sample_uid}</div>
                    <div class="barcode-lines">|||||||||||||||||||</div>
                    <div class="details">
                        ${sample.patient_name}<br/>
                        ${sample.test_name}<br/>
                        ${new Date().toLocaleDateString()}
                    </div>
                </div>
                <script>window.print(); setTimeout(() => window.close(), 500);</script>
            </body>
            </html>
        `;

        const printWindow = window.open('', '_blank', 'width=400,height=300');
        if (printWindow) {
            printWindow.document.write(printContent);
            printWindow.document.close();
        }
    };

    return (
        <div className="samples-page">
            <div className="page-header">
                <h1 className="page-title">Sample Accession</h1>
                <div className="header-actions" style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <div className="search-box">
                        <input
                            type="text"
                            className="input"
                            placeholder="Search UID, Order or Patient..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{ minWidth: '250px' }}
                        />
                    </div>
                    <button className="btn btn-secondary" onClick={loadSamples}>
                        ↻ Refresh
                    </button>
                </div>
            </div>

            <div className="samples-table-container" style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
                {loading ? <div className="loading">Loading samples...</div> : (
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Sample ID</th>
                                <th>Order ID</th>
                                <th>Patient</th>
                                <th>Test</th>
                                <th>Status</th>
                                <th style={{ textAlign: 'right' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {(() => {
                                const filteredSamples = samples.filter(sample =>
                                    sample.sample_uid.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                    sample.order_uid.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                    sample.patient_name.toLowerCase().includes(searchTerm.toLowerCase())
                                );

                                if (filteredSamples.length === 0) {
                                    return (
                                        <tr>
                                            <td colSpan={6} className="empty-row" style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                                                {searchTerm ? `No samples found matching "${searchTerm}"` : 'No samples awaiting accession'}
                                            </td>
                                        </tr>
                                    );
                                }

                                return filteredSamples.map(sample => (
                                    <tr key={sample.id} style={{ borderLeft: sample.status === 'RECEIVED' ? '3px solid var(--color-success)' : '3px solid transparent' }}>
                                        <td><code style={{ background: 'var(--color-bg-tertiary)', padding: '0.2rem 0.4rem', borderRadius: '3px' }}>{sample.sample_uid}</code></td>
                                        <td><code style={{ color: 'var(--color-text-secondary)' }}>{sample.order_uid}</code></td>
                                        <td style={{ fontWeight: 500 }}>{sample.patient_name}</td>
                                        <td>{sample.test_name}</td>
                                        <td>
                                            <span className={`badge ${sample.status === 'RECEIVED' ? 'badge-success' :
                                                sample.status === 'REJECTED' ? 'badge-error' : 'badge-warning'
                                                }`}>
                                                {sample.status}
                                            </span>
                                        </td>
                                        <td className="action-buttons" style={{ textAlign: 'right' }}>
                                            <button
                                                className="btn btn-secondary btn-sm"
                                                onClick={() => handlePrintBarcode(sample)}
                                                style={{ marginRight: '0.5rem' }}
                                                title="Print Barcode"
                                            >
                                                🖨️ <span className="text-hidden-sm">Barcode</span>
                                            </button>
                                            {(sample.status === 'VERIFIED' || sample.status === 'RECEIVED' || sample.status === 'SUBMITTED' || sample.status === 'DRAFT') && (
                                                <button
                                                    className="btn btn-secondary btn-sm"
                                                    onClick={() => navigate('/results', { state: { filterSampleUid: sample.sample_uid } })}
                                                    title="Enter Results"
                                                // style={{ marginRight: sample.status === 'COLLECTED' ? '0.5rem' : '0' }}
                                                >
                                                    🔬 Results
                                                </button>
                                            )}
                                            {sample.status === 'COLLECTED' && (
                                                <button
                                                    className="btn btn-primary btn-sm"
                                                    onClick={() => handleReceive(sample.id)}
                                                >
                                                    ✓ Mark Received
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ));
                            })()}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}

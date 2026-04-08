import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import JsBarcode from 'jsbarcode';
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

const escapeHtml = (unsafe: any) => {
    const s = unsafe ?? "";
    return String(s)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
};

export default function SamplesPage() {
    const navigate = useNavigate();
    const [samples, setSamples] = useState<Sample[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const [barcodeModalSample, setBarcodeModalSample] = useState<Sample | null>(null);
    const barcodeRef = useRef<SVGSVGElement>(null);

    useEffect(() => {
        if (barcodeModalSample && barcodeRef.current) {
            try {
                JsBarcode(barcodeRef.current, barcodeModalSample.sample_uid, {
                    format: "CODE128",
                    width: 2,
                    height: 60,
                    displayValue: false,
                    margin: 0,
                    background: "#fff"
                });
            } catch (e) {
                console.error("Barcode generation failed:", e);
            }
        }
    }, [barcodeModalSample]);

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
        // Create a temporary canvas to get the barcode base64
        const canvas = document.createElement('canvas');
        try {
            JsBarcode(canvas, sample.sample_uid, {
                format: "CODE128",
                width: 2,
                height: 50,
                displayValue: false,
                margin: 10
            });
        } catch (e) {
            console.error("Barcode generation for print failed:", e);
        }
        const barcodeDataUrl = canvas.toDataURL();

        // Create a printable barcode window
        const printContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Sample Barcode</title>
                <style>
                    body { 
                        font-family: 'Courier New', Courier, monospace; 
                        text-align: center; 
                        padding: 10px;
                        margin: 0;
                    }
                    .barcode-container {
                        border: 1px solid #000;
                        padding: 10px;
                        display: inline-block;
                        width: 250px;
                    }
                    .sample-uid { 
                        font-size: 18px; 
                        font-weight: bold;
                        letter-spacing: 2px;
                        margin-bottom: 5px;
                    }
                    .barcode-image {
                        max-width: 100%;
                        height: auto;
                    }
                    .details { 
                        font-size: 11px; 
                        margin-top: 5px;
                        line-height: 1.2;
                    }
                </style>
            </head>
            <body>
                <div class="barcode-container">
                    <div class="sample-uid">${escapeHtml(sample.sample_uid)}</div>
                    <img class="barcode-image" src="${barcodeDataUrl}" />
                    <div class="details">
                        <strong>${escapeHtml(sample.patient_name)}</strong><br/>
                        ${escapeHtml(sample.test_name)}<br/>
                        ${new Date().toLocaleDateString()}
                    </div>
                </div>
                <script>
                    window.onload = () => {
                        window.print();
                        setTimeout(() => window.close(), 500);
                    };
                </script>
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
                                                onClick={() => setBarcodeModalSample(sample)}
                                                style={{ marginRight: '0.5rem' }}
                                                title="View Barcode"
                                            >
                                                <span className="text-hidden-sm">Barcode</span>
                                            </button>
                                            {/* <button
                                                className="btn btn-secondary btn-sm"
                                                onClick={() => handlePrintBarcode(sample)}
                                                style={{ marginRight: '0.5rem' }}
                                                title="Print Barcode"
                                            >
                                                🖨️ <span className="text-hidden-sm">Print</span>
                                            </button> */}
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

            {/* Barcode View Modal */}
            {barcodeModalSample && (
                <div className="modal-overlay" onClick={() => setBarcodeModalSample(null)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px', textAlign: 'center', padding: '2rem' }}>
                        <h3 style={{ marginBottom: '1rem' }}>Sample Barcode</h3>
                        <div style={{ border: '2px solid #000', padding: '15px', display: 'inline-block', margin: '10px', background: '#fff' }}>
                            <div style={{ fontSize: '24px', fontWeight: 'bold', letterSpacing: '3px', fontFamily: 'monospace', marginBottom: '5px' }}>
                                {barcodeModalSample.sample_uid}
                            </div>
                            <div style={{ margin: '10px 0', background: '#fff', display: 'flex', justifyContent: 'center' }}>
                                <svg ref={barcodeRef}></svg>
                            </div>
                            <div style={{ fontSize: '12px', fontFamily: 'monospace', color: '#555' }}>
                                <strong>{barcodeModalSample.patient_name}</strong><br />
                                {barcodeModalSample.test_name}<br />
                                {new Date().toLocaleDateString()}
                            </div>
                        </div>
                        <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                            <button className="btn btn-primary" onClick={() => {
                                handlePrintBarcode(barcodeModalSample);
                            }}>🖨️ Print</button>
                            <button className="btn btn-secondary" onClick={() => setBarcodeModalSample(null)}>Close</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

import { useState, useEffect } from 'react';
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
    const [samples, setSamples] = useState<Sample[]>([]);
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
                <button className="btn btn-secondary" onClick={loadSamples}>
                    ↻ Refresh
                </button>
            </div>

            <div className="samples-table-container">
                {loading ? <div className="loading">Loading samples...</div> : (
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Sample ID</th>
                                <th>Order ID</th>
                                <th>Patient</th>
                                <th>Test</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {samples.length === 0 ? (
                                <tr><td colSpan={6} className="empty">No samples found</td></tr>
                            ) : (
                                samples.map(sample => (
                                    <tr key={sample.id}>
                                        <td><code>{sample.sample_uid}</code></td>
                                        <td><code>{sample.order_uid}</code></td>
                                        <td>{sample.patient_name}</td>
                                        <td>{sample.test_name}</td>
                                        <td>
                                            <span className={`badge ${sample.status === 'RECEIVED' ? 'badge-success' :
                                                sample.status === 'REJECTED' ? 'badge-error' : 'badge-warning'
                                                }`}>
                                                {sample.status}
                                            </span>
                                        </td>
                                        <td className="action-buttons">
                                            <button
                                                className="btn btn-secondary btn-sm"
                                                onClick={() => handlePrintBarcode(sample)}
                                            >
                                                Print Barcode
                                            </button>
                                            {sample.status === 'COLLECTED' && (
                                                <button
                                                    className="btn btn-primary btn-sm"
                                                    onClick={() => handleReceive(sample.id)}
                                                >
                                                    Mark Received
                                                </button>
                                            )}
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

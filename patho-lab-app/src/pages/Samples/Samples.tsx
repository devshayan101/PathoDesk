import './Samples.css';

// Mock data matching wireframe
const samples = [
    { sampleId: 'S-10231-A', orderId: 'ORD-2026-00123', patient: 'Rahul Sharma', test: 'CBC', status: 'Collected' },
    { sampleId: 'S-10231-B', orderId: 'ORD-2026-00123', patient: 'Rahul Sharma', test: 'LFT', status: 'Collected' },
    { sampleId: 'S-10232-A', orderId: 'ORD-2026-00122', patient: 'Anita Patel', test: 'RFT', status: 'Received' },
];

export default function SamplesPage() {
    return (
        <div className="samples-page">
            <h1 className="page-title">Sample Accession</h1>

            <div className="samples-table-container">
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
                        {samples.map((sample, i) => (
                            <tr key={i}>
                                <td><code>{sample.sampleId}</code></td>
                                <td><code>{sample.orderId}</code></td>
                                <td>{sample.patient}</td>
                                <td>{sample.test}</td>
                                <td>
                                    <span className={`badge ${sample.status === 'Received' ? 'badge-success' : 'badge-warning'}`}>
                                        {sample.status}
                                    </span>
                                </td>
                                <td className="action-buttons">
                                    <button className="btn btn-secondary btn-sm">Print Barcode</button>
                                    {sample.status === 'Collected' && (
                                        <button className="btn btn-primary btn-sm">Mark Received</button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

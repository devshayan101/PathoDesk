import './Dashboard.css';

// Mock data matching wireframe
const pendingItems = [
    { sampleId: 'S-10231', patient: 'Rahul', test: 'CBC', status: 'RESULT ENTERED' },
    { sampleId: 'S-10232', patient: 'Anita', test: 'LFT', status: 'DRAFT' },
    { sampleId: 'S-10233', patient: 'Vikram', test: 'RFT', status: 'PENDING' },
    { sampleId: 'S-10234', patient: 'Priya', test: 'Thyroid', status: 'DRAFT' },
];

export default function DashboardPage() {
    return (
        <div className="dashboard-page">
            <h1 className="page-title">Dashboard</h1>

            {/* Summary stats - as per wireframe */}
            <div className="stats-bar">
                <div className="stat-item">
                    <span className="stat-value">42</span>
                    <span className="stat-label">Today's Patients</span>
                </div>
                <div className="stat-item stat-warning">
                    <span className="stat-value">6</span>
                    <span className="stat-label">Pending Results</span>
                </div>
                <div className="stat-item stat-critical">
                    <span className="stat-value">1</span>
                    <span className="stat-label">Critical</span>
                </div>
            </div>

            {/* Two-column layout for pending items */}
            <div className="dashboard-grid">
                <div className="dashboard-section">
                    <h2 className="section-title">Pending Samples</h2>
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Sample ID</th>
                                <th>Patient</th>
                                <th>Test</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {pendingItems.map((item, i) => (
                                <tr key={i}>
                                    <td><code>{item.sampleId}</code></td>
                                    <td>{item.patient}</td>
                                    <td>{item.test}</td>
                                    <td>
                                        <span className={`badge ${getStatusClass(item.status)}`}>
                                            {item.status}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="dashboard-section">
                    <h2 className="section-title">Pending Verification</h2>
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Sample ID</th>
                                <th>Patient</th>
                                <th>Test</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {pendingItems.filter(i => i.status === 'RESULT ENTERED').map((item, i) => (
                                <tr key={i}>
                                    <td><code>{item.sampleId}</code></td>
                                    <td>{item.patient}</td>
                                    <td>{item.test}</td>
                                    <td>
                                        <span className="badge badge-warning">AWAITING VERIFICATION</span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

function getStatusClass(status: string) {
    switch (status) {
        case 'RESULT ENTERED': return 'badge-success';
        case 'DRAFT': return 'badge-warning';
        default: return '';
    }
}

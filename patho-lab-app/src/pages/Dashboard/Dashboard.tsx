import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Dashboard.css';

interface DashboardStats {
    todayPatients: number;
    todayOrders: number;
    pendingResults: number;
    criticalAlerts: number;
    todayRevenue: number;
    todayPending: number;
    monthlyRevenue: number;
    monthlyPending: number;
    yearlyRevenue: number;
    yearlyPending: number;
    monthlyOrders: number;
    monthlyPatients: number;
    pendingSamples: any[];
    pendingVerification: any[];
    recentActivity: any[];
}

export default function DashboardPage() {
    const navigate = useNavigate();
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [showFinancials, setShowFinancials] = useState(() => {
        const saved = localStorage.getItem('dashboard_show_financials');
        return saved !== null ? saved === 'true' : true;
    });

    useEffect(() => {
        loadStats();
        // Auto-refresh every 30 seconds
        const interval = setInterval(loadStats, 30000);
        return () => clearInterval(interval);
    }, []);

    const loadStats = async () => {
        try {
            if (window.electronAPI) {
                const data = await window.electronAPI.dashboard.getStats();
                setStats(data);
            }
        } catch (e) {
            console.error('Failed to load dashboard stats:', e);
        }
        setLoading(false);
    };

    const getStatusClass = (status: string) => {
        switch (status) {
            case 'FINALIZED': return 'badge-success';
            case 'SUBMITTED': return 'badge-info';
            case 'DRAFT': return 'badge-warning';
            case 'RECEIVED': return 'badge-warning';
            case 'VERIFIED': return 'badge-info';
            default: return '';
        }
    };

    const timeAgo = (dateStr: string) => {
        if (!dateStr) return '—';
        const diff = Date.now() - new Date(dateStr).getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return 'just now';
        if (mins < 60) return `${mins}m ago`;
        const hours = Math.floor(mins / 60);
        if (hours < 24) return `${hours}h ago`;
        return new Date(dateStr).toLocaleDateString();
    };

    const formatCurrency = (amount: number) => {
        if (!showFinancials) return '••••••';
        return '₹' + amount.toLocaleString('en-IN', { maximumFractionDigits: 0 });
    };

    const toggleFinancials = () => {
        setShowFinancials(prev => {
            const next = !prev;
            localStorage.setItem('dashboard_show_financials', String(next));
            return next;
        });
    };

    if (loading) {
        return (
            <div className="dashboard-page">
                <h1 className="page-title">Dashboard</h1>
                <div className="loading">Loading dashboard...</div>
            </div>
        );
    }

    return (
        <div className="dashboard-page">
            <div className="dashboard-header">
                <h1 className="page-title" onDoubleClick={toggleFinancials} style={{ cursor: 'default', userSelect: 'none' }}>
                    Dashboard
                    <span
                        onClick={(e) => { e.stopPropagation(); toggleFinancials(); }}
                        style={{ marginLeft: '0.5rem', fontSize: '0.7em', opacity: 0.3, cursor: 'pointer', verticalAlign: 'middle' }}
                        title="Toggle financial visibility"
                    >
                        {showFinancials ? '👁' : '👁‍🗨'}
                    </span>
                </h1>
                <button className="btn btn-secondary btn-sm" onClick={loadStats}>↻ Refresh</button>
            </div>

            {/* Today's Summary */}
            <div className="stats-bar">
                <div className="stat-item" onClick={() => navigate('/patients')} style={{ cursor: 'pointer' }}>
                    <span className="stat-icon">👤</span>
                    <span className="stat-value">{stats?.todayPatients || 0}</span>
                    <span className="stat-label">Today's Patients</span>
                </div>
                <div className="stat-item" onClick={() => navigate('/orders')} style={{ cursor: 'pointer' }}>
                    <span className="stat-icon">📋</span>
                    <span className="stat-value">{stats?.todayOrders || 0}</span>
                    <span className="stat-label">Today's Orders</span>
                </div>
                <div className="stat-item stat-warning" onClick={() => navigate('/results')} style={{ cursor: 'pointer' }}>
                    <span className="stat-icon">⏳</span>
                    <span className="stat-value">{stats?.pendingResults || 0}</span>
                    <span className="stat-label">Pending Results</span>
                </div>
                <div className={`stat-item ${(stats?.criticalAlerts || 0) > 0 ? 'stat-critical' : ''}`}>
                    <span className="stat-icon">⚠</span>
                    <span className="stat-value">{stats?.criticalAlerts || 0}</span>
                    <span className="stat-label">Critical Alerts</span>
                </div>
                <div className="stat-item stat-revenue" onClick={() => navigate('/billing/invoices')} style={{ cursor: 'pointer' }}>
                    <span className="stat-icon">₹</span>
                    <span className="stat-value">{formatCurrency(stats?.todayRevenue || 0)}</span>
                    <span className="stat-label">Today's Revenue</span>
                </div>
                <div className="stat-item stat-warning" onClick={() => navigate('/billing/invoices')} style={{ cursor: 'pointer' }}>
                    <span className="stat-icon">💳</span>
                    <span className="stat-value">{formatCurrency(stats?.todayPending || 0)}</span>
                    <span className="stat-label">Today's Pending</span>
                </div>
            </div>

            {/* Monthly & Yearly Summary */}
            <div className="period-stats">
                <div className="period-card">
                    <h3 className="period-title">This Month</h3>
                    <div className="period-grid">
                        <div className="period-stat">
                            <span className="period-value">{stats?.monthlyPatients || 0}</span>
                            <span className="period-label">Patients</span>
                        </div>
                        <div className="period-stat">
                            <span className="period-value">{stats?.monthlyOrders || 0}</span>
                            <span className="period-label">Orders</span>
                        </div>
                        <div className="period-stat">
                            <span className="period-value revenue">{formatCurrency(stats?.monthlyRevenue || 0)}</span>
                            <span className="period-label">Revenue</span>
                        </div>
                        <div className="period-stat">
                            <span className="period-value" style={{ color: 'var(--color-warning)' }}>{formatCurrency(stats?.monthlyPending || 0)}</span>
                            <span className="period-label">Pending</span>
                        </div>
                    </div>
                </div>
                <div className="period-card">
                    <h3 className="period-title">This Year</h3>
                    <div className="period-grid">
                        <div className="period-stat">
                            <span className="period-value revenue">{formatCurrency(stats?.yearlyRevenue || 0)}</span>
                            <span className="period-label">Total Revenue</span>
                        </div>
                        <div className="period-stat">
                            <span className="period-value" style={{ color: 'var(--color-warning)' }}>{formatCurrency(stats?.yearlyPending || 0)}</span>
                            <span className="period-label">Pending</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Two-column layout for pending items */}
            <div className="dashboard-grid">
                <div className="dashboard-section">
                    <div className="section-header">
                        <h2 className="section-title">Pending Samples</h2>
                        <span className="section-count">{stats?.pendingSamples?.length || 0}</span>
                    </div>
                    <div className="table-container">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Sample ID</th>
                                    <th>Patient</th>
                                    <th>Test</th>
                                    <th>Status</th>
                                    <th>Received</th>
                                </tr>
                            </thead>
                            <tbody>
                                {(!stats?.pendingSamples || stats.pendingSamples.length === 0) ? (
                                    <tr><td colSpan={5} className="empty-row">No pending samples</td></tr>
                                ) : (
                                    stats.pendingSamples.map((item: any) => (
                                        <tr key={item.id} onClick={() => navigate('/results')} style={{ cursor: 'pointer' }}>
                                            <td><code>{item.sample_uid}</code></td>
                                            <td>{item.patient_name}</td>
                                            <td>{item.test_name}</td>
                                            <td>
                                                <span className={`badge ${getStatusClass(item.status)}`}>
                                                    {item.status}
                                                </span>
                                            </td>
                                            <td className="text-muted">{timeAgo(item.received_at)}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="dashboard-section">
                    <div className="section-header">
                        <h2 className="section-title">Pending Verification</h2>
                        <span className="section-count">{stats?.pendingVerification?.length || 0}</span>
                    </div>
                    <div className="table-container">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Sample ID</th>
                                    <th>Patient</th>
                                    <th>Test</th>
                                    <th>Submitted</th>
                                </tr>
                            </thead>
                            <tbody>
                                {(!stats?.pendingVerification || stats.pendingVerification.length === 0) ? (
                                    <tr><td colSpan={4} className="empty-row">No pending verifications</td></tr>
                                ) : (
                                    stats.pendingVerification.map((item: any) => (
                                        <tr key={item.id} onClick={() => navigate('/results')} style={{ cursor: 'pointer' }}>
                                            <td><code>{item.sample_uid}</code></td>
                                            <td>{item.patient_name}</td>
                                            <td>{item.test_name}</td>
                                            <td className="text-muted">{timeAgo(item.received_at)}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Recent Activity */}
            <div className="dashboard-section" style={{ marginTop: '1.5rem' }}>
                <div className="section-header">
                    <h2 className="section-title">Recently Finalized</h2>
                </div>
                <div className="table-container">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Sample ID</th>
                                <th>Patient</th>
                                <th>Test</th>
                                <th>Verified</th>
                            </tr>
                        </thead>
                        <tbody>
                            {(!stats?.recentActivity || stats.recentActivity.length === 0) ? (
                                <tr><td colSpan={4} className="empty-row">No recent activity</td></tr>
                            ) : (
                                stats.recentActivity.map((item: any) => (
                                    <tr key={item.id}>
                                        <td><code>{item.sample_uid}</code></td>
                                        <td>{item.patient_name}</td>
                                        <td>{item.test_name}</td>
                                        <td className="text-muted">{timeAgo(item.verified_at)}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

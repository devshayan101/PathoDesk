import { useState, useEffect } from 'react';
import './AuditLog.css';

interface AuditEntry {
    id: number;
    entity: string;
    entity_id: number | null;
    action: string;
    old_value: string | null;
    new_value: string | null;
    performed_by: number | null;
    performed_at: string;
    username?: string;
    full_name?: string;
}

interface AuditStats {
    totalActions: number;
    byEntity: { entity: string; count: number }[];
    byAction: { action: string; count: number }[];
    byUser: { userId: number; username: string; count: number }[];
}

export default function AuditLogPage() {
    const [entries, setEntries] = useState<AuditEntry[]>([]);
    const [stats, setStats] = useState<AuditStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(0);
    const pageSize = 50;

    // Filters
    const [filters, setFilters] = useState({
        entity: '',
        action: '',
        fromDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Last 7 days
        toDate: new Date().toISOString().split('T')[0]
    });

    // Detail view
    const [selectedEntry, setSelectedEntry] = useState<AuditEntry | null>(null);

    useEffect(() => {
        loadData();
    }, [page, filters]);

    const loadData = async () => {
        setLoading(true);
        try {
            if (window.electronAPI) {
                const [logsResult, statsData] = await Promise.all([
                    window.electronAPI.audit.getLogs({
                        entity: filters.entity || undefined,
                        action: filters.action || undefined,
                        fromDate: filters.fromDate,
                        toDate: filters.toDate,
                        limit: pageSize,
                        offset: page * pageSize
                    }),
                    window.electronAPI.audit.getStats(filters.fromDate, filters.toDate)
                ]);

                setEntries(logsResult.entries);
                setTotal(logsResult.total);
                setStats(statsData);
            }
        } catch (e) {
            console.error('Failed to load audit data:', e);
        }
        setLoading(false);
    };

    const handleFilterChange = (key: string, value: string) => {
        setFilters(prev => ({ ...prev, [key]: value }));
        setPage(0);
    };

    const formatValue = (value: string | null): React.ReactNode => {
        if (!value) return <span className="text-muted">—</span>;
        try {
            const parsed = JSON.parse(value);
            return (
                <pre className="json-value">
                    {JSON.stringify(parsed, null, 2)}
                </pre>
            );
        } catch {
            return value;
        }
    };

    const getEntityIcon = (entity: string) => {
        const icons: Record<string, string> = {
            'PATIENT': '👤',
            'ORDER': '📋',
            'SAMPLE': '🧪',
            'RESULT': '📊',
            'INVOICE': '💳',
            'PAYMENT': '💰',
            'TEST': '🔬',
            'USER': '👥',
            'DOCTOR': '⚕️',
            'QC_ENTRY': '✅',
            'SETTINGS': '⚙️'
        };
        return icons[entity] || '📝';
    };

    const getActionColor = (action: string) => {
        switch (action) {
            case 'CREATE': return '#22c55e';
            case 'UPDATE': return '#3b82f6';
            case 'DELETE': return '#ef4444';
            case 'VERIFY': return '#8b5cf6';
            case 'FINALIZE': return '#06b6d4';
            case 'CANCEL': return '#f59e0b';
            default: return '#6b7280';
        }
    };

    const totalPages = Math.ceil(total / pageSize);

    return (
        <div className="audit-page">
            <div className="page-header">
                <h1>Audit Trail</h1>
                <span className="total-count">{total.toLocaleString()} records</span>
            </div>

            {/* Stats Cards */}
            {stats && (
                <div className="stats-row">
                    <div className="stat-card">
                        <div className="stat-value">{stats.totalActions}</div>
                        <div className="stat-label">Total Actions</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-value">{stats.byEntity.length}</div>
                        <div className="stat-label">Entities</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-value">{stats.byUser.length}</div>
                        <div className="stat-label">Active Users</div>
                    </div>
                    <div className="stat-card top-entity">
                        <div className="stat-value">
                            {stats.byEntity[0]?.entity || 'N/A'}
                        </div>
                        <div className="stat-label">Most Active Entity</div>
                    </div>
                </div>
            )}

            {/* Filters */}
            <div className="filters-bar">
                <div className="filter-group">
                    <label>Entity</label>
                    <select
                        className="input"
                        value={filters.entity}
                        onChange={(e) => handleFilterChange('entity', e.target.value)}
                    >
                        <option value="">All Entities</option>
                        <option value="PATIENT">Patient</option>
                        <option value="ORDER">Order</option>
                        <option value="SAMPLE">Sample</option>
                        <option value="RESULT">Result</option>
                        <option value="INVOICE">Invoice</option>
                        <option value="PAYMENT">Payment</option>
                        <option value="TEST">Test</option>
                        <option value="USER">User</option>
                        <option value="DOCTOR">Doctor</option>
                        <option value="QC_ENTRY">QC Entry</option>
                    </select>
                </div>
                <div className="filter-group">
                    <label>Action</label>
                    <select
                        className="input"
                        value={filters.action}
                        onChange={(e) => handleFilterChange('action', e.target.value)}
                    >
                        <option value="">All Actions</option>
                        <option value="CREATE">Create</option>
                        <option value="UPDATE">Update</option>
                        <option value="DELETE">Delete</option>
                        <option value="VERIFY">Verify</option>
                        <option value="FINALIZE">Finalize</option>
                        <option value="CANCEL">Cancel</option>
                        <option value="LOGIN">Login</option>
                    </select>
                </div>
                <div className="filter-group">
                    <label>From</label>
                    <input
                        type="date"
                        className="input"
                        value={filters.fromDate}
                        onChange={(e) => handleFilterChange('fromDate', e.target.value)}
                    />
                </div>
                <div className="filter-group">
                    <label>To</label>
                    <input
                        type="date"
                        className="input"
                        value={filters.toDate}
                        onChange={(e) => handleFilterChange('toDate', e.target.value)}
                    />
                </div>
            </div>

            {/* Main Content */}
            <div className="content-area">
                {/* Entries Table */}
                <div className="entries-panel">
                    {loading ? (
                        <div className="loading">Loading audit logs...</div>
                    ) : (
                        <>
                            <table className="audit-table">
                                <thead>
                                    <tr>
                                        <th>Timestamp</th>
                                        <th>Entity</th>
                                        <th>Action</th>
                                        <th>User</th>
                                        <th></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {entries.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="empty-row">
                                                No audit entries found
                                            </td>
                                        </tr>
                                    ) : (
                                        entries.map(entry => (
                                            <tr
                                                key={entry.id}
                                                className={selectedEntry?.id === entry.id ? 'selected' : ''}
                                                onClick={() => setSelectedEntry(entry)}
                                            >
                                                <td className="timestamp">
                                                    <div>{new Date(entry.performed_at).toLocaleDateString()}</div>
                                                    <small>{new Date(entry.performed_at).toLocaleTimeString()}</small>
                                                </td>
                                                <td>
                                                    <span className="entity-badge">
                                                        <span className="entity-icon">{getEntityIcon(entry.entity)}</span>
                                                        {entry.entity}
                                                        {entry.entity_id && (
                                                            <span className="entity-id">#{entry.entity_id}</span>
                                                        )}
                                                    </span>
                                                </td>
                                                <td>
                                                    <span
                                                        className="action-badge"
                                                        style={{ background: getActionColor(entry.action) }}
                                                    >
                                                        {entry.action}
                                                    </span>
                                                </td>
                                                <td className="user-cell">
                                                    {entry.full_name || entry.username || 'System'}
                                                </td>
                                                <td className="chevron">›</td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>

                            {/* Pagination */}
                            {totalPages > 1 && (
                                <div className="pagination">
                                    <button
                                        className="btn btn-sm"
                                        onClick={() => setPage(p => Math.max(0, p - 1))}
                                        disabled={page === 0}
                                    >
                                        ← Previous
                                    </button>
                                    <span className="page-info">
                                        Page {page + 1} of {totalPages}
                                    </span>
                                    <button
                                        className="btn btn-sm"
                                        onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                                        disabled={page >= totalPages - 1}
                                    >
                                        Next →
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Detail Panel */}
                <div className="detail-panel">
                    {selectedEntry ? (
                        <>
                            <div className="detail-header">
                                <h3>
                                    {getEntityIcon(selectedEntry.entity)} {selectedEntry.entity}
                                    {selectedEntry.entity_id && ` #${selectedEntry.entity_id}`}
                                </h3>
                                <span
                                    className="action-badge"
                                    style={{ background: getActionColor(selectedEntry.action) }}
                                >
                                    {selectedEntry.action}
                                </span>
                            </div>

                            <div className="detail-meta">
                                <div className="meta-row">
                                    <span className="meta-label">Timestamp</span>
                                    <span className="meta-value">
                                        {new Date(selectedEntry.performed_at).toLocaleString()}
                                    </span>
                                </div>
                                <div className="meta-row">
                                    <span className="meta-label">User</span>
                                    <span className="meta-value">
                                        {selectedEntry.full_name || selectedEntry.username || 'System'}
                                    </span>
                                </div>
                            </div>

                            {selectedEntry.old_value && (
                                <div className="value-section">
                                    <h4>Previous Value</h4>
                                    {formatValue(selectedEntry.old_value)}
                                </div>
                            )}

                            {selectedEntry.new_value && (
                                <div className="value-section">
                                    <h4>New Value</h4>
                                    {formatValue(selectedEntry.new_value)}
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="empty-detail">
                            <p>Select an entry to view details</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

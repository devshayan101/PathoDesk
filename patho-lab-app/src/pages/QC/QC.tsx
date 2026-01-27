import { useState, useEffect } from 'react';
import { useAuthStore } from '../../stores/authStore';
import './QC.css';

interface QCParameter {
    id: number;
    test_id: number;
    parameter_code: string;
    parameter_name: string;
    unit: string | null;
    level: 'LOW' | 'NORMAL' | 'HIGH';
    target_mean: number;
    target_sd: number;
    lot_number: string | null;
    expiry_date: string | null;
    test_code?: string;
    test_name?: string;
}

interface QCEntry {
    id: number;
    qc_parameter_id: number;
    entry_date: string;
    observed_value: number;
    deviation_sd: number;
    status: 'PASS' | 'WARNING' | 'FAIL' | 'REJECTED';
    remarks: string | null;
    parameter_name?: string;
    level?: string;
    entered_by_name?: string;
    entered_at: string;
}

interface WestgardResult {
    rule: string;
    triggered: boolean;
    isRejection: boolean;
    message: string;
}

export default function QCPage() {
    const { session } = useAuthStore();
    const [parameters, setParameters] = useState<QCParameter[]>([]);
    const [entries, setEntries] = useState<QCEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'entry' | 'history' | 'setup'>('entry');

    // Entry form state
    const [selectedParam, setSelectedParam] = useState<QCParameter | null>(null);
    const [observedValue, setObservedValue] = useState('');
    const [remarks, setRemarks] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [lastResult, setLastResult] = useState<{ status: string; deviationSd: number; westgard: WestgardResult[] } | null>(null);

    // Setup form state
    const [showSetupModal, setShowSetupModal] = useState(false);
    const [setupForm, setSetupForm] = useState({
        testId: '',
        parameterCode: '',
        parameterName: '',
        unit: '',
        level: 'NORMAL' as 'LOW' | 'NORMAL' | 'HIGH',
        targetMean: '',
        targetSd: '',
        lotNumber: '',
        expiryDate: ''
    });

    // Filter state
    const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]);
    const [tests, setTests] = useState<{ id: number; test_code: string; test_name: string }[]>([]);

    useEffect(() => {
        loadData();
    }, []);

    useEffect(() => {
        if (activeTab === 'history') {
            loadEntries();
        }
    }, [activeTab, filterDate]);

    const loadData = async () => {
        setLoading(true);
        try {
            if (window.electronAPI) {
                const [params, testsData] = await Promise.all([
                    window.electronAPI.qc.listParameters(),
                    window.electronAPI.tests.list()
                ]);
                setParameters(params);
                setTests(testsData);
            }
        } catch (e) {
            console.error('Failed to load QC data:', e);
        }
        setLoading(false);
    };

    const loadEntries = async () => {
        try {
            if (window.electronAPI) {
                const data = await window.electronAPI.qc.listEntries({
                    fromDate: filterDate,
                    toDate: filterDate
                });
                setEntries(data);
            }
        } catch (e) {
            console.error('Failed to load entries:', e);
        }
    };

    const handleRecordEntry = async () => {
        if (!selectedParam || !observedValue || !session) return;

        setSubmitting(true);
        setLastResult(null);

        try {
            const result = await window.electronAPI.qc.recordEntry({
                qcParameterId: selectedParam.id,
                entryDate: new Date().toISOString().split('T')[0],
                observedValue: parseFloat(observedValue),
                remarks: remarks || undefined,
                enteredBy: session.userId
            });

            if (result.success) {
                // Check Westgard rules
                const westgard = await window.electronAPI.qc.checkWestgard(selectedParam.id);

                setLastResult({
                    status: result.status!,
                    deviationSd: result.deviationSd!,
                    westgard
                });

                // Clear form
                setObservedValue('');
                setRemarks('');
            } else {
                alert('Failed to record: ' + result.error);
            }
        } catch (e) {
            console.error('Record error:', e);
        }
        setSubmitting(false);
    };

    const handleCreateParameter = async () => {
        if (!setupForm.testId || !setupForm.parameterCode || !setupForm.targetMean || !setupForm.targetSd) {
            alert('Please fill required fields');
            return;
        }

        try {
            const result = await window.electronAPI.qc.createParameter({
                testId: parseInt(setupForm.testId),
                parameterCode: setupForm.parameterCode,
                parameterName: setupForm.parameterName || setupForm.parameterCode,
                unit: setupForm.unit || undefined,
                level: setupForm.level,
                targetMean: parseFloat(setupForm.targetMean),
                targetSd: parseFloat(setupForm.targetSd),
                lotNumber: setupForm.lotNumber || undefined,
                expiryDate: setupForm.expiryDate || undefined,
                createdBy: session?.userId
            });

            if (result.success) {
                setShowSetupModal(false);
                setSetupForm({
                    testId: '',
                    parameterCode: '',
                    parameterName: '',
                    unit: '',
                    level: 'NORMAL',
                    targetMean: '',
                    targetSd: '',
                    lotNumber: '',
                    expiryDate: ''
                });
                loadData();
            } else {
                alert('Failed: ' + result.error);
            }
        } catch (e) {
            console.error('Create error:', e);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'PASS': return '#22c55e';
            case 'WARNING': return '#f59e0b';
            case 'FAIL': return '#ef4444';
            default: return '#6b7280';
        }
    };

    const getStatusBg = (status: string) => {
        switch (status) {
            case 'PASS': return 'rgba(34, 197, 94, 0.1)';
            case 'WARNING': return 'rgba(245, 158, 11, 0.1)';
            case 'FAIL': return 'rgba(239, 68, 68, 0.1)';
            default: return 'rgba(107, 114, 128, 0.1)';
        }
    };

    return (
        <div className="qc-page">
            <div className="page-header">
                <h1>Quality Control</h1>
                <div className="tabs">
                    <button
                        className={`tab-btn ${activeTab === 'entry' ? 'active' : ''}`}
                        onClick={() => setActiveTab('entry')}
                    >
                        Daily Entry
                    </button>
                    <button
                        className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`}
                        onClick={() => setActiveTab('history')}
                    >
                        History
                    </button>
                    <button
                        className={`tab-btn ${activeTab === 'setup' ? 'active' : ''}`}
                        onClick={() => setActiveTab('setup')}
                    >
                        Setup
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="loading">Loading QC data...</div>
            ) : activeTab === 'entry' ? (
                <div className="entry-layout">
                    {/* Parameter Selection */}
                    <div className="card parameter-list">
                        <h3>Select Control</h3>
                        {parameters.length === 0 ? (
                            <div className="empty-state">
                                <p>No QC parameters configured</p>
                                <button className="btn btn-primary" onClick={() => setActiveTab('setup')}>
                                    Setup Controls
                                </button>
                            </div>
                        ) : (
                            <div className="param-grid">
                                {parameters.map(param => (
                                    <button
                                        key={param.id}
                                        className={`param-card ${selectedParam?.id === param.id ? 'selected' : ''}`}
                                        onClick={() => { setSelectedParam(param); setLastResult(null); }}
                                    >
                                        <div className="param-header">
                                            <span className={`level-badge ${param.level.toLowerCase()}`}>
                                                {param.level}
                                            </span>
                                            <code>{param.test_code}</code>
                                        </div>
                                        <div className="param-name">{param.parameter_name}</div>
                                        <div className="param-target">
                                            Target: {param.target_mean} ± {param.target_sd} {param.unit || ''}
                                        </div>
                                        {param.lot_number && (
                                            <div className="param-lot">Lot: {param.lot_number}</div>
                                        )}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Entry Form */}
                    <div className="card entry-form">
                        {selectedParam ? (
                            <>
                                <h3>Record Value - {selectedParam.parameter_name}</h3>
                                <div className="target-info">
                                    <div className="info-row">
                                        <span>Target Mean:</span>
                                        <strong>{selectedParam.target_mean} {selectedParam.unit || ''}</strong>
                                    </div>
                                    <div className="info-row">
                                        <span>Target SD:</span>
                                        <strong>±{selectedParam.target_sd}</strong>
                                    </div>
                                    <div className="info-row">
                                        <span>Acceptable Range:</span>
                                        <strong>
                                            {(selectedParam.target_mean - 2 * selectedParam.target_sd).toFixed(2)} -
                                            {(selectedParam.target_mean + 2 * selectedParam.target_sd).toFixed(2)}
                                        </strong>
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label>Observed Value *</label>
                                    <input
                                        type="number"
                                        className="input value-input"
                                        value={observedValue}
                                        onChange={(e) => setObservedValue(e.target.value)}
                                        placeholder="Enter value..."
                                        step="0.01"
                                        autoFocus
                                    />
                                </div>

                                <div className="form-group">
                                    <label>Remarks</label>
                                    <textarea
                                        className="input"
                                        value={remarks}
                                        onChange={(e) => setRemarks(e.target.value)}
                                        placeholder="Optional notes..."
                                        rows={2}
                                    />
                                </div>

                                <button
                                    className="btn btn-primary btn-lg"
                                    onClick={handleRecordEntry}
                                    disabled={!observedValue || submitting}
                                >
                                    {submitting ? 'Recording...' : 'Record Entry'}
                                </button>

                                {/* Result Display */}
                                {lastResult && (
                                    <div className="result-display" style={{
                                        background: getStatusBg(lastResult.status),
                                        borderColor: getStatusColor(lastResult.status)
                                    }}>
                                        <div className="result-header">
                                            <span className="status-badge" style={{ background: getStatusColor(lastResult.status) }}>
                                                {lastResult.status}
                                            </span>
                                            <span className="deviation">
                                                Deviation: {lastResult.deviationSd.toFixed(2)} SD
                                            </span>
                                        </div>

                                        {lastResult.westgard.length > 0 && (
                                            <div className="westgard-alerts">
                                                <h4>Westgard Rules</h4>
                                                {lastResult.westgard.map((rule, idx) => (
                                                    <div
                                                        key={idx}
                                                        className={`rule-alert ${rule.isRejection ? 'rejection' : 'warning'}`}
                                                    >
                                                        <strong>{rule.rule}</strong>: {rule.message}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="empty-state">
                                <p>Select a control from the left to record values</p>
                            </div>
                        )}
                    </div>
                </div>
            ) : activeTab === 'history' ? (
                <div className="history-section">
                    <div className="filters-row">
                        <div className="form-group">
                            <label>Date</label>
                            <input
                                type="date"
                                className="input"
                                value={filterDate}
                                onChange={(e) => setFilterDate(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="card">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Time</th>
                                    <th>Parameter</th>
                                    <th>Level</th>
                                    <th>Value</th>
                                    <th>Deviation</th>
                                    <th>Status</th>
                                    <th>Entered By</th>
                                </tr>
                            </thead>
                            <tbody>
                                {entries.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="empty-row">No entries for this date</td>
                                    </tr>
                                ) : (
                                    entries.map(entry => (
                                        <tr key={entry.id}>
                                            <td>{new Date(entry.entered_at).toLocaleTimeString()}</td>
                                            <td>{entry.parameter_name}</td>
                                            <td>
                                                <span className={`level-badge ${entry.level?.toLowerCase()}`}>
                                                    {entry.level}
                                                </span>
                                            </td>
                                            <td><strong>{entry.observed_value}</strong></td>
                                            <td>{entry.deviation_sd?.toFixed(2)} SD</td>
                                            <td>
                                                <span
                                                    className="status-badge"
                                                    style={{ background: getStatusColor(entry.status) }}
                                                >
                                                    {entry.status}
                                                </span>
                                            </td>
                                            <td>{entry.entered_by_name}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                <div className="setup-section">
                    <div className="section-header">
                        <h2>QC Parameters</h2>
                        <button className="btn btn-primary" onClick={() => setShowSetupModal(true)}>
                            + Add Control
                        </button>
                    </div>

                    <div className="card">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Test</th>
                                    <th>Parameter</th>
                                    <th>Level</th>
                                    <th>Target Mean</th>
                                    <th>Target SD</th>
                                    <th>Lot #</th>
                                    <th>Expiry</th>
                                </tr>
                            </thead>
                            <tbody>
                                {parameters.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="empty-row">No QC parameters configured</td>
                                    </tr>
                                ) : (
                                    parameters.map(param => (
                                        <tr key={param.id}>
                                            <td>
                                                <code>{param.test_code}</code>
                                                <br />
                                                <small>{param.test_name}</small>
                                            </td>
                                            <td>{param.parameter_name}</td>
                                            <td>
                                                <span className={`level-badge ${param.level.toLowerCase()}`}>
                                                    {param.level}
                                                </span>
                                            </td>
                                            <td>{param.target_mean} {param.unit || ''}</td>
                                            <td>±{param.target_sd}</td>
                                            <td>{param.lot_number || '-'}</td>
                                            <td>{param.expiry_date || '-'}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Setup Modal */}
            {showSetupModal && (
                <div className="modal-overlay" onClick={() => setShowSetupModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Add QC Control</h2>
                            <button className="close-btn" onClick={() => setShowSetupModal(false)}>×</button>
                        </div>
                        <div className="modal-body">
                            <div className="form-grid">
                                <div className="form-group">
                                    <label>Test *</label>
                                    <select
                                        className="input"
                                        value={setupForm.testId}
                                        onChange={e => setSetupForm({ ...setupForm, testId: e.target.value })}
                                    >
                                        <option value="">-- Select Test --</option>
                                        {tests.map(t => (
                                            <option key={t.id} value={t.id}>
                                                {t.test_code} - {t.test_name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Level *</label>
                                    <select
                                        className="input"
                                        value={setupForm.level}
                                        onChange={e => setSetupForm({ ...setupForm, level: e.target.value as any })}
                                    >
                                        <option value="LOW">LOW</option>
                                        <option value="NORMAL">NORMAL</option>
                                        <option value="HIGH">HIGH</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Parameter Code *</label>
                                    <input
                                        type="text"
                                        className="input"
                                        value={setupForm.parameterCode}
                                        onChange={e => setSetupForm({ ...setupForm, parameterCode: e.target.value })}
                                        placeholder="e.g., HB, GLU"
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Parameter Name</label>
                                    <input
                                        type="text"
                                        className="input"
                                        value={setupForm.parameterName}
                                        onChange={e => setSetupForm({ ...setupForm, parameterName: e.target.value })}
                                        placeholder="e.g., Hemoglobin"
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Target Mean *</label>
                                    <input
                                        type="number"
                                        className="input"
                                        value={setupForm.targetMean}
                                        onChange={e => setSetupForm({ ...setupForm, targetMean: e.target.value })}
                                        step="0.01"
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Target SD *</label>
                                    <input
                                        type="number"
                                        className="input"
                                        value={setupForm.targetSd}
                                        onChange={e => setSetupForm({ ...setupForm, targetSd: e.target.value })}
                                        step="0.01"
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Unit</label>
                                    <input
                                        type="text"
                                        className="input"
                                        value={setupForm.unit}
                                        onChange={e => setSetupForm({ ...setupForm, unit: e.target.value })}
                                        placeholder="e.g., g/dL"
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Lot Number</label>
                                    <input
                                        type="text"
                                        className="input"
                                        value={setupForm.lotNumber}
                                        onChange={e => setSetupForm({ ...setupForm, lotNumber: e.target.value })}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Expiry Date</label>
                                    <input
                                        type="date"
                                        className="input"
                                        value={setupForm.expiryDate}
                                        onChange={e => setSetupForm({ ...setupForm, expiryDate: e.target.value })}
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setShowSetupModal(false)}>
                                Cancel
                            </button>
                            <button className="btn btn-primary" onClick={handleCreateParameter}>
                                Add Control
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

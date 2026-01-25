import { useState, useEffect } from 'react';
import { useAuthStore } from '../../stores/authStore';
import './Results.css';

interface Sample {
    id: number;
    sample_uid: string;
    order_uid: string;
    patient_name: string;
    status: string;
}

interface ResultParameter {
    parameter_id: number;
    parameter_code: string;
    parameter_name: string;
    unit: string;
    result_value?: string;
    abnormal_flag?: string;
    ref_ranges: RefRange[];
}

interface RefRange {
    min_value: number | null;
    max_value: number | null;
    critical_low: number | null;
    critical_high: number | null;
}

interface ResultData {
    sample_id: number;
    sample_uid: string;
    patient_name: string;
    patient_uid: string;
    patient_age_days: number;
    patient_gender: string;
    test_name: string;
    status: string;
    parameters: ResultParameter[];
    previousResults?: { parameter_code: string; value: string; test_date: string }[];
}

interface PreviousResult {
    parameter_code: string;
    value: string;
}

export default function ResultsPage() {
    const { session } = useAuthStore();
    const [pendingSamples, setPendingSamples] = useState<Sample[]>([]);
    const [selectedSampleId, setSelectedSampleId] = useState<number | ''>('');
    const [resultData, setResultData] = useState<ResultData | null>(null);
    const [values, setValues] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(true);
    const [criticalAlert, setCriticalAlert] = useState<{ param: string; value: string } | null>(null);

    useEffect(() => {
        loadPendingSamples();
    }, []);

    const loadPendingSamples = async () => {
        setLoading(true);
        try {
            if (window.electronAPI) {
                const samples = await window.electronAPI.results.getPendingSamples();
                setPendingSamples(samples);
            }
        } catch (e) {
            console.error('Failed to load pending samples:', e);
        }
        setLoading(false);
    };

    const handleSampleSelect = async (sampleId: number) => {
        if (!sampleId) return;

        setSelectedSampleId(sampleId);
        try {
            if (window.electronAPI) {
                const data = await window.electronAPI.results.get(sampleId);
                setResultData(data);

                // Load existing values
                const existingValues: Record<string, string> = {};
                data.parameters.forEach((param: ResultParameter) => {
                    if (param.result_value) {
                        existingValues[param.parameter_code] = param.result_value;
                    }
                });
                setValues(existingValues);
            }
        } catch (e) {
            console.error('Failed to load result data:', e);
        }
    };

    const calculateAbnormalFlag = (paramCode: string, value: string): string => {
        if (!resultData || !value) return '';

        const param = resultData.parameters.find(p => p.parameter_code === paramCode);
        if (!param || param.ref_ranges.length === 0) return '';

        const refRange = param.ref_ranges[0];
        const numValue = parseFloat(value);
        if (isNaN(numValue)) return '';

        // Check critical values first
        if (refRange.critical_low !== null && numValue <= refRange.critical_low) return 'CRITICAL_LOW';
        if (refRange.critical_high !== null && numValue >= refRange.critical_high) return 'CRITICAL_HIGH';

        // Check normal range
        if (refRange.min_value !== null && numValue < refRange.min_value) return 'LOW';
        if (refRange.max_value !== null && numValue > refRange.max_value) return 'HIGH';

        return 'NORMAL';
    };

    const getDeltaChange = (paramCode: string, currentValue: string): number | null => {
        if (!resultData || !resultData.previousResults || !currentValue) return null;

        const previous = resultData.previousResults.find(r => r.parameter_code === paramCode);
        if (!previous) return null;

        const prevValue = parseFloat(previous.value);
        const currValue = parseFloat(currentValue);

        if (isNaN(prevValue) || isNaN(currValue) || prevValue === 0) return null;

        return ((currValue - prevValue) / prevValue) * 100;
    };

    const handleValueChange = (paramCode: string, value: string) => {
        setValues(prev => ({ ...prev, [paramCode]: value }));

        // Check for critical values
        const flag = calculateAbnormalFlag(paramCode, value);
        if (flag.startsWith('CRITICAL')) {
            const param = resultData?.parameters.find(p => p.parameter_code === paramCode);
            setCriticalAlert({ param: param?.parameter_name || paramCode, value });
        }
    };

    const handleSave = async () => {
        if (!resultData || !window.electronAPI) return;

        const valuesToSave = resultData.parameters.map(param => ({
            parameterId: param.parameter_id,
            value: values[param.parameter_code] || '',
            abnormalFlag: values[param.parameter_code] ? calculateAbnormalFlag(param.parameter_code, values[param.parameter_code]) : ''
        })).filter(v => v.value);

        try {
            const result = await window.electronAPI.results.save({
                sampleId: resultData.sample_id,
                values: valuesToSave
            });

            if (result.success) {
                alert('Results saved as draft');
                handleSampleSelect(resultData.sample_id); // Reload
            } else {
                alert('Failed to save: ' + result.error);
            }
        } catch (e) {
            console.error('Save error:', e);
        }
    };

    const handleSubmit = async () => {
        if (!resultData || !window.electronAPI) return;

        // First save the values
        await handleSave();

        // Then submit for verification
        try {
            const result = await window.electronAPI.results.submit(resultData.sample_id);
            if (result.success) {
                alert('Results submitted for verification');
                loadPendingSamples(); // Refresh list
                setSelectedSampleId('');
                setResultData(null);
            }
        } catch (e) {
            console.error('Submit error:', e);
        }
    };

    const handleVerify = async () => {
        if (!resultData || !window.electronAPI || !session) return;

        try {
            const result = await window.electronAPI.results.verify(resultData.sample_id, session.userId);
            if (result.success) {
                alert('Results verified');
                handleSampleSelect(resultData.sample_id); // Reload to show status change
            }
        } catch (e) {
            console.error('Verify error:', e);
        }
    };

    const handleFinalize = async () => {
        if (!resultData || !window.electronAPI) return;

        if (!confirm('Finalize results? This cannot be undone.')) return;

        try {
            const result = await window.electronAPI.results.finalize(resultData.sample_id);
            if (result.success) {
                alert('Results finalized');
                loadPendingSamples();
                setSelectedSampleId('');
                setResultData(null);
            }
        } catch (e) {
            console.error('Finalize error:', e);
        }
    };

    const formatAge = (days: number): string => {
        if (days < 30) return `${days}D`;
        if (days < 365) return `${Math.floor(days / 30)}M`;
        return `${Math.floor(days / 365)}Y`;
    };

    const getRefRangeText = (param: ResultParameter): string => {
        if (param.ref_ranges.length === 0) return '—';
        const range = param.ref_ranges[0];

        if (range.min_value !== null && range.max_value !== null) {
            return `${range.min_value} - ${range.max_value}`;
        }
        if (range.min_value !== null) return `> ${range.min_value}`;
        if (range.max_value !== null) return `< ${range.max_value}`;
        return '—';
    };

    const getPreviousValue = (paramCode: string): string => {
        if (!resultData || !resultData.previousResults) return '—';
        const prev = resultData.previousResults.find(r => r.parameter_code === paramCode);
        return prev ? prev.value : '—';
    };

    return (
        <div className="results-page">
            <div className="page-header">
                <h1 className="page-title">Result Entry</h1>
                <select
                    className="input sample-select"
                    value={selectedSampleId}
                    onChange={(e) => handleSampleSelect(Number(e.target.value))}
                >
                    <option value="">-- Select Sample --</option>
                    {pendingSamples.map(sample => (
                        <option key={sample.id} value={sample.id}>
                            {sample.sample_uid} - {sample.patient_name} ({sample.status})
                        </option>
                    ))}
                </select>
            </div>

            {/* Critical Value Alert Modal */}
            {criticalAlert && (
                <div className="modal-overlay">
                    <div className="modal critical-alert-modal">
                        <h2 className="critical-header">⚠️ CRITICAL VALUE ALERT</h2>
                        <p><strong>Parameter:</strong> {criticalAlert.param}</p>
                        <p><strong>Value:</strong> {criticalAlert.value}</p>

                        <div className="form-group">
                            <label>Comment (Mandatory):</label>
                            <textarea className="input" rows={3} required></textarea>
                        </div>

                        <button
                            className="btn btn-primary"
                            onClick={() => setCriticalAlert(null)}
                        >
                            Acknowledge & Continue
                        </button>
                    </div>
                </div>
            )}

            {resultData ? (
                <div className="result-entry-layout">
                    {/* LEFT PANEL - Patient/Sample Info */}
                    <div className="panel panel-left">
                        <div className="panel-section">
                            <h3>Patient Info</h3>
                            <div className="info-item">
                                <span className="label">Name:</span>
                                <span>{resultData.patient_name}</span>
                            </div>
                            <div className="info-item">
                                <span className="label">PID:</span>
                                <code>{resultData.patient_uid}</code>
                            </div>
                            <div className="info-item">
                                <span className="label">Age/Sex:</span>
                                <span>{formatAge(resultData.patient_age_days)} / {resultData.patient_gender}</span>
                            </div>
                        </div>

                        <div className="panel-section">
                            <h3>Sample Info</h3>
                            <div className="info-item">
                                <span className="label">Sample:</span>
                                <code>{resultData.sample_uid}</code>
                            </div>
                            <div className="info-item">
                                <span className="label">Test:</span>
                                <span>{resultData.test_name}</span>
                            </div>
                        </div>

                        <div className="panel-section">
                            <h3>Test Status</h3>
                            <span className={`badge ${resultData.status === 'FINALIZED' ? 'badge-success' :
                                    resultData.status === 'VERIFIED' ? 'badge-info' :
                                        resultData.status === 'SUBMITTED' ? 'badge-warning' : 'badge-warning'
                                }`}>
                                {resultData.status}
                            </span>
                        </div>
                    </div>

                    {/* CENTER PANEL - Entry Grid */}
                    <div className="panel panel-center">
                        <table className="table result-table">
                            <thead>
                                <tr>
                                    <th>Parameter</th>
                                    <th>Value</th>
                                    <th>Unit</th>
                                    <th>Range</th>
                                    <th>Flag</th>
                                    <th>Δ%</th>
                                </tr>
                            </thead>
                            <tbody>
                                {resultData.parameters.map(param => {
                                    const value = values[param.parameter_code] || '';
                                    const flag = value ? calculateAbnormalFlag(param.parameter_code, value) : '';
                                    const deltaChange = getDeltaChange(param.parameter_code, value);
                                    const isReadOnly = resultData.status === 'FINALIZED';

                                    return (
                                        <tr key={param.parameter_id} className={flag ? `row-${flag.toLowerCase()}` : ''}>
                                            <td>{param.parameter_name}</td>
                                            <td>
                                                <input
                                                    className="input result-input"
                                                    type="text"
                                                    value={value}
                                                    onChange={(e) => handleValueChange(param.parameter_code, e.target.value)}
                                                    placeholder="—"
                                                    disabled={isReadOnly}
                                                />
                                            </td>
                                            <td className="unit">{param.unit}</td>
                                            <td className="range">{getRefRangeText(param)}</td>
                                            <td>
                                                {flag && flag !== 'NORMAL' && (
                                                    <span className={`flag flag-${flag.toLowerCase()}`}>
                                                        {flag.replace('_', ' ')}
                                                    </span>
                                                )}
                                            </td>
                                            <td>
                                                {deltaChange !== null && Math.abs(deltaChange) > 20 && (
                                                    <span className="delta-warning" title={`Previous: ${getPreviousValue(param.parameter_code)}`}>
                                                        {deltaChange > 0 ? '+' : ''}{deltaChange.toFixed(1)}%
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>

                        <div className="result-actions">
                            {resultData.status === 'RECEIVED' || resultData.status === 'DRAFT' ? (
                                <>
                                    <button className="btn btn-secondary" onClick={handleSave}>
                                        <span className="kbd">F5</span> Save Draft
                                    </button>
                                    <button className="btn btn-primary" onClick={handleSubmit}>
                                        <span className="kbd">F9</span> Submit for Verification
                                    </button>
                                </>
                            ) : null}

                            {resultData.status === 'SUBMITTED' && session?.role === 'pathologist' && (
                                <button className="btn btn-primary" onClick={handleVerify}>
                                    Verify Results
                                </button>
                            )}

                            {resultData.status === 'VERIFIED' && session?.role === 'pathologist' && (
                                <button className="btn btn-success" onClick={handleFinalize}>
                                    Finalize
                                </button>
                            )}
                        </div>
                    </div>

                    {/* RIGHT PANEL - Previous Results & Comments */}
                    <div className="panel panel-right">
                        <div className="panel-section">
                            <h3>Previous Results</h3>
                            {resultData.parameters.map(param => {
                                const prevValue = getPreviousValue(param.parameter_code);
                                return (
                                    <div key={param.parameter_code} className="previous-result">
                                        <span className="param-name">{param.parameter_code}:</span>
                                        <span className="param-value">{prevValue}</span>
                                    </div>
                                );
                            })}
                        </div>

                        <div className="panel-section">
                            <h3>QC Status</h3>
                            <span className="badge badge-success">QC OK</span>
                        </div>

                        <div className="panel-section">
                            <h3>Comments</h3>
                            <textarea
                                className="input"
                                rows={4}
                                placeholder="Add test comments..."
                                disabled={resultData.status === 'FINALIZED'}
                            ></textarea>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="empty-state">
                    {loading ? 'Loading...' : 'Select a sample to begin result entry'}
                </div>
            )}
        </div>
    );
}

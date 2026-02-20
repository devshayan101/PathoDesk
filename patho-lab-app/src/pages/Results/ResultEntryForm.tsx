import { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { useToastStore } from '../../stores/toastStore';
import ReportPreview from '../../components/Report/ReportPreview';
import { ResultData, ResultParameter } from './types';

interface ResultEntryFormProps {
    sampleId: number;
    onClose: () => void;
    onSampleUpdate: () => void;
}

interface QCStatus {
    testId: number;
    status: 'PASS' | 'WARNING' | 'FAIL' | 'NOT_RUN' | 'NO_CONFIG';
    message: string;
    canFinalize: boolean;
    hasQCConfigured: boolean;
    lastQCDate: string | null;
}

export default function ResultEntryForm({ sampleId, onClose, onSampleUpdate }: ResultEntryFormProps) {
    const { session } = useAuthStore();
    const showToast = useToastStore(s => s.showToast);
    const [resultData, setResultData] = useState<ResultData | null>(null);
    const [values, setValues] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(true);
    const [criticalAlert, setCriticalAlert] = useState<{ param: string; value: string } | null>(null);
    const [showReport, setShowReport] = useState(false);
    const [qcStatus, setQCStatus] = useState<QCStatus | null>(null);
    const [showOverrideModal, setShowOverrideModal] = useState(false);
    const [overrideReason, setOverrideReason] = useState('');
    const [autoSaveStatus, setAutoSaveStatus] = useState<string>('');
    const isDirtyRef = useRef(false);
    const valuesRef = useRef(values);

    // Keep valuesRef synced
    useEffect(() => {
        valuesRef.current = values;
    }, [values]);

    useEffect(() => {
        loadResultData();
    }, [sampleId]);

    const loadResultData = async (silent = false) => {
        if (!sampleId) return;
        if (!silent) setLoading(true);
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

                // Also fetch QC status for this test
                if (data.test_id && window.electronAPI?.qc?.getTestStatus) {
                    const qcData = await window.electronAPI.qc.getTestStatus(data.test_id);
                    setQCStatus(qcData);
                }
            }
        } catch (e) {
            console.error('Failed to load result data:', e);
        }
        if (!silent) setLoading(false);
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
        isDirtyRef.current = true;
    };

    const handleInputBlur = (paramCode: string, value: string) => {
        // Check for critical values only when user finishes typing (onBlur)
        const flag = calculateAbnormalFlag(paramCode, value);
        if (flag.startsWith('CRITICAL')) {
            const param = resultData?.parameters.find(p => p.parameter_code === paramCode);
            setCriticalAlert({ param: param?.parameter_name || paramCode, value });
        }
    };

    // Helper to save data without UI feedback (internal use)
    const saveData = async (): Promise<boolean> => {
        if (!resultData || !window.electronAPI) return false;

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
            return result.success;
        } catch (e) {
            console.error('Save error:', e);
            return false;
        }
    };

    const handleSave = async () => {
        if (!resultData) return;

        const success = await saveData();
        isDirtyRef.current = false;

        if (success) {
            if (resultData.status === 'VERIFIED' || resultData.status === 'FINALIZED') {
                showToast('Results updated successfully', 'success');
            } else {
                showToast('Results saved as draft', 'success');
            }
            await loadResultData(true); // Silent reload
            onSampleUpdate();
        } else {
            showToast('Failed to save results', 'error');
        }
    };

    const handleSubmit = async () => {
        if (!resultData || !window.electronAPI) return;

        // First save the values
        const saved = await saveData();
        if (!saved) {
            showToast('Failed to save results before submitting', 'error');
            return;
        }

        // Then submit for verification
        try {
            const result = await window.electronAPI.results.submit(resultData.sample_id);
            if (result.success) {
                showToast('Results submitted for verification', 'success');
                onSampleUpdate();
                onClose(); // Go back to list
            } else {
                showToast('Failed to submit: ' + result.error, 'error');
            }
        } catch (e) {
            console.error('Submit error:', e);
        }
    };

    const handleVerify = async () => {
        if (!resultData || !window.electronAPI || !session) return;

        // Save changes first
        const saved = await saveData();
        if (!saved) {
            showToast('Failed to save results before verification', 'error');
            return;
        }

        try {
            const result = await window.electronAPI.results.verify(resultData.sample_id, session.userId);
            if (result.success) {
                showToast('Results verified', 'success');
                await loadResultData(true); // Silent reload
                onSampleUpdate();
            } else {
                showToast('Failed to verify: ' + result.error, 'error');
            }
        } catch (e) {
            console.error('Verify error:', e);
        }
    };

    const handleFinalize = async () => {
        if (!resultData || !window.electronAPI) return;

        // Check QC status before finalizing
        if (qcStatus && qcStatus.hasQCConfigured && !qcStatus.canFinalize) {
            setShowOverrideModal(true);
            return;
        }

        if (!confirm('Finalize results? This cannot be undone.')) return;

        try {
            const result = await window.electronAPI.results.finalize(resultData.sample_id);
            if (result.success) {
                showToast('Results finalized', 'success');
                onSampleUpdate();
                onClose();
            }
        } catch (e) {
            console.error('Finalize error:', e);
        }
    };

    const handleOverrideFinalize = async () => {
        if (!resultData || !window.electronAPI || !session) return;
        if (overrideReason.trim().length < 10) {
            showToast('Override reason must be at least 10 characters', 'warning');
            return;
        }

        try {
            // Log the override first
            if (window.electronAPI?.qc?.override) {
                const overrideResult = await window.electronAPI.qc.override({
                    testId: resultData.test_id,
                    sampleId: resultData.sample_id,
                    reason: overrideReason,
                    overriddenBy: session.userId
                });
                if (!overrideResult.success) {
                    showToast('Failed to log override: ' + overrideResult.error, 'error');
                    return;
                }
            }

            // Then finalize
            const result = await window.electronAPI.results.finalize(resultData.sample_id);
            if (result.success) {
                showToast('Results finalized with QC override', 'success');
                setShowOverrideModal(false);
                setOverrideReason('');
                onSampleUpdate();
                onClose();
            }
        } catch (e) {
            console.error('Override finalize error:', e);
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

    // Auto-save every 10 seconds when dirty
    useEffect(() => {
        const canAutoSave = resultData && (resultData.status === 'RECEIVED' || resultData.status === 'DRAFT');
        if (!canAutoSave) return;

        const interval = setInterval(async () => {
            if (isDirtyRef.current && window.electronAPI) {
                const ok = await saveData();
                if (ok) {
                    isDirtyRef.current = false;
                    setAutoSaveStatus('Auto-saved');
                    setTimeout(() => setAutoSaveStatus(''), 3000);
                }
            }
        }, 10000);

        return () => clearInterval(interval);
    }, [resultData]);

    if (loading) return <div className="result-loading">Loading result data...</div>;
    if (!resultData) return <div className="result-error">Sample not found</div>;

    return (
        <div className="result-entry-form">
            <div className="form-header">
                <button className="btn btn-secondary back-btn" onClick={onClose}>
                    ← Back to List
                </button>
                <h2>Result Entry: {resultData.test_name}</h2>
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
                                const isAuthorized = session?.role === 'admin' || session?.role === 'pathologist';
                                const isReadOnly = (resultData.status === 'VERIFIED' || resultData.status === 'FINALIZED') && !isAuthorized;

                                const value = values[param.parameter_code] || '';
                                const flag = value ? calculateAbnormalFlag(param.parameter_code, value) : '';
                                const deltaChange = getDeltaChange(param.parameter_code, value);

                                return (
                                    <tr key={param.parameter_id} className={flag ? `row-${flag.toLowerCase()}` : ''}>
                                        <td>{param.parameter_name}</td>
                                        <td>
                                            <input
                                                className="input result-input"
                                                type="text"
                                                value={value}
                                                onChange={(e) => handleValueChange(param.parameter_code, e.target.value)}
                                                onBlur={(e) => handleInputBlur(param.parameter_code, e.target.value)}
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
                                {autoSaveStatus && (
                                    <span style={{ color: 'var(--color-success, #22c55e)', fontSize: '12px', opacity: 0.8 }}>
                                        ✓ {autoSaveStatus}
                                    </span>
                                )}
                                <button className="btn btn-primary" onClick={handleSubmit}>
                                    <span className="kbd">F9</span> Submit for Verification
                                </button>
                            </>
                        ) : null}

                        {(resultData.status === 'VERIFIED' || resultData.status === 'FINALIZED') && (session?.role === 'pathologist' || session?.role === 'admin') && (
                            <button className="btn btn-secondary" onClick={handleSave}>
                                💾 Update Results
                            </button>
                        )}

                        {resultData.status === 'SUBMITTED' && (session?.role === 'pathologist' || session?.role === 'admin') && (
                            <button className="btn btn-primary" onClick={handleVerify}>
                                Verify Results
                            </button>
                        )}

                        {resultData.status === 'VERIFIED' && (session?.role === 'pathologist' || session?.role === 'admin') && (
                            <button className="btn btn-success" onClick={handleFinalize}>
                                Finalize
                            </button>
                        )}

                        {(resultData.status === 'VERIFIED' || resultData.status === 'FINALIZED') && (
                            <button className="btn btn-secondary" onClick={() => setShowReport(true)}>
                                📄 View Report
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
                        {qcStatus ? (
                            <>
                                <span className={`badge ${qcStatus.status === 'PASS' ? 'badge-success' :
                                    qcStatus.status === 'WARNING' ? 'badge-warning' :
                                        qcStatus.status === 'NO_CONFIG' ? 'badge-info' :
                                            'badge-error'
                                    }`}>
                                    {qcStatus.status === 'NO_CONFIG' ? 'No QC' :
                                        qcStatus.status === 'NOT_RUN' ? 'QC Not Run' :
                                            qcStatus.status}
                                </span>
                                {qcStatus.status !== 'PASS' && qcStatus.status !== 'NO_CONFIG' && (
                                    <p className="qc-message">{qcStatus.message}</p>
                                )}
                                {qcStatus.lastQCDate && (
                                    <p className="qc-date">Last run: {qcStatus.lastQCDate}</p>
                                )}
                            </>
                        ) : (
                            <span className="badge badge-info">Loading...</span>
                        )}
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

            {/* QC Override Modal */}
            {showOverrideModal && (
                <div className="modal-overlay">
                    <div className="modal override-modal">
                        <h2>⚠️ QC Override Required</h2>
                        <p className="override-warning">
                            QC has failed or was not run. Finalizing requires pathologist override.
                        </p>
                        <p><strong>QC Status:</strong> {qcStatus?.message}</p>

                        <div className="form-group">
                            <label>Override Reason (Mandatory - minimum 10 characters):</label>
                            <textarea
                                className="input"
                                rows={4}
                                value={overrideReason}
                                onChange={(e) => setOverrideReason(e.target.value)}
                                placeholder="Explain why QC is being overridden..."
                            />
                        </div>

                        <div className="modal-actions">
                            <button
                                className="btn btn-secondary"
                                onClick={() => { setShowOverrideModal(false); setOverrideReason(''); }}
                            >
                                Cancel
                            </button>
                            <button
                                className="btn btn-warning"
                                onClick={handleOverrideFinalize}
                                disabled={overrideReason.trim().length < 10}
                            >
                                Override & Finalize
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Report Preview Modal */}
            {showReport && resultData && (
                <ReportPreview
                    sampleId={resultData.sample_id}
                    onClose={() => setShowReport(false)}
                />
            )}
        </div>
    );
}

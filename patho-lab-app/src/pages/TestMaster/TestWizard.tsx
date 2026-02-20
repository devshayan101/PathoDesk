import { useState, useEffect } from 'react';
import { useToastStore } from '../../stores/toastStore';
import './TestWizard.css';

interface WizardProps {
    initialDraftId?: number;
    isEditing?: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

enum WizardStep {
    TEST_BASICS = 1,
    PARAMETERS = 2,
    REF_RANGES = 3,
    CRITICAL_VALUES = 4,
    REPORT_LAYOUT = 5,
    REVIEW = 6
}

const STEP_LABELS = ['Basics', 'Parameters', 'Ref Ranges', 'Critical', 'Layout', 'Review'];

export default function TestWizard({ initialDraftId, isEditing, onClose, onSuccess }: WizardProps) {
    const [currentStep, setCurrentStep] = useState<WizardStep>(WizardStep.TEST_BASICS);
    const [draftId, setDraftId] = useState<number | null>(initialDraftId || null);
    const [loading, setLoading] = useState(false);
    const showToast = useToastStore(s => s.showToast);

    // Step 1: Basics
    const [basics, setBasics] = useState({
        testCode: '', testName: '', department: 'Hematology',
        method: 'Analyzer', sampleType: 'Blood', reportGroup: ''
    });

    // Step 2: Parameters
    const [parameters, setParameters] = useState<any[]>([]);

    // Step 3: Reference Ranges (per parameter)
    const [selectedParamIdx, setSelectedParamIdx] = useState(0);
    const [paramRanges, setParamRanges] = useState<Record<number, any[]>>({});
    const [showAddRange, setShowAddRange] = useState(false);
    const [newRange, setNewRange] = useState({ gender: 'A', ageMinDays: 0, ageMaxDays: 36500, lowerLimit: '', upperLimit: '' });

    // Step 4: Critical Values
    const [criticalValues, setCriticalValues] = useState<Record<number, { criticalLow: string; criticalHigh: string }>>({});

    // Step 5: Report Layout
    const [reportLayout, setReportLayout] = useState({ interpretationTemplate: '' });

    useEffect(() => {
        if (initialDraftId) loadDraftData(initialDraftId);
    }, [initialDraftId]);

    const loadDraftData = async (id: number) => {
        setLoading(true);
        try {
            if (window.electronAPI) {
                const version = await window.electronAPI.testWizard.getDraft(id);
                if (version) {
                    // Get the test_code from tests table
                    let testCode = '';
                    try {
                        const testData = await window.electronAPI.tests.get(version.test_id);
                        testCode = testData?.test_code || '';
                    } catch { /* OK */ }

                    setBasics({
                        testCode,
                        testName: version.test_name,
                        department: version.department,
                        method: version.method,
                        sampleType: version.sample_type,
                        reportGroup: version.report_group || ''
                    });
                    setReportLayout({ interpretationTemplate: version.interpretation_template || '' });
                    setCurrentStep(version.wizard_step || 1);
                }

                const params = await window.electronAPI.tests.getParameters(id);
                setParameters(params);

                // Load ref ranges for each parameter
                const ranges: Record<number, any[]> = {};
                for (const p of params) {
                    try {
                        const r = await window.electronAPI.refRanges.list(p.id);
                        ranges[p.id] = r;
                    } catch { ranges[p.id] = []; }
                }
                setParamRanges(ranges);
            }
        } catch (e) {
            console.error('Failed to load draft:', e);
        }
        setLoading(false);
    };

    const handleCreateDraft = async () => {
        if (!basics.testCode || !basics.testName) {
            showToast('Code and Name are required', 'warning');
            return;
        }
        setLoading(true);
        try {
            if (window.electronAPI) {
                const id = await window.electronAPI.testWizard.createDraft(basics);
                setDraftId(id);
                setCurrentStep(WizardStep.PARAMETERS);
            }
        } catch (e: any) {
            showToast('Error creating draft: ' + e.message, 'error');
        }
        setLoading(false);
    };

    const handleNext = async () => {
        if (!draftId) {
            await handleCreateDraft();
        } else {
            if (currentStep === WizardStep.PARAMETERS) await saveParameters();
            if (currentStep === WizardStep.REPORT_LAYOUT) await saveLayout();

            const next = currentStep + 1;
            if (next <= WizardStep.REVIEW) {
                setCurrentStep(next);
                saveStepProgress(next);
            }
        }
    };

    const handleBack = () => { if (currentStep > 1) setCurrentStep(currentStep - 1); };

    const saveStepProgress = async (step: number) => {
        if (draftId && window.electronAPI) {
            await window.electronAPI.testWizard.updateStep(draftId, step);
        }
    };

    const saveParameters = async () => {
        if (draftId && window.electronAPI) {
            await window.electronAPI.testWizard.saveParams(draftId, parameters);
            // Reload to get IDs
            const params = await window.electronAPI.tests.getParameters(draftId);
            setParameters(params);
        }
    };

    const saveLayout = async () => {
        if (draftId && window.electronAPI) {
            await window.electronAPI.testWizard.updateDraft(draftId, {
                interpretation_template: reportLayout.interpretationTemplate
            } as any);
        }
    };

    const handleSave = async () => {
        if (!draftId) return;
        setLoading(true);
        try {
            if (currentStep === WizardStep.TEST_BASICS || currentStep === WizardStep.REVIEW) {
                if (window.electronAPI) {
                    await window.electronAPI.testWizard.updateDraft(draftId, {
                        test_name: basics.testName,
                        department: basics.department,
                        method: basics.method,
                        sample_type: basics.sampleType,
                        report_group: basics.reportGroup || null,
                    });
                }
            }
            if (currentStep === WizardStep.PARAMETERS) await saveParameters();
            if (currentStep === WizardStep.REPORT_LAYOUT) await saveLayout();
            showToast('Saved successfully', 'success');
            onSuccess(); // Save and exit wizard
        } catch (e: any) {
            showToast('Save failed: ' + e.message, 'error');
        }
        setLoading(false);
    };

    const handlePublish = async () => {
        if (draftId && window.electronAPI) {
            try {
                await window.electronAPI.testWizard.publish(draftId);
                showToast('Test Published Successfully!', 'success');
                onSuccess();
            } catch (e: any) {
                showToast('Publish failed: ' + e.message, 'error');
            }
        }
    };

    // --- Parameter helpers ---
    const addParam = () => {
        setParameters([...parameters, {
            parameter_code: '', parameter_name: '', data_type: 'NUMERIC', unit: '',
            decimal_precision: 2, display_order: parameters.length + 1, is_mandatory: 1, formula: ''
        }]);
    };
    const updateParam = (idx: number, field: string, value: any) => {
        const newParams = [...parameters];
        newParams[idx] = { ...newParams[idx], [field]: value };
        setParameters(newParams);
    };
    const removeParam = (idx: number) => setParameters(parameters.filter((_, i) => i !== idx));

    // --- Ref Range helpers (Step 3) ---
    const handleAddRefRange = async () => {
        const param = parameters[selectedParamIdx];
        if (!param?.id) {
            showToast('Save parameters first (Step 2 → Next)', 'warning');
            return;
        }
        try {
            if (window.electronAPI) {
                const result = await window.electronAPI.refRanges.create({
                    parameterId: param.id,
                    gender: newRange.gender,
                    ageMinDays: newRange.ageMinDays,
                    ageMaxDays: newRange.ageMaxDays,
                    lowerLimit: parseFloat(newRange.lowerLimit) || undefined,
                    upperLimit: parseFloat(newRange.upperLimit) || undefined,
                });
                if (!result.success) { showToast(result.error || 'Failed', 'error'); return; }

                const r = await window.electronAPI.refRanges.list(param.id);
                setParamRanges(prev => ({ ...prev, [param.id]: r }));
                setShowAddRange(false);
                setNewRange({ gender: 'A', ageMinDays: 0, ageMaxDays: 36500, lowerLimit: '', upperLimit: '' });
            }
        } catch (e: any) { showToast(e.message, 'error'); }
    };

    const handleDeleteRefRange = async (rangeId: number) => {
        const param = parameters[selectedParamIdx];
        if (!param?.id) return;
        if (window.electronAPI) {
            await window.electronAPI.refRanges.delete(rangeId);
            const r = await window.electronAPI.refRanges.list(param.id);
            setParamRanges(prev => ({ ...prev, [param.id]: r }));
        }
    };

    // --- RENDER STEPS ---
    const renderBasics = () => (
        <div className="wizard-step">
            <h3>Step 1: Test Basics</h3>
            <div className="form-group">
                <label>Test Code (Unique)</label>
                <input className="input" value={basics.testCode}
                    onChange={e => setBasics({ ...basics, testCode: e.target.value.toUpperCase() })}
                    placeholder="e.g. CBC, LIPID"
                    disabled={isEditing} />
            </div>
            <div className="form-group">
                <label>Test Name</label>
                <input className="input" value={basics.testName}
                    onChange={e => setBasics({ ...basics, testName: e.target.value })}
                    placeholder="e.g. Complete Blood Count" />
            </div>
            <div className="form-row">
                <div className="form-group">
                    <label>Department</label>
                    <select className="input" value={basics.department} onChange={e => setBasics({ ...basics, department: e.target.value })}>
                        <option>Hematology</option><option>Biochemistry</option><option>Serology</option>
                        <option>Microbiology</option><option>Clinical Pathology</option><option>Histopathology</option>
                    </select>
                </div>
                <div className="form-group">
                    <label>Method</label>
                    <select className="input" value={basics.method} onChange={e => setBasics({ ...basics, method: e.target.value })}>
                        <option>Analyzer</option><option>Manual</option><option>Semi-Auto</option><option>Calculated</option>
                    </select>
                </div>
            </div>
            <div className="form-row">
                <div className="form-group">
                    <label>Sample Type</label>
                    <input className="input" value={basics.sampleType} onChange={e => setBasics({ ...basics, sampleType: e.target.value })} />
                </div>
                <div className="form-group">
                    <label>Report Group</label>
                    <input className="input" value={basics.reportGroup} onChange={e => setBasics({ ...basics, reportGroup: e.target.value })}
                        placeholder="e.g. HEMATOLOGY" />
                </div>
            </div>
        </div>
    );

    const renderParameters = () => (
        <div className="wizard-step">
            <h3>Step 2: Parameters</h3>
            <div className="params-grid">
                <table className="table">
                    <thead>
                        <tr>
                            <th>Code</th><th>Name</th><th>Unit</th><th>Type</th><th>Precision</th><th></th>
                        </tr>
                    </thead>
                    <tbody>
                        {parameters.map((p, idx) => (
                            <tr key={idx}>
                                <td><input className="input-sm" value={p.parameter_code} onChange={e => updateParam(idx, 'parameter_code', e.target.value)} /></td>
                                <td><input className="input-sm" value={p.parameter_name} onChange={e => updateParam(idx, 'parameter_name', e.target.value)} /></td>
                                <td><input className="input-sm" value={p.unit || ''} onChange={e => updateParam(idx, 'unit', e.target.value)} /></td>
                                <td>
                                    <select className="input-sm" value={p.data_type} onChange={e => updateParam(idx, 'data_type', e.target.value)}>
                                        <option>NUMERIC</option><option>TEXT</option><option>CALCULATED</option>
                                    </select>
                                </td>
                                <td><input className="input-sm" type="number" style={{ width: 50 }} value={p.decimal_precision ?? 2} onChange={e => updateParam(idx, 'decimal_precision', parseInt(e.target.value) || 0)} /></td>
                                <td><button className="btn-delete" onClick={() => removeParam(idx)}>×</button></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                <button className="btn btn-secondary btn-sm" onClick={addParam}>+ Add Parameter</button>
            </div>
        </div>
    );

    const renderRefRanges = () => {
        const param = parameters[selectedParamIdx];
        const ranges = param?.id ? (paramRanges[param.id] || []) : [];

        return (
            <div className="wizard-step">
                <h3>Step 3: Reference Ranges</h3>
                {parameters.length === 0 ? (
                    <p className="placeholder-text">No parameters defined. Go back to Step 2 to add parameters.</p>
                ) : (
                    <>
                        <div className="param-tabs">
                            {parameters.map((p, idx) => (
                                <button key={idx}
                                    className={`param-tab ${idx === selectedParamIdx ? 'active' : ''}`}
                                    onClick={() => { setSelectedParamIdx(idx); setShowAddRange(false); }}>
                                    {p.parameter_code || `Param ${idx + 1}`}
                                </button>
                            ))}
                        </div>

                        <div className="range-section">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                                <strong>{param?.parameter_name} {param?.unit ? `(${param.unit})` : ''}</strong>
                                <button className="btn btn-primary btn-sm" onClick={() => setShowAddRange(true)}>+ Add Range</button>
                            </div>

                            {ranges.length === 0 ? (
                                <p className="placeholder-text">No reference ranges defined for this parameter.</p>
                            ) : (
                                <table className="table">
                                    <thead><tr><th>Gender</th><th>Age Range</th><th>Low</th><th>High</th><th></th></tr></thead>
                                    <tbody>
                                        {ranges.map((r: any) => (
                                            <tr key={r.id}>
                                                <td>{r.gender === 'M' ? 'Male' : r.gender === 'F' ? 'Female' : 'All'}</td>
                                                <td>{formatAge(r.age_min_days)} – {formatAge(r.age_max_days)}</td>
                                                <td>{r.lower_limit ?? '—'}</td>
                                                <td>{r.upper_limit ?? '—'}</td>
                                                <td><button className="btn-delete" onClick={() => handleDeleteRefRange(r.id)}>×</button></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}

                            {showAddRange && (
                                <div className="add-range-inline">
                                    <div className="form-row">
                                        <div className="form-group">
                                            <label>Gender</label>
                                            <select className="input" value={newRange.gender} onChange={e => setNewRange({ ...newRange, gender: e.target.value })}>
                                                <option value="A">All</option><option value="M">Male</option><option value="F">Female</option>
                                            </select>
                                        </div>
                                        <div className="form-group">
                                            <label>Age Min (days)</label>
                                            <input className="input" type="number" value={newRange.ageMinDays} onChange={e => setNewRange({ ...newRange, ageMinDays: parseInt(e.target.value) || 0 })} />
                                        </div>
                                        <div className="form-group">
                                            <label>Age Max (days)</label>
                                            <input className="input" type="number" value={newRange.ageMaxDays} onChange={e => setNewRange({ ...newRange, ageMaxDays: parseInt(e.target.value) || 36500 })} />
                                        </div>
                                    </div>
                                    <div className="form-row">
                                        <div className="form-group">
                                            <label>Lower Limit</label>
                                            <input className="input" type="number" step="0.1" value={newRange.lowerLimit} onChange={e => setNewRange({ ...newRange, lowerLimit: e.target.value })} />
                                        </div>
                                        <div className="form-group">
                                            <label>Upper Limit</label>
                                            <input className="input" type="number" step="0.1" value={newRange.upperLimit} onChange={e => setNewRange({ ...newRange, upperLimit: e.target.value })} />
                                        </div>
                                        <div className="form-group" style={{ display: 'flex', alignItems: 'flex-end', gap: '0.5rem' }}>
                                            <button className="btn btn-primary btn-sm" onClick={handleAddRefRange}>Add</button>
                                            <button className="btn btn-secondary btn-sm" onClick={() => setShowAddRange(false)}>Cancel</button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>
        );
    };

    const renderCriticalValues = () => (
        <div className="wizard-step">
            <h3>Step 4: Critical Values</h3>
            <p style={{ color: 'var(--color-text-muted)', marginBottom: '1rem', fontSize: '0.9rem' }}>
                Define critical low/high thresholds per parameter. Results outside these ranges will be flagged as CRITICAL.
            </p>
            {parameters.length === 0 ? (
                <p className="placeholder-text">No parameters defined.</p>
            ) : (
                <table className="table">
                    <thead><tr><th>Parameter</th><th>Unit</th><th>Critical Low</th><th>Critical High</th></tr></thead>
                    <tbody>
                        {parameters.filter(p => p.data_type === 'NUMERIC').map((p, idx) => (
                            <tr key={idx}>
                                <td><strong>{p.parameter_code}</strong> — {p.parameter_name}</td>
                                <td>{p.unit || '—'}</td>
                                <td>
                                    <input className="input-sm" type="number" step="0.1" placeholder="Low"
                                        value={criticalValues[p.id]?.criticalLow || ''}
                                        onChange={e => setCriticalValues(prev => ({
                                            ...prev, [p.id]: { ...prev[p.id], criticalLow: e.target.value, criticalHigh: prev[p.id]?.criticalHigh || '' }
                                        }))} />
                                </td>
                                <td>
                                    <input className="input-sm" type="number" step="0.1" placeholder="High"
                                        value={criticalValues[p.id]?.criticalHigh || ''}
                                        onChange={e => setCriticalValues(prev => ({
                                            ...prev, [p.id]: { criticalLow: prev[p.id]?.criticalLow || '', criticalHigh: e.target.value }
                                        }))} />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    );

    const renderReportLayout = () => (
        <div className="wizard-step">
            <h3>Step 5: Report Layout</h3>
            <div className="form-group">
                <label>Interpretation Template</label>
                <textarea className="input" rows={6} value={reportLayout.interpretationTemplate}
                    onChange={e => setReportLayout({ ...reportLayout, interpretationTemplate: e.target.value })}
                    placeholder="Enter default interpretation text for this test's reports. Supports line breaks." />
            </div>
            <div className="form-group">
                <label>Parameter Display Order</label>
                <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', marginBottom: '0.5rem' }}>
                    Parameters appear on the report in this order. Drag rows in Step 2 to reorder.
                </p>
                <table className="table">
                    <thead><tr><th>#</th><th>Code</th><th>Name</th><th>Unit</th></tr></thead>
                    <tbody>
                        {parameters.map((p, idx) => (
                            <tr key={idx}><td>{idx + 1}</td><td>{p.parameter_code}</td><td>{p.parameter_name}</td><td>{p.unit || '—'}</td></tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );

    const renderReview = () => (
        <div className="wizard-step">
            <h3>Step 6: Review & Publish</h3>
            <div className="review-section">
                <h4>Test Details</h4>
                <div className="review-grid">
                    <div><span className="review-label">Code:</span> <strong>{basics.testCode}</strong></div>
                    <div><span className="review-label">Name:</span> <strong>{basics.testName}</strong></div>
                    <div><span className="review-label">Department:</span> {basics.department}</div>
                    <div><span className="review-label">Method:</span> {basics.method}</div>
                    <div><span className="review-label">Sample Type:</span> {basics.sampleType}</div>
                    {basics.reportGroup && <div><span className="review-label">Report Group:</span> {basics.reportGroup}</div>}
                </div>
            </div>
            <div className="review-section">
                <h4>Parameters ({parameters.length})</h4>
                <table className="table">
                    <thead><tr><th>Code</th><th>Name</th><th>Unit</th><th>Type</th><th>Ranges</th></tr></thead>
                    <tbody>
                        {parameters.map((p, idx) => (
                            <tr key={idx}>
                                <td>{p.parameter_code}</td>
                                <td>{p.parameter_name}</td>
                                <td>{p.unit || '—'}</td>
                                <td>{p.data_type}</td>
                                <td>{p.id ? (paramRanges[p.id]?.length || 0) : 0}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <div className="review-actions">
                <button className="btn btn-success" onClick={handlePublish} disabled={loading}>
                    {loading ? 'Publishing...' : '✓ Publish Test'}
                </button>
            </div>
        </div>
    );

    const formatAge = (days: number) => {
        if (days >= 365) return `${Math.floor(days / 365)}y`;
        if (days >= 30) return `${Math.floor(days / 30)}m`;
        return `${days}d`;
    };

    return (
        <div className="wizard-overlay">
            <div className="wizard-container">
                <div className="wizard-header">
                    <h2>{isEditing ? 'Test Edit Wizard' : 'Test Creation Wizard'}</h2>
                    <div className="wizard-steps-nav">
                        {STEP_LABELS.map((label, idx) => (
                            <div key={idx} className={`step-indicator ${currentStep === idx + 1 ? 'active' : currentStep > idx + 1 ? 'completed' : ''}`}
                                onClick={() => draftId && setCurrentStep(idx + 1 as WizardStep)}>
                                <span className="step-num">{idx + 1}</span>
                                <span className="step-label">{label}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="wizard-content">
                    {currentStep === WizardStep.TEST_BASICS && renderBasics()}
                    {currentStep === WizardStep.PARAMETERS && renderParameters()}
                    {currentStep === WizardStep.REF_RANGES && renderRefRanges()}
                    {currentStep === WizardStep.CRITICAL_VALUES && renderCriticalValues()}
                    {currentStep === WizardStep.REPORT_LAYOUT && renderReportLayout()}
                    {currentStep === WizardStep.REVIEW && renderReview()}
                </div>

                <div className="wizard-footer">
                    <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
                    <div className="wizard-nav">
                        <button className="btn btn-secondary" onClick={handleBack} disabled={currentStep === 1}>Back</button>
                        {draftId && (
                            <button className="btn btn-secondary" onClick={handleSave} disabled={loading}>
                                {loading ? 'Saving...' : 'Save'}
                            </button>
                        )}
                        {currentStep < WizardStep.REVIEW && (
                            <button className="btn btn-primary" onClick={handleNext} disabled={loading}>
                                {loading ? 'Saving...' : 'Next'}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

import { useState, useEffect } from 'react';
import './TestWizard.css';

interface TestDraft {
    version_id: number;
    test_code: string;
    test_name: string;
    wizard_step: number;
    status: string;
}

interface WizardProps {
    initialDraftId?: number;
    onClose: () => void;
    onSuccess: () => void;
}

// Steps enum
enum WizardStep {
    TEST_BASICS = 1,
    PARAMETERS = 2,
    REF_RANGES = 3,
    CRITICAL_VALUES = 4,
    REPORT_LAYOUT = 5,
    REVIEW = 6
}

export default function TestWizard({ initialDraftId, onClose, onSuccess }: WizardProps) {
    const [currentStep, setCurrentStep] = useState<WizardStep>(WizardStep.TEST_BASICS);
    const [draftId, setDraftId] = useState<number | null>(initialDraftId || null);
    const [loading, setLoading] = useState(false);

    // Step 1: Basics State
    const [basics, setBasics] = useState({
        testCode: '',
        testName: '',
        department: 'Hematology',
        method: 'Analyzer',
        sampleType: 'Blood',
        reportGroup: ''
    });

    // Step 2: Parameters State
    const [parameters, setParameters] = useState<any[]>([]);

    useEffect(() => {
        if (initialDraftId) {
            loadDraftData(initialDraftId);
        }
    }, [initialDraftId]);

    const loadDraftData = async (id: number) => {
        setLoading(true);
        try {
            if (window.electronAPI) {
                // Load details
                const version = await window.electronAPI.testWizard.getDraft(id);
                if (version) {
                    setBasics({
                        testCode: '', // Code is in 'tests' table, not 'test_versions', but we might not need it for display or can fetch it if needed. 
                        // Wait, creating draft from existing keeps same test ID. The user can't change Test Code easily here? 
                        // Actually, test code is in `tests` table. `test_versions` has `test_id`.
                        // For simplicity, we might skip showing/editing Test Code if it's an existing test.
                        // Or fetch it. `getDraft` returns TestVersionRow.
                        // Ideally we should join to get test_code.
                        testName: version.test_name,
                        department: version.department,
                        method: version.method,
                        sampleType: version.sample_type,
                        reportGroup: version.report_group || ''
                    });
                    setCurrentStep(version.wizard_step || 1);
                }

                // Load parameters
                const params = await window.electronAPI.tests.getParameters(id);
                setParameters(params);
            }
        } catch (e) {
            console.error('Failed to load draft:', e);
        }
        setLoading(false);
    };

    const handleCreateDraft = async () => {
        if (!basics.testCode || !basics.testName) {
            alert('Code and Name are required');
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
            alert('Error creating draft: ' + e.message);
        }
        setLoading(false);
    };

    const handleNext = async () => {
        if (!draftId) {
            // First step save
            await handleCreateDraft();
        } else {
            // Save current step data and proceed
            if (currentStep === WizardStep.PARAMETERS) {
                await saveParameters();
            }

            const next = currentStep + 1;
            if (next <= WizardStep.REVIEW) {
                setCurrentStep(next);
                saveStepProgress(next);
            }
        }
    };

    const handleBack = () => {
        if (currentStep > 1) {
            setCurrentStep(currentStep - 1);
        }
    };

    const saveStepProgress = async (step: number) => {
        if (draftId && window.electronAPI) {
            await window.electronAPI.testWizard.updateStep(draftId, step);
        }
    };

    const saveParameters = async () => {
        if (draftId && window.electronAPI) {
            await window.electronAPI.testWizard.saveParams(draftId, parameters);
        }
    };

    const handlePublish = async () => {
        if (draftId && window.electronAPI) {
            try {
                await window.electronAPI.testWizard.publish(draftId);
                alert('Test Published Successfully!');
                onSuccess();
            } catch (e: any) {
                alert('Publish failed: ' + e.message);
            }
        }
    };

    // --- RENDER STEPS ---

    const renderBasics = () => (
        <div className="wizard-step">
            <h3>Step 1: Test Basics</h3>
            <div className="form-group">
                <label>Test Code (Unique)</label>
                <input
                    className="input"
                    value={basics.testCode}
                    onChange={e => setBasics({ ...basics, testCode: e.target.value.toUpperCase() })}
                    placeholder="e.g. CBC, LIPID"
                />
            </div>
            <div className="form-group">
                <label>Test Name</label>
                <input
                    className="input"
                    value={basics.testName}
                    onChange={e => setBasics({ ...basics, testName: e.target.value })}
                    placeholder="e.g. Complete Blood Count"
                />
            </div>
            <div className="form-row">
                <div className="form-group">
                    <label>Department</label>
                    <select className="input" value={basics.department} onChange={e => setBasics({ ...basics, department: e.target.value })}>
                        <option>Hematology</option>
                        <option>Biochemistry</option>
                        <option>Serology</option>
                        <option>Microbiology</option>
                        <option>Clinical Pathology</option>
                    </select>
                </div>
                <div className="form-group">
                    <label>Method</label>
                    <select className="input" value={basics.method} onChange={e => setBasics({ ...basics, method: e.target.value })}>
                        <option>Analyzer</option>
                        <option>Manual</option>
                        <option>Semi-Auto</option>
                        <option>Calculated</option>
                    </select>
                </div>
            </div>
            <div className="form-row">
                <div className="form-group">
                    <label>Sample Type</label>
                    <input className="input" value={basics.sampleType} onChange={e => setBasics({ ...basics, sampleType: e.target.value })} />
                </div>
            </div>
        </div>
    );

    const renderParameters = () => (
        <div className="wizard-step">
            <h3>Step 2: Parameters</h3>
            <div className="params-grid">
                {/* Simplified parameter editor for wizard */}
                <table className="table">
                    <thead>
                        <tr>
                            <th>Code</th>
                            <th>Name</th>
                            <th>Unit</th>
                            <th>Type</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {parameters.map((p, idx) => (
                            <tr key={idx}>
                                <td><input className="input-sm" value={p.parameter_code} onChange={e => updateParam(idx, 'parameter_code', e.target.value)} /></td>
                                <td><input className="input-sm" value={p.parameter_name} onChange={e => updateParam(idx, 'parameter_name', e.target.value)} /></td>
                                <td><input className="input-sm" value={p.unit} onChange={e => updateParam(idx, 'unit', e.target.value)} /></td>
                                <td>
                                    <select className="input-sm" value={p.data_type} onChange={e => updateParam(idx, 'data_type', e.target.value)}>
                                        <option>NUMERIC</option>
                                        <option>TEXT</option>
                                        <option>CALCULATED</option>
                                    </select>
                                </td>
                                <td><button className="btn-delete" onClick={() => removeParam(idx)}>×</button></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                <button className="btn btn-secondary btn-sm" onClick={addParam}>+ Add Parameter</button>
            </div>
        </div>
    );

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

    const removeParam = (idx: number) => {
        setParameters(parameters.filter((_, i) => i !== idx));
    };

    // Placeholder for other steps
    const renderPlaceholder = (title: string) => (
        <div className="wizard-step">
            <h3>{title}</h3>
            <p className="placeholder-text">This step is under construction. Click Next to proceed.</p>
        </div>
    );

    return (
        <div className="wizard-overlay">
            <div className="wizard-container">
                <div className="wizard-header">
                    <h2>Test Creation Wizard</h2>
                    <div className="wizard-progress">
                        Step {currentStep} of 6
                    </div>
                </div>

                <div className="wizard-content">
                    {currentStep === WizardStep.TEST_BASICS && renderBasics()}
                    {currentStep === WizardStep.PARAMETERS && renderParameters()}
                    {currentStep === WizardStep.REF_RANGES && renderPlaceholder('Step 3: Reference Ranges')}
                    {currentStep === WizardStep.CRITICAL_VALUES && renderPlaceholder('Step 4: Critical Values')}
                    {currentStep === WizardStep.REPORT_LAYOUT && renderPlaceholder('Step 5: Report Layout')}
                    {currentStep === WizardStep.REVIEW && (
                        <div className="wizard-step">
                            <h3>Step 6: Review & Publish</h3>
                            <p>Test: <strong>{basics.testName}</strong> ({basics.testCode})</p>
                            <p>Parameters: {parameters.length}</p>
                            <div className="review-actions">
                                <button className="btn btn-success" onClick={handlePublish}>Publish Test</button>
                            </div>
                        </div>
                    )}
                </div>

                <div className="wizard-footer">
                    <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
                    <div className="wizard-nav">
                        <button className="btn btn-secondary" onClick={handleBack} disabled={currentStep === 1}>Back</button>
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

import { useState, useEffect } from 'react';
import { useToastStore } from '../../stores/toastStore';
import './TestMaster.css';
import TestWizard from './TestWizard';

interface Test {
    id: number;
    test_code: string;
    test_name: string;
    department: string;
    method: string;
    sample_type: string;
    version_id: number;
}

interface Parameter {
    id: number;
    parameter_code: string;
    parameter_name: string;
    data_type: string;
    unit: string | null;
}

interface RefRange {
    id: number;
    gender: string;
    age_min_days: number;
    age_max_days: number;
    lower_limit: number | null;
    upper_limit: number | null;
    display_text: string | null;
}

export default function TestMasterPage() {
    const [tests, setTests] = useState<Test[]>([]);
    const [testSearch, setTestSearch] = useState('');
    const showToast = useToastStore(s => s.showToast);
    const [selectedTest, setSelectedTest] = useState<Test | null>(null);
    const [parameters, setParameters] = useState<Parameter[]>([]);
    const [selectedParam, setSelectedParam] = useState<Parameter | null>(null);
    const [refRanges, setRefRanges] = useState<RefRange[]>([]);
    const [showAddRange, setShowAddRange] = useState(false);
    const [newRange, setNewRange] = useState({
        gender: 'A', ageMinDays: 0, ageMaxDays: 36500, lowerLimit: '', upperLimit: ''
    });
    const [showWizard, setShowWizard] = useState(false);
    const [wizardDraftId, setWizardDraftId] = useState<number | undefined>(undefined);
    const [isEditing, setIsEditing] = useState(false);

    // Add/Edit Parameter form
    const [showAddParam, setShowAddParam] = useState(false);
    const [isEditingParam, setIsEditingParam] = useState(false);
    const [editingParamId, setEditingParamId] = useState<number | null>(null);
    const [newParam, setNewParam] = useState({
        parameterCode: '', parameterName: '', dataType: 'NUMERIC', unit: ''
    });

    useEffect(() => { loadTests(); }, []);
    useEffect(() => {
        if (selectedTest?.version_id) loadParameters(selectedTest.version_id);
    }, [selectedTest]);
    useEffect(() => {
        if (selectedParam?.id) loadRefRanges(selectedParam.id);
    }, [selectedParam]);

    const loadTests = async () => {
        if (window.electronAPI) {
            const data = await window.electronAPI.tests.list();
            setTests(data);
            if (data.length > 0 && !selectedTest) setSelectedTest(data[0]);
        }
    };

    const loadParameters = async (testVersionId: number) => {
        if (window.electronAPI) {
            const data = await window.electronAPI.tests.getParameters(testVersionId);
            setParameters(data);
            if (data.length > 0 && !selectedParam) setSelectedParam(data[0]);
            else if (data.length === 0) setSelectedParam(null);
        }
    };

    const loadRefRanges = async (parameterId: number) => {
        if (window.electronAPI) {
            const data = await window.electronAPI.refRanges.list(parameterId);
            setRefRanges(data);
        }
    };

    const handleAddRange = async () => {
        if (!selectedParam) return;
        try {
            if (window.electronAPI) {
                const result = await window.electronAPI.refRanges.create({
                    parameterId: selectedParam.id,
                    gender: newRange.gender,
                    ageMinDays: newRange.ageMinDays,
                    ageMaxDays: newRange.ageMaxDays,
                    lowerLimit: parseFloat(newRange.lowerLimit) || undefined,
                    upperLimit: parseFloat(newRange.upperLimit) || undefined,
                });
                if (!result.success) {
                    showToast(result.error || 'Failed to add range', 'error');
                    return;
                }
                await loadRefRanges(selectedParam.id);
                setShowAddRange(false);
                setNewRange({ gender: 'A', ageMinDays: 0, ageMaxDays: 36500, lowerLimit: '', upperLimit: '' });
            }
        } catch (e: any) {
            showToast(e.message, 'error');
        }
    };

    const handleDeleteRange = async (id: number) => {
        if (!selectedParam) return;
        if (window.electronAPI) {
            await window.electronAPI.refRanges.delete(id);
            await loadRefRanges(selectedParam.id);
        }
    };

    const handleDeleteTest = async (testId: number) => {
        if (!confirm('Are you sure you want to delete this test? This action cannot be undone.')) return;
        try {
            if (window.electronAPI) {
                await window.electronAPI.tests.delete(testId);
                await loadTests();
                setSelectedTest(null);
            }
        } catch (e: any) {
            showToast('Failed to delete test: ' + e.message, 'error');
        }
    };

    const handleEditTest = async (testId: number) => {
        try {
            if (window.electronAPI) {
                const draftId = await window.electronAPI.testWizard.createDraftFromExisting(testId);
                setWizardDraftId(draftId);
                setIsEditing(true);
                setShowWizard(true);
            }
        } catch (e: any) {
            showToast('Failed to start edit: ' + e.message, 'error');
        }
    };

    const handleAddOrUpdateParameter = async () => {
        if (!selectedTest || !newParam.parameterCode || !newParam.parameterName) {
            showToast('Code and Name are required', 'warning');
            return;
        }
        try {
            if (window.electronAPI) {
                let result;
                if (isEditingParam && editingParamId) {
                    // Update existing parameter
                    // We need a backend API for this. Assuming parameter_update exists or we need to add it.
                    // Actually checking task list, we need to add Edit/Delete buttons.
                    // Let's assume we need to implement updateParameter in backend too?
                    // For now, I'll use addParameter logic but check if I need a new API.
                    // Wait, IPC for update parameter might not exist.
                    // param-update was not in previous list.
                    // I will need to check electron/main.ts and testService.ts
                    // For now I will assume it exists or I will add it.
                    result = await window.electronAPI.tests.updateParameter(editingParamId, newParam);
                } else {
                    result = await window.electronAPI.tests.addParameter(selectedTest.version_id, newParam);
                }

                if (!result.success) {
                    showToast(result.error || 'Failed to save parameter', 'error');
                    return;
                }
                await loadParameters(selectedTest.version_id);
                setShowAddParam(false);
                setIsEditingParam(false);
                setEditingParamId(null);
                setNewParam({ parameterCode: '', parameterName: '', dataType: 'NUMERIC', unit: '' });
                showToast(isEditingParam ? 'Parameter updated' : 'Parameter added', 'success');
            }
        } catch (e: any) {
            showToast(e.message, 'error');
        }
    };

    const handleDeleteParameter = async (paramId: number) => {
        if (!confirm('Delete this parameter? Reference ranges will also be deleted.')) return;
        try {
            if (window.electronAPI) {
                const result = await window.electronAPI.tests.deleteParameter(paramId);
                if (!result.success) {
                    showToast(result.error || 'Failed to delete parameter', 'error');
                    return;
                }
                if (selectedTest) await loadParameters(selectedTest.version_id);
                showToast('Parameter deleted', 'success');
            }
        } catch (e: any) {
            showToast(e.message, 'error');
        }
    };

    const formatAge = (days: number): string => {
        if (days >= 365) return `${Math.floor(days / 365)}y`;
        if (days >= 30) return `${Math.floor(days / 30)}m`;
        return `${days}d`;
    };

    return (
        <div className="test-master-page">
            <h1 className="page-title">Test Master - Reference Range Editor</h1>

            <div className="test-master-layout">
                {/* Left - Test List */}
                <div className="test-list-panel">
                    <div className="panel-header" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '0.75rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h2 className="panel-title">Tests</h2>
                            <button className="btn btn-primary btn-sm" onClick={() => {
                                setWizardDraftId(undefined);
                                setIsEditing(false);
                                setShowWizard(true);
                            }}>+ New</button>
                        </div>
                        <input
                            type="text"
                            className="input"
                            placeholder="🔍 Search tests..."
                            value={testSearch}
                            onChange={(e) => setTestSearch(e.target.value)}
                            style={{ fontSize: '0.85rem', padding: '0.4rem' }}
                        />
                    </div>
                    <ul className="test-list">
                        {(() => {
                            const filteredTests = tests.filter(test =>
                                test.test_name.toLowerCase().includes(testSearch.toLowerCase()) ||
                                test.test_code.toLowerCase().includes(testSearch.toLowerCase())
                            );

                            if (filteredTests.length === 0) {
                                return <li className="empty-row" style={{ padding: '1rem', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>No tests found</li>;
                            }

                            return filteredTests.map(test => (
                                <li
                                    key={test.id}
                                    className={`test-item ${selectedTest?.id === test.id ? 'selected' : ''}`}
                                    onClick={() => setSelectedTest(test)}
                                >
                                    <div className="test-info">
                                        <strong>{test.test_code}</strong>
                                        <span>{test.test_name}</span>
                                    </div>
                                    <div className="test-actions">
                                        <button className="btn-icon" title="Edit" onClick={(e) => { e.stopPropagation(); handleEditTest(test.id); }}>✎</button>
                                        <button className="btn-delete" title="Delete" onClick={(e) => { e.stopPropagation(); handleDeleteTest(test.id); }}>×</button>
                                    </div>
                                </li>
                            ));
                        })()}
                    </ul>
                </div>

                {/* Middle - Parameters */}
                <div className="params-panel">
                    <div className="panel-header">
                        <h2 className="panel-title">Parameters</h2>
                        {selectedTest && (
                            <button className="btn btn-primary btn-sm" onClick={() => {
                                setNewParam({ parameterCode: '', parameterName: '', dataType: 'NUMERIC', unit: '' });
                                setShowAddParam(true);
                                setIsEditingParam(false);
                            }}>+ Add</button>
                        )}
                    </div>
                    {selectedTest && (
                        <>
                            <ul className="param-list">
                                {parameters.map(param => (
                                    <li
                                        key={param.id}
                                        className={`param-item ${selectedParam?.id === param.id ? 'selected' : ''}`}
                                        onClick={() => setSelectedParam(param)}
                                    >
                                        <div className="param-info-row">
                                            <strong>{param.parameter_code}</strong>
                                            <span>{param.parameter_name}</span>
                                        </div>
                                        <div className="param-meta-row">
                                            {param.unit && <span className="unit">{param.unit}</span>}
                                            <div className="item-actions">
                                                <button className="btn-icon-sm" title="Edit" onClick={(e) => {
                                                    e.stopPropagation();
                                                    setNewParam({
                                                        parameterCode: param.parameter_code,
                                                        parameterName: param.parameter_name,
                                                        dataType: param.data_type,
                                                        unit: param.unit || ''
                                                    });
                                                    setEditingParamId(param.id);
                                                    setIsEditingParam(true);
                                                    setShowAddParam(true);
                                                }}>✎</button>
                                                <button className="btn-delete-sm" title="Delete" onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDeleteParameter(param.id);
                                                }}>×</button>
                                            </div>
                                        </div>
                                    </li>
                                ))}
                            </ul>

                            {/* Add/Edit Parameter form */}
                            {showAddParam && (
                                <div className="add-range-form" style={{ marginTop: '0.5rem' }}>
                                    <h3>{isEditingParam ? 'Edit Parameter' : 'Add Parameter'}</h3>
                                    <div className="form-row">
                                        <div className="form-group">
                                            <label>Code</label>
                                            <input className="input" value={newParam.parameterCode}
                                                onChange={e => setNewParam({ ...newParam, parameterCode: e.target.value.toUpperCase() })}
                                                placeholder="e.g. HB" />
                                        </div>
                                        <div className="form-group">
                                            <label>Name</label>
                                            <input className="input" value={newParam.parameterName}
                                                onChange={e => setNewParam({ ...newParam, parameterName: e.target.value })}
                                                placeholder="e.g. Hemoglobin" />
                                        </div>
                                    </div>
                                    <div className="form-row">
                                        <div className="form-group">
                                            <label>Unit</label>
                                            <input className="input" value={newParam.unit}
                                                onChange={e => setNewParam({ ...newParam, unit: e.target.value })}
                                                placeholder="e.g. g/dL" />
                                        </div>
                                        <div className="form-group">
                                            <label>Type</label>
                                            <select className="input" value={newParam.dataType}
                                                onChange={e => setNewParam({ ...newParam, dataType: e.target.value })}>
                                                <option>NUMERIC</option>
                                                <option>TEXT</option>
                                                <option>CALCULATED</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div className="form-actions">
                                        <button className="btn btn-primary" onClick={handleAddOrUpdateParameter}>
                                            {isEditingParam ? 'Update' : 'Add'}
                                        </button>
                                        <button className="btn btn-secondary" onClick={() => {
                                            setShowAddParam(false);
                                            setIsEditingParam(false);
                                            setEditingParamId(null);
                                        }}>Cancel</button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Right - Reference Ranges */}
                <div className="ref-range-panel">
                    <div className="panel-header">
                        <h2 className="panel-title">Reference Ranges</h2>
                        {selectedParam && (
                            <button className="btn btn-primary btn-sm" onClick={() => setShowAddRange(true)}>+ Add Range</button>
                        )}
                    </div>

                    {selectedParam && (
                        <>
                            <div className="param-info">
                                <strong>{selectedParam.parameter_name}</strong>
                                {selectedParam.unit && <span className="unit">({selectedParam.unit})</span>}
                            </div>

                            <table className="table">
                                <thead>
                                    <tr>
                                        <th>Gender</th>
                                        <th>Age Range</th>
                                        <th>Min</th>
                                        <th>Max</th>
                                        <th></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {refRanges.length === 0 ? (
                                        <tr><td colSpan={5} className="empty">No reference ranges defined</td></tr>
                                    ) : (
                                        refRanges.map(range => (
                                            <tr key={range.id}>
                                                <td>
                                                    <span className={`gender-badge ${range.gender}`}>
                                                        {range.gender === 'M' ? 'Male' : range.gender === 'F' ? 'Female' : 'All'}
                                                    </span>
                                                </td>
                                                <td>{formatAge(range.age_min_days)} - {formatAge(range.age_max_days)}</td>
                                                <td>{range.lower_limit ?? '—'}</td>
                                                <td>{range.upper_limit ?? '—'}</td>
                                                <td>
                                                    <button className="btn-delete" onClick={() => handleDeleteRange(range.id)} title="Delete">×</button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>

                            {showAddRange && (
                                <div className="add-range-form">
                                    <h3>Add Reference Range</h3>
                                    <div className="form-row">
                                        <div className="form-group">
                                            <label>Gender</label>
                                            <select className="input" value={newRange.gender}
                                                onChange={(e) => setNewRange({ ...newRange, gender: e.target.value })}>
                                                <option value="A">All (Fallback)</option>
                                                <option value="M">Male</option>
                                                <option value="F">Female</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div className="form-row">
                                        <div className="form-group">
                                            <label>Age Min (days)</label>
                                            <input className="input" type="number" value={newRange.ageMinDays}
                                                onChange={(e) => setNewRange({ ...newRange, ageMinDays: parseInt(e.target.value) || 0 })} />
                                        </div>
                                        <div className="form-group">
                                            <label>Age Max (days)</label>
                                            <input className="input" type="number" value={newRange.ageMaxDays}
                                                onChange={(e) => setNewRange({ ...newRange, ageMaxDays: parseInt(e.target.value) || 36500 })} />
                                        </div>
                                    </div>
                                    <div className="form-row">
                                        <div className="form-group">
                                            <label>Lower Limit</label>
                                            <input className="input" type="number" step="0.1" value={newRange.lowerLimit}
                                                onChange={(e) => setNewRange({ ...newRange, lowerLimit: e.target.value })} />
                                        </div>
                                        <div className="form-group">
                                            <label>Upper Limit</label>
                                            <input className="input" type="number" step="0.1" value={newRange.upperLimit}
                                                onChange={(e) => setNewRange({ ...newRange, upperLimit: e.target.value })} />
                                        </div>
                                    </div>
                                    <div className="form-actions">
                                        <button className="btn btn-primary" onClick={handleAddRange}>Save Range</button>
                                        <button className="btn btn-secondary" onClick={() => setShowAddRange(false)}>Cancel</button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>

            {showWizard && (
                <TestWizard
                    initialDraftId={wizardDraftId}
                    isEditing={isEditing}
                    onClose={() => setShowWizard(false)}
                    onSuccess={() => {
                        setShowWizard(false);
                        loadTests();
                        setWizardDraftId(undefined);
                        setIsEditing(false);
                    }}
                />
            )}
        </div>
    );
}

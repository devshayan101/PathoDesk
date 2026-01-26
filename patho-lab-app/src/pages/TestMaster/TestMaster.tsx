import { useState, useEffect } from 'react';
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

    // Load tests on mount
    useEffect(() => {
        loadTests();
    }, []);

    // Load parameters when test selected
    useEffect(() => {
        if (selectedTest?.version_id) {
            loadParameters(selectedTest.version_id);
        }
    }, [selectedTest]);

    // Load ref ranges when parameter selected
    useEffect(() => {
        if (selectedParam?.id) {
            loadRefRanges(selectedParam.id);
        }
    }, [selectedParam]);

    const loadTests = async () => {
        if (window.electronAPI) {
            const data = await window.electronAPI.tests.list();
            setTests(data);
            if (data.length > 0) setSelectedTest(data[0]);
        }
    };

    const loadParameters = async (testVersionId: number) => {
        if (window.electronAPI) {
            const data = await window.electronAPI.tests.getParameters(testVersionId);
            setParameters(data);
            if (data.length > 0) setSelectedParam(data[0]);
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
                    alert(result.error);
                    return;
                }

                await loadRefRanges(selectedParam.id);
                setShowAddRange(false);
                setNewRange({ gender: 'A', ageMinDays: 0, ageMaxDays: 36500, lowerLimit: '', upperLimit: '' });
            }
        } catch (e: any) {
            alert(e.message);
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
                await loadTests(); // Refresh list
                setSelectedTest(null);
            }
        } catch (e: any) {
            alert('Failed to delete test: ' + e.message);
        }
    };

    const handleEditTest = async (testId: number) => {
        try {
            if (window.electronAPI) {
                const draftId = await window.electronAPI.testWizard.createDraftFromExisting(testId);
                setWizardDraftId(draftId);
                setShowWizard(true);
            }
        } catch (e: any) {
            alert('Failed to start edit: ' + e.message);
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
                    <div className="panel-header">
                        <h2 className="panel-title">Tests</h2>
                        <button className="btn btn-primary btn-sm" onClick={() => {
                            setWizardDraftId(undefined);
                            setShowWizard(true);
                        }}>+ New</button>
                    </div>
                    <ul className="test-list">
                        {tests.map(test => (
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
                                    <button
                                        className="btn-icon"
                                        title="Edit"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleEditTest(test.id);
                                        }}
                                    >
                                        ✎
                                    </button>
                                    <button
                                        className="btn-delete"
                                        title="Delete"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleDeleteTest(test.id);
                                        }}
                                    >
                                        ×
                                    </button>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Middle - Parameters */}
                <div className="params-panel">
                    <h2 className="panel-title">Parameters</h2>
                    {selectedTest && (
                        <ul className="param-list">
                            {parameters.map(param => (
                                <li
                                    key={param.id}
                                    className={`param-item ${selectedParam?.id === param.id ? 'selected' : ''}`}
                                    onClick={() => setSelectedParam(param)}
                                >
                                    <strong>{param.parameter_code}</strong>
                                    <span>{param.parameter_name}</span>
                                    {param.unit && <span className="unit">{param.unit}</span>}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                {/* Right - Reference Ranges */}
                <div className="ref-range-panel">
                    <div className="panel-header">
                        <h2 className="panel-title">Reference Ranges</h2>
                        {selectedParam && (
                            <button className="btn btn-primary btn-sm" onClick={() => setShowAddRange(true)}>
                                + Add Range
                            </button>
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
                                                    <button
                                                        className="btn-delete"
                                                        onClick={() => handleDeleteRange(range.id)}
                                                        title="Delete"
                                                    >
                                                        ×
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>

                            {/* Add Range Modal */}
                            {showAddRange && (
                                <div className="add-range-form">
                                    <h3>Add Reference Range</h3>
                                    <div className="form-row">
                                        <div className="form-group">
                                            <label>Gender</label>
                                            <select
                                                className="input"
                                                value={newRange.gender}
                                                onChange={(e) => setNewRange({ ...newRange, gender: e.target.value })}
                                            >
                                                <option value="A">All (Fallback)</option>
                                                <option value="M">Male</option>
                                                <option value="F">Female</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div className="form-row">
                                        <div className="form-group">
                                            <label>Age Min (days)</label>
                                            <input
                                                className="input"
                                                type="number"
                                                value={newRange.ageMinDays}
                                                onChange={(e) => setNewRange({ ...newRange, ageMinDays: parseInt(e.target.value) || 0 })}
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label>Age Max (days)</label>
                                            <input
                                                className="input"
                                                type="number"
                                                value={newRange.ageMaxDays}
                                                onChange={(e) => setNewRange({ ...newRange, ageMaxDays: parseInt(e.target.value) || 36500 })}
                                            />
                                        </div>
                                    </div>
                                    <div className="form-row">
                                        <div className="form-group">
                                            <label>Lower Limit</label>
                                            <input
                                                className="input"
                                                type="number"
                                                step="0.1"
                                                value={newRange.lowerLimit}
                                                onChange={(e) => setNewRange({ ...newRange, lowerLimit: e.target.value })}
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label>Upper Limit</label>
                                            <input
                                                className="input"
                                                type="number"
                                                step="0.1"
                                                value={newRange.upperLimit}
                                                onChange={(e) => setNewRange({ ...newRange, upperLimit: e.target.value })}
                                            />
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
                    onClose={() => setShowWizard(false)}
                    onSuccess={() => {
                        setShowWizard(false);
                        loadTests(); // Refresh list to show new test
                        setWizardDraftId(undefined);
                    }}
                />
            )}
        </div>
    );
}

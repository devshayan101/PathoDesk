import { useState, useEffect, useRef } from 'react';
import { useToastStore } from '../../stores/toastStore';
import * as XLSX from 'xlsx';
import './TestMaster.css';
import TestWizard from './TestWizard';
import AgeInput from '../../components/AgeInput/AgeInput';
import ConfirmDialog from '../../components/ConfirmDialog/ConfirmDialog';

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
    const [selectedTestIds, setSelectedTestIds] = useState<Set<number>>(new Set());
    const [parameters, setParameters] = useState<Parameter[]>([]);
    const [selectedParam, setSelectedParam] = useState<Parameter | null>(null);
    const [refRanges, setRefRanges] = useState<RefRange[]>([]);
    const [showAddRange, setShowAddRange] = useState(false);
    const [editingRangeId, setEditingRangeId] = useState<number | null>(null);
    const [newRange, setNewRange] = useState({
        gender: 'A', ageMinDays: 0, ageMaxDays: 36500, lowerLimit: '', upperLimit: '', displayText: ''
    });
    const [showWizard, setShowWizard] = useState(false);
    const [wizardDraftId, setWizardDraftId] = useState<number | undefined>(undefined);
    const [isEditing, setIsEditing] = useState(false);

    // Bulk Import state
    const [showImportModal, setShowImportModal] = useState(false);
    const [importPreview, setImportPreview] = useState<any[]>([]);
    const [importing, setImporting] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Add/Edit Parameter form
    const [showAddParam, setShowAddParam] = useState(false);
    const [isEditingParam, setIsEditingParam] = useState(false);
    const [editingParamId, setEditingParamId] = useState<number | null>(null);
    const [newParam, setNewParam] = useState({
        parameterCode: '', parameterName: '', dataType: 'NUMERIC', unit: '', formula: ''
    });

    // Confirm dialog state
    const [confirmDialog, setConfirmDialog] = useState<{
        title: string; message: string; confirmLabel: string;
        variant: 'danger' | 'warning' | 'default'; onConfirm: () => void;
    } | null>(null);

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

    const resetRangeForm = () => {
        setShowAddRange(false);
        setEditingRangeId(null);
        setNewRange({ gender: 'A', ageMinDays: 0, ageMaxDays: 36500, lowerLimit: '', upperLimit: '', displayText: '' });
    };

    const handleAddOrUpdateRange = async () => {
        if (!selectedParam) return;
        try {
            if (window.electronAPI) {
                const isText = selectedParam.data_type === 'TEXT';
                if (editingRangeId) {
                    // Update existing
                    const result = await window.electronAPI.refRanges.update(editingRangeId, {
                        lowerLimit: isText ? undefined : (parseFloat(newRange.lowerLimit) || undefined),
                        upperLimit: isText ? undefined : (parseFloat(newRange.upperLimit) || undefined),
                        displayText: isText ? newRange.displayText : undefined,
                    });
                    if (!result.success) {
                        showToast('Failed to update range', 'error');
                        return;
                    }
                } else {
                    // Create new
                    const result = await window.electronAPI.refRanges.create({
                        parameterId: selectedParam.id,
                        gender: newRange.gender,
                        ageMinDays: newRange.ageMinDays,
                        ageMaxDays: newRange.ageMaxDays,
                        lowerLimit: isText ? undefined : (parseFloat(newRange.lowerLimit) || undefined),
                        upperLimit: isText ? undefined : (parseFloat(newRange.upperLimit) || undefined),
                        displayText: isText ? newRange.displayText : undefined,
                    });
                    if (!result.success) {
                        showToast(result.error || 'Failed to add range', 'error');
                        return;
                    }
                }
                await loadRefRanges(selectedParam.id);
                resetRangeForm();
            }
        } catch (e: any) {
            showToast(e.message, 'error');
        }
    };

    const handleEditRange = (range: RefRange) => {
        setEditingRangeId(range.id);
        setNewRange({
            gender: range.gender,
            ageMinDays: range.age_min_days,
            ageMaxDays: range.age_max_days,
            lowerLimit: range.lower_limit?.toString() ?? '',
            upperLimit: range.upper_limit?.toString() ?? '',
            displayText: range.display_text ?? '',
        });
        setShowAddRange(true);
    };

    const handleDeleteRange = async (id: number) => {
        if (!selectedParam) return;
        if (window.electronAPI) {
            await window.electronAPI.refRanges.delete(id);
            await loadRefRanges(selectedParam.id);
        }
    };

    const handleDeleteTest = (testId: number) => {
        setConfirmDialog({
            title: 'Delete Test',
            message: 'Are you sure you want to delete this test? This action cannot be undone.',
            confirmLabel: 'Delete',
            variant: 'danger',
            onConfirm: async () => {
                setConfirmDialog(null);
                try {
                    if (window.electronAPI) {
                        await window.electronAPI.tests.delete(testId);
                        await loadTests();
                        setSelectedTest(null);
                        setSelectedTestIds(prev => { const next = new Set(prev); next.delete(testId); return next; });
                        showToast('Test deleted successfully', 'success');
                        setTimeout(() => window.focus(), 100);
                    }
                } catch (e: any) {
                    showToast('Failed to delete test: ' + e.message, 'error');
                }
            }
        });
    };

    const handleBulkDelete = () => {
        if (selectedTestIds.size === 0) return;
        setConfirmDialog({
            title: 'Delete Selected Tests',
            message: `Are you sure you want to delete ${selectedTestIds.size} tests? This action cannot be undone.`,
            confirmLabel: 'Delete All',
            variant: 'danger',
            onConfirm: async () => {
                setConfirmDialog(null);
                try {
                    if (window.electronAPI) {
                        await window.electronAPI.tests.bulkDelete(Array.from(selectedTestIds));
                        await loadTests();
                        setSelectedTest(null);
                        setSelectedTestIds(new Set());
                        showToast(`${selectedTestIds.size} tests deleted successfully`, 'success');
                        setTimeout(() => window.focus(), 100);
                    }
                } catch (e: any) {
                    showToast('Failed to delete tests: ' + e.message, 'error');
                }
            }
        });
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
                setNewParam({ parameterCode: '', parameterName: '', dataType: 'NUMERIC', unit: '', formula: '' });
                showToast(isEditingParam ? 'Parameter updated' : 'Parameter added', 'success');
            }
        } catch (e: any) {
            showToast(e.message, 'error');
        }
    };

    const handleDeleteParameter = (paramId: number) => {
        setConfirmDialog({
            title: 'Delete Parameter',
            message: 'Delete this parameter? Reference ranges will also be deleted.',
            confirmLabel: 'Delete',
            variant: 'danger',
            onConfirm: async () => {
                setConfirmDialog(null);
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
            }
        });
    };

    const formatAge = (days: number): string => {
        if (days >= 365) return `${Math.floor(days / 365)}y`;
        if (days >= 30) return `${Math.floor(days / 30)}m`;
        return `${days}d`;
    };

    // Handle Excel file import
    const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (evt) => {
            try {
                const data = new Uint8Array(evt.target?.result as ArrayBuffer);
                const workbook = XLSX.read(data, { type: 'array' });
                const sheet = workbook.Sheets[workbook.SheetNames[0]];
                const rows = XLSX.utils.sheet_to_json<any>(sheet, { defval: '' });

                if (rows.length === 0) {
                    showToast('No data found in Excel file', 'warning');
                    return;
                }

                // Map columns (flexible matching)
                const mapped = rows.map((row: any) => {
                    const keys = Object.keys(row);
                    const find = (patterns: string[]) => {
                        const key = keys.find(k => patterns.some(p => k.toLowerCase().includes(p)));
                        return key ? row[key] : '';
                    };
                    return {
                        category: find(['category', 'department', 'dept']),
                        testCode: String(find(['test code', 'test_code', 'code'])).trim().toUpperCase(),
                        testName: find(['test name', 'test_name', 'testname', 'test']),
                        parameter: find(['parameter', 'param', 'analyte']),
                        referenceRange: String(find(['reference', 'ref range', 'range', 'normal'])),
                        unit: find(['unit']),
                        price: parseFloat(find(['price', 'cost', 'rate', 'mrp'])) || 0,
                        sampleType: find(['sample', 'specimen', 'sample type', 'sample_type']),
                    };
                }).filter((r: any) => r.testName && r.parameter);

                if (mapped.length === 0) {
                    showToast('Could not find required columns (Test Name, Parameter)', 'error');
                    return;
                }

                setImportPreview(mapped);
                setShowImportModal(true);
            } catch (err: any) {
                showToast('Failed to parse Excel: ' + err.message, 'error');
            }
        };
        reader.readAsArrayBuffer(file);
        // Reset file input so same file can be re-selected
        e.target.value = '';
    };

    const handleConfirmImport = async () => {
        if (!window.electronAPI || importPreview.length === 0) return;
        setImporting(true);
        try {
            const result = await window.electronAPI.tests.bulkImport(importPreview);
            const msgs = [];
            if (result.created > 0) msgs.push(`${result.created} tests created`);
            if (result.skipped > 0) msgs.push(`${result.skipped} skipped (already exist)`);
            if (result.errors.length > 0) msgs.push(`${result.errors.length} errors`);
            if (result.skipped > 0 && result.skippedNames && result.skippedNames.length > 0) {
                setConfirmDialog({
                    title: 'Import Partial Success',
                    message: `${result.created} tests created. \n\n${result.skipped} tests were skipped because they already exist:\n${result.skippedNames.join(', ')}`,
                    confirmLabel: 'OK',
                    variant: 'default',
                    onConfirm: () => setConfirmDialog(null)
                });
            } else {
                showToast(msgs.join(', '), result.errors.length > 0 ? 'warning' : 'success');
            }
            if (result.errors.length > 0) {
                console.warn('Import errors:', result.errors);
            }
            setShowImportModal(false);
            setImportPreview([]);
            loadTests();
        } catch (e: any) {
            showToast('Import failed: ' + e.message, 'error');
        }
        setImporting(false);
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
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                {selectedTestIds.size > 0 && (
                                    <button className="btn btn-danger btn-sm" onClick={handleBulkDelete}>🗑 Delete ({selectedTestIds.size})</button>
                                )}
                                <button className="btn btn-secondary btn-sm" onClick={() => fileInputRef.current?.click()}>📤 Import Excel</button>
                                <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleFileImport} style={{ display: 'none' }} />
                                <button className="btn btn-primary btn-sm" onClick={() => {
                                    setWizardDraftId(undefined);
                                    setIsEditing(false);
                                    setShowWizard(true);
                                }}>+ New</button>
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                            <input
                                type="checkbox"
                                checked={tests.length > 0 && selectedTestIds.size === tests.filter(t => t.test_name.toLowerCase().includes(testSearch.toLowerCase()) || t.test_code.toLowerCase().includes(testSearch.toLowerCase())).length}
                                onChange={(e) => {
                                    if (e.target.checked) {
                                        const visibleIds = tests.filter(t => t.test_name.toLowerCase().includes(testSearch.toLowerCase()) || t.test_code.toLowerCase().includes(testSearch.toLowerCase())).map(t => t.id);
                                        setSelectedTestIds(new Set(visibleIds));
                                    } else {
                                        setSelectedTestIds(new Set());
                                    }
                                }}
                                style={{ cursor: 'pointer' }}
                            />
                            <input
                                type="text"
                                className="input"
                                placeholder="🔍 Search tests..."
                                value={testSearch}
                                onChange={(e) => setTestSearch(e.target.value)}
                                style={{ fontSize: '0.85rem', padding: '0.4rem', flex: 1 }}
                            />
                        </div>
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
                                    <input
                                        type="checkbox"
                                        checked={selectedTestIds.has(test.id)}
                                        readOnly
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            const next = new Set(selectedTestIds);
                                            if (next.has(test.id)) next.delete(test.id);
                                            else next.add(test.id);
                                            setSelectedTestIds(next);
                                        }}
                                        style={{ marginRight: '0.5rem', cursor: 'pointer' }}
                                    />
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
                                setNewParam({ parameterCode: '', parameterName: '', dataType: 'NUMERIC', unit: '', formula: '' });
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
                                                        unit: param.unit || '',
                                                        formula: (param as any).formula || ''
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
                                    {newParam.dataType === 'CALCULATED' && (
                                        <div className="form-row">
                                            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                                                <label>Formula</label>
                                                <input className="input" value={newParam.formula}
                                                    onChange={e => setNewParam({ ...newParam, formula: e.target.value })}
                                                    placeholder="e.g. {ALBUMIN} / {GLOBULIN}" />
                                            </div>
                                        </div>
                                    )}
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
                            <button className="btn btn-primary btn-sm" onClick={() => {
                                resetRangeForm();
                                setShowAddRange(true);
                            }}>+ Add Range</button>
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
                                        {selectedParam.data_type === 'TEXT' ? (
                                            <th>Display Text</th>
                                        ) : (
                                            <><th>Min</th><th>Max</th></>
                                        )}
                                        <th></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {refRanges.length === 0 ? (
                                        <tr><td colSpan={selectedParam.data_type === 'TEXT' ? 4 : 5} className="empty">No reference ranges defined</td></tr>
                                    ) : (
                                        refRanges.map(range => (
                                            <tr key={range.id}>
                                                <td>
                                                    <span className={`gender-badge ${range.gender}`}>
                                                        {range.gender === 'M' ? 'Male' : range.gender === 'F' ? 'Female' : 'All'}
                                                    </span>
                                                </td>
                                                <td>{formatAge(range.age_min_days)} - {formatAge(range.age_max_days)}</td>
                                                {selectedParam.data_type === 'TEXT' ? (
                                                    <td>{range.display_text ?? '—'}</td>
                                                ) : (
                                                    <><td>{range.lower_limit ?? '—'}</td><td>{range.upper_limit ?? '—'}</td></>
                                                )}
                                                <td>
                                                    <button className="btn-icon-sm" onClick={() => handleEditRange(range)} title="Edit">✎</button>
                                                    <button className="btn-delete" onClick={() => handleDeleteRange(range.id)} title="Delete">×</button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>

                            {showAddRange && (
                                <div className="add-range-form">
                                    <h3>{editingRangeId ? 'Edit Reference Range' : 'Add Reference Range'}</h3>
                                    {!editingRangeId && (
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
                                    )}
                                    {!editingRangeId && (
                                        <div className="form-row">
                                            <div className="form-group">
                                                <label>Age Min</label>
                                                <AgeInput value={newRange.ageMinDays}
                                                    onChange={(d) => setNewRange({ ...newRange, ageMinDays: d })} />
                                            </div>
                                            <div className="form-group">
                                                <label>Age Max</label>
                                                <AgeInput value={newRange.ageMaxDays}
                                                    onChange={(d) => setNewRange({ ...newRange, ageMaxDays: d })} />
                                            </div>
                                        </div>
                                    )}
                                    {selectedParam?.data_type === 'TEXT' ? (
                                        <div className="form-row">
                                            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                                                <label>Display Text</label>
                                                <input className="input" value={newRange.displayText}
                                                    onChange={(e) => setNewRange({ ...newRange, displayText: e.target.value })}
                                                    placeholder="e.g. Non-Reactive, Negative" />
                                            </div>
                                        </div>
                                    ) : (
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
                                    )}
                                    <div className="form-actions">
                                        <button className="btn btn-primary" onClick={handleAddOrUpdateRange}>
                                            {editingRangeId ? 'Update Range' : 'Save Range'}
                                        </button>
                                        <button className="btn btn-secondary" onClick={resetRangeForm}>Cancel</button>
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

            {/* Bulk Import Preview Modal */}
            {showImportModal && (
                <div className="modal-overlay">
                    <div className="modal" style={{ maxWidth: '900px', width: '90%', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
                        <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                            <h2 style={{ margin: 0 }}>📤 Import Preview</h2>
                            <button className="btn btn-secondary btn-sm" onClick={() => { setShowImportModal(false); setImportPreview([]); }}>✕ Close</button>
                        </div>
                        <p style={{ color: 'var(--color-text-secondary)', marginBottom: '0.75rem', fontSize: '0.85rem' }}>
                            Found <strong>{importPreview.length}</strong> rows across <strong>{new Set(importPreview.map(r => r.testName)).size}</strong> unique tests
                        </p>
                        <div style={{ flex: 1, overflow: 'auto', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }}>
                            <table className="table" style={{ fontSize: '0.8rem' }}>
                                <thead>
                                    <tr>
                                        <th>Category</th>
                                        <th>Test Name</th>
                                        <th>Parameter</th>
                                        <th>Ref Range</th>
                                        <th>Unit</th>
                                        <th>Price</th>
                                        <th>Sample Type</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {importPreview.slice(0, 100).map((row, idx) => (
                                        <tr key={idx}>
                                            <td>{row.category}</td>
                                            <td><strong>{row.testName}</strong></td>
                                            <td>{row.parameter}</td>
                                            <td>{row.referenceRange}</td>
                                            <td>{row.unit}</td>
                                            <td>{row.price || '-'}</td>
                                            <td>{row.sampleType}</td>
                                        </tr>
                                    ))}
                                    {importPreview.length > 100 && (
                                        <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--color-text-muted)' }}>...and {importPreview.length - 100} more rows</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                            <button className="btn btn-secondary" onClick={() => { setShowImportModal(false); setImportPreview([]); }}>Cancel</button>
                            <button className="btn btn-primary" onClick={handleConfirmImport} disabled={importing}>
                                {importing ? 'Importing...' : `✓ Import ${new Set(importPreview.map(r => r.testName)).size} Tests`}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {confirmDialog && (
                <ConfirmDialog
                    title={confirmDialog.title}
                    message={confirmDialog.message}
                    confirmLabel={confirmDialog.confirmLabel}
                    variant={confirmDialog.variant}
                    onConfirm={confirmDialog.onConfirm}
                    onCancel={() => setConfirmDialog(null)}
                />
            )}
        </div>
    );
}

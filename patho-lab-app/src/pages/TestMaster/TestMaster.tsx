import { useState, useEffect } from 'react';
import { useToastStore } from '../../stores/toastStore';
import { parseExcelForTests, ParsedTestRow } from '../../utils/importExcel';
import { exportTestsToExcel } from '../../utils/exportExcel';
import './TestMaster.css';
import TestWizard from './TestWizard';
import ConfirmDialog from '../../components/ConfirmDialog/ConfirmDialog';

import TestListPanel from './components/TestListPanel';
import ParameterListPanel from './components/ParameterListPanel';
import ReferenceRangePanel from './components/ReferenceRangePanel';
import ImportPreviewModal from './components/ImportPreviewModal';

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
    is_header?: number;
    parent_id?: number | null;
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
    const showToast = useToastStore(s => s.showToast);

    // Tests state
    const [tests, setTests] = useState<Test[]>([]);
    const [testSearch, setTestSearch] = useState('');
    const [selectedTest, setSelectedTest] = useState<Test | null>(null);
    const [selectedTestIds, setSelectedTestIds] = useState<Set<number>>(new Set());

    // Parameters state
    const [parameters, setParameters] = useState<Parameter[]>([]);
    const [selectedParam, setSelectedParam] = useState<Parameter | null>(null);
    const [showAddParam, setShowAddParam] = useState(false);
    const [isEditingParam, setIsEditingParam] = useState(false);
    const [editingParamId, setEditingParamId] = useState<number | null>(null);
    const [newParam, setNewParam] = useState({
        parameterCode: '', parameterName: '', dataType: 'NUMERIC', unit: '', formula: '', isHeader: false, parentId: null as number | null
    });

    // Reference Ranges state
    const [refRanges, setRefRanges] = useState<RefRange[]>([]);
    const [showAddRange, setShowAddRange] = useState(false);
    const [editingRangeId, setEditingRangeId] = useState<number | null>(null);
    const [newRange, setNewRange] = useState({
        gender: 'A', ageMinDays: 0, ageMaxDays: 36500, lowerLimit: '', upperLimit: '', displayText: ''
    });

    // Wizard state
    const [showWizard, setShowWizard] = useState(false);
    const [wizardDraftId, setWizardDraftId] = useState<number | undefined>(undefined);
    const [isEditing, setIsEditing] = useState(false);

    // Import state
    const [showImportModal, setShowImportModal] = useState(false);
    const [importPreview, setImportPreview] = useState<ParsedTestRow[]>([]);
    const [importing, setImporting] = useState(false);

    // Confirm dialog state
    const [confirmDialog, setConfirmDialog] = useState<{
        title: string; message: string; confirmLabel: string;
        variant: 'danger' | 'warning' | 'default'; onConfirm: () => void;
    } | null>(null);

    // Loaders
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

    // --- Action Handlers: Tests ---
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
            message: `Are you sure you want to delete ${selectedTestIds.size} tests ? This action cannot be undone.`,
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

    const handleToggleSelectTest = (testId: number) => {
        setSelectedTestIds(prev => {
            const next = new Set(prev);
            if (next.has(testId)) next.delete(testId);
            else next.add(testId);
            return next;
        });
    };

    const handleToggleSelectAll = (visibleTestIds: number[], checked: boolean) => {
        if (checked) {
            setSelectedTestIds(new Set(visibleTestIds));
        } else {
            setSelectedTestIds(new Set());
        }
    };

    const handleImportClick = async (file: File) => {
        try {
            const previewData = await parseExcelForTests(file);
            setImportPreview(previewData);
            setShowImportModal(true);
        } catch (err: any) {
            showToast(err.message || 'Failed to parse Excel', 'error');
        }
    };

    const handleConfirmImport = async () => {
        if (!window.electronAPI || importPreview.length === 0) return;
        setImporting(true);
        try {
            const result = await window.electronAPI.tests.bulkImport(importPreview);
            const msgs = [];
            if (result.created > 0) msgs.push(`${result.created} tests created`);
            if (result.skipped > 0) msgs.push(`${result.skipped} skipped(already exist)`);
            if (result.errors.length > 0) msgs.push(`${result.errors.length} errors`);
            if (result.skipped > 0 && result.skippedNames && result.skippedNames.length > 0) {
                setConfirmDialog({
                    title: 'Import Partial Success',
                    message: `${result.created} tests created.\n\n${result.skipped} tests were skipped because they already exist: \n${result.skippedNames.join(', ')} `,
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

    const handleExportClick = async () => {
        try {
            if (window.electronAPI) {
                const data = await window.electronAPI.tests.export();
                exportTestsToExcel(data);
                showToast('Tests exported successfully', 'success');
            }
        } catch (e: any) {
            showToast('Failed to export tests: ' + e.message, 'error');
        }
    };

    // --- Action Handlers: Parameters ---
    const handleSaveParameter = async () => {
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
                setNewParam({ parameterCode: '', parameterName: '', dataType: 'NUMERIC', unit: '', formula: '', isHeader: false, parentId: null });
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

    const handleShowAddParamForm = () => {
        setNewParam({ parameterCode: '', parameterName: '', dataType: 'NUMERIC', unit: '', formula: '', isHeader: false, parentId: null });
        setShowAddParam(true);
        setIsEditingParam(false);
    };

    const handleEditParamClick = (param: Parameter) => {
        setNewParam({
            parameterCode: param.parameter_code,
            parameterName: param.parameter_name,
            dataType: param.data_type,
            unit: param.unit || '',
            formula: (param as any).formula || '',
            isHeader: param.is_header === 1,
            parentId: param.parent_id || null
        });
        setEditingParamId(param.id);
        setIsEditingParam(true);
        setShowAddParam(true);
    };

    const handleCancelParamForm = () => {
        setShowAddParam(false);
        setIsEditingParam(false);
        setEditingParamId(null);
    };

    // --- Action Handlers: Reference Ranges ---
    const resetRangeForm = () => {
        setShowAddRange(false);
        setEditingRangeId(null);
        setNewRange({ gender: 'A', ageMinDays: 0, ageMaxDays: 36500, lowerLimit: '', upperLimit: '', displayText: '' });
    };

    const handleSaveRange = async () => {
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

    const handleEditRangeClick = (range: RefRange) => {
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

    return (
        <div className="test-master-page">
            <h1 className="page-title">Test Master - Reference Range Editor</h1>

            <div className="test-master-layout">
                {/* Left - Test List Panel */}
                <TestListPanel
                    tests={tests}
                    selectedTest={selectedTest}
                    selectedTestIds={selectedTestIds}
                    testSearch={testSearch}
                    onSearchChange={setTestSearch}
                    onSelectTest={setSelectedTest}
                    onToggleSelectTest={handleToggleSelectTest}
                    onToggleSelectAll={handleToggleSelectAll}
                    onImportClick={handleImportClick}
                    onExportClick={handleExportClick}
                    onNewClick={() => {
                        setWizardDraftId(undefined);
                        setIsEditing(false);
                        setShowWizard(true);
                    }}
                    onBulkDeleteClick={handleBulkDelete}
                    onEditTestClick={handleEditTest}
                    onDeleteTestClick={handleDeleteTest}
                />

                {/* Middle - Parameters Panel */}
                <ParameterListPanel
                    selectedTest={selectedTest}
                    parameters={parameters}
                    selectedParam={selectedParam}
                    onSelectParam={setSelectedParam}
                    showAddParam={showAddParam}
                    isEditingParam={isEditingParam}
                    newParam={newParam}
                    setNewParam={setNewParam}
                    onShowAddForm={handleShowAddParamForm}
                    onEditParamClick={handleEditParamClick}
                    onDeleteParamClick={handleDeleteParameter}
                    onSaveParam={handleSaveParameter}
                    onCancelForm={handleCancelParamForm}
                />

                {/* Right - Reference Ranges Panel */}
                <ReferenceRangePanel
                    selectedParam={selectedParam}
                    refRanges={refRanges}
                    showAddRange={showAddRange}
                    editingRangeId={editingRangeId}
                    newRange={newRange}
                    setNewRange={setNewRange}
                    onShowAddForm={() => {
                        resetRangeForm();
                        setShowAddRange(true);
                    }}
                    onEditRangeClick={handleEditRangeClick}
                    onDeleteRangeClick={handleDeleteRange}
                    onSaveRange={handleSaveRange}
                    onCancelForm={resetRangeForm}
                />
            </div>

            {/* Test Creation Wizard */}
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
            <ImportPreviewModal
                show={showImportModal}
                importPreview={importPreview}
                importing={importing}
                onConfirm={handleConfirmImport}
                onCancel={() => {
                    setShowImportModal(false);
                    setImportPreview([]);
                }}
            />

            {/* Global Confirm Dialog */}
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

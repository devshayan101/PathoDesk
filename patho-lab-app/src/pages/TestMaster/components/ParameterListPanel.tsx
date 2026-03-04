import { useToastStore } from '../../../stores/toastStore';

interface Test {
    id: number;
    test_code: string;
    test_name: string;
    version_id: number;
}

interface Parameter {
    id: number;
    parameter_code: string;
    parameter_name: string;
    data_type: string;
    unit: string | null;
    display_order?: number;
    is_header?: number;
    parent_id?: number | null;
}

interface ParameterFormState {
    parameterCode: string;
    parameterName: string;
    dataType: string;
    unit: string;
    formula: string;
    isHeader: boolean;
    parentId: number | null;
}

interface ParameterListPanelProps {
    selectedTest: Test | null;
    parameters: Parameter[];
    selectedParam: Parameter | null;
    onSelectParam: (param: Parameter) => void;

    // Form state
    showAddParam: boolean;
    isEditingParam: boolean;
    newParam: ParameterFormState;
    setNewParam: (val: ParameterFormState) => void;

    // Actions
    onShowAddForm: () => void;
    onEditParamClick: (param: Parameter) => void;
    onDeleteParamClick: (paramId: number) => void;
    onSaveParam: () => void;
    onCancelForm: () => void;
    onReloadParams?: () => void; // Add reload prop
}

export default function ParameterListPanel({
    selectedTest, parameters, selectedParam, onSelectParam,
    showAddParam, isEditingParam, newParam, setNewParam,
    onShowAddForm, onEditParamClick, onDeleteParamClick,
    onSaveParam, onCancelForm, onReloadParams
}: ParameterListPanelProps) {
    const showToast = useToastStore(s => s.showToast);

    const handleMoveUp = async (e: React.MouseEvent, index: number) => {
        e.stopPropagation();
        if (index === 0) return;

        const currentParam = parameters[index];
        const prevParam = parameters[index - 1];

        try {
            if (window.electronAPI) {
                // Swap display_order
                await window.electronAPI.tests.updateParameterOrder(
                    currentParam.id,
                    prevParam.display_order || index,
                    prevParam.id,
                    currentParam.display_order || (index + 1)
                );
                if (onReloadParams) onReloadParams();
            }
        } catch (err: any) {
            showToast('Failed to reorder: ' + err.message, 'error');
        }
    };

    const handleMoveDown = async (e: React.MouseEvent, index: number) => {
        e.stopPropagation();
        if (index === parameters.length - 1) return;

        const currentParam = parameters[index];
        const nextParam = parameters[index + 1];

        try {
            if (window.electronAPI) {
                // Swap display_order
                await window.electronAPI.tests.updateParameterOrder(
                    currentParam.id,
                    nextParam.display_order || (index + 2),
                    nextParam.id,
                    currentParam.display_order || (index + 1)
                );
                if (onReloadParams) onReloadParams();
            }
        } catch (err: any) {
            showToast('Failed to reorder: ' + err.message, 'error');
        }
    };

    const headerParams = parameters.filter(p => p.is_header === 1);

    return (
        <div className="params-panel">
            <div className="panel-header">
                <h2 className="panel-title">Parameters</h2>
                {selectedTest && (
                    <button className="btn btn-primary btn-sm" onClick={onShowAddForm}>
                        + Add
                    </button>
                )}
            </div>
            {selectedTest && (
                <>
                    <ul className="param-list">
                        {parameters.map((param, index) => (
                            <li
                                key={param.id}
                                className={`param-item ${selectedParam?.id === param.id ? 'selected' : ''}`}
                                onClick={() => onSelectParam(param)}
                            >
                                <div className="param-info-row" style={{ paddingLeft: param.parent_id ? '1.5rem' : '0' }}>
                                    {param.parent_id && <span style={{ color: 'var(--color-text-muted)', marginRight: '4px' }}>↳</span>}
                                    <strong>{param.parameter_code}</strong>
                                    <span>{param.parameter_name}</span>
                                </div>
                                <div className="param-meta-row" style={{ paddingLeft: param.parent_id ? '1.5rem' : '0' }}>
                                    {param.unit && <span className="unit">{param.unit}</span>}
                                    {param.is_header === 1 && <span className="badge badge-info" style={{ fontSize: '0.7rem', padding: '0.1rem 0.3rem', marginLeft: '0.5rem' }}>Header</span>}
                                    {param.parent_id && <span className="badge badge-secondary" style={{ fontSize: '0.7rem', padding: '0.1rem 0.3rem', marginLeft: '0.5rem' }}>Grouped</span>}
                                    <div className="item-actions">
                                        <button className="btn-icon-sm" title="Move Up" onClick={(e) => handleMoveUp(e, index)} disabled={index === 0}>↑</button>
                                        <button className="btn-icon-sm" title="Move Down" onClick={(e) => handleMoveDown(e, index)} disabled={index === parameters.length - 1}>↓</button>
                                        <button className="btn-icon-sm" title="Edit" onClick={(e) => {
                                            e.stopPropagation();
                                            onEditParamClick(param);
                                        }}>✎</button>
                                        <button className="btn-delete-sm" title="Delete" onClick={(e) => {
                                            e.stopPropagation();
                                            onDeleteParamClick(param.id);
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
                            <div className="form-row">
                                <div className="form-group" style={{ flexDirection: 'row', alignItems: 'center', gap: '0.5rem', marginTop: '1rem' }}>
                                    <input type="checkbox" id="isHeader" name="isHeader" checked={newParam.isHeader} onChange={e => setNewParam({ ...newParam, isHeader: e.target.checked, parentId: e.target.checked ? null : newParam.parentId })} />
                                    <label htmlFor="isHeader" style={{ margin: 0, cursor: 'pointer' }}>Is Header (Group items under this)</label>
                                </div>
                                {!newParam.isHeader && headerParams.length > 0 && (
                                    <div className="form-group">
                                        <label>Group Under Header</label>
                                        <select className="input" value={newParam.parentId || ''}
                                            onChange={e => setNewParam({ ...newParam, parentId: e.target.value ? parseInt(e.target.value) : null })}>
                                            <option value="">-- None --</option>
                                            {headerParams.map(hp => (
                                                <option key={hp.id} value={hp.id}>{hp.parameter_name}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}
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
                                <button className="btn btn-primary" onClick={onSaveParam}>
                                    {isEditingParam ? 'Update' : 'Add'}
                                </button>
                                <button className="btn btn-secondary" onClick={onCancelForm}>Cancel</button>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

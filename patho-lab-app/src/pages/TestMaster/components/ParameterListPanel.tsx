// Types

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
}

interface ParameterFormState {
    parameterCode: string;
    parameterName: string;
    dataType: string;
    unit: string;
    formula: string;
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
}

export default function ParameterListPanel({
    selectedTest, parameters, selectedParam, onSelectParam,
    showAddParam, isEditingParam, newParam, setNewParam,
    onShowAddForm, onEditParamClick, onDeleteParamClick,
    onSaveParam, onCancelForm
}: ParameterListPanelProps) {
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
                        {parameters.map(param => (
                            <li
                                key={param.id}
                                className={`param-item ${selectedParam?.id === param.id ? 'selected' : ''}`}
                                onClick={() => onSelectParam(param)}
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

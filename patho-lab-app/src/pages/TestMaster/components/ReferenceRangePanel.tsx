import AgeInput from '../../../components/AgeInput/AgeInput';

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

interface RangeFormState {
    gender: string;
    ageMinDays: number;
    ageMaxDays: number;
    lowerLimit: string;
    upperLimit: string;
    displayText: string;
}

interface ReferenceRangePanelProps {
    selectedParam: Parameter | null;
    refRanges: RefRange[];

    // Form state
    showAddRange: boolean;
    editingRangeId: number | null;
    newRange: RangeFormState;
    setNewRange: (val: RangeFormState) => void;

    // Actions
    onShowAddForm: () => void;
    onEditRangeClick: (range: RefRange) => void;
    onDeleteRangeClick: (rangeId: number) => void;
    onSaveRange: () => void;
    onCancelForm: () => void;
}

export default function ReferenceRangePanel({
    selectedParam, refRanges,
    showAddRange, editingRangeId, newRange, setNewRange,
    onShowAddForm, onEditRangeClick, onDeleteRangeClick,
    onSaveRange, onCancelForm
}: ReferenceRangePanelProps) {

    const formatAge = (days: number): string => {
        if (days >= 365) return `${Math.floor(days / 365)}y`;
        if (days >= 30) return `${Math.floor(days / 30)}m`;
        return `${days}d`;
    };

    return (
        <div className="ref-range-panel">
            <div className="panel-header">
                <h2 className="panel-title">Reference Ranges</h2>
                {selectedParam && (
                    <button className="btn btn-primary btn-sm" onClick={onShowAddForm}>
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
                                <tr>
                                    <td colSpan={selectedParam.data_type === 'TEXT' ? 4 : 5} className="empty">
                                        No reference ranges defined
                                    </td>
                                </tr>
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
                                            <button className="btn-icon-sm" onClick={() => onEditRangeClick(range)} title="Edit">✎</button>
                                            <button className="btn-delete" onClick={() => onDeleteRangeClick(range.id)} title="Delete">×</button>
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
                                <button className="btn btn-primary" onClick={onSaveRange}>
                                    {editingRangeId ? 'Update Range' : 'Save Range'}
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

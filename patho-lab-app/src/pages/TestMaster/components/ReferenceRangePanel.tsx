import { useState, useEffect } from 'react';
import { useToastStore } from '../../../stores/toastStore';
import AgeInput from '../../../components/AgeInput/AgeInput';
import { Plus, Edit, Trash2, Activity } from 'lucide-react';

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
    const showToast = useToastStore(s => s.showToast);
    const [criticalLow, setCriticalLow] = useState('');
    const [criticalHigh, setCriticalHigh] = useState('');

    // Load critical values when parameter changes
    useEffect(() => {
        if (selectedParam?.id && window.electronAPI) {
            window.electronAPI.tests.getCriticalValues(selectedParam.id).then((cv: any) => {
                setCriticalLow(cv?.critical_low != null ? String(cv.critical_low) : '');
                setCriticalHigh(cv?.critical_high != null ? String(cv.critical_high) : '');
            });
        } else {
            setCriticalLow('');
            setCriticalHigh('');
        }
    }, [selectedParam?.id]);

    const handleSaveCriticalValues = async () => {
        if (!selectedParam?.id || !window.electronAPI) return;
        const low = criticalLow ? parseFloat(criticalLow) : null;
        const high = criticalHigh ? parseFloat(criticalHigh) : null;
        const result = await window.electronAPI.tests.setCriticalValues(selectedParam.id, low, high);
        if (result.success) {
            showToast('Critical values saved', 'success');
        } else {
            showToast(result.error || 'Failed to save', 'error');
        }
    };

    const formatAge = (days: number): string => {
        if (days === 0) return '0d';
        if (days === 36500) return 'Max';
        if (days >= 365) return `${Math.floor(days / 365)}y`;
        if (days >= 30) return `${Math.floor(days / 30)}m`;
        return `${days}d`;
    };

    return (
        <div className="ref-range-panel">
            <div className="panel-header">
                <h2 className="panel-title">Reference Ranges</h2>
                {selectedParam && (
                    <button className="btn btn-primary btn-sm" onClick={onShowAddForm} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Plus size={14} /> Add
                    </button>
                )}
            </div>

            {selectedParam && (
                <>
                    <div className="param-info">
                        <strong>{selectedParam.parameter_name}</strong>
                        {selectedParam.unit && <span className="unit">({selectedParam.unit})</span>}
                        <span style={{ marginLeft: 'auto', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                            {selectedParam.data_type}
                        </span>
                    </div>

                    {!showAddRange && (
                        <div className="param-list" style={{ padding: '0' }}>
                            {refRanges.length === 0 ? (
                                <div className="empty">
                                    <Activity size={24} style={{ opacity: 0.5 }} />
                                    No reference ranges defined
                                </div>
                            ) : (
                                refRanges.map(range => (
                                    <div key={range.id} className="range-item">
                                        <div className="range-item-header">
                                            <span className={`gender-badge ${range.gender}`}>
                                                {range.gender === 'M' ? 'Male' : range.gender === 'F' ? 'Female' : 'All'}
                                            </span>
                                            <div className="item-actions">
                                                <button className="btn-icon-sm" title="Edit" onClick={() => onEditRangeClick(range)}>
                                                    <Edit size={14} />
                                                </button>
                                                <button className="btn-delete-sm" title="Delete" onClick={() => onDeleteRangeClick(range.id)}>
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </div>

                                        <div className="range-item-body">
                                            <div className="range-metric">
                                                <span className="range-label">Age Frame</span>
                                                <span className="range-value">{formatAge(range.age_min_days)} - {formatAge(range.age_max_days)}</span>
                                            </div>

                                            {selectedParam.data_type === 'TEXT' ? (
                                                <div className="range-metric">
                                                    <span className="range-label">Expected Value</span>
                                                    <span className="range-value">{range.display_text ?? '—'}</span>
                                                </div>
                                            ) : (
                                                <div className="range-metric">
                                                    <span className="range-label">Range Limit</span>
                                                    <span className="range-value">
                                                        {range.lower_limit ?? '0'}
                                                        {' - '}
                                                        {range.upper_limit ?? '∞'}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}

                    {/* Critical Values */}
                    {selectedParam.data_type === 'NUMERIC' && !showAddRange && (
                        <div className="add-range-form" style={{ marginTop: 'auto', marginBottom: '0.5rem', marginLeft: '0.5rem', marginRight: '0.5rem' }}>
                            <h3 style={{ margin: '0 0 10px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <Activity size={16} /> Critical Values
                            </h3>
                            <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', margin: '0 0 0.5rem' }}>
                                Results outside these thresholds will be flagged as CRITICAL.
                            </p>
                            <div className="form-row" style={{ marginBottom: '0.5rem' }}>
                                <div className="form-group">
                                    <label>Critical Low</label>
                                    <input className="input" type="number" step="0.1" value={criticalLow}
                                        onChange={e => setCriticalLow(e.target.value)}
                                        placeholder="e.g. 3.0" />
                                </div>
                                <div className="form-group">
                                    <label>Critical High</label>
                                    <input className="input" type="number" step="0.1" value={criticalHigh}
                                        onChange={e => setCriticalHigh(e.target.value)}
                                        placeholder="e.g. 20.0" />
                                </div>
                            </div>
                            <div className="form-actions" style={{ marginTop: '0' }}>
                                <button className="btn btn-secondary btn-sm" onClick={handleSaveCriticalValues}>
                                    Save Critical Values
                                </button>
                            </div>
                        </div>
                    )}

                    {showAddRange && (
                        <div className="add-range-form" style={{ marginTop: 'auto' }}>
                            <h3>{editingRangeId ? <><Edit size={16} /> Edit Range</> : <><Plus size={16} /> Add Range</>}</h3>
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

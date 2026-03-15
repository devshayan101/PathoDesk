import { useRef, ChangeEvent } from 'react';
import { Search, Plus, Download, Upload, Trash2, Edit, RefreshCw } from 'lucide-react';

interface Test {
    id: number;
    test_code: string;
    test_name: string;
    department: string;
    method: string;
    sample_type: string;
    version_id: number;
}

interface TestListPanelProps {
    tests: Test[];
    selectedTest: Test | null;
    selectedTestIds: Set<number>;
    testSearch: string;
    onSearchChange: (val: string) => void;
    onSelectTest: (test: Test) => void;
    onToggleSelectTest: (testId: number) => void;
    onToggleSelectAll: (visibleTestIds: number[], checked: boolean) => void;
    onImportClick: (file: File) => void;
    onExportClick: () => void;
    onRefreshClick: () => void;
    onNewClick: () => void;
    onBulkDeleteClick: () => void;
    onEditTestClick: (testId: number) => void;
    onDeleteTestClick: (testId: number) => void;
}

export default function TestListPanel({
    tests, selectedTest, selectedTestIds, testSearch,
    onSearchChange, onSelectTest, onToggleSelectTest, onToggleSelectAll,
    onImportClick, onExportClick, onRefreshClick, onNewClick, onBulkDeleteClick, onEditTestClick, onDeleteTestClick
}: TestListPanelProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);

    const filteredTests = tests.filter(test =>
        test.test_name.toLowerCase().includes(testSearch.toLowerCase()) ||
        test.test_code.toLowerCase().includes(testSearch.toLowerCase())
    );

    const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            onImportClick(file);
        }
        e.target.value = ''; // Reset
    };

    return (
        <div className="test-list-panel">
            <div className="panel-header" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '0.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h2 className="panel-title">Tests</h2>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        {selectedTestIds.size > 0 && (
                            <button className="btn btn-danger btn-sm" onClick={onBulkDeleteClick} title="Delete Selected">
                                <Trash2 size={14} /> ({selectedTestIds.size})
                            </button>
                        )}
                        <button className="btn btn-secondary btn-sm" onClick={() => fileInputRef.current?.click()} title="Import from Excel/CSV">
                            <Download size={14} />
                        </button>
                        <button className="btn btn-secondary btn-sm" onClick={onExportClick} title="Export to Excel">
                            <Upload size={14} />
                        </button>
                        <button className="btn btn-secondary btn-sm" onClick={onRefreshClick} title="Refresh Tests List">
                            <RefreshCw size={14} />
                        </button>
                        <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleFileChange} style={{ display: 'none' }} />
                        <button className="btn btn-primary btn-sm" onClick={onNewClick} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Plus size={14} /> New
                        </button>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <input
                        type="checkbox"
                        checked={tests.length > 0 && filteredTests.length > 0 && selectedTestIds.size === filteredTests.length}
                        onChange={(e) => {
                            const visibleIds = filteredTests.map(t => t.id);
                            onToggleSelectAll(visibleIds, e.target.checked);
                        }}
                        style={{ cursor: 'pointer' }}
                    />
                    <div style={{ position: 'relative', flex: 1 }}>
                        <Search size={14} style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
                        <input
                            type="text"
                            className="input"
                            placeholder="Search tests..."
                            value={testSearch}
                            onChange={(e) => onSearchChange(e.target.value)}
                            style={{ fontSize: '0.85rem', padding: '0.4rem 0.4rem 0.4rem 28px', width: '100%' }}
                        />
                    </div>
                </div>
            </div>
            <ul className="test-list">
                {filteredTests.length === 0 ? (
                    <li className="empty-row empty">
                        <Search size={24} style={{ opacity: 0.5 }} />
                        <span>No tests found</span>
                    </li>
                ) : (
                    filteredTests.map(test => (
                        <li
                            key={test.id}
                            className={`test-item ${selectedTest?.id === test.id ? 'selected' : ''}`}
                            onClick={() => onSelectTest(test)}
                        >
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                                <input
                                    type="checkbox"
                                    checked={selectedTestIds.has(test.id)}
                                    readOnly
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onToggleSelectTest(test.id);
                                    }}
                                    style={{ cursor: 'pointer', marginTop: '4px' }}
                                />
                                <div className="test-info" style={{ flex: 1 }}>
                                    <strong>{test.test_code}</strong>
                                    <span>{test.test_name}</span>
                                </div>
                            </div>
                            <div className="test-actions">
                                <button className="btn-icon-sm" title="Edit" onClick={(e) => { e.stopPropagation(); onEditTestClick(test.id); }}>
                                    <Edit size={14} />
                                </button>
                                <button className="btn-delete-sm" title="Delete" onClick={(e) => { e.stopPropagation(); onDeleteTestClick(test.id); }}>
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        </li>
                    ))
                )}
            </ul>
        </div>
    );
}

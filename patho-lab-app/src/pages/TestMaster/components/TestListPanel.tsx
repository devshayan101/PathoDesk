import { useRef, ChangeEvent } from 'react';

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
    onNewClick: () => void;
    onBulkDeleteClick: () => void;
    onEditTestClick: (testId: number) => void;
    onDeleteTestClick: (testId: number) => void;
}

export default function TestListPanel({
    tests, selectedTest, selectedTestIds, testSearch,
    onSearchChange, onSelectTest, onToggleSelectTest, onToggleSelectAll,
    onImportClick, onNewClick, onBulkDeleteClick, onEditTestClick, onDeleteTestClick
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
                            <button className="btn btn-danger btn-sm" onClick={onBulkDeleteClick}>
                                🗑 Delete ({selectedTestIds.size})
                            </button>
                        )}
                        <button className="btn btn-secondary btn-sm" onClick={() => fileInputRef.current?.click()}>📤 Import Excel</button>
                        <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleFileChange} style={{ display: 'none' }} />
                        <button className="btn btn-primary btn-sm" onClick={onNewClick}>+ New</button>
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
                    <input
                        type="text"
                        className="input"
                        placeholder="🔍 Search tests..."
                        value={testSearch}
                        onChange={(e) => onSearchChange(e.target.value)}
                        style={{ fontSize: '0.85rem', padding: '0.4rem', flex: 1 }}
                    />
                </div>
            </div>
            <ul className="test-list">
                {filteredTests.length === 0 ? (
                    <li className="empty-row" style={{ padding: '1rem', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
                        No tests found
                    </li>
                ) : (
                    filteredTests.map(test => (
                        <li
                            key={test.id}
                            className={`test-item ${selectedTest?.id === test.id ? 'selected' : ''}`}
                            onClick={() => onSelectTest(test)}
                        >
                            <input
                                type="checkbox"
                                checked={selectedTestIds.has(test.id)}
                                readOnly
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onToggleSelectTest(test.id);
                                }}
                                style={{ marginRight: '0.5rem', cursor: 'pointer' }}
                            />
                            <div className="test-info">
                                <strong>{test.test_code}</strong>
                                <span>{test.test_name}</span>
                            </div>
                            <div className="test-actions">
                                <button className="btn-icon" title="Edit" onClick={(e) => { e.stopPropagation(); onEditTestClick(test.id); }}>✎</button>
                                <button className="btn-delete" title="Delete" onClick={(e) => { e.stopPropagation(); onDeleteTestClick(test.id); }}>×</button>
                            </div>
                        </li>
                    ))
                )}
            </ul>
        </div>
    );
}

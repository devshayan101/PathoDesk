import { ParsedTestRow } from '../../../utils/importExcel';

interface ImportPreviewModalProps {
    show: boolean;
    importPreview: ParsedTestRow[];
    importing: boolean;
    onConfirm: () => void;
    onCancel: () => void;
}

export default function ImportPreviewModal({ show, importPreview, importing, onConfirm, onCancel }: ImportPreviewModalProps) {
    if (!show) return null;

    const uniqueTestsCount = new Set(importPreview.map(r => r.testName)).size;

    return (
        <div className="modal-overlay">
            <div className="modal" style={{ maxWidth: '900px', width: '90%', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
                <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h2 style={{ margin: 0 }}>📥 Import Preview</h2>
                    <button className="btn btn-secondary btn-sm" onClick={onCancel}>✕ Close</button>
                </div>
                <p style={{ color: 'var(--color-text-secondary)', marginBottom: '0.75rem', fontSize: '0.85rem' }}>
                    Found <strong>{importPreview.length}</strong> rows across <strong>{uniqueTestsCount}</strong> unique tests
                </p>
                <div style={{ flex: 1, overflow: 'auto', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }}>
                    <table className="table" style={{ fontSize: '0.8rem' }}>
                        <thead>
                            <tr>
                                <th>Category</th>
                                <th>Test Name</th>
                                <th>Param Code</th>
                                <th>Parameter</th>
                                <th>Ref Range</th>
                                <th>Crit Low</th>
                                <th>Crit High</th>
                                <th>Unit</th>
                                <th>Price</th>
                                <th>Is Header</th>
                                <th>Sample Type</th>
                            </tr>
                        </thead>
                        <tbody>
                            {importPreview.slice(0, 100).map((row, idx) => (
                                <tr key={idx}>
                                    <td>{row.category}</td>
                                    <td><strong>{row.testName}</strong></td>
                                    <td>{row.paramCode}</td>
                                    <td>{row.parameter}</td>
                                    <td>{row.referenceRange}</td>
                                    <td>{row.criticalLow}</td>
                                    <td>{row.criticalHigh}</td>
                                    <td>{row.unit}</td>
                                    <td>{row.price || '-'}</td>
                                    <td>{row.isHeader || 'No'}</td>
                                    <td>{row.sampleType}</td>
                                </tr>
                            ))}
                            {importPreview.length > 100 && (
                                <tr>
                                    <td colSpan={11} style={{ textAlign: 'center', color: 'var(--color-text-muted)' }}>
                                        ...and {importPreview.length - 100} more rows
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                    <button className="btn btn-secondary" onClick={onCancel}>Cancel</button>
                    <button className="btn btn-primary" onClick={onConfirm} disabled={importing}>
                        {importing ? 'Importing...' : `✓ Import ${uniqueTestsCount} Tests`}
                    </button>
                </div>
            </div>
        </div>
    );
}

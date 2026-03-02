import { useState, useEffect } from 'react';
import { useToastStore } from '../../stores/toastStore';
import ConfirmDialog from '../../components/ConfirmDialog/ConfirmDialog';
import './PriceLists.css';

interface PriceList {
    id: number;
    code: string;
    name: string;
    description: string | null;
    is_default: number;
    is_active: number;
}

interface TestPrice {
    id: number;
    test_id: number;
    test_code: string;
    test_name: string;
    base_price: number;
    gst_applicable: number;
    gst_rate: number;
}

export default function PriceLists() {
    const [priceLists, setPriceLists] = useState<PriceList[]>([]);
    const [selectedList, setSelectedList] = useState<PriceList | null>(null);
    const [testPrices, setTestPrices] = useState<TestPrice[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [editingList, setEditingList] = useState<PriceList | null>(null);
    const [loading, setLoading] = useState(true);
    const [pricesLoading, setPricesLoading] = useState(false);
    const [editingPrices, setEditingPrices] = useState<Map<number, number>>(new Map());
    const [saving, setSaving] = useState(false);
    const showToast = useToastStore(s => s.showToast);
    const [confirmDialog, setConfirmDialog] = useState<{
        title: string; message: string; confirmLabel: string;
        variant: 'danger' | 'warning' | 'default'; onConfirm: () => void;
    } | null>(null);

    // Form state
    const [formData, setFormData] = useState({
        code: '',
        name: '',
        description: '',
        isDefault: false
    });

    useEffect(() => {
        loadPriceLists();
    }, []);

    useEffect(() => {
        if (selectedList) {
            loadTestPrices(selectedList.id);
        }
    }, [selectedList]);

    const loadPriceLists = async () => {
        try {
            const data = await window.electronAPI.priceLists.listAll();
            setPriceLists(data);
            if (data.length > 0 && !selectedList) {
                setSelectedList(data[0]);
            }
        } catch (error) {
            console.error('Error loading price lists:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadTestPrices = async (priceListId: number) => {
        setPricesLoading(true);
        try {
            const data = await window.electronAPI.testPrices.list(priceListId);
            setTestPrices(data);
            setEditingPrices(new Map());
        } catch (error) {
            console.error('Error loading test prices:', error);
        } finally {
            setPricesLoading(false);
        }
    };

    const handleCreateList = () => {
        setEditingList(null);
        setFormData({ code: '', name: '', description: '', isDefault: false });
        setShowModal(true);
    };

    const handleEditList = (list: PriceList) => {
        setEditingList(list);
        setFormData({
            code: list.code,
            name: list.name,
            description: list.description || '',
            isDefault: list.is_default === 1
        });
        setShowModal(true);
    };

    const handleSaveList = async () => {
        try {
            if (editingList) {
                await window.electronAPI.priceLists.update(editingList.id, formData);
            } else {
                await window.electronAPI.priceLists.create(formData);
            }
            setShowModal(false);
            loadPriceLists();
        } catch (error) {
            console.error('Error saving price list:', error);
        }
    };

    const handlePriceChange = (testId: number, value: string) => {
        const numValue = parseFloat(value) || 0;
        setEditingPrices(prev => new Map(prev).set(testId, numValue));
    };

    const handleSavePrices = async () => {
        if (!selectedList || editingPrices.size === 0) return;

        setSaving(true);
        try {
            const prices = Array.from(editingPrices.entries()).map(([testId, basePrice]) => ({
                testId,
                basePrice
            }));

            await window.electronAPI.testPrices.bulkSet(selectedList.id, prices);
            await loadTestPrices(selectedList.id);
        } catch (error) {
            console.error('Error saving prices:', error);
        } finally {
            setSaving(false);
        }
    };

    const handleSetDefault = async (list: PriceList) => {
        try {
            await window.electronAPI.priceLists.update(list.id, { isDefault: true });
            loadPriceLists();
        } catch (error) {
            console.error('Error setting default:', error);
        }
    };

    const handleDeleteList = (list: PriceList) => {
        setConfirmDialog({
            title: 'Delete Price List',
            message: `Are you sure you want to delete the price list "${list.name}"?`,
            confirmLabel: 'Delete',
            variant: 'danger',
            onConfirm: async () => {
                setConfirmDialog(null);
                try {
                    const result = await window.electronAPI.priceLists.delete(list.id);
                    if (result && !result.success) {
                        showToast(result.error || 'Failed to delete price list', 'error');
                    } else {
                        if (selectedList?.id === list.id) {
                            setSelectedList(null);
                        }
                        loadPriceLists();
                    }
                } catch (error) {
                    console.error('Error deleting price list:', error);
                    showToast('Failed to delete price list', 'error');
                }
            }
        });
    };



    if (loading) {
        return <div className="price-lists-page"><div className="loading">Loading...</div></div>;
    }

    return (
        <div className="price-lists-page">
            <div className="page-header">
                <h1>💰 Price Lists</h1>
                <button className="btn btn-primary" onClick={handleCreateList}>
                    + New Price List
                </button>
            </div>

            <div className="price-lists-layout" style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '1.5rem', height: 'calc(100vh - 140px)' }}>
                {/* Left: Price Lists */}
                <div className="lists-panel" style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                    <div style={{ padding: '1rem', borderBottom: '1px solid var(--color-border)', background: 'var(--color-bg-tertiary)' }}>
                        <h3 style={{ margin: 0, fontSize: '1rem' }}>Price Lists</h3>
                    </div>
                    <div className="lists-container" style={{ overflowY: 'auto', flex: 1, padding: '0.5rem' }}>
                        {priceLists.map(list => (
                            <div
                                key={list.id}
                                className={`list-card ${selectedList?.id === list.id ? 'selected' : ''} ${list.is_active === 0 ? 'inactive' : ''}`}
                                onClick={() => setSelectedList(list)}
                                style={{
                                    padding: '1rem',
                                    marginBottom: '0.5rem',
                                    borderRadius: 'var(--radius-md)',
                                    cursor: 'pointer',
                                    border: selectedList?.id === list.id ? '1px solid var(--color-accent)' : '1px solid transparent',
                                    background: selectedList?.id === list.id ? 'var(--color-bg-tertiary)' : 'transparent',
                                    transition: 'background 0.2s'
                                }}
                            >
                                <div className="list-header" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                                    <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{list.code}</span>
                                    <div style={{ display: 'flex', gap: '0.25rem' }}>
                                        {list.is_default === 1 && <span className="badge badge-info" style={{ fontSize: '0.6rem' }}>Default</span>}
                                        {list.is_active === 0 && <span className="badge badge-warning" style={{ fontSize: '0.6rem' }}>Inactive</span>}
                                    </div>
                                </div>
                                <div className="list-name" style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>{list.name}</div>
                                <div className="list-actions" style={{ marginTop: '0.5rem', display: 'flex', gap: '0.5rem' }}>
                                    <button className="btn btn-sm btn-secondary" onClick={(e) => { e.stopPropagation(); handleEditList(list); }} style={{ padding: '0.1rem 0.5rem', fontSize: '0.75rem' }}>
                                        Edit
                                    </button>
                                    {list.is_default === 0 && list.is_active === 1 && (
                                        <>
                                            <button className="btn btn-sm btn-secondary" onClick={(e) => { e.stopPropagation(); handleSetDefault(list); }} style={{ padding: '0.1rem 0.5rem', fontSize: '0.75rem' }}>
                                                Set Default
                                            </button>
                                            <button className="btn btn-sm" onClick={(e) => { e.stopPropagation(); handleDeleteList(list); }} style={{ padding: '0.1rem 0.5rem', fontSize: '0.75rem', background: '#e74c3c', color: 'white', border: 'none' }}>
                                                Delete
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Right: Test Prices */}
                <div className="prices-panel" style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                    {selectedList ? (
                        <>
                            <div className="prices-header" style={{ padding: '1rem', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--color-bg-tertiary)' }}>
                                <div>
                                    <h3 style={{ margin: 0 }}>{selectedList.name}</h3>
                                    <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{selectedList.code}</span>
                                </div>
                                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                    {editingPrices.size > 0 && (
                                        <button
                                            className="btn btn-primary"
                                            onClick={handleSavePrices}
                                            disabled={saving}
                                        >
                                            {saving ? 'Saving...' : `Save ${editingPrices.size} Changes`}
                                        </button>
                                    )}
                                    <button
                                        className="btn btn-secondary"
                                        onClick={() => window.print()}
                                        title="Print price list"
                                    >
                                        🖨️ Print
                                    </button>
                                </div>
                            </div>

                            {pricesLoading ? (
                                <div className="loading">Loading prices...</div>
                            ) : (
                                <div className="prices-table-container" style={{ overflowY: 'auto', flex: 1 }}>
                                    <table className="prices-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                                        <thead style={{ position: 'sticky', top: 0, background: 'var(--color-bg-card)', zIndex: 1 }}>
                                            <tr>
                                                <th style={{ textAlign: 'left', padding: '0.75rem 1rem', borderBottom: '1px solid var(--color-border)' }}>Test Code</th>
                                                <th style={{ textAlign: 'left', padding: '0.75rem 1rem', borderBottom: '1px solid var(--color-border)' }}>Test Name</th>
                                                <th style={{ textAlign: 'left', padding: '0.75rem 1rem', borderBottom: '1px solid var(--color-border)', width: '150px' }}>Base Price (₹)</th>
                                                <th style={{ textAlign: 'left', padding: '0.75rem 1rem', borderBottom: '1px solid var(--color-border)' }}>GST</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {testPrices.map(price => (
                                                <tr key={price.test_id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                                                    <td style={{ padding: '0.75rem 1rem' }} className="code">{price.test_code}</td>
                                                    <td style={{ padding: '0.75rem 1rem' }}>{price.test_name}</td>
                                                    <td style={{ padding: '0.5rem 1rem' }}>
                                                        <input
                                                            type="number"
                                                            className="price-input input"
                                                            value={editingPrices.get(price.test_id) ?? price.base_price}
                                                            onChange={(e) => handlePriceChange(price.test_id, e.target.value)}
                                                            min="0"
                                                            step="10"
                                                            style={{
                                                                width: '100%',
                                                                borderColor: editingPrices.has(price.test_id) ? 'var(--color-accent)' : 'var(--color-border)',
                                                                background: editingPrices.has(price.test_id) ? 'var(--color-bg-tertiary)' : 'transparent'
                                                            }}
                                                        />
                                                        <span className="print-price">₹{(editingPrices.get(price.test_id) ?? price.base_price).toLocaleString('en-IN')}</span>
                                                    </td>
                                                    <td style={{ padding: '0.75rem 1rem' }}>
                                                        {price.gst_applicable === 1 ? <span className="badge badge-info">{price.gst_rate}%</span> : <span className="text-muted">Exempt</span>}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="no-selection" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--color-text-muted)' }}>
                            Select a price list to view/edit test prices
                        </div>
                    )}
                </div>
            </div>

            {/* Create/Edit Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>{editingList ? 'Edit Price List' : 'New Price List'}</h3>
                            <button className="close-btn" onClick={() => setShowModal(false)}>×</button>
                        </div>
                        <div className="modal-body">
                            <div className="form-group">
                                <label>Code *</label>
                                <input
                                    type="text"
                                    value={formData.code}
                                    onChange={e => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                                    placeholder="e.g., CORPORATE"
                                    disabled={!!editingList}
                                />
                            </div>
                            <div className="form-group">
                                <label>Name *</label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="e.g., Corporate Price List"
                                />
                            </div>
                            <div className="form-group">
                                <label>Description</label>
                                <textarea
                                    value={formData.description}
                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                    placeholder="Optional description..."
                                />
                            </div>
                            <div className="form-group checkbox">
                                <label>
                                    <input
                                        type="checkbox"
                                        checked={formData.isDefault}
                                        onChange={e => setFormData({ ...formData, isDefault: e.target.checked })}
                                    />
                                    Set as default price list
                                </label>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn" onClick={() => setShowModal(false)}>Cancel</button>
                            <button
                                className="btn btn-primary"
                                onClick={handleSaveList}
                                disabled={!formData.code || !formData.name}
                            >
                                {editingList ? 'Update' : 'Create'}
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

import { useState, useEffect } from 'react';
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

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 0
        }).format(amount);
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

            <div className="price-lists-layout">
                {/* Left: Price Lists */}
                <div className="lists-panel">
                    <h3>Price Lists</h3>
                    <div className="lists-container">
                        {priceLists.map(list => (
                            <div
                                key={list.id}
                                className={`list-card ${selectedList?.id === list.id ? 'selected' : ''} ${list.is_active === 0 ? 'inactive' : ''}`}
                                onClick={() => setSelectedList(list)}
                            >
                                <div className="list-header">
                                    <span className="list-code">{list.code}</span>
                                    {list.is_default === 1 && <span className="badge default">Default</span>}
                                    {list.is_active === 0 && <span className="badge inactive">Inactive</span>}
                                </div>
                                <div className="list-name">{list.name}</div>
                                {list.description && <div className="list-desc">{list.description}</div>}
                                <div className="list-actions">
                                    <button className="btn btn-sm" onClick={(e) => { e.stopPropagation(); handleEditList(list); }}>
                                        Edit
                                    </button>
                                    {list.is_default === 0 && list.is_active === 1 && (
                                        <button className="btn btn-sm" onClick={(e) => { e.stopPropagation(); handleSetDefault(list); }}>
                                            Set Default
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Right: Test Prices */}
                <div className="prices-panel">
                    {selectedList ? (
                        <>
                            <div className="prices-header">
                                <h3>Test Prices - {selectedList.name}</h3>
                                {editingPrices.size > 0 && (
                                    <button
                                        className="btn btn-primary"
                                        onClick={handleSavePrices}
                                        disabled={saving}
                                    >
                                        {saving ? 'Saving...' : `Save ${editingPrices.size} Changes`}
                                    </button>
                                )}
                            </div>

                            {pricesLoading ? (
                                <div className="loading">Loading prices...</div>
                            ) : (
                                <div className="prices-table-container">
                                    <table className="prices-table">
                                        <thead>
                                            <tr>
                                                <th>Test Code</th>
                                                <th>Test Name</th>
                                                <th>Base Price (₹)</th>
                                                <th>GST</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {testPrices.map(price => (
                                                <tr key={price.test_id} className={editingPrices.has(price.test_id) ? 'modified' : ''}>
                                                    <td className="code">{price.test_code}</td>
                                                    <td>{price.test_name}</td>
                                                    <td>
                                                        <input
                                                            type="number"
                                                            className="price-input"
                                                            value={editingPrices.get(price.test_id) ?? price.base_price}
                                                            onChange={(e) => handlePriceChange(price.test_id, e.target.value)}
                                                            min="0"
                                                            step="10"
                                                        />
                                                    </td>
                                                    <td>
                                                        {price.gst_applicable === 1 ? `${price.gst_rate}%` : 'Exempt'}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="no-selection">
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
        </div>
    );
}

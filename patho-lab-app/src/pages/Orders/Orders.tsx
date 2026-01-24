import { useState } from 'react';
import './Orders.css';

// Mock data matching wireframe
const availableTests = [
    { code: 'CBC', name: 'Complete Blood Count', price: 350 },
    { code: 'LFT', name: 'Liver Function Test', price: 650 },
    { code: 'RFT', name: 'Renal Function Test', price: 550 },
    { code: 'TFT', name: 'Thyroid Function Test', price: 800 },
];

export default function OrdersPage() {
    const [showForm, setShowForm] = useState(false);
    const [selectedTests, setSelectedTests] = useState<string[]>([]);
    const [discount, setDiscount] = useState('');

    const toggleTest = (code: string) => {
        setSelectedTests(prev =>
            prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]
        );
    };

    const selectedTestsData = availableTests.filter(t => selectedTests.includes(t.code));
    const total = selectedTestsData.reduce((sum, t) => sum + t.price, 0);
    const discountAmount = parseInt(discount) || 0;
    const finalTotal = total - discountAmount;

    return (
        <div className="orders-page">
            <div className="page-header">
                <h1 className="page-title">Orders</h1>
                <button className="btn btn-primary" onClick={() => setShowForm(true)}>
                    + New Order
                </button>
            </div>

            {showForm && (
                <div className="modal-overlay">
                    <div className="modal order-form-modal">
                        <h2>Order Creation</h2>
                        <p className="form-subtitle">Patient: Rahul Sharma (PID-10231)</p>

                        {/* Test selection - matching wireframe */}
                        <div className="test-selection">
                            <label>Select Tests:</label>
                            <div className="test-buttons">
                                {availableTests.map(test => (
                                    <button
                                        key={test.code}
                                        type="button"
                                        className={`test-btn ${selectedTests.includes(test.code) ? 'selected' : ''}`}
                                        onClick={() => toggleTest(test.code)}
                                    >
                                        {test.code}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Order summary table - matching wireframe */}
                        {selectedTestsData.length > 0 && (
                            <div className="order-summary">
                                <table className="table">
                                    <thead>
                                        <tr>
                                            <th>Test</th>
                                            <th style={{ textAlign: 'right' }}>Price</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {selectedTestsData.map(test => (
                                            <tr key={test.code}>
                                                <td>{test.name}</td>
                                                <td style={{ textAlign: 'right' }}>₹{test.price}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>

                                <div className="order-total">
                                    <div className="total-row">
                                        <span>Total:</span>
                                        <span>₹{total}</span>
                                    </div>
                                    <div className="discount-row">
                                        <label>Discount:</label>
                                        <input
                                            className="input discount-input"
                                            type="number"
                                            value={discount}
                                            onChange={(e) => setDiscount(e.target.value)}
                                            placeholder="0"
                                        />
                                        <span>Approved By:</span>
                                        <select className="input">
                                            <option>Admin</option>
                                        </select>
                                    </div>
                                    {discountAmount > 0 && (
                                        <div className="total-row final">
                                            <span>Final Total:</span>
                                            <span>₹{finalTotal}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        <div className="form-actions">
                            <button className="btn btn-primary">Generate Invoice</button>
                            <button className="btn btn-secondary">Print Receipt</button>
                            <button className="btn btn-secondary" onClick={() => setShowForm(false)}>
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Orders list */}
            <div className="orders-table-container">
                <table className="table">
                    <thead>
                        <tr>
                            <th>Order ID</th>
                            <th>Patient</th>
                            <th>Tests</th>
                            <th>Date</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td><code>ORD-2026-00123</code></td>
                            <td>Rahul Sharma</td>
                            <td>CBC, LFT</td>
                            <td>2026-01-24</td>
                            <td><span className="badge badge-warning">PENDING</span></td>
                        </tr>
                        <tr>
                            <td><code>ORD-2026-00122</code></td>
                            <td>Anita Patel</td>
                            <td>RFT</td>
                            <td>2026-01-24</td>
                            <td><span className="badge badge-success">COMPLETED</span></td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    );
}

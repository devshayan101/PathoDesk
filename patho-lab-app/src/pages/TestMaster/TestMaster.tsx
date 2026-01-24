import { useState } from 'react';
import './TestMaster.css';

// Mock test data matching wireframe
const tests = [
    { code: 'CBC', name: 'Complete Blood Count', dept: 'Hematology', method: 'Analyzer', sample: 'Blood' },
    { code: 'LFT', name: 'Liver Function Test', dept: 'Biochemistry', method: 'Analyzer', sample: 'Serum' },
    { code: 'RFT', name: 'Renal Function Test', dept: 'Biochemistry', method: 'Analyzer', sample: 'Serum' },
    { code: 'TFT', name: 'Thyroid Function Test', dept: 'Immunology', method: 'ELISA', sample: 'Serum' },
];

export default function TestMasterPage() {
    const [selectedTest, setSelectedTest] = useState(tests[0]);

    return (
        <div className="test-master-page">
            <h1 className="page-title">Test Master Configuration</h1>

            {/* Two-column layout matching wireframe */}
            <div className="test-master-layout">
                {/* Left - Test List */}
                <div className="test-list-panel">
                    <h2 className="panel-title">Test List</h2>
                    <ul className="test-list">
                        {tests.map(test => (
                            <li
                                key={test.code}
                                className={`test-item ${selectedTest.code === test.code ? 'selected' : ''}`}
                                onClick={() => setSelectedTest(test)}
                            >
                                {test.code} - {test.name}
                            </li>
                        ))}
                    </ul>
                    <button className="btn btn-primary btn-sm" style={{ margin: 'var(--spacing-md)' }}>
                        + Add Test
                    </button>
                </div>

                {/* Right - Test Details */}
                <div className="test-details-panel">
                    <h2 className="panel-title">Test Details</h2>

                    <div className="detail-form">
                        <div className="form-group">
                            <label>Name:</label>
                            <input className="input" value={selectedTest.name} readOnly />
                        </div>
                        <div className="form-group">
                            <label>Code:</label>
                            <input className="input" value={selectedTest.code} readOnly />
                        </div>
                        <div className="form-group">
                            <label>Department:</label>
                            <input className="input" value={selectedTest.dept} readOnly />
                        </div>
                        <div className="form-group">
                            <label>Method:</label>
                            <input className="input" value={selectedTest.method} readOnly />
                        </div>
                        <div className="form-group">
                            <label>Sample Type:</label>
                            <input className="input" value={selectedTest.sample} readOnly />
                        </div>

                        <button className="btn btn-secondary">Manage Parameters</button>
                    </div>

                    {/* Reference Range section - matching wireframe */}
                    <div className="ref-range-section">
                        <h3>Reference Ranges</h3>
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Parameter</th>
                                    <th>Gender</th>
                                    <th>Age (Days)</th>
                                    <th>Min</th>
                                    <th>Max</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td>Hemoglobin</td>
                                    <td>M</td>
                                    <td>365-∞</td>
                                    <td>13</td>
                                    <td>17</td>
                                </tr>
                                <tr>
                                    <td>Hemoglobin</td>
                                    <td>F</td>
                                    <td>365-∞</td>
                                    <td>12</td>
                                    <td>15</td>
                                </tr>
                            </tbody>
                        </table>
                        <button className="btn btn-secondary btn-sm">+ Add Range</button>
                    </div>
                </div>
            </div>
        </div>
    );
}

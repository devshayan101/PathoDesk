import { useState } from 'react';
import './Results.css';

// Matching wireframe 3-panel layout for result entry
const testParameters = [
    { code: 'HB', name: 'Hemoglobin', unit: 'g/dL', range: '13-17', previous: '14.1' },
    { code: 'WBC', name: 'WBC Count', unit: 'x10³/µL', range: '4-11', previous: '7.6' },
    { code: 'PLT', name: 'Platelet Count', unit: 'x10⁵/µL', range: '1.5-4', previous: '2.1' },
    { code: 'RBC', name: 'RBC Count', unit: 'x10⁶/µL', range: '4.5-5.5', previous: '4.8' },
    { code: 'HCT', name: 'Hematocrit', unit: '%', range: '40-50', previous: '42' },
];

export default function ResultsPage() {
    const [values, setValues] = useState<Record<string, string>>({});
    const [showCriticalAlert, setShowCriticalAlert] = useState(false);

    const handleValueChange = (code: string, value: string) => {
        setValues(prev => ({ ...prev, [code]: value }));

        // Check for critical values
        if (code === 'HB' && parseFloat(value) < 7) {
            setShowCriticalAlert(true);
        }
    };

    const getAbnormalFlag = (code: string, value: string) => {
        const param = testParameters.find(p => p.code === code);
        if (!param || !value) return '';

        const [min, max] = param.range.split('-').map(parseFloat);
        const numVal = parseFloat(value);

        if (numVal < min) return 'low';
        if (numVal > max) return 'high';
        return 'normal';
    };

    return (
        <div className="results-page">
            <h1 className="page-title">Result Entry</h1>

            {/* Critical Value Alert Modal - matching wireframe */}
            {showCriticalAlert && (
                <div className="modal-overlay">
                    <div className="modal critical-alert-modal">
                        <h2 className="critical-header">⚠️ CRITICAL VALUE ALERT</h2>
                        <p><strong>Parameter:</strong> Hemoglobin</p>
                        <p><strong>Value:</strong> {values['HB']} g/dL</p>

                        <div className="form-group">
                            <label>Comment (Mandatory):</label>
                            <textarea className="input" rows={3} required></textarea>
                        </div>

                        <button
                            className="btn btn-primary"
                            onClick={() => setShowCriticalAlert(false)}
                        >
                            Acknowledge & Continue
                        </button>
                    </div>
                </div>
            )}

            {/* 3-panel layout matching wireframe */}
            <div className="result-entry-layout">
                {/* LEFT PANEL - Patient/Sample Info */}
                <div className="panel panel-left">
                    <div className="panel-section">
                        <h3>Patient Info</h3>
                        <div className="info-item">
                            <span className="label">Name:</span>
                            <span>Rahul Sharma</span>
                        </div>
                        <div className="info-item">
                            <span className="label">PID:</span>
                            <code>PID-10231</code>
                        </div>
                        <div className="info-item">
                            <span className="label">Age/Sex:</span>
                            <span>38Y / M</span>
                        </div>
                    </div>

                    <div className="panel-section">
                        <h3>Sample Info</h3>
                        <div className="info-item">
                            <span className="label">Sample:</span>
                            <code>S-10231-A</code>
                        </div>
                        <div className="info-item">
                            <span className="label">Test:</span>
                            <span>CBC</span>
                        </div>
                    </div>

                    <div className="panel-section">
                        <h3>Test Status</h3>
                        <span className="badge badge-warning">DRAFT</span>
                    </div>
                </div>

                {/* CENTER PANEL - Entry Grid */}
                <div className="panel panel-center">
                    <table className="table result-table">
                        <thead>
                            <tr>
                                <th>Parameter</th>
                                <th>Value</th>
                                <th>Unit</th>
                                <th>Range</th>
                                <th>Flag</th>
                            </tr>
                        </thead>
                        <tbody>
                            {testParameters.map(param => {
                                const flag = getAbnormalFlag(param.code, values[param.code] || '');
                                return (
                                    <tr key={param.code} className={flag ? `row-${flag}` : ''}>
                                        <td>{param.name}</td>
                                        <td>
                                            <input
                                                className="input result-input"
                                                type="text"
                                                value={values[param.code] || ''}
                                                onChange={(e) => handleValueChange(param.code, e.target.value)}
                                                placeholder="—"
                                            />
                                        </td>
                                        <td className="unit">{param.unit}</td>
                                        <td className="range">{param.range}</td>
                                        <td>
                                            {flag && (
                                                <span className={`flag flag-${flag}`}>
                                                    {flag.toUpperCase()}
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>

                    <div className="result-actions">
                        <button className="btn btn-secondary">
                            <span className="kbd">F5</span> Save Draft
                        </button>
                        <button className="btn btn-primary">
                            <span className="kbd">F9</span> Submit
                        </button>
                    </div>
                </div>

                {/* RIGHT PANEL - Previous Results & Comments */}
                <div className="panel panel-right">
                    <div className="panel-section">
                        <h3>Previous Results</h3>
                        {testParameters.map(param => (
                            <div key={param.code} className="previous-result">
                                <span className="param-name">{param.code}:</span>
                                <span className="param-value">{param.previous}</span>
                            </div>
                        ))}
                    </div>

                    <div className="panel-section">
                        <h3>QC Status</h3>
                        <span className="badge badge-success">QC OK</span>
                    </div>

                    <div className="panel-section">
                        <h3>Comments</h3>
                        <textarea className="input" rows={4} placeholder="Add test comments..."></textarea>
                    </div>
                </div>
            </div>
        </div>
    );
}

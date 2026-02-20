import { useEffect, useState } from 'react';
import { useLicenseStore } from '../../stores/licenseStore';
import { useToastStore } from '../../stores/toastStore';
import './UpgradeRequired.css';

interface UpgradeRequiredProps {
    module: string;
    featureName: string;
}

export default function UpgradeRequired({ module, featureName }: UpgradeRequiredProps) {
    const { getMachineId } = useLicenseStore();
    const [machineId, setMachineId] = useState<string>('');

    useEffect(() => {
        loadMachineId();
    }, []);

    const loadMachineId = async () => {
        const id = await getMachineId();
        setMachineId(id);
    };

    const copyMachineId = () => {
        navigator.clipboard.writeText(machineId);
        useToastStore.getState().showToast('Machine ID copied to clipboard', 'success');
    };

    return (
        <div className="upgrade-required-page">
            <div className="upgrade-content">
                <div className="upgrade-icon">🔒</div>

                <h1>Upgrade Required</h1>

                <p className="upgrade-description">
                    The <strong>{featureName}</strong> feature requires an active license
                    with the <code>{module}</code> module enabled.
                </p>

                <div className="upgrade-card">
                    <h3>How to Upgrade</h3>
                    <ol>
                        <li>Contact your software vendor</li>
                        <li>Provide your Machine ID (shown below)</li>
                        <li>Purchase the {module.replace('_', ' & ')} module add-on</li>
                        <li>Upload the new license file in Settings → License</li>
                    </ol>
                </div>

                <div className="machine-id-section">
                    <h4>Your Machine ID</h4>
                    <div className="machine-id-box">
                        <code>{machineId || 'Loading...'}</code>
                        <button className="btn btn-sm btn-primary" onClick={copyMachineId}>
                            Copy
                        </button>
                    </div>
                </div>

                <div className="upgrade-benefits">
                    <h4>{featureName} Features Include:</h4>
                    {module === 'QC_AUDIT' && (
                        <ul>
                            <li>✓ Daily QC Entry with Westgard Rules</li>
                            <li>✓ Levey-Jennings Charts</li>
                            <li>✓ QC-Result Integration</li>
                            <li>✓ Complete Audit Trail</li>
                            <li>✓ Audit Log with Diff Tracking</li>
                            <li>✓ NABL/CAP Compliance Support</li>
                        </ul>
                    )}
                    {module === 'ANALYZER' && (
                        <ul>
                            <li>✓ Automated Analyzer Integration</li>
                            <li>✓ Bi-directional Data Transfer</li>
                            <li>✓ Auto-Population of Results</li>
                            <li>✓ Error Reduction</li>
                        </ul>
                    )}
                    {module === 'DOCTOR_COMMISSION' && (
                        <ul>
                            <li>✓ Referral Doctor Management</li>
                            <li>✓ Commission Calculation</li>
                            <li>✓ Monthly Statements</li>
                            <li>✓ Settlement Tracking</li>
                        </ul>
                    )}
                </div>

                <div className="upgrade-actions">
                    <a href="#/admin/license" className="btn btn-primary">
                        Go to License Settings
                    </a>
                    <a href="#/" className="btn btn-secondary">
                        Back to Dashboard
                    </a>
                </div>
            </div>
        </div>
    );
}

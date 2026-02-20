import { useState, useEffect, useRef } from 'react';
import { useLicenseStore } from '../../stores/licenseStore';
import { useToastStore } from '../../stores/toastStore';
import './LicenseSettings.css';

export default function LicenseSettingsPage() {
    const { status, isLoading, error, loadStatus, uploadLicense, getMachineId } = useLicenseStore();
    const [machineId, setMachineId] = useState<string>('');
    const [uploading, setUploading] = useState(false);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const [uploadSuccess, setUploadSuccess] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        loadStatus();
        loadMachineId();
    }, []);

    const loadMachineId = async () => {
        const id = await getMachineId();
        setMachineId(id);
    };

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        setUploadError(null);
        setUploadSuccess(false);

        try {
            const content = await file.text();
            const result = await uploadLicense(content);

            if (result.success) {
                setUploadSuccess(true);
            } else {
                setUploadError(result.error || 'Failed to upload license');
            }
        } catch (e: any) {
            setUploadError(e.message);
        }

        setUploading(false);

        // Clear file input
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const copyMachineId = () => {
        navigator.clipboard.writeText(machineId);
        useToastStore.getState().showToast('Machine ID copied to clipboard', 'success');
    };

    const getStateColor = (state: string) => {
        switch (state) {
            case 'VALID': return '#22c55e';
            case 'NEAR_EXPIRY': return '#f59e0b';
            case 'GRACE_PERIOD': return '#f59e0b';
            case 'EXPIRED': return '#ef4444';
            case 'INVALID': return '#ef4444';
            default: return '#6b7280';
        }
    };

    const getStateIcon = (state: string) => {
        switch (state) {
            case 'VALID': return '✓';
            case 'NEAR_EXPIRY': return '⚠';
            case 'GRACE_PERIOD': return '⚠';
            case 'EXPIRED': return '✗';
            case 'INVALID': return '✗';
            default: return '?';
        }
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    const allModules = ['BILLING', 'QC_AUDIT', 'ANALYZER', 'INVENTORY', 'DOCTOR_COMMISSION'] as const;

    return (
        <div className="license-settings-page">
            <div className="page-header">
                <h1>License Management</h1>
            </div>

            {isLoading ? (
                <div className="loading">Loading license status...</div>
            ) : (
                <div className="license-content">
                    {/* License Status Card */}
                    <div className="card license-status-card">
                        <div className="card-header">
                            <h2>License Status</h2>
                            {status && (
                                <span
                                    className="status-badge"
                                    style={{ background: getStateColor(status.state) }}
                                >
                                    {getStateIcon(status.state)} {status.state.replace('_', ' ')}
                                </span>
                            )}
                        </div>

                        {status?.state === 'NO_LICENSE' ? (
                            <div className="no-license">
                                <div className="no-license-icon">🔑</div>
                                <h3>No License Found</h3>
                                <p>Please upload a valid license file to activate your software.</p>
                            </div>
                        ) : status?.license && (
                            <div className="license-details">
                                <div className="detail-row">
                                    <span className="detail-label">Lab Name</span>
                                    <span className="detail-value">{status.license.lab_name}</span>
                                </div>
                                <div className="detail-row">
                                    <span className="detail-label">Licensed To</span>
                                    <span className="detail-value">{status.license.issued_to}</span>
                                </div>
                                <div className="detail-row">
                                    <span className="detail-label">Edition</span>
                                    <span className="detail-value edition-badge">
                                        {status.license.edition}
                                    </span>
                                </div>
                                <div className="detail-row">
                                    <span className="detail-label">Issue Date</span>
                                    <span className="detail-value">{formatDate(status.license.issue_date)}</span>
                                </div>
                                <div className="detail-row">
                                    <span className="detail-label">Expiry Date</span>
                                    <span className="detail-value">
                                        {formatDate(status.license.expiry_date)}
                                        {status.daysUntilExpiry !== null && status.daysUntilExpiry > 0 && (
                                            <span className="days-remaining">
                                                ({status.daysUntilExpiry} days remaining)
                                            </span>
                                        )}
                                    </span>
                                </div>
                                <div className="detail-row">
                                    <span className="detail-label">Binding Mode</span>
                                    <span className="detail-value">{status.license.binding_mode}</span>
                                </div>
                                <div className="detail-row">
                                    <span className="detail-label">Max Users</span>
                                    <span className="detail-value">{status.license.max_users}</span>
                                </div>

                                {status.message && (
                                    <div className="license-message" style={{
                                        borderColor: getStateColor(status.state),
                                        background: `${getStateColor(status.state)}15`
                                    }}>
                                        {status.message}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Enabled Modules Card */}
                    <div className="card modules-card">
                        <div className="card-header">
                            <h2>Enabled Modules</h2>
                        </div>
                        <div className="modules-grid">
                            {allModules.map(module => {
                                const isEnabled = status?.license?.edition === 'ENTERPRISE' ||
                                    status?.license?.enabled_modules.includes(module);
                                return (
                                    <div
                                        key={module}
                                        className={`module-item ${isEnabled ? 'enabled' : 'disabled'}`}
                                    >
                                        <span className="module-icon">
                                            {isEnabled ? '✓' : '✗'}
                                        </span>
                                        <span className="module-name">
                                            {module.replace('_', ' & ')}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Machine ID Card */}
                    <div className="card machine-id-card">
                        <div className="card-header">
                            <h2>Machine Identifier</h2>
                        </div>
                        <p className="machine-id-description">
                            Provide this ID when requesting a new license. It uniquely identifies this installation.
                        </p>
                        <div className="machine-id-box">
                            <code>{machineId || 'Loading...'}</code>
                            <button className="btn btn-sm" onClick={copyMachineId}>
                                Copy
                            </button>
                        </div>
                    </div>

                    {/* Upload License Card */}
                    <div className="card upload-card">
                        <div className="card-header">
                            <h2>Upload License</h2>
                        </div>
                        <p className="upload-description">
                            Upload a new license file (.lic) to activate or renew your license.
                        </p>

                        {error && (
                            <div className="error-message">{error}</div>
                        )}

                        {uploadError && (
                            <div className="error-message">{uploadError}</div>
                        )}

                        {uploadSuccess && (
                            <div className="success-message">
                                License uploaded successfully!
                            </div>
                        )}

                        <div className="upload-area">
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".lic,.json"
                                onChange={handleFileSelect}
                                disabled={uploading}
                                className="file-input"
                                id="license-file"
                            />
                            <label htmlFor="license-file" className="upload-label">
                                <span className="upload-icon">📁</span>
                                <span>{uploading ? 'Uploading...' : 'Choose License File'}</span>
                            </label>
                        </div>

                        <div className="upload-help">
                            <h4>Need a license?</h4>
                            <p>Contact your vendor with the Machine ID above to obtain a license file.</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

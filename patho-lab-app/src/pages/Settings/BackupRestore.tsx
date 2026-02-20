import { useState } from 'react';
import { useToastStore } from '../../stores/toastStore';
import './BackupRestore.css';

export default function BackupRestorePage() {
    const [backupLoading, setBackupLoading] = useState(false);
    const [restoreLoading, setRestoreLoading] = useState(false);
    const [integrityLoading, setIntegrityLoading] = useState(false);
    const [integrityResult, setIntegrityResult] = useState<{
        success: boolean;
        results: string[];
        foreignKeyErrors: any[];
    } | null>(null);
    const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);
    const showToast = useToastStore(s => s.showToast);

    const handleBackup = async () => {
        if (!window.electronAPI) return;
        setBackupLoading(true);
        try {
            const result = await window.electronAPI.backup.create();
            if (result.success) {
                showToast(`Backup saved to: ${result.filePath}`, 'success');
            } else if (result.error !== 'Backup cancelled') {
                showToast(`Backup failed: ${result.error}`, 'error');
            }
        } catch (e: any) {
            showToast(`Backup error: ${e.message}`, 'error');
        }
        setBackupLoading(false);
    };

    const handleRestore = async () => {
        if (!window.electronAPI) return;
        setShowRestoreConfirm(false);
        setRestoreLoading(true);
        try {
            const result = await window.electronAPI.backup.restore();
            if (result.success) {
                showToast('Database restored successfully! Reloading...', 'success');
                setTimeout(() => window.location.reload(), 1500);
            } else if (result.error !== 'Restore cancelled') {
                showToast(`Restore failed: ${result.error}`, 'error');
            }
        } catch (e: any) {
            showToast(`Restore error: ${e.message}`, 'error');
        }
        setRestoreLoading(false);
    };

    const handleIntegrityCheck = async () => {
        if (!window.electronAPI) return;
        setIntegrityLoading(true);
        try {
            const result = await window.electronAPI.backup.checkIntegrity();
            setIntegrityResult(result);
        } catch (e: any) {
            showToast(`Integrity check error: ${e.message}`, 'error');
        }
        setIntegrityLoading(false);
    };

    return (
        <div className="backup-page">
            <h1 className="page-title">Backup & Restore</h1>

            <div className="backup-grid">
                {/* Backup Section */}
                <div className="backup-card">
                    <div className="card-icon">💾</div>
                    <h2>Create Backup</h2>
                    <p className="card-desc">
                        Export a complete copy of your database to a file.
                        Keep backups regularly to protect against data loss.
                    </p>
                    <button
                        className="btn btn-primary"
                        onClick={handleBackup}
                        disabled={backupLoading}
                    >
                        {backupLoading ? 'Creating Backup...' : '💾 Create Backup'}
                    </button>
                </div>

                {/* Restore Section */}
                <div className="backup-card">
                    <div className="card-icon">📂</div>
                    <h2>Restore from Backup</h2>
                    <p className="card-desc">
                        Replace your current database with a backup file.
                        <strong> Warning: This will overwrite all current data!</strong>
                    </p>
                    {!showRestoreConfirm ? (
                        <button
                            className="btn btn-warning"
                            onClick={() => setShowRestoreConfirm(true)}
                            disabled={restoreLoading}
                        >
                            {restoreLoading ? 'Restoring...' : '📂 Restore Backup'}
                        </button>
                    ) : (
                        <div className="confirm-panel">
                            <p className="confirm-text">⚠️ Are you sure? All current data will be replaced.</p>
                            <div className="confirm-actions">
                                <button className="btn btn-danger" onClick={handleRestore}>
                                    Yes, Restore
                                </button>
                                <button className="btn btn-secondary" onClick={() => setShowRestoreConfirm(false)}>
                                    Cancel
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Integrity Check Section */}
                <div className="backup-card">
                    <div className="card-icon">🔍</div>
                    <h2>Database Health Check</h2>
                    <p className="card-desc">
                        Run SQLite integrity and foreign key checks to verify
                        your database is healthy and corruption-free.
                    </p>
                    <button
                        className="btn btn-secondary"
                        onClick={handleIntegrityCheck}
                        disabled={integrityLoading}
                    >
                        {integrityLoading ? 'Checking...' : '🔍 Check Database'}
                    </button>

                    {integrityResult && (
                        <div className={`integrity-result ${integrityResult.success ? 'pass' : 'fail'}`}>
                            <div className="result-badge">
                                {integrityResult.success ? '✅ Database is healthy' : '❌ Issues detected'}
                            </div>
                            {integrityResult.results.map((r, i) => (
                                <div key={i} className="result-line">{r}</div>
                            ))}
                            {integrityResult.foreignKeyErrors.length > 0 && (
                                <div className="fk-errors">
                                    <strong>Foreign Key Errors: {integrityResult.foreignKeyErrors.length}</strong>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

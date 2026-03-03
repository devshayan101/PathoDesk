import { useState, useEffect, useRef } from 'react';
import { useToastStore } from '../../stores/toastStore';
import './Admin.css';

interface User {
    id: number;
    username: string;
    full_name: string;
    role_id: number;
    role_name: string;
    is_active: number;
    created_at: string;
    qualification: string | null;
    signature: string | null;
}

interface Role {
    id: number;
    name: string;
}

type AdminTab = 'users' | 'lab';

export default function AdminPage() {
    const [activeTab, setActiveTab] = useState<AdminTab>('users');
    const [users, setUsers] = useState<User[]>([]);
    const [roles, setRoles] = useState<Role[]>([]);
    const [showForm, setShowForm] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [formData, setFormData] = useState({
        username: '',
        password: '',
        fullName: '',
        roleId: 2,
        qualification: '',
        signature: '' as string,
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const showToast = useToastStore(s => s.showToast);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Lab Settings State
    const [labSettings, setLabSettings] = useState<Record<string, string>>({});
    const [labLoading, setLabLoading] = useState(false);
    const [labSaving, setLabSaving] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    useEffect(() => {
        if (activeTab === 'lab' && Object.keys(labSettings).length === 0) {
            loadLabSettings();
        }
    }, [activeTab]);

    const loadData = async () => {
        setLoading(true);
        try {
            if (window.electronAPI) {
                const [usersData, rolesData] = await Promise.all([
                    window.electronAPI.users.list(),
                    window.electronAPI.users.listRoles()
                ]);
                setUsers(usersData);
                setRoles(rolesData);
            }
        } catch (e) {
            console.error('Failed to load users:', e);
        }
        setLoading(false);
    };

    const loadLabSettings = async () => {
        setLabLoading(true);
        try {
            if (window.electronAPI) {
                const data = await window.electronAPI.labSettings.get();
                setLabSettings(data);
            }
        } catch (e) {
            console.error('Failed to load lab settings:', e);
        }
        setLabLoading(false);
    };

    const handleSaveLabSettings = async () => {
        setLabSaving(true);
        try {
            if (window.electronAPI) {
                const keys = Object.keys(labSettings);
                for (const key of keys) {
                    await window.electronAPI.labSettings.update(key, labSettings[key]);
                }
                showToast('Lab settings saved successfully', 'success');
            }
        } catch (e) {
            console.error('Failed to save lab settings:', e);
            showToast('Failed to save lab settings', 'error');
        }
        setLabSaving(false);
    };

    const updateLabSetting = (key: string, value: string) => {
        setLabSettings(prev => ({ ...prev, [key]: value }));
    };

    const resetForm = () => {
        setFormData({ username: '', password: '', fullName: '', roleId: 2, qualification: '', signature: '' });
        setEditingUser(null);
        setError(null);
    };

    const openCreateForm = () => {
        resetForm();
        setShowForm(true);
    };

    const openEditForm = (user: User) => {
        setEditingUser(user);
        setFormData({
            username: user.username,
            password: '',
            fullName: user.full_name,
            roleId: user.role_id,
            qualification: user.qualification || '',
            signature: user.signature || '',
        });
        setError(null);
        setShowForm(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        try {
            if (window.electronAPI) {
                if (editingUser) {
                    // Update existing user
                    const updateData: any = {
                        fullName: formData.fullName,
                        roleId: formData.roleId,
                        qualification: formData.qualification,
                        signature: formData.signature,
                    };
                    if (formData.password) {
                        updateData.password = formData.password;
                    }
                    const result = await window.electronAPI.users.update(editingUser.id, updateData);
                    if (result.success) {
                        setShowForm(false);
                        resetForm();
                        await loadData();
                        showToast('User updated successfully', 'success');
                    } else {
                        setError(result.error || 'Failed to update user');
                    }
                } else {
                    // Create new user
                    const result = await window.electronAPI.users.create(formData);
                    if (result.success) {
                        setShowForm(false);
                        resetForm();
                        await loadData();
                        showToast('User created successfully', 'success');
                    } else {
                        setError(result.error || 'Failed to create user');
                    }
                }
            }
        } catch (e: any) {
            setError(e.message);
        }
    };

    const handleDelete = async (user: User) => {
        if (user.username === 'admin') return;
        if (!confirm(`Are you sure you want to delete user "${user.full_name}"?`)) return;

        try {
            if (window.electronAPI) {
                const result = await window.electronAPI.users.delete(user.id);
                if (result.success) {
                    await loadData();
                    showToast('User deleted', 'success');
                } else {
                    showToast(result.error || 'Failed to delete user', 'error');
                }
            }
        } catch (e) {
            console.error('Failed to delete user:', e);
        }
    };

    const handleToggleActive = async (userId: number) => {
        try {
            if (window.electronAPI) {
                await window.electronAPI.users.toggleActive(userId);
                await loadData();
            }
        } catch (e) {
            console.error('Failed to toggle user:', e);
        }
    };

    const handleSignatureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            showToast('Please select an image file', 'error');
            return;
        }

        if (file.size > 500 * 1024) { // 500KB limit
            showToast('Signature image must be under 500KB', 'error');
            return;
        }

        const reader = new FileReader();
        reader.onload = () => {
            setFormData(prev => ({ ...prev, signature: reader.result as string }));
        };
        reader.readAsDataURL(file);
    };

    const getRoleLabel = (roleName: string): string => {
        const labels: Record<string, string> = {
            admin: 'Administrator',
            receptionist: 'Receptionist',
            technician: 'Lab Technician',
            pathologist: 'Pathologist',
            auditor: 'Auditor'
        };
        return labels[roleName] || roleName;
    };

    const labSettingsFields = [
        { key: 'lab_name', label: 'Lab Name', type: 'text', placeholder: 'PathoCare Diagnostics' },
        { key: 'address_line1', label: 'Address Line 1', type: 'text', placeholder: '123 Medical Complex, Main Road' },
        { key: 'address_line2', label: 'Address Line 2', type: 'text', placeholder: 'City - 400001' },
        { key: 'phone', label: 'Phone', type: 'text', placeholder: '+91 98765 43210' },
        { key: 'email', label: 'Email', type: 'email', placeholder: 'reports@pathocare.com' },
        { key: 'nabl_accreditation', label: 'NABL Accreditation', type: 'text', placeholder: 'NABL-MC-XXXX' },
        { key: 'report_footer', label: 'Report Footer', type: 'textarea', placeholder: 'This report is electronically generated...' },
        { key: 'disclaimer', label: 'Disclaimer', type: 'textarea', placeholder: 'Results should be correlated with clinical findings...' },
    ];

    return (
        <div className="admin-page">
            {/* Tabbed Navigation */}
            <div className="admin-tabs">
                <button
                    className={`admin-tab ${activeTab === 'users' ? 'active' : ''}`}
                    onClick={() => setActiveTab('users')}
                >
                    👤 User Management
                </button>
                <button
                    className={`admin-tab ${activeTab === 'lab' ? 'active' : ''}`}
                    onClick={() => setActiveTab('lab')}
                >
                    🏥 Lab Details
                </button>
            </div>

            {/* User Management Tab */}
            {activeTab === 'users' && (
                <>
                    <div className="page-header">
                        <h1 className="page-title">User Management</h1>
                        <button className="btn btn-primary" onClick={openCreateForm}>
                            + New User
                        </button>
                    </div>

                    {showForm && (
                        <div className="modal-overlay">
                            <div className="modal user-form-modal">
                                <h2>{editingUser ? 'Edit User' : 'Create New User'}</h2>

                                {error && (
                                    <div className="error-banner">
                                        {error}
                                        <button type="button" onClick={() => setError(null)}>×</button>
                                    </div>
                                )}

                                <form onSubmit={handleSubmit}>
                                    <div className="form-row">
                                        <div className="form-group">
                                            <label>Username</label>
                                            <input
                                                className="input"
                                                value={formData.username}
                                                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                                required
                                                autoFocus
                                                disabled={!!editingUser}
                                                style={editingUser ? { opacity: 0.6, cursor: 'not-allowed' } : {}}
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label>Full Name</label>
                                            <input
                                                className="input"
                                                value={formData.fullName}
                                                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div className="form-row">
                                        <div className="form-group">
                                            <label>{editingUser ? 'New Password (leave blank to keep)' : 'Password'}</label>
                                            <input
                                                className="input"
                                                type="password"
                                                value={formData.password}
                                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                                required={!editingUser}
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label>Role</label>
                                            <select
                                                className="input"
                                                value={formData.roleId}
                                                onChange={(e) => setFormData({ ...formData, roleId: Number(e.target.value) })}
                                            >
                                                {roles.map(role => (
                                                    <option key={role.id} value={role.id}>{getRoleLabel(role.name)}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    <div className="form-row">
                                        <div className="form-group">
                                            <label>Qualification</label>
                                            <input
                                                className="input"
                                                value={formData.qualification}
                                                onChange={(e) => setFormData({ ...formData, qualification: e.target.value })}
                                                placeholder="e.g. DMLT, MD Pathology"
                                            />
                                        </div>
                                    </div>

                                    <div className="form-row">
                                        <div className="form-group full-width">
                                            <label>Signature</label>
                                            <div className="signature-upload-area">
                                                {formData.signature ? (
                                                    <div className="signature-preview">
                                                        <img src={formData.signature} alt="Signature" style={{ maxHeight: 80, maxWidth: 200 }} />
                                                        <button type="button" className="btn btn-sm btn-secondary" onClick={() => {
                                                            setFormData(prev => ({ ...prev, signature: '' }));
                                                            if (fileInputRef.current) fileInputRef.current.value = '';
                                                        }}>
                                                            Remove
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className="signature-placeholder" onClick={() => fileInputRef.current?.click()}>
                                                        📝 Click to upload signature image (PNG/JPG, max 500KB)
                                                    </div>
                                                )}
                                                <input
                                                    ref={fileInputRef}
                                                    type="file"
                                                    accept="image/*"
                                                    onChange={handleSignatureUpload}
                                                    style={{ display: 'none' }}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="form-actions">
                                        <button type="submit" className="btn btn-primary">
                                            {editingUser ? 'Update User' : 'Create User'}
                                        </button>
                                        <button type="button" className="btn btn-secondary" onClick={() => { setShowForm(false); resetForm(); }}>
                                            Cancel
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}

                    <div className="users-table-container">
                        {loading ? <div className="loading">Loading users...</div> : (
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th>Username</th>
                                        <th>Full Name</th>
                                        <th>Role</th>
                                        <th>Qualification</th>
                                        <th>Status</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {users.length === 0 ? (
                                        <tr><td colSpan={6} className="empty">No users found</td></tr>
                                    ) : (
                                        users.map(user => (
                                            <tr key={user.id}>
                                                <td><code>{user.username}</code></td>
                                                <td>{user.full_name}</td>
                                                <td>
                                                    <span className={`badge badge-${user.role_name === 'admin' ? 'error' : 'info'}`}>
                                                        {getRoleLabel(user.role_name)}
                                                    </span>
                                                </td>
                                                <td>{user.qualification || '—'}</td>
                                                <td>
                                                    <span className={`badge ${user.is_active ? 'badge-success' : 'badge-warning'}`}>
                                                        {user.is_active ? 'Active' : 'Inactive'}
                                                    </span>
                                                </td>
                                                <td>
                                                    <div style={{ display: 'flex', gap: '6px' }}>
                                                        <button
                                                            className="btn btn-secondary btn-sm"
                                                            onClick={() => openEditForm(user)}
                                                            title="Edit user"
                                                        >
                                                            ✏️
                                                        </button>
                                                        {user.username !== 'admin' && (
                                                            <>
                                                                <button
                                                                    className="btn btn-secondary btn-sm"
                                                                    onClick={() => handleToggleActive(user.id)}
                                                                >
                                                                    {user.is_active ? 'Disable' : 'Enable'}
                                                                </button>
                                                                <button
                                                                    className="btn btn-sm"
                                                                    style={{ background: '#ef4444', color: '#fff' }}
                                                                    onClick={() => handleDelete(user)}
                                                                    title="Delete user"
                                                                >
                                                                    🗑️
                                                                </button>
                                                            </>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        )}
                    </div>
                </>
            )}

            {/* Lab Details Tab */}
            {activeTab === 'lab' && (
                <div className="lab-settings-section">
                    <div className="page-header">
                        <h1 className="page-title">Lab Details</h1>
                        <button
                            className="btn btn-primary"
                            onClick={handleSaveLabSettings}
                            disabled={labSaving}
                        >
                            {labSaving ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>

                    {labLoading ? (
                        <div className="loading">Loading lab settings...</div>
                    ) : (
                        <div className="lab-settings-form">
                            <div className="lab-settings-card">
                                <h3 className="card-section-title">Lab Information</h3>
                                <div className="settings-grid">
                                    {labSettingsFields.slice(0, 6).map(field => (
                                        <div key={field.key} className={`form-group ${field.key === 'lab_name' ? 'full-width' : ''}`}>
                                            <label>{field.label}</label>
                                            <input
                                                className="input"
                                                type={field.type}
                                                value={labSettings[field.key] || ''}
                                                onChange={(e) => updateLabSetting(field.key, e.target.value)}
                                                placeholder={field.placeholder}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="lab-settings-card">
                                <h3 className="card-section-title">Report Configuration</h3>
                                <div className="settings-grid">
                                    {labSettingsFields.slice(6).map(field => (
                                        <div key={field.key} className="form-group full-width">
                                            <label>{field.label}</label>
                                            <textarea
                                                className="input"
                                                value={labSettings[field.key] || ''}
                                                onChange={(e) => updateLabSetting(field.key, e.target.value)}
                                                placeholder={field.placeholder}
                                                rows={3}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

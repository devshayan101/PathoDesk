import { useState, useEffect } from 'react';
import './Admin.css';

interface User {
    id: number;
    username: string;
    full_name: string;
    role_name: string;
    is_active: number;
    created_at: string;
}

interface Role {
    id: number;
    name: string;
}

export default function AdminPage() {
    const [users, setUsers] = useState<User[]>([]);
    const [roles, setRoles] = useState<Role[]>([]);
    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState({
        username: '',
        password: '',
        fullName: '',
        roleId: 2,
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadData();
    }, []);

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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        try {
            if (window.electronAPI) {
                const result = await window.electronAPI.users.create(formData);
                if (result.success) {
                    setShowForm(false);
                    setFormData({ username: '', password: '', fullName: '', roleId: 2 });
                    await loadData();
                } else {
                    setError(result.error || 'Failed to create user');
                }
            }
        } catch (e: any) {
            setError(e.message);
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

    return (
        <div className="admin-page">
            <div className="page-header">
                <h1 className="page-title">User Management</h1>
                <button className="btn btn-primary" onClick={() => setShowForm(true)}>
                    + New User
                </button>
            </div>

            {showForm && (
                <div className="modal-overlay">
                    <div className="modal user-form-modal">
                        <h2>Create New User</h2>

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
                                    <label>Password</label>
                                    <input
                                        className="input"
                                        type="password"
                                        value={formData.password}
                                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                        required
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

                            <div className="form-actions">
                                <button type="submit" className="btn btn-primary">Create User</button>
                                <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>
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
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.length === 0 ? (
                                <tr><td colSpan={5} className="empty">No users found</td></tr>
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
                                        <td>
                                            <span className={`badge ${user.is_active ? 'badge-success' : 'badge-warning'}`}>
                                                {user.is_active ? 'Active' : 'Inactive'}
                                            </span>
                                        </td>
                                        <td>
                                            {user.username !== 'admin' && (
                                                <button
                                                    className="btn btn-secondary btn-sm"
                                                    onClick={() => handleToggleActive(user.id)}
                                                >
                                                    {user.is_active ? 'Disable' : 'Enable'}
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}

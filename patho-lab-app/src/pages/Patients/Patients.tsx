import { useState, useEffect } from 'react';
import './Patients.css';

interface Patient {
    id: number;
    patient_uid: string;
    full_name: string;
    dob: string;
    gender: string;
    phone: string | null;
}

export default function PatientsPage() {
    const [patients, setPatients] = useState<Patient[]>([]);
    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState({
        fullName: '', gender: 'M', dob: '', phone: '', address: ''
    });
    const [loading, setLoading] = useState(true);

    // Load patients on mount
    useEffect(() => {
        loadPatients();
    }, []);

    const loadPatients = async () => {
        setLoading(true);
        try {
            if (window.electronAPI) {
                const data = await window.electronAPI.patients.list();
                setPatients(data);
            }
        } catch (e) {
            console.error('Failed to load patients:', e);
        }
        setLoading(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (window.electronAPI) {
                await window.electronAPI.patients.create(formData);
                await loadPatients();
            }
            setShowForm(false);
            setFormData({ fullName: '', gender: 'M', dob: '', phone: '', address: '' });
        } catch (e) {
            console.error('Failed to create patient:', e);
        }
    };

    return (
        <div className="patients-page">
            <div className="page-header">
                <h1 className="page-title">Patients</h1>
                <button className="btn btn-primary" onClick={() => setShowForm(true)}>
                    + New Patient
                </button>
            </div>

            {showForm && (
                <div className="modal-overlay">
                    <div className="modal patient-form-modal">
                        <h2>Patient Registration</h2>
                        <p className="form-subtitle">Patient ID: AUTO-GENERATED</p>

                        <form onSubmit={handleSubmit}>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Name</label>
                                    <input
                                        className="input"
                                        value={formData.fullName}
                                        onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                                        required
                                        autoFocus
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Gender</label>
                                    <select
                                        className="input"
                                        value={formData.gender}
                                        onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                                    >
                                        <option value="M">Male</option>
                                        <option value="F">Female</option>
                                        <option value="O">Other</option>
                                    </select>
                                </div>
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label>DOB</label>
                                    <input
                                        className="input"
                                        type="date"
                                        value={formData.dob}
                                        onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Phone</label>
                                    <input
                                        className="input"
                                        value={formData.phone}
                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="form-group">
                                <label>Address</label>
                                <input
                                    className="input"
                                    value={formData.address}
                                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                />
                            </div>

                            <div className="form-actions">
                                <button type="submit" className="btn btn-primary">Save Patient</button>
                                <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Patient list */}
            <div className="patients-table-container">
                {loading ? (
                    <div className="loading">Loading patients...</div>
                ) : (
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Patient ID</th>
                                <th>Name</th>
                                <th>Gender</th>
                                <th>DOB</th>
                                <th>Phone</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {patients.length === 0 ? (
                                <tr><td colSpan={6} className="empty">No patients found</td></tr>
                            ) : (
                                patients.map(patient => (
                                    <tr key={patient.id}>
                                        <td><code>{patient.patient_uid}</code></td>
                                        <td>{patient.full_name}</td>
                                        <td>{patient.gender}</td>
                                        <td>{patient.dob}</td>
                                        <td>{patient.phone || '—'}</td>
                                        <td>
                                            <button className="btn btn-secondary btn-sm">Create Order</button>
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

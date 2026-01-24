import { useState } from 'react';
import './Patients.css';

// Mock patient data
const mockPatients = [
    { id: 'PID-10231', name: 'Rahul Sharma', gender: 'M', dob: '1985-03-15', phone: '9876543210' },
    { id: 'PID-10232', name: 'Anita Patel', gender: 'F', dob: '1990-07-22', phone: '9876543211' },
    { id: 'PID-10233', name: 'Vikram Singh', gender: 'M', dob: '1978-11-08', phone: '9876543212' },
];

export default function PatientsPage() {
    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState({
        name: '', gender: 'M', dob: '', phone: '', address: ''
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        console.log('Save patient:', formData);
        setShowForm(false);
        setFormData({ name: '', gender: 'M', dob: '', phone: '', address: '' });
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
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
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
                        {mockPatients.map(patient => (
                            <tr key={patient.id}>
                                <td><code>{patient.id}</code></td>
                                <td>{patient.name}</td>
                                <td>{patient.gender}</td>
                                <td>{patient.dob}</td>
                                <td>{patient.phone}</td>
                                <td>
                                    <button className="btn btn-secondary btn-sm">Create Order</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

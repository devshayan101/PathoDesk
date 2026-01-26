import { useState, useEffect } from 'react';
import './Doctors.css';

interface Doctor {
    id: number;
    doctor_code: string;
    name: string;
    specialty?: string;
    phone?: string;
    clinic_address?: string;
    is_active: number;
}

export default function DoctorsPage() {
    const [doctors, setDoctors] = useState<Doctor[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingDoctor, setEditingDoctor] = useState<Doctor | null>(null);
    const [formData, setFormData] = useState({
        doctorCode: '',
        name: '',
        specialty: '',
        phone: '',
        clinicAddress: ''
    });

    useEffect(() => {
        loadDoctors();
    }, []);

    const loadDoctors = async () => {
        setLoading(true);
        try {
            if (window.electronAPI) {
                const data = await window.electronAPI.doctors.listAll();
                setDoctors(data);
            }
        } catch (e) {
            console.error('Failed to load doctors:', e);
        }
        setLoading(false);
    };

    const handleOpenModal = (doctor?: Doctor) => {
        if (doctor) {
            setEditingDoctor(doctor);
            setFormData({
                doctorCode: doctor.doctor_code,
                name: doctor.name,
                specialty: doctor.specialty || '',
                phone: doctor.phone || '',
                clinicAddress: doctor.clinic_address || ''
            });
        } else {
            setEditingDoctor(null);
            setFormData({
                doctorCode: '',
                name: '',
                specialty: '',
                phone: '',
                clinicAddress: ''
            });
        }
        setShowModal(true);
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setEditingDoctor(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!window.electronAPI) return;

        try {
            if (editingDoctor) {
                await window.electronAPI.doctors.update(editingDoctor.id, formData);
            } else {
                await window.electronAPI.doctors.create(formData);
            }
            handleCloseModal();
            loadDoctors();
        } catch (e) {
            console.error('Save error:', e);
        }
    };

    const handleToggleActive = async (id: number) => {
        if (!window.electronAPI) return;
        await window.electronAPI.doctors.toggleActive(id);
        loadDoctors();
    };

    return (
        <div className="doctors-page">
            <div className="page-header">
                <h1>Referring Doctors</h1>
                <button className="btn btn-primary" onClick={() => handleOpenModal()}>
                    + Add Doctor
                </button>
            </div>

            <div className="card">
                {loading ? (
                    <div className="loading">Loading doctors...</div>
                ) : (
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Code</th>
                                <th>Name</th>
                                <th>Specialty</th>
                                <th>Phone</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {doctors.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="empty-row">No doctors found</td>
                                </tr>
                            ) : (
                                doctors.map(doctor => (
                                    <tr key={doctor.id} className={doctor.is_active ? '' : 'inactive-row'}>
                                        <td><code>{doctor.doctor_code}</code></td>
                                        <td>{doctor.name}</td>
                                        <td>{doctor.specialty || '—'}</td>
                                        <td>{doctor.phone || '—'}</td>
                                        <td>
                                            <span className={`badge ${doctor.is_active ? 'badge-success' : 'badge-secondary'}`}>
                                                {doctor.is_active ? 'Active' : 'Inactive'}
                                            </span>
                                        </td>
                                        <td>
                                            <button
                                                className="btn btn-sm btn-secondary"
                                                onClick={() => handleOpenModal(doctor)}
                                            >
                                                Edit
                                            </button>
                                            <button
                                                className="btn btn-sm btn-warning"
                                                onClick={() => handleToggleActive(doctor.id)}
                                            >
                                                {doctor.is_active ? 'Deactivate' : 'Activate'}
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Add/Edit Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={handleCloseModal}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>{editingDoctor ? 'Edit Doctor' : 'Add New Doctor'}</h2>
                            <button className="close-btn" onClick={handleCloseModal}>×</button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="form-grid">
                                <div className="form-group">
                                    <label>Doctor Code *</label>
                                    <input
                                        type="text"
                                        className="input"
                                        value={formData.doctorCode}
                                        onChange={e => setFormData({ ...formData, doctorCode: e.target.value })}
                                        placeholder="DR001"
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Name *</label>
                                    <input
                                        type="text"
                                        className="input"
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        placeholder="Dr. Name"
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Specialty</label>
                                    <input
                                        type="text"
                                        className="input"
                                        value={formData.specialty}
                                        onChange={e => setFormData({ ...formData, specialty: e.target.value })}
                                        placeholder="General Physician"
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Phone</label>
                                    <input
                                        type="text"
                                        className="input"
                                        value={formData.phone}
                                        onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                        placeholder="+91 98765 43210"
                                    />
                                </div>
                                <div className="form-group full-width">
                                    <label>Clinic Address</label>
                                    <textarea
                                        className="input"
                                        value={formData.clinicAddress}
                                        onChange={e => setFormData({ ...formData, clinicAddress: e.target.value })}
                                        placeholder="Clinic address..."
                                        rows={2}
                                    />
                                </div>
                            </div>
                            <div className="modal-actions">
                                <button type="button" className="btn btn-secondary" onClick={handleCloseModal}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn btn-primary">
                                    {editingDoctor ? 'Update' : 'Add Doctor'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

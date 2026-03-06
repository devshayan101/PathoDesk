import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToastStore } from '../../stores/toastStore';
import ConfirmDialog from '../../components/ConfirmDialog/ConfirmDialog';
import './Patients.css';

interface Patient {
    id: number;
    patient_uid: string;
    full_name: string;
    dob: string;
    gender: string;
    phone: string | null;
    address: string | null;
}

export default function PatientsPage() {
    const navigate = useNavigate();
    const showToast = useToastStore(s => s.showToast);
    const [patients, setPatients] = useState<Patient[]>([]);
    const [showForm, setShowForm] = useState(false);
    const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
    const [formData, setFormData] = useState({
        fullName: '', gender: 'M', dob: '', phone: '', address: '', age: '', ageUnit: 'Years'
    });
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('');
    const [orderHistoryModal, setOrderHistoryModal] = useState<{ patient: Patient; orders: any[] } | null>(null);
    const [confirmDialog, setConfirmDialog] = useState<{
        title: string; message: string; confirmLabel: string;
        variant: 'danger' | 'warning' | 'default'; onConfirm: () => void;
    } | null>(null);

    useEffect(() => { loadPatients(); }, []);

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

    const filteredPatients = patients.filter(p =>
        p.full_name.toLowerCase().includes(filter.toLowerCase()) ||
        p.patient_uid.toLowerCase().includes(filter.toLowerCase()) ||
        (p.phone && p.phone.includes(filter))
    );

    const calculateAgeFromDob = (dob: string) => {
        if (!dob) return { age: '', unit: 'Years' };
        const birthDate = new Date(dob);
        const today = new Date();
        const diffTime = Math.abs(today.getTime() - birthDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays < 30) return { age: diffDays.toString(), unit: 'Days' };
        if (diffDays < 365) return { age: Math.floor(diffDays / 30.44).toString(), unit: 'Months' };
        return { age: Math.floor(diffDays / 365.25).toString(), unit: 'Years' };
    };

    const calculateDobFromAge = (age: string, unit: string) => {
        if (!age) return '';
        const today = new Date();
        const info = parseInt(age);
        if (isNaN(info)) return '';

        if (unit === 'Years') today.setFullYear(today.getFullYear() - info);
        else if (unit === 'Months') today.setMonth(today.getMonth() - info);
        else if (unit === 'Days') today.setDate(today.getDate() - info);

        return today.toISOString().split('T')[0];
    };

    const openNewForm = () => {
        setEditingPatient(null);
        setFormData({ fullName: '', gender: 'M', dob: '', phone: '', address: '', age: '', ageUnit: 'Years' });
        setShowForm(true);
    };

    const openEditForm = (patient: Patient) => {
        const { age, unit } = calculateAgeFromDob(patient.dob);
        setEditingPatient(patient);
        setFormData({
            fullName: patient.full_name,
            gender: patient.gender,
            dob: patient.dob,
            phone: patient.phone || '',
            address: patient.address || '',
            age,
            ageUnit: unit
        });
        setShowForm(true);
    };

    const handleAgeChange = (val: string, unit: string) => {
        const dob = calculateDobFromAge(val, unit);
        setFormData(prev => ({ ...prev, age: val, ageUnit: unit, dob }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            // Ensure DOB is set from age if not already
            let finalDob = formData.dob;
            if (!finalDob && formData.age) {
                finalDob = calculateDobFromAge(formData.age, formData.ageUnit);
            }

            const submitData = {
                fullName: formData.fullName,
                gender: formData.gender,
                dob: finalDob,
                phone: formData.phone,
                address: formData.address
            };

            if (window.electronAPI) {
                if (editingPatient) {
                    const result = await window.electronAPI.patients.update(editingPatient.id, submitData);
                    if (!result.success) {
                        showToast(result.error || 'Failed to update patient', 'error');
                        return;
                    }
                    showToast('Patient updated', 'success');
                } else {
                    await window.electronAPI.patients.create(submitData);
                    showToast('Patient created', 'success');
                }
                await loadPatients();
            }
            setShowForm(false);
            setEditingPatient(null);
        } catch (e: any) {
            showToast('Error: ' + e.message, 'error');
        }
    };

    const handleDelete = (patient: Patient) => {
        setConfirmDialog({
            title: 'Delete Patient',
            message: `Delete patient "${patient.full_name}" (${patient.patient_uid})? This cannot be undone.`,
            confirmLabel: 'Delete',
            variant: 'danger',
            onConfirm: async () => {
                setConfirmDialog(null);
                try {
                    if (window.electronAPI) {
                        const result = await window.electronAPI.patients.delete(patient.id);
                        if (!result.success) {
                            showToast(result.error || 'Failed to delete patient', 'error');
                            return;
                        }
                        showToast('Patient deleted', 'success');
                        await loadPatients();
                    }
                } catch (e: any) {
                    showToast('Error: ' + e.message, 'error');
                }
            }
        });
    };

    const handleViewOrders = async (patient: Patient) => {
        try {
            if (window.electronAPI) {
                const orders = await window.electronAPI.orders.getByPatient(patient.id);
                setOrderHistoryModal({ patient, orders });
            }
        } catch (e: any) {
            showToast('Failed to load orders: ' + e.message, 'error');
        }
    };

    return (
        <div className="patients-page">
            <div className="page-header">
                <h1 className="page-title">Patients</h1>
                <div className="header-actions">
                    <input type="text" placeholder="Search patients..."
                        className="search-input" value={filter}
                        onChange={e => setFilter(e.target.value)} />
                    <button className="btn btn-primary" onClick={openNewForm}>+ New Patient</button>
                </div>
            </div>

            {showForm && (
                <div className="modal-overlay">
                    <div className="modal patient-form-modal">
                        <h2>{editingPatient ? 'Edit Patient' : 'Patient Registration'}</h2>
                        {!editingPatient && <p className="form-subtitle">Patient ID: AUTO-GENERATED</p>}
                        {editingPatient && <p className="form-subtitle">Patient ID: {editingPatient.patient_uid}</p>}

                        <form onSubmit={handleSubmit}>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Name</label>
                                    <input className="input" value={formData.fullName}
                                        onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                                        required autoFocus />
                                </div>
                                <div className="form-group">
                                    <label>Gender</label>
                                    <select className="input" value={formData.gender}
                                        onChange={(e) => setFormData({ ...formData, gender: e.target.value })}>
                                        <option value="M">Male</option>
                                        <option value="F">Female</option>
                                        <option value="O">Other</option>
                                    </select>
                                </div>
                            </div>

                            <div className="form-row">
                                <div className="form-group" style={{ flex: 1 }}>
                                    <label>Age</label>
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        <input className="input" type="number" value={formData.age}
                                            onChange={(e) => handleAgeChange(e.target.value, formData.ageUnit)}
                                            required placeholder="0" min="0" />
                                        <select className="input" value={formData.ageUnit}
                                            style={{ width: '100px' }}
                                            onChange={(e) => handleAgeChange(formData.age, e.target.value)}>
                                            <option>Years</option>
                                            <option>Months</option>
                                            <option>Days</option>
                                        </select>
                                    </div>
                                    <small className="text-muted" style={{ fontSize: '0.75rem' }}>
                                        DOB: {formData.dob || '—'}
                                    </small>
                                </div>
                                <div className="form-group" style={{ flex: 1 }}>
                                    <label>Phone</label>
                                    <input className="input" value={formData.phone}
                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
                                </div>
                            </div>

                            <div className="form-group">
                                <label>Address</label>
                                <input className="input" value={formData.address}
                                    onChange={(e) => setFormData({ ...formData, address: e.target.value })} />
                            </div>

                            <div className="form-actions">
                                <button type="submit" className="btn btn-primary">
                                    {editingPatient ? 'Update Patient' : 'Save Patient'}
                                </button>
                                <button type="button" className="btn btn-secondary" onClick={() => { setShowForm(false); setEditingPatient(null); }}>
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
                                <th>Age / DOB</th>
                                <th>Phone</th>
                                <th style={{ textAlign: 'center' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredPatients.length === 0 ? (
                                <tr><td colSpan={6} className="empty">No patients found</td></tr>
                            ) : (
                                filteredPatients.map(patient => {
                                    const { age, unit } = calculateAgeFromDob(patient.dob);
                                    return (
                                        <tr key={patient.id}>
                                            <td><code>{patient.patient_uid}</code></td>
                                            <td>{patient.full_name}</td>
                                            <td>{patient.gender === 'M' ? 'Male' : patient.gender === 'F' ? 'Female' : 'Other'}</td>
                                            <td>
                                                {age} {unit}
                                                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{patient.dob}</div>
                                            </td>
                                            <td>{patient.phone || '—'}</td>
                                            <td>
                                                <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'center' }}>
                                                    <button className="btn btn-secondary btn-sm" onClick={() => openEditForm(patient)}
                                                        title="Edit Patient">✎</button>
                                                    <button className="btn btn-secondary btn-sm" onClick={() => handleDelete(patient)}
                                                        title="Delete Patient" style={{ color: 'var(--color-error)' }}>✕</button>
                                                    <button className="btn btn-secondary btn-sm" onClick={() => handleViewOrders(patient)}
                                                        title="View Patient Orders">📋 Orders</button>
                                                    <button className="btn btn-secondary btn-sm" onClick={() => navigate('/orders', { state: { newOrderForPatientId: patient.id } })}
                                                        title="Create New Order for Patient">+ Order</button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                )}
            </div>

            {confirmDialog && (
                <ConfirmDialog
                    title={confirmDialog.title}
                    message={confirmDialog.message}
                    confirmLabel={confirmDialog.confirmLabel}
                    variant={confirmDialog.variant}
                    onConfirm={confirmDialog.onConfirm}
                    onCancel={() => setConfirmDialog(null)}
                />
            )}

            {/* Order History Modal */}
            {orderHistoryModal && (
                <div className="modal-overlay" onClick={() => setOrderHistoryModal(null)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '800px', width: '90%', maxHeight: '90vh', overflowY: 'auto' }}>
                        <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <h2 style={{ margin: 0 }}>Order History: {orderHistoryModal.patient.full_name}</h2>
                            <button className="btn-icon" onClick={() => setOrderHistoryModal(null)}>✕</button>
                        </div>

                        {orderHistoryModal.orders.length === 0 ? (
                            <div className="empty" style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                                No orders found for this patient.
                            </div>
                        ) : (
                            orderHistoryModal.orders.map(order => {
                                const pendingAmount = order.net_amount - (order.discount || 0) - (order.paid_amount || 0);
                                return (
                                    <div key={order.id} style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '1rem', marginBottom: '1rem', background: 'var(--color-bg-tertiary)' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.5rem' }}>
                                            <div>
                                                <strong>{order.order_uid}</strong>
                                                <span style={{ marginLeft: '1rem', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
                                                    {new Date(order.order_date).toLocaleString()}
                                                </span>
                                            </div>
                                            <div>
                                                {pendingAmount <= 0 ? (
                                                    <span className="badge badge-success">Paid: ₹{order.net_amount}</span>
                                                ) : (
                                                    <span className="badge badge-error"
                                                        style={{ cursor: 'pointer' }}
                                                        title="Click to receive payment"
                                                        onClick={() => {
                                                            setOrderHistoryModal(null);
                                                            navigate('/billing', { state: { openReceiveForOrder: order.order_uid } });
                                                        }}>
                                                        Pending: ₹{pendingAmount}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        <div style={{ fontSize: '0.9rem' }}>
                                            <p style={{ margin: '0 0 0.5rem' }}><strong>Tests:</strong> {order.test_names || 'None'}</p>
                                        </div>
                                        <div style={{ marginTop: '0.5rem', textAlign: 'right' }}>
                                            <button className="btn btn-secondary btn-sm" title="View Combined Report">📄 View Report</button>
                                        </div>
                                    </div>
                                )
                            })
                        )}

                    </div>
                </div>
            )}
        </div>
    );
}

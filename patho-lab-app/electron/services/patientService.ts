import { queryAll, queryOne, runWithId, run } from '../database/db';

interface PatientRow {
    id: number;
    patient_uid: string;
    full_name: string;
    dob: string;
    gender: string;
    phone: string | null;
    address: string | null;
    created_at: string;
}

export function listPatients(): PatientRow[] {
    return queryAll<PatientRow>('SELECT * FROM patients ORDER BY created_at DESC');
}

export function getPatient(id: number): PatientRow | undefined {
    return queryOne<PatientRow>('SELECT * FROM patients WHERE id = ?', [id]);
}

export function searchPatients(query: string): PatientRow[] {
    const like = `%${query}%`;
    return queryAll<PatientRow>(
        `SELECT * FROM patients WHERE full_name LIKE ? OR patient_uid LIKE ? OR phone LIKE ? ORDER BY full_name`,
        [like, like, like]
    );
}

export function createPatient(data: {
    fullName: string;
    dob: string;
    gender: string;
    phone?: string;
    address?: string;
}): number {
    // Generate unique patient ID
    const count = queryOne<{ cnt: number }>('SELECT COUNT(*) as cnt FROM patients');
    const uid = `PID-${10000 + (count?.cnt ?? 0) + 1}`;

    return runWithId(
        `INSERT INTO patients (patient_uid, full_name, dob, gender, phone, address, created_at) 
     VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`,
        [uid, data.fullName, data.dob, data.gender, data.phone ?? null, data.address ?? null]
    );
}

export function updatePatient(id: number, data: {
    fullName?: string;
    dob?: string;
    gender?: string;
    phone?: string;
    address?: string;
}): void {
    const sets: string[] = [];
    const params: any[] = [];

    if (data.fullName) { sets.push('full_name = ?'); params.push(data.fullName); }
    if (data.dob) { sets.push('dob = ?'); params.push(data.dob); }
    if (data.gender) { sets.push('gender = ?'); params.push(data.gender); }
    if (data.phone !== undefined) { sets.push('phone = ?'); params.push(data.phone); }
    if (data.address !== undefined) { sets.push('address = ?'); params.push(data.address); }

    if (sets.length > 0) {
        params.push(id);
        run(`UPDATE patients SET ${sets.join(', ')} WHERE id = ?`, params);
    }
}

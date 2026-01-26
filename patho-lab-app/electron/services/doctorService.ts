import { queryAll, queryOne, run, runWithId } from '../database/db';

interface Doctor {
    id: number;
    doctor_code: string;
    name: string;
    specialty?: string;
    phone?: string;
    clinic_address?: string;
    commission_model?: string;
    commission_rate?: number;
    price_list_id?: number;
    is_active: number;
    created_at: string;
    pending_commission?: number;
}

interface DoctorInput {
    doctorCode: string;
    name: string;
    specialty?: string;
    phone?: string;
    clinicAddress?: string;
    commissionModel?: string;
    commissionRate?: number;
    priceListId?: number;
}

// List all active doctors with pending commission
export function listDoctors(): Doctor[] {
    return queryAll<Doctor>(`
    SELECT d.id, d.doctor_code, d.name, d.specialty, d.phone, d.clinic_address, 
           d.commission_model, d.commission_rate, d.price_list_id, d.is_active, d.created_at,
           COALESCE(SUM(dc.commission_amount), 0) as pending_commission
    FROM doctors d
    LEFT JOIN doctor_commissions dc ON d.id = dc.doctor_id AND dc.settlement_id IS NULL AND dc.is_cancelled = 0
    WHERE d.is_active = 1
    GROUP BY d.id
    ORDER BY d.name ASC
  `);
}

// List all doctors (including inactive, for admin) with pending commission
export function listAllDoctors(): Doctor[] {
    return queryAll<Doctor>(`
    SELECT d.id, d.doctor_code, d.name, d.specialty, d.phone, d.clinic_address, 
           d.commission_model, d.commission_rate, d.price_list_id, d.is_active, d.created_at,
           COALESCE(SUM(dc.commission_amount), 0) as pending_commission
    FROM doctors d
    LEFT JOIN doctor_commissions dc ON d.id = dc.doctor_id AND dc.settlement_id IS NULL AND dc.is_cancelled = 0
    GROUP BY d.id
    ORDER BY d.name ASC
  `);
}

// Get single doctor
export function getDoctor(id: number): Doctor | null {
    return queryOne<Doctor>('SELECT * FROM doctors WHERE id = ?', [id]) || null;
}

// Create new doctor
export function createDoctor(data: DoctorInput): { success: boolean; id?: number; error?: string } {
    try {
        const id = runWithId(`
      INSERT INTO doctors (
        doctor_code, name, specialty, phone, clinic_address, 
        commission_model, commission_rate, price_list_id, created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `, [
            data.doctorCode,
            data.name,
            data.specialty || null,
            data.phone || null,
            data.clinicAddress || null,
            data.commissionModel || 'NONE',
            data.commissionRate || 0,
            data.priceListId || null
        ]);

        return { success: true, id };
    } catch (error: any) {
        console.error('Create doctor error:', error);
        return { success: false, error: error.message };
    }
}

// Update doctor
export function updateDoctor(id: number, data: Partial<DoctorInput>): { success: boolean; error?: string } {
    try {
        const updates: string[] = [];
        const values: any[] = [];

        if (data.doctorCode !== undefined) {
            updates.push('doctor_code = ?');
            values.push(data.doctorCode);
        }
        if (data.name !== undefined) {
            updates.push('name = ?');
            values.push(data.name);
        }
        if (data.specialty !== undefined) {
            updates.push('specialty = ?');
            values.push(data.specialty || null);
        }
        if (data.phone !== undefined) {
            updates.push('phone = ?');
            values.push(data.phone || null);
        }
        if (data.clinicAddress !== undefined) {
            updates.push('clinic_address = ?');
            values.push(data.clinicAddress || null);
        }
        if (data.commissionModel !== undefined) {
            updates.push('commission_model = ?');
            values.push(data.commissionModel || 'NONE');
        }
        if (data.commissionRate !== undefined) {
            updates.push('commission_rate = ?');
            values.push(data.commissionRate || 0);
        }
        if (data.priceListId !== undefined) {
            updates.push('price_list_id = ?');
            values.push(data.priceListId || null);
        }

        if (updates.length === 0) {
            return { success: true };
        }

        values.push(id);
        run(`UPDATE doctors SET ${updates.join(', ')} WHERE id = ?`, values);

        return { success: true };
    } catch (error: any) {
        console.error('Update doctor error:', error);
        return { success: false, error: error.message };
    }
}

// Toggle doctor active status (soft delete)
export function toggleDoctorActive(id: number): { success: boolean; error?: string } {
    try {
        run('UPDATE doctors SET is_active = 1 - is_active WHERE id = ?', [id]);
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

// Search doctors by name
export function searchDoctors(query: string): Doctor[] {
    return queryAll<Doctor>(`
    SELECT id, doctor_code, name, specialty, phone, clinic_address, is_active, created_at
    FROM doctors
    WHERE is_active = 1 AND (name LIKE ? OR doctor_code LIKE ?)
    ORDER BY name ASC
    LIMIT 20
  `, [`%${query}%`, `%${query}%`]);
}

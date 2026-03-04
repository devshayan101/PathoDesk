import { queryAll, queryOne, run } from '../database/db';

interface LabSetting {
    setting_key: string;
    setting_value: string | null;
}

interface ReportData {
    sample: {
        id: number;
        sample_uid: string;
        received_at: string;
        status: string;
        verified_at?: string;
        verified_by_name?: string;
    };
    patient: {
        id: number;
        patient_uid: string;
        full_name: string;
        dob: string;
        gender: string;
        phone?: string;
        address?: string;
    };
    test: {
        id: number;
        test_code: string;
        test_name: string;
        department: string;
        method: string;
        sample_type: string;
    };
    referringDoctor?: {
        name: string;
        specialty?: string;
    } | null;
    labTechnician?: {
        name: string;
        qualification?: string;
        signature?: string;
    } | null;
    pathologist?: {
        name: string;
        qualification?: string;
        signature?: string;
    } | null;
    results: ResultItem[];
}

interface ResultItem {
    parameter_code: string;
    parameter_name: string;
    result_value: string;
    unit: string | null;
    abnormal_flag: string | null;
    ref_range_text: string | null;
    is_header?: number;
}

// Get all lab settings as key-value object
export function getLabSettings(): Record<string, string> {
    const rows = queryAll<LabSetting>('SELECT setting_key, setting_value FROM lab_settings');
    const settings: Record<string, string> = {};
    for (const row of rows) {
        settings[row.setting_key] = row.setting_value || '';
    }
    return settings;
}

// Update a single lab setting
export function updateLabSetting(key: string, value: string): void {
    const existing = queryOne('SELECT 1 FROM lab_settings WHERE setting_key = ?', [key]);
    if (existing) {
        run('UPDATE lab_settings SET setting_value = ? WHERE setting_key = ?', [value, key]);
    } else {
        run('INSERT INTO lab_settings (setting_key, setting_value) VALUES (?, ?)', [key, value]);
    }
}

// Get complete report data for a finalized sample
export function getReportData(sampleId: number): ReportData | null {
    // Get sample info with verification details
    const sample = queryOne<any>(`
    SELECT 
      s.id, s.sample_uid, s.received_at, s.status, s.verified_at,
      u.full_name as verified_by_name
    FROM samples s
    LEFT JOIN users u ON s.verified_by = u.id
    WHERE s.id = ?
  `, [sampleId]);

    if (!sample) return null;

    // Get patient, test, and doctor info
    const orderData = queryOne<any>(`
    SELECT 
      p.id as patient_id, p.patient_uid, p.full_name, p.dob, p.gender, p.phone, p.address,
      t.id as test_id, t.test_code, tv.test_name, tv.department, tv.method, tv.sample_type,
      d.name as doctor_name, d.specialty as doctor_specialty
    FROM samples s
    JOIN order_tests ot ON s.order_test_id = ot.id
    JOIN test_versions tv ON ot.test_version_id = tv.id
    JOIN tests t ON tv.test_id = t.id
    JOIN orders o ON ot.order_id = o.id
    JOIN patients p ON o.patient_id = p.id
    LEFT JOIN doctors d ON o.referring_doctor_id = d.id
    WHERE s.id = ?
  `, [sampleId]);

    if (!orderData) return null;

    // Get results with reference ranges
    const results = queryAll<any>(`
    SELECT 
      tp.parameter_code, tp.parameter_name, tp.is_header,
      tr.result_value, tp.unit, tr.abnormal_flag,
      rr.lower_limit, rr.upper_limit
    FROM samples s
    JOIN order_tests ot ON s.order_test_id = ot.id
    JOIN test_versions tv ON ot.test_version_id = tv.id
    JOIN test_parameters tp ON tp.test_version_id = tv.id
    LEFT JOIN test_results tr ON tr.order_test_id = ot.id AND tr.parameter_id = tp.id
    LEFT JOIN reference_ranges rr ON rr.parameter_id = tp.id 
      AND (rr.gender = ? OR rr.gender = 'A')
    WHERE s.id = ?
    ORDER BY tp.display_order
  `, [orderData.gender, sampleId]);

    // Format results with ref range text
    const formattedResults: ResultItem[] = results.map(r => ({
        parameter_code: r.parameter_code,
        parameter_name: r.parameter_name,
        is_header: r.is_header,
        result_value: r.result_value || '',
        unit: r.unit,
        abnormal_flag: r.abnormal_flag,
        ref_range_text: r.lower_limit !== null && r.upper_limit !== null
            ? `${r.lower_limit} - ${r.upper_limit}`
            : r.lower_limit !== null ? `> ${r.lower_limit}`
                : r.upper_limit !== null ? `< ${r.upper_limit}`
                    : null
    }));

    // Get Lab Technician info (from entered_by in test_results)
    let technicianData = queryOne<any>(`
    SELECT DISTINCT u.full_name, u.qualification, u.signature
    FROM test_results tr
    JOIN users u ON tr.entered_by = u.id
    JOIN roles r ON u.role_id = r.id
    JOIN order_tests ot ON tr.order_test_id = ot.id
    JOIN samples s ON s.order_test_id = ot.id
    WHERE s.id = ? AND r.name IN ('technician', 'pathologist')
    LIMIT 1
  `, [sampleId]);

    if (!technicianData) {
        technicianData = queryOne<any>(`
        SELECT u.full_name, u.qualification, u.signature
        FROM users u
        JOIN roles r ON u.role_id = r.id
        WHERE r.name = 'technician' AND u.is_active = 1
        LIMIT 1
        `);
    }

    // Get Pathologist info (from verified_by in samples)
    let pathologistData = queryOne<any>(`
    SELECT u.full_name, u.qualification, u.signature
    FROM samples s
    JOIN users u ON s.verified_by = u.id
    JOIN roles r ON u.role_id = r.id
    WHERE s.id = ? AND r.name = 'pathologist'
  `, [sampleId]);

    if (!pathologistData) {
        pathologistData = queryOne<any>(`
        SELECT u.full_name, u.qualification, u.signature
        FROM users u
        JOIN roles r ON u.role_id = r.id
        WHERE r.name = 'pathologist' AND u.is_active = 1
        LIMIT 1
        `);
    }

    return {
        sample: {
            id: sample.id,
            sample_uid: sample.sample_uid,
            received_at: sample.received_at,
            status: sample.status,
            verified_at: sample.verified_at,
            verified_by_name: sample.verified_by_name
        },
        patient: {
            id: orderData.patient_id,
            patient_uid: orderData.patient_uid,
            full_name: orderData.full_name,
            dob: orderData.dob,
            gender: orderData.gender,
            phone: orderData.phone,
            address: orderData.address
        },
        test: {
            id: orderData.test_id,
            test_code: orderData.test_code,
            test_name: orderData.test_name,
            department: orderData.department,
            method: orderData.method,
            sample_type: orderData.sample_type
        },
        referringDoctor: orderData.doctor_name ? {
            name: orderData.doctor_name,
            specialty: orderData.doctor_specialty
        } : null,
        labTechnician: technicianData ? {
            name: technicianData.full_name,
            qualification: technicianData.qualification || undefined,
            signature: technicianData.signature || undefined,
        } : null,
        pathologist: pathologistData ? {
            name: pathologistData.full_name,
            qualification: pathologistData.qualification || undefined,
            signature: pathologistData.signature || undefined,
        } : null,
        results: formattedResults
    };
}

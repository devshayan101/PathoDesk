import { queryAll, queryOne, run, runWithId } from '../database/db';

interface SampleRow {
    id: number;
    sample_uid: string;
    order_test_id: number;
    order_uid: string;
    patient_name: string;
    test_name: string;
    collected_at: string | null;
    received_at: string | null;
    status: string;
    rejection_reason: string | null;
}

// List samples with filters
export function listSamples(status?: string): SampleRow[] {
    let sql = `
    SELECT s.*, o.order_uid, p.full_name as patient_name, tv.test_name
    FROM samples s
    JOIN order_tests ot ON s.order_test_id = ot.id
    JOIN orders o ON ot.order_id = o.id
    JOIN patients p ON o.patient_id = p.id
    JOIN test_versions tv ON ot.test_version_id = tv.id
  `;

    if (status) {
        sql += ` WHERE s.status = ?`;
        sql += ` ORDER BY s.id DESC`;
        return queryAll<SampleRow>(sql, [status]);
    }

    sql += ` ORDER BY s.id DESC LIMIT 50`;
    return queryAll<SampleRow>(sql);
}

// Create sample for an order test
export function createSample(orderTestId: number): { success: boolean; sampleId?: number; sampleUid?: string; error?: string } {
    try {
        // Generate barcode-friendly UID
        const sampleUid = `S${Date.now().toString(36).toUpperCase()}`;

        const sampleId = runWithId(`
      INSERT INTO samples (sample_uid, order_test_id, status, collected_at)
      VALUES (?, ?, 'COLLECTED', datetime('now'))
    `, [sampleUid, orderTestId]);

        return { success: true, sampleId, sampleUid };
    } catch (error: any) {
        console.error('Create sample error:', error);
        return { success: false, error: error.message };
    }
}

// Mark sample as received
export function receiveSample(sampleId: number): boolean {
    try {
        run(`UPDATE samples SET status = 'RECEIVED', received_at = datetime('now') WHERE id = ?`, [sampleId]);
        return true;
    } catch {
        return false;
    }
}

// Reject sample
export function rejectSample(sampleId: number, reason: string): boolean {
    try {
        run(`UPDATE samples SET status = 'REJECTED', rejection_reason = ? WHERE id = ?`, [reason, sampleId]);
        return true;
    } catch {
        return false;
    }
}

// Get pending samples (collected but not received)
export function getPendingSamples(): SampleRow[] {
    return queryAll<SampleRow>(`
    SELECT s.*, o.order_uid, p.full_name as patient_name, tv.test_name
    FROM samples s
    JOIN order_tests ot ON s.order_test_id = ot.id
    JOIN orders o ON ot.order_id = o.id
    JOIN patients p ON o.patient_id = p.id
    JOIN test_versions tv ON ot.test_version_id = tv.id
    WHERE s.status = 'COLLECTED'
    ORDER BY s.collected_at ASC
  `);
}

// Get sample by UID (for barcode scanning)
export function getSampleByUid(sampleUid: string): SampleRow | undefined {
    return queryOne<SampleRow>(`
    SELECT s.*, o.order_uid, p.full_name as patient_name, tv.test_name
    FROM samples s
    JOIN order_tests ot ON s.order_test_id = ot.id
    JOIN orders o ON ot.order_id = o.id
    JOIN patients p ON o.patient_id = p.id
    JOIN test_versions tv ON ot.test_version_id = tv.id
    WHERE s.sample_uid = ?
  `, [sampleUid]);
}

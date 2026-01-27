import { queryAll, queryOne, run, runWithId } from '../database/db';
import { logAudit, ENTITIES, ACTIONS } from './auditService';

// Types
interface QCParameter {
    id: number;
    test_id: number;
    parameter_code: string;
    parameter_name: string;
    unit: string | null;
    level: 'LOW' | 'NORMAL' | 'HIGH';
    target_mean: number;
    target_sd: number;
    lot_number: string | null;
    expiry_date: string | null;
    is_active: number;
    created_at: string;
    created_by: number | null;
    // Joined fields
    test_code?: string;
    test_name?: string;
}

interface QCEntry {
    id: number;
    qc_parameter_id: number;
    entry_date: string;
    observed_value: number;
    deviation_sd: number | null;
    status: 'PASS' | 'WARNING' | 'FAIL' | 'REJECTED';
    remarks: string | null;
    entered_by: number;
    entered_at: string;
    reviewed_by: number | null;
    reviewed_at: string | null;
    acceptance_status: 'PENDING' | 'ACCEPTED' | 'CORRECTIVE_ACTION';
    // Joined fields
    parameter_name?: string;
    level?: string;
    target_mean?: number;
    target_sd?: number;
    entered_by_name?: string;
}

interface QCRule {
    id: number;
    rule_code: string;
    rule_name: string;
    description: string | null;
    is_warning: number;
    is_rejection: number;
}

// ==================== QC PARAMETERS (TARGETS) ====================

/**
 * Create a new QC parameter target
 */
export function createQCParameter(data: {
    testId: number;
    parameterCode: string;
    parameterName: string;
    unit?: string;
    level: 'LOW' | 'NORMAL' | 'HIGH';
    targetMean: number;
    targetSd: number;
    lotNumber?: string;
    expiryDate?: string;
    createdBy?: number;
}): { success: boolean; parameterId?: number; error?: string } {
    try {
        const id = runWithId(`
            INSERT INTO qc_parameters (test_id, parameter_code, parameter_name, unit, level, target_mean, target_sd, lot_number, expiry_date, is_active, created_at, created_by)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, datetime('now'), ?)
        `, [
            data.testId,
            data.parameterCode,
            data.parameterName,
            data.unit || null,
            data.level,
            data.targetMean,
            data.targetSd,
            data.lotNumber || null,
            data.expiryDate || null,
            data.createdBy || null
        ]);

        logAudit({
            entity: ENTITIES.QC_ENTRY,
            entityId: id,
            action: ACTIONS.CREATE,
            newValue: data,
            performedBy: data.createdBy
        });

        return { success: true, parameterId: id };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

/**
 * Update QC parameter
 */
export function updateQCParameter(id: number, data: {
    parameterCode?: string;
    parameterName?: string;
    unit?: string;
    level?: 'LOW' | 'NORMAL' | 'HIGH';
    targetMean?: number;
    targetSd?: number;
    lotNumber?: string;
    expiryDate?: string;
    isActive?: boolean;
}, userId?: number): { success: boolean; error?: string } {
    try {
        const old = getQCParameter(id);
        if (!old) {
            return { success: false, error: 'QC Parameter not found' };
        }

        const updates: string[] = [];
        const params: any[] = [];

        if (data.parameterCode !== undefined) { updates.push('parameter_code = ?'); params.push(data.parameterCode); }
        if (data.parameterName !== undefined) { updates.push('parameter_name = ?'); params.push(data.parameterName); }
        if (data.unit !== undefined) { updates.push('unit = ?'); params.push(data.unit); }
        if (data.level !== undefined) { updates.push('level = ?'); params.push(data.level); }
        if (data.targetMean !== undefined) { updates.push('target_mean = ?'); params.push(data.targetMean); }
        if (data.targetSd !== undefined) { updates.push('target_sd = ?'); params.push(data.targetSd); }
        if (data.lotNumber !== undefined) { updates.push('lot_number = ?'); params.push(data.lotNumber); }
        if (data.expiryDate !== undefined) { updates.push('expiry_date = ?'); params.push(data.expiryDate); }
        if (data.isActive !== undefined) { updates.push('is_active = ?'); params.push(data.isActive ? 1 : 0); }

        if (updates.length === 0) {
            return { success: true };
        }

        params.push(id);
        run(`UPDATE qc_parameters SET ${updates.join(', ')} WHERE id = ?`, params);

        logAudit({
            entity: ENTITIES.QC_ENTRY,
            entityId: id,
            action: ACTIONS.UPDATE,
            oldValue: old,
            newValue: data,
            performedBy: userId
        });

        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

/**
 * Get single QC parameter
 */
export function getQCParameter(id: number): QCParameter | null {
    return queryOne<QCParameter>(`
        SELECT qp.*, t.test_code, tv.test_name
        FROM qc_parameters qp
        JOIN tests t ON qp.test_id = t.id
        LEFT JOIN test_versions tv ON t.id = tv.test_id AND tv.status = 'PUBLISHED'
        WHERE qp.id = ?
    `, [id]) || null;
}

/**
 * List QC parameters
 */
export function listQCParameters(options: {
    testId?: number;
    activeOnly?: boolean;
} = {}): QCParameter[] {
    const conditions: string[] = [];
    const params: any[] = [];

    if (options.testId) {
        conditions.push('qp.test_id = ?');
        params.push(options.testId);
    }
    if (options.activeOnly !== false) {
        conditions.push('qp.is_active = 1');
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    return queryAll<QCParameter>(`
        SELECT qp.*, t.test_code, tv.test_name
        FROM qc_parameters qp
        JOIN tests t ON qp.test_id = t.id
        LEFT JOIN test_versions tv ON t.id = tv.test_id AND tv.status = 'PUBLISHED'
        ${whereClause}
        ORDER BY t.test_code, qp.level
    `, params);
}

// ==================== QC ENTRIES ====================

/**
 * Record a new QC entry
 */
export function recordQCEntry(data: {
    qcParameterId: number;
    entryDate: string;
    observedValue: number;
    remarks?: string;
    enteredBy: number;
}): { success: boolean; entryId?: number; status?: string; deviationSd?: number; error?: string } {
    try {
        // Get the parameter to calculate deviation
        const param = getQCParameter(data.qcParameterId);
        if (!param) {
            return { success: false, error: 'QC Parameter not found' };
        }

        // Calculate deviation in SD units
        const deviationSd = param.target_sd > 0
            ? (data.observedValue - param.target_mean) / param.target_sd
            : 0;

        // Determine status based on deviation
        let status: 'PASS' | 'WARNING' | 'FAIL' = 'PASS';
        if (Math.abs(deviationSd) >= 3) {
            status = 'FAIL';
        } else if (Math.abs(deviationSd) >= 2) {
            status = 'WARNING';
        }

        const id = runWithId(`
            INSERT INTO qc_entries (qc_parameter_id, entry_date, observed_value, deviation_sd, status, remarks, entered_by, entered_at, acceptance_status)
            VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), 'PENDING')
        `, [
            data.qcParameterId,
            data.entryDate,
            data.observedValue,
            deviationSd,
            status,
            data.remarks || null,
            data.enteredBy
        ]);

        logAudit({
            entity: ENTITIES.QC_ENTRY,
            entityId: id,
            action: ACTIONS.CREATE,
            newValue: { ...data, deviationSd, status },
            performedBy: data.enteredBy
        });

        return { success: true, entryId: id, status, deviationSd };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

/**
 * Review a QC entry (accept or require corrective action)
 */
export function reviewQCEntry(
    entryId: number,
    acceptanceStatus: 'ACCEPTED' | 'CORRECTIVE_ACTION',
    reviewedBy: number,
    remarks?: string
): { success: boolean; error?: string } {
    try {
        const entry = queryOne<QCEntry>('SELECT * FROM qc_entries WHERE id = ?', [entryId]);
        if (!entry) {
            return { success: false, error: 'QC Entry not found' };
        }

        run(`
            UPDATE qc_entries 
            SET acceptance_status = ?, reviewed_by = ?, reviewed_at = datetime('now'), remarks = COALESCE(?, remarks)
            WHERE id = ?
        `, [acceptanceStatus, reviewedBy, remarks, entryId]);

        logAudit({
            entity: ENTITIES.QC_ENTRY,
            entityId: entryId,
            action: ACTIONS.APPROVE,
            oldValue: { acceptance_status: entry.acceptance_status },
            newValue: { acceptance_status: acceptanceStatus, remarks },
            performedBy: reviewedBy
        });

        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

/**
 * Get QC entries for a date range
 */
export function getQCEntries(options: {
    qcParameterId?: number;
    testId?: number;
    fromDate?: string;
    toDate?: string;
    status?: string;
    limit?: number;
} = {}): QCEntry[] {
    const conditions: string[] = [];
    const params: any[] = [];

    if (options.qcParameterId) {
        conditions.push('e.qc_parameter_id = ?');
        params.push(options.qcParameterId);
    }
    if (options.testId) {
        conditions.push('qp.test_id = ?');
        params.push(options.testId);
    }
    if (options.fromDate) {
        conditions.push('e.entry_date >= ?');
        params.push(options.fromDate);
    }
    if (options.toDate) {
        conditions.push('e.entry_date <= ?');
        params.push(options.toDate);
    }
    if (options.status) {
        conditions.push('e.status = ?');
        params.push(options.status);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const limitClause = options.limit ? `LIMIT ${options.limit}` : '';

    return queryAll<QCEntry>(`
        SELECT e.*, qp.parameter_name, qp.level, qp.target_mean, qp.target_sd, u.full_name as entered_by_name
        FROM qc_entries e
        JOIN qc_parameters qp ON e.qc_parameter_id = qp.id
        LEFT JOIN users u ON e.entered_by = u.id
        ${whereClause}
        ORDER BY e.entry_date DESC, e.entered_at DESC
        ${limitClause}
    `, params);
}

/**
 * Get today's QC entries grouped by parameter
 */
export function getTodayQCStatus(): {
    parameter: QCParameter;
    entries: QCEntry[];
    hasFailure: boolean;
    hasWarning: boolean;
}[] {
    const today = new Date().toISOString().split('T')[0];
    const params = listQCParameters({ activeOnly: true });

    return params.map(param => {
        const entries = getQCEntries({ qcParameterId: param.id, fromDate: today, toDate: today });
        return {
            parameter: param,
            entries,
            hasFailure: entries.some(e => e.status === 'FAIL'),
            hasWarning: entries.some(e => e.status === 'WARNING')
        };
    });
}

/**
 * Get Levey-Jennings data for charting (last N entries)
 */
export function getLeveyJenningsData(qcParameterId: number, count: number = 30): {
    parameter: QCParameter;
    entries: { date: string; value: number; deviation_sd: number; status: string }[];
} | null {
    const param = getQCParameter(qcParameterId);
    if (!param) return null;

    const entries = queryAll<{ entry_date: string; observed_value: number; deviation_sd: number; status: string }>(`
        SELECT entry_date, observed_value, deviation_sd, status
        FROM qc_entries
        WHERE qc_parameter_id = ?
        ORDER BY entry_date DESC, entered_at DESC
        LIMIT ?
    `, [qcParameterId, count]);

    return {
        parameter: param,
        entries: entries.reverse().map(e => ({
            date: e.entry_date,
            value: e.observed_value,
            deviation_sd: e.deviation_sd,
            status: e.status
        }))
    };
}

// ==================== QC RULES ====================

/**
 * List all QC rules
 */
export function listQCRules(): QCRule[] {
    return queryAll<QCRule>('SELECT * FROM qc_rules ORDER BY rule_code');
}

/**
 * Apply Westgard rules to recent entries (simplified implementation)
 */
export function checkWestgardRules(qcParameterId: number): {
    rule: string;
    triggered: boolean;
    isRejection: boolean;
    message: string;
}[] {
    const entries = getQCEntries({ qcParameterId, limit: 10 });
    const results: { rule: string; triggered: boolean; isRejection: boolean; message: string }[] = [];

    if (entries.length === 0) return results;

    const deviations = entries.map(e => e.deviation_sd || 0);

    // 1:3s Rule - Single control exceeds ±3SD
    if (Math.abs(deviations[0]) >= 3) {
        results.push({
            rule: '1:3s',
            triggered: true,
            isRejection: true,
            message: `Latest value exceeds ±3SD (${deviations[0].toFixed(2)}SD)`
        });
    }

    // 1:2s Rule (Warning) - Single control exceeds ±2SD
    if (Math.abs(deviations[0]) >= 2 && Math.abs(deviations[0]) < 3) {
        results.push({
            rule: '1:2s',
            triggered: true,
            isRejection: false,
            message: `Latest value exceeds ±2SD (${deviations[0].toFixed(2)}SD) - Warning`
        });
    }

    // 2:2s Rule - Two consecutive controls exceed same ±2SD limit
    if (entries.length >= 2 &&
        deviations[0] >= 2 && deviations[1] >= 2 ||
        deviations[0] <= -2 && deviations[1] <= -2) {
        results.push({
            rule: '2:2s',
            triggered: true,
            isRejection: true,
            message: 'Two consecutive values exceed same ±2SD limit'
        });
    }

    // R:4s Rule - Range between two controls exceeds 4SD
    if (entries.length >= 2) {
        const range = Math.abs(deviations[0] - deviations[1]);
        if (range >= 4) {
            results.push({
                rule: 'R:4s',
                triggered: true,
                isRejection: true,
                message: `Range between last two values exceeds 4SD (${range.toFixed(2)}SD)`
            });
        }
    }

    // 10x Rule - Ten consecutive on same side of mean
    if (entries.length >= 10) {
        const allPositive = deviations.slice(0, 10).every(d => d > 0);
        const allNegative = deviations.slice(0, 10).every(d => d < 0);
        if (allPositive || allNegative) {
            results.push({
                rule: '10x',
                triggered: true,
                isRejection: true,
                message: 'Last 10 values all on same side of mean (systematic shift)'
            });
        }
    }

    return results;
}

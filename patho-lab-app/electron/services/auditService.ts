import { queryAll, queryOne, runWithId } from '../database/db';

// Types
interface AuditLogEntry {
    id: number;
    entity: string;
    entity_id: number | null;
    action: string;
    old_value: string | null;
    new_value: string | null;
    performed_by: number | null;
    performed_at: string;
    // Joined fields
    username?: string;
    full_name?: string;
}

interface AuditLogInput {
    entity: string;
    entityId?: number | null;
    action: string;
    oldValue?: any;
    newValue?: any;
    performedBy?: number;
}

// ==================== LOGGING FUNCTIONS ====================

/**
 * Log an action to the audit trail
 */
export function logAudit(input: AuditLogInput): number {
    const oldValueStr = input.oldValue ? JSON.stringify(input.oldValue) : null;
    const newValueStr = input.newValue ? JSON.stringify(input.newValue) : null;

    return runWithId(`
        INSERT INTO audit_log (entity, entity_id, action, old_value, new_value, performed_by, performed_at)
        VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
    `, [
        input.entity,
        input.entityId || null,
        input.action,
        oldValueStr,
        newValueStr,
        input.performedBy || null
    ]);
}

/**
 * Helper to create a diff object showing changed fields
 */
export function createDiff(oldObj: Record<string, any>, newObj: Record<string, any>): { old: Record<string, any>, new: Record<string, any> } | null {
    const changedOld: Record<string, any> = {};
    const changedNew: Record<string, any> = {};
    let hasChanges = false;

    // Check all keys in newObj
    for (const key of Object.keys(newObj)) {
        if (JSON.stringify(oldObj[key]) !== JSON.stringify(newObj[key])) {
            changedOld[key] = oldObj[key];
            changedNew[key] = newObj[key];
            hasChanges = true;
        }
    }

    if (!hasChanges) return null;

    return { old: changedOld, new: changedNew };
}

// ==================== QUERY FUNCTIONS ====================

/**
 * Get audit log entries with filtering
 */
export function getAuditLogs(options: {
    entity?: string;
    entityId?: number;
    action?: string;
    userId?: number;
    fromDate?: string;
    toDate?: string;
    limit?: number;
    offset?: number;
} = {}): { entries: AuditLogEntry[], total: number } {
    const conditions: string[] = [];
    const params: any[] = [];

    if (options.entity) {
        conditions.push('a.entity = ?');
        params.push(options.entity);
    }
    if (options.entityId) {
        conditions.push('a.entity_id = ?');
        params.push(options.entityId);
    }
    if (options.action) {
        conditions.push('a.action LIKE ?');
        params.push(`%${options.action}%`);
    }
    if (options.userId) {
        conditions.push('a.performed_by = ?');
        params.push(options.userId);
    }
    if (options.fromDate) {
        conditions.push('a.performed_at >= ?');
        params.push(options.fromDate);
    }
    if (options.toDate) {
        conditions.push('a.performed_at <= ?');
        params.push(options.toDate + ' 23:59:59');
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Get total count
    const countResult = queryOne<{ count: number }>(`
        SELECT COUNT(*) as count FROM audit_log a ${whereClause}
    `, params);
    const total = countResult?.count || 0;

    // Get paginated entries
    const limit = options.limit || 50;
    const offset = options.offset || 0;

    const entries = queryAll<AuditLogEntry>(`
        SELECT a.*, u.username, u.full_name
        FROM audit_log a
        LEFT JOIN users u ON a.performed_by = u.id
        ${whereClause}
        ORDER BY a.performed_at DESC
        LIMIT ? OFFSET ?
    `, [...params, limit, offset]);

    return { entries, total };
}

/**
 * Get audit history for a specific entity
 */
export function getEntityHistory(entity: string, entityId: number): AuditLogEntry[] {
    return queryAll<AuditLogEntry>(`
        SELECT a.*, u.username, u.full_name
        FROM audit_log a
        LEFT JOIN users u ON a.performed_by = u.id
        WHERE a.entity = ? AND a.entity_id = ?
        ORDER BY a.performed_at DESC
    `, [entity, entityId]);
}

/**
 * Get recent activity summary
 */
export function getRecentActivity(limit: number = 20): AuditLogEntry[] {
    return queryAll<AuditLogEntry>(`
        SELECT a.*, u.username, u.full_name
        FROM audit_log a
        LEFT JOIN users u ON a.performed_by = u.id
        ORDER BY a.performed_at DESC
        LIMIT ?
    `, [limit]);
}

/**
 * Get activity statistics for a time period
 */
export function getActivityStats(fromDate: string, toDate: string): {
    totalActions: number;
    byEntity: { entity: string; count: number }[];
    byAction: { action: string; count: number }[];
    byUser: { userId: number; username: string; count: number }[];
} {
    const totalResult = queryOne<{ count: number }>(`
        SELECT COUNT(*) as count FROM audit_log 
        WHERE performed_at >= ? AND performed_at <= ?
    `, [fromDate, toDate + ' 23:59:59']);

    const byEntity = queryAll<{ entity: string; count: number }>(`
        SELECT entity, COUNT(*) as count FROM audit_log 
        WHERE performed_at >= ? AND performed_at <= ?
        GROUP BY entity ORDER BY count DESC
    `, [fromDate, toDate + ' 23:59:59']);

    const byAction = queryAll<{ action: string; count: number }>(`
        SELECT action, COUNT(*) as count FROM audit_log 
        WHERE performed_at >= ? AND performed_at <= ?
        GROUP BY action ORDER BY count DESC
    `, [fromDate, toDate + ' 23:59:59']);

    const byUser = queryAll<{ userId: number; username: string; count: number }>(`
        SELECT a.performed_by as userId, COALESCE(u.username, 'System') as username, COUNT(*) as count 
        FROM audit_log a
        LEFT JOIN users u ON a.performed_by = u.id
        WHERE a.performed_at >= ? AND a.performed_at <= ?
        GROUP BY a.performed_by ORDER BY count DESC
    `, [fromDate, toDate + ' 23:59:59']);

    return {
        totalActions: totalResult?.count || 0,
        byEntity,
        byAction,
        byUser
    };
}

// ==================== ENTITY-SPECIFIC LOGGERS ====================

// Pre-defined entity types for consistency
export const ENTITIES = {
    PATIENT: 'PATIENT',
    ORDER: 'ORDER',
    SAMPLE: 'SAMPLE',
    RESULT: 'RESULT',
    INVOICE: 'INVOICE',
    PAYMENT: 'PAYMENT',
    TEST: 'TEST',
    USER: 'USER',
    DOCTOR: 'DOCTOR',
    PRICE_LIST: 'PRICE_LIST',
    QC_ENTRY: 'QC_ENTRY',
    SETTINGS: 'SETTINGS',
    LICENSE: 'LICENSE'
} as const;

export const ACTIONS = {
    CREATE: 'CREATE',
    UPDATE: 'UPDATE',
    DELETE: 'DELETE',
    VIEW: 'VIEW',
    LOGIN: 'LOGIN',
    LOGOUT: 'LOGOUT',
    LOGIN_FAILED: 'LOGIN_FAILED',
    VERIFY: 'VERIFY',
    FINALIZE: 'FINALIZE',
    CANCEL: 'CANCEL',
    SUBMIT: 'SUBMIT',
    APPROVE: 'APPROVE',
    REJECT: 'REJECT',
    REPORT_PREVIEW: 'REPORT_PREVIEW',
    REPORT_PRINT: 'REPORT_PRINT',
    REPORT_REPRINT: 'REPORT_REPRINT',
    QC_OVERRIDE: 'QC_OVERRIDE',
    // License actions
    LICENSE_LOAD: 'LICENSE_LOAD',
    LICENSE_UPLOAD: 'LICENSE_UPLOAD',
    LICENSE_UPLOAD_FAILED: 'LICENSE_UPLOAD_FAILED',
    LICENSE_VALID: 'LICENSE_VALID',
    LICENSE_EXPIRED: 'LICENSE_EXPIRED',
    LICENSE_INVALID: 'LICENSE_INVALID',
    LICENSE_MODULE_BLOCKED: 'LICENSE_MODULE_BLOCKED'
} as const;

/**
 * Convenience logger for result changes
 */
export function logResultChange(
    sampleId: number,
    parameterId: number,
    oldValue: string | null,
    newValue: string,
    userId?: number
): void {
    logAudit({
        entity: ENTITIES.RESULT,
        entityId: sampleId,
        action: oldValue ? ACTIONS.UPDATE : ACTIONS.CREATE,
        oldValue: oldValue ? { parameterId, value: oldValue } : undefined,
        newValue: { parameterId, value: newValue },
        performedBy: userId
    });
}

/**
 * Convenience logger for invoice actions
 */
export function logInvoiceAction(
    invoiceId: number,
    action: string,
    details: any,
    userId?: number
): void {
    logAudit({
        entity: ENTITIES.INVOICE,
        entityId: invoiceId,
        action,
        newValue: details,
        performedBy: userId
    });
}

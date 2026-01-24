import { queryAll, queryOne, runWithId, run } from '../database/db';

interface TestRow {
    id: number;
    test_code: string;
    is_active: number;
}

interface TestVersionRow {
    id: number;
    test_id: number;
    test_name: string;
    department: string;
    method: string;
    sample_type: string;
    report_group: string | null;
    version_no: number;
    effective_from: string;
}

interface ParameterRow {
    id: number;
    test_version_id: number;
    parameter_code: string;
    parameter_name: string;
    data_type: string;
    unit: string | null;
    decimal_precision: number | null;
    display_order: number | null;
    is_mandatory: number;
    formula: string | null;
}

interface RefRangeRow {
    id: number;
    parameter_id: number;
    gender: string;
    age_min_days: number;
    age_max_days: number;
    lower_limit: number | null;
    upper_limit: number | null;
    display_text: string | null;
    effective_from: string;
}

export function listTests(): (TestRow & TestVersionRow)[] {
    return queryAll<TestRow & TestVersionRow>(`
    SELECT t.*, tv.id as version_id, tv.test_name, tv.department, tv.method, tv.sample_type, tv.version_no
    FROM tests t
    LEFT JOIN test_versions tv ON t.id = tv.test_id
    WHERE t.is_active = 1
    ORDER BY t.test_code
  `);
}

export function getTest(testId: number): TestVersionRow | undefined {
    return queryOne<TestVersionRow>(`
    SELECT * FROM test_versions WHERE test_id = ? ORDER BY version_no DESC LIMIT 1
  `, [testId]);
}

export function getTestParameters(testVersionId: number): ParameterRow[] {
    return queryAll<ParameterRow>(`
    SELECT * FROM test_parameters WHERE test_version_id = ? ORDER BY display_order
  `, [testVersionId]);
}

export function listReferenceRanges(parameterId: number): RefRangeRow[] {
    return queryAll<RefRangeRow>(`
    SELECT * FROM reference_ranges WHERE parameter_id = ? ORDER BY gender, age_min_days
  `, [parameterId]);
}

export function createReferenceRange(data: {
    parameterId: number;
    gender: string;
    ageMinDays: number;
    ageMaxDays: number;
    lowerLimit?: number;
    upperLimit?: number;
    displayText?: string;
}): number {
    // Check for overlapping ranges
    const overlaps = queryOne<{ cnt: number }>(`
    SELECT COUNT(*) as cnt FROM reference_ranges
    WHERE parameter_id = ? AND gender IN (?, 'A')
    AND NOT (age_max_days < ? OR age_min_days > ?)
  `, [data.parameterId, data.gender, data.ageMinDays, data.ageMaxDays]);

    if (overlaps && overlaps.cnt > 0) {
        throw new Error('Overlapping age range detected');
    }

    return runWithId(`
    INSERT INTO reference_ranges (parameter_id, gender, age_min_days, age_max_days, lower_limit, upper_limit, display_text, effective_from)
    VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
  `, [data.parameterId, data.gender, data.ageMinDays, data.ageMaxDays, data.lowerLimit ?? null, data.upperLimit ?? null, data.displayText ?? null]);
}

export function updateReferenceRange(id: number, data: {
    lowerLimit?: number;
    upperLimit?: number;
    displayText?: string;
}): void {
    const sets: string[] = [];
    const params: any[] = [];

    if (data.lowerLimit !== undefined) { sets.push('lower_limit = ?'); params.push(data.lowerLimit); }
    if (data.upperLimit !== undefined) { sets.push('upper_limit = ?'); params.push(data.upperLimit); }
    if (data.displayText !== undefined) { sets.push('display_text = ?'); params.push(data.displayText); }

    if (sets.length > 0) {
        params.push(id);
        run(`UPDATE reference_ranges SET ${sets.join(', ')} WHERE id = ?`, params);
    }
}

export function deleteReferenceRange(id: number): void {
    run('DELETE FROM reference_ranges WHERE id = ?', [id]);
}

export function getApplicableRange(parameterId: number, ageInDays: number, gender: string): RefRangeRow | undefined {
    // Try gender-specific first, then fallback to 'A' (All)
    return queryOne<RefRangeRow>(`
    SELECT * FROM reference_ranges
    WHERE parameter_id = ?
    AND age_min_days <= ? AND age_max_days >= ?
    AND gender IN (?, 'A')
    ORDER BY CASE WHEN gender = ? THEN 0 ELSE 1 END
    LIMIT 1
  `, [parameterId, ageInDays, ageInDays, gender, gender]);
}

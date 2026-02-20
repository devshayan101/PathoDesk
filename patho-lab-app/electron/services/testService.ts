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
    JOIN test_versions tv ON t.id = tv.test_id
    WHERE t.is_active = 1
    AND tv.id = (
      SELECT tv2.id FROM test_versions tv2 
      WHERE tv2.test_id = t.id 
      ORDER BY 
        CASE tv2.status WHEN 'DRAFT' THEN 0 ELSE 1 END,
        tv2.version_no DESC
      LIMIT 1
    )
    ORDER BY t.test_code
  `);
}

export function getTest(testId: number): (TestVersionRow & { test_code?: string }) | undefined {
  return queryOne<TestVersionRow & { test_code?: string }>(`
    SELECT tv.*, t.test_code FROM test_versions tv
    JOIN tests t ON tv.test_id = t.id
    WHERE tv.test_id = ? ORDER BY tv.version_no DESC LIMIT 1
  `, [testId]);
}

export function getTestVersion(versionId: number): TestVersionRow | undefined {
  return queryOne<TestVersionRow>('SELECT * FROM test_versions WHERE id = ?', [versionId]);
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

// --- Direct Parameter Management (from TestMaster panel) ---

export function addParameter(testVersionId: number, data: {
  parameterCode: string;
  parameterName: string;
  dataType: string;
  unit?: string;
}): number {
  const maxOrder = queryOne<{ max_o: number }>('SELECT COALESCE(MAX(display_order), 0) as max_o FROM test_parameters WHERE test_version_id = ?', [testVersionId]);
  return runWithId(`
    INSERT INTO test_parameters (test_version_id, parameter_code, parameter_name, data_type, unit, decimal_precision, display_order, is_mandatory)
    VALUES (?, ?, ?, ?, ?, 2, ?, 1)
  `, [testVersionId, data.parameterCode, data.parameterName, data.dataType, data.unit || null, (maxOrder?.max_o || 0) + 1]);
}

export function updateParameter(parameterId: number, data: {
  parameterCode: string;
  parameterName: string;
  dataType: string;
  unit?: string;
}): void {
  run(`
    UPDATE test_parameters 
    SET parameter_code = ?, parameter_name = ?, data_type = ?, unit = ?
    WHERE id = ?
  `, [data.parameterCode, data.parameterName, data.dataType, data.unit || null, parameterId]);
}


export function deleteParameter(parameterId: number): void {
  // Delete dependent reference ranges first
  run('DELETE FROM reference_ranges WHERE parameter_id = ?', [parameterId]);
  // Delete the parameter
  run('DELETE FROM test_parameters WHERE id = ?', [parameterId]);
}

// --- Test Creation Wizard Methods ---

export function getDrafts(): (TestRow & TestVersionRow & { wizard_step: number, status: string })[] {
  return queryAll<(TestRow & TestVersionRow & { wizard_step: number, status: string })>(`
    SELECT t.*, tv.id as version_id, tv.test_name, tv.department, tv.method, tv.sample_type, tv.version_no, tv.wizard_step, tv.status
    FROM test_versions tv
    JOIN tests t ON tv.test_id = t.id
    WHERE tv.status = 'DRAFT'
    ORDER BY tv.created_at DESC
  `);
}

export function createTestDraft(data: {
  testCode: string;
  testName: string;
  department: string;
  method: string;
  sampleType: string;
  reportGroup?: string;
}): number {
  // 1. Check if test code exists
  const existingTest = queryOne<{ id: number }>('SELECT id FROM tests WHERE test_code = ?', [data.testCode]);
  let testId: number;

  if (existingTest) {
    testId = existingTest.id;
    // Check if there is already a DRAFT for this test
    const existingDraft = queryOne<{ id: number }>('SELECT id FROM test_versions WHERE test_id = ? AND status = "DRAFT"', [testId]);
    if (existingDraft) {
      throw new Error(`A draft version for test code ${data.testCode} already exists.`);
    }
  } else {
    // Create new test
    testId = runWithId('INSERT INTO tests (test_code, is_active) VALUES (?, 1)', [data.testCode]);
  }

  // 2. Determine new version number
  const currentMaxVersion = queryOne<{ max_v: number }>('SELECT MAX(version_no) as max_v FROM test_versions WHERE test_id = ?', [testId]);
  const nextVersion = (currentMaxVersion?.max_v || 0) + 1;

  // 3. Create Draft Version
  return runWithId(`
    INSERT INTO test_versions(
      test_id, test_name, department, method, sample_type, report_group,
      version_no, effective_from, status, wizard_step, created_at
    ) VALUES(?, ?, ?, ?, ?, ?, ?, datetime('now'), 'DRAFT', 1, datetime('now'))
  `, [testId, data.testName, data.department, data.method, data.sampleType, data.reportGroup || null, nextVersion]);
}

export function updateTestDraft(versionId: number, data: Partial<TestVersionRow>): void {
  const sets: string[] = [];
  const params: any[] = [];

  if (data.test_name) { sets.push('test_name = ?'); params.push(data.test_name); }
  if (data.department) { sets.push('department = ?'); params.push(data.department); }
  if (data.method) { sets.push('method = ?'); params.push(data.method); }
  if (data.sample_type) { sets.push('sample_type = ?'); params.push(data.sample_type); }
  if (data.report_group !== undefined) { sets.push('report_group = ?'); params.push(data.report_group); }

  if (sets.length > 0) {
    params.push(versionId);
    run(`UPDATE test_versions SET ${sets.join(', ')} WHERE id = ? AND status = 'DRAFT'`, params);
  }
}

export function updateWizardStep(versionId: number, step: number): void {
  run('UPDATE test_versions SET wizard_step = ? WHERE id = ?', [step, versionId]);
}

export function saveTestParameters(versionId: number, parameters: Omit<ParameterRow, 'id' | 'test_version_id'>[]): void {
  // Smart update to preserve IDs (and thus reference ranges)

  // 1. Get existing parameters
  const existingParams = queryAll<ParameterRow>('SELECT * FROM test_parameters WHERE test_version_id = ?', [versionId]);
  const existingMap = new Map(existingParams.map(p => [p.parameter_code, p]));
  const inputCodes = new Set(parameters.map(p => p.parameter_code));

  // 2. Update or Insert
  for (const param of parameters) {
    if (existingMap.has(param.parameter_code)) {
      // Update
      const existing = existingMap.get(param.parameter_code)!;
      run(`
        UPDATE test_parameters 
        SET parameter_name = ?, data_type = ?, unit = ?, decimal_precision = ?, 
            display_order = ?, is_mandatory = ?, formula = ?
        WHERE id = ?
      `, [
        param.parameter_name, param.data_type, param.unit, param.decimal_precision,
        param.display_order, param.is_mandatory, param.formula, existing.id
      ]);
    } else {
      // Insert
      run(`
        INSERT INTO test_parameters (
          test_version_id, parameter_code, parameter_name, data_type, 
          unit, decimal_precision, display_order, is_mandatory, formula
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        versionId, param.parameter_code, param.parameter_name, param.data_type,
        param.unit, param.decimal_precision, param.display_order, param.is_mandatory, param.formula
      ]);
    }
  }

  // 3. Delete parameters that were removed (cascade delete ranges first)
  const paramsToDelete = existingParams.filter(p => !inputCodes.has(p.parameter_code));
  if (paramsToDelete.length > 0) {
    const idsToDelete = paramsToDelete.map(p => p.id);
    const placeholders = idsToDelete.map(() => '?').join(',');

    // Delete dependent ranges
    run(`DELETE FROM reference_ranges WHERE parameter_id IN (${placeholders})`, idsToDelete);

    // Delete parameters
    run(`DELETE FROM test_parameters WHERE id IN (${placeholders})`, idsToDelete);
  }
}

export function publishTest(versionId: number): void {
  // Validate
  const params = getTestParameters(versionId);
  if (params.length === 0) throw new Error('Cannot publish test without parameters.');

  // Check ref ranges?? For now, just publish.

  run("UPDATE test_versions SET status = 'PUBLISHED', wizard_step = 6 WHERE id = ?", [versionId]);
}

export function deleteTest(testId: number): void {
  run('UPDATE tests SET is_active = 0 WHERE id = ?', [testId]);
}

export function createDraftFromExisting(testId: number): number {
  // 1. Get latest version
  const latest = queryOne<TestVersionRow>('SELECT * FROM test_versions WHERE test_id = ? ORDER BY version_no DESC LIMIT 1', [testId]);
  if (!latest) throw new Error('Test version not found');

  // 2. If already DRAFT, return it
  if ((latest as any).status === 'DRAFT') return latest.id;

  // 3. Create NEW draft version based on latest
  const nextVersion = latest.version_no + 1;
  const newVersionId = runWithId(`
    INSERT INTO test_versions(
      test_id, test_name, department, method, sample_type, report_group,
      version_no, effective_from, status, wizard_step, created_at, interpretation_template
    ) VALUES(?, ?, ?, ?, ?, ?, ?, datetime('now'), 'DRAFT', 1, datetime('now'), ?)
  `, [
    latest.test_id, latest.test_name, latest.department, latest.method,
    latest.sample_type, latest.report_group, nextVersion,
    (latest as any).interpretation_template || null
  ]);

  // 4. Copy Parameters
  const params = getTestParameters(latest.id);
  const paramMap = new Map<string, number>(); // code -> newId (for mapping ref ranges)

  for (const param of params) {
    const newParamId = runWithId(`
      INSERT INTO test_parameters (
        test_version_id, parameter_code, parameter_name, data_type, 
        unit, decimal_precision, display_order, is_mandatory, formula
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      newVersionId, param.parameter_code, param.parameter_name, param.data_type,
      param.unit, param.decimal_precision, param.display_order, param.is_mandatory, param.formula
    ]);
    paramMap.set(param.parameter_code, newParamId);
  }

  // 5. Copy Reference Ranges
  // We need to fetch ranges for each OLD parameter and insert for NEW parameter
  for (const oldParam of params) {
    const newParamId = paramMap.get(oldParam.parameter_code);
    if (newParamId) {
      const ranges = listReferenceRanges(oldParam.id);
      for (const range of ranges) {
        run(`
                INSERT INTO reference_ranges (parameter_id, gender, age_min_days, age_max_days, lower_limit, upper_limit, display_text, effective_from)
                VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
               `, [newParamId, range.gender, range.age_min_days, range.age_max_days, range.lower_limit, range.upper_limit, range.display_text]);
      }
    }
  }

  return newVersionId;
}



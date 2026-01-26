import { queryAll, queryOne, run, runWithId } from '../database/db';

interface SampleForResultEntry {
  id: number;
  sample_uid: string;
  order_uid: string;
  patient_id: number;
  patient_name: string;
  patient_uid: string;
  patient_dob: string;
  patient_gender: string;
  test_id: number;
  test_name: string;
  test_version_id: number;
  status: string;
}

interface ResultData {
  sample_id: number;
  sample_uid: string;
  patient_id: number;
  patient_name: string;
  patient_uid: string;
  patient_age_days: number;
  patient_gender: string;
  test_id: number;
  test_name: string;
  test_version_id: number;
  status: string;
  parameters: ResultParameter[];
  previousResults?: PreviousResult[];
}

interface ResultParameter {
  parameter_id: number;
  parameter_code: string;
  parameter_name: string;
  unit: string;
  result_value?: string;
  abnormal_flag?: string;
  ref_ranges: RefRange[];
}

interface RefRange {
  min_value: number | null;
  max_value: number | null;
  critical_low: number | null;
  critical_high: number | null;
  age_min_days: number;
  age_max_days: number | null;
  gender: string;
}

interface PreviousResult {
  parameter_code: string;
  value: string;
  test_date: string;
}

// Get samples for result entry/viewing (all workflow stages)
export function listPendingSamples(): SampleForResultEntry[] {
  return queryAll<SampleForResultEntry>(`
    SELECT 
      s.id, s.sample_uid, o.order_uid,
      p.id as patient_id, p.full_name as patient_name, p.patient_uid, p.dob as patient_dob, p.gender as patient_gender,
      t.id as test_id, tv.test_name, ot.test_version_id,
      s.status
    FROM samples s
    JOIN order_tests ot ON s.order_test_id = ot.id
    JOIN test_versions tv ON ot.test_version_id = tv.id
    JOIN tests t ON tv.test_id = t.id
    JOIN orders o ON ot.order_id = o.id
    JOIN patients p ON o.patient_id = p.id
    WHERE s.status IN ('RECEIVED', 'DRAFT', 'SUBMITTED', 'VERIFIED', 'FINALIZED')
    ORDER BY 
      CASE s.status 
        WHEN 'RECEIVED' THEN 1 
        WHEN 'DRAFT' THEN 2 
        WHEN 'SUBMITTED' THEN 3 
        WHEN 'VERIFIED' THEN 4 
        WHEN 'FINALIZED' THEN 5 
      END,
      s.received_at DESC
  `);
}

// Calculate patient age in days
function calculateAgeDays(dob: string): number {
  const birthDate = new Date(dob);
  const today = new Date();
  const diffMs = today.getTime() - birthDate.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

// Get result data for a sample (for result entry)
export function getSampleResults(sampleId: number): ResultData | null {
  // Get sample info
  const sample = queryOne<SampleForResultEntry>(`
    SELECT 
      s.id, s.sample_uid, o.order_uid,
      p.id as patient_id, p.full_name as patient_name, p.patient_uid, p.dob as patient_dob, p.gender as patient_gender,
      t.id as test_id, tv.test_name, ot.test_version_id,
      s.status
    FROM samples s
    JOIN order_tests ot ON s.order_test_id = ot.id
    JOIN test_versions tv ON ot.test_version_id = tv.id
    JOIN tests t ON tv.test_id = t.id
    JOIN orders o ON ot.order_id = o.id
    JOIN patients p ON o.patient_id = p.id
    WHERE s.id = ?
  `, [sampleId]);

  if (!sample) return null;

  const ageDays = calculateAgeDays(sample.patient_dob);

  // Get parameters for this test version
  const parameters = queryAll<any>(`
    SELECT 
      tp.id as parameter_id, 
      tp.parameter_code, 
      tp.parameter_name, 
      tp.unit
    FROM test_parameters tp
    WHERE tp.test_version_id = ?
    ORDER BY tp.display_order
  `, [sample.test_version_id]);

  // For each parameter, get applicable reference ranges and existing result values
  const parametersWithRanges: ResultParameter[] = parameters.map(param => {
    // Get reference ranges that match age and gender
    const refRanges = queryAll<RefRange>(`
      SELECT 
        rr.lower_limit as min_value, 
        rr.upper_limit as max_value, 
        cr.critical_low, 
        cr.critical_high, 
        rr.age_min_days, 
        rr.age_max_days, 
        rr.gender
      FROM reference_ranges rr
      LEFT JOIN critical_values cr ON cr.parameter_id = rr.parameter_id
      WHERE rr.parameter_id = ?
        AND rr.age_min_days <= ?
        AND (rr.age_max_days IS NULL OR rr.age_max_days >= ?)
        AND (rr.gender = ? OR rr.gender = 'A')
      ORDER BY 
        CASE WHEN rr.gender = ? THEN 0 ELSE 1 END,
        rr.age_min_days DESC
      LIMIT 1
    `, [param.parameter_id, ageDays, ageDays, sample.patient_gender, sample.patient_gender]);

    // Get existing result value if any
    const existingResult = queryOne<{ result_value: string; abnormal_flag: string }>(`
      SELECT tr.result_value, tr.abnormal_flag
      FROM test_results tr
      JOIN samples s ON tr.order_test_id = s.order_test_id
      WHERE s.id = ? AND tr.parameter_id = ?\n    `, [sampleId, param.parameter_id]);

    return {
      parameter_id: param.parameter_id,
      parameter_code: param.parameter_code,
      parameter_name: param.parameter_name,
      unit: param.unit,
      result_value: existingResult?.result_value,
      abnormal_flag: existingResult?.abnormal_flag,
      ref_ranges: refRanges
    };
  });

  // Get previous results for delta check
  const previousResults = getPreviousResults(sample.patient_id, sample.test_id, sampleId);

  return {
    sample_id: sampleId,
    sample_uid: sample.sample_uid,
    patient_id: sample.patient_id,
    patient_name: sample.patient_name,
    patient_uid: sample.patient_uid,
    patient_age_days: ageDays,
    patient_gender: sample.patient_gender,
    test_id: sample.test_id,
    test_name: sample.test_name,
    test_version_id: sample.test_version_id,
    status: sample.status,
    parameters: parametersWithRanges,
    previousResults
  };
}

// Get previous results for delta check
export function getPreviousResults(patientId: number, testId: number, currentSampleId: number): PreviousResult[] {
  return queryAll<PreviousResult>(`
    SELECT 
      tp.parameter_code,
      tr.result_value as value,
      s.received_at as test_date
    FROM test_results tr
    JOIN test_parameters tp ON tr.parameter_id = tp.id
    JOIN order_tests ot ON tr.order_test_id = ot.id
    JOIN samples s ON s.order_test_id = ot.id
    JOIN test_versions tv ON ot.test_version_id = tv.id
    JOIN tests t ON tv.test_id = t.id
    JOIN orders o ON ot.order_id = o.id
    WHERE o.patient_id = ?
      AND t.id = ?
      AND s.id != ?
      AND tr.result_value IS NOT NULL
    ORDER BY s.received_at DESC
    LIMIT 1
  `, [patientId, testId, currentSampleId]);
}

// Calculate abnormal flag based on value and reference range
function calculateAbnormalFlag(value: string, refRange: RefRange | undefined): string {
  if (!refRange || !value) return '';

  const numValue = parseFloat(value);
  if (isNaN(numValue)) return '';

  // Check critical values first
  if (refRange.critical_low !== null && numValue <= refRange.critical_low) return 'CRITICAL_LOW';
  if (refRange.critical_high !== null && numValue >= refRange.critical_high) return 'CRITICAL_HIGH';

  // Check normal range
  if (refRange.min_value !== null && numValue < refRange.min_value) return 'LOW';
  if (refRange.max_value !== null && numValue > refRange.max_value) return 'HIGH';

  return 'NORMAL';
}

// Save result values (DRAFT state)
export function saveResultValues(data: {
  sampleId: number;
  values: { parameterId: number; value: string; abnormalFlag?: string }[];
  comments?: string;
}): { success: boolean; error?: string } {
  try {
    // Get order_test_id from sample
    const sample = queryOne<{ order_test_id: number }>('SELECT order_test_id FROM samples WHERE id = ?', [data.sampleId]);
    if (!sample) throw new Error('Sample not found');

    // Delete existing values for this order_test
    run('DELETE FROM test_results WHERE order_test_id = ?', [sample.order_test_id]);

    // Insert new values
    for (const val of data.values) {
      if (!val.value) continue; // Skip empty values

      // Normalize abnormal flag: empty -> null, CRITICAL_LOW/HIGH -> CRITICAL
      let flag: string | null = val.abnormalFlag || null;
      if (flag === 'CRITICAL_LOW' || flag === 'CRITICAL_HIGH') {
        flag = 'CRITICAL';
      }

      runWithId(`
        INSERT INTO test_results (order_test_id, parameter_id, result_value, abnormal_flag, entered_at, entered_by)
        VALUES (?, ?, ?, ?, datetime('now'), ?)
      `, [sample.order_test_id, val.parameterId, val.value, flag, 1]); // TODO: Use actual user ID
    }

    // Update sample status to DRAFT if not already
    run(`UPDATE samples SET status = 'DRAFT' WHERE id = ?`, [data.sampleId]);

    return { success: true };
  } catch (error: any) {
    console.error('Save result values error:', error);
    return { success: false, error: error.message };
  }
}

// Submit results for verification
export function submitResults(sampleId: number): { success: boolean; error?: string } {
  try {
    run(`UPDATE samples SET status = 'SUBMITTED' WHERE id = ?`, [sampleId]);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// Verify results (pathologist)
export function verifyResults(sampleId: number, verifiedBy: number): { success: boolean; error?: string } {
  try {
    run(`
      UPDATE samples 
      SET status = 'VERIFIED', verified_at = datetime('now'), verified_by = ?
      WHERE id = ?
    `, [verifiedBy, sampleId]);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// Finalize results (lock)
export function finalizeResults(sampleId: number): { success: boolean; error?: string } {
  try {
    run(`UPDATE samples SET status = 'FINALIZED' WHERE id = ?`, [sampleId]);

    // Update order test status
    run(`
      UPDATE order_tests
      SET status = 'FINALIZED'
      WHERE id = (SELECT order_test_id FROM samples WHERE id = ?)
    `, [sampleId]);

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

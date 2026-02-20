import Database from 'better-sqlite3';
import { app } from 'electron';
import * as path from 'path';
import bcrypt from 'bcryptjs';

let db: Database.Database | null = null;

export function initDatabase(): Database.Database {
  if (db) return db;

  const dbPath = path.join(app.getPath('userData'), 'patholab.db');
  console.log(`Database path: ${dbPath}`);

  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.pragma('wal_checkpoint(TRUNCATE)'); // Flush WAL on startup for power failure resilience

  // Run migrations
  runMigrations(db);

  // Ensure admin password is correct (fixes hash mismatch issues)
  ensureAdminPassword(db);

  return db;
}

export function getDb(): Database.Database {
  if (!db) throw new Error('Database not initialized');
  return db;
}

export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
  }
}

// Query helpers
export function queryAll<T>(sql: string, params: any[] = []): T[] {
  return getDb().prepare(sql).all(...params) as T[];
}

export function queryOne<T>(sql: string, params: any[] = []): T | undefined {
  return getDb().prepare(sql).get(...params) as T | undefined;
}

export function run(sql: string, params: any[] = []): Database.RunResult {
  return getDb().prepare(sql).run(...params);
}

export function runWithId(sql: string, params: any[] = []): number {
  const result = getDb().prepare(sql).run(...params);
  return Number(result.lastInsertRowid);
}

// Ensure admin user has correct password (fixes pre-computed hash issues)
function ensureAdminPassword(database: Database.Database): void {
  const correctHash = bcrypt.hashSync('admin123', 10);
  database.prepare('UPDATE users SET password_hash = ? WHERE username = ?').run(correctHash, 'admin');
  console.log('Admin password hash updated');
}

// Migrations
function runMigrations(database: Database.Database): void {
  database.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id INTEGER PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      applied_at TEXT NOT NULL
    )
  `);

  const migrations = getMigrations();

  for (const migration of migrations) {
    const exists = database.prepare('SELECT 1 FROM _migrations WHERE name = ?').get(migration.name);
    if (!exists) {
      console.log(`Applying migration: ${migration.name}`);
      database.exec(migration.sql);
      database.prepare('INSERT INTO _migrations (name, applied_at) VALUES (?, datetime(\'now\'))').run(migration.name);
    }
  }
}

function getMigrations() {
  return [
    {
      name: '001_initial_schema',
      sql: `
        CREATE TABLE roles (id INTEGER PRIMARY KEY, name TEXT UNIQUE NOT NULL);
        INSERT INTO roles VALUES (1, 'admin'), (2, 'receptionist'), (3, 'technician'), (4, 'pathologist'), (5, 'auditor');

        CREATE TABLE users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT UNIQUE NOT NULL,
          password_hash TEXT NOT NULL,
          full_name TEXT NOT NULL,
          role_id INTEGER NOT NULL REFERENCES roles(id),
          is_active INTEGER DEFAULT 1,
          created_at TEXT NOT NULL
        );
        INSERT INTO users (username, password_hash, full_name, role_id, created_at) 
        VALUES ('admin', '$2a$10$rOzJqQZQxLhQJaVKD9GEF.fPwvgbRI4Px4xvVhGGzZxo4hfXk.kfS', 'Administrator', 1, datetime('now'));

        CREATE TABLE patients (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          patient_uid TEXT UNIQUE NOT NULL,
          full_name TEXT NOT NULL,
          dob TEXT NOT NULL,
          gender TEXT CHECK (gender IN ('M','F','O')) NOT NULL,
          phone TEXT,
          address TEXT,
          created_at TEXT NOT NULL
        );

        CREATE TABLE tests (id INTEGER PRIMARY KEY AUTOINCREMENT, test_code TEXT UNIQUE NOT NULL, is_active INTEGER DEFAULT 1);

        CREATE TABLE test_versions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          test_id INTEGER NOT NULL REFERENCES tests(id),
          test_name TEXT NOT NULL,
          department TEXT NOT NULL,
          method TEXT NOT NULL,
          sample_type TEXT NOT NULL,
          report_group TEXT,
          version_no INTEGER NOT NULL,
          effective_from TEXT NOT NULL,
          created_by INTEGER REFERENCES users(id),
          created_at TEXT NOT NULL
        );

        CREATE TABLE test_parameters (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          test_version_id INTEGER NOT NULL REFERENCES test_versions(id),
          parameter_code TEXT NOT NULL,
          parameter_name TEXT NOT NULL,
          data_type TEXT CHECK (data_type IN ('NUMERIC','TEXT','BOOLEAN','CALCULATED')) NOT NULL,
          unit TEXT,
          decimal_precision INTEGER,
          display_order INTEGER,
          is_mandatory INTEGER DEFAULT 1,
          formula TEXT,
          UNIQUE(test_version_id, parameter_code)
        );

        CREATE TABLE reference_ranges (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          parameter_id INTEGER NOT NULL REFERENCES test_parameters(id),
          gender TEXT CHECK (gender IN ('M','F','A')) NOT NULL,
          age_min_days INTEGER NOT NULL,
          age_max_days INTEGER NOT NULL,
          lower_limit REAL,
          upper_limit REAL,
          display_text TEXT,
          effective_from TEXT NOT NULL
        );

        CREATE TABLE critical_values (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          parameter_id INTEGER NOT NULL REFERENCES test_parameters(id),
          critical_low REAL,
          critical_high REAL
        );

        CREATE TABLE orders (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          order_uid TEXT UNIQUE NOT NULL,
          patient_id INTEGER NOT NULL REFERENCES patients(id),
          order_date TEXT NOT NULL
        );

        CREATE TABLE order_tests (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          order_id INTEGER NOT NULL REFERENCES orders(id),
          test_version_id INTEGER NOT NULL REFERENCES test_versions(id),
          status TEXT CHECK (status IN ('ORDERED','RESULT_ENTERED','FINALIZED')) DEFAULT 'ORDERED'
        );

        CREATE TABLE samples (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          sample_uid TEXT UNIQUE NOT NULL,
          order_test_id INTEGER NOT NULL REFERENCES order_tests(id),
          collected_at TEXT,
          status TEXT CHECK (status IN ('COLLECTED','RECEIVED','REJECTED')) NOT NULL,
          rejection_reason TEXT
        );

        CREATE TABLE test_results (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          order_test_id INTEGER NOT NULL REFERENCES order_tests(id),
          parameter_id INTEGER NOT NULL REFERENCES test_parameters(id),
          result_value TEXT NOT NULL,
          abnormal_flag TEXT CHECK (abnormal_flag IN ('NORMAL','HIGH','LOW','CRITICAL')),
          status TEXT CHECK (status IN ('DRAFT','ENTERED','VERIFIED','FINALIZED')) DEFAULT 'DRAFT',
          source TEXT CHECK (source IN ('MANUAL','ANALYZER')) DEFAULT 'MANUAL',
          entered_by INTEGER REFERENCES users(id),
          entered_at TEXT NOT NULL,
          UNIQUE(order_test_id, parameter_id)
        );

        CREATE TABLE audit_log (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          entity TEXT NOT NULL,
          entity_id INTEGER,
          action TEXT NOT NULL,
          old_value TEXT,
          new_value TEXT,
          performed_by INTEGER REFERENCES users(id),
          performed_at TEXT NOT NULL
        );
      `
    },
    {
      name: '002_seed_sample_data',
      sql: `
        INSERT INTO tests (test_code, is_active) VALUES ('CBC', 1);
        INSERT INTO test_versions (test_id, test_name, department, method, sample_type, version_no, effective_from, created_at)
        VALUES (1, 'Complete Blood Count', 'Hematology', 'Analyzer', 'Blood', 1, datetime('now'), datetime('now'));
        
        INSERT INTO test_parameters (test_version_id, parameter_code, parameter_name, data_type, unit, display_order, is_mandatory) VALUES 
          (1, 'HB', 'Hemoglobin', 'NUMERIC', 'g/dL', 1, 1),
          (1, 'WBC', 'WBC Count', 'NUMERIC', 'x10³/µL', 2, 1),
          (1, 'RBC', 'RBC Count', 'NUMERIC', 'x10⁶/µL', 3, 1),
          (1, 'PLT', 'Platelet Count', 'NUMERIC', 'x10⁵/µL', 4, 1),
          (1, 'HCT', 'Hematocrit', 'NUMERIC', '%', 5, 1);

        INSERT INTO reference_ranges (parameter_id, gender, age_min_days, age_max_days, lower_limit, upper_limit, effective_from) VALUES 
          (1, 'M', 365, 36500, 13.0, 17.0, datetime('now')),
          (1, 'F', 365, 36500, 12.0, 15.0, datetime('now')),
          (1, 'A', 0, 364, 10.0, 14.0, datetime('now'));

        INSERT INTO critical_values (parameter_id, critical_low, critical_high) VALUES (1, 7.0, 20.0);

        INSERT INTO tests (test_code, is_active) VALUES ('LFT', 1), ('RFT', 1);
        INSERT INTO test_versions (test_id, test_name, department, method, sample_type, version_no, effective_from, created_at) VALUES
          (2, 'Liver Function Test', 'Biochemistry', 'Analyzer', 'Serum', 1, datetime('now'), datetime('now')),
          (3, 'Renal Function Test', 'Biochemistry', 'Analyzer', 'Serum', 1, datetime('now'), datetime('now'));

        INSERT INTO patients (patient_uid, full_name, dob, gender, phone, created_at)
        VALUES ('PID-10231', 'Rahul Sharma', '1986-03-15', 'M', '9876543210', datetime('now'));
      `
    },
    {
      name: '003_billing_columns',
      sql: `
        ALTER TABLE orders ADD COLUMN total_amount REAL DEFAULT 0;
        ALTER TABLE orders ADD COLUMN discount REAL DEFAULT 0;
        ALTER TABLE orders ADD COLUMN net_amount REAL DEFAULT 0;
        ALTER TABLE orders ADD COLUMN payment_status TEXT DEFAULT 'PENDING';
        ALTER TABLE order_tests ADD COLUMN price REAL DEFAULT 0;
        ALTER TABLE samples ADD COLUMN received_at TEXT;
      `
    },
    {
      name: '004_result_workflow',
      sql: `
        -- Update samples table to support result workflow statuses
        -- SQLite doesn't support ALTER TABLE to modify CHECK constraints, so we need to work around this
        -- The new statuses (DRAFT, SUBMITTED, VERIFIED, FINALIZED) will be allowed even though they're not in the original CHECK
        -- This is acceptable as SQLite CHECK constraints are not strictly enforced in all cases
        
        ALTER TABLE samples ADD COLUMN verified_by INTEGER REFERENCES users(id);
        ALTER TABLE samples ADD COLUMN verified_at TEXT;
        
        -- Note: In production, you should recreate the table with proper constraints
        -- For now, we'll rely on application-level validation for status values
      `
    },
    {
      name: '005_seed_rft_lft_params',
      sql: `
        -- LFT Parameters (Liver Function Test)
        -- Using existing test_version_id = 2 for LFT
        INSERT INTO test_parameters (test_version_id, parameter_code, parameter_name, data_type, unit, display_order, is_mandatory) VALUES 
          (2, 'TBIL', 'Total Bilirubin', 'NUMERIC', 'mg/dL', 1, 1),
          (2, 'DBIL', 'Direct Bilirubin', 'NUMERIC', 'mg/dL', 2, 1),
          (2, 'IBIL', 'Indirect Bilirubin', 'CALCULATED', 'mg/dL', 3, 1),
          (2, 'SGOT', 'SGOT (AST)', 'NUMERIC', 'U/L', 4, 1),
          (2, 'SGPT', 'SGPT (ALT)', 'NUMERIC', 'U/L', 5, 1),
          (2, 'ALP', 'Alkaline Phosphatase', 'NUMERIC', 'U/L', 6, 1),
          (2, 'PROT', 'Total Protein', 'NUMERIC', 'g/dL', 7, 1),
          (2, 'ALB', 'Albumin', 'NUMERIC', 'g/dL', 8, 1),
          (2, 'GLOB', 'Globulin', 'CALCULATED', 'g/dL', 9, 1),
          (2, 'AG_RATIO', 'A:G Ratio', 'CALCULATED', '', 10, 0);

        -- RFT Parameters (Renal Function Test)
        -- Using existing test_version_id = 3 for RFT
        INSERT INTO test_parameters (test_version_id, parameter_code, parameter_name, data_type, unit, display_order, is_mandatory) VALUES 
          (3, 'UREA', 'Blood Urea', 'NUMERIC', 'mg/dL', 1, 1),
          (3, 'CREAT', 'Serum Creatinine', 'NUMERIC', 'mg/dL', 2, 1),
          (3, 'URIC', 'Uric Acid', 'NUMERIC', 'mg/dL', 3, 1),
          (3, 'BUN', 'Blood Urea Nitrogen', 'CALCULATED', 'mg/dL', 4, 0),
          (3, 'NA', 'Sodium (Na+)', 'NUMERIC', 'mmol/L', 5, 1),
          (3, 'K', 'Potassium (K+)', 'NUMERIC', 'mmol/L', 6, 1),
          (3, 'CL', 'Chloride (Cl-)', 'NUMERIC', 'mmol/L', 7, 1);

        -- Update formulas
        UPDATE test_parameters SET formula = 'TBIL - DBIL' WHERE parameter_code = 'IBIL';
        UPDATE test_parameters SET formula = 'PROT - ALB' WHERE parameter_code = 'GLOB';
        UPDATE test_parameters SET formula = 'ALB / GLOB' WHERE parameter_code = 'AG_RATIO';
        UPDATE test_parameters SET formula = 'UREA / 2.14' WHERE parameter_code = 'BUN';
      `
    },
    {
      name: '006_test_wizard_support',
      sql: `
        -- Add status and wizard progress tracking to test_versions
        ALTER TABLE test_versions ADD COLUMN status TEXT CHECK (status IN ('DRAFT', 'PUBLISHED', 'ARCHIVED')) DEFAULT 'PUBLISHED';
        ALTER TABLE test_versions ADD COLUMN wizard_step INTEGER DEFAULT 6; 
        -- Default to 6 (completed) for existing tests
        
        -- Add comments/interpretation template to test_versions
        ALTER TABLE test_versions ADD COLUMN interpretation_template TEXT;
        
        -- Ensure tests created via wizard can be identified
        -- We will use status='DRAFT' for ongoing wizard flows
      `
    },
    {
      name: '007_seed_common_tests',
      sql: `
        -- 1. Hematology Updates
        -- 1.1 Update CBC (Test ID 1) - Add missing parameters
        INSERT OR IGNORE INTO test_parameters (test_version_id, parameter_code, parameter_name, data_type, unit, display_order, is_mandatory) VALUES 
          (1, 'MCV', 'MCV', 'NUMERIC', 'fL', 6, 1),
          (1, 'MCH', 'MCH', 'NUMERIC', 'pg', 7, 1),
          (1, 'MCHC', 'MCHC', 'NUMERIC', 'g/dL', 8, 1),
          (1, 'RDW', 'RDW-CV', 'NUMERIC', '%', 9, 1),
          (1, 'NEUT', 'Neutrophils', 'NUMERIC', '%', 10, 1),
          (1, 'LYMPH', 'Lymphocytes', 'NUMERIC', '%', 11, 1),
          (1, 'MONO', 'Monocytes', 'NUMERIC', '%', 12, 1),
          (1, 'EOS', 'Eosinophils', 'NUMERIC', '%', 13, 1),
          (1, 'BASO', 'Basophils', 'NUMERIC', '%', 14, 1);
        
        -- CBC Reference Ranges (Male/Female/All)
        -- MCV
        INSERT OR IGNORE INTO reference_ranges (parameter_id, gender, age_min_days, age_max_days, lower_limit, upper_limit, effective_from) 
        SELECT id, 'A', 0, 36500, 80, 96, datetime('now') FROM test_parameters WHERE parameter_code = 'MCV';
        -- MCH
        INSERT OR IGNORE INTO reference_ranges (parameter_id, gender, age_min_days, age_max_days, lower_limit, upper_limit, effective_from) 
        SELECT id, 'A', 0, 36500, 27, 33, datetime('now') FROM test_parameters WHERE parameter_code = 'MCH';
        -- MCHC
        INSERT OR IGNORE INTO reference_ranges (parameter_id, gender, age_min_days, age_max_days, lower_limit, upper_limit, effective_from) 
        SELECT id, 'A', 0, 36500, 32, 36, datetime('now') FROM test_parameters WHERE parameter_code = 'MCHC';
        -- RDW
        INSERT OR IGNORE INTO reference_ranges (parameter_id, gender, age_min_days, age_max_days, lower_limit, upper_limit, effective_from) 
        SELECT id, 'A', 0, 36500, 11.5, 14.5, datetime('now') FROM test_parameters WHERE parameter_code = 'RDW';
        
        -- DLC Ranges
        INSERT OR IGNORE INTO reference_ranges (parameter_id, gender, age_min_days, age_max_days, lower_limit, upper_limit, effective_from) SELECT id, 'A', 0, 36500, 40, 70, datetime('now') FROM test_parameters WHERE parameter_code = 'NEUT';
        INSERT OR IGNORE INTO reference_ranges (parameter_id, gender, age_min_days, age_max_days, lower_limit, upper_limit, effective_from) SELECT id, 'A', 0, 36500, 20, 40, datetime('now') FROM test_parameters WHERE parameter_code = 'LYMPH';
        INSERT OR IGNORE INTO reference_ranges (parameter_id, gender, age_min_days, age_max_days, lower_limit, upper_limit, effective_from) SELECT id, 'A', 0, 36500, 2, 8, datetime('now') FROM test_parameters WHERE parameter_code = 'MONO';
        INSERT OR IGNORE INTO reference_ranges (parameter_id, gender, age_min_days, age_max_days, lower_limit, upper_limit, effective_from) SELECT id, 'A', 0, 36500, 1, 6, datetime('now') FROM test_parameters WHERE parameter_code = 'EOS';
        INSERT OR IGNORE INTO reference_ranges (parameter_id, gender, age_min_days, age_max_days, lower_limit, upper_limit, effective_from) SELECT id, 'A', 0, 36500, 0, 1, datetime('now') FROM test_parameters WHERE parameter_code = 'BASO';

        -- 1.2 ESR
        INSERT OR IGNORE INTO tests (test_code, is_active) VALUES ('ESR', 1);
        INSERT OR IGNORE INTO test_versions (test_id, test_name, department, method, sample_type, version_no, effective_from, status, wizard_step, created_at)
        VALUES ((SELECT id FROM tests WHERE test_code='ESR'), 'Erythrocyte Sedimentation Rate', 'Hematology', 'Westergren', 'Whole Blood', 1, datetime('now'), 'PUBLISHED', 6, datetime('now'));
        
        INSERT OR IGNORE INTO test_parameters (test_version_id, parameter_code, parameter_name, data_type, unit, display_order, is_mandatory)
        VALUES ((SELECT id FROM test_versions WHERE test_name='Erythrocyte Sedimentation Rate'), 'ESR', 'ESR (1st Hour)', 'NUMERIC', 'mm/hr', 1, 1);
        
        INSERT OR IGNORE INTO reference_ranges (parameter_id, gender, age_min_days, age_max_days, lower_limit, upper_limit, effective_from)
        VALUES 
        ((SELECT id FROM test_parameters WHERE parameter_code='ESR'), 'M', 0, 36500, 0, 15, datetime('now')),
        ((SELECT id FROM test_parameters WHERE parameter_code='ESR'), 'F', 0, 36500, 0, 20, datetime('now'));


        -- 2. Biochemistry
        -- 2.1 Glucose (FBS, PPBS, RBS)
        INSERT OR IGNORE INTO tests (test_code, is_active) VALUES ('FBS', 1), ('PPBS', 1), ('RBS', 1);
        
        -- FBS
        INSERT OR IGNORE INTO test_versions (test_id, test_name, department, method, sample_type, version_no, effective_from, status, wizard_step, created_at)
        VALUES ((SELECT id FROM tests WHERE test_code='FBS'), 'Fasting Blood Sugar', 'Biochemistry', 'GOD-POD', 'Fluoride Plasma', 1, datetime('now'), 'PUBLISHED', 6, datetime('now'));
        INSERT OR IGNORE INTO test_parameters (test_version_id, parameter_code, parameter_name, data_type, unit, display_order, is_mandatory)
        VALUES ((SELECT id FROM test_versions WHERE test_name='Fasting Blood Sugar'), 'GLU_F', 'Fasting Plasma Glucose', 'NUMERIC', 'mg/dL', 1, 1);
        INSERT OR IGNORE INTO reference_ranges (parameter_id, gender, age_min_days, age_max_days, lower_limit, upper_limit, effective_from)
        VALUES ((SELECT id FROM test_parameters WHERE parameter_code='GLU_F'), 'A', 0, 36500, 70, 99, datetime('now'));

        -- PPBS
        INSERT OR IGNORE INTO test_versions (test_id, test_name, department, method, sample_type, version_no, effective_from, status, wizard_step, created_at)
        VALUES ((SELECT id FROM tests WHERE test_code='PPBS'), 'Post Prandial Blood Sugar', 'Biochemistry', 'GOD-POD', 'Fluoride Plasma', 1, datetime('now'), 'PUBLISHED', 6, datetime('now'));
        INSERT OR IGNORE INTO test_parameters (test_version_id, parameter_code, parameter_name, data_type, unit, display_order, is_mandatory)
        VALUES ((SELECT id FROM test_versions WHERE test_name='Post Prandial Blood Sugar'), 'GLU_PP', 'Plasma Glucose (PP)', 'NUMERIC', 'mg/dL', 1, 1);
        INSERT OR IGNORE INTO reference_ranges (parameter_id, gender, age_min_days, age_max_days, upper_limit, effective_from)
        VALUES ((SELECT id FROM test_parameters WHERE parameter_code='GLU_PP'), 'A', 0, 36500, 140, datetime('now'));

        -- RBS
        INSERT OR IGNORE INTO test_versions (test_id, test_name, department, method, sample_type, version_no, effective_from, status, wizard_step, created_at)
        VALUES ((SELECT id FROM tests WHERE test_code='RBS'), 'Random Blood Sugar', 'Biochemistry', 'GOD-POD', 'Fluoride Plasma', 1, datetime('now'), 'PUBLISHED', 6, datetime('now'));
        INSERT OR IGNORE INTO test_parameters (test_version_id, parameter_code, parameter_name, data_type, unit, display_order, is_mandatory)
        VALUES ((SELECT id FROM test_versions WHERE test_name='Random Blood Sugar'), 'GLU_R', 'Random Plasma Glucose', 'NUMERIC', 'mg/dL', 1, 1);
        INSERT OR IGNORE INTO reference_ranges (parameter_id, gender, age_min_days, age_max_days, lower_limit, upper_limit, effective_from)
        VALUES ((SELECT id FROM test_parameters WHERE parameter_code='GLU_R'), 'A', 0, 36500, 70, 140, datetime('now'));


        -- 2.4 Lipid Profile
        INSERT OR IGNORE INTO tests (test_code, is_active) VALUES ('LIPID', 1);
        INSERT OR IGNORE INTO test_versions (test_id, test_name, department, method, sample_type, version_no, effective_from, status, wizard_step, created_at)
        VALUES ((SELECT id FROM tests WHERE test_code='LIPID'), 'Lipid Profile', 'Biochemistry', 'Analyzer', 'Serum', 1, datetime('now'), 'PUBLISHED', 6, datetime('now'));
        
        INSERT OR IGNORE INTO test_parameters (test_version_id, parameter_code, parameter_name, data_type, unit, display_order, is_mandatory, formula) VALUES 
          ((SELECT id FROM test_versions WHERE test_name='Lipid Profile'), 'CHOL', 'Total Cholesterol', 'NUMERIC', 'mg/dL', 1, 1, NULL),
          ((SELECT id FROM test_versions WHERE test_name='Lipid Profile'), 'TRIG', 'Triglycerides', 'NUMERIC', 'mg/dL', 2, 1, NULL),
          ((SELECT id FROM test_versions WHERE test_name='Lipid Profile'), 'HDL', 'HDL Cholesterol', 'NUMERIC', 'mg/dL', 3, 1, NULL),
          ((SELECT id FROM test_versions WHERE test_name='Lipid Profile'), 'LDL', 'LDL Cholesterol', 'NUMERIC', 'mg/dL', 4, 1, NULL),
          ((SELECT id FROM test_versions WHERE test_name='Lipid Profile'), 'VLDL', 'VLDL Cholesterol', 'NUMERIC', 'mg/dL', 5, 1, NULL),
          ((SELECT id FROM test_versions WHERE test_name='Lipid Profile'), 'TC_HDL', 'TC / HDL Ratio', 'CALCULATED', 'Ratio', 6, 0, 'CHOL / HDL');

        -- Lipid Ref Ranges
        INSERT OR IGNORE INTO reference_ranges (parameter_id, gender, age_min_days, age_max_days, upper_limit, effective_from)
        SELECT id, 'A', 0, 36500, 200, datetime('now') FROM test_parameters WHERE parameter_code = 'CHOL';
        INSERT OR IGNORE INTO reference_ranges (parameter_id, gender, age_min_days, age_max_days, upper_limit, effective_from)
        SELECT id, 'A', 0, 36500, 150, datetime('now') FROM test_parameters WHERE parameter_code = 'TRIG';
        
        INSERT OR IGNORE INTO reference_ranges (parameter_id, gender, age_min_days, age_max_days, lower_limit, effective_from)
        SELECT id, 'M', 0, 36500, 40, datetime('now') FROM test_parameters WHERE parameter_code = 'HDL';
        INSERT OR IGNORE INTO reference_ranges (parameter_id, gender, age_min_days, age_max_days, lower_limit, effective_from)
        SELECT id, 'F', 0, 36500, 50, datetime('now') FROM test_parameters WHERE parameter_code = 'HDL';
        
        INSERT OR IGNORE INTO reference_ranges (parameter_id, gender, age_min_days, age_max_days, upper_limit, effective_from)
        SELECT id, 'A', 0, 36500, 100, datetime('now') FROM test_parameters WHERE parameter_code = 'LDL';
        INSERT OR IGNORE INTO reference_ranges (parameter_id, gender, age_min_days, age_max_days, lower_limit, upper_limit, effective_from)
        SELECT id, 'A', 0, 36500, 5, 40, datetime('now') FROM test_parameters WHERE parameter_code = 'VLDL';
        INSERT OR IGNORE INTO reference_ranges (parameter_id, gender, age_min_days, age_max_days, upper_limit, effective_from)
        SELECT id, 'A', 0, 36500, 5.0, datetime('now') FROM test_parameters WHERE parameter_code = 'TC_HDL';

        -- 4. Hormones (Thyroid Profile)
        INSERT OR IGNORE INTO tests (test_code, is_active) VALUES ('TFT', 1);
        INSERT OR IGNORE INTO test_versions (test_id, test_name, department, method, sample_type, version_no, effective_from, status, wizard_step, created_at)
        VALUES ((SELECT id FROM tests WHERE test_code='TFT'), 'Thyroid Function Test', 'Immunology', 'CLIA', 'Serum', 1, datetime('now'), 'PUBLISHED', 6, datetime('now'));

        INSERT OR IGNORE INTO test_parameters (test_version_id, parameter_code, parameter_name, data_type, unit, display_order, is_mandatory) VALUES 
          ((SELECT id FROM test_versions WHERE test_name='Thyroid Function Test'), 'T3', 'Triiodothyronine (T3)', 'NUMERIC', 'ng/mL', 1, 1),
          ((SELECT id FROM test_versions WHERE test_name='Thyroid Function Test'), 'T4', 'Thyroxine (T4)', 'NUMERIC', 'µg/dL', 2, 1),
          ((SELECT id FROM test_versions WHERE test_name='Thyroid Function Test'), 'TSH', 'Thyroid Stimulating Hormone', 'NUMERIC', 'µIU/mL', 3, 1);

        INSERT OR IGNORE INTO reference_ranges (parameter_id, gender, age_min_days, age_max_days, lower_limit, upper_limit, effective_from)
        SELECT id, 'A', 0, 36500, 0.8, 2.0, datetime('now') FROM test_parameters WHERE parameter_code = 'T3';
        INSERT OR IGNORE INTO reference_ranges (parameter_id, gender, age_min_days, age_max_days, lower_limit, upper_limit, effective_from)
        SELECT id, 'A', 0, 36500, 5.0, 12.0, datetime('now') FROM test_parameters WHERE parameter_code = 'T4';
        INSERT OR IGNORE INTO reference_ranges (parameter_id, gender, age_min_days, age_max_days, lower_limit, upper_limit, effective_from)
        SELECT id, 'A', 0, 36500, 0.4, 4.0, datetime('now') FROM test_parameters WHERE parameter_code = 'TSH';

        -- 5. Clinical Pathology (Urine Routine)
        INSERT OR IGNORE INTO tests (test_code, is_active) VALUES ('CUE', 1);
        INSERT OR IGNORE INTO test_versions (test_id, test_name, department, method, sample_type, version_no, effective_from, status, wizard_step, created_at)
        VALUES ((SELECT id FROM tests WHERE test_code='CUE'), 'Urine Routine Examination', 'Clinical Pathology', 'Microscopy/Dipstick', 'Urine', 1, datetime('now'), 'PUBLISHED', 6, datetime('now'));

        INSERT OR IGNORE INTO test_parameters (test_version_id, parameter_code, parameter_name, data_type, unit, display_order, is_mandatory) VALUES 
          ((SELECT id FROM test_versions WHERE test_name='Urine Routine Examination'), 'U_COL', 'Color', 'TEXT', NULL, 1, 1),
          ((SELECT id FROM test_versions WHERE test_name='Urine Routine Examination'), 'U_APP', 'Appearance', 'TEXT', NULL, 2, 1),
          ((SELECT id FROM test_versions WHERE test_name='Urine Routine Examination'), 'U_PH', 'pH', 'NUMERIC', NULL, 3, 0),
          ((SELECT id FROM test_versions WHERE test_name='Urine Routine Examination'), 'U_SG', 'Specific Gravity', 'NUMERIC', NULL, 4, 0),
          ((SELECT id FROM test_versions WHERE test_name='Urine Routine Examination'), 'U_PRO', 'Protein', 'TEXT', NULL, 5, 1),
          ((SELECT id FROM test_versions WHERE test_name='Urine Routine Examination'), 'U_SUG', 'Sugar', 'TEXT', NULL, 6, 1),
          ((SELECT id FROM test_versions WHERE test_name='Urine Routine Examination'), 'U_RBC', 'RBC', 'TEXT', '/HPF', 7, 0),
          ((SELECT id FROM test_versions WHERE test_name='Urine Routine Examination'), 'U_PUS', 'Pus Cells', 'TEXT', '/HPF', 8, 0);

        -- 6. Coagulation
        INSERT OR IGNORE INTO tests (test_code, is_active) VALUES ('COAG', 1);
        INSERT OR IGNORE INTO test_versions (test_id, test_name, department, method, sample_type, version_no, effective_from, status, wizard_step, created_at)
        VALUES ((SELECT id FROM tests WHERE test_code='COAG'), 'Coagulation Profile', 'Hematology', 'Coagulometer', 'Citrated Plasma', 1, datetime('now'), 'PUBLISHED', 6, datetime('now'));

        INSERT OR IGNORE INTO test_parameters (test_version_id, parameter_code, parameter_name, data_type, unit, display_order, is_mandatory) VALUES 
          ((SELECT id FROM test_versions WHERE test_name='Coagulation Profile'), 'PT', 'Prothrombin Time (PT)', 'NUMERIC', 'sec', 1, 1),
          ((SELECT id FROM test_versions WHERE test_name='Coagulation Profile'), 'INR', 'INR', 'NUMERIC', 'Ratio', 2, 1),
          ((SELECT id FROM test_versions WHERE test_name='Coagulation Profile'), 'APTT', 'APTT', 'NUMERIC', 'sec', 3, 1);

        INSERT OR IGNORE INTO reference_ranges (parameter_id, gender, age_min_days, age_max_days, lower_limit, upper_limit, effective_from)
        SELECT id, 'A', 0, 36500, 11, 13.5, datetime('now') FROM test_parameters WHERE parameter_code = 'PT';
        INSERT OR IGNORE INTO reference_ranges (parameter_id, gender, age_min_days, age_max_days, lower_limit, upper_limit, effective_from)
        SELECT id, 'A', 0, 36500, 0.8, 1.2, datetime('now') FROM test_parameters WHERE parameter_code = 'INR';
        INSERT OR IGNORE INTO reference_ranges (parameter_id, gender, age_min_days, age_max_days, lower_limit, upper_limit, effective_from)
        SELECT id, 'A', 0, 36500, 25, 35, datetime('now') FROM test_parameters WHERE parameter_code = 'APTT';

        -- 7. Serology
        INSERT OR IGNORE INTO tests (test_code, is_active) VALUES ('HBSAG', 1), ('HIV', 1), ('WIDAL', 1);

        -- HBsAg
        INSERT OR IGNORE INTO test_versions (test_id, test_name, department, method, sample_type, version_no, effective_from, status, wizard_step, created_at)
        VALUES ((SELECT id FROM tests WHERE test_code='HBSAG'), 'HBsAg', 'Serology', 'Immunochromatography', 'Serum', 1, datetime('now'), 'PUBLISHED', 6, datetime('now'));
        INSERT OR IGNORE INTO test_parameters (test_version_id, parameter_code, parameter_name, data_type, unit, display_order, is_mandatory)
        VALUES ((SELECT id FROM test_versions WHERE test_name='HBsAg'), 'HBSAG_RES', 'Result', 'TEXT', NULL, 1, 1);
        
        -- HIV
        INSERT OR IGNORE INTO test_versions (test_id, test_name, department, method, sample_type, version_no, effective_from, status, wizard_step, created_at)
        VALUES ((SELECT id FROM tests WHERE test_code='HIV'), 'HIV I & II', 'Serology', 'Immunochromatography', 'Serum', 1, datetime('now'), 'PUBLISHED', 6, datetime('now'));
        INSERT OR IGNORE INTO test_parameters (test_version_id, parameter_code, parameter_name, data_type, unit, display_order, is_mandatory)
        VALUES ((SELECT id FROM test_versions WHERE test_name='HIV I & II'), 'HIV_RES', 'Result', 'TEXT', NULL, 1, 1);

        -- Widal
        INSERT OR IGNORE INTO test_versions (test_id, test_name, department, method, sample_type, version_no, effective_from, status, wizard_step, created_at)
        VALUES ((SELECT id FROM tests WHERE test_code='WIDAL'), 'Widal Test', 'Serology', 'Agglutination', 'Serum', 1, datetime('now'), 'PUBLISHED', 6, datetime('now'));
        INSERT OR IGNORE INTO test_parameters (test_version_id, parameter_code, parameter_name, data_type, unit, display_order, is_mandatory) VALUES
        ((SELECT id FROM test_versions WHERE test_name='Widal Test'), 'STO', 'Salmonella Typhi O', 'TEXT', NULL, 1, 1),
        ((SELECT id FROM test_versions WHERE test_name='Widal Test'), 'STH', 'Salmonella Typhi H', 'TEXT', NULL, 2, 1),
        ((SELECT id FROM test_versions WHERE test_name='Widal Test'), 'SPA', 'Salmonella Para Typhi AH', 'TEXT', NULL, 3, 1),
        ((SELECT id FROM test_versions WHERE test_name='Widal Test'), 'SPB', 'Salmonella Para Typhi BH', 'TEXT', NULL, 4, 1),
        ((SELECT id FROM test_versions WHERE test_name='Widal Test'), 'WIDAL_IMP', 'Impression', 'TEXT', NULL, 5, 0);

      `
    },
    {
      name: '008_fix_sample_status_constraint',
      sql: `
        -- Recreate samples table with updated CHECK constraint for result workflow statuses
        
        -- 1. Rename existing table
        ALTER TABLE samples RENAME TO samples_old;
        
        -- 2. Create new table with all columns (including those from migrations 003 and 004)
        CREATE TABLE samples (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          sample_uid TEXT UNIQUE NOT NULL,
          order_test_id INTEGER NOT NULL REFERENCES order_tests(id),
          collected_at TEXT,
          received_at TEXT,
          status TEXT CHECK (status IN ('COLLECTED','RECEIVED','REJECTED','DRAFT','SUBMITTED','VERIFIED','FINALIZED')) NOT NULL,
          rejection_reason TEXT,
          verified_by INTEGER REFERENCES users(id),
          verified_at TEXT
        );
        
        -- 3. Copy data
        INSERT INTO samples (id, sample_uid, order_test_id, collected_at, received_at, status, rejection_reason, verified_by, verified_at)
        SELECT id, sample_uid, order_test_id, collected_at, received_at, status, rejection_reason, verified_by, verified_at
        FROM samples_old;
        
        -- 4. Drop old table
        DROP TABLE samples_old;
      `
    },
    {
      name: '009_reset_tests_comprehensive',
      sql: `
        -- DANGER: This migration clears ALL test data and re-inserts comprehensive dataset
        -- Warning: This also clears orders, samples, results since they depend on tests!
        
        -- 1. Clear dependent data first (order matters due to foreign keys)
        DELETE FROM test_results;
        DELETE FROM samples;
        DELETE FROM order_tests;
        DELETE FROM orders;
        
        -- 2. Clear test master data
        DELETE FROM critical_values;
        DELETE FROM reference_ranges;
        DELETE FROM test_parameters;
        DELETE FROM test_versions;
        DELETE FROM tests;
        
        -- 2. Insert Tests with unique codes
        -- Hematology
        INSERT INTO tests (test_code, is_active) VALUES 
          ('CBC', 1), ('ESR', 1),
        -- Biochemistry
          ('GLUCOSE', 1), ('RFT', 1), ('LFT', 1), ('LIPID', 1),
        -- Serology
          ('HBSAG', 1), ('HIV', 1), ('CRP', 1), ('ASO', 1), ('WIDAL', 1),
        -- Hormones
          ('TFT', 1), ('PROLACTIN', 1), ('VITD', 1), ('VITB12', 1),
        -- Clinical Pathology
          ('URINE', 1), ('STOOL', 1),
        -- Coagulation
          ('COAG', 1);
        
        -- 3. Insert Test Versions (PUBLISHED)
        INSERT INTO test_versions (test_id, test_name, department, method, sample_type, version_no, effective_from, status, wizard_step, created_at) VALUES
          ((SELECT id FROM tests WHERE test_code='CBC'), 'Complete Blood Count (Hemogram)', 'Hematology', 'Analyzer', 'EDTA Blood', 1, datetime('now'), 'PUBLISHED', 6, datetime('now')),
          ((SELECT id FROM tests WHERE test_code='ESR'), 'Erythrocyte Sedimentation Rate', 'Hematology', 'Westergren', 'EDTA Blood', 1, datetime('now'), 'PUBLISHED', 6, datetime('now')),
          ((SELECT id FROM tests WHERE test_code='GLUCOSE'), 'Blood Glucose Panel', 'Biochemistry', 'Analyzer', 'Fluoride Blood', 1, datetime('now'), 'PUBLISHED', 6, datetime('now')),
          ((SELECT id FROM tests WHERE test_code='RFT'), 'Renal Function Test (KFT)', 'Biochemistry', 'Analyzer', 'Serum', 1, datetime('now'), 'PUBLISHED', 6, datetime('now')),
          ((SELECT id FROM tests WHERE test_code='LFT'), 'Liver Function Test', 'Biochemistry', 'Analyzer', 'Serum', 1, datetime('now'), 'PUBLISHED', 6, datetime('now')),
          ((SELECT id FROM tests WHERE test_code='LIPID'), 'Lipid Profile', 'Biochemistry', 'Analyzer', 'Serum (Fasting)', 1, datetime('now'), 'PUBLISHED', 6, datetime('now')),
          ((SELECT id FROM tests WHERE test_code='HBSAG'), 'Hepatitis B Surface Antigen', 'Serology', 'ELISA', 'Serum', 1, datetime('now'), 'PUBLISHED', 6, datetime('now')),
          ((SELECT id FROM tests WHERE test_code='HIV'), 'HIV I & II Antibodies', 'Serology', 'ELISA', 'Serum', 1, datetime('now'), 'PUBLISHED', 6, datetime('now')),
          ((SELECT id FROM tests WHERE test_code='CRP'), 'C-Reactive Protein', 'Serology', 'Turbidimetric', 'Serum', 1, datetime('now'), 'PUBLISHED', 6, datetime('now')),
          ((SELECT id FROM tests WHERE test_code='ASO'), 'Anti-Streptolysin O Titer', 'Serology', 'Turbidimetric', 'Serum', 1, datetime('now'), 'PUBLISHED', 6, datetime('now')),
          ((SELECT id FROM tests WHERE test_code='WIDAL'), 'Widal Test', 'Serology', 'Slide Agglutination', 'Serum', 1, datetime('now'), 'PUBLISHED', 6, datetime('now')),
          ((SELECT id FROM tests WHERE test_code='TFT'), 'Thyroid Function Test', 'Immunology', 'Chemiluminescence', 'Serum', 1, datetime('now'), 'PUBLISHED', 6, datetime('now')),
          ((SELECT id FROM tests WHERE test_code='PROLACTIN'), 'Prolactin', 'Immunology', 'Chemiluminescence', 'Serum', 1, datetime('now'), 'PUBLISHED', 6, datetime('now')),
          ((SELECT id FROM tests WHERE test_code='VITD'), 'Vitamin D (25-OH)', 'Immunology', 'Chemiluminescence', 'Serum', 1, datetime('now'), 'PUBLISHED', 6, datetime('now')),
          ((SELECT id FROM tests WHERE test_code='VITB12'), 'Vitamin B12', 'Immunology', 'Chemiluminescence', 'Serum', 1, datetime('now'), 'PUBLISHED', 6, datetime('now')),
          ((SELECT id FROM tests WHERE test_code='URINE'), 'Urine Routine Examination', 'Clinical Pathology', 'Microscopy', 'Urine', 1, datetime('now'), 'PUBLISHED', 6, datetime('now')),
          ((SELECT id FROM tests WHERE test_code='STOOL'), 'Stool Routine Examination', 'Clinical Pathology', 'Microscopy', 'Stool', 1, datetime('now'), 'PUBLISHED', 6, datetime('now')),
          ((SELECT id FROM tests WHERE test_code='COAG'), 'Coagulation Profile', 'Hematology', 'Analyzer', 'Citrate Blood', 1, datetime('now'), 'PUBLISHED', 6, datetime('now'));

        -- 4. Insert Parameters for each test
        -- CBC Parameters
        INSERT INTO test_parameters (test_version_id, parameter_code, parameter_name, data_type, unit, decimal_precision, display_order, is_mandatory) VALUES
          ((SELECT id FROM test_versions WHERE test_name='Complete Blood Count (Hemogram)'), 'HB', 'Hemoglobin', 'NUMERIC', 'g/dL', 1, 1, 1),
          ((SELECT id FROM test_versions WHERE test_name='Complete Blood Count (Hemogram)'), 'RBC', 'Total RBC Count', 'NUMERIC', 'million/µL', 2, 2, 1),
          ((SELECT id FROM test_versions WHERE test_name='Complete Blood Count (Hemogram)'), 'WBC', 'Total WBC Count', 'NUMERIC', 'cells/µL', 0, 3, 1),
          ((SELECT id FROM test_versions WHERE test_name='Complete Blood Count (Hemogram)'), 'PLT', 'Platelet Count', 'NUMERIC', 'lakh/µL', 2, 4, 1),
          ((SELECT id FROM test_versions WHERE test_name='Complete Blood Count (Hemogram)'), 'PCV', 'Packed Cell Volume (HCT)', 'NUMERIC', '%', 1, 5, 1),
          ((SELECT id FROM test_versions WHERE test_name='Complete Blood Count (Hemogram)'), 'MCV', 'Mean Corpuscular Volume', 'NUMERIC', 'fL', 1, 6, 1),
          ((SELECT id FROM test_versions WHERE test_name='Complete Blood Count (Hemogram)'), 'MCH', 'Mean Corpuscular Hemoglobin', 'NUMERIC', 'pg', 1, 7, 1),
          ((SELECT id FROM test_versions WHERE test_name='Complete Blood Count (Hemogram)'), 'MCHC', 'MCHC', 'NUMERIC', 'g/dL', 1, 8, 1),
          ((SELECT id FROM test_versions WHERE test_name='Complete Blood Count (Hemogram)'), 'RDWCV', 'RDW-CV', 'NUMERIC', '%', 1, 9, 1),
          ((SELECT id FROM test_versions WHERE test_name='Complete Blood Count (Hemogram)'), 'NEUT', 'Neutrophils', 'NUMERIC', '%', 0, 10, 1),
          ((SELECT id FROM test_versions WHERE test_name='Complete Blood Count (Hemogram)'), 'LYMPH', 'Lymphocytes', 'NUMERIC', '%', 0, 11, 1),
          ((SELECT id FROM test_versions WHERE test_name='Complete Blood Count (Hemogram)'), 'MONO', 'Monocytes', 'NUMERIC', '%', 0, 12, 1),
          ((SELECT id FROM test_versions WHERE test_name='Complete Blood Count (Hemogram)'), 'EOS', 'Eosinophils', 'NUMERIC', '%', 0, 13, 1),
          ((SELECT id FROM test_versions WHERE test_name='Complete Blood Count (Hemogram)'), 'BASO', 'Basophils', 'NUMERIC', '%', 0, 14, 1);
          
        -- ESR
        INSERT INTO test_parameters (test_version_id, parameter_code, parameter_name, data_type, unit, decimal_precision, display_order, is_mandatory) VALUES
          ((SELECT id FROM test_versions WHERE test_name='Erythrocyte Sedimentation Rate'), 'ESR1HR', 'ESR - 1st Hour', 'NUMERIC', 'mm/hr', 0, 1, 1);
          
        -- Glucose Panel
        INSERT INTO test_parameters (test_version_id, parameter_code, parameter_name, data_type, unit, decimal_precision, display_order, is_mandatory) VALUES
          ((SELECT id FROM test_versions WHERE test_name='Blood Glucose Panel'), 'FBS', 'Fasting Plasma Glucose', 'NUMERIC', 'mg/dL', 0, 1, 1),
          ((SELECT id FROM test_versions WHERE test_name='Blood Glucose Panel'), 'PPBS', 'Post-Prandial Blood Sugar', 'NUMERIC', 'mg/dL', 0, 2, 0),
          ((SELECT id FROM test_versions WHERE test_name='Blood Glucose Panel'), 'RBS', 'Random Blood Sugar', 'NUMERIC', 'mg/dL', 0, 3, 0);
          
        -- RFT Parameters
        INSERT INTO test_parameters (test_version_id, parameter_code, parameter_name, data_type, unit, decimal_precision, display_order, is_mandatory) VALUES
          ((SELECT id FROM test_versions WHERE test_name='Renal Function Test (KFT)'), 'UREA', 'Blood Urea', 'NUMERIC', 'mg/dL', 1, 1, 1),
          ((SELECT id FROM test_versions WHERE test_name='Renal Function Test (KFT)'), 'CREAT', 'Serum Creatinine', 'NUMERIC', 'mg/dL', 2, 2, 1),
          ((SELECT id FROM test_versions WHERE test_name='Renal Function Test (KFT)'), 'URIC', 'Uric Acid', 'NUMERIC', 'mg/dL', 1, 3, 1),
          ((SELECT id FROM test_versions WHERE test_name='Renal Function Test (KFT)'), 'NA', 'Sodium', 'NUMERIC', 'mmol/L', 0, 4, 1),
          ((SELECT id FROM test_versions WHERE test_name='Renal Function Test (KFT)'), 'K', 'Potassium', 'NUMERIC', 'mmol/L', 1, 5, 1),
          ((SELECT id FROM test_versions WHERE test_name='Renal Function Test (KFT)'), 'CL', 'Chloride', 'NUMERIC', 'mmol/L', 0, 6, 1);
          
        -- LFT Parameters
        INSERT INTO test_parameters (test_version_id, parameter_code, parameter_name, data_type, unit, decimal_precision, display_order, is_mandatory) VALUES
          ((SELECT id FROM test_versions WHERE test_name='Liver Function Test'), 'TBIL', 'Total Bilirubin', 'NUMERIC', 'mg/dL', 2, 1, 1),
          ((SELECT id FROM test_versions WHERE test_name='Liver Function Test'), 'DBIL', 'Direct Bilirubin', 'NUMERIC', 'mg/dL', 2, 2, 1),
          ((SELECT id FROM test_versions WHERE test_name='Liver Function Test'), 'IBIL', 'Indirect Bilirubin', 'NUMERIC', 'mg/dL', 2, 3, 1),
          ((SELECT id FROM test_versions WHERE test_name='Liver Function Test'), 'SGOT', 'SGOT (AST)', 'NUMERIC', 'U/L', 0, 4, 1),
          ((SELECT id FROM test_versions WHERE test_name='Liver Function Test'), 'SGPT', 'SGPT (ALT)', 'NUMERIC', 'U/L', 0, 5, 1),
          ((SELECT id FROM test_versions WHERE test_name='Liver Function Test'), 'ALP', 'Alkaline Phosphatase', 'NUMERIC', 'U/L', 0, 6, 1),
          ((SELECT id FROM test_versions WHERE test_name='Liver Function Test'), 'TPROT', 'Total Protein', 'NUMERIC', 'g/dL', 1, 7, 1),
          ((SELECT id FROM test_versions WHERE test_name='Liver Function Test'), 'ALB', 'Albumin', 'NUMERIC', 'g/dL', 1, 8, 1),
          ((SELECT id FROM test_versions WHERE test_name='Liver Function Test'), 'GLOB', 'Globulin', 'NUMERIC', 'g/dL', 1, 9, 1),
          ((SELECT id FROM test_versions WHERE test_name='Liver Function Test'), 'AGRATIO', 'A/G Ratio', 'NUMERIC', 'Ratio', 1, 10, 1);
          
        -- Lipid Profile Parameters
        INSERT INTO test_parameters (test_version_id, parameter_code, parameter_name, data_type, unit, decimal_precision, display_order, is_mandatory) VALUES
          ((SELECT id FROM test_versions WHERE test_name='Lipid Profile'), 'TCHOL', 'Total Cholesterol', 'NUMERIC', 'mg/dL', 0, 1, 1),
          ((SELECT id FROM test_versions WHERE test_name='Lipid Profile'), 'TG', 'Triglycerides', 'NUMERIC', 'mg/dL', 0, 2, 1),
          ((SELECT id FROM test_versions WHERE test_name='Lipid Profile'), 'HDL', 'HDL Cholesterol', 'NUMERIC', 'mg/dL', 0, 3, 1),
          ((SELECT id FROM test_versions WHERE test_name='Lipid Profile'), 'LDL', 'LDL Cholesterol', 'NUMERIC', 'mg/dL', 0, 4, 1),
          ((SELECT id FROM test_versions WHERE test_name='Lipid Profile'), 'VLDL', 'VLDL Cholesterol', 'NUMERIC', 'mg/dL', 0, 5, 1),
          ((SELECT id FROM test_versions WHERE test_name='Lipid Profile'), 'TCHDL', 'TC/HDL Ratio', 'NUMERIC', 'Ratio', 1, 6, 1);
          
        -- Serology - Simple Qualitative/Quantitative 
        INSERT INTO test_parameters (test_version_id, parameter_code, parameter_name, data_type, unit, decimal_precision, display_order, is_mandatory) VALUES
          ((SELECT id FROM test_versions WHERE test_name='Hepatitis B Surface Antigen'), 'HBSAG', 'HBsAg', 'TEXT', NULL, NULL, 1, 1),
          ((SELECT id FROM test_versions WHERE test_name='HIV I & II Antibodies'), 'HIV', 'HIV I & II', 'TEXT', NULL, NULL, 1, 1),
          ((SELECT id FROM test_versions WHERE test_name='C-Reactive Protein'), 'CRP', 'CRP', 'NUMERIC', 'mg/L', 1, 1, 1),
          ((SELECT id FROM test_versions WHERE test_name='Anti-Streptolysin O Titer'), 'ASO', 'ASO Titer', 'NUMERIC', 'IU/mL', 0, 1, 1),
          ((SELECT id FROM test_versions WHERE test_name='Widal Test'), 'STO', 'Salmonella Typhi O', 'TEXT', NULL, NULL, 1, 1),
          ((SELECT id FROM test_versions WHERE test_name='Widal Test'), 'STH', 'Salmonella Typhi H', 'TEXT', NULL, NULL, 2, 1),
          ((SELECT id FROM test_versions WHERE test_name='Widal Test'), 'SAH', 'Salmonella Para A-H', 'TEXT', NULL, NULL, 3, 1),
          ((SELECT id FROM test_versions WHERE test_name='Widal Test'), 'SBH', 'Salmonella Para B-H', 'TEXT', NULL, NULL, 4, 1);
          
        -- TFT Parameters
        INSERT INTO test_parameters (test_version_id, parameter_code, parameter_name, data_type, unit, decimal_precision, display_order, is_mandatory) VALUES
          ((SELECT id FROM test_versions WHERE test_name='Thyroid Function Test'), 'T3', 'Triiodothyronine (T3)', 'NUMERIC', 'ng/mL', 2, 1, 1),
          ((SELECT id FROM test_versions WHERE test_name='Thyroid Function Test'), 'T4', 'Thyroxine (T4)', 'NUMERIC', 'µg/dL', 1, 2, 1),
          ((SELECT id FROM test_versions WHERE test_name='Thyroid Function Test'), 'TSH', 'TSH', 'NUMERIC', 'µIU/mL', 2, 3, 1);
          
        -- Other Hormones/Vitamins
        INSERT INTO test_parameters (test_version_id, parameter_code, parameter_name, data_type, unit, decimal_precision, display_order, is_mandatory) VALUES
          ((SELECT id FROM test_versions WHERE test_name='Prolactin'), 'PRL', 'Prolactin', 'NUMERIC', 'ng/mL', 1, 1, 1),
          ((SELECT id FROM test_versions WHERE test_name='Vitamin D (25-OH)'), 'VITD25', 'Vitamin D (25-OH)', 'NUMERIC', 'ng/mL', 1, 1, 1),
          ((SELECT id FROM test_versions WHERE test_name='Vitamin B12'), 'B12', 'Vitamin B12', 'NUMERIC', 'pg/mL', 0, 1, 1);
          
        -- Urine Routine
        INSERT INTO test_parameters (test_version_id, parameter_code, parameter_name, data_type, unit, decimal_precision, display_order, is_mandatory) VALUES
          ((SELECT id FROM test_versions WHERE test_name='Urine Routine Examination'), 'UCOLOR', 'Color', 'TEXT', NULL, NULL, 1, 1),
          ((SELECT id FROM test_versions WHERE test_name='Urine Routine Examination'), 'UAPPEAR', 'Appearance', 'TEXT', NULL, NULL, 2, 1),
          ((SELECT id FROM test_versions WHERE test_name='Urine Routine Examination'), 'USG', 'Specific Gravity', 'NUMERIC', NULL, 3, 3, 1),
          ((SELECT id FROM test_versions WHERE test_name='Urine Routine Examination'), 'UPH', 'pH', 'NUMERIC', NULL, 1, 4, 1),
          ((SELECT id FROM test_versions WHERE test_name='Urine Routine Examination'), 'UPROT', 'Protein', 'TEXT', NULL, NULL, 5, 1),
          ((SELECT id FROM test_versions WHERE test_name='Urine Routine Examination'), 'USUG', 'Sugar', 'TEXT', NULL, NULL, 6, 1),
          ((SELECT id FROM test_versions WHERE test_name='Urine Routine Examination'), 'UKET', 'Ketone Bodies', 'TEXT', NULL, NULL, 7, 1),
          ((SELECT id FROM test_versions WHERE test_name='Urine Routine Examination'), 'URBC', 'Red Blood Cells', 'TEXT', '/HPF', NULL, 8, 1),
          ((SELECT id FROM test_versions WHERE test_name='Urine Routine Examination'), 'UPUS', 'Pus Cells', 'TEXT', '/HPF', NULL, 9, 1),
          ((SELECT id FROM test_versions WHERE test_name='Urine Routine Examination'), 'UEPI', 'Epithelial Cells', 'TEXT', NULL, NULL, 10, 1),
          ((SELECT id FROM test_versions WHERE test_name='Urine Routine Examination'), 'UCAST', 'Casts', 'TEXT', NULL, NULL, 11, 1),
          ((SELECT id FROM test_versions WHERE test_name='Urine Routine Examination'), 'UXTAL', 'Crystals', 'TEXT', NULL, NULL, 12, 1);
          
        -- Stool Routine
        INSERT INTO test_parameters (test_version_id, parameter_code, parameter_name, data_type, unit, decimal_precision, display_order, is_mandatory) VALUES
          ((SELECT id FROM test_versions WHERE test_name='Stool Routine Examination'), 'SCOLOR', 'Color', 'TEXT', NULL, NULL, 1, 1),
          ((SELECT id FROM test_versions WHERE test_name='Stool Routine Examination'), 'SCONS', 'Consistency', 'TEXT', NULL, NULL, 2, 1),
          ((SELECT id FROM test_versions WHERE test_name='Stool Routine Examination'), 'SOCCULT', 'Occult Blood', 'TEXT', NULL, NULL, 3, 1),
          ((SELECT id FROM test_versions WHERE test_name='Stool Routine Examination'), 'SOVA', 'Ova / Cyst', 'TEXT', NULL, NULL, 4, 1),
          ((SELECT id FROM test_versions WHERE test_name='Stool Routine Examination'), 'SRBC', 'RBC', 'TEXT', NULL, NULL, 5, 1),
          ((SELECT id FROM test_versions WHERE test_name='Stool Routine Examination'), 'SPUS', 'Pus Cells', 'TEXT', NULL, NULL, 6, 1);
          
        -- Coagulation
        INSERT INTO test_parameters (test_version_id, parameter_code, parameter_name, data_type, unit, decimal_precision, display_order, is_mandatory) VALUES
          ((SELECT id FROM test_versions WHERE test_name='Coagulation Profile'), 'PT', 'Prothrombin Time', 'NUMERIC', 'sec', 1, 1, 1),
          ((SELECT id FROM test_versions WHERE test_name='Coagulation Profile'), 'INR', 'INR', 'NUMERIC', 'Ratio', 1, 2, 1),
          ((SELECT id FROM test_versions WHERE test_name='Coagulation Profile'), 'APTT', 'APTT', 'NUMERIC', 'sec', 1, 3, 1);

        -- 5. Insert Reference Ranges
        -- CBC Ranges (Gender-specific for HB, RBC, PCV)
        -- Hemoglobin
        INSERT INTO reference_ranges (parameter_id, gender, age_min_days, age_max_days, lower_limit, upper_limit, effective_from) VALUES
          ((SELECT id FROM test_parameters WHERE parameter_code='HB'), 'M', 0, 36500, 13.0, 17.0, datetime('now')),
          ((SELECT id FROM test_parameters WHERE parameter_code='HB'), 'F', 0, 36500, 12.0, 15.0, datetime('now'));
        -- RBC
        INSERT INTO reference_ranges (parameter_id, gender, age_min_days, age_max_days, lower_limit, upper_limit, effective_from) VALUES
          ((SELECT id FROM test_parameters WHERE parameter_code='RBC'), 'M', 0, 36500, 4.5, 5.9, datetime('now')),
          ((SELECT id FROM test_parameters WHERE parameter_code='RBC'), 'F', 0, 36500, 4.1, 5.1, datetime('now'));
        -- WBC (All genders)
        INSERT INTO reference_ranges (parameter_id, gender, age_min_days, age_max_days, lower_limit, upper_limit, effective_from) VALUES
          ((SELECT id FROM test_parameters WHERE parameter_code='WBC'), 'A', 0, 36500, 4000, 11000, datetime('now'));
        -- PLT
        INSERT INTO reference_ranges (parameter_id, gender, age_min_days, age_max_days, lower_limit, upper_limit, effective_from) VALUES
          ((SELECT id FROM test_parameters WHERE parameter_code='PLT'), 'A', 0, 36500, 1.5, 4.5, datetime('now'));
        -- PCV
        INSERT INTO reference_ranges (parameter_id, gender, age_min_days, age_max_days, lower_limit, upper_limit, effective_from) VALUES
          ((SELECT id FROM test_parameters WHERE parameter_code='PCV'), 'M', 0, 36500, 40, 50, datetime('now')),
          ((SELECT id FROM test_parameters WHERE parameter_code='PCV'), 'F', 0, 36500, 36, 46, datetime('now'));
        -- MCV, MCH, MCHC, RDW-CV (All)
        INSERT INTO reference_ranges (parameter_id, gender, age_min_days, age_max_days, lower_limit, upper_limit, effective_from) VALUES
          ((SELECT id FROM test_parameters WHERE parameter_code='MCV'), 'A', 0, 36500, 80, 96, datetime('now')),
          ((SELECT id FROM test_parameters WHERE parameter_code='MCH'), 'A', 0, 36500, 27, 33, datetime('now')),
          ((SELECT id FROM test_parameters WHERE parameter_code='MCHC'), 'A', 0, 36500, 32, 36, datetime('now')),
          ((SELECT id FROM test_parameters WHERE parameter_code='RDWCV'), 'A', 0, 36500, 11.5, 14.5, datetime('now'));
        -- DLC
        INSERT INTO reference_ranges (parameter_id, gender, age_min_days, age_max_days, lower_limit, upper_limit, effective_from) VALUES
          ((SELECT id FROM test_parameters WHERE parameter_code='NEUT'), 'A', 0, 36500, 40, 70, datetime('now')),
          ((SELECT id FROM test_parameters WHERE parameter_code='LYMPH'), 'A', 0, 36500, 20, 40, datetime('now')),
          ((SELECT id FROM test_parameters WHERE parameter_code='MONO'), 'A', 0, 36500, 2, 8, datetime('now')),
          ((SELECT id FROM test_parameters WHERE parameter_code='EOS'), 'A', 0, 36500, 1, 6, datetime('now')),
          ((SELECT id FROM test_parameters WHERE parameter_code='BASO'), 'A', 0, 36500, 0, 1, datetime('now'));
          
        -- ESR Range (Gender-specific)
        INSERT INTO reference_ranges (parameter_id, gender, age_min_days, age_max_days, lower_limit, upper_limit, effective_from) VALUES
          ((SELECT id FROM test_parameters WHERE parameter_code='ESR1HR'), 'M', 0, 36500, 0, 15, datetime('now')),
          ((SELECT id FROM test_parameters WHERE parameter_code='ESR1HR'), 'F', 0, 36500, 0, 20, datetime('now'));
          
        -- Glucose Ranges
        INSERT INTO reference_ranges (parameter_id, gender, age_min_days, age_max_days, lower_limit, upper_limit, effective_from) VALUES
          ((SELECT id FROM test_parameters WHERE parameter_code='FBS'), 'A', 0, 36500, 70, 99, datetime('now')),
          ((SELECT id FROM test_parameters WHERE parameter_code='PPBS'), 'A', 0, 36500, 0, 140, datetime('now')),
          ((SELECT id FROM test_parameters WHERE parameter_code='RBS'), 'A', 0, 36500, 70, 140, datetime('now'));
          
        -- RFT Ranges (Uric acid is gender-specific)
        INSERT INTO reference_ranges (parameter_id, gender, age_min_days, age_max_days, lower_limit, upper_limit, effective_from) VALUES
          ((SELECT id FROM test_parameters WHERE parameter_code='UREA'), 'A', 0, 36500, 15, 40, datetime('now')),
          ((SELECT id FROM test_parameters WHERE parameter_code='CREAT'), 'A', 0, 36500, 0.6, 1.3, datetime('now')),
          ((SELECT id FROM test_parameters WHERE parameter_code='URIC'), 'M', 0, 36500, 3.4, 7.0, datetime('now')),
          ((SELECT id FROM test_parameters WHERE parameter_code='URIC'), 'F', 0, 36500, 2.4, 6.0, datetime('now')),
          ((SELECT id FROM test_parameters WHERE parameter_code='NA'), 'A', 0, 36500, 135, 145, datetime('now')),
          ((SELECT id FROM test_parameters WHERE parameter_code='K'), 'A', 0, 36500, 3.5, 5.1, datetime('now')),
          ((SELECT id FROM test_parameters WHERE parameter_code='CL'), 'A', 0, 36500, 98, 107, datetime('now'));
          
        -- LFT Ranges
        INSERT INTO reference_ranges (parameter_id, gender, age_min_days, age_max_days, lower_limit, upper_limit, effective_from) VALUES
          ((SELECT id FROM test_parameters WHERE parameter_code='TBIL'), 'A', 0, 36500, 0.3, 1.2, datetime('now')),
          ((SELECT id FROM test_parameters WHERE parameter_code='DBIL'), 'A', 0, 36500, 0.0, 0.3, datetime('now')),
          ((SELECT id FROM test_parameters WHERE parameter_code='IBIL'), 'A', 0, 36500, 0.2, 0.9, datetime('now')),
          ((SELECT id FROM test_parameters WHERE parameter_code='SGOT'), 'A', 0, 36500, 0, 40, datetime('now')),
          ((SELECT id FROM test_parameters WHERE parameter_code='SGPT'), 'A', 0, 36500, 0, 41, datetime('now')),
          ((SELECT id FROM test_parameters WHERE parameter_code='ALP'), 'A', 0, 36500, 44, 147, datetime('now')),
          ((SELECT id FROM test_parameters WHERE parameter_code='TPROT'), 'A', 0, 36500, 6.0, 8.3, datetime('now')),
          ((SELECT id FROM test_parameters WHERE parameter_code='ALB'), 'A', 0, 36500, 3.5, 5.0, datetime('now')),
          ((SELECT id FROM test_parameters WHERE parameter_code='GLOB'), 'A', 0, 36500, 2.0, 3.5, datetime('now')),
          ((SELECT id FROM test_parameters WHERE parameter_code='AGRATIO'), 'A', 0, 36500, 1.0, 2.2, datetime('now'));
          
        -- Lipid Profile Ranges (HDL is gender-specific)
        INSERT INTO reference_ranges (parameter_id, gender, age_min_days, age_max_days, lower_limit, upper_limit, effective_from) VALUES
          ((SELECT id FROM test_parameters WHERE parameter_code='TCHOL'), 'A', 0, 36500, 0, 200, datetime('now')),
          ((SELECT id FROM test_parameters WHERE parameter_code='TG'), 'A', 0, 36500, 0, 150, datetime('now')),
          ((SELECT id FROM test_parameters WHERE parameter_code='HDL'), 'M', 0, 36500, 40, 999, datetime('now')),
          ((SELECT id FROM test_parameters WHERE parameter_code='HDL'), 'F', 0, 36500, 50, 999, datetime('now')),
          ((SELECT id FROM test_parameters WHERE parameter_code='LDL'), 'A', 0, 36500, 0, 100, datetime('now')),
          ((SELECT id FROM test_parameters WHERE parameter_code='VLDL'), 'A', 0, 36500, 5, 40, datetime('now')),
          ((SELECT id FROM test_parameters WHERE parameter_code='TCHDL'), 'A', 0, 36500, 0, 5.0, datetime('now'));
          
        -- Serology Ranges
        INSERT INTO reference_ranges (parameter_id, gender, age_min_days, age_max_days, lower_limit, upper_limit, effective_from) VALUES
          ((SELECT id FROM test_parameters WHERE parameter_code='CRP'), 'A', 0, 36500, 0, 6.0, datetime('now')),
          ((SELECT id FROM test_parameters WHERE parameter_code='ASO'), 'A', 0, 36500, 0, 200, datetime('now'));
          
        -- TFT Ranges
        INSERT INTO reference_ranges (parameter_id, gender, age_min_days, age_max_days, lower_limit, upper_limit, effective_from) VALUES
          ((SELECT id FROM test_parameters WHERE parameter_code='T3'), 'A', 0, 36500, 0.8, 2.0, datetime('now')),
          ((SELECT id FROM test_parameters WHERE parameter_code='T4'), 'A', 0, 36500, 5.0, 12.0, datetime('now')),
          ((SELECT id FROM test_parameters WHERE parameter_code='TSH'), 'A', 0, 36500, 0.4, 4.0, datetime('now'));
          
        -- Prolactin (gender-specific)
        INSERT INTO reference_ranges (parameter_id, gender, age_min_days, age_max_days, lower_limit, upper_limit, effective_from) VALUES
          ((SELECT id FROM test_parameters WHERE parameter_code='PRL'), 'M', 0, 36500, 4, 15, datetime('now')),
          ((SELECT id FROM test_parameters WHERE parameter_code='PRL'), 'F', 0, 36500, 5, 25, datetime('now'));
          
        -- Vitamins
        INSERT INTO reference_ranges (parameter_id, gender, age_min_days, age_max_days, lower_limit, upper_limit, effective_from) VALUES
          ((SELECT id FROM test_parameters WHERE parameter_code='VITD25'), 'A', 0, 36500, 30, 100, datetime('now')),
          ((SELECT id FROM test_parameters WHERE parameter_code='B12'), 'A', 0, 36500, 200, 900, datetime('now'));
          
        -- Urine Routine - Numeric ranges
        INSERT INTO reference_ranges (parameter_id, gender, age_min_days, age_max_days, lower_limit, upper_limit, effective_from) VALUES
          ((SELECT id FROM test_parameters WHERE parameter_code='USG'), 'A', 0, 36500, 1.005, 1.030, datetime('now')),
          ((SELECT id FROM test_parameters WHERE parameter_code='UPH'), 'A', 0, 36500, 4.5, 8.0, datetime('now'));
          
        -- Coagulation Ranges
        INSERT INTO reference_ranges (parameter_id, gender, age_min_days, age_max_days, lower_limit, upper_limit, effective_from) VALUES
          ((SELECT id FROM test_parameters WHERE parameter_code='PT'), 'A', 0, 36500, 11, 13.5, datetime('now')),
          ((SELECT id FROM test_parameters WHERE parameter_code='INR'), 'A', 0, 36500, 0.8, 1.2, datetime('now')),
          ((SELECT id FROM test_parameters WHERE parameter_code='APTT'), 'A', 0, 36500, 25, 35, datetime('now'));
      `
    },
    {
      name: '010_add_critical_values',
      sql: `
        -- Insert critical values for key parameters
        -- Critical values trigger immediate clinical alerts
        
        -- CBC Critical Values
        INSERT INTO critical_values (parameter_id, critical_low, critical_high) VALUES
          ((SELECT id FROM test_parameters WHERE parameter_code='HB'), 7.0, 20.0),    -- Hemoglobin
          ((SELECT id FROM test_parameters WHERE parameter_code='WBC'), 2000, 30000), -- WBC
          ((SELECT id FROM test_parameters WHERE parameter_code='PLT'), 0.5, 10.0);   -- Platelets (lakh/µL)
          
        -- Glucose Critical Values
        INSERT INTO critical_values (parameter_id, critical_low, critical_high) VALUES
          ((SELECT id FROM test_parameters WHERE parameter_code='FBS'), 40, 400),   -- Fasting glucose
          ((SELECT id FROM test_parameters WHERE parameter_code='RBS'), 40, 500);   -- Random glucose
          
        -- RFT Critical Values
        INSERT INTO critical_values (parameter_id, critical_low, critical_high) VALUES
          ((SELECT id FROM test_parameters WHERE parameter_code='K'), 2.5, 6.5),      -- Potassium
          ((SELECT id FROM test_parameters WHERE parameter_code='NA'), 120, 160),     -- Sodium
          ((SELECT id FROM test_parameters WHERE parameter_code='CREAT'), NULL, 10.0); -- Creatinine (high only)
          
        -- LFT Critical Values
        INSERT INTO critical_values (parameter_id, critical_low, critical_high) VALUES
          ((SELECT id FROM test_parameters WHERE parameter_code='TBIL'), NULL, 15.0); -- Total Bilirubin
          
        -- Coagulation Critical Values
        INSERT INTO critical_values (parameter_id, critical_low, critical_high) VALUES
          ((SELECT id FROM test_parameters WHERE parameter_code='INR'), NULL, 5.0),
          ((SELECT id FROM test_parameters WHERE parameter_code='PT'), NULL, 30.0);
      `
    },
    {
      name: '011_lab_settings',
      sql: `
        -- Lab settings for report letterhead and configuration
        CREATE TABLE IF NOT EXISTS lab_settings (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          setting_key TEXT UNIQUE NOT NULL,
          setting_value TEXT
        );
        
        -- Insert default lab settings
        INSERT INTO lab_settings (setting_key, setting_value) VALUES
          ('lab_name', 'PathoCare Diagnostics'),
          ('address_line1', '123 Medical Complex, Main Road'),
          ('address_line2', 'City - 400001'),
          ('phone', '+91 98765 43210'),
          ('email', 'reports@pathocare.com'),
          ('nabl_accreditation', 'NABL-MC-XXXX'),
          ('report_footer', 'This report is electronically generated and valid without signature.'),
          ('disclaimer', 'Results should be correlated with clinical findings. Consult your physician for interpretation.');
      `
    },
    {
      name: '012_doctors_referral',
      sql: `
        -- Doctors table for referring physicians
        CREATE TABLE IF NOT EXISTS doctors (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          doctor_code TEXT UNIQUE NOT NULL,
          name TEXT NOT NULL,
          specialty TEXT,
          phone TEXT,
          clinic_address TEXT,
          is_active INTEGER DEFAULT 1,
          created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );
        
        -- Add referring doctor to orders
        ALTER TABLE orders ADD COLUMN referring_doctor_id INTEGER REFERENCES doctors(id);
        
        -- Insert sample doctors
        INSERT INTO doctors (doctor_code, name, specialty, phone) VALUES
          ('DR001', 'Dr. Ramesh Kumar', 'General Physician', '+91 98765 11111'),
          ('DR002', 'Dr. Priya Sharma', 'Cardiologist', '+91 98765 22222'),
          ('DR003', 'Dr. Suresh Patel', 'Orthopedic', '+91 98765 33333');
      `
    },
    {
      name: '013_billing_pricing',
      sql: `
        -- Price Lists (Standard, Corporate, Camp, Custom)
        CREATE TABLE IF NOT EXISTS price_lists (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          code TEXT UNIQUE NOT NULL,
          name TEXT NOT NULL,
          description TEXT,
          is_default INTEGER DEFAULT 0,
          is_active INTEGER DEFAULT 1,
          created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );
        
        -- Test Prices per Price List
        CREATE TABLE IF NOT EXISTS test_prices (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          price_list_id INTEGER NOT NULL REFERENCES price_lists(id),
          test_id INTEGER NOT NULL REFERENCES tests(id),
          base_price REAL NOT NULL,
          auto_discount_percent REAL DEFAULT 0,
          discount_cap_percent REAL DEFAULT 100,
          gst_applicable INTEGER DEFAULT 0,
          gst_rate REAL DEFAULT 0,
          effective_from TEXT NOT NULL,
          effective_to TEXT,
          is_active INTEGER DEFAULT 1,
          UNIQUE(price_list_id, test_id, effective_from)
        );
        
        -- Packages (commercial bundles)
        CREATE TABLE IF NOT EXISTS packages (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          code TEXT UNIQUE NOT NULL,
          name TEXT NOT NULL,
          description TEXT,
          package_price REAL NOT NULL,
          price_list_id INTEGER REFERENCES price_lists(id),
          valid_from TEXT,
          valid_to TEXT,
          is_active INTEGER DEFAULT 1,
          created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );
        
        -- Package Items (tests in package)
        CREATE TABLE IF NOT EXISTS package_items (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          package_id INTEGER NOT NULL REFERENCES packages(id),
          test_id INTEGER NOT NULL REFERENCES tests(id),
          UNIQUE(package_id, test_id)
        );
        
        -- Invoices
        CREATE TABLE IF NOT EXISTS invoices (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          invoice_number TEXT UNIQUE NOT NULL,
          order_id INTEGER NOT NULL REFERENCES orders(id),
          patient_id INTEGER NOT NULL REFERENCES patients(id),
          price_list_id INTEGER REFERENCES price_lists(id),
          subtotal REAL NOT NULL,
          discount_amount REAL DEFAULT 0,
          discount_percent REAL DEFAULT 0,
          discount_reason TEXT,
          discount_approved_by INTEGER REFERENCES users(id),
          gst_amount REAL DEFAULT 0,
          total_amount REAL NOT NULL,
          status TEXT CHECK (status IN ('DRAFT','FINALIZED','CANCELLED')) DEFAULT 'DRAFT',
          created_by INTEGER REFERENCES users(id),
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          finalized_at TEXT,
          cancelled_at TEXT,
          cancelled_by INTEGER REFERENCES users(id),
          cancellation_reason TEXT
        );
        
        -- Invoice Items (price snapshot)
        CREATE TABLE IF NOT EXISTS invoice_items (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          invoice_id INTEGER NOT NULL REFERENCES invoices(id),
          test_id INTEGER REFERENCES tests(id),
          package_id INTEGER REFERENCES packages(id),
          description TEXT NOT NULL,
          unit_price REAL NOT NULL,
          quantity INTEGER DEFAULT 1,
          discount_amount REAL DEFAULT 0,
          gst_rate REAL DEFAULT 0,
          gst_amount REAL DEFAULT 0,
          line_total REAL NOT NULL
        );
        
        -- Payments
        CREATE TABLE IF NOT EXISTS payments (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          invoice_id INTEGER NOT NULL REFERENCES invoices(id),
          amount REAL NOT NULL,
          payment_mode TEXT CHECK (payment_mode IN ('CASH','CARD','UPI','CREDIT')) NOT NULL,
          reference_number TEXT,
          payment_date TEXT NOT NULL DEFAULT (datetime('now')),
          received_by INTEGER REFERENCES users(id),
          remarks TEXT
        );
        
        -- Insert default Standard price list
        INSERT INTO price_lists (code, name, description, is_default, is_active) VALUES
          ('STANDARD', 'Standard Price List', 'Default walk-in patient pricing', 1, 1),
          ('CORPORATE', 'Corporate Price List', 'Corporate/company tie-up rates', 0, 1);
        
        -- Add GST and billing settings to lab_settings
        INSERT OR IGNORE INTO lab_settings (setting_key, setting_value) VALUES
          ('gst_enabled', 'false'),
          ('gst_mode', 'exclusive'),
          ('gstin', ''),
          ('discount_approval_threshold', '20');
        
        -- Seed sample test prices for Standard price list
        INSERT INTO test_prices (price_list_id, test_id, base_price, gst_applicable, gst_rate, effective_from)
        SELECT 1, id, 
          CASE test_code
            WHEN 'CBC' THEN 350
            WHEN 'ESR' THEN 100
            WHEN 'GLUCOSE' THEN 80
            WHEN 'RFT' THEN 450
            WHEN 'LFT' THEN 550
            WHEN 'LIPID' THEN 600
            WHEN 'TFT' THEN 800
            WHEN 'HBSAG' THEN 200
            WHEN 'HIV' THEN 250
            WHEN 'CRP' THEN 350
            WHEN 'ASO' THEN 300
            WHEN 'WIDAL' THEN 200
            WHEN 'PROLACTIN' THEN 500
            WHEN 'VITD' THEN 1200
            WHEN 'VITB12' THEN 800
            WHEN 'URINE' THEN 100
            WHEN 'STOOL' THEN 100
            WHEN 'COAG' THEN 450
            ELSE 500
          END,
          0, 0, datetime('now')
        FROM tests WHERE is_active = 1;
        
        -- Seed Corporate prices (10% discount from standard)
        INSERT INTO test_prices (price_list_id, test_id, base_price, auto_discount_percent, gst_applicable, gst_rate, effective_from)
        SELECT 2, id, 
          CASE test_code
            WHEN 'CBC' THEN 315
            WHEN 'ESR' THEN 90
            WHEN 'GLUCOSE' THEN 72
            WHEN 'RFT' THEN 405
            WHEN 'LFT' THEN 495
            WHEN 'LIPID' THEN 540
            WHEN 'TFT' THEN 720
            WHEN 'HBSAG' THEN 180
            WHEN 'HIV' THEN 225
            WHEN 'CRP' THEN 315
            WHEN 'ASO' THEN 270
            WHEN 'WIDAL' THEN 180
            WHEN 'PROLACTIN' THEN 450
            WHEN 'VITD' THEN 1080
            WHEN 'VITB12' THEN 720
            WHEN 'URINE' THEN 90
            WHEN 'STOOL' THEN 90
            WHEN 'COAG' THEN 405
            ELSE 450
          END,
          0, 0, 0, datetime('now')
        FROM tests WHERE is_active = 1;
      `
    },
    {
      name: '014_doctor_pricing_commission',
      sql: `
        -- ========================================
        -- Doctor Referral Pricing & Commission Management
        -- ========================================
        
        -- 1. Extend doctors table with commission configuration
        ALTER TABLE doctors ADD COLUMN commission_model TEXT CHECK (commission_model IN ('PERCENTAGE','FLAT','NONE')) DEFAULT 'NONE';
        ALTER TABLE doctors ADD COLUMN commission_rate REAL DEFAULT 0;
        ALTER TABLE doctors ADD COLUMN price_list_id INTEGER REFERENCES price_lists(id);
        
        -- 2. Doctor Price Lists (for tracking doctor-specific price list assignments)
        CREATE TABLE IF NOT EXISTS doctor_price_lists (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          doctor_id INTEGER NOT NULL REFERENCES doctors(id),
          price_list_id INTEGER NOT NULL REFERENCES price_lists(id),
          is_default INTEGER DEFAULT 1,
          effective_from TEXT NOT NULL DEFAULT (datetime('now')),
          effective_to TEXT,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          UNIQUE(doctor_id, price_list_id, effective_from)
        );
        
        -- 3. Doctor Commissions (commission snapshot per invoice)
        CREATE TABLE IF NOT EXISTS doctor_commissions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          invoice_id INTEGER NOT NULL REFERENCES invoices(id),
          invoice_item_id INTEGER REFERENCES invoice_items(id),
          doctor_id INTEGER NOT NULL REFERENCES doctors(id),
          patient_id INTEGER NOT NULL REFERENCES patients(id),
          test_id INTEGER REFERENCES tests(id),
          test_description TEXT,
          commission_model TEXT NOT NULL CHECK (commission_model IN ('PERCENTAGE','FLAT')),
          commission_rate REAL NOT NULL,
          test_price REAL NOT NULL,
          commission_amount REAL NOT NULL,
          calculated_at TEXT NOT NULL DEFAULT (datetime('now')),
          settlement_id INTEGER REFERENCES commission_settlements(id),
          is_cancelled INTEGER DEFAULT 0
        );
        
        -- 4. Commission Settlements (monthly payment tracking)
        CREATE TABLE IF NOT EXISTS commission_settlements (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          doctor_id INTEGER NOT NULL REFERENCES doctors(id),
          period_month INTEGER NOT NULL,
          period_year INTEGER NOT NULL,
          total_commission REAL NOT NULL,
          paid_amount REAL DEFAULT 0,
          payment_status TEXT CHECK (payment_status IN ('PENDING','PARTIALLY_PAID','PAID')) DEFAULT 'PENDING',
          payment_date TEXT,
          payment_mode TEXT CHECK (payment_mode IN ('CASH','CARD','UPI','CHEQUE','NEFT','RTGS')),
          payment_reference TEXT,
          remarks TEXT,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          created_by INTEGER REFERENCES users(id),
          UNIQUE(doctor_id, period_month, period_year)
        );
        
        -- 5. Commission Payments (track individual payments for a settlement)
        CREATE TABLE IF NOT EXISTS commission_payments (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          settlement_id INTEGER NOT NULL REFERENCES commission_settlements(id),
          amount REAL NOT NULL,
          payment_date TEXT NOT NULL DEFAULT (datetime('now')),
          payment_mode TEXT NOT NULL CHECK (payment_mode IN ('CASH','CARD','UPI','CHEQUE','NEFT','RTGS')),
          payment_reference TEXT,
          remarks TEXT,
          created_by INTEGER REFERENCES users(id),
          created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );
        
        -- 6. Indexes for performance
        CREATE INDEX idx_doctor_commissions_doctor ON doctor_commissions(doctor_id);
        CREATE INDEX idx_doctor_commissions_invoice ON doctor_commissions(invoice_id);
        CREATE INDEX idx_doctor_commissions_settlement ON doctor_commissions(settlement_id);
        CREATE INDEX idx_commission_settlements_doctor ON commission_settlements(doctor_id);
        CREATE INDEX idx_commission_settlements_period ON commission_settlements(period_year, period_month);
        CREATE INDEX idx_doctor_price_lists_doctor ON doctor_price_lists(doctor_id);
        
        -- 7. Create a default "Doctor Referral" price list
        INSERT OR IGNORE INTO price_lists (code, name, description, is_default, is_active) VALUES
          ('DOCTOR_REFERRAL', 'Doctor Referral Price List', 'Default pricing for doctor-referred patients', 0, 1);
        
        -- 8. Seed doctor referral prices (15% discount from standard for referred patients)
        INSERT OR IGNORE INTO test_prices (price_list_id, test_id, base_price, auto_discount_percent, gst_applicable, gst_rate, effective_from)
        SELECT 
          (SELECT id FROM price_lists WHERE code = 'DOCTOR_REFERRAL'), 
          id, 
          CASE test_code
            WHEN 'CBC' THEN 298
            WHEN 'ESR' THEN 85
            WHEN 'GLUCOSE' THEN 68
            WHEN 'RFT' THEN 383
            WHEN 'LFT' THEN 468
            WHEN 'LIPID' THEN 510
            WHEN 'TFT' THEN 680
            WHEN 'HBSAG' THEN 170
            WHEN 'HIV' THEN 213
            WHEN 'CRP' THEN 298
            WHEN 'ASO' THEN 255
            WHEN 'WIDAL' THEN 170
            WHEN 'PROLACTIN' THEN 425
            WHEN 'VITD' THEN 1020
            WHEN 'VITB12' THEN 680
            WHEN 'URINE' THEN 85
            WHEN 'STOOL' THEN 85
            WHEN 'COAG' THEN 383
            ELSE 425
          END,
          0, 0, 0, datetime('now')
        FROM tests WHERE is_active = 1;
      `
    },
    {
      name: '015_add_referring_doctor_to_orders',
      sql: `
        -- Add referring_doctor_id to orders table (idempotent)
        -- SQLite doesn't support IF NOT EXISTS for columns, so we check via pragma
        -- This will fail silently if column already exists and migration already ran
      `
    },
    {
      name: '016_qc_tables',
      sql: `
        -- QC Parameters: Define what parameters are tracked for QC
        CREATE TABLE IF NOT EXISTS qc_parameters (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          test_id INTEGER NOT NULL REFERENCES tests(id),
          parameter_code TEXT NOT NULL,
          parameter_name TEXT NOT NULL,
          unit TEXT,
          level TEXT CHECK (level IN ('LOW', 'NORMAL', 'HIGH')) NOT NULL,
          target_mean REAL NOT NULL,
          target_sd REAL NOT NULL,
          lot_number TEXT,
          expiry_date TEXT,
          is_active INTEGER DEFAULT 1,
          created_at TEXT NOT NULL,
          created_by INTEGER REFERENCES users(id)
        );
        CREATE INDEX IF NOT EXISTS idx_qc_parameters_test ON qc_parameters(test_id);
        
        -- QC Entries: Daily QC values entered by technicians
        CREATE TABLE IF NOT EXISTS qc_entries (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          qc_parameter_id INTEGER NOT NULL REFERENCES qc_parameters(id),
          entry_date TEXT NOT NULL,
          observed_value REAL NOT NULL,
          deviation_sd REAL,
          status TEXT CHECK (status IN ('PASS', 'WARNING', 'FAIL', 'REJECTED')) DEFAULT 'PASS',
          remarks TEXT,
          entered_by INTEGER NOT NULL REFERENCES users(id),
          entered_at TEXT NOT NULL,
          reviewed_by INTEGER REFERENCES users(id),
          reviewed_at TEXT,
          acceptance_status TEXT CHECK (acceptance_status IN ('PENDING', 'ACCEPTED', 'CORRECTIVE_ACTION')) DEFAULT 'PENDING'
        );
        CREATE INDEX IF NOT EXISTS idx_qc_entries_parameter ON qc_entries(qc_parameter_id);
        CREATE INDEX IF NOT EXISTS idx_qc_entries_date ON qc_entries(entry_date);
        
        -- QC Rules: Westgard rules configuration (optional advanced feature)
        CREATE TABLE IF NOT EXISTS qc_rules (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          rule_code TEXT UNIQUE NOT NULL,
          rule_name TEXT NOT NULL,
          description TEXT,
          is_warning INTEGER DEFAULT 0,
          is_rejection INTEGER DEFAULT 1
        );
        
        -- Insert default Westgard rules
        INSERT INTO qc_rules (rule_code, rule_name, description, is_warning, is_rejection) VALUES
          ('1_2s', '1:2s Rule (Warning)', 'Single control exceeds mean ± 2SD', 1, 0),
          ('1_3s', '1:3s Rule', 'Single control exceeds mean ± 3SD', 0, 1),
          ('2_2s', '2:2s Rule', 'Two consecutive controls exceed same mean ± 2SD limit', 0, 1),
          ('R_4s', 'R:4s Rule', 'Range between two controls exceeds 4SD', 0, 1),
          ('4_1s', '4:1s Rule', 'Four consecutive controls exceed same mean ± 1SD limit', 0, 1),
          ('10x', '10x Rule', 'Ten consecutive controls on same side of mean', 0, 1);
      `
    }
  ];
}

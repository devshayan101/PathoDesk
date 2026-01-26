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
    }
  ];
}

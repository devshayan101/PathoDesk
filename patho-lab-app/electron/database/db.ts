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
    }
  ];
}

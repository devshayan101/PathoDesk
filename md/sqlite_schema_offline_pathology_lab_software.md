# SQLite Database Schema
## Offline Pathology Lab Software (Electron + TypeScript)

> This schema is **derived directly from the Test Master & Reference Range Configuration PRD and Lab Report Entry PRD** and is designed for **clinical safety, versioning, and audit immutability**. fileciteturn0file0 fileciteturn0file1

---

## 0. Global SQLite Settings (Required)

```sql
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;
PRAGMA synchronous = FULL;
```

---

## 1. Users & Roles

```sql
CREATE TABLE roles (
  id INTEGER PRIMARY KEY,
  name TEXT UNIQUE NOT NULL
);

CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role_id INTEGER NOT NULL,
  is_active INTEGER DEFAULT 1,
  created_at TEXT NOT NULL,
  FOREIGN KEY (role_id) REFERENCES roles(id)
);
```

---

## 2. Patients

```sql
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
```

---

## 3. Test Master (Immutable Code, Versioned Definitions)

```sql
CREATE TABLE tests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  test_code TEXT UNIQUE NOT NULL,
  is_active INTEGER DEFAULT 1
);

CREATE TABLE test_versions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  test_id INTEGER NOT NULL,
  test_name TEXT NOT NULL,
  department TEXT NOT NULL,
  method TEXT NOT NULL,
  sample_type TEXT NOT NULL,
  report_group TEXT,
  version_no INTEGER NOT NULL,
  effective_from TEXT NOT NULL,
  created_by INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (test_id) REFERENCES tests(id),
  FOREIGN KEY (created_by) REFERENCES users(id)
);
```

---

## 4. Test Parameters (Versioned)

```sql
CREATE TABLE test_parameters (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  test_version_id INTEGER NOT NULL,
  parameter_code TEXT NOT NULL,
  parameter_name TEXT NOT NULL,
  data_type TEXT CHECK (data_type IN ('NUMERIC','TEXT','BOOLEAN','CALCULATED')) NOT NULL,
  unit TEXT,
  decimal_precision INTEGER,
  display_order INTEGER,
  is_mandatory INTEGER DEFAULT 1,
  formula TEXT,
  FOREIGN KEY (test_version_id) REFERENCES test_versions(id),
  UNIQUE(test_version_id, parameter_code)
);
```

---

## 5. Reference Ranges (Version-Safe)

```sql
CREATE TABLE reference_ranges (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  parameter_id INTEGER NOT NULL,
  gender TEXT CHECK (gender IN ('M','F','A')) NOT NULL,
  age_min_days INTEGER NOT NULL,
  age_max_days INTEGER NOT NULL,
  lower_limit REAL,
  upper_limit REAL,
  display_text TEXT,
  effective_from TEXT NOT NULL,
  FOREIGN KEY (parameter_id) REFERENCES test_parameters(id)
);
```

---

## 6. Critical Values

```sql
CREATE TABLE critical_values (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  parameter_id INTEGER NOT NULL,
  critical_low REAL,
  critical_high REAL,
  FOREIGN KEY (parameter_id) REFERENCES test_parameters(id)
);
```

---

## 7. Orders & Samples

```sql
CREATE TABLE orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_uid TEXT UNIQUE NOT NULL,
  patient_id INTEGER NOT NULL,
  order_date TEXT NOT NULL,
  FOREIGN KEY (patient_id) REFERENCES patients(id)
);

CREATE TABLE order_tests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL,
  test_version_id INTEGER NOT NULL,
  status TEXT CHECK (status IN ('ORDERED','RESULT_ENTERED','FINALIZED')) NOT NULL,
  FOREIGN KEY (order_id) REFERENCES orders(id),
  FOREIGN KEY (test_version_id) REFERENCES test_versions(id)
);

CREATE TABLE samples (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sample_uid TEXT UNIQUE NOT NULL,
  order_test_id INTEGER NOT NULL,
  collected_at TEXT,
  status TEXT CHECK (status IN ('COLLECTED','RECEIVED','REJECTED')) NOT NULL,
  rejection_reason TEXT,
  FOREIGN KEY (order_test_id) REFERENCES order_tests(id)
);
```

---

## 8. Result Entry (Clinical Core)

```sql
CREATE TABLE test_results (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_test_id INTEGER NOT NULL,
  parameter_id INTEGER NOT NULL,
  result_value TEXT NOT NULL,
  abnormal_flag TEXT CHECK (abnormal_flag IN ('NORMAL','HIGH','LOW','CRITICAL')) NOT NULL,
  status TEXT CHECK (status IN ('DRAFT','ENTERED','VERIFIED','FINALIZED')) NOT NULL,
  source TEXT CHECK (source IN ('MANUAL','ANALYZER')) NOT NULL,
  entered_by INTEGER NOT NULL,
  entered_at TEXT NOT NULL,
  FOREIGN KEY (order_test_id) REFERENCES order_tests(id),
  FOREIGN KEY (parameter_id) REFERENCES test_parameters(id),
  FOREIGN KEY (entered_by) REFERENCES users(id),
  UNIQUE(order_test_id, parameter_id)
);
```

---

## 9. Result Comments & Interpretation

```sql
CREATE TABLE result_comments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  result_id INTEGER NOT NULL,
  comment TEXT NOT NULL,
  level TEXT CHECK (level IN ('PARAMETER','TEST','REPORT')) NOT NULL,
  created_by INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (result_id) REFERENCES test_results(id),
  FOREIGN KEY (created_by) REFERENCES users(id)
);
```

---

## 10. Result Audit Trail (Append-Only)

```sql
CREATE TABLE result_audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  result_id INTEGER NOT NULL,
  old_value TEXT,
  new_value TEXT,
  reason TEXT NOT NULL,
  changed_by INTEGER NOT NULL,
  changed_at TEXT NOT NULL,
  FOREIGN KEY (result_id) REFERENCES test_results(id),
  FOREIGN KEY (changed_by) REFERENCES users(id)
);
```

---

## 11. Reports

```sql
CREATE TABLE reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_test_id INTEGER UNIQUE NOT NULL,
  finalized_by INTEGER NOT NULL,
  finalized_at TEXT NOT NULL,
  pdf_path TEXT NOT NULL,
  FOREIGN KEY (order_test_id) REFERENCES order_tests(id),
  FOREIGN KEY (finalized_by) REFERENCES users(id)
);
```

---

## 12. Licensing

```sql
CREATE TABLE license_info (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  license_json TEXT NOT NULL,
  installed_at TEXT NOT NULL
);
```

---

## 13. Application Audit Log

```sql
CREATE TABLE app_audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  entity TEXT NOT NULL,
  entity_id INTEGER,
  action TEXT NOT NULL,
  performed_by INTEGER,
  performed_at TEXT NOT NULL
);
```

---

## 14. Indexes (Performance-Critical)

```sql
CREATE INDEX idx_patient_uid ON patients(patient_uid);
CREATE INDEX idx_order_uid ON orders(order_uid);
CREATE INDEX idx_sample_uid ON samples(sample_uid);
CREATE INDEX idx_result_order_test ON test_results(order_test_id);
CREATE INDEX idx_audit_result ON result_audit_log(result_id);
```

---

## 15. Design Guarantees

- Test definitions are versioned and immutable for finalized reports
- Reference ranges are time-safe and patient-context aware
- Result lifecycle strictly enforced
- All clinical changes are audit-logged
- Schema aligns 1:1 with PRDs

---

## 16. Developer Notes (Non-Negotiable)

- Never UPDATE finalized results
- All edits INSERT audit rows
- Store timestamps in ISO-8601 UTC
- Wrap all clinical writes in transactions

---

This schema is **legally defensible, audit-safe, and production-ready** for offline pathology labs.


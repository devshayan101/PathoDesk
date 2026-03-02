# Quality Control (QC) & Audit Trail
## Clinical Safety & Compliance PRD (Offline Pathology LIS)

---

## 1. Purpose

The Quality Control (QC) and Audit Trail modules ensure **clinical accuracy, traceability, and legal defensibility** of the pathology lab software. These modules are **non-optional for serious labs** and are critical for internal quality assurance, medico-legal protection, and NABL/ISO-style audits.

Both modules must function **fully offline** and be tamper-resistant.

---

## 2. Core Principles

- QC data is **clinical evidence**, not optional metadata
- Audit logs are **append-only and immutable**
- No result, report, or bill can exist without traceability
- QC and audit are enforced by system design, not user discipline

---

## 3. Quality Control (QC) Module

### 3.1 Scope of QC

The QC module covers:
- Internal Quality Control (IQC)
- Reagent & lot traceability
- Instrument performance tracking
- Result validation support

External QC (EQAS) uploads are optional (Phase‑2).

---

## 4. QC Master Configuration

### 4.1 QC Test Mapping

Each analyte/test may be linked to:
- QC material (Level 1 / Level 2 / Level 3)
- Analyzer or method

| Field | Description |
|-----|-------------|
| Test / Parameter | Clinical reference |
| QC Level | Normal / Abnormal |
| Mean | Expected value |
| SD | Standard deviation |
| Lot Number | QC material lot |
| Expiry Date | QC expiry |

---

## 5. Daily QC Entry Workflow

```
Start of Day
   ↓
Run QC sample on analyzer / manual
   ↓
Enter QC values
   ↓
System evaluates QC rules
   ↓
Pass → Allow patient testing
Fail → Block / warn
```

QC entry is **mandatory before patient result entry** for configured tests.

---

## 6. QC Rule Engine

### 6.1 Supported Rules (Configurable)

- ±2 SD (warning)
- ±3 SD (fail)
- Westgard basic rules (1-2s, 1-3s)

Advanced multi-rule Westgard is Phase‑2.

---

## 7. QC Fail Handling

| Scenario | System Behavior |
|--------|-----------------|
| QC Warning | Allow testing with alert |
| QC Fail | Block result finalization |
| Override | Pathologist-only with reason |

All overrides are logged in audit trail.

---

## 8. QC Visibility in Result Entry

During result entry:
- QC status shown per test
- Last QC date & result visible
- Warnings displayed inline

This directly supports safer reporting.

---

## 9. QC Reports

- Daily QC log
- QC trend chart (mean vs SD)
- QC failure & override report
- Lot-wise QC history

All reports exportable as PDF / Excel.

---

## 10. Audit Trail Module

### 10.1 What Is Audited (Mandatory)

| Area | Events Logged |
|----|--------------|
| Authentication | Login, logout, failures |
| Patient Data | Create, edit, delete |
| Orders | Create, modify, cancel |
| Results | Entry, edit, verify, finalize |
| Reports | Preview, print, reprint |
| Billing | Invoice create, edit, cancel |
| Pricing | Price changes |
| Licensing | Validation, expiry, tamper |
| QC | Entry, fail, override |

---

## 11. Audit Record Structure

Each audit record stores:
- Event type
- Entity (patient, test, invoice, etc.)
- Old value (if applicable)
- New value (if applicable)
- User ID & role
- Timestamp
- Reason/comment (mandatory for overrides)

Audit records are **append-only**.

---

## 12. Immutability & Protection

- Audit tables cannot be edited or deleted via UI
- DB-level constraints prevent modification
- Admin users are also audited
- Backup/restore preserves audit integrity

---

## 13. Audit Search & Reporting

Admins and auditors can:
- Filter by date, user, module
- Export audit logs
- View entity history (e.g., full result change timeline)

---

## 14. Licensing Enforcement

| License State | QC & Audit Behavior |
|--------------|---------------------|
| Valid | Full QC + audit enabled |
| Grace Period | Enabled |
| Expired | QC & audit still enforced |
| Invalid | Application blocked |

QC and audit **cannot be disabled by license**.

---

## 15. Failure & Edge Cases

| Scenario | Handling |
|--------|----------|
| Power failure during QC | Partial entry flagged |
| System clock change | Audit detects anomaly |
| Backup restore | Audit continuity preserved |

---

## 16. Data Model (High-Level)

Core tables:
- qc_master
- qc_entries
- qc_rules
- audit_log
- audit_entities

---

## 17. Acceptance Criteria

- QC must be entered before reporting (if enabled)
- QC failures block finalization
- All critical actions generate audit logs
- Audit logs are immutable
- Works fully offline

---

## 18. Summary

The QC & Audit modules provide the **clinical credibility backbone** of the pathology LIS. Together, they ensure patient safety, regulatory readiness, and long-term trust in both clinical and financial data.


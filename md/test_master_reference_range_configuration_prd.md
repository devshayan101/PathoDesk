# Test Master & Reference Range Configuration
## Product Requirements Document (PRD)

---

## 1. Purpose

The Test Master & Reference Range module defines the **clinical foundation** of the pathology software. It governs how tests are defined, how results are structured, and how clinical interpretation (reference ranges, flags, critical values) is applied.

This module is **admin-controlled**, safety-critical, and must be stable, auditable, and backward-compatible.

---

## 2. Design Principles

- Configuration over code (no developer required for new tests)
- Backward compatibility (existing reports must never change)
- Explicit versioning of test definitions
- Simple enough for small labs, powerful enough for expansion
- Entirely offline

---

## 3. User Roles

| Role | Permissions |
|------|------------|
| Administrator | Full create/edit/delete access |
| Pathologist | Review & approve test definitions |
| Technician | Read-only |

---

## 4. Test Master Structure

Each laboratory test is defined once in the Test Master and reused across orders, result entry, reporting, and billing.

### 4.1 Core Test Fields

| Field | Description |
|------|------------|
| Test Code | Unique internal code (immutable) |
| Test Name | Display name (e.g., Hemoglobin) |
| Department | Hematology / Biochemistry / etc. |
| Method | Manual / Analyzer / Semi-auto |
| Sample Type | Blood / Serum / Urine / etc. |
| Report Group | Logical grouping on report |
| Active Flag | Enable / disable availability |

---

## 5. Test Parameters (Sub-Tests)

A test may consist of one or multiple parameters.

### Parameter Fields

| Field | Description |
|------|------------|
| Parameter Code | Unique per test |
| Parameter Name | Display name |
| Data Type | Numeric / Text / Boolean / Calculated |
| Unit | g/dL, mg/dL, %, etc. |
| Decimal Precision | Number of decimals |
| Display Order | Order on screen & report |
| Mandatory Flag | Must be entered |

---

## 6. Calculated Parameters

Calculated parameters derive their value from formulas.

### Rules
- Formula must reference other parameters in same test
- Formula evaluated locally at runtime
- Calculated values are read-only
- Formula version locked at report finalization

Example:
MCHC = (Hemoglobin / PCV) × 100

---

## 7. Reference Range Configuration

Reference ranges define clinical interpretation and abnormal flagging.

### 7.1 Range Dimensions

Reference ranges may vary by:
- Age (min–max in days)
- Gender
- Method
- Analyzer (optional)

### 7.2 Range Fields

| Field | Description |
|------|------------|
| Lower Limit | Numeric lower bound |
| Upper Limit | Numeric upper bound |
| Display Text | Optional custom text |
| Abnormal Flag | H / L logic |
| Effective Date | Start date for this range |

---

## 8. Critical Values

### Configuration

- Critical low and high thresholds per parameter
- Independent of normal reference range

### Behavior
- Triggers mandatory acknowledgment
- Requires comment on entry
- Recorded permanently in audit log

---

## 9. Age & Gender Handling

### Age Buckets

- Defined in days (not years) to avoid ambiguity
- Example:
  - 0–28 days (Neonate)
  - 29–365 days (Infant)
  - >365 days (Adult)

### Gender Logic

- Male / Female / All
- Explicit fallback required

---

## 10. Versioning & Change Control

### Non-Negotiable Rule

**Test definitions and reference ranges used in finalized reports must never change retroactively.**

### Implementation

- Each test has version number
- New edits create a new version
- Reports store test_version_id

---

## 11. Deactivation Rules

- Tests cannot be deleted once used
- Deactivated tests:
  - Hidden from new orders
  - Still visible in historical reports

---

## 12. Validation Rules

| Rule | Enforcement |
|------|-------------|
| Overlapping age ranges | Block save |
| Missing fallback range | Block save |
| Formula circular dependency | Block save |
| Unit mismatch | Warn admin |

---

## 13. UI/UX – Test Master Screen

### Layout

- Test list (left)
- Test detail editor (center)
- Parameter & range editor (right)

### UX Rules

- Advanced settings collapsed by default
- Inline validation messages
- Preview mode before publishing

---

## 14. Import / Export

- CSV import for bulk test setup
- CSV export for backup and review
- Import validation preview mandatory

---

## 15. Data Model (High Level)

Core tables:
- tests
- test_versions
- test_parameters
- parameter_versions
- reference_ranges
- critical_values

---

## 16. Audit & Compliance

Every change logs:
- Old value
- New value
- User
- Timestamp
- Reason for change

Audit logs are immutable.

---

## 17. Acceptance Criteria

- Admin can define full test without developer help
- Reference ranges apply correctly by age & gender
- Historical reports remain unchanged after edits
- Critical values trigger mandatory workflow
- Module works fully offline

---

## 18. Summary

The Test Master & Reference Range module is the **clinical configuration backbone** of the pathology system. Correct implementation ensures patient safety, legal defensibility, and long-term product credibility.


# Lab Report Entry (Result Entry & Validation)
## Detailed PRD Section

---

## 1. Purpose of the Report Entry Module

Enable fast, accurate, and auditable entry of laboratory test results in a fully offline environment, while enforcing:
- Clinical correctness
- Reference range validation
- Multi-level verification
- Complete medico-legal auditability

This module is the clinical core of the pathology software. It must prioritize safety, precision, and traceability over speed alone.

---

## 2. Users & Responsibilities

| Role | Responsibilities |
|------|------------------|
| Lab Technician | Enter raw test results accurately |
| Senior Technician (optional) | Technical verification |
| Pathologist | Clinical validation and final sign-off |
| Administrator | Configure tests, parameters, and reference ranges |

---

## 3. Result Entry Modes

### 3.1 Manual Result Entry (Primary)
Used for:
- Small labs
- Semi-automated workflows
- Specialized or manual tests

### 3.2 Analyzer-Imported Results (Secondary)
- Imported results are marked as **Draft**
- Mandatory human review before verification
- Cannot be auto-finalized

---

## 4. Result Entry Screen – UX Layout

### Single-Screen Design

**Left Panel**
- Patient details
- Sample ID
- Ordered test list with status indicators

**Center Panel (Primary Workspace)**
- Parameter grid
- Result input field
- Units
- Reference ranges
- Abnormal flags (High / Low / Critical)

**Right Panel**
- Previous result history (delta check)
- QC warnings
- Comments and notes

---

## 5. Data Entry Mechanics

### Keyboard-Optimized Workflow
- TAB → Move to next parameter
- ENTER → Save current parameter
- F5 → Save draft
- F9 → Submit for verification

Mouse usage must not be required for routine workflows.

---

## 6. Supported Parameter Types

| Type | Example | Validation Rules |
|------|--------|------------------|
| Numeric | Hemoglobin | Decimal limits enforced |
| Text | Blood Group | Dropdown / controlled values |
| Boolean | HBsAg | Positive / Negative |
| Calculated | MCHC | Formula-based, auto-calculated |
| Multi-value | Differential Count | Sum validation (e.g., 100%) |

---

## 7. Reference Range Engine

### Configuration
- Age-based ranges
- Gender-based ranges
- Method-based ranges
- Analyzer-specific ranges (optional)

### Runtime Behavior
- Automatic comparison on entry
- Visual highlighting of abnormal values
- Configurable alert thresholds

---

## 8. Critical Value Management

### Workflow
1. Result entered
2. System detects critical value
3. Mandatory acknowledgment popup
4. Comment required
5. Event recorded in audit trail

Critical values cannot be finalized without acknowledgment.

---

## 9. Delta Check (Historical Comparison)

If prior results exist:
- Percentage change calculated
- Configurable threshold
- Warning displayed
- Override requires justification comment

---

## 10. Validation & Approval Workflow

### Status Lifecycle
Draft → Entered → Verified → Finalized → Report Issued

### Rules
- Technicians cannot finalize reports
- Pathologist authentication required
- Finalized results are immutable

---

## 11. Error Prevention Controls

| Control | Purpose |
|---------|--------|
| Soft limits | Warn on abnormal values |
| Hard limits | Block impossible values |
| Duplicate detection | Prevent duplicate entries |
| Completeness check | Block submission if incomplete |

---

## 12. Comments & Interpretation

### Levels
- Parameter-level comments
- Test-level interpretation
- Report-level remarks

All comments are timestamped and user-identified.

---

## 13. Mandatory Report Preview

Before finalization:
- Display exact print layout
- Highlight abnormal values
- Confirm patient and sample details

---

## 14. Audit Trail (Mandatory)

Each modification records:
- Previous value
- New value
- User ID
- Timestamp
- Reason for change

Audit records are append-only and non-editable.

---

## 15. Offline Safety Mechanisms

- Auto-save drafts at fixed intervals
- Crash recovery on restart
- Draft results are never auto-published

---

## 16. Data Model – Result Tables

Core entities:
- test_results
- test_parameters
- reference_ranges
- result_comments
- result_audit_log

---

## 17. Report Output Rules

- Preliminary watermark for non-final results
- Final reports include:
  - Signatory name and qualification
  - Digital signature image
  - Issue date and time

---

## 18. Analyzer Import Interaction

- Imported results highlighted visually
- Editable until verification
- Source marked as "Analyzer"
- Original import file archived for audit

---

## 19. Failure Handling

| Scenario | System Response |
|----------|-----------------|
| Power loss | Draft restored automatically |
| Incorrect entry | Edit allowed with reason |
| Pathologist unavailable | Results remain pending |
| Duplicate sample ID | Entry blocked |

---

## 20. Acceptance Criteria

- Finalized results cannot be edited
- All abnormal values are flagged
- All edits require justification
- Preview exactly matches printed report
- Module functions fully offline

---

## 21. Summary

The Report Entry module is the clinical backbone of the pathology system. It must be designed as a safety-critical subsystem with strict controls, full auditability, and zero dependency on internet connectivity.


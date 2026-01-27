# QA Acceptance Test Cases (End-to-End)
## Offline Pathology Laboratory Information System (LIS)

---

## 1. Purpose

This document defines **end-to-end QA acceptance test cases** for validating the Offline Pathology LIS across **clinical, billing, doctor referral, QC, audit, and licensing workflows**.

These test cases are written to:
- Validate real-world lab operations
- Catch revenue, clinical, and compliance defects
- Serve as a final go/no-go checklist before release

---

## 2. Test Environment Assumptions

- Windows desktop (single PC)
- No internet connectivity
- Valid database with default test master
- Printer configured
- License file available (trial/valid/expired scenarios)

---

## 3. End-to-End Clinical Workflow Test Cases

### TC-E2E-01: Patient → Order → Sample → Result → Report

**Preconditions**
- Valid license
- Test (CBC) configured

**Steps**
1. Login as Reception
2. Register new patient
3. Create order with CBC
4. Generate invoice
5. Collect sample & print barcode
6. Login as Technician
7. Enter CBC results
8. Login as Pathologist
9. Verify and finalize report
10. Print report

**Expected Results**
- Invoice generated successfully
- Report finalized and printed
- Audit trail captures all actions

---

### TC-E2E-02: Draft Result Recovery After Power Failure

**Steps**
1. Start result entry
2. Enter partial values
3. Simulate application crash
4. Reopen application

**Expected Results**
- Draft restored automatically
- No data loss

---

## 4. Test Master & Reference Range Tests

### TC-TM-01: Create New Test via Wizard

**Steps**
1. Login as Admin
2. Open Test Creation Wizard
3. Create new test with parameters and ranges
4. Publish test

**Expected Results**
- Test visible in order entry
- Test version created

---

### TC-TM-02: Edit Test After Reports Exist

**Steps**
1. Edit reference range of existing test

**Expected Results**
- New version created
- Old reports unchanged

---

## 5. Pricing & Billing Test Cases

### TC-BILL-01: Standard Price List Billing

**Steps**
1. Select Standard price list
2. Add CBC
3. Generate invoice

**Expected Results**
- Correct price applied
- Invoice immutable after save

---

### TC-BILL-02: Doctor Referral Pricing & Commission

**Preconditions**
- Doctor configured with custom price list

**Steps**
1. Register patient with referring doctor
2. Create order
3. Generate invoice

**Expected Results**
- Doctor-specific price applied
- Commission calculated correctly
- Commission hidden from patient invoice

---

## 6. Monthly Doctor Commission Tests

### TC-DR-01: Monthly Aggregation

**Steps**
1. Create multiple doctor-referred invoices
2. Generate monthly commission statement

**Expected Results**
- Accurate per-doctor totals
- Export to PDF/Excel works

---

## 7. QC Module Test Cases

### TC-QC-01: QC Pass Allows Reporting

**Steps**
1. Enter QC values within range
2. Enter patient results

**Expected Results**
- Reporting allowed

---

### TC-QC-02: QC Fail Blocks Finalization

**Steps**
1. Enter QC values outside limits
2. Attempt report finalization

**Expected Results**
- Finalization blocked
- Override requires pathologist login and reason

---

## 8. Audit Trail Test Cases

### TC-AUD-01: Result Edit Audit

**Steps**
1. Edit entered result

**Expected Results**
- Old and new values logged
- User and timestamp recorded

---

### TC-AUD-02: Billing Audit

**Steps**
1. Cancel invoice

**Expected Results**
- Cancellation logged with reason

---

## 9. Licensing Test Cases

### TC-LIC-01: Expired License Blocks Billing

**Steps**
1. Load expired license
2. Attempt new invoice

**Expected Results**
- Billing blocked
- Viewing old invoices allowed

---

### TC-LIC-02: Grace Period Warning

**Steps**
1. Load near-expiry license

**Expected Results**
- Warning displayed
- Operations allowed

---

## 10. Backup & Restore Test Cases

### TC-BKP-01: Backup Integrity

**Steps**
1. Perform manual backup
2. Restore on same machine

**Expected Results**
- All data restored
- Audit logs preserved

---

## 11. Security & Role Tests

### TC-SEC-01: Role-Based Access

**Steps**
1. Login as Technician
2. Attempt price change

**Expected Results**
- Access denied

---

## 12. Negative & Edge Case Tests

| Scenario | Expected Outcome |
|--------|-----------------|
| Duplicate sample ID | Blocked |
| Zero billing without remark | Blocked |
| Finalized report edit | Blocked |
| Clock rollback | Detected in audit |

---

## 13. Acceptance Exit Criteria

The system is considered **release-ready** if:
- All critical and high-priority test cases pass
- No data loss observed
- Audit trail is complete
- Clinical and billing workflows function offline

---

## 14. Summary

These end-to-end QA acceptance tests ensure the LIS is **clinically safe, financially accurate, audit-ready, and production-grade** for real pathology labs.


# Complete End-to-End Workflow
## Clinical + Billing + Licensing (Offline Pathology Software)

---

## 1. Overview

This document describes the **complete end-to-end operational workflow** of the offline pathology lab software, covering:
- Clinical workflow (patient → sample → results → report)
- Billing workflow (order → invoice → payment)
- Licensing workflow (feature gating, expiry handling)

The intent is to provide a **single, unified reference** for product, engineering, QA, and implementation teams.

---

## 2. High-Level System Flow (Textual Diagram)

```
[Application Start]
        |
        v
[License Validation]
        |
        |-- INVALID / EXPIRED (beyond grace) --> [Restricted Mode]
        |
        v
[Dashboard]
        |
        v
[Patient Registration]
        |
        v
[Order Creation]
        |
        +--> [Billing & Invoice]
        |
        v
[Sample Collection & Accession]
        |
        v
[Lab Processing]
        |
        +--> [Analyzer Import] (optional)
        |
        v
[Result Entry]
        |
        v
[Verification & Sign-off]
        |
        v
[Report Generation]
        |
        v
[Report Archive / Print]
```

---

## 3. Licensing Workflow (Precondition Layer)

### 3.1 Application Startup

1. Application launches
2. License file loaded from local storage
3. Digital signature verified
4. Expiry and machine binding checked

### 3.2 License States & Effects

| License State | System Behavior |
|--------------|-----------------|
| Valid | Full access to licensed modules |
| Near Expiry | Warning banner displayed |
| Grace Period | Warnings only, operations allowed |
| Expired | Billing & report finalization blocked |
| Invalid/Tampered | Application blocked |

Licensing is enforced **before any clinical or billing workflow**.

---

## 4. Patient Registration Workflow

```
Reception User
   |
   v
[New / Existing Patient]
   |
   v
[Enter Demographics]
   |
   v
[Patient Record Saved]
```

Outputs:
- Unique Patient ID
- Visit record created

---

## 5. Order Creation & Billing Workflow

```
[Patient Selected]
        |
        v
[Select Tests / Packages]
        |
        v
[Price Calculation]
        |
        +--> [Discount Approval] (if required)
        |
        v
[Invoice Generated]
        |
        +--> [Payment Recorded]
        |
        v
[Order Confirmed]
```

Key rules:
- Billing module must be licensed
- Invoice number is immutable
- Payment mode recorded but not externally processed

---

## 6. Sample Collection & Accession Workflow

```
[Order Confirmed]
        |
        v
[Generate Sample ID]
        |
        v
[Print Barcode Label]
        |
        v
[Sample Collected]
        |
        v
[Sample Received in Lab]
```

Status transitions are strictly sequential and audited.

---

## 7. Laboratory Processing Workflow

```
[Sample Received]
        |
        v
[Assigned to Department]
        |
        +--> [Analyzer Processing] (optional)
        |
        v
[Ready for Result Entry]
```

---

## 8. Result Entry & Validation Workflow

```
[Draft Results]
        |
        v
[Technician Entry]
        |
        +--> [Reference Range Check]
        +--> [Critical Value Detection]
        +--> [Delta Check]
        |
        v
[Submit for Verification]
        |
        v
[Pathologist Review]
        |
        +--> [Edit with Reason] (if needed)
        |
        v
[Finalized Results]
```

Rules:
- Finalization requires valid license
- Finalized results are read-only

---

## 9. Report Generation & Issuance Workflow

```
[Finalized Results]
        |
        v
[Report Preview]
        |
        v
[PDF Generation]
        |
        v
[Print / Archive]
```

Notes:
- Preliminary watermark applied if not finalized
- Digital signature applied at finalization

---

## 10. Post-Report Activities

- Report stored in local archive
- Available for reprint/export
- Included in MIS and audit reports

---

## 11. Exception & Failure Handling

| Scenario | Outcome |
|--------|--------|
| Power failure mid-entry | Draft auto-restored |
| License expiry during workflow | Current draft saved, finalization blocked |
| Analyzer import failure | Manual entry fallback |
| Printer failure | Report remains archived |

---

## 12. Cross-Cutting Audit & Logging

All workflows generate audit records for:
- Data creation
- Data modification
- Status transitions
- License validation events

Audit logs are immutable and local.

---

## 13. Summary

This end-to-end workflow ensures:
- Clear separation of clinical, billing, and licensing concerns
- Safe offline operation
- Strong medico-legal defensibility
- Predictable system behavior under failure or expiry conditions

This document should be treated as the **authoritative workflow reference** for implementation and testing.


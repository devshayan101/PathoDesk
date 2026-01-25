# Reference Range Editor
## Clinical Configuration Module – Offline Pathology Lab Software

---

## 1. What Is the Reference Range Editor

The **Reference Range Editor** is a **clinical configuration module** used to define **what is considered normal, abnormal, or critical** for each laboratory test parameter.

It does **not** handle patient data or result entry. Instead, it defines the **clinical rules** that the system automatically applies during result entry and report generation.

---

## 2. Why This Module Exists (Clinical Rationale)

Laboratory results cannot be interpreted in isolation. The same numeric value may be:
- Normal for one patient
- Abnormal for another
- Critical for a third

Interpretation depends on:
- Patient age
- Patient gender
- Test method or analyzer

The Reference Range Editor exists to **encode this medical knowledge into the software** in a safe, repeatable, and auditable way.

---

## 3. Who Uses the Reference Range Editor

| Role | Access Level |
|-----|-------------|
| Technician | No access |
| Receptionist | No access |
| Administrator | Full access |
| Pathologist | Review / approval |

Restricting access prevents accidental clinical misconfiguration.

---

## 4. Where It Fits in the System

```
Test Master
   └── Test Version
        └── Parameter
             └── Reference Range Editor
```

The Reference Range Editor is always tied to a **specific parameter of a specific test version**.

---

## 5. What Is Configured in the Reference Range Editor

### 5.1 Parameter Selection

The editor always operates on a **single parameter**, for example:
- Test: CBC
- Parameter: Hemoglobin

---

### 5.2 Age-Based Ranges (Mandatory)

Age is stored and evaluated in **days**, not years, to avoid ambiguity.

Example age buckets:
- 0–28 days (Neonate)
- 29–365 days (Infant)
- >365 days (Adult)

Overlapping age ranges are **not allowed**.

---

### 5.3 Gender-Based Logic

Each reference range must specify one of the following:
- Male
- Female
- All (fallback)

A fallback range (`All`) is mandatory; otherwise saving is blocked.

Example:

| Gender | Age (days) | Min | Max |
|------|------------|-----|-----|
| Male | >365 | 13.0 | 17.0 |
| Female | >365 | 12.0 | 15.0 |
| All | 0–365 | 10.0 | 14.0 |

---

### 5.4 Normal Reference Limits

Normal reference limits define:
- Lower limit
- Upper limit

These limits are used to automatically flag results as:
- NORMAL
- HIGH
- LOW

---

### 5.5 Display Text (Optional)

For parameters where numeric ranges are not appropriate, a display text may be used.

Examples:
- "Negative"
- "< 1:80"
- "Reactive / Non‑Reactive"

Display text appears on the report in place of numeric ranges.

---

### 5.6 Effective Date (Version Safety)

Each reference range has an **effective start date**.

This ensures:
- Old reports remain unchanged
- New reports use updated ranges

Reference ranges are **never retroactive**.

---

## 6. Critical Values (Related but Separate)

Critical values are configured separately but linked to the same parameter.

Example:
- Normal range (Potassium): 3.5–5.1 mmol/L
- Critical low: ≤2.5
- Critical high: ≥6.5

Critical values trigger:
- Mandatory acknowledgment
- Mandatory comment
- Permanent audit logging

---

## 7. What Happens During Result Entry (Automatic Enforcement)

When a result is entered:

1. Patient age (in days) is calculated
2. Patient gender is identified
3. Applicable reference range is selected
4. Result is compared to limits
5. System flags the result:
   - NORMAL
   - HIGH
   - LOW
   - CRITICAL
6. Critical results cannot be finalized without acknowledgment

Technicians **do not decide** what is normal or abnormal; the system does.

---

## 8. What the Reference Range Editor Is NOT

- Not a result entry screen
- Not editable by technicians
- Not retroactive
- Not optional

Misconfiguration here compromises the entire clinical system.

---

## 9. Clinical and Legal Importance

Correct reference range configuration ensures:
- Patient safety
- Accurate abnormal flagging
- Defensible reports during audits
- Consistency across technicians and shifts

This module is a **core selling point** for professional pathology labs.

---

## 10. One‑Line Summary

The **Reference Range Editor** is the clinical rule‑definition module that determines how laboratory results are interpreted by age, gender, and method—ensuring safe, consistent, and legally defensible reporting.

---

## 11. Developer Notes (Non‑Negotiable)

- Reference ranges are immutable once used in finalized reports
- Overlapping ranges must be blocked at save time
- Fallback range is mandatory
- All changes must be audit‑logged

---

This document should be treated as **authoritative guidance** for implementation, QA, and training.


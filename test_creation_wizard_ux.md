# Test Creation Wizard UX
## Guided Configuration for New Laboratory Tests

---

## 1. Purpose

The Test Creation Wizard provides a **guided, step-by-step user experience** for creating new laboratory tests without technical knowledge. It reduces configuration errors, enforces clinical safety rules, and accelerates onboarding for new labs.

The wizard is available **offline** and is restricted to Admin and Pathologist roles.

---

## 2. Design Objectives

- Zero-developer dependency for new test creation
- Prevent incomplete or unsafe test definitions
- Make complex configuration approachable for small labs
- Enforce versioning and audit requirements automatically
- Allow advanced configuration without overwhelming first-time users

---

## 3. Entry Point & Access Control

**Navigation:**
Admin → Test Master → Create New Test (Wizard)

**Permissions:**
- Admin: Full access
- Pathologist: Review & approve
- Technician: No access

---

## 4. Wizard Overview (Step Flow)

```
Step 1 → Test Basics
Step 2 → Parameters Setup
Step 3 → Reference Ranges
Step 4 → Critical Values
Step 5 → Report Layout & Interpretation
Step 6 → Review & Publish
```

Each step includes:
- Inline validation
- Save-as-draft option
- Contextual help

---

## 5. Step 1 – Test Basics

### Fields
- Test Code (unique, immutable)
- Test Name (display name)
- Department (dropdown)
- Sample Type (Blood / Serum / Urine / etc.)
- Method (Manual / Analyzer / Semi-auto)
- Report Group (for report ordering)

### UX Rules
- Test Code validated for uniqueness
- Mandatory fields highlighted
- Tooltips explain each field

---

## 6. Step 2 – Parameters Setup

### Parameter Grid

| Field | Description |
|------|-------------|
| Parameter Name | Display label |
| Data Type | Numeric / Text / Boolean / Calculated |
| Unit | g/dL, mg/dL, %, etc. |
| Decimals | Allowed decimal places |
| Mandatory | Yes / No |
| Display Order | Report ordering |

### UX Features
- Add / edit / reorder parameters
- Formula builder for calculated parameters
- Validation against circular dependencies

---

## 7. Step 3 – Reference Ranges

### Range Builder

- Age range (in days)
- Gender (Male / Female / All)
- Lower limit
- Upper limit
- Display text (optional)

### UX Safeguards
- Overlapping range detection
- Mandatory fallback range enforcement
- Live preview of abnormal flag behavior

---

## 8. Step 4 – Critical Values

### Configuration

- Critical Low threshold
- Critical High threshold
- Mandatory acknowledgment flag

### UX Behavior
- Visual warning indicators
- Explanation of clinical impact

---

## 9. Step 5 – Report Layout & Interpretation

### Layout Options
- Parameter grouping
- Section headers
- Bold/highlight abnormal values

### Interpretation Templates
- Optional default comments
- Auto-insert for abnormal results

---

## 10. Step 6 – Review & Publish

### Review Screen

- Complete test summary
- Parameter list with ranges
- Example sample report preview

### Publish Rules
- Creates Test Version 1
- Locks configuration for historical reports
- Prompts for change reason (audit)

---

## 11. Draft & Versioning Behavior

- Wizard progress auto-saved as draft
- Draft tests not visible in order entry
- Published tests immutable
- Edits create new version via same wizard

---

## 12. Error Handling & Validation

| Error | Handling |
|------|----------|
| Missing parameter | Block next step |
| No reference range | Block publish |
| Invalid formula | Inline error |
| Duplicate test code | Block creation |

---

## 13. Accessibility & Usability

- Keyboard navigation supported
- Clear step indicators
- Minimal clinical jargon in labels
- Context help for each step

---

## 14. Acceptance Criteria

- Admin can create a complete test in <10 minutes
- No published test lacks reference ranges
- Historical reports unaffected by edits
- Wizard works fully offline

---

## 15. Summary

The Test Creation Wizard transforms complex clinical configuration into a safe, guided workflow. It is a key differentiator for selling the software to small labs that lack IT support.


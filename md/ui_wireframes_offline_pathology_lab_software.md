# UI Wireframe Diagrams
## Offline Pathology Lab Software (Electron + TypeScript)

> These wireframes are **derived directly from the approved PRDs, workflows, and SQLite schema** and are intended for **engineering, UX, and QA alignment**. They are **layout‑accurate**, not visual‑design mockups.

---

## 1. Application Shell (Global Layout)

```
┌────────────────────────────────────────────────────────────┐
│  PathoDesk (Lab Name)                          [User ▾]   │
├────────────────────────────────────────────────────────────┤
│ Dashboard │ Patients │ Orders │ Samples │ Results │ Admin │
├────────────────────────────────────────────────────────────┤
│                                                            │
│                    ACTIVE MODULE VIEW                      │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

Rules:
- Top bar always visible
- Left navigation is fixed
- Module content replaces center pane only

---

## 2. Dashboard

```
┌──────────────────────── Dashboard ────────────────────────┐
│ Today: 42 Patients | Pending Results: 6 | Critical: 1     │
├────────────────────────────────────────────────────────────┤
│ [ Pending Samples ]   [ Pending Verification ]             │
│ ---------------------------------------------------------- │
│ Sample ID | Patient | Test | Status                         │
│ ---------------------------------------------------------- │
│ S-10231   | Rahul   | CBC  | RESULT ENTERED                 │
│ S-10232   | Anita   | LFT  | DRAFT                           │
└────────────────────────────────────────────────────────────┘
```

---

## 3. Patient Registration Screen

```
┌──────────────────── Patient Registration ──────────────────┐
│ Patient ID: AUTO‑GENERATED                                 │
│ ---------------------------------------------------------- │
│ Name        [_____________]   Gender [M/F/O ▾]             │
│ DOB         [____‑__‑__]      Phone  [___________]         │
│ Address     [_______________________________]              │
│                                                            │
│ [ Save Patient ]   [ Cancel ]                               │
└────────────────────────────────────────────────────────────┘
```

Keyboard focus order is mandatory.

---

## 4. Order Creation & Billing

```
┌──────────────────── Order Creation ────────────────────────┐
│ Patient: Rahul Sharma (PID‑10231)                           │
├────────────────────────────────────────────────────────────┤
│ Select Tests:                                               │
│ [ CBC ] [ LFT ] [ RFT ] [ Thyroid ]                          │
│                                                            │
│ ---------------------------------------------------------- │
│ Test            Price                                      │
│ CBC             350                                        │
│ LFT             650                                        │
│ ---------------------------------------------------------- │
│ Total: 1000                                                │
│ Discount: [___]  Approved By: [Admin ▾]                    │
│                                                            │
│ [ Generate Invoice ]   [ Print Receipt ]                   │
└────────────────────────────────────────────────────────────┘
```

---

## 5. Sample Accession & Barcode

```
┌────────────────── Sample Accession ────────────────────────┐
│ Order ID: ORD‑2026‑00123                                    │
├────────────────────────────────────────────────────────────┤
│ Test     Sample ID        Status                            │
│ CBC      S‑10231‑A        Collected                         │
│ LFT      S‑10231‑B        Collected                         │
│                                                            │
│ [ Print Barcode ]   [ Mark Received ]                       │
└────────────────────────────────────────────────────────────┘
```

---

## 6. **Lab Report Entry (Clinical Core)**

```
┌──────────────────── Result Entry ──────────────────────────┐
│ Patient: Rahul Sharma   Sample: S‑10231‑A   Test: CBC       │
├───────────────┬────────────────────────────┬──────────────┤
│ LEFT PANEL    │ CENTER (ENTRY GRID)         │ RIGHT PANEL  │
│               │                              │              │
│ Patient Info  │ Parameter | Value | Range   │ Previous     │
│ Sample Info   │ Hb        | [13.2]| 13‑17   │ Hb: 14.1     │
│ Test Status   │ WBC       | [8200]| 4‑11k   │ WBC: 7600   │
│               │ Platelet  | [1.5L]| 1.5‑4L │ QC OK        │
│               │                              │              │
│               │ [F5 Save Draft] [F9 Submit] │ Comments     │
└───────────────┴────────────────────────────┴──────────────┘
```

Rules:
- Single screen only
- No modal data entry
- Abnormal flags auto‑highlighted

---

## 7. Critical Value Acknowledgment

```
┌─────────────── CRITICAL VALUE ALERT ───────────────────────┐
│ Parameter: Potassium                                       │
│ Value: 6.8 mmol/L                                         │
│                                                            │
│ Comment (Mandatory):                                      │
│ [_________________________________________]                │
│                                                            │
│ [ Acknowledge & Continue ]                                 │
└────────────────────────────────────────────────────────────┘
```

Cannot proceed without comment.

---

## 8. Report Preview & Finalization

```
┌──────────────────── Report Preview ────────────────────────┐
│ [ PDF Preview – Exact Print Output ]                        │
│                                                            │
│ Abnormal values highlighted                                │
│ Digital signature placeholder visible                      │
│                                                            │
│ [ Finalize Report ]   [ Cancel ]                            │
└────────────────────────────────────────────────────────────┘
```

---

## 9. Test Master Configuration

```
┌────────────── Test Master ────────────────┐
│ Test List        | Test Details            │
│ ---------------- | ---------------------- │
│ CBC              | Name: CBC               │
│ LFT              | Dept: Hematology        │
│ RFT              | Method: Analyzer        │
│                  | Sample: Blood           │
│                  | [ Manage Parameters ]   │
└───────────────────────────────────────────┘
```

---

## 10. Reference Range Editor

```
┌────────── Reference Ranges ───────────────┐
│ Parameter: Hemoglobin                     │
│ ---------------------------------------- │
│ Gender | Age (Days) | Min | Max           │
│ M      | 365‑∞      | 13  | 17            │
│ F      | 365‑∞      | 12  | 15            │
│                                            │
│ [ Add Range ]  [ Save ]                    │
└───────────────────────────────────────────┘
```

---

## 11. License Management (Admin)

```
┌──────────────── License ──────────────────┐
│ License ID: LIC‑2026‑000142                │
│ Edition: Enterprise                        │
│ Expiry: 01‑Jan‑2027                        │
│                                            │
│ Enabled Modules:                           │
│ ☑ Billing  ☑ QC  ☑ Inventory               │
│                                            │
│ [ Upload New License ]                     │
└───────────────────────────────────────────┘
```

---

## 12. Design Guarantees

- Matches approved PRDs exactly
- Enforces clinical safety workflows
- Optimized for keyboard usage
- Single‑PC, offline friendly
- Ready for React component breakdown

---

## 13. Next Steps

These wireframes can now be:
- Converted to **React components**
- Used for **UX review with labs**
- Used as **QA acceptance references**

No visual styling should be applied until workflow approval.


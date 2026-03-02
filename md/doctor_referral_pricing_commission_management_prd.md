# Doctor Referral Pricing & Commission Management
## Detailed PRD (Offline Pathology LIS)

---

## 1. Purpose

The Doctor Referral Pricing & Commission module enables pathology labs to:
- Offer **doctor-specific test pricing**
- Track **patient referrals by doctor**
- Calculate **doctor commissions automatically**
- Produce **monthly commission statements**
- Preserve **lab margin transparency**

This module is a **commercially critical differentiator** for Indian pathology labs and must work fully offline.

---

## 2. Core Business Logic (Ground Truth)

For doctor-referred patients:

> **Lab Margin = Test Selling Price – Doctor Commission**

Doctor commission is calculated **per patient, per test, per invoice**, and aggregated **monthly per doctor**.

---

## 3. Doctor Referral Pricing Model (Correct Architecture)

Doctor pricing is implemented using **Doctor-Specific Price Lists**, not by modifying test master prices.

```
Doctor
  └── Doctor Price List
        └── Test Prices (Doctor Rate)

Billing uses:
Patient → Referring Doctor → Linked Price List
```

This allows **hundreds of doctors**, each with unique negotiated rates.

---

## 4. Doctor Master Configuration

### 4.1 Doctor Master Fields

| Field | Description |
|-----|-------------|
| Doctor ID | Unique identifier |
| Doctor Name | Display name |
| Specialty | Optional |
| Contact Details | Phone, address |
| Default Commission Model | % or Flat |
| Default Commission Rate | Numeric |
| Linked Price List | Doctor-specific |
| Active Status | Enable / disable |

---

## 5. Doctor Price Lists

### 5.1 Concept

Each doctor may have:
- Their **own price list**, OR
- A **shared referral price list** (group of doctors)

This balances flexibility and admin effort.

### 5.2 Example

| Doctor | CBC Price | LFT Price |
|------|----------|----------|
| Dr A | ₹250 | ₹500 |
| Dr B | ₹300 | ₹600 |
| Walk-in | ₹350 | ₹700 |

---

## 6. Commission Models Supported

### 6.1 Percentage-Based Commission (Most Common)

```
Commission = Selling Price × Commission %
```

Example:
- CBC billed at ₹300
- Commission 30%
- Doctor gets ₹90

---

### 6.2 Flat Per-Test Commission

```
Commission = Fixed amount per test
```

Example:
- CBC flat commission = ₹100

---

### 6.3 Hybrid (Advanced, Optional)

- Percentage for some tests
- Flat for others

---

## 7. Billing-Time Workflow (Critical)

```
Reception creates patient
   ↓
Select Referring Doctor
   ↓
System auto-selects Doctor Price List
   ↓
Add Tests
   ↓
System calculates:
   - Selling price
   - Doctor commission
   - Lab margin (hidden)
   ↓
Invoice generated (price frozen)
```

Doctor commission is **calculated but not shown on patient invoice**.

---

## 8. Commission Calculation Rules

| Rule | Enforcement |
|----|------------|
| Commission calculated per invoice item | Mandatory |
| Commission snapshot stored | Immutable |
| Post-invoice changes | Not allowed |
| Manual override | Admin-only with reason |

---

## 9. Monthly Commission Aggregation

### 9.1 Period Logic

- Commission period = calendar month
- Based on invoice date (not report date)

### 9.2 Aggregation Formula

```
Total Commission (Doctor, Month) = Σ Commission of all invoice items
```

---

## 10. Doctor Commission Statement

### Statement Contents

- Doctor name & ID
- Month / year
- List of patients referred
- Test-wise billing amount
- Commission per test
- Total commission payable

Output formats:
- PDF
- Excel

---

## 11. Settlement & Payment Tracking

### Settlement Workflow

```
Generate monthly statement
   ↓
Admin reviews
   ↓
Mark as Paid / Partially Paid
   ↓
Payment record stored
```

### Payment Tracking Fields

| Field | Description |
|----|-------------|
| Payment Date | When paid |
| Payment Mode | Cash / Bank |
| Paid Amount | Numeric |
| Balance | Outstanding |

---

## 12. Edge Cases & Controls

| Scenario | System Behavior |
|-------|-----------------|
| Doctor changed mid-month | Price list applied per invoice |
| Doctor inactive | Cannot be selected for new patients |
| Invoice cancelled | Commission reversed |
| Package billing | Commission based on package rule |

---

## 13. Data Model (High-Level)

Core tables:
- doctors
- doctor_price_lists
- doctor_test_prices
- invoices
- invoice_items
- doctor_commissions
- commission_settlements

---

## 14. Audit & Compliance

- Every commission calculation logged
- Manual overrides require reason
- Historical statements immutable

---

## 15. Acceptance Criteria

- Different doctors can have different rates
- Commission calculated automatically
- Monthly totals are accurate
- Lab margin is never exposed to doctors
- Works fully offline

---

## 16. Summary

This design allows the pathology lab to scale to **hundreds of doctors**, maintain transparent commissions, protect margins, and operate reliably without internet—exactly matching real-world pathology business practices.


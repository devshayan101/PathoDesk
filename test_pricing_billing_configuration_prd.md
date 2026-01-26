# Test Pricing & Billing Configuration
## Consolidated PRD (Final – Clinical, Billing, Licensing Aligned)

---

## 1. Purpose

The Test Pricing & Billing Configuration module governs **how laboratory tests are monetized** without impacting clinical definitions. It is deliberately separated from the Test Master to ensure **clinical safety, audit integrity, and commercial flexibility**.

This PRD consolidates all final decisions from product, clinical, billing, and licensing discussions.

---

## 2. Core Architectural Rule (Non‑Negotiable)

> **Test pricing is NOT defined in the Test Master.**

### Separation of concerns

| Module | Responsibility |
|------|----------------|
| Test Master | Clinical definition (parameters, ranges, reporting) |
| Pricing & Billing | Commercial definition (price, discount, tax) |

This prevents:
- Clinical versioning pollution
- Retroactive invoice changes
- Legal/audit risk

---

## 3. Where Pricing Is Configured (UX Location)

```
Admin
 └── Billing & Pricing
       └── Price Lists
             └── Test Prices
```

Pricing configuration is **admin-only** and license-gated.

---

## 4. Pricing Model Overview

```
Test (clinical entity)
   |
   |  linked by test_id (read-only reference)
   v
Price List
   |
   └── Test Price
         - Base price
         - Discount rules
         - Tax rules
         - Effective dates
```

A single test may have **multiple prices**, depending on the price list.

---

## 5. Price Lists

### 5.1 Purpose

Price Lists allow the same test to be billed differently for different business contexts.

### 5.2 Common Price List Types

| Price List | Use Case |
|-----------|----------|
| Standard | Walk-in patients (default) |
| Corporate | Company contracts |
| Doctor Referral | Special negotiated rates |
| Camp / Package | Health camps |
| Custom | Lab-defined |

There is **no limit** on the number of price lists per lab.

---

## 6. Test Price Configuration

### 6.1 Per-Test, Per-Price-List Fields

| Field | Description |
|------|-------------|
| Test Reference | Linked Test Master ID (read-only) |
| Base Price | Gross price for billing |
| Auto Discount % | Optional automatic discount |
| Discount Cap | Maximum allowed discount |
| GST Applicability | Exempt / Taxable |
| GST Rate | 0%, 5%, 12%, etc. |
| Effective From | Start date |
| Effective To | Optional expiry |
| Active Flag | Enable / disable |

### 6.2 Versioning Rule

- Price edits do **not** modify past invoices
- Each invoice stores a **price snapshot**

---

## 7. Billing Workflow (Operational Logic)

```
Select Patient
   ↓
Select Price List (default = Standard)
   ↓
Add Tests / Packages
   ↓
System fetches prices from price list
   ↓
Apply discounts (rule-based / approved)
   ↓
Apply tax (if applicable)
   ↓
Generate invoice (price frozen)
```

---

## 8. Packages & Profiles Pricing

### 8.1 Package Definition

A package is a **commercial bundle**, independent of individual test prices.

| Field | Description |
|------|-------------|
| Package Code | Unique identifier |
| Package Name | Display name |
| Included Tests | Clinical references |
| Package Price | Fixed billing price |
| Validity | Optional date range |

### 8.2 Rules

- Package price overrides individual test prices
- Package breakdown on invoice is configurable
- Historical invoices remain unchanged

---

## 9. Discount Management

### 9.1 Discount Types

| Type | Example |
|----|--------|
| Percentage | 10% off |
| Flat Amount | ₹200 off |
| Manual Override | Admin-approved |

### 9.2 Approval Rules

| Scenario | Enforcement |
|--------|-------------|
| Discount ≤ threshold | Auto-allowed |
| Discount > threshold | Admin password required |
| Zero billing | Mandatory remark |

---

## 10. Tax (GST) Configuration

### 10.1 GST Setup

| Field | Description |
|------|-------------|
| GST Enabled | Yes / No |
| Pricing Mode | Inclusive / Exclusive |
| GSTIN | Lab GST number |

### 10.2 Invoice Behavior

- GST breakup displayed clearly
- Stored per invoice (no recalculation)

---

## 11. Payments & Dues

### Supported Payment Modes

- Cash
- Card (record-only)
- UPI (record-only)
- Credit / Due

### Rules

- Partial payments allowed
- Outstanding dues tracked per patient

---

## 12. Invoice Controls & Audit

- Invoice number auto-generated and immutable
- Invoice deletion requires admin role + reason
- All billing actions logged in audit trail

---

## 13. Licensing Enforcement

Billing & pricing are controlled by license state:

| License State | Behavior |
|--------------|---------|
| Valid | Full billing enabled |
| Grace Period | Warning only |
| Expired | New invoices blocked |
| Invalid | Billing module disabled |

Viewing and exporting historical invoices is **always allowed**.

---

## 14. Reporting (MIS)

- Daily collection summary
- Test-wise revenue
- Package utilization
- Discount report
- Outstanding dues report

---

## 15. Data Model (High-Level)

Core tables:
- price_lists
- test_prices
- packages
- package_items
- invoices
- invoice_items
- payments

---

## 16. Validation Rules

| Rule | Enforcement |
|----|-------------|
| Negative price | Block save |
| Overlapping effective dates | Warn / block |
| Invoice edit after finalization | Block |
| Discount without approval | Block |

---

## 17. Acceptance Criteria

- Admin can configure prices without developer help
- Multiple price lists function independently
- Past invoices never change
- Billing works fully offline
- Licensing blocks billing safely without data loss

---

## 18. Final Statement

This consolidated Test Pricing & Billing Configuration PRD represents the **final commercial architecture** of the pathology LIS. It is safe, scalable, audit‑ready, and aligned with clinical integrity and offline licensing constraints.


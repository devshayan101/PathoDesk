# Licensing System

## Product Requirements Document (Offline Pathology LIS)

---

## 1. Purpose

The Licensing System governs **who can use the software, which features are enabled, and under what commercial terms**, while ensuring the LIS remains **fully functional offline**.

This module is critical for:

- Commercial protection
- Controlled resale / white‑label distribution
- Safe restriction of billing without risking clinical data

---

## 2. Core Licensing Principles (Non‑Negotiable)

1. **Fully Offline** – No internet, phone‑home, or online activation
2. **Vendor‑Controlled** – Only vendor can issue valid licenses
3. **Tamper‑Resistant** – Any modification must be detectable
4. **Fail‑Safe** – Clinical data is never locked or deleted
5. **Legally Safe** – Expiry must not block access to historical reports

---

## 3. Licensing Model (Final Design)

### Digitally Signed Offline License File

- License is a **signed file** installed locally
- Verified using embedded public key
- No dependency on external services

This is the **only model suitable** for offline pathology labs.

---

## 4. License Types Supported

| License Type | Purpose                                    |
| ------------ | ------------------------------------------ |
| Trial        | Evaluation (time‑limited)                  |
| Annual       | Subscription license                       |
| Perpetual    | One‑time purchase                          |
| Enterprise   | All modules enabled                        |
| Add‑On       | Analyzer, **QC & Audit**, Inventory, Backup |

---

## 5. What a License Controls

Licenses control **features and usage**, not raw data access.

### Controlled Attributes

- Enabled modules (Billing, **QC & Audit**, Inventory, Analyzer, Doctor Commission)
- License validity (start / expiry)
- Maximum logical users
- Lab identity
- Machine binding level

### Module Classification

| Module Type | Modules Included | Pricing |
| ----------- | ---------------- | ------- |
| Core (Base License) | Patient, Orders, Results, Reports, Basic Billing | Included |
| Add-On (Extra Cost) | **QC & Audit**, Analyzer Integration, Advanced Inventory, Doctor Commission | Per-module pricing |

---

## 6. License File Structure

### File Name

```
license.lic
```

### Format: Signed JSON

```
{
  license_id,
  lab_name,
  issued_to,
  machine_id_hash,
  edition,
  enabled_modules,
  max_users,
  issue_date,
  expiry_date,
  signature
}
```

The `signature` is generated using the vendor’s private key.

---

## 7. Machine Binding (Anti-Piracy)

Machine binding defines how tightly a license is locked to a specific computer. The goal is to balance **anti-piracy protection**, **customer convenience**, and **support overhead**, depending on the commercial license type.

### 7.1 Machine Fingerprint Components (Windows)

The machine fingerprint is derived from:

- Windows Machine GUID
- Primary disk serial number (hashed)
- CPU identifier (hashed)

The combined fingerprint is stored as a **SHA-256 hash**.

---

### 7.2 Binding Modes (Final)

| Binding Mode | Primary Use Case              |
| ------------ | ----------------------------- |
| None         | Trial license                 |
| Soft         | Annual (subscription) license |
| Strict       | Perpetual (one-time) license  |

---

### 7.3 Binding Mode: **None** (Trial)

### Purpose

- Zero friction evaluation
- Fast demos and onboarding
- No support involvement

### Behavior

- No machine fingerprint check
- License valid on any machine
- Time-limited (e.g., 15–30 days)
- Clock rollback detection **enabled**

### Allowed Actions

- Full clinical workflow (with limitations)
- Data entry, reports, QC, audit

### Restrictions

- Watermark on reports
- Billing optional or capped
- Analyzer & commission modules disabled (recommended)

### End State

- Trial expiry → convert to **Soft** or **Strict** license
- Existing data remains accessible

### Why this is correct

- Trials must be easy
- Anti-piracy is less important than adoption

---

## 7.4. Binding Mode: **Soft** (Annual License)

### Purpose

- Subscription-based customers
- Allows minor hardware/OS changes
- Reduces support friction

### Machine Fingerprint (Soft)

Fingerprint is computed but treated **tolerantly**:

- Windows Machine GUID
- Primary disk serial (hashed)
- CPU ID (hashed)

### Validation Logic

- If fingerprint matches → OK
- If **minor mismatch** (e.g., OS reinstall, disk change):
  - Show warning
  - Continue operation
  - Log audit event
- If **major mismatch**:
  - Enter **warning state**
  - Allow operations for limited grace period
  - Require new license file

### What is considered “minor”

- Windows reinstallation
- Disk replacement
- RAM upgrade

### What is considered “major”

- Completely different PC
- VM cloning
- Frequent fingerprint changes

### Why this is correct

- Annual customers expect flexibility
- You avoid unnecessary support tickets
- Still discourages casual copying

---

## 7.5. Binding Mode: **Strict** (Perpetual License)

### Purpose

- One-time purchase protection
- Strong anti-piracy
- Highest commercial value license

### Machine Fingerprint (Strict)

- Same fingerprint components as Soft
- **Exact match required**

### Validation Logic

- Match → application runs
- Mismatch → application blocked
- Message shown: *“License is bound to a different machine.”*

### Allowed Actions on Mismatch

- View historical reports
- Export data
- No billing
- No report finalization

### License Reissue Policy (Vendor-side)

- Reissue allowed only:
  - On hardware failure proof
  - Once per defined period (e.g., once per year)
- New license invalidates old one

### Why this is correct

- Perpetual licenses must be protected
- Industry-standard behavior
- Prevents license sharing and cloning

---

## 8. Grace Period Interaction (Important)

| ScenarioNoneSoftStrict |            |                 |       |
| ---------------------- | ---------- | --------------- | ----- |
| Near expiry            | N/A        | Warning         | N/A   |
| Expired                | Trial ends | Grace applies   | N/A   |
| Machine mismatch       | N/A        | Warning / grace | Block |

- **Grace period never disables data access**
- Only blocks **commercial actions**

---

## 9. License Validation Flow (Anti‑Piracy)

### Machine Fingerprint Components (Windows)

- Windows Machine GUID
- Primary disk serial (hashed)
- CPU identifier (hashed)

Fingerprint is stored as a **SHA‑256 hash**.

### Binding Modes

| Mode   | Use Case          |
| ------ | ----------------- |
| None   | Trial             |
| Soft   | Annual license    |
| Strict | Perpetual license |

---

## 10. License Validation Flow

### Validation Triggers

- Application startup
- Daily background check
- Access to restricted modules (billing, finalization)

### Validation Steps

1. Verify digital signature
2. Check expiry
3. Validate machine binding
4. Load feature flags

---

## 11. License States & System Behavior

| License State      | System Behavior                       |
| ------------------ | ------------------------------------- |
| Valid              | Full access                           |
| Near Expiry        | Warning banner                        |
| Grace Period       | Warning only                          |
| Expired            | Billing & report finalization blocked |
| Invalid / Tampered | Application blocked                   |

---

## 12. Grace Period Rules

- Grace period: 7–14 days (configurable)
- During grace:
  - Billing allowed
  - Reports allowed
- After grace:
  - New billing blocked
  - Report finalization blocked
  - Viewing/printing old reports allowed

---

## 13. Trial License Behavior

- Time‑limited (e.g., 15–30 days)
- Watermark on reports
- Analyzer & commission modules disabled
- **QC & Audit disabled** (addon module, available only with paid license)

Clock rollback detection is mandatory.

---

## 13.1 QC & Audit Module (Add-On)

**Pricing Model:** Extra cost addon - requires `QC_AUDIT` module flag in license.

### Features Included
- Daily QC entry with Westgard rules
- Levey-Jennings charting
- QC-Result integration (fail blocks finalization)
- Complete audit trail with diff logging
- Audit log viewer with filtering

### Access Control
- Without `QC_AUDIT` module: QC & Audit menu items hidden, pages show "Upgrade Required"
- With `QC_AUDIT` module: Full access to all QC and Audit features

### Value Proposition
- Required for NABL/CAP accreditation compliance
- Complete traceability for regulatory audits
- Quality assurance for accurate results

---

## 14. License Renewal Workflow

```
License nearing expiry
   ↓
Lab contacts vendor
   ↓
Vendor issues new license file
   ↓
Admin uploads license
   ↓
System validates and continues
```

No internet required at any stage.

---

## 15. Admin License Management UI

Admin can:

- View license status
- View enabled modules
- Upload new license file
- View expiry and binding status

Admin **cannot edit** license content.

---

## 16. White‑Label & Reseller Support

### Two‑Tier Licensing

1. Vendor License – controls reseller permissions
2. Lab License – controls end‑user usage

Supports multi‑brand distribution without code changes.

---

## 17. Security Measures

| Threat              | Mitigation         |
| ------------------- | ------------------ |
| File tampering      | Digital signature  |
| Clock rollback      | Last‑run timestamp |
| License sharing     | Machine binding    |
| Reverse engineering | Code obfuscation   |

---

## 18. Audit & Logging

All licensing events are audited:

- License load
- Validation failures
- Expiry transitions
- Module access blocks

Audit logs are immutable.

---

## 19. Failure & Edge Case Handling

| Scenario                        | Handling                            |
| ------------------------------- | ----------------------------------- |
| Power failure during validation | Retry on next startup               |
| OS reinstallation               | Requires new license (strict mode)  |
| Hardware change                 | Warning or block (per binding mode) |

---

## 20. Acceptance Criteria

- Invalid license never enables features
- Expired license does not block historical data
- Tampering is always detected
- Entire system works offline

---

## 21. Final Statement

This Licensing System PRD defines a **commercially secure, offline‑safe, and legally defensible** licensing architecture suitable for selling pathology LIS software at scale.


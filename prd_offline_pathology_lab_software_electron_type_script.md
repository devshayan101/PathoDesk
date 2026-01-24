# PRODUCT REQUIREMENTS DOCUMENT (PRD)
## Offline Pathology Lab Software
### Electron + TypeScript (Windows, White‑Label, Offline‑First)

---

## 1. Executive Summary

**Product Type:** Offline‑first desktop Laboratory Information System (LIS)

**Target Platform:** Windows 10 / 11 (single PC)

**Technology Stack:** Electron + TypeScript + SQLite (encrypted)

**Commercial Model:** Licensed, white‑label software sold to small pathology labs

The product is a fully offline pathology lab software designed for small, single‑location laboratories. It covers end‑to‑end lab operations with a strong focus on **clinical safety, auditability, and simplicity**, while remaining fully functional without internet connectivity. Optional internet connectivity is used only for backups and license distribution, never for core operations.

---

## 2. Product Goals & Principles

1. Must operate 100% offline
2. Must be clinically safe and audit‑ready
3. Must run on a single Windows PC
4. Must be simple for non‑technical lab staff
5. Must be licensable and white‑label ready
6. Must protect patient data and lab IP

---

## 3. Target Users & Roles

| Role | Responsibilities |
|----|----|
| Admin | Configuration, licensing, backups |
| Receptionist | Patient registration, billing |
| Technician | Sample handling, result entry |
| Pathologist | Result verification & sign‑off |
| Auditor (read‑only) | Reports, logs |

---

## 4. Core Functional Modules

- Patient Registration
- Test Order & Billing
- Sample Accession & Barcoding
- **Lab Report Entry (Clinical Core)**
- Report Generation & Printing
- Analyzer Integration (Offline)
- Quality Control (QC)
- Inventory & Reagents
- Audit Trail & Security
- **Licensing & White‑Label Management**
- Optional Cloud Backup

---

## 5. High‑Level Workflow

Patient → Order → Sample → Result Entry → Verification → Final Report → Archive

---

## 6. Lab Report Entry (Detailed Requirements)

### 6.1 Result State Machine (Mandatory)

Draft → Entered → Verified → Finalized → Issued

Rules:
- Finalized results are immutable
- All edits create audit records
- Analyzer results are always Draft initially

### 6.2 Result Entry UI

Single‑screen layout:
- Left: Patient & sample summary
- Center: Parameter entry table
- Right: Previous results, QC alerts, comments

Keyboard‑first operation:
- TAB → next field
- ENTER → save
- F9 → submit for verification

### 6.3 Parameter Types

- Numeric
- Text
- Boolean
- Calculated
- Multi‑value

### 6.4 Reference Ranges

- Age‑based
- Gender‑based
- Method‑based
- Analyzer‑specific (optional)

Automatic abnormal flagging (H/L/Critical).

### 6.5 Critical Values & Delta Checks

- Mandatory acknowledgment
- Mandatory comments
- Permanent audit logging

### 6.6 Verification & Sign‑Off

- Technician enters
- Pathologist finalizes
- Password re‑entry required

---

## 7. Report Generation & Printing

- PDF‑based reports (authoritative)
- A4 printing
- Lab branding
- Digital signature image
- QR code for verification
- Preliminary watermark for non‑final reports

---

## 8. Analyzer Integration (Offline)

- File import: CSV / HL7 / ASTM text
- USB / Serial COM port support
- Imported data marked as Draft
- Raw analyzer files archived

---

## 9. Billing & Finance

- Test catalog & packages
- GST‑ready invoices
- Receipt printing
- Discount approval workflow
- Credit tracking

---

## 10. Quality Control (QC)

- Daily QC entry
- Control ranges
- QC failure alerts
- Reagent lot linkage
- QC reports

---

## 11. Inventory & Reagents

- Stock tracking
- Expiry alerts
- Test‑wise consumption
- Vendor records

---

## 12. Security & Audit

- Local authentication
- Role‑based access control
- Password hashing (bcrypt)
- Encrypted database
- Append‑only audit logs

---

## 13. Backup Strategy

### Local Backup (Default)
- Daily automatic encrypted backup
- Manual export to USB

### Optional Cloud Backup
- Only when internet is available
- Encrypted snapshot upload
- Background task only

---

## 14. Licensing Architecture (Core Commercial Requirement)

### 14.1 Licensing Principles

1. Licensing must work **fully offline**
2. No runtime dependency on vendor servers
3. Vendor must not access customer data
4. License enforcement must be tamper‑resistant

---

### 14.2 License Model

**License Type:** Offline signed license file

**Format:** JSON + digital signature

**Delivery:**
- USB / email / download portal
- Loaded manually into the software

---

### 14.3 License Contents

Each license file contains:

- Lab ID (unique)
- License edition (Trial / Standard / Enterprise)
- Enabled modules (flags)
- Expiry date (optional)
- Max users (soft limit, single PC)
- Branding permissions
- Issue date
- Digital signature

---

### 14.4 License Validation Flow

1. Application loads
2. License file read from local storage
3. Signature verified using embedded public key
4. License flags loaded into memory
5. Features enabled/disabled accordingly

If validation fails:
- Application enters restricted mode

---

### 14.5 License Enforcement Rules

| Condition | Behavior |
|----|----|
| No license | Trial mode |
| Trial expired | Read‑only mode |
| License expired | Read‑only mode |
| Invalid signature | App blocked |

Read‑only mode allows:
- Viewing reports
- Printing historical reports
- No new data entry

---

### 14.6 Trial Mode

- Time‑limited (e.g., 30 days)
- Full functionality
- Countdown warning banners
- No data deletion after expiry

---

### 14.7 White‑Label Controls

Configurable via license + config:
- Software name
- Lab logo
- Report header/footer
- Vendor watermark removal

Deep customization remains vendor‑controlled.

---

### 14.8 License Storage & Security

- Stored locally in encrypted form
- Not modifiable via UI
- License change logged in audit trail

---

### 14.9 Upgrade & Renewal

- New license file replaces old one
- Data remains untouched
- Upgrade does not require reinstall

---

## 15. Software Architecture (Electron + TypeScript)

### 15.1 Logical Architecture

- Renderer Process: React + TypeScript (UI)
- Main Process: Node.js + TypeScript (business logic)
- IPC: Typed, one‑directional
- Database: Encrypted SQLite

### 15.2 Architecture Rules

- Renderer never accesses DB directly
- All writes go through Main process
- Strict typed IPC contracts
- Transactions for all writes

---

## 16. Technology Stack

| Layer | Technology |
|----|----|
| Desktop | Electron |
| Language | TypeScript (strict) |
| UI | React |
| Backend | Node.js |
| DB | Encrypted SQLite |
| Reports | PDF engine |
| Printing | Windows spooler |
| Installer | Electron‑builder |

---

## 17. Performance Requirements

- Patient search < 1s
- Result save < 200ms
- Report open < 3s
- Supports 100k+ patients locally

---

## 18. Failure Handling

| Scenario | Handling |
|----|----|
| Power loss | Auto‑restore drafts |
| DB corruption | Backup restore |
| License expiry | Read‑only mode |
| Invalid result | Block save |

---

## 19. QA Acceptance Criteria

- Fully functional without internet
- No finalized result editable
- License tampering blocked
- Audit logs immutable
- Printer output matches preview

---

## 20. Roadmap

**Phase 1:** Core LIS + Report Entry

**Phase 2:** QC, Inventory, Analyzer Import

**Phase 3:** Licensing, White‑Label, Cloud Backup

---

## 21. Summary

This PRD defines a **clinically safe, offline‑first, commercially licensable pathology lab software** built using Electron and TypeScript. Licensing is designed to be robust, offline‑compatible, and suitable for resale without compromising customer data ownership.


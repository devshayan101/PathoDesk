# Offline Pathology Lab Software - Implementation Plan
## Electron + TypeScript + React + SQLite

---

## Executive Summary

Build a **fully offline, clinically safe, licensed pathology lab software** for Windows desktop. The application follows a single-PC deployment model using Electron with TypeScript, React UI, and encrypted SQLite database.

---

## Technology Stack

| Layer | Technology |
|-------|------------|
| Desktop Framework | Electron + Vite |
| Language | TypeScript (strict mode) |
| Frontend | React 18 + React Router |
| State Management | Zustand |
| Styling | CSS Modules + Custom Design System |
| Database | better-sqlite3 |
| PDF Generation | @react-pdf/renderer |
| Build/Package | Electron Builder |

---

## Phased Implementation

### Phase 1: Project Foundation ✅ COMPLETED
**Duration: ~3-4 hours**

- [x] Initialize Electron + Vite + React + TypeScript project
- [x] Configure TypeScript, project structure
- [x] Create design system (CSS variables, dark theme, components)
- [x] Build layout matching wireframe Application Shell (horizontal nav)
- [x] Create all UI pages matching wireframes:
  - [x] Login page
  - [x] Dashboard with stats and pending tables
  - [x] Patient Registration with form modal
  - [x] Order Creation with test selection and billing
  - [x] Sample Accession with barcode actions
  - [x] Result Entry (3-panel clinical layout with flags)
  - [x] Test Master Configuration with reference ranges
- [x] Implement routing with React Router
- [x] Create Zustand auth store with mock login

---

### Phase 2: Database & Authentication ✅ COMPLETED
**Duration: ~4 hours**

- [x] Set up SQLite database with better-sqlite3
- [x] Create migration system for schema versioning
- [x] Implement complete database schema (users, patients, tests, orders, results, audit)
- [x] User login with bcrypt password verification
- [x] Session management (in-memory)
- [x] IPC handlers for auth, patients, tests, reference ranges
- [x] Type-safe preload API for renderer process
- [x] Reference Range Editor with overlap validation
- [x] Seed data for initial testing (admin user, sample tests)

---

### Phase 3: Patient & Order Management ✅ COMPLETED
**Duration: ~4-5 hours**

- [x] Connect Patient list to database (CRUD operations)
- [x] Patient search functionality
- [x] Order creation with patient selection
- [x] Test selection and pricing calculation
- [x] Order status workflow (Ordered → Sample Collected → Completed)
- [x] Sample accession with barcode generation

---

### Phase 4: Result Entry (Clinical Core) ✅ COMPLETED
**Duration: ~6-8 hours**

- [x] Connect result entry to database
- [x] Parameter grid with real test data
- [x] Reference range lookup by patient age/gender
- [x] Abnormal flagging (H/L/Critical) with database storage
- [x] Delta check implementation
- [x] Critical values trigger with modal alert
- [x] Verification/finalization workflow

---

### Phase 5: Report Generation ✅ COMPLETED
**Duration: ~5-6 hours**

- [x] PDF report template with @react-pdf/renderer
- [x] Report preview modal
- [x] Lab letterhead configuration
- [x] Digital signature placeholder
- [x] Print/Download functionality

---

### Phase 6: Test Pricing & Billing ✅ COMPLETED
**Duration: ~8-10 hours**
*Reference: test_pricing_billing_configuration_prd.md*

#### 6.1 Database Schema
- [x] Create tables: `price_lists`, `test_prices`, `packages`, `package_items`
- [x] Create tables: `invoices`, `invoice_items`, `payments`
- [x] Price snapshot storage on invoice generation
- [x] Seed default price lists (Standard, Corporate) with test prices

#### 6.2 Price List Management (Admin)
- [x] Price List CRUD (Standard, Corporate, Camp, Custom)
- [x] Test Price configuration per price list (base price, discount cap, GST)
- [x] Effective date handling
- [x] Price Lists admin page (/admin/price-lists)

#### 6.3 Billing Workflow
- [x] Invoice creation linked to orders
- [x] Price list selection at billing time (in Order Creation)
- [x] Discount management (%, approval prompt for >threshold)
- [x] GST configuration settings
- [x] Payment tracking (Cash, Card, UPI, Credit/Due)
- [x] Partial payments & outstanding dues per patient

#### 6.4 Invoice Controls
- [x] Auto-generated immutable invoice numbers
- [x] Invoices page (/billing/invoices) with list/detail view
- [x] Payment recording modal
- [x] Invoice finalization workflow
- [x] Audit trail for billing actions

---

### Phase 7: Doctor Referral & Commission Management ✅ COMPLETED
**Duration: ~6-8 hours**
*Reference: doctor_referral_pricing_commission_management_prd.md*

#### 7.1 Core Doctor Referral ✅ COMPLETE
- [x] Create `doctors` table (migration 012)
- [x] Add `referring_doctor_id` to orders table
- [x] Doctor CRUD service & IPC handlers
- [x] Doctors page (Admin menu)
- [x] Doctor dropdown in Order Creation
- [x] Show "Referred By" on reports

#### 7.2 Doctor Pricing ✅ COMPLETE
- [x] Doctor-specific price lists (database schema, doctor.price_list_id)
- [x] Billing integration (auto-select doctor's price list in Order Creation)

#### 7.3 Commission Management ✅ COMPLETE
- [x] Commission calculation per invoice (auto-calculated in invoiceService)
- [x] Monthly statements (Doctors page modal with period selection)
- [x] Settlement tracking (commission_settlements table, service, IPC)
- [x] Payment recording with PDF receipt generation

---

### Phase 8: QC & Audit ✅ COMPLETED (⚡ ADDON FEATURE)
**Duration: ~4-5 hours**
**💰 Pricing: Extra cost addon - requires license with QC_AUDIT module enabled**

#### 8.1 Audit Trail System ✅
- [x] `auditService.ts` with logging & diff functions
- [x] IPC handlers for audit operations
- [x] Audit Log page with filtering & detail view

#### 8.2 Daily QC Entry ✅
- [x] Database migration `016_qc_tables` (qc_parameters, qc_entries, qc_rules)
- [x] `qcService.ts` with Westgard rules implementation
- [x] QC page with daily entry, history view, and setup tabs
- [x] Automatic deviation calculation & status (PASS/WARNING/FAIL)
- [x] Levey-Jennings charting data support

#### 8.3 Navigation & Integration ✅
- [x] Routes added to App.tsx
- [x] Nav links in sidebar (QC for technicians, Audit Log for admin/auditor)
- [x] Hide QC & Audit nav items when module not licensed

#### 8.4 QC-Result Integration (From PRD) ✅
- [x] QC status visible during result entry (show last QC date/status)
- [x] QC fail blocks report finalization
- [x] Pathologist override with reason (logged to audit)
- [ ] QC Reports: daily log, trend chart, failure/override report (deferred)

#### 8.5 Audit Enhancements (From PRD) ✅
- [x] Authentication logging (login, logout, failure events)
- [x] Added REPORT_PREVIEW, REPORT_PRINT, REPORT_REPRINT, QC_OVERRIDE actions
- [x] Reason field mandatory for QC overrides

#### 8.6 License Gating ✅
- [x] QC & Audit module gated by `QC_AUDIT` license flag
- [x] Show "Upgrade Required" message when accessing unlicensed QC/Audit pages
- [x] Hide QC/Audit menu items for unlicensed installations

---

### Phase 9: Licensing System ✅ COMPLETED
**Duration: ~5-6 hours**
*Reference: licensing_system_prd.md*

#### 9.1 License File Format ✅
- [x] Signed JSON structure (lab_name, issued_to, machine_id_hash, edition, modules, expiry)
- [x] RSA-PSS digital signature verification
- [x] Trial/Annual/Perpetual license types

#### 9.2 Machine Binding (Three Modes) ✅
- [x] **None**: Trial licenses (no binding, clock rollback detection)
- [x] **Soft**: Annual licenses (tolerant mismatch, warning + grace)
- [x] **Strict**: Perpetual licenses (exact match required)
- [x] Hardware fingerprint: Windows GUID + Disk Serial + CPU ID (SHA-256)

#### 9.3 License States & UI ✅
- [x] States: Valid, Near Expiry, Grace Period, Expired, Invalid/Tampered
- [x] License status badge in header
- [x] Settings page: view license, upload new, show machine ID
- [x] Grace period: 7-14 days configurable

#### 9.4 Feature Gating ✅
- [x] QC & Audit module gated by `QC_AUDIT` license flag
- [x] Clock rollback detection (last-run timestamp)
- [x] Billing & report finalization blocked when expired (backend integration completed)
- [ ] Trial: watermark on reports, analyzer/commission disabled (deferred)

#### 9.5 Audit & Security ✅
- [x] License events logged (load, validation, expiry, block)
- [ ] Code obfuscation (optional, deployment phase)

#### 9.6 License Generator CLI ✅
- [x] `scripts/generate-license.ts` CLI tool for vendors
- [x] RSA key pair generation (`keygen` command)
- [x] Interactive license creation (`create` command)
- [x] Config file-based license creation (`create --config`)

---

### Phase 10: Polish & Deployment
**Duration: ~4-5 hours**

#### 10.1 Reliability
- [x] Error boundaries for React components
- [x] Draft result recovery (auto-save)
- [x] Power failure resilience

#### 10.2 Data Protection
- [x] Manual backup to file
- [x] Restore from backup (with audit continuity)
- [x] Database integrity checks

#### 10.3 Deployment
- [x] Windows installer (NSIS/Electron Builder)
- [x] Auto-updater (optional)
- [ ] Documentation (user manual, admin guide)


---
## Bugs
- [x] Order tabs: Orders are not showing referring doctor name.
- [x] In order creation: Patients name, Referring doctor's name, and tests should be searchable.
- [x] In dashboard: Revenue should be calculated as (order value - doctor commission).
- [x] In dashboard: Pending amount should be calculated as (order value - paid amount).
- [x] In order creation: When discount is applied for patient with Doctor's referral, the discount amount should be deducted from the doctor's commission.
- [x] Dashboard: Add secret button to hide/show revenue and pending amount.
- [x] Dashboard: Pending amount in yearly report.
- [x] Price List: Add feature to print price list.
- [x] Billing: Invoice PDF should have patho lab details, invoice PDF should not show price list name.
- [x] Apply search in patient list, doctor list, order list, sample list and test list in test master.
- [x] Microscope watermark on center of report pdf.
- [x] software branding [FMS Softwares] with contact details [Email: fmsenterprises001@gmail.com, Whatsapp: +91-7765009936] on report pdf.
- [x] Auto-updater - I push for update and it should update the software.
- [x] Bulk tests - parameters data upload from excel, with columns: Category , Test Name , Parameter , Reference Range, Unit, Price, Sample Type
- [x] test data uploaded from test master: test data should be added to all current price list and new price list created.
- [x] Order creation: a. Tests shown in order creation should be only from price list selected. b. Tests Selection: It should have its own scroll bar.
- [x] Results: Results pdf should have /public/results_bg_image.png as background and below that patahology lab name entered admin/details tab. [These details should be in background with opactity 0.1]
- [x] app icon: Replace old icon with new icons, use icon fiiles /public/icon.svg and /public/icon.png .
- [x] price list: Add option to edit and delete price list.  
- [x] license: Add copyright and EULA license to the software.  
- [x] Installation: During installation user should accept EULA license agreement.
- [x] Redesign login page with logo, redesign nav bar.
- [x] patient page: add new order button in patient page in patient details section with every patient. 
- [x] sample page: after sample collection, Results should be enabled. [Results button should be appear after sample collection.] 
- [x] sample page: Results button: Results button should open results entry page for that sample.
- [x] Redesign nav bar with modern minimalist design.
## Verification Plan
*Reference: qa_acceptance_test_cases_end_to_end_lis.md*

### E2E Clinical Workflow Tests
- TC-E2E-01: Patient → Order → Sample → Result → Report
- TC-E2E-02: Draft result recovery after power failure

### Test Master & Reference Range Tests
- TC-TM-01: Create new test via wizard
- TC-TM-02: Edit test after reports exist (versioning)

### Pricing & Billing Tests
- TC-BILL-01: Standard price list billing
- TC-BILL-02: Doctor referral pricing & commission

### Doctor Commission Tests
- TC-DR-01: Monthly aggregation & export

### QC Module Tests
- TC-QC-01: QC pass allows reporting
- TC-QC-02: QC fail blocks finalization (override requires pathologist + reason)

### Audit Trail Tests
- TC-AUD-01: Result edit audit (old/new values logged)
- TC-AUD-02: Billing audit (cancellation logged with reason)

### Licensing Tests
- TC-LIC-01: Expired license blocks billing
- TC-LIC-02: Grace period warning displayed

### Backup & Restore Tests
- TC-BKP-01: Backup integrity, audit logs preserved

### Security & Role Tests
- TC-SEC-01: Role-based access (technician cannot change prices)

### Negative & Edge Case Tests
- Duplicate sample ID blocked
- Zero billing without remark blocked
- Finalized report edit blocked
- Clock rollback detected in audit

---

**Estimated Total Development Time: 70-85 hours**


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
- [ ] Hide QC & Audit nav items when module not licensed

#### 8.4 QC-Result Integration (From PRD) ✅
- [x] QC status visible during result entry (show last QC date/status)
- [x] QC fail blocks report finalization
- [x] Pathologist override with reason (logged to audit)
- [ ] QC Reports: daily log, trend chart, failure/override report (deferred)

#### 8.5 Audit Enhancements (From PRD) ✅
- [x] Authentication logging (login, logout, failure events)
- [x] Added REPORT_PREVIEW, REPORT_PRINT, REPORT_REPRINT, QC_OVERRIDE actions
- [x] Reason field mandatory for QC overrides

#### 8.6 License Gating (NEW)
- [ ] QC & Audit module gated by `QC_AUDIT` license flag
- [ ] Show "Upgrade Required" message when accessing unlicensed QC/Audit pages
- [ ] Hide QC/Audit menu items for unlicensed installations

---

### Phase 9: Licensing System
**Duration: ~5-6 hours**
*Reference: licensing_system_prd.md*

#### 9.1 License File Format
- [ ] Signed JSON structure (lab_name, issued_to, machine_id_hash, edition, modules, expiry)
- [ ] RSA-PSS digital signature verification
- [ ] Trial/Annual/Perpetual license types

#### 9.2 Machine Binding (Three Modes)
- [ ] **None**: Trial licenses (no binding, clock rollback detection)
- [ ] **Soft**: Annual licenses (tolerant mismatch, warning + grace)
- [ ] **Strict**: Perpetual licenses (exact match required)
- [ ] Hardware fingerprint: Windows GUID + Disk Serial + CPU ID (SHA-256)

#### 9.3 License States & UI
- [ ] States: Valid, Near Expiry, Grace Period, Expired, Invalid/Tampered
- [ ] License status badge in header
- [ ] Settings page: view license, upload new, show machine ID
- [ ] Grace period: 7-14 days configurable

#### 9.4 Feature Gating
- [ ] Billing & report finalization blocked when expired (read-only access)
- [ ] Trial: watermark on reports, analyzer/commission disabled
- [ ] **QC & Audit: ADDON module** (gated by `QC_AUDIT` license flag)
- [ ] Clock rollback detection (last-run timestamp)

#### 9.5 Audit & Security
- [ ] License events logged (load, validation, expiry, block)
- [ ] Code obfuscation (optional, deployment phase)

---

### Phase 10: Polish & Deployment
**Duration: ~4-5 hours**

#### 10.1 Reliability
- [ ] Error boundaries for React components
- [ ] Draft result recovery (auto-save)
- [ ] Power failure resilience

#### 10.2 Data Protection
- [ ] Manual backup to file
- [ ] Restore from backup (with audit continuity)
- [ ] Database integrity checks

#### 10.3 Deployment
- [ ] Windows installer (NSIS/Electron Builder)
- [ ] Auto-updater (optional)
- [ ] Documentation (user manual, admin guide)

---

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


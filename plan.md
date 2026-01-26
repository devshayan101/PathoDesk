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

### Phase 4: Result Entry (Clinical Core) ⏳ NEXT
**Duration: ~6-8 hours**

- [ ] Connect result entry to database
- [ ] Parameter grid with real test data
- [ ] Reference range lookup by patient age/gender
- [ ] Abnormal flagging (H/L/Critical) with database storage
- [ ] Delta check implementation
- [ ] Verification/finalization workflow

---

### Phase 5: Report Generation
**Duration: ~5-6 hours**

- [ ] PDF report template with @react-pdf/renderer
- [ ] Report preview modal
- [ ] Lab letterhead configuration
- [ ] Digital signature placeholder
- [ ] Print functionality

---

### Phase 6: Test Pricing & Billing
**Duration: ~8-10 hours**
*Reference: test_pricing_billing_configuration_prd.md*

#### 6.1 Database Schema
- [ ] Create tables: `price_lists`, `test_prices`, `packages`, `package_items`
- [ ] Create tables: `invoices`, `invoice_items`, `payments`
- [ ] Price snapshot storage on invoice generation

#### 6.2 Price List Management (Admin)
- [ ] Price List CRUD (Standard, Corporate, Camp, Custom)
- [ ] Test Price configuration per price list (base price, discount cap, GST)
- [ ] Effective date handling (no overlap)
- [ ] Package/Profile pricing (bundled price overrides individual)

#### 6.3 Billing Workflow
- [ ] Invoice creation linked to orders
- [ ] Price list selection at billing time
- [ ] Discount management (%, flat, approval for > threshold)
- [ ] GST configuration (Inclusive/Exclusive mode)
- [ ] Payment tracking (Cash, Card, UPI, Credit/Due)
- [ ] Partial payments & outstanding dues per patient

#### 6.4 Invoice Controls
- [ ] Auto-generated immutable invoice numbers
- [ ] Invoice print (PDF)
- [ ] Invoice deletion (admin + reason)
- [ ] Audit trail for all billing actions

---

### Phase 7: Doctor Referral & Commission Management
**Duration: ~6-8 hours**
*Reference: doctor_referral_pricing_commission_management_prd.md*

#### 7.1 Database Schema
- [ ] Create tables: `doctors`, `doctor_price_lists`, `doctor_test_prices`
- [ ] Create tables: `doctor_commissions`, `commission_settlements`

#### 7.2 Doctor Master
- [ ] Doctor CRUD (name, specialty, contact, commission model)
- [ ] Link doctor to price list (doctor-specific or shared)
- [ ] Default commission rate (% or flat)

#### 7.3 Doctor Pricing at Billing
- [ ] Select referring doctor on patient/order
- [ ] Auto-select doctor's price list
- [ ] Calculate commission per invoice item (stored immutably)
- [ ] Lab margin calculation (hidden from doctor)

#### 7.4 Commission Reporting
- [ ] Monthly commission aggregation per doctor
- [ ] Generate Doctor Commission Statement (PDF/Excel)
- [ ] Settlement tracking (Paid/Partially Paid/Outstanding)
- [ ] Manual override with reason (admin-only)

---

### Phase 8: QC & Audit
**Duration: ~4-5 hours**

- [ ] Daily QC entry screens
- [ ] Audit trail logging (all edits)
- [ ] Audit report generation

---

### Phase 9: Licensing System
**Duration: ~4-5 hours**

- [ ] License file format (JSON + signature)
- [ ] RSA/ECDSA signature verification
- [ ] Machine binding (hardware ID)
- [ ] License status display
- [ ] Grace period handling
- [ ] Billing module gating by license state

---

### Phase 10: Polish & Deployment
**Duration: ~4-5 hours**

- [ ] Error boundaries
- [ ] Crash recovery
- [ ] Windows installer (NSIS/Electron Builder)
- [ ] Documentation

---

## Verification Plan

### Manual Testing
1. Authentication flow with role-based access
2. Patient & Order workflow
3. Result Entry with validation
4. Report generation & printing
5. Billing with price lists and discounts
6. Doctor commission calculation and statements
7. License validation (Trial/Valid/Expired modes)

---

**Estimated Total Development Time: 60-75 hours**


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
### Feature Requests:

- [ ] Qr code on report pdf
- [ ] Cloud backup.
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
- [x] report print button in report view.
- [x] club screens [QC, AUDIT, BACKUP, LICENSE, SETTINGS] under single menu item / nav item, use dropdown menu.
- [x] admin > settings > user management: 1. add option to edit and delete user details. 2. add a field to add user Qualification . 3. add a filed to add user signature. 4. by default add a lab technician and pathologist with their signatures.
- [x] Results > Report pdf: Report pdf should contain both lab technician and pathologist signatures. When pathologist user login it should be able to use lab technician signature as well as pathologist signature. When lab technician user login it should be able to use only lab technician signature. In case of multiple lab technician users available, pathologist user should be able to select lab technician signature from dropdown menu.
- [X] Invoice > Record payment > Payment mode: Remove credit/ due option.
- [x] Remove doctor code field from add doctor button, add doctor code from backend automatically.
- [x] Remove edit from admin user in user management. [Admin user should not be editable]
- [x] Report pdf is not showing logo watermark. Logo address /public/icon.png.
- [ ] add tests
- [x] Report pdf is showing lab technician with adminstrator user, do not use admin user for signature, use lab technician user details. [Use only lab technician and pathologist user for signature]
- [x] Report pdf: Report Status should be placed between lab technician and pathologist signature.
- [x] admin > settings > user management: deleting user giver confirm dialouge box, use confirm-toast instead.
- [x] Tests > Test Master > Tests : When adding new tests from excel sheet, it skips adding some tests independently without any confirmation msg. 
- [x] Tests > Test Master > Tests : Feature to select and delete multiple tests.
- [x] Orders Screen > New Order button > Create new order modal > 'Select Patient' and 'Reffering Doctor' here add option to add new patient and new doctor (add new patient and new doctor modal should open)
- [x] test master: import tests from excel: add another column for test code.
- [x] Price list: It shows tests added from test master, but it also shows deleted tests.
- [x] Report pdf: Remove time, keep date.
- [x] Report pdf: When there are more number of parameters, at footer parameters and footer (lab technician and pathologist signatures and footer contents) overlap each other. also when page 2 is added it is missing watermark and pathology lab name.
- [x] Removed time from dates — formatDate() now only shows dd-MMM-yyyy (e.g. "03 Mar 2026") without hours/minutes. - [add setting to enable/disable time]
- [x] Fixed footer overlap — The footer (signatures + disclaimer) was using position: absolute which pinned it to the bottom of page 1 regardless of content length. Now it uses normal document flow with marginTop: auto to fill remaining space, and wrap={false} ensures the entire signature block stays together and pushes to the next page if needed. [footer should be at bottom of every page, content should not overlap footer. When there is more content that can fit in single page, content should not overlap footer, and extra content should be pushed to next page.]
- [x] Add another theme / format for report pdf. [use attached image for theme. Add option to select theme in admin > settings > report format]
- [x] this is attachment is for widal test with its parameters, format is different than other tests. In result it takes + or -. [use this format for widal test] 
- [x] Make screen responsive for tablets and mobile devices. [Use responsive design for tablets and mobile devices.] [Use tailwind css for responsive design.] [Bug: For lesser resolution screens part of nav-bar is not visible.]
- [x] Nav bar: 1. admin dropdown not working. 2. add [Tests, Pricing] to admin dropdown. 3. [User id + Name display + logout icon ] - change this layout to take minimum space.[Use pop-up display for user id + Name display + logout icon]
- [x] Dashboard: dashboard screen is displaying wrong data.
- [x] Test Master: Parameters: 1. Add option to arrange order of parameters [move up down a parameter] 2. Add option to add sub parameters inside parameter. 
- [x] Instead of /public/icon.png, use /icon.png.
- [x] dashboard: pending samples and pending results shows old data.
- [x] Test Master : Test Edit / Creation Wizard: 1. Add option to add sub parameters inside parameter. 2. Review screen: Publish button is not visible. 3. Add tests from attachments; In CBC Differential Leucocyte Count (DLC) has sub parameters [Neutrophils, Lymphocytes, Monocytes, Eosinophils, Basophils].
- [x] Test Master: Add option to group parameters under a parameter marked 'Is Header'.
- [x] Test Master : Add option to resize size of columns [Tests, Parameters, Reference Ranges].
- [x] Test Master: 1. Reference range panel is not resizeable. 2. Redesign UI of [Tests, Parameters, Reference Ranges panels.] with modern minimalist design, use screen space accordingly - Tests - 30%, Parameters - 30%, Reference Ranges - 30%.
- [x] Orders: Price of tests are set, but in new order modal it shows 0 price. Orders screen shows orders of different price from that which was set. Billing screen shows 0 amount.
- [x] Report pdf: Grouped prameters under 'Is Header' marked parameter should be displayed under its header parameter with indentation.
- [ ] Test Master: Critical value input option not available.
- [x] Sample: view barcode option.
- [x] orders : In a order there can be multiple tests, report entry should be such that user flow is smooth. These report entry should be such that user can enter results for all tests in a order in one go. All test reports should clubed together in a single report / pdf. - desgin this system.
- [x] patients : add patient's order history.
- [x] Combined results entry: When submits tests, screen moves back to test 1. 
- [x] Combined results entry: 'View combined Report' button gives error.[Cannot read properties of undefined (reading 'getAll')]
- [x] orders: order list: 'view' button is not working.
- [x] Test Master: 1. Add support to import tests from excel sheet as well as csv sheet. 2. Add option to export tests. 3. In Import tests, add column for 'Is Header' if yes then it should be checked.
- [x] Combined results entry: 1.'View Combined Report' button is giving msg: No finalized reports found for this order. even when report is verified.
- [x] combinedreportpreview: reportDataList is always empty.
- [x] Test Master: 'Is Header' checkbox not working in Test Edit / Creation Wizard.
- [x] Test Master: 1. Test Import: In 'isHeader' column if yes or true value then parameter is header, else it is normal parameter. 'isHeader' takes header values to group parameters under it. If a parameter's 'isHeader' column has a parameter value and that parameter is marked as header, then the parameter is grouped under that parameter (header parameter). - last implementation is not working
- [x] test master: import / export tests: add support for critical values, also in import test preview.
- [x] test master: import test: unable to import tests with all parameters.
- [x] test master: import test preview: not showing column for critical values and isHeader.
- [x] test master: add button to refresh / reload screen. 
- [x] test master: import test: add 'parameter code' column support, also add support in test import preview.
- [x] test master: import test: 1. only single parameter is imported from parameter list. 2. interchange import and export button icons.
- [x] test master: test edit wizard: Parameters: Import groups: parameters grouped under a header parameter, should display it by selecting header parameter from select dropdown of header parameters (Group Under).
- [x] test master: test edit / creation wizard: Report Layout: Interpretation Template not working. [Text entered in 'interpretation template' is not displayed in report.]
- [x] Results Entry: View Combined Report button not working. [Cannot read properties of null (reading 'show_time_in_report')]
- [x] Results: Report pdf: Green Theme: Implement 'flag' based value reporting as in blue theme.
- [x] Results Entry: Parameters grouped under a header parameter should be displayed under its header parameter with indentation.
- [x] Results Entry: View Combined Report button not working. [Failed to set an indexed property [0] on 'CSSStyleDeclaration': Indexed property setter is not supported.] 
- [x] test master: test edit / creation wizard: Report Layout: Interpretation Template not working. [Text entered in 'interpretation template' is not displayed in report.]
- [x] Auto Updater: How to setup Github Personal Access token, where to enter token.
- [x] Auto Backup: Create a simple soultion to store lab data in cloud. Create md file for the design. Design should consider simplicity and cost effctiveness [implement solution with no or minimal cost]. Create 3 iterations of design and compare them and choose best one with performace, robustness, cost and ease of implementation.
- [x] native build app:admin > tests: Tests screen giving error - window.electronAPI.tests.getCriticalValues is not a function.
- [x] native build app:admin > pricing:  1. price-list shows deleted tests. When delete a test, it should be deleted from all price-lists. 2. Deleted price-list shown as inactive, instead deleted price-list should be removed completely. 
- [x] pricelist: old data in pricelist data is present, remove previously deleted price-list which appears in price-list screen named [FAIZAN, ASD].
- [x] test master: redesign test master screen [tests, parameters, reference ranges panels]
- [x] Installation: This file does not have a valid digital signature that verifies its publisher.
- [x] Results: Card is not showing date.
- [x] Report pdf: Sample recieved date is set as 01-Jan-1970.
- [x] Show software version in app.
- [x] Tests saved manually 'test master' is not appearing during test entry in order creation.[Still not resolved]
- [x] Result pdf: Sample collection data is shown as 14-Mar-2026, 07:05 am while right time should be 14-Mar-2026, 12:35 pm. - note: time is given for better understanding of problem cause. This is a general problem not specific to this case[Incorrect collection date-time display].

- [x] Test master: Test parameter when input is selected as "calculated", formula entered is not saved. When entering results for such test, it should calculate result based on formula and result should be displayed or appear in result input field automatically. Also make appropriate changes for import and export of tests. 

- [x] Orders screen: 'Enter Results' button should be replaced with 'Mark Sample Received' button. [If there are samples to be Received, then show 'Mark Sample Received' button, else show 'Enter Results' button. Use pop-up modal window to mark samples to be Received.] [As button in 'Samples' screen, to mark samples recieved at lab. 'Mark Sample Received' is extension of 'mark recieved' button in 'Samples' screen. When one is clicked other is also checked [in orders screen and samples screen]]

- [x] new orders: when placing new order, tests price is zero, even when price is set in pricing section.

- [x] Billing / Invioces : Print Invoice button not working, it prints blank page. [Print Invoice button is present in Invoice screen and in invoice view modal window.]

- [x] Orders > Results > View Combined Report : Space left page in test-1 report should be utilised by test-2 report, simlarly any space left in any page should be utilised by next report.

- [x] Patients - Doctors: Prefix Should be added to doctor name [Dr.] automatically. Prefix for patient's name [Mr., Mrs., Miss, Ms., Master, Sir], in add patient screen and modal window to add patient's name in orders screen. [When Mr. / Master / Sir is selected, patient's gender is automatically set to Male. When Mrs. / Miss / Ms. is selected, patient's gender is automatically set to Female.]

- [x] Some input fiels do not have border, resulting in difficulty in distinguishing them. [This issue is present in multiple screens [add new doctor modal window, add new patient modal window, quick add new patient modal window.] ] 

- [x] test master: import and export tests icons are reversed [import icon is on export button and export icon is on import button].

- [x] Add support for 'Interpretation template', 'parameter code' of tests in import and export tests.

- [x] Hide empty parameter in report pdf. [If a parameter is not having any value, it should not be displayed in report pdf.]

- [x] test master: I have deleted some tests, but when i try to import tests, it shows all tests are already present [even deleted tests], skipping import of already present tests. [This issue is present in import tests wizard.]

- [x] test master > import test: [new feature] When importing tests, if a test is already present, it is not imported, but if there are some changes in the test, it should be updated.

- [x] test master > import test: during import of tests, is giving warning tost error and not importing.

- [x] test master > Result Entry and Report pdf: Range is only displaying numbers it should also show text.

- [x] result entry: 'verify results' button when clicked, screen focus moves to test 1. Screen focus should move to next test which is not verified.

- [x] Result Entry > View Combined Report: If an order has many large tests, app hangs if clicked. 

- [x] Report pdf: Multiple tests in single report pdf are not properly formatted. [Test heading and parameters are split in two pages. Test and some parameters should be displayed one page and remaining parameters are on next page. ]

- [ ] auto-backup: Cloud. Use md file.
- [ ] anlyser integration.
- [ ] ai integration.
- [ ] daily work report generation.

- [x] report pdf > view combined report: mark end of report by ---end of report---- at end of last report pdf only.
- [x] report pdf: add 1.5rem padding to top of both report styles. 
- [x] widal test : 'ah' and 'bh' results input not appering in report pdf.
- [x] Report pdf > Blue theme: Redesign top section of blue theme report, make it professional, clean, minimalist, space saving, add logo. Make similar change in combinedlabreport file to mentain consistency.
- [ ] Report pdf > Blue theme: Redesign test parameter result section of blue theme report, make it professional, clean, minimalist, space saving. Make similar change in combinedlabreport file to mentain consistency.

- [ ] Report pdf > Blue theme: Remove minimalist design approach. Add some colors. Make report more lively. Make similar change in combinedlabreport file to mentain consistency.

- [ ] Report pdf > Blue theme: In test report parameters spills to footer[test report parameters and footer overlaps], in some case.

- [ ] Report pdf > Blue theme: Redesign report pdf. Make similar change in combinedlabreport file to mentain consistency.
-----
- [ ] Result entry: all numeric values should only have single decimal point [e.g. 12.20 not 12..20 such mistak should not be allowed, format should be xxxx.xx or xxxx.x or xxxx ] - implement this later.

- [x] Report pdf : In Comined report pdf, if after first report space for atleast 10 lines is available [excluding footer space or before footer space.], then print next report in same page. Else print next report in next page. [Do this for both blue and green theme reports]

- [x] Report pdf: Remove lines under test parameters.[Do this for both blue and green theme reports, and both combined and single report pdfs]


- [x] Report pdf: report header: Pathology lab name should split in two lines if it is too long. add 24/7 Emergency service logo from public folder [public/24_7.png] to header.

- [x] admin >settings > lab settings: add option to Lab Incharge name.[Display only name[lab incharge's name only, do not display lab incharge label in header] in report pdf.]

-[x] Report pdf: blue theme: shift 24_7 logo and lab details to right side of header [3rem].
-[x] Report pdf : In Comined report pdf, if after first report space for atleast 25 lines is available [excluding footer space or before footer space.], then print next report in same page. Else print next report in next page. [Do this for both blue and green theme reports]
- [x] report pdf > blue theme > header > left side: lab logo and lab name, center: 24_7 logo, right side: lab details with lab incharge name.
- [x]  admin >settings > lab settings > lab name: lab name should have two lines input field. [Lab name is split into two lines in report pdf.]

- [x] Report pdf > green theme > combined report pdf : second test report on page is split in two pages [test header is on first page and parameters are on second page]

- [x] Result entry: When test parameter range has value either positive or negative, in input field pressing 'n' key should populate field with 'negative', similarly pressing 'p' key should populate field with 'positive'.

- [ ] 

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


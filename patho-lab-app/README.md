# PathoDesk

## 1. Project Title & Description
**PathoDesk** is a fully offline, clinically safe, and licensed pathology lab data management system designed for Windows desktop environments. It provides a comprehensive solution for independent pathology labs, small to medium diagnostic centers, and clinics to manage their complete workflow—from patient registration and sample accessioning to result entry, billing, and report generation.

**The Problem It Solves:** 
Many pathology labs rely on outdated, fragmented, or cloud-dependent software that is vulnerable to internet outages and recurring high SaaS costs. PathoDesk addresses these pain points by offering a powerful, offline-first desktop application with an intuitive modern interface, ensuring that lab operations remain uninterrupted, data is kept strictly secure on-premises, and complex tasks like doctor commissions and quality control are automated.

---

## 2. Features
### 🏥 Core Lab Operations
*   **Patient & Order Management:** Add patients, capture vitals, and create orders with specific test selections.
*   **Result Entry (Clinical Core):** 3-panel clinical layout with reference range lookups (by age/gender) and abnormal flagging (High/Low/Critical).
*   **Sample Accessioning:** Track sample collection and generate barcodes.
*   **PDF Report Generation:** Customizable, professional PDF reports (Blue/Green themes) with digital signature placeholders and integrated letterheads.

### 💰 Billing & Pricing
*   **Price List Management:** Maintain multiple price lists (Standard, Corporate, Camp, Custom).
*   **Invoicing & Payments:** Generate invoices, manage partial payments, handle discounts, and track outstanding dues.
*   **Doctor Commissions:** Automated tracking of referral commissions, price configurations per doctor, and monthly settlement statements.

### ⚙️ Admin & Quality Control (QC)
*   **Test Master Configuration:** Complete control over test parameters, calculated fields, sub-parameters, and report groupings. Excel/CSV import and export.
*   **QC & Audit Module (Addon):** DailyQC entries with Levey-Jennings charting and Westgard rules. Comprehensive audit logging of system changes.
*   **Role-Based Access Control:** Differentiate access between Admins, Technicians, and Pathologists.

### 🧠 AI & Advanced Capabilities
*   **AI Report Analysis:** Automated AI insights securely generated over lab reports to highlight critical findings for pathologists.
*   **Hardware-bound Licensing:** Strict license control preventing unauthorized copying or clock manipulation.

---

## 3. System Architecture
PathoDesk follows a single-PC offline deployment model built on **Electron**.
*   **Frontend (Renderer):** Built with React 18 and Vite. It serves a responsive single-page application (SPA) running safely within the Chromium engine.
*   **Backend (Main Process):** A Node.js environment managing file system operations, window management, and hardware license validation.
*   **Database layer:** An embedded SQLite database (`better-sqlite3`) executing fully synchronously for high reliability.
*   **IPC Bridge:** Communication between the Renderer UI and the Node Main process uses Electron's Inter-Process Communication (IPC) via ContextBridge for strong isolation and security.

---

## 4. Tech Stack

*   **Desktop App Framework:** Electron + Vite
*   **Language:** TypeScript (Strict Mode)
*   **Frontend:** React 18, React Router DOM v7
*   **State Management:** Zustand
*   **Styling & UI:** CSS Modules, Tailwind CSS, Lucide React (Icons)
*   **Database:** SQLite (`better-sqlite3`)
*   **Document Generation:** `@react-pdf/renderer`
*   **Security & Encryption:** `bcryptjs` for passwords, RSA-PSS for license validation
*   **DevOps / Packaging:** Electron Builder

---

## 5. Installation & Setup

### Prerequisites
*   Node.js (v18 or v20 recommended)
*   npm or yarn
*   Windows OS (Target deployment environment)

### Local Development Setup

1. **Clone the repository:**
   ```bash
   git clone <repository_url>
   cd patho-lab
   ```

2. **Install dependencies:**
   ```bash
   cd patho-lab-app
   npm install
   ```
   *(Note: This uses `electron-builder install-app-deps` automatically to rebuild native SQLite modules for Electron).*

3. **Start the development server:**
   ```bash
   npm run dev
   ```

4. **Package for Production (Windows `.exe`):**
   ```bash
   npm run build
   ```
   The installer will be generated in the `dist` or `release` folder.

---

## 6. Usage

### Key Workflows
1. **Patient Registration & Billing:** The Front-desk user logs in, registers a new patient, selects requested tests from the active Price List, selects a Referring Doctor, and generates an invoice. 
2. **Sample Accession:** The Phlebotomist marks the sample as "Received".
3. **Result Entry:** The Lab Technician inputs test values. The system automatically calculates formulas, checks values against Age/Gender-specific Reference Ranges, and flags Abnormal/Critical values.
4. **Report Generation & Verification:** The Pathologist reviews the flagged results. Once verified, the software generates a PDF report, appending the digital signatures of the technician and pathologist.
5. **Admin Operations:** At the end of the month, the Admin generates Doctor Commission statements and exports them to PDF.

---

## 7. Configuration

PathoDesk provides extensive in-app configuration via the **Settings / Admin panel:**
*   **Test Master:** Add tests, assign parameter codes manually, configure calculated formulas, edit references ranges, and nest parameters.
*   **Lab Details:** Set Lab Name, In-charge Name, Contact Info, and select PDF Theme formats (Blue/Green).
*   **User Management:** Add Lab Technicians and Pathologists and upload their digital signatures.
*   **Pricing:** Configure GST margins, bulk discounts, and map customized Price Lists to individual doctors.

---

## 8. Database Design (High-Level)

The system relies on a unified embedded SQLite database. Key entities include:
*   `users`: Authentication and role definitions.
*   `patients`: Core patient demographics.
*   `orders` & `order_items`: Visit details, linked tests, and referred doctor references.
*   `results`: Key-value entries for specific test parameters, linked to orders.
*   `test_master`, `parameters`, `reference_ranges`: Complex nested hierarchy defining what makes up a physical test.
*   `price_lists`, `test_prices`: Time-based tracking of service costs.
*   `invoices`, `payments`: Financial tracking and balance dues.
*   `doctors`, `commission_settlements`: Tracking referring entities and their payouts.
*   `audit_logs`: Immutable ledger tracking sensitive system changes (Results edits, overrides).

---

## 9. API Documentation (Overview)

As an offline Electron app, PathoDesk relies on IPC handlers rather than traditional HTTP APIs. The API surface is exposed to the frontend via `window.electronAPI`:
*   `auth.*`: Handles `login()`, `logout()`, `getCurrentUser()`.
*   `patients.*` / `orders.*`: standard CRUD wrappers to SQLite statements.
*   `results.*`: `saveDraft()`, `finalize()`, `verifyQC()`.
*   `license.*`: `validateHardware()`, `uploadLicenseKey()`.

*(Any external REST API integrations are limited strictly to LLM calls for the AI feature module and Cloud backup pushes).*

---

## 10. AI Analysis (Beta/Module)

The AI Analysis module is an **assistive technology** designed to provide supplementary insights and interpretation templates. 

*   **Functionality:** Pathologists can click "AI Analysis" on complex multi-test orders to get an automated interpretation of combined patterns, highlighting hidden correlations. 
*   **Regulatory Status:** This feature is currently categorized as a Clinical Decision Support (CDS) tool. It is **NOT** intended for primary diagnosis or as a substitute for professional clinical judgment. Clinical validation and appropriate regulatory clearance (e.g., FDA/CE-IVD) are required prior to clinical deployment in specific jurisdictions.
*   **Professional Liability:** The final interpretation and verification of all reports remain the sole responsibility of the pathologist and the laboratory medical director.
*   **Privacy Controls:** 
    *   **Mandatory Anonymization:** All patient identifiers (Name, DOB, Phone, UID) are stripped server-side before processing by any AI engine.
    *   **Explicit Opt-in:** AI features are disabled by default and require a BAA (Business Associate Agreement) flag to be enabled in Lab Settings.
    *   **Offline Capability:** We prioritize on-premise execution of AI models where hardware permits to maintain strict data sovereignty.

---

## 11. Data Protection & Security

The application prioritizes the security and integrity of health records:
*   **Local-First Storage:** All patient records and results are stored on the local premises. We do not transmit PHI (Protected Health Information) to any external cloud service without explicit user configuration.
*   **Authentication:** Local user sessions protected via `bcryptjs` hashed passwords.
*   **Access Control:** Role-based access (Technician, Pathologist, Auditor) ensures that only authorized personnel can enter or verify results. ipc gating (e.g., standard technicians cannot alter `test_prices`).
*   **Audit Logging:** Every modification to patient data, results, or critical system settings (including clock changes or license uploads) is recorded in a tamper-resistant local audit log.
*   **Compliance Controls:** The system is designed to facilitate GDPR and HIPAA compliance by providing data encryption-at-rest (for critical credentials), comprehensive audit trails, and data backup/disaster recovery procedures.

---

## 12. Deployment

PathoDesk is deployed directly to end-user Windows machines as a standard Desktop application. 
*   **Production Setup:** Use the NSIS-based `.exe` installer. It handles the extraction, shortcuts, and initial SQLite scaffolding automatically.
*   **Updates:** Supports transparent over-the-air updates using `electron-updater` (if update server configurations are set).
*   **Backups:** Local filesystem backups and manual dump options are provided, alongside optional cloud data storage integrations.

---

## 13. Licensing & Subscription Model

The application utilizes a proprietary **Hardware-bound Licensing System**. 
Licenses are RSA-PSS signed JSON tokens issued by the vendor.
*   **Trial Edition:** Time-bound, full evaluation for 30 days. Detects clock rollbacks.
*   **Clock-Rollback Mitigations:** To prevent accidental lockouts, the system includes a ±5-minute drift tolerance and provides clear warnings to the user if a clock disparity is detected. In case of hardware-related clock failure, lab administrators can contact support for an emergency bypass key (requires administrative audit).
*   **Grace Period:** A 3-day grace period is provided after expiry to allow for report printing and data export.
*   **Annual Subscription:** Soft-bound to the machine's GUID, Disk Serial, and CPU ID. Permits minor hardware changes via a tolerance system.
*   **Perpetual License:** Strict hardware-binding. Allows lifetime use for a single specific PC.
*   **Add-on Modules:** Features like `QC_AUDIT` and the `AI Sandbox` are selectively unlocked based on the license token's entitlements.

---

## 14. Roadmap

*   **Phase Next:** Integration with auto-analyzers (LIS interfacing via TCP/IP or RS232 protocols) to eliminate manual result entry.
*   **Phase Next:** Automated Daily Work Report Generation for accounting reconciliation.
*   **Future:** Companion mobile app for patients to download their reports using QR codes.

---

## 15. Contribution Guidelines

As a proprietary product of **FMS Software Solutions**, public contributions are not currently accepted.
For internal developers:
1. Ensure all new UI components utilize the existing scoped CSS modules.
2. Every database schema change MUST be accompanied by a sequential migration script to ensure existing clients don't break during an update.
3. Test IPC handlers thoroughly, as renderer exceptions cannot easily crash the protected main thread.

---

## 16. Support

For software enterprise support, bug reporting, licensing queries or feature requests:
*   **Email:** `fmsenterprises001@gmail.com`
*   **WhatsApp / Contact:** `+91-7765009936`
*   **Vendor:** FMS Software Solutions

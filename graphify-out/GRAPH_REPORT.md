# Graph Report - .  (2026-04-14)

## Corpus Check
- Large corpus: 364 files · ~9,080,002 words. Semantic extraction will be expensive (many Claude tokens). Consider running on a subfolder, or use --no-semantic to run AST-only.

## Summary
- 662 nodes · 1633 edges · 90 communities detected
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 3 edges (avg confidence: 0.87)
- Token cost: 1,500 input · 500 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Test Management Service|Test Management Service]]
- [[_COMMUNITY_Test Master UI|Test Master UI]]
- [[_COMMUNITY_Licensing & Machine Binding|Licensing & Machine Binding]]
- [[_COMMUNITY_Result Entry Logic|Result Entry Logic]]
- [[_COMMUNITY_Billing & Price Lists|Billing & Price Lists]]
- [[_COMMUNITY_Admin & Lab Settings|Admin & Lab Settings]]
- [[_COMMUNITY_Order Management UI|Order Management UI]]
- [[_COMMUNITY_Quality Control (QC)|Quality Control (QC)]]
- [[_COMMUNITY_SQLite Database Core|SQLite Database Core]]
- [[_COMMUNITY_Invoicing Service|Invoicing Service]]
- [[_COMMUNITY_Patient Management UI|Patient Management UI]]
- [[_COMMUNITY_Backup & Cloud Storage|Backup & Cloud Storage]]
- [[_COMMUNITY_Doctor Commission Service|Doctor Commission Service]]
- [[_COMMUNITY_Doctor Referral UI|Doctor Referral UI]]
- [[_COMMUNITY_Price List Configuration|Price List Configuration]]
- [[_COMMUNITY_Audit Trail Service|Audit Trail Service]]
- [[_COMMUNITY_Results Processing|Results Processing]]
- [[_COMMUNITY_Sample Accessioning|Sample Accessioning]]
- [[_COMMUNITY_User & Role Management|User & Role Management]]
- [[_COMMUNITY_License Generation Tool|License Generation Tool]]
- [[_COMMUNITY_Doctor Entity Service|Doctor Entity Service]]
- [[_COMMUNITY_Order Processing Service|Order Processing Service]]
- [[_COMMUNITY_Report Generation Service|Report Generation Service]]
- [[_COMMUNITY_Patient Data Service|Patient Data Service]]
- [[_COMMUNITY_Payment Collections|Payment Collections]]
- [[_COMMUNITY_License Activation UI|License Activation UI]]
- [[_COMMUNITY_QC Management UI|QC Management UI]]
- [[_COMMUNITY_Clinical Workflow Model|Clinical Workflow Model]]
- [[_COMMUNITY_Dashboard Statistics|Dashboard Statistics]]
- [[_COMMUNITY_Licensing Model|Licensing Model]]
- [[_COMMUNITY_AI Analysis Service|AI Analysis Service]]
- [[_COMMUNITY_Authentication Service|Authentication Service]]
- [[_COMMUNITY_Report PDF Components|Report PDF Components]]
- [[_COMMUNITY_Audit Trail UI|Audit Trail UI]]
- [[_COMMUNITY_Results Kanban Board|Results Kanban Board]]
- [[_COMMUNITY_Sample Handling UI|Sample Handling UI]]
- [[_COMMUNITY_Electron Main Process|Electron Main Process]]
- [[_COMMUNITY_App Core & Routing|App Core & Routing]]
- [[_COMMUNITY_React Error Handling|React Error Handling]]
- [[_COMMUNITY_Age Calculation Utility|Age Calculation Utility]]
- [[_COMMUNITY_App Layout & UI Theme|App Layout & UI Theme]]
- [[_COMMUNITY_Standard Report Template|Standard Report Template]]
- [[_COMMUNITY_Green Theme Report|Green Theme Report]]
- [[_COMMUNITY_Consolidated Report UI|Consolidated Report UI]]
- [[_COMMUNITY_Report Template Variants|Report Template Variants]]
- [[_COMMUNITY_Data Backup UI|Data Backup UI]]
- [[_COMMUNITY_Security Utilities|Security Utilities]]
- [[_COMMUNITY_Test Master Foundations|Test Master Foundations]]
- [[_COMMUNITY_Widal (Typhoid) Test|Widal (Typhoid) Test]]
- [[_COMMUNITY_Login & Auth UI|Login & Auth UI]]
- [[_COMMUNITY_Order Result Details|Order Result Details]]
- [[_COMMUNITY_Widal Entry Form|Widal Entry Form]]
- [[_COMMUNITY_Test Creation Wizard|Test Creation Wizard]]
- [[_COMMUNITY_Test Parameter UI|Test Parameter UI]]
- [[_COMMUNITY_Reference Range UI|Reference Range UI]]
- [[_COMMUNITY_UpgradeActivation Screen|Upgrade/Activation Screen]]
- [[_COMMUNITY_Billing & Commissions Model|Billing & Commissions Model]]
- [[_COMMUNITY_Database Maintenance|Database Maintenance]]
- [[_COMMUNITY_Build Configuration|Build Configuration]]
- [[_COMMUNITY_Dashboard Backend|Dashboard Backend]]
- [[_COMMUNITY_Module 60|Module 60]]
- [[_COMMUNITY_Module 61|Module 61]]
- [[_COMMUNITY_Module 62|Module 62]]
- [[_COMMUNITY_Module 63|Module 63]]
- [[_COMMUNITY_Module 64|Module 64]]
- [[_COMMUNITY_Module 65|Module 65]]
- [[_COMMUNITY_Module 66|Module 66]]
- [[_COMMUNITY_Module 67|Module 67]]
- [[_COMMUNITY_Module 68|Module 68]]
- [[_COMMUNITY_Module 69|Module 69]]
- [[_COMMUNITY_Module 70|Module 70]]
- [[_COMMUNITY_Module 71|Module 71]]
- [[_COMMUNITY_Module 72|Module 72]]
- [[_COMMUNITY_Database Integration|Database Integration]]
- [[_COMMUNITY_Module 74|Module 74]]
- [[_COMMUNITY_Module 75|Module 75]]
- [[_COMMUNITY_Module 76|Module 76]]
- [[_COMMUNITY_Module 77|Module 77]]
- [[_COMMUNITY_Module 78|Module 78]]
- [[_COMMUNITY_Module 79|Module 79]]
- [[_COMMUNITY_Module 80|Module 80]]
- [[_COMMUNITY_Module 81|Module 81]]
- [[_COMMUNITY_Module 82|Module 82]]
- [[_COMMUNITY_Module 83|Module 83]]
- [[_COMMUNITY_Module 84|Module 84]]
- [[_COMMUNITY_Module 85|Module 85]]
- [[_COMMUNITY_Module 86|Module 86]]
- [[_COMMUNITY_Module 87|Module 87]]
- [[_COMMUNITY_Module 88|Module 88]]
- [[_COMMUNITY_Clinical State Machine|Clinical State Machine]]

## God Nodes (most connected - your core abstractions)
1. `LicenseService` - 16 edges
2. `run()` - 7 edges
3. `initDatabase()` - 5 edges
4. `getDb()` - 5 edges
5. `createLicenseInteractive()` - 5 edges
6. `main()` - 5 edges
7. `Licensing System` - 5 edges
8. `runMigrations()` - 4 edges
9. `AIService` - 4 edges
10. `getS3Client()` - 4 edges

## Surprising Connections (you probably didn't know these)
- `Monetization: SaaS Model` --implemented_via--> `Licensing System`  [INFERRED]
  monetory.md → md/licensing_system_prd.md
- `Monetization: Tiered Licensing` --implemented_via--> `Licensing System`  [INFERRED]
  monetory.md → md/licensing_system_prd.md
- `QC & Audit Module` --validates--> `Result Entry`  [INFERRED]
  md/quality_control_qc_audit_trail_prd.md → plan.md
- `Result Entry` --precedes--> `Pathologist Verification`  [EXTRACTED]
  plan.md → md/pathologist_verification_manual_offline_pathology_lab_software.md
- `Pathologist Verification` --precedes--> `Report Generation`  [EXTRACTED]
  md/pathologist_verification_manual_offline_pathology_lab_software.md → plan.md

## Communities

### Community 0 - "Test Management Service"
Cohesion: 0.09
Nodes (26): addParameter(), bulkDeleteTests(), bulkImportTests(), createDraftFromExisting(), createReferenceRange(), createTestDraft(), deleteParameter(), deleteReferenceRange() (+18 more)

### Community 1 - "Test Master UI"
Cohesion: 0.12
Nodes (20): handleBulkDelete(), handleCancelParamForm(), handleConfirmImport(), handleDeleteParameter(), handleDeleteRange(), handleDeleteTest(), handleEditParamClick(), handleEditRangeClick() (+12 more)

### Community 2 - "Licensing & Machine Binding"
Cohesion: 0.18
Nodes (2): getLicenseService(), LicenseService

### Community 3 - "Result Entry Logic"
Cohesion: 0.17
Nodes (17): calculateAbnormalFlag(), computeFormula(), formatAge(), getDeltaChange(), getPreviousValue(), getRefRangeText(), handleFinalize(), handleInputBlur() (+9 more)

### Community 4 - "Billing & Price Lists"
Cohesion: 0.12
Nodes (16): bulkSetTestPrices(), createPackage(), createPriceList(), deletePriceList(), getDefaultPriceList(), getPackage(), getPriceList(), getTestPrice() (+8 more)

### Community 5 - "Admin & Lab Settings"
Cohesion: 0.18
Nodes (14): getRoleLabel(), handleClearCredentials(), handleDelete(), handleDeleteClick(), handleSaveLabSettings(), handleSignatureUpload(), handleSubmit(), handleToggleActive() (+6 more)

### Community 6 - "Order Management UI"
Cohesion: 0.18
Nodes (14): getPrice(), handleDoctorChange(), handleEditOrder(), handleOpenReceiveModal(), handlePrefixChange(), handleQuickAddDoctor(), handleQuickAddPatient(), handleReceiveSamples() (+6 more)

### Community 7 - "Quality Control (QC)"
Cohesion: 0.23
Nodes (13): checkWestgardRules(), createQCParameter(), getLeveyJenningsData(), getQCEntries(), getQCParameter(), getTestQCStatus(), getTodayQCStatus(), listQCParameters() (+5 more)

### Community 8 - "SQLite Database Core"
Cohesion: 0.36
Nodes (11): checkDefaultPasswordsWarning(), closeDatabase(), ensureAdminPassword(), getDb(), getMigrations(), initDatabase(), queryAll(), queryOne() (+3 more)

### Community 9 - "Invoicing Service"
Cohesion: 0.2
Nodes (11): cancelInvoice(), createInvoice(), finalizeInvoice(), generateInvoiceNumber(), getInvoice(), getInvoiceByOrder(), getInvoiceSummary(), getPatientDues() (+3 more)

### Community 10 - "Patient Management UI"
Cohesion: 0.24
Nodes (11): calculateAgeFromDob(), calculateDobFromAge(), handleAgeChange(), handleDelete(), handlePrefixChange(), handleSubmit(), handleViewOrders(), loadPatients() (+3 more)

### Community 11 - "Backup & Cloud Storage"
Cohesion: 0.31
Nodes (10): checkIntegrity(), createBackup(), createCloudBackup(), decrypt(), encrypt(), getDbPath(), getS3Client(), listCloudBackups() (+2 more)

### Community 12 - "Doctor Commission Service"
Cohesion: 0.22
Nodes (10): calculateAndRecordCommission(), getCommissionStatement(), getDoctorCommissions(), getDoctorsWithPendingCommissions(), getMonthlyCommissionSummary(), getOrCreateSettlement(), getSettlement(), listSettlements() (+2 more)

### Community 13 - "Doctor Referral UI"
Cohesion: 0.31
Nodes (10): handleCloseModal(), handleOpenModal(), handlePeriodChange(), handleRecordPayment(), handleSubmit(), handleToggleActive(), handleViewStatement(), loadDoctors() (+2 more)

### Community 14 - "Price List Configuration"
Cohesion: 0.27
Nodes (9): handleCreateList(), handleDeleteList(), handleEditList(), handlePriceChange(), handleSaveList(), handleSavePrices(), handleSetDefault(), loadPriceLists() (+1 more)

### Community 15 - "Audit Trail Service"
Cohesion: 0.28
Nodes (8): createDiff(), getActivityStats(), getAuditLogs(), getEntityHistory(), getRecentActivity(), logAudit(), logInvoiceAction(), logResultChange()

### Community 16 - "Results Processing"
Cohesion: 0.28
Nodes (8): calculateAgeDays(), finalizeResults(), getPreviousResults(), getSampleResults(), listPendingSamples(), saveResultValues(), submitResults(), verifyResults()

### Community 17 - "Sample Accessioning"
Cohesion: 0.22
Nodes (8): createSample(), getPendingSamples(), getSampleByUid(), getSamplesForOrder(), listSamples(), receiveSample(), receiveSamples(), rejectSample()

### Community 18 - "User & Role Management"
Cohesion: 0.22
Nodes (8): createUser(), deleteUser(), getUser(), getUsersByRole(), listRoles(), listUsers(), toggleUserActive(), updateUser()

### Community 19 - "License Generation Tool"
Cohesion: 0.5
Nodes (8): ask(), createLicenseFromConfig(), createLicenseInteractive(), generateKeyPair(), generateLicenseId(), main(), showHelp(), signLicense()

### Community 20 - "Doctor Entity Service"
Cohesion: 0.25
Nodes (7): createDoctor(), getDoctor(), listAllDoctors(), listDoctors(), searchDoctors(), toggleDoctorActive(), updateDoctor()

### Community 21 - "Order Processing Service"
Cohesion: 0.29
Nodes (7): createOrder(), getOrder(), getPatientOrders(), getPendingOrders(), listOrders(), updateOrder(), updateOrderTestStatus()

### Community 22 - "Report Generation Service"
Cohesion: 0.39
Nodes (7): generateReportQRCode(), getLabSettings(), getOrderReportData(), getReportData(), getS3Client(), updateLabSetting(), uploadReportPdfToR2()

### Community 23 - "Patient Data Service"
Cohesion: 0.29
Nodes (6): createPatient(), deletePatient(), getPatient(), listPatients(), searchPatients(), updatePatient()

### Community 24 - "Payment Collections"
Cohesion: 0.29
Nodes (6): getDailyCollection(), getOutstandingDues(), getPatientPaymentHistory(), getPayment(), listPayments(), recordPayment()

### Community 25 - "License Activation UI"
Cohesion: 0.29
Nodes (6): copyMachineId(), formatDate(), getStateColor(), getStateIcon(), handleFileSelect(), loadMachineId()

### Community 26 - "QC Management UI"
Cohesion: 0.33
Nodes (6): getStatusBg(), getStatusColor(), handleCreateParameter(), handleRecordEntry(), loadData(), loadEntries()

### Community 27 - "Clinical Workflow Model"
Cohesion: 0.29
Nodes (7): Order Creation, Patient Registration, QC & Audit Module, Report Generation, Result Entry, Sample Accession, Pathologist Verification

### Community 28 - "Dashboard Statistics"
Cohesion: 0.33
Nodes (5): formatCurrency(), getStatusClass(), loadStats(), timeAgo(), toggleFinancials()

### Community 29 - "Licensing Model"
Cohesion: 0.33
Nodes (6): Licensing System, Machine Binding, Monetization: SaaS Model, Monetization: Tiered Licensing, Offline Operation, RSA-PSS Signatures

### Community 30 - "AI Analysis Service"
Cohesion: 0.6
Nodes (1): AIService

### Community 31 - "Authentication Service"
Cohesion: 0.4
Nodes (4): getSession(), login(), logout(), requireRole()

### Community 32 - "Report PDF Components"
Cohesion: 0.4
Nodes (4): calculateAge(), formatDate(), formatFlag(), getFlagStyle()

### Community 33 - "Audit Trail UI"
Cohesion: 0.4
Nodes (4): getEntityIcon(), handleFilterChange(), loadData(), switch()

### Community 34 - "Results Kanban Board"
Cohesion: 0.6
Nodes (4): handleBackToBoard(), handleSampleUpdate(), handleSelectSample(), loadSamples()

### Community 35 - "Sample Handling UI"
Cohesion: 0.6
Nodes (4): escapeHtml(), handlePrintBarcode(), handleReceive(), loadSamples()

### Community 36 - "Electron Main Process"
Cohesion: 0.5
Nodes (3): createWindow(), registerIpcHandlers(), setupBackupScheduler()

### Community 37 - "App Core & Routing"
Cohesion: 0.5
Nodes (2): checkLicense(), ProtectedRoute()

### Community 38 - "React Error Handling"
Cohesion: 0.5
Nodes (3): componentDidCatch(), constructor(), getDerivedStateFromError()

### Community 39 - "Age Calculation Utility"
Cohesion: 0.67
Nodes (3): compositeToDays(), daysToComposite(), update()

### Community 40 - "App Layout & UI Theme"
Cohesion: 0.5
Nodes (3): handleClickOutside(), isNavItemVisible(), LicenseStatusBadge()

### Community 41 - "Standard Report Template"
Cohesion: 0.5
Nodes (3): calculateAge(), formatFlag(), getFlagStyle()

### Community 42 - "Green Theme Report"
Cohesion: 0.5
Nodes (3): calcAge(), flagBadgeStyle(), formatFlag()

### Community 43 - "Consolidated Report UI"
Cohesion: 0.5
Nodes (3): autoArchive(), fetchQR(), loadAllData()

### Community 44 - "Report Template Variants"
Cohesion: 0.5
Nodes (3): calcAge(), flagBadgeStyle(), formatFlag()

### Community 45 - "Data Backup UI"
Cohesion: 0.5
Nodes (3): handleBackup(), handleIntegrityCheck(), handleRestore()

### Community 46 - "Security Utilities"
Cohesion: 0.5
Nodes (3): deobfuscate(), deriveKeyFromSalt(), obfuscate()

### Community 47 - "Test Master Foundations"
Cohesion: 0.5
Nodes (4): Calculated Parameters (Formulas), Reference Range Configuration, Test Master, Test Creation Wizard

### Community 48 - "Widal (Typhoid) Test"
Cohesion: 0.67
Nodes (2): isWidalTest(), parseWidalResults()

### Community 49 - "Login & Auth UI"
Cohesion: 0.67
Nodes (2): handleSubmit(), init()

### Community 50 - "Order Result Details"
Cohesion: 0.67
Nodes (2): handleSampleUpdate(), loadOrderData()

### Community 51 - "Widal Entry Form"
Cohesion: 1.0
Nodes (2): getRefRangeText(), handleKeyDown()

### Community 52 - "Test Creation Wizard"
Cohesion: 0.67
Nodes (2): formatAge(), TestWizard()

### Community 53 - "Test Parameter UI"
Cohesion: 0.67
Nodes (2): handleMoveDown(), handleMoveUp()

### Community 54 - "Reference Range UI"
Cohesion: 0.67
Nodes (2): formatAge(), handleSaveCriticalValues()

### Community 55 - "Upgrade/Activation Screen"
Cohesion: 0.67
Nodes (2): copyMachineId(), loadMachineId()

### Community 56 - "Billing & Commissions Model"
Cohesion: 0.67
Nodes (3): Billing & Pricing System, Doctor Commission Management, Dynamic Price Lists

### Community 57 - "Database Maintenance"
Cohesion: 1.0
Nodes (1): checkDb()

### Community 58 - "Build Configuration"
Cohesion: 1.0
Nodes (1): transformIndexHtml()

### Community 59 - "Dashboard Backend"
Cohesion: 1.0
Nodes (1): getDashboardStats()

### Community 60 - "Module 60"
Cohesion: 1.0
Nodes (1): parse()

### Community 61 - "Module 61"
Cohesion: 1.0
Nodes (1): buildIcons()

### Community 62 - "Module 62"
Cohesion: 1.0
Nodes (1): PaymentReceipt()

### Community 63 - "Module 63"
Cohesion: 1.0
Nodes (1): ConfirmDialog()

### Community 64 - "Module 64"
Cohesion: 1.0
Nodes (1): ThemeToggle()

### Community 65 - "Module 65"
Cohesion: 1.0
Nodes (1): ReportPreview()

### Community 66 - "Module 66"
Cohesion: 1.0
Nodes (1): ToastContainer()

### Community 67 - "Module 67"
Cohesion: 1.0
Nodes (1): Invoices()

### Community 68 - "Module 68"
Cohesion: 1.0
Nodes (1): getColumnSamples()

### Community 69 - "Module 69"
Cohesion: 1.0
Nodes (1): ContactUsPage()

### Community 70 - "Module 70"
Cohesion: 1.0
Nodes (1): handleFileChange()

### Community 71 - "Module 71"
Cohesion: 1.0
Nodes (1): exportTestsToExcel()

### Community 72 - "Module 72"
Cohesion: 1.0
Nodes (1): parseExcelForTests()

### Community 73 - "Database Integration"
Cohesion: 1.0
Nodes (2): Electron Framework, SQLite Database

### Community 74 - "Module 74"
Cohesion: 1.0
Nodes (0): 

### Community 75 - "Module 75"
Cohesion: 1.0
Nodes (0): 

### Community 76 - "Module 76"
Cohesion: 1.0
Nodes (0): 

### Community 77 - "Module 77"
Cohesion: 1.0
Nodes (0): 

### Community 78 - "Module 78"
Cohesion: 1.0
Nodes (0): 

### Community 79 - "Module 79"
Cohesion: 1.0
Nodes (0): 

### Community 80 - "Module 80"
Cohesion: 1.0
Nodes (0): 

### Community 81 - "Module 81"
Cohesion: 1.0
Nodes (0): 

### Community 82 - "Module 82"
Cohesion: 1.0
Nodes (0): 

### Community 83 - "Module 83"
Cohesion: 1.0
Nodes (0): 

### Community 84 - "Module 84"
Cohesion: 1.0
Nodes (0): 

### Community 85 - "Module 85"
Cohesion: 1.0
Nodes (0): 

### Community 86 - "Module 86"
Cohesion: 1.0
Nodes (0): 

### Community 87 - "Module 87"
Cohesion: 1.0
Nodes (0): 

### Community 88 - "Module 88"
Cohesion: 1.0
Nodes (0): 

### Community 89 - "Clinical State Machine"
Cohesion: 1.0
Nodes (1): Clinical Workflow

## Knowledge Gaps
- **16 isolated node(s):** `Clinical Workflow`, `Patient Registration`, `Report Generation`, `Machine Binding`, `RSA-PSS Signatures` (+11 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Database Maintenance`** (2 nodes): `checkDb()`, `check-tests.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Build Configuration`** (2 nodes): `vite.config.ts`, `transformIndexHtml()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Dashboard Backend`** (2 nodes): `getDashboardStats()`, `dashboardService.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 60`** (2 nodes): `parse()`, `parse_detect.py`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 61`** (2 nodes): `buildIcons()`, `generate-png.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 62`** (2 nodes): `PaymentReceipt.tsx`, `PaymentReceipt()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 63`** (2 nodes): `ConfirmDialog()`, `ConfirmDialog.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 64`** (2 nodes): `ThemeToggle.tsx`, `ThemeToggle()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 65`** (2 nodes): `ReportPreview.tsx`, `ReportPreview()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 66`** (2 nodes): `Toast.tsx`, `ToastContainer()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 67`** (2 nodes): `Invoices()`, `Invoices.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 68`** (2 nodes): `ResultKanbanBoard.tsx`, `getColumnSamples()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 69`** (2 nodes): `ContactUsPage()`, `ContactUs.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 70`** (2 nodes): `TestListPanel.tsx`, `handleFileChange()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 71`** (2 nodes): `exportTestsToExcel()`, `exportExcel.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 72`** (2 nodes): `parseExcelForTests()`, `importExcel.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Database Integration`** (2 nodes): `Electron Framework`, `SQLite Database`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 74`** (1 nodes): `detect_filtered.py`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 75`** (1 nodes): `check-db.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 76`** (1 nodes): `check-prices.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 77`** (1 nodes): `electron-env.d.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 78`** (1 nodes): `preload.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 79`** (1 nodes): `cleanup.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 80`** (1 nodes): `vite-env.d.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 81`** (1 nodes): `types.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 82`** (1 nodes): `ImportPreviewModal.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 83`** (1 nodes): `authStore.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 84`** (1 nodes): `licenseStore.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 85`** (1 nodes): `themeStore.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 86`** (1 nodes): `toastStore.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 87`** (1 nodes): `electron.d.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 88`** (1 nodes): `index.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Clinical State Machine`** (1 nodes): `Clinical Workflow`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What connects `Clinical Workflow`, `Patient Registration`, `Report Generation` to the rest of the system?**
  _16 weakly-connected nodes found - possible documentation gaps or missing edges._
// Shared types between main and renderer processes

export interface User {
    id: number;
    username: string;
    fullName: string;
    roleId: number;
    roleName: string;
    isActive: boolean;
}

export interface Session {
    userId: number;
    username: string;
    fullName: string;
    role: 'admin' | 'receptionist' | 'technician' | 'pathologist' | 'auditor';
}

export interface Patient {
    id: number;
    patientUid: string;
    fullName: string;
    dob: string;
    gender: 'M' | 'F' | 'O';
    phone?: string;
    address?: string;
    createdAt: string;
}

export interface Test {
    id: number;
    testCode: string;
    isActive: boolean;
}

export interface TestVersion {
    id: number;
    testId: number;
    testName: string;
    department: string;
    method: string;
    sampleType: string;
    reportGroup?: string;
    versionNo: number;
    effectiveFrom: string;
}

export interface TestParameter {
    id: number;
    testVersionId: number;
    parameterCode: string;
    parameterName: string;
    dataType: 'NUMERIC' | 'TEXT' | 'BOOLEAN' | 'CALCULATED';
    unit?: string;
    decimalPrecision?: number;
    displayOrder?: number;
    isMandatory: boolean;
    formula?: string;
}

export interface ReferenceRange {
    id: number;
    parameterId: number;
    gender: 'M' | 'F' | 'A';
    ageMinDays: number;
    ageMaxDays: number;
    lowerLimit?: number;
    upperLimit?: number;
    displayText?: string;
    effectiveFrom: string;
}

export interface CriticalValue {
    id: number;
    parameterId: number;
    criticalLow?: number;
    criticalHigh?: number;
}

export interface Order {
    id: number;
    orderUid: string;
    patientId: number;
    orderDate: string;
    patient?: Patient;
}

export interface OrderTest {
    id: number;
    orderId: number;
    testVersionId: number;
    status: 'ORDERED' | 'RESULT_ENTERED' | 'FINALIZED';
    testVersion?: TestVersion;
}

export interface Sample {
    id: number;
    sampleUid: string;
    orderTestId: number;
    collectedAt?: string;
    status: 'COLLECTED' | 'RECEIVED' | 'REJECTED';
    rejectionReason?: string;
}

export interface TestResult {
    id: number;
    orderTestId: number;
    parameterId: number;
    resultValue: string;
    abnormalFlag: 'NORMAL' | 'HIGH' | 'LOW' | 'CRITICAL';
    status: 'DRAFT' | 'ENTERED' | 'VERIFIED' | 'FINALIZED';
    source: 'MANUAL' | 'ANALYZER';
    enteredBy: number;
    enteredAt: string;
}

// IPC Channel names
export const IPC_CHANNELS = {
    // Auth
    AUTH_LOGIN: 'auth:login',
    AUTH_LOGOUT: 'auth:logout',
    AUTH_GET_SESSION: 'auth:getSession',

    // Patients
    PATIENT_CREATE: 'patient:create',
    PATIENT_UPDATE: 'patient:update',
    PATIENT_GET: 'patient:get',
    PATIENT_SEARCH: 'patient:search',
    PATIENT_LIST: 'patient:list',
    PATIENT_DELETE: 'patient:delete',

    // Orders
    ORDER_CREATE: 'order:create',
    ORDER_GET: 'order:get',
    ORDER_LIST: 'order:list',
    ORDER_PENDING: 'order:pending',

    // Samples
    SAMPLE_CREATE: 'sample:create',
    SAMPLE_UPDATE_STATUS: 'sample:updateStatus',
    SAMPLE_LIST: 'sample:list',
    SAMPLE_RECEIVE: 'sample:receive',
    SAMPLE_REJECT: 'sample:reject',
    SAMPLE_PENDING: 'sample:pending',

    // Tests
    TEST_LIST: 'test:list',
    TEST_GET: 'test:get',
    TEST_CREATE: 'test:create',
    TEST_UPDATE: 'test:update',
    TEST_DELETE: 'test:delete',

    // Test Wizard
    TEST_WIZARD_GET_DRAFTS: 'testWizard:getDrafts',
    TEST_WIZARD_CREATE_DRAFT: 'testWizard:createDraft',
    TEST_WIZARD_UPDATE_DRAFT: 'testWizard:updateDraft',
    TEST_WIZARD_UPDATE_STEP: 'testWizard:updateStep',
    TEST_WIZARD_SAVE_PARAMS: 'testWizard:saveParams',
    TEST_WIZARD_PUBLISH: 'testWizard:publish',
    TEST_WIZARD_CREATE_DRAFT_FROM_EXISTING: 'testWizard:createDraftFromExisting',
    TEST_WIZARD_GET_DRAFT: 'testWizard:getDraft', // To load draft details

    // Parameters
    PARAMETER_LIST: 'parameter:list',
    PARAMETER_CREATE: 'parameter:create',
    PARAMETER_UPDATE: 'parameter:update',
    PARAMETER_DELETE: 'parameter:delete',

    // Reference Ranges
    REF_RANGE_LIST: 'refRange:list',
    REF_RANGE_CREATE: 'refRange:create',
    REF_RANGE_UPDATE: 'refRange:update',
    REF_RANGE_DELETE: 'refRange:delete',

    // Results
    RESULT_PENDING_SAMPLES: 'result:pendingSamples',
    RESULT_GET: 'result:get',
    RESULT_SAVE: 'result:save',
    RESULT_SUBMIT: 'result:submit',
    RESULT_VERIFY: 'result:verify',
    RESULT_FINALIZE: 'result:finalize',
    RESULT_GET_PREVIOUS: 'result:getPrevious',
    RESULT_GET_BY_ORDER: 'result:getByOrder',


    // Users (Admin)
    USER_LIST: 'user:list',
    USER_CREATE: 'user:create',
    USER_UPDATE: 'user:update',
    USER_TOGGLE_ACTIVE: 'user:toggleActive',
    ROLE_LIST: 'role:list',

    // Reports
    REPORT_GET_DATA: 'report:getData',

    // Lab Settings
    LAB_SETTINGS_GET: 'labSettings:get',
    LAB_SETTINGS_UPDATE: 'labSettings:update',

    // Doctors
    DOCTOR_LIST: 'doctor:list',
    DOCTOR_LIST_ALL: 'doctor:listAll',
    DOCTOR_GET: 'doctor:get',
    DOCTOR_CREATE: 'doctor:create',
    DOCTOR_UPDATE: 'doctor:update',
    DOCTOR_TOGGLE_ACTIVE: 'doctor:toggleActive',
    DOCTOR_SEARCH: 'doctor:search',

    // Price Lists
    PRICE_LIST_LIST: 'priceList:list',
    PRICE_LIST_LIST_ALL: 'priceList:listAll',
    PRICE_LIST_GET: 'priceList:get',
    PRICE_LIST_GET_DEFAULT: 'priceList:getDefault',
    PRICE_LIST_CREATE: 'priceList:create',
    PRICE_LIST_UPDATE: 'priceList:update',
    PRICE_LIST_DELETE: 'priceList:delete',

    // Test Prices
    TEST_PRICE_LIST: 'testPrice:list',
    TEST_PRICE_GET: 'testPrice:get',
    TEST_PRICE_SET: 'testPrice:set',
    TEST_PRICE_BULK_SET: 'testPrice:bulkSet',
    TEST_PRICE_GET_FOR_TESTS: 'testPrice:getForTests',

    // Packages
    PACKAGE_LIST: 'package:list',
    PACKAGE_GET: 'package:get',
    PACKAGE_CREATE: 'package:create',
    PACKAGE_UPDATE: 'package:update',

    // Invoices
    INVOICE_LIST: 'invoice:list',
    INVOICE_GET: 'invoice:get',
    INVOICE_GET_BY_ORDER: 'invoice:getByOrder',
    INVOICE_CREATE: 'invoice:create',
    INVOICE_FINALIZE: 'invoice:finalize',
    INVOICE_CANCEL: 'invoice:cancel',
    INVOICE_PATIENT_DUES: 'invoice:patientDues',
    INVOICE_SUMMARY: 'invoice:summary',

    // Payments
    PAYMENT_RECORD: 'payment:record',
    PAYMENT_LIST: 'payment:list',
    PAYMENT_GET: 'payment:get',
    PAYMENT_PATIENT_HISTORY: 'payment:patientHistory',
    PAYMENT_DAILY_COLLECTION: 'payment:dailyCollection',
    PAYMENT_OUTSTANDING_DUES: 'payment:outstandingDues',

    // Commissions
    COMMISSION_GET_DOCTOR_COMMISSIONS: 'commission:getDoctorCommissions',
    COMMISSION_GET_MONTHLY_SUMMARY: 'commission:getMonthlySummary',
    COMMISSION_GET_STATEMENT: 'commission:getStatement',
    COMMISSION_GET_DOCTORS_WITH_PENDING: 'commission:getDoctorsWithPending',
    COMMISSION_CREATE_SETTLEMENT: 'commission:createSettlement',
    COMMISSION_RECORD_PAYMENT: 'commission:recordPayment',
    COMMISSION_GET_SETTLEMENT: 'commission:getSettlement',
    COMMISSION_LIST_SETTLEMENTS: 'commission:listSettlements',

    // QC (Quality Control)
    QC_PARAMETER_LIST: 'qc:parameterList',
    QC_PARAMETER_GET: 'qc:parameterGet',
    QC_PARAMETER_CREATE: 'qc:parameterCreate',
    QC_PARAMETER_UPDATE: 'qc:parameterUpdate',
    QC_ENTRY_RECORD: 'qc:entryRecord',
    QC_ENTRY_REVIEW: 'qc:entryReview',
    QC_ENTRY_LIST: 'qc:entryList',
    QC_TODAY_STATUS: 'qc:todayStatus',
    QC_LEVEY_JENNINGS: 'qc:leveyJennings',
    QC_RULES_LIST: 'qc:rulesList',
    QC_WESTGARD_CHECK: 'qc:westgardCheck',
    QC_TEST_STATUS: 'qc:testStatus',
    QC_OVERRIDE: 'qc:override',

    // Audit
    AUDIT_LOG: 'audit:log',
    AUDIT_GET_LOGS: 'audit:getLogs',
    AUDIT_ENTITY_HISTORY: 'audit:entityHistory',
    AUDIT_RECENT_ACTIVITY: 'audit:recentActivity',
    AUDIT_STATS: 'audit:stats',

    // License
    LICENSE_GET_STATUS: 'license:getStatus',
    LICENSE_UPLOAD: 'license:upload',
    LICENSE_GET_MACHINE_ID: 'license:getMachineId',
    LICENSE_IS_MODULE_ENABLED: 'license:isModuleEnabled',
    LICENSE_CAN_BILLING: 'license:canBilling',
    LICENSE_CAN_FINALIZE: 'license:canFinalize',
    LICENSE_IS_TRIAL: 'license:isTrial',

    // Dashboard
    DASHBOARD_STATS: 'dashboard:getStats',
} as const;

// Billing Types
export interface PriceList {
    id: number;
    code: string;
    name: string;
    description?: string;
    isDefault: boolean;
    isActive: boolean;
    createdAt: string;
}

export interface TestPrice {
    id: number;
    priceListId: number;
    testId: number;
    testCode: string;
    testName: string;
    basePrice: number;
    autoDiscountPercent: number;
    discountCapPercent: number;
    gstApplicable: boolean;
    gstRate: number;
    effectiveFrom: string;
    effectiveTo?: string;
    isActive: boolean;
}

export interface Package {
    id: number;
    code: string;
    name: string;
    description?: string;
    packagePrice: number;
    priceListId?: number;
    validFrom?: string;
    validTo?: string;
    isActive: boolean;
    items?: Array<{ testId: number; testCode: string; testName: string }>;
}

export interface Invoice {
    id: number;
    invoiceNumber: string;
    orderId: number;
    patientId: number;
    patientName?: string;
    patientUid?: string;
    priceListId?: number;
    priceListName?: string;
    subtotal: number;
    discountAmount: number;
    discountPercent: number;
    discountReason?: string;
    gstAmount: number;
    totalAmount: number;
    status: 'DRAFT' | 'FINALIZED' | 'CANCELLED';
    createdAt: string;
    finalizedAt?: string;
    amountPaid?: number;
    balanceDue?: number;
}

export interface InvoiceItem {
    id: number;
    invoiceId: number;
    testId?: number;
    packageId?: number;
    description: string;
    unitPrice: number;
    quantity: number;
    discountAmount: number;
    gstRate: number;
    gstAmount: number;
    lineTotal: number;
}

export interface Payment {
    id: number;
    invoiceId: number;
    amount: number;
    paymentMode: 'CASH' | 'CARD' | 'UPI' | 'CREDIT';
    referenceNumber?: string;
    paymentDate: string;
    receivedBy?: number;
    receivedByName?: string;
    remarks?: string;
}

// License Types
export type LicenseType = 'TRIAL' | 'ANNUAL' | 'PERPETUAL' | 'ENTERPRISE';
export type BindingMode = 'NONE' | 'SOFT' | 'STRICT';
export type LicenseState = 'VALID' | 'NEAR_EXPIRY' | 'GRACE_PERIOD' | 'EXPIRED' | 'INVALID' | 'NO_LICENSE';
export type LicenseModule = 'BILLING' | 'QC_AUDIT' | 'ANALYZER' | 'INVENTORY' | 'DOCTOR_COMMISSION';

export interface LicenseData {
    license_id: string;
    lab_name: string;
    issued_to: string;
    machine_id_hash: string | null;
    edition: LicenseType;
    binding_mode: BindingMode;
    enabled_modules: LicenseModule[];
    max_users: number;
    issue_date: string;
    expiry_date: string;
    grace_period_days: number;
}

export interface LicenseStatus {
    state: LicenseState;
    license: LicenseData | null;
    daysUntilExpiry: number | null;
    graceDaysRemaining: number | null;
    machineIdMatch: boolean;
    machineIdMismatchType: 'NONE' | 'MINOR' | 'MAJOR' | null;
    message: string;
}

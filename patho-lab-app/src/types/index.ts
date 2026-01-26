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

    // Dashboard
    DASHBOARD_STATS: 'dashboard:stats',

    // Users (Admin)
    USER_LIST: 'user:list',
    USER_CREATE: 'user:create',
    USER_UPDATE: 'user:update',
    USER_TOGGLE_ACTIVE: 'user:toggleActive',
    ROLE_LIST: 'role:list',
} as const;

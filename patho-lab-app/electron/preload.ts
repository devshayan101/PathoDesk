import { ipcRenderer, contextBridge } from 'electron'
import { IPC_CHANNELS } from '../src/types'

// Type-safe API exposed to renderer
const api = {
  // Auth
  auth: {
    login: (username: string, password: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.AUTH_LOGIN, username, password),
    logout: () =>
      ipcRenderer.invoke(IPC_CHANNELS.AUTH_LOGOUT),
    getSession: () =>
      ipcRenderer.invoke(IPC_CHANNELS.AUTH_GET_SESSION),
  },

  // Patients
  patients: {
    list: () =>
      ipcRenderer.invoke(IPC_CHANNELS.PATIENT_LIST),
    get: (id: number) =>
      ipcRenderer.invoke(IPC_CHANNELS.PATIENT_GET, id),
    search: (query: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.PATIENT_SEARCH, query),
    create: (data: any) =>
      ipcRenderer.invoke(IPC_CHANNELS.PATIENT_CREATE, data),
  },

  // Tests
  tests: {
    list: () =>
      ipcRenderer.invoke(IPC_CHANNELS.TEST_LIST),
    get: (testId: number) =>
      ipcRenderer.invoke(IPC_CHANNELS.TEST_GET, testId),
    getParameters: (testVersionId: number) =>
      ipcRenderer.invoke(IPC_CHANNELS.PARAMETER_LIST, testVersionId),
    delete: (testId: number) =>
      ipcRenderer.invoke(IPC_CHANNELS.TEST_DELETE, testId),
  },

  // Test Wizard
  testWizard: {
    getDrafts: () =>
      ipcRenderer.invoke(IPC_CHANNELS.TEST_WIZARD_GET_DRAFTS),
    createDraft: (data: any) =>
      ipcRenderer.invoke(IPC_CHANNELS.TEST_WIZARD_CREATE_DRAFT, data),
    updateDraft: (id: number, data: any) =>
      ipcRenderer.invoke(IPC_CHANNELS.TEST_WIZARD_UPDATE_DRAFT, id, data),
    updateStep: (id: number, step: number) =>
      ipcRenderer.invoke(IPC_CHANNELS.TEST_WIZARD_UPDATE_STEP, id, step),
    saveParams: (id: number, params: any[]) =>
      ipcRenderer.invoke(IPC_CHANNELS.TEST_WIZARD_SAVE_PARAMS, id, params),
    publish: (id: number) =>
      ipcRenderer.invoke(IPC_CHANNELS.TEST_WIZARD_PUBLISH, id),
    createDraftFromExisting: (testId: number) =>
      ipcRenderer.invoke(IPC_CHANNELS.TEST_WIZARD_CREATE_DRAFT_FROM_EXISTING, testId),
    getDraft: (versionId: number) =>
      ipcRenderer.invoke(IPC_CHANNELS.TEST_WIZARD_GET_DRAFT, versionId),
  },

  // Orders
  orders: {
    list: () =>
      ipcRenderer.invoke(IPC_CHANNELS.ORDER_LIST),
    get: (orderId: number) =>
      ipcRenderer.invoke(IPC_CHANNELS.ORDER_GET, orderId),
    create: (data: any) =>
      ipcRenderer.invoke(IPC_CHANNELS.ORDER_CREATE, data),
    getPending: () =>
      ipcRenderer.invoke(IPC_CHANNELS.ORDER_PENDING),
  },

  // Samples
  samples: {
    list: (status?: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.SAMPLE_LIST, status),
    create: (orderTestId: number) =>
      ipcRenderer.invoke(IPC_CHANNELS.SAMPLE_CREATE, orderTestId),
    receive: (sampleId: number) =>
      ipcRenderer.invoke(IPC_CHANNELS.SAMPLE_RECEIVE, sampleId),
    reject: (sampleId: number, reason: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.SAMPLE_REJECT, sampleId, reason),
    getPending: () =>
      ipcRenderer.invoke(IPC_CHANNELS.SAMPLE_PENDING),
  },

  // Reference Ranges
  refRanges: {
    list: (parameterId: number) =>
      ipcRenderer.invoke(IPC_CHANNELS.REF_RANGE_LIST, parameterId),
    create: (data: any) =>
      ipcRenderer.invoke(IPC_CHANNELS.REF_RANGE_CREATE, data),
    update: (id: number, data: any) =>
      ipcRenderer.invoke(IPC_CHANNELS.REF_RANGE_UPDATE, id, data),
    delete: (id: number) =>
      ipcRenderer.invoke(IPC_CHANNELS.REF_RANGE_DELETE, id),
  },

  // Users (Admin)
  users: {
    list: () =>
      ipcRenderer.invoke(IPC_CHANNELS.USER_LIST),
    create: (data: any) =>
      ipcRenderer.invoke(IPC_CHANNELS.USER_CREATE, data),
    update: (id: number, data: any) =>
      ipcRenderer.invoke(IPC_CHANNELS.USER_UPDATE, id, data),
    toggleActive: (id: number) =>
      ipcRenderer.invoke(IPC_CHANNELS.USER_TOGGLE_ACTIVE, id),
    listRoles: () =>
      ipcRenderer.invoke(IPC_CHANNELS.ROLE_LIST),
  },

  // Results
  results: {
    getPendingSamples: () =>
      ipcRenderer.invoke(IPC_CHANNELS.RESULT_PENDING_SAMPLES),
    get: (sampleId: number) =>
      ipcRenderer.invoke(IPC_CHANNELS.RESULT_GET, sampleId),
    save: (data: any) =>
      ipcRenderer.invoke(IPC_CHANNELS.RESULT_SAVE, data),
    submit: (sampleId: number) =>
      ipcRenderer.invoke(IPC_CHANNELS.RESULT_SUBMIT, sampleId),
    verify: (sampleId: number, verifiedBy: number) =>
      ipcRenderer.invoke(IPC_CHANNELS.RESULT_VERIFY, sampleId, verifiedBy),
    finalize: (sampleId: number) =>
      ipcRenderer.invoke(IPC_CHANNELS.RESULT_FINALIZE, sampleId),
    getPrevious: (patientId: number, testId: number, currentSampleId: number) =>
      ipcRenderer.invoke(IPC_CHANNELS.RESULT_GET_PREVIOUS, patientId, testId, currentSampleId),
  },

  // Reports
  reports: {
    getData: (sampleId: number) =>
      ipcRenderer.invoke(IPC_CHANNELS.REPORT_GET_DATA, sampleId),
  },

  // Lab Settings
  labSettings: {
    get: () =>
      ipcRenderer.invoke(IPC_CHANNELS.LAB_SETTINGS_GET),
    update: (key: string, value: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.LAB_SETTINGS_UPDATE, key, value),
  },

  // Doctors
  doctors: {
    list: () =>
      ipcRenderer.invoke(IPC_CHANNELS.DOCTOR_LIST),
    listAll: () =>
      ipcRenderer.invoke(IPC_CHANNELS.DOCTOR_LIST_ALL),
    get: (id: number) =>
      ipcRenderer.invoke(IPC_CHANNELS.DOCTOR_GET, id),
    create: (data: any) =>
      ipcRenderer.invoke(IPC_CHANNELS.DOCTOR_CREATE, data),
    update: (id: number, data: any) =>
      ipcRenderer.invoke(IPC_CHANNELS.DOCTOR_UPDATE, id, data),
    toggleActive: (id: number) =>
      ipcRenderer.invoke(IPC_CHANNELS.DOCTOR_TOGGLE_ACTIVE, id),
    search: (query: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.DOCTOR_SEARCH, query),
  },

  // Price Lists
  priceLists: {
    list: () =>
      ipcRenderer.invoke(IPC_CHANNELS.PRICE_LIST_LIST),
    listAll: () =>
      ipcRenderer.invoke(IPC_CHANNELS.PRICE_LIST_LIST_ALL),
    get: (id: number) =>
      ipcRenderer.invoke(IPC_CHANNELS.PRICE_LIST_GET, id),
    getDefault: () =>
      ipcRenderer.invoke(IPC_CHANNELS.PRICE_LIST_GET_DEFAULT),
    create: (data: any) =>
      ipcRenderer.invoke(IPC_CHANNELS.PRICE_LIST_CREATE, data),
    update: (id: number, data: any) =>
      ipcRenderer.invoke(IPC_CHANNELS.PRICE_LIST_UPDATE, id, data),
    delete: (id: number) =>
      ipcRenderer.invoke(IPC_CHANNELS.PRICE_LIST_DELETE, id),
  },

  // Test Prices
  testPrices: {
    list: (priceListId: number) =>
      ipcRenderer.invoke(IPC_CHANNELS.TEST_PRICE_LIST, priceListId),
    get: (testId: number, priceListId: number) =>
      ipcRenderer.invoke(IPC_CHANNELS.TEST_PRICE_GET, testId, priceListId),
    set: (priceListId: number, testId: number, data: any) =>
      ipcRenderer.invoke(IPC_CHANNELS.TEST_PRICE_SET, priceListId, testId, data),
    bulkSet: (priceListId: number, prices: any[]) =>
      ipcRenderer.invoke(IPC_CHANNELS.TEST_PRICE_BULK_SET, priceListId, prices),
    getForTests: (testIds: number[], priceListId: number) =>
      ipcRenderer.invoke(IPC_CHANNELS.TEST_PRICE_GET_FOR_TESTS, testIds, priceListId),
  },

  // Packages
  packages: {
    list: (priceListId?: number) =>
      ipcRenderer.invoke(IPC_CHANNELS.PACKAGE_LIST, priceListId),
    get: (id: number) =>
      ipcRenderer.invoke(IPC_CHANNELS.PACKAGE_GET, id),
    create: (data: any) =>
      ipcRenderer.invoke(IPC_CHANNELS.PACKAGE_CREATE, data),
    update: (id: number, data: any) =>
      ipcRenderer.invoke(IPC_CHANNELS.PACKAGE_UPDATE, id, data),
  },

  // Invoices
  invoices: {
    list: (options?: any) =>
      ipcRenderer.invoke(IPC_CHANNELS.INVOICE_LIST, options),
    get: (id: number) =>
      ipcRenderer.invoke(IPC_CHANNELS.INVOICE_GET, id),
    getByOrder: (orderId: number) =>
      ipcRenderer.invoke(IPC_CHANNELS.INVOICE_GET_BY_ORDER, orderId),
    create: (data: any) =>
      ipcRenderer.invoke(IPC_CHANNELS.INVOICE_CREATE, data),
    finalize: (id: number, userId?: number) =>
      ipcRenderer.invoke(IPC_CHANNELS.INVOICE_FINALIZE, id, userId),
    cancel: (id: number, reason: string, userId: number) =>
      ipcRenderer.invoke(IPC_CHANNELS.INVOICE_CANCEL, id, reason, userId),
    getPatientDues: (patientId: number) =>
      ipcRenderer.invoke(IPC_CHANNELS.INVOICE_PATIENT_DUES, patientId),
    getSummary: (fromDate?: string, toDate?: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.INVOICE_SUMMARY, fromDate, toDate),
  },

  // Payments
  payments: {
    record: (data: any) =>
      ipcRenderer.invoke(IPC_CHANNELS.PAYMENT_RECORD, data),
    list: (invoiceId: number) =>
      ipcRenderer.invoke(IPC_CHANNELS.PAYMENT_LIST, invoiceId),
    get: (id: number) =>
      ipcRenderer.invoke(IPC_CHANNELS.PAYMENT_GET, id),
    getPatientHistory: (patientId: number) =>
      ipcRenderer.invoke(IPC_CHANNELS.PAYMENT_PATIENT_HISTORY, patientId),
    getDailyCollection: (date?: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.PAYMENT_DAILY_COLLECTION, date),
    getOutstandingDues: () =>
      ipcRenderer.invoke(IPC_CHANNELS.PAYMENT_OUTSTANDING_DUES),
  },

  // Commissions
  commissions: {
    getDoctorCommissions: (doctorId: number, month?: number, year?: number) =>
      ipcRenderer.invoke(IPC_CHANNELS.COMMISSION_GET_DOCTOR_COMMISSIONS, doctorId, month, year),
    getMonthlySummary: (doctorId: number, month: number, year: number) =>
      ipcRenderer.invoke(IPC_CHANNELS.COMMISSION_GET_MONTHLY_SUMMARY, doctorId, month, year),
    getStatement: (doctorId: number, month: number, year: number) =>
      ipcRenderer.invoke(IPC_CHANNELS.COMMISSION_GET_STATEMENT, doctorId, month, year),
    getDoctorsWithPending: (month: number, year: number) =>
      ipcRenderer.invoke(IPC_CHANNELS.COMMISSION_GET_DOCTORS_WITH_PENDING, month, year),
    createSettlement: (doctorId: number, month: number, year: number, userId?: number) =>
      ipcRenderer.invoke(IPC_CHANNELS.COMMISSION_CREATE_SETTLEMENT, doctorId, month, year, userId),
    recordPayment: (settlementId: number, amount: number, paymentMode: string, paymentReference?: string, remarks?: string, userId?: number) =>
      ipcRenderer.invoke(IPC_CHANNELS.COMMISSION_RECORD_PAYMENT, settlementId, amount, paymentMode, paymentReference, remarks, userId),
    getSettlement: (settlementId: number) =>
      ipcRenderer.invoke(IPC_CHANNELS.COMMISSION_GET_SETTLEMENT, settlementId),
    listSettlements: (options?: any) =>
      ipcRenderer.invoke(IPC_CHANNELS.COMMISSION_LIST_SETTLEMENTS, options),
  },

  // QC (Quality Control)
  qc: {
    listParameters: (options?: any) => ipcRenderer.invoke(IPC_CHANNELS.QC_PARAMETER_LIST, options),
    getParameter: (id: number) => ipcRenderer.invoke(IPC_CHANNELS.QC_PARAMETER_GET, id),
    createParameter: (data: any) => ipcRenderer.invoke(IPC_CHANNELS.QC_PARAMETER_CREATE, data),
    updateParameter: (id: number, data: any, userId?: number) => ipcRenderer.invoke(IPC_CHANNELS.QC_PARAMETER_UPDATE, id, data, userId),
    recordEntry: (data: any) => ipcRenderer.invoke(IPC_CHANNELS.QC_ENTRY_RECORD, data),
    reviewEntry: (entryId: number, acceptanceStatus: string, reviewedBy: number, remarks?: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.QC_ENTRY_REVIEW, entryId, acceptanceStatus, reviewedBy, remarks),
    listEntries: (options?: any) => ipcRenderer.invoke(IPC_CHANNELS.QC_ENTRY_LIST, options),
    getTodayStatus: () => ipcRenderer.invoke(IPC_CHANNELS.QC_TODAY_STATUS),
    getLeveyJennings: (qcParameterId: number, count?: number) => ipcRenderer.invoke(IPC_CHANNELS.QC_LEVEY_JENNINGS, qcParameterId, count),
    listRules: () => ipcRenderer.invoke(IPC_CHANNELS.QC_RULES_LIST),
    checkWestgard: (qcParameterId: number) => ipcRenderer.invoke(IPC_CHANNELS.QC_WESTGARD_CHECK, qcParameterId),
    getTestStatus: (testId: number) => ipcRenderer.invoke(IPC_CHANNELS.QC_TEST_STATUS, testId),
    override: (data: { testId: number; sampleId: number; reason: string; overriddenBy: number }) =>
      ipcRenderer.invoke(IPC_CHANNELS.QC_OVERRIDE, data),
  },

  // Audit Trail
  audit: {
    log: (input: any) => ipcRenderer.invoke(IPC_CHANNELS.AUDIT_LOG, input),
    getLogs: (options?: any) => ipcRenderer.invoke(IPC_CHANNELS.AUDIT_GET_LOGS, options),
    getEntityHistory: (entity: string, entityId: number) => ipcRenderer.invoke(IPC_CHANNELS.AUDIT_ENTITY_HISTORY, entity, entityId),
    getRecentActivity: (limit?: number) => ipcRenderer.invoke(IPC_CHANNELS.AUDIT_RECENT_ACTIVITY, limit),
    getStats: (fromDate: string, toDate: string) => ipcRenderer.invoke(IPC_CHANNELS.AUDIT_STATS, fromDate, toDate),
  },

  // Alias for billing (for backward compatibility and clearer naming)
  get billing() {
    return this.priceLists
  },
}

// Expose to window
contextBridge.exposeInMainWorld('electronAPI', api)

// Type declaration for renderer
declare global {
  interface Window {
    electronAPI: typeof api
  }
}


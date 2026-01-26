"use strict";
const electron = require("electron");
const IPC_CHANNELS = {
  // Auth
  AUTH_LOGIN: "auth:login",
  AUTH_LOGOUT: "auth:logout",
  AUTH_GET_SESSION: "auth:getSession",
  // Patients
  PATIENT_CREATE: "patient:create",
  PATIENT_GET: "patient:get",
  PATIENT_SEARCH: "patient:search",
  PATIENT_LIST: "patient:list",
  // Orders
  ORDER_CREATE: "order:create",
  ORDER_GET: "order:get",
  ORDER_LIST: "order:list",
  ORDER_PENDING: "order:pending",
  // Samples
  SAMPLE_CREATE: "sample:create",
  SAMPLE_LIST: "sample:list",
  SAMPLE_RECEIVE: "sample:receive",
  SAMPLE_REJECT: "sample:reject",
  SAMPLE_PENDING: "sample:pending",
  // Tests
  TEST_LIST: "test:list",
  TEST_GET: "test:get",
  TEST_DELETE: "test:delete",
  // Test Wizard
  TEST_WIZARD_GET_DRAFTS: "testWizard:getDrafts",
  TEST_WIZARD_CREATE_DRAFT: "testWizard:createDraft",
  TEST_WIZARD_UPDATE_DRAFT: "testWizard:updateDraft",
  TEST_WIZARD_UPDATE_STEP: "testWizard:updateStep",
  TEST_WIZARD_SAVE_PARAMS: "testWizard:saveParams",
  TEST_WIZARD_PUBLISH: "testWizard:publish",
  TEST_WIZARD_CREATE_DRAFT_FROM_EXISTING: "testWizard:createDraftFromExisting",
  TEST_WIZARD_GET_DRAFT: "testWizard:getDraft",
  // To load draft details
  // Parameters
  PARAMETER_LIST: "parameter:list",
  // Reference Ranges
  REF_RANGE_LIST: "refRange:list",
  REF_RANGE_CREATE: "refRange:create",
  REF_RANGE_UPDATE: "refRange:update",
  REF_RANGE_DELETE: "refRange:delete",
  // Results
  RESULT_PENDING_SAMPLES: "result:pendingSamples",
  RESULT_GET: "result:get",
  RESULT_SAVE: "result:save",
  RESULT_SUBMIT: "result:submit",
  RESULT_VERIFY: "result:verify",
  RESULT_FINALIZE: "result:finalize",
  RESULT_GET_PREVIOUS: "result:getPrevious",
  // Users (Admin)
  USER_LIST: "user:list",
  USER_CREATE: "user:create",
  USER_UPDATE: "user:update",
  USER_TOGGLE_ACTIVE: "user:toggleActive",
  ROLE_LIST: "role:list",
  // Reports
  REPORT_GET_DATA: "report:getData",
  // Lab Settings
  LAB_SETTINGS_GET: "labSettings:get",
  LAB_SETTINGS_UPDATE: "labSettings:update",
  // Doctors
  DOCTOR_LIST: "doctor:list",
  DOCTOR_LIST_ALL: "doctor:listAll",
  DOCTOR_GET: "doctor:get",
  DOCTOR_CREATE: "doctor:create",
  DOCTOR_UPDATE: "doctor:update",
  DOCTOR_TOGGLE_ACTIVE: "doctor:toggleActive",
  DOCTOR_SEARCH: "doctor:search",
  // Price Lists
  PRICE_LIST_LIST: "priceList:list",
  PRICE_LIST_LIST_ALL: "priceList:listAll",
  PRICE_LIST_GET: "priceList:get",
  PRICE_LIST_GET_DEFAULT: "priceList:getDefault",
  PRICE_LIST_CREATE: "priceList:create",
  PRICE_LIST_UPDATE: "priceList:update",
  PRICE_LIST_DELETE: "priceList:delete",
  // Test Prices
  TEST_PRICE_LIST: "testPrice:list",
  TEST_PRICE_GET: "testPrice:get",
  TEST_PRICE_SET: "testPrice:set",
  TEST_PRICE_BULK_SET: "testPrice:bulkSet",
  TEST_PRICE_GET_FOR_TESTS: "testPrice:getForTests",
  // Packages
  PACKAGE_LIST: "package:list",
  PACKAGE_GET: "package:get",
  PACKAGE_CREATE: "package:create",
  PACKAGE_UPDATE: "package:update",
  // Invoices
  INVOICE_LIST: "invoice:list",
  INVOICE_GET: "invoice:get",
  INVOICE_GET_BY_ORDER: "invoice:getByOrder",
  INVOICE_CREATE: "invoice:create",
  INVOICE_FINALIZE: "invoice:finalize",
  INVOICE_CANCEL: "invoice:cancel",
  INVOICE_PATIENT_DUES: "invoice:patientDues",
  INVOICE_SUMMARY: "invoice:summary",
  // Payments
  PAYMENT_RECORD: "payment:record",
  PAYMENT_LIST: "payment:list",
  PAYMENT_GET: "payment:get",
  PAYMENT_PATIENT_HISTORY: "payment:patientHistory",
  PAYMENT_DAILY_COLLECTION: "payment:dailyCollection",
  PAYMENT_OUTSTANDING_DUES: "payment:outstandingDues",
  // Commissions
  COMMISSION_GET_DOCTOR_COMMISSIONS: "commission:getDoctorCommissions",
  COMMISSION_GET_MONTHLY_SUMMARY: "commission:getMonthlySummary",
  COMMISSION_GET_STATEMENT: "commission:getStatement",
  COMMISSION_GET_DOCTORS_WITH_PENDING: "commission:getDoctorsWithPending",
  COMMISSION_CREATE_SETTLEMENT: "commission:createSettlement",
  COMMISSION_RECORD_PAYMENT: "commission:recordPayment",
  COMMISSION_GET_SETTLEMENT: "commission:getSettlement",
  COMMISSION_LIST_SETTLEMENTS: "commission:listSettlements"
};
const api = {
  // Auth
  auth: {
    login: (username, password) => electron.ipcRenderer.invoke(IPC_CHANNELS.AUTH_LOGIN, username, password),
    logout: () => electron.ipcRenderer.invoke(IPC_CHANNELS.AUTH_LOGOUT),
    getSession: () => electron.ipcRenderer.invoke(IPC_CHANNELS.AUTH_GET_SESSION)
  },
  // Patients
  patients: {
    list: () => electron.ipcRenderer.invoke(IPC_CHANNELS.PATIENT_LIST),
    get: (id) => electron.ipcRenderer.invoke(IPC_CHANNELS.PATIENT_GET, id),
    search: (query) => electron.ipcRenderer.invoke(IPC_CHANNELS.PATIENT_SEARCH, query),
    create: (data) => electron.ipcRenderer.invoke(IPC_CHANNELS.PATIENT_CREATE, data)
  },
  // Tests
  tests: {
    list: () => electron.ipcRenderer.invoke(IPC_CHANNELS.TEST_LIST),
    get: (testId) => electron.ipcRenderer.invoke(IPC_CHANNELS.TEST_GET, testId),
    getParameters: (testVersionId) => electron.ipcRenderer.invoke(IPC_CHANNELS.PARAMETER_LIST, testVersionId),
    delete: (testId) => electron.ipcRenderer.invoke(IPC_CHANNELS.TEST_DELETE, testId)
  },
  // Test Wizard
  testWizard: {
    getDrafts: () => electron.ipcRenderer.invoke(IPC_CHANNELS.TEST_WIZARD_GET_DRAFTS),
    createDraft: (data) => electron.ipcRenderer.invoke(IPC_CHANNELS.TEST_WIZARD_CREATE_DRAFT, data),
    updateDraft: (id, data) => electron.ipcRenderer.invoke(IPC_CHANNELS.TEST_WIZARD_UPDATE_DRAFT, id, data),
    updateStep: (id, step) => electron.ipcRenderer.invoke(IPC_CHANNELS.TEST_WIZARD_UPDATE_STEP, id, step),
    saveParams: (id, params) => electron.ipcRenderer.invoke(IPC_CHANNELS.TEST_WIZARD_SAVE_PARAMS, id, params),
    publish: (id) => electron.ipcRenderer.invoke(IPC_CHANNELS.TEST_WIZARD_PUBLISH, id),
    createDraftFromExisting: (testId) => electron.ipcRenderer.invoke(IPC_CHANNELS.TEST_WIZARD_CREATE_DRAFT_FROM_EXISTING, testId),
    getDraft: (versionId) => electron.ipcRenderer.invoke(IPC_CHANNELS.TEST_WIZARD_GET_DRAFT, versionId)
  },
  // Orders
  orders: {
    list: () => electron.ipcRenderer.invoke(IPC_CHANNELS.ORDER_LIST),
    get: (orderId) => electron.ipcRenderer.invoke(IPC_CHANNELS.ORDER_GET, orderId),
    create: (data) => electron.ipcRenderer.invoke(IPC_CHANNELS.ORDER_CREATE, data),
    getPending: () => electron.ipcRenderer.invoke(IPC_CHANNELS.ORDER_PENDING)
  },
  // Samples
  samples: {
    list: (status) => electron.ipcRenderer.invoke(IPC_CHANNELS.SAMPLE_LIST, status),
    create: (orderTestId) => electron.ipcRenderer.invoke(IPC_CHANNELS.SAMPLE_CREATE, orderTestId),
    receive: (sampleId) => electron.ipcRenderer.invoke(IPC_CHANNELS.SAMPLE_RECEIVE, sampleId),
    reject: (sampleId, reason) => electron.ipcRenderer.invoke(IPC_CHANNELS.SAMPLE_REJECT, sampleId, reason),
    getPending: () => electron.ipcRenderer.invoke(IPC_CHANNELS.SAMPLE_PENDING)
  },
  // Reference Ranges
  refRanges: {
    list: (parameterId) => electron.ipcRenderer.invoke(IPC_CHANNELS.REF_RANGE_LIST, parameterId),
    create: (data) => electron.ipcRenderer.invoke(IPC_CHANNELS.REF_RANGE_CREATE, data),
    update: (id, data) => electron.ipcRenderer.invoke(IPC_CHANNELS.REF_RANGE_UPDATE, id, data),
    delete: (id) => electron.ipcRenderer.invoke(IPC_CHANNELS.REF_RANGE_DELETE, id)
  },
  // Users (Admin)
  users: {
    list: () => electron.ipcRenderer.invoke(IPC_CHANNELS.USER_LIST),
    create: (data) => electron.ipcRenderer.invoke(IPC_CHANNELS.USER_CREATE, data),
    update: (id, data) => electron.ipcRenderer.invoke(IPC_CHANNELS.USER_UPDATE, id, data),
    toggleActive: (id) => electron.ipcRenderer.invoke(IPC_CHANNELS.USER_TOGGLE_ACTIVE, id),
    listRoles: () => electron.ipcRenderer.invoke(IPC_CHANNELS.ROLE_LIST)
  },
  // Results
  results: {
    getPendingSamples: () => electron.ipcRenderer.invoke(IPC_CHANNELS.RESULT_PENDING_SAMPLES),
    get: (sampleId) => electron.ipcRenderer.invoke(IPC_CHANNELS.RESULT_GET, sampleId),
    save: (data) => electron.ipcRenderer.invoke(IPC_CHANNELS.RESULT_SAVE, data),
    submit: (sampleId) => electron.ipcRenderer.invoke(IPC_CHANNELS.RESULT_SUBMIT, sampleId),
    verify: (sampleId, verifiedBy) => electron.ipcRenderer.invoke(IPC_CHANNELS.RESULT_VERIFY, sampleId, verifiedBy),
    finalize: (sampleId) => electron.ipcRenderer.invoke(IPC_CHANNELS.RESULT_FINALIZE, sampleId),
    getPrevious: (patientId, testId, currentSampleId) => electron.ipcRenderer.invoke(IPC_CHANNELS.RESULT_GET_PREVIOUS, patientId, testId, currentSampleId)
  },
  // Reports
  reports: {
    getData: (sampleId) => electron.ipcRenderer.invoke(IPC_CHANNELS.REPORT_GET_DATA, sampleId)
  },
  // Lab Settings
  labSettings: {
    get: () => electron.ipcRenderer.invoke(IPC_CHANNELS.LAB_SETTINGS_GET),
    update: (key, value) => electron.ipcRenderer.invoke(IPC_CHANNELS.LAB_SETTINGS_UPDATE, key, value)
  },
  // Doctors
  doctors: {
    list: () => electron.ipcRenderer.invoke(IPC_CHANNELS.DOCTOR_LIST),
    listAll: () => electron.ipcRenderer.invoke(IPC_CHANNELS.DOCTOR_LIST_ALL),
    get: (id) => electron.ipcRenderer.invoke(IPC_CHANNELS.DOCTOR_GET, id),
    create: (data) => electron.ipcRenderer.invoke(IPC_CHANNELS.DOCTOR_CREATE, data),
    update: (id, data) => electron.ipcRenderer.invoke(IPC_CHANNELS.DOCTOR_UPDATE, id, data),
    toggleActive: (id) => electron.ipcRenderer.invoke(IPC_CHANNELS.DOCTOR_TOGGLE_ACTIVE, id),
    search: (query) => electron.ipcRenderer.invoke(IPC_CHANNELS.DOCTOR_SEARCH, query)
  },
  // Price Lists
  priceLists: {
    list: () => electron.ipcRenderer.invoke(IPC_CHANNELS.PRICE_LIST_LIST),
    listAll: () => electron.ipcRenderer.invoke(IPC_CHANNELS.PRICE_LIST_LIST_ALL),
    get: (id) => electron.ipcRenderer.invoke(IPC_CHANNELS.PRICE_LIST_GET, id),
    getDefault: () => electron.ipcRenderer.invoke(IPC_CHANNELS.PRICE_LIST_GET_DEFAULT),
    create: (data) => electron.ipcRenderer.invoke(IPC_CHANNELS.PRICE_LIST_CREATE, data),
    update: (id, data) => electron.ipcRenderer.invoke(IPC_CHANNELS.PRICE_LIST_UPDATE, id, data),
    delete: (id) => electron.ipcRenderer.invoke(IPC_CHANNELS.PRICE_LIST_DELETE, id)
  },
  // Test Prices
  testPrices: {
    list: (priceListId) => electron.ipcRenderer.invoke(IPC_CHANNELS.TEST_PRICE_LIST, priceListId),
    get: (testId, priceListId) => electron.ipcRenderer.invoke(IPC_CHANNELS.TEST_PRICE_GET, testId, priceListId),
    set: (priceListId, testId, data) => electron.ipcRenderer.invoke(IPC_CHANNELS.TEST_PRICE_SET, priceListId, testId, data),
    bulkSet: (priceListId, prices) => electron.ipcRenderer.invoke(IPC_CHANNELS.TEST_PRICE_BULK_SET, priceListId, prices),
    getForTests: (testIds, priceListId) => electron.ipcRenderer.invoke(IPC_CHANNELS.TEST_PRICE_GET_FOR_TESTS, testIds, priceListId)
  },
  // Packages
  packages: {
    list: (priceListId) => electron.ipcRenderer.invoke(IPC_CHANNELS.PACKAGE_LIST, priceListId),
    get: (id) => electron.ipcRenderer.invoke(IPC_CHANNELS.PACKAGE_GET, id),
    create: (data) => electron.ipcRenderer.invoke(IPC_CHANNELS.PACKAGE_CREATE, data),
    update: (id, data) => electron.ipcRenderer.invoke(IPC_CHANNELS.PACKAGE_UPDATE, id, data)
  },
  // Invoices
  invoices: {
    list: (options) => electron.ipcRenderer.invoke(IPC_CHANNELS.INVOICE_LIST, options),
    get: (id) => electron.ipcRenderer.invoke(IPC_CHANNELS.INVOICE_GET, id),
    getByOrder: (orderId) => electron.ipcRenderer.invoke(IPC_CHANNELS.INVOICE_GET_BY_ORDER, orderId),
    create: (data) => electron.ipcRenderer.invoke(IPC_CHANNELS.INVOICE_CREATE, data),
    finalize: (id, userId) => electron.ipcRenderer.invoke(IPC_CHANNELS.INVOICE_FINALIZE, id, userId),
    cancel: (id, reason, userId) => electron.ipcRenderer.invoke(IPC_CHANNELS.INVOICE_CANCEL, id, reason, userId),
    getPatientDues: (patientId) => electron.ipcRenderer.invoke(IPC_CHANNELS.INVOICE_PATIENT_DUES, patientId),
    getSummary: (fromDate, toDate) => electron.ipcRenderer.invoke(IPC_CHANNELS.INVOICE_SUMMARY, fromDate, toDate)
  },
  // Payments
  payments: {
    record: (data) => electron.ipcRenderer.invoke(IPC_CHANNELS.PAYMENT_RECORD, data),
    list: (invoiceId) => electron.ipcRenderer.invoke(IPC_CHANNELS.PAYMENT_LIST, invoiceId),
    get: (id) => electron.ipcRenderer.invoke(IPC_CHANNELS.PAYMENT_GET, id),
    getPatientHistory: (patientId) => electron.ipcRenderer.invoke(IPC_CHANNELS.PAYMENT_PATIENT_HISTORY, patientId),
    getDailyCollection: (date) => electron.ipcRenderer.invoke(IPC_CHANNELS.PAYMENT_DAILY_COLLECTION, date),
    getOutstandingDues: () => electron.ipcRenderer.invoke(IPC_CHANNELS.PAYMENT_OUTSTANDING_DUES)
  },
  // Commissions
  commissions: {
    getDoctorCommissions: (doctorId, month, year) => electron.ipcRenderer.invoke(IPC_CHANNELS.COMMISSION_GET_DOCTOR_COMMISSIONS, doctorId, month, year),
    getMonthlySummary: (doctorId, month, year) => electron.ipcRenderer.invoke(IPC_CHANNELS.COMMISSION_GET_MONTHLY_SUMMARY, doctorId, month, year),
    getStatement: (doctorId, month, year) => electron.ipcRenderer.invoke(IPC_CHANNELS.COMMISSION_GET_STATEMENT, doctorId, month, year),
    getDoctorsWithPending: (month, year) => electron.ipcRenderer.invoke(IPC_CHANNELS.COMMISSION_GET_DOCTORS_WITH_PENDING, month, year),
    createSettlement: (doctorId, month, year, userId) => electron.ipcRenderer.invoke(IPC_CHANNELS.COMMISSION_CREATE_SETTLEMENT, doctorId, month, year, userId),
    recordPayment: (settlementId, amount, paymentMode, paymentReference, remarks, userId) => electron.ipcRenderer.invoke(IPC_CHANNELS.COMMISSION_RECORD_PAYMENT, settlementId, amount, paymentMode, paymentReference, remarks, userId),
    getSettlement: (settlementId) => electron.ipcRenderer.invoke(IPC_CHANNELS.COMMISSION_GET_SETTLEMENT, settlementId),
    listSettlements: (options) => electron.ipcRenderer.invoke(IPC_CHANNELS.COMMISSION_LIST_SETTLEMENTS, options)
  },
  // Alias for billing (for backward compatibility and clearer naming)
  get billing() {
    return this.priceLists;
  }
};
electron.contextBridge.exposeInMainWorld("electronAPI", api);

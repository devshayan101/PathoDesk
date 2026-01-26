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
  ROLE_LIST: "role:list"
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
  }
};
electron.contextBridge.exposeInMainWorld("electronAPI", api);

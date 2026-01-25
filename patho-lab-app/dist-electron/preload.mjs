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
  // Parameters
  PARAMETER_LIST: "parameter:list",
  // Reference Ranges
  REF_RANGE_LIST: "refRange:list",
  REF_RANGE_CREATE: "refRange:create",
  REF_RANGE_UPDATE: "refRange:update",
  REF_RANGE_DELETE: "refRange:delete"
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
    getParameters: (testVersionId) => electron.ipcRenderer.invoke(IPC_CHANNELS.PARAMETER_LIST, testVersionId)
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
  }
};
electron.contextBridge.exposeInMainWorld("electronAPI", api);

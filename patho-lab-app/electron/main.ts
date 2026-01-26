import { app, BrowserWindow, ipcMain } from 'electron'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { initDatabase, closeDatabase } from './database/db'
import * as authService from './services/authService'
import * as patientService from './services/patientService'
import * as testService from './services/testService'
import * as orderService from './services/orderService'
import * as sampleService from './services/sampleService'
import * as userService from './services/userService'
import * as resultService from './services/resultService'
import * as reportService from './services/reportService'
import * as doctorService from './services/doctorService'
import * as billingService from './services/billingService'
import * as invoiceService from './services/invoiceService'
import * as paymentService from './services/paymentService'
import { IPC_CHANNELS } from '../src/types'

const require = createRequire(import.meta.url)
const __dirname = path.dirname(fileURLToPath(import.meta.url))

process.env.APP_ROOT = path.join(__dirname, '..')

export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, 'public') : RENDERER_DIST

let win: BrowserWindow | null

function createWindow() {
  // Initialize database (synchronous with better-sqlite3)
  initDatabase()

  win = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 700,
    icon: path.join(process.env.VITE_PUBLIC || '', 'electron-vite.svg'),
    backgroundColor: '#0a0f1a',
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  })

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL)
    win.webContents.openDevTools()
  } else {
    win.loadFile(path.join(RENDERER_DIST, 'index.html'))
  }
}

// Register all IPC handlers
function registerIpcHandlers() {
  // Auth
  ipcMain.handle(IPC_CHANNELS.AUTH_LOGIN, async (_, username: string, password: string) => {
    return authService.login(username, password)
  })

  ipcMain.handle(IPC_CHANNELS.AUTH_LOGOUT, () => {
    authService.logout()
    return { success: true }
  })

  ipcMain.handle(IPC_CHANNELS.AUTH_GET_SESSION, () => {
    return authService.getSession()
  })

  // Patients
  ipcMain.handle(IPC_CHANNELS.PATIENT_LIST, () => {
    return patientService.listPatients()
  })

  ipcMain.handle(IPC_CHANNELS.PATIENT_GET, (_, id: number) => {
    return patientService.getPatient(id)
  })

  ipcMain.handle(IPC_CHANNELS.PATIENT_SEARCH, (_, query: string) => {
    return patientService.searchPatients(query)
  })

  ipcMain.handle(IPC_CHANNELS.PATIENT_CREATE, (_, data) => {
    return patientService.createPatient(data)
  })

  // Tests
  ipcMain.handle(IPC_CHANNELS.TEST_LIST, () => {
    return testService.listTests()
  })

  ipcMain.handle(IPC_CHANNELS.TEST_GET, (_, testId: number) => {
    return testService.getTest(testId)
  })

  ipcMain.handle(IPC_CHANNELS.PARAMETER_LIST, (_, testVersionId: number) => {
    return testService.getTestParameters(testVersionId)
  })

  ipcMain.handle(IPC_CHANNELS.TEST_DELETE, (_, testId: number) => {
    return testService.deleteTest(testId)
  })

  // Test Wizard
  ipcMain.handle(IPC_CHANNELS.TEST_WIZARD_GET_DRAFTS, () => {
    return testService.getDrafts()
  })

  ipcMain.handle(IPC_CHANNELS.TEST_WIZARD_CREATE_DRAFT, (_, data) => {
    return testService.createTestDraft(data)
  })

  ipcMain.handle(IPC_CHANNELS.TEST_WIZARD_UPDATE_DRAFT, (_, id: number, data) => {
    return testService.updateTestDraft(id, data)
  })

  ipcMain.handle(IPC_CHANNELS.TEST_WIZARD_UPDATE_STEP, (_, id: number, step: number) => {
    return testService.updateWizardStep(id, step)
  })

  ipcMain.handle(IPC_CHANNELS.TEST_WIZARD_SAVE_PARAMS, (_, id: number, params: any[]) => {
    return testService.saveTestParameters(id, params)
  })

  ipcMain.handle(IPC_CHANNELS.TEST_WIZARD_PUBLISH, (_, id: number) => {
    return testService.publishTest(id)
  })

  ipcMain.handle(IPC_CHANNELS.TEST_WIZARD_CREATE_DRAFT_FROM_EXISTING, (_, testId: number) => {
    return testService.createDraftFromExisting(testId)
  })

  // We need a way to get draft details (which is essentially getTest + getParameters)
  ipcMain.handle(IPC_CHANNELS.TEST_WIZARD_GET_DRAFT, (_, versionId: number) => {
    const version = testService.getTest(versionId) // This actually gets by test_id? No, getTest gets by test_id.
    // Wait, getTest(testId) returns the latest version.
    // We need getTestVersion(versionId).
    // Let's check testService again.
    // testService.getTest takes testId.
    // We need a new service method getTestVersion(versionId).
    // I missed adding that to testService.ts. 
    // Actually, I can use a direct query here or better, add it to service.
    // For now, let's implement the handler by calling a new service method I will add.
    return testService.getTestVersion(versionId)
  })

  // Reference Ranges
  ipcMain.handle(IPC_CHANNELS.REF_RANGE_LIST, (_, parameterId: number) => {
    return testService.listReferenceRanges(parameterId)
  })

  ipcMain.handle(IPC_CHANNELS.REF_RANGE_CREATE, (_, data) => {
    try {
      return { success: true, id: testService.createReferenceRange(data) }
    } catch (e: any) {
      return { success: false, error: e.message }
    }
  })

  ipcMain.handle(IPC_CHANNELS.REF_RANGE_UPDATE, (_, id: number, data) => {
    testService.updateReferenceRange(id, data)
    return { success: true }
  })

  ipcMain.handle(IPC_CHANNELS.REF_RANGE_DELETE, (_, id: number) => {
    testService.deleteReferenceRange(id)
    return { success: true }
  })

  // Orders
  ipcMain.handle(IPC_CHANNELS.ORDER_LIST, () => {
    return orderService.listOrders()
  })

  ipcMain.handle(IPC_CHANNELS.ORDER_GET, (_, orderId: number) => {
    return orderService.getOrder(orderId)
  })

  ipcMain.handle(IPC_CHANNELS.ORDER_CREATE, (_, data) => {
    return orderService.createOrder(data)
  })

  ipcMain.handle(IPC_CHANNELS.ORDER_PENDING, () => {
    return orderService.getPendingOrders()
  })

  // Samples
  ipcMain.handle(IPC_CHANNELS.SAMPLE_LIST, (_, status?: string) => {
    return sampleService.listSamples(status)
  })

  ipcMain.handle(IPC_CHANNELS.SAMPLE_CREATE, (_, orderTestId: number) => {
    return sampleService.createSample(orderTestId)
  })

  ipcMain.handle(IPC_CHANNELS.SAMPLE_RECEIVE, (_, sampleId: number) => {
    return sampleService.receiveSample(sampleId)
  })

  ipcMain.handle(IPC_CHANNELS.SAMPLE_REJECT, (_, sampleId: number, reason: string) => {
    return sampleService.rejectSample(sampleId, reason)
  })

  ipcMain.handle(IPC_CHANNELS.SAMPLE_PENDING, () => {
    return sampleService.getPendingSamples()
  })

  // Users (Admin)
  ipcMain.handle(IPC_CHANNELS.USER_LIST, () => {
    return userService.listUsers()
  })

  ipcMain.handle(IPC_CHANNELS.USER_CREATE, (_, data) => {
    return userService.createUser(data)
  })

  ipcMain.handle(IPC_CHANNELS.USER_UPDATE, (_, id: number, data) => {
    return userService.updateUser(id, data)
  })

  ipcMain.handle(IPC_CHANNELS.USER_TOGGLE_ACTIVE, (_, id: number) => {
    return userService.toggleUserActive(id)
  })

  ipcMain.handle(IPC_CHANNELS.ROLE_LIST, () => {
    return userService.listRoles()
  })

  // Results
  ipcMain.handle(IPC_CHANNELS.RESULT_PENDING_SAMPLES, () => {
    return resultService.listPendingSamples()
  })

  ipcMain.handle(IPC_CHANNELS.RESULT_GET, (_, sampleId: number) => {
    return resultService.getSampleResults(sampleId)
  })

  ipcMain.handle(IPC_CHANNELS.RESULT_SAVE, (_, data) => {
    return resultService.saveResultValues(data)
  })

  ipcMain.handle(IPC_CHANNELS.RESULT_SUBMIT, (_, sampleId: number) => {
    return resultService.submitResults(sampleId)
  })

  ipcMain.handle(IPC_CHANNELS.RESULT_VERIFY, (_, sampleId: number, verifiedBy: number) => {
    return resultService.verifyResults(sampleId, verifiedBy)
  })

  ipcMain.handle(IPC_CHANNELS.RESULT_FINALIZE, (_, sampleId: number) => {
    return resultService.finalizeResults(sampleId)
  })

  ipcMain.handle(IPC_CHANNELS.RESULT_GET_PREVIOUS, (_, patientId: number, testId: number, currentSampleId: number) => {
    return resultService.getPreviousResults(patientId, testId, currentSampleId)
  })

  // Reports
  ipcMain.handle(IPC_CHANNELS.REPORT_GET_DATA, (_, sampleId: number) => {
    return reportService.getReportData(sampleId)
  })

  // Lab Settings
  ipcMain.handle(IPC_CHANNELS.LAB_SETTINGS_GET, () => {
    return reportService.getLabSettings()
  })

  ipcMain.handle(IPC_CHANNELS.LAB_SETTINGS_UPDATE, (_, key: string, value: string) => {
    reportService.updateLabSetting(key, value)
    return { success: true }
  })

  // Doctors
  ipcMain.handle(IPC_CHANNELS.DOCTOR_LIST, () => {
    return doctorService.listDoctors()
  })

  ipcMain.handle(IPC_CHANNELS.DOCTOR_LIST_ALL, () => {
    return doctorService.listAllDoctors()
  })

  ipcMain.handle(IPC_CHANNELS.DOCTOR_GET, (_, id: number) => {
    return doctorService.getDoctor(id)
  })

  ipcMain.handle(IPC_CHANNELS.DOCTOR_CREATE, (_, data) => {
    return doctorService.createDoctor(data)
  })

  ipcMain.handle(IPC_CHANNELS.DOCTOR_UPDATE, (_, id: number, data) => {
    return doctorService.updateDoctor(id, data)
  })

  ipcMain.handle(IPC_CHANNELS.DOCTOR_TOGGLE_ACTIVE, (_, id: number) => {
    return doctorService.toggleDoctorActive(id)
  })

  ipcMain.handle(IPC_CHANNELS.DOCTOR_SEARCH, (_, query: string) => {
    return doctorService.searchDoctors(query)
  })

  // Price Lists
  ipcMain.handle(IPC_CHANNELS.PRICE_LIST_LIST, () => {
    return billingService.listPriceLists()
  })

  ipcMain.handle(IPC_CHANNELS.PRICE_LIST_LIST_ALL, () => {
    return billingService.listAllPriceLists()
  })

  ipcMain.handle(IPC_CHANNELS.PRICE_LIST_GET, (_, id: number) => {
    return billingService.getPriceList(id)
  })

  ipcMain.handle(IPC_CHANNELS.PRICE_LIST_GET_DEFAULT, () => {
    return billingService.getDefaultPriceList()
  })

  ipcMain.handle(IPC_CHANNELS.PRICE_LIST_CREATE, (_, data) => {
    return billingService.createPriceList(data)
  })

  ipcMain.handle(IPC_CHANNELS.PRICE_LIST_UPDATE, (_, id: number, data) => {
    return billingService.updatePriceList(id, data)
  })

  ipcMain.handle(IPC_CHANNELS.PRICE_LIST_DELETE, (_, id: number) => {
    return billingService.deletePriceList(id)
  })

  // Test Prices
  ipcMain.handle(IPC_CHANNELS.TEST_PRICE_LIST, (_, priceListId: number) => {
    return billingService.listTestPrices(priceListId)
  })

  ipcMain.handle(IPC_CHANNELS.TEST_PRICE_GET, (_, testId: number, priceListId: number) => {
    return billingService.getTestPrice(testId, priceListId)
  })

  ipcMain.handle(IPC_CHANNELS.TEST_PRICE_SET, (_, priceListId: number, testId: number, data) => {
    return billingService.setTestPrice(priceListId, testId, data)
  })

  ipcMain.handle(IPC_CHANNELS.TEST_PRICE_BULK_SET, (_, priceListId: number, prices: any[]) => {
    return billingService.bulkSetTestPrices(priceListId, prices)
  })

  ipcMain.handle(IPC_CHANNELS.TEST_PRICE_GET_FOR_TESTS, (_, testIds: number[], priceListId: number) => {
    const priceMap = billingService.getTestPricesForTests(testIds, priceListId)
    return Object.fromEntries(priceMap)
  })

  // Packages
  ipcMain.handle(IPC_CHANNELS.PACKAGE_LIST, (_, priceListId?: number) => {
    return billingService.listPackages(priceListId)
  })

  ipcMain.handle(IPC_CHANNELS.PACKAGE_GET, (_, id: number) => {
    return billingService.getPackage(id)
  })

  ipcMain.handle(IPC_CHANNELS.PACKAGE_CREATE, (_, data) => {
    return billingService.createPackage(data)
  })

  ipcMain.handle(IPC_CHANNELS.PACKAGE_UPDATE, (_, id: number, data) => {
    return billingService.updatePackage(id, data)
  })

  // Invoices
  ipcMain.handle(IPC_CHANNELS.INVOICE_LIST, (_, options) => {
    return invoiceService.listInvoices(options)
  })

  ipcMain.handle(IPC_CHANNELS.INVOICE_GET, (_, id: number) => {
    return invoiceService.getInvoice(id)
  })

  ipcMain.handle(IPC_CHANNELS.INVOICE_GET_BY_ORDER, (_, orderId: number) => {
    return invoiceService.getInvoiceByOrder(orderId)
  })

  ipcMain.handle(IPC_CHANNELS.INVOICE_CREATE, (_, data) => {
    return invoiceService.createInvoice(data)
  })

  ipcMain.handle(IPC_CHANNELS.INVOICE_FINALIZE, (_, id: number, userId?: number) => {
    return invoiceService.finalizeInvoice(id, userId)
  })

  ipcMain.handle(IPC_CHANNELS.INVOICE_CANCEL, (_, id: number, reason: string, userId: number) => {
    return invoiceService.cancelInvoice(id, reason, userId)
  })

  ipcMain.handle(IPC_CHANNELS.INVOICE_PATIENT_DUES, (_, patientId: number) => {
    return invoiceService.getPatientDues(patientId)
  })

  ipcMain.handle(IPC_CHANNELS.INVOICE_SUMMARY, (_, fromDate?: string, toDate?: string) => {
    return invoiceService.getInvoiceSummary(fromDate, toDate)
  })

  // Payments
  ipcMain.handle(IPC_CHANNELS.PAYMENT_RECORD, (_, data) => {
    return paymentService.recordPayment(data)
  })

  ipcMain.handle(IPC_CHANNELS.PAYMENT_LIST, (_, invoiceId: number) => {
    return paymentService.listPayments(invoiceId)
  })

  ipcMain.handle(IPC_CHANNELS.PAYMENT_GET, (_, id: number) => {
    return paymentService.getPayment(id)
  })

  ipcMain.handle(IPC_CHANNELS.PAYMENT_PATIENT_HISTORY, (_, patientId: number) => {
    return paymentService.getPatientPaymentHistory(patientId)
  })

  ipcMain.handle(IPC_CHANNELS.PAYMENT_DAILY_COLLECTION, (_, date?: string) => {
    return paymentService.getDailyCollection(date)
  })

  ipcMain.handle(IPC_CHANNELS.PAYMENT_OUTSTANDING_DUES, () => {
    return paymentService.getOutstandingDues()
  })
}

app.on('window-all-closed', () => {
  closeDatabase()
  if (process.platform !== 'darwin') {
    app.quit()
    win = null
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

app.whenReady().then(() => {
  registerIpcHandlers()
  createWindow()
})

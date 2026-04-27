import { useEffect, useRef, useState } from 'react'
import ActionPanel from './components/ActionPanel.jsx'
import ApprovalConfirmationPage from './components/ApprovalConfirmationPage.jsx'
import AuditTrailPage from './components/AuditTrailPage.jsx'
import ConfirmDialog from './components/ConfirmDialog.jsx'
import CreateRequestForm from './components/CreateRequestForm.jsx'
import DocumentPanel from './components/DocumentPanel.jsx'
import ForgotPasswordForm from './components/ForgotPasswordForm.jsx'
import LoginForm from './components/LoginForm.jsx'
import LoadingOverlay from './components/LoadingOverlay.jsx'
import Modal from './components/Modal.jsx'
import PanelExpandButton from './components/PanelExpandButton.jsx'
import PurchaseOrderDirectoryPage from './components/PurchaseOrderDirectoryPage.jsx'
import PurchaseOrderPage from './components/PurchaseOrderPage.jsx'
import RfpDirectoryPage from './components/RfpDirectoryPage.jsx'
import RequestForPaymentPage from './components/RequestForPaymentPage.jsx'
import RequestAdminPanel from './components/RequestAdminPanel.jsx'
import RequestList from './components/RequestList.jsx'
import RequestSummary from './components/RequestSummary.jsx'
import RequestWorkspacePage from './components/RequestWorkspacePage.jsx'
import ResetPasswordForm from './components/ResetPasswordForm.jsx'
import SettingsPage from './components/SettingsPage.jsx'
import SupplierForm from './components/SupplierForm.jsx'
import SupplierManagementPage from './components/SupplierManagementPage.jsx'
import ToastStack from './components/ToastStack.jsx'
import UserEditorPanel from './components/UserEditorPanel.jsx'
import UserManagementPanel from './components/UserManagementPanel.jsx'
import WorkflowTimeline from './components/WorkflowTimeline.jsx'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api'
const ART_GALLERY_URL =
  import.meta.env.VITE_ART_GALLERY_URL ||
  'https://art-inventory-self.vercel.app'
const API_ORIGIN = API_BASE_URL.replace(/\/api$/, '')
const DASHBOARD_REFRESH_MS = 5000
const DEFAULT_WORKFLOW_STAGES = [
  'Purchase Request',
  'Review',
  'Request for Payment',
  'Approval',
  'Prepare PO',
  'Approve PO',
  'Send PO',
  'Delivery',
  'Inspection',
  'Invoice',
  'Matching',
  'Payment',
  'Filing',
]
const DEFAULT_COMPANY_SETTINGS = {
  companyName: 'Januarius Holdings Inc.',
  logoUrl: '/JANUARIUS.ico',
  address:
    'Januarius Holdings Inc., Head Office, Makati City, Metro Manila, Philippines',
  generalAccountantName: '',
  chiefInvestmentOfficerName: '',
  workflowStages: DEFAULT_WORKFLOW_STAGES,
}

function getStoredTheme() {
  try {
    return localStorage.getItem('procurement-theme') || 'light'
  } catch {
    return 'light'
  }
}

function getOfficeDeliveryAddress(branch, fallbackAddress = '') {
  return (
    OFFICE_ADDRESS_MAP[branch] ||
    fallbackAddress ||
    'Januarius Holdings Inc., Head Office, Makati City, Metro Manila, Philippines'
  )
}

function getInitialIdentityForm(defaults = DEFAULT_COMPANY_SETTINGS) {
  return {
    branchName: '',
    address: defaults.address,
    logoUrl: defaults.logoUrl,
  }
}

function getEffectiveWorkflowStages(item, fallbackStages = DEFAULT_WORKFLOW_STAGES) {
  if (Array.isArray(item?.workflowStages) && item.workflowStages.length) {
    return item.workflowStages
  }

  return Array.isArray(fallbackStages) && fallbackStages.length
    ? fallbackStages
    : DEFAULT_WORKFLOW_STAGES
}

function getCompanyIdentityForBranch(branch, companySettings, identities = []) {
  const normalizedBranch = String(branch || '')
    .trim()
    .toLowerCase()

  if (!normalizedBranch) {
    return companySettings
  }

  const matchedIdentity = identities.find(
    (identity) =>
      String(identity.branchName || '')
        .trim()
        .toLowerCase() === normalizedBranch,
  )

  return matchedIdentity || companySettings
}

function getBranchDeliveryAddress(branch, companySettings, identities = []) {
  const matchedIdentity = getCompanyIdentityForBranch(
    branch,
    companySettings,
    identities,
  )

  return (
    String(matchedIdentity?.address || '').trim() ||
    getOfficeDeliveryAddress(
      branch,
      companySettings?.address || DEFAULT_COMPANY_SETTINGS.address,
    )
  )
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () =>
      reject(new Error('Unable to read the selected image.'))
    reader.readAsDataURL(file)
  })
}

function loadImageElement(source) {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () =>
      reject(new Error('Unable to process the selected image.'))
    image.src = source
  })
}

async function optimizeLogoFile(file) {
  const fileName = String(file?.name || '').toLowerCase()
  const isIco = file?.type === 'image/x-icon' || fileName.endsWith('.ico')

  if (isIco) {
    if ((file?.size || 0) > 600 * 1024) {
      throw new Error('ICO logo is too large. Please use a smaller icon file.')
    }

    return readFileAsDataUrl(file)
  }

  const source = await readFileAsDataUrl(file)
  const image = await loadImageElement(source)
  const maxDimension = 320
  const scale = Math.min(
    1,
    maxDimension / Math.max(image.width || 1, image.height || 1),
  )
  const width = Math.max(1, Math.round((image.width || 1) * scale))
  const height = Math.max(1, Math.round((image.height || 1) * scale))
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height

  const context = canvas.getContext('2d')
  if (!context) {
    throw new Error('Unable to prepare the selected image.')
  }

  context.clearRect(0, 0, width, height)
  context.drawImage(image, 0, 0, width, height)

  return canvas.toDataURL('image/webp', 0.82)
}

async function optimizeDocumentFile(file) {
  if (!file) {
    return null
  }

  if (!String(file.type || '').startsWith('image/')) {
    return file
  }

  const source = await readFileAsDataUrl(file)
  const image = await loadImageElement(source)
  const maxDimension = 1800
  const scale = Math.min(
    1,
    maxDimension / Math.max(image.width || 1, image.height || 1),
  )
  const width = Math.max(1, Math.round((image.width || 1) * scale))
  const height = Math.max(1, Math.round((image.height || 1) * scale))
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height

  const context = canvas.getContext('2d')
  if (!context) {
    throw new Error('Unable to optimize the selected image file.')
  }

  context.clearRect(0, 0, width, height)
  context.drawImage(image, 0, 0, width, height)

  const blob = await new Promise((resolve, reject) => {
    canvas.toBlob(
      (nextBlob) => {
        if (!nextBlob) {
          reject(new Error('Unable to optimize the selected image file.'))
          return
        }

        resolve(nextBlob)
      },
      'image/webp',
      0.8,
    )
  })

  const optimizedBaseName = String(file.name || 'document').replace(
    /\.[^.]+$/,
    '',
  )
  return new File([blob], `${optimizedBaseName}.webp`, {
    type: 'image/webp',
    lastModified: Date.now(),
  })
}

function getStoredSession() {
  try {
    const localSession = JSON.parse(
      localStorage.getItem('procurement-session') || 'null',
    )

    if (localSession?.token) {
      return localSession
    }

    const browserSession = JSON.parse(
      sessionStorage.getItem('procurement-session') || 'null',
    )

    if (browserSession?.token) {
      return browserSession
    }

    return null
  } catch {
    return null
  }
}

function getPendingWorkspaceLink() {
  if (typeof window === 'undefined') {
    return null
  }

  const params = new URLSearchParams(window.location.search)
  const requestId = String(params.get('requestId') || '').trim()
  const requestNumber = String(params.get('requestNumber') || '').trim()
  const open = String(params.get('open') || '').trim()
  const stage = String(params.get('stage') || '').trim()

  if (!requestId && !requestNumber) {
    return null
  }

  return {
    requestId,
    requestNumber,
    open: open || 'workspace',
    stage,
  }
}

function getAuthViewFromUrl() {
  if (typeof window === 'undefined') {
    return 'login'
  }

  const params = new URLSearchParams(window.location.search)
  const auth = String(params.get('auth') || '').trim()
  const resetToken = String(params.get('resetToken') || '').trim()

  if (resetToken || auth === 'reset-password') {
    return 'reset-password'
  }

  if (auth === 'forgot-password') {
    return 'forgot-password'
  }

  return 'login'
}

function getResetPasswordTokenFromUrl() {
  if (typeof window === 'undefined') {
    return ''
  }

  const params = new URLSearchParams(window.location.search)
  return String(params.get('resetToken') || '').trim()
}

function updateAuthUrl(view, resetToken = '') {
  if (typeof window === 'undefined') {
    return
  }

  const url = new URL(window.location.href)
  url.searchParams.delete('auth')
  url.searchParams.delete('resetToken')

  if (view === 'forgot-password') {
    url.searchParams.set('auth', 'forgot-password')
  }

  if (view === 'reset-password' && resetToken) {
    url.searchParams.set('auth', 'reset-password')
    url.searchParams.set('resetToken', resetToken)
  }

  window.history.replaceState({}, '', url.toString())
}

function getInitialLandingApp() {
  return getAuthViewFromUrl() === 'login' ? 'home' : 'procurement'
}

function clearPendingWorkspaceLinkFromUrl() {
  if (typeof window === 'undefined') {
    return
  }

  const url = new URL(window.location.href)
  url.searchParams.delete('requestId')
  url.searchParams.delete('requestNumber')
  url.searchParams.delete('open')
  url.searchParams.delete('stage')
  window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`)
}

function getInitialRequestForm(
  department = '',
  requesterName = '',
  requesterEmail = '',
  branch = DEFAULT_COMPANY_SETTINGS.companyName,
  deliveryAddress = '',
) {
  return {
    requesterName,
    requesterEmail,
    title: '',
    description: '',
    branch,
    supplier: '',
    department,
    amount: '',
    currency: 'PHP',
    dateNeeded: '',
    deliveryAddress,
    notes: '',
  }
}

function getInitialUserForm() {
  return {
    name: '',
    email: '',
    role: 'requester',
    department: '',
    password: '',
  }
}

function getInitialRequesterSettingsForm(user = null) {
  return {
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
    notifyOnRequestChanges: Boolean(user?.notifyOnRequestChanges),
  }
}

function getInitialSupplierForm() {
  return {
    name: '',
    category: 'Product',
    supplierType: 'Manufacturer',
    tinNumber: '',
    contactPerson: '',
    email: '',
    phone: '',
    address: '',
    notes: '',
  }
}

function getInitialPurchaseOrderLineItem() {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    qty: '1',
    unit: '',
    description: '',
    unitPrice: '',
    total: '',
  }
}

function getInitialPurchaseOrderForm() {
  return {
    supplier: '',
    poNumber: '',
    notes: '',
    salesTax: '',
    shippingHandling: '',
    other: '',
    lineItems: [getInitialPurchaseOrderLineItem()],
  }
}

function getPurchaseOrderDraft(item, items) {
  if (item?.poDraft) {
    return {
      supplier:
        item.poDraft.supplier ||
        (item?.supplier === 'Pending selection' ? '' : item?.supplier || ''),
      poNumber:
        item.poDraft.poNumber || getAssignedPurchaseOrderNumber(item, items),
      notes: item.poDraft.notes ?? '',
      salesTax: item.poDraft.salesTax ?? '',
      shippingHandling: item.poDraft.shippingHandling ?? '',
      other: item.poDraft.other ?? '',
      lineItems:
        item.poDraft.lineItems && item.poDraft.lineItems.length
          ? item.poDraft.lineItems
          : [getInitialPurchaseOrderLineItem()],
    }
  }

  return {
    supplier:
      item?.supplier === 'Pending selection' ? '' : item?.supplier || '',
    poNumber: getAssignedPurchaseOrderNumber(item, items),
    notes: item?.notes || '',
    salesTax: '',
    shippingHandling: '',
    other: '',
    lineItems: [getInitialPurchaseOrderLineItem()],
  }
}

function getInitialRequestForPaymentForm() {
  return {
    payee: '',
    tinNumber: '',
    invoiceNumber: '',
    paymentStatus: '',
    paymentReference: '',
    amountRequested: '',
    dueDate: '',
    notes: '',
  }
}

function getDefaultRequestForPaymentPayee(item) {
  const requestedPayeeSupplier = String(
    item?.requestedPayeeSupplier || '',
  ).trim()
  const selectedSupplier = String(
    item?.supplier === 'Pending selection' ? '' : item?.supplier || '',
  ).trim()

  if (requestedPayeeSupplier) {
    return requestedPayeeSupplier
  }

  if (selectedSupplier) {
    return selectedSupplier
  }

  return String(item?.requester || item?.requesterName || '').trim()
}

function getEffectiveRequestForPaymentPayee(item) {
  const requestedPayeeSupplier = String(
    item?.requestedPayeeSupplier || '',
  ).trim()
  const savedPayee = String(item?.rfpDraft?.payee || '').trim()
  const selectedSupplier = String(
    item?.supplier === 'Pending selection' ? '' : item?.supplier || '',
  ).trim()
  const requester = String(item?.requester || item?.requesterName || '').trim()

  if (requestedPayeeSupplier) {
    return requestedPayeeSupplier
  }

  if (selectedSupplier) {
    const normalizedSavedPayee = savedPayee.toLowerCase()
    const normalizedSelectedSupplier = selectedSupplier.toLowerCase()
    const normalizedRequester = requester.toLowerCase()

    if (
      !savedPayee ||
      normalizedSavedPayee === normalizedSelectedSupplier ||
      normalizedSavedPayee === normalizedRequester
    ) {
      return selectedSupplier
    }
  }

  return savedPayee || requester
}

function getDefaultRequestForPaymentAmount(item) {
  return String(item?.amount ?? '')
}

function getDefaultRequestForPaymentDueDate(item) {
  return item?.dateNeeded ? String(item.dateNeeded).slice(0, 10) : ''
}

function getRecordAmount(record) {
  return parseAmountValue(record?.rfpDraft?.amountRequested || record?.amount)
}

function getRequestForPaymentFormFromItem(item) {
  const savedRfpDraft = item?.rfpDraft ?? {}

  return {
    payee: getEffectiveRequestForPaymentPayee(item),
    tinNumber: savedRfpDraft.tinNumber || '',
    invoiceNumber: savedRfpDraft.invoiceNumber || '',
    paymentStatus: savedRfpDraft.paymentStatus || '',
    paymentReference: savedRfpDraft.paymentReference || '',
    amountRequested: savedRfpDraft.amountRequested || getDefaultRequestForPaymentAmount(item),
    dueDate: savedRfpDraft.dueDate || getDefaultRequestForPaymentDueDate(item),
    notes: savedRfpDraft.notes || item?.description || '',
  }
}

function getRequestForPaymentValidationErrors(payload) {
  return {
    payee: !String(payload?.payee || '').trim(),
    amountRequested: !String(payload?.amountRequested || '').trim(),
  }
}

function hasRequestForPaymentValidationErrors(payload) {
  const errors = getRequestForPaymentValidationErrors(payload)
  return Object.values(errors).some(Boolean)
}

function canUserEditRequest(user, item) {
  if (!user || !item) {
    return false
  }

  if (user.role === 'admin') {
    return true
  }

  if (user.email !== item.requesterEmail) {
    return false
  }

  return (
    !item.approvalCompleted && !['completed', 'rejected'].includes(item.status)
  )
}

function canAccessRequestForPayment(item) {
  if (!item) {
    return false
  }

  if (item.status === 'rejected') {
    return false
  }

  const requestForPaymentStages = new Set([
    'Request for Payment',
    'Send PO',
    'Delivery',
    'Inspection',
    'Invoice',
    'Matching',
    'Payment',
    'Filing',
  ])

  const hasSavedRfpDraft = Boolean(
    item.rfpDraft?.payee ||
      item.rfpDraft?.tinNumber ||
      item.rfpDraft?.invoiceNumber ||
      item.rfpDraft?.amountRequested ||
      item.rfpDraft?.dueDate ||
      item.rfpDraft?.notes,
  )
  const hasRfpHistory = Array.isArray(item.history)
    ? item.history.some((entry) => requestForPaymentStages.has(entry.stage))
    : false

  return (
    hasSavedRfpDraft ||
    hasRfpHistory ||
    Boolean(item.requestForPaymentEnabled) ||
    requestForPaymentStages.has(item.currentStage)
  )
}

function isRequestApprovedForRfpRecord(item) {
  if (!item) {
    return false
  }

  if (item.approvalCompleted || item.status === 'completed') {
    return true
  }

  const stages =
    Array.isArray(item.workflowStages) && item.workflowStages.length
      ? item.workflowStages
      : DEFAULT_WORKFLOW_STAGES
  const approvalIndex = stages.indexOf('Approval')
  const currentStageIndex = stages.indexOf(item.currentStage)

  return approvalIndex !== -1 && currentStageIndex > approvalIndex
}

function canEditRequestForPayment(user, item) {
  if (!user || !item) {
    return false
  }

  if (user.role === 'admin') {
    return true
  }

  if (user.email !== item.requesterEmail) {
    return false
  }

  const requesterLockedStages = new Set([
    'Prepare PO',
    'Approve PO',
    'Send PO',
    'Delivery',
    'Inspection',
    'Invoice',
    'Matching',
    'Payment',
    'Filing',
  ])

  return (
    !item.approvalCompleted &&
    !['completed', 'rejected'].includes(item.status) &&
    !requesterLockedStages.has(item.currentStage)
  )
}

function canAccessRequestWorkspace(user, item) {
  if (!user || !item) {
    return false
  }

  if (user.role === 'admin') {
    return true
  }

  if (user.email === item.requesterEmail) {
    return true
  }

  if (
    Array.isArray(item.allowedRoles) &&
    item.allowedRoles.includes(user.role)
  ) {
    return true
  }

  return false
}

function canSeeRequestInRegistry(user, item) {
  if (!user || !item) {
    return false
  }

  if (user.role === 'admin') {
    return true
  }

  if (user.email === item.requesterEmail) {
    return user.email === item.requesterEmail
  }

  return Boolean(
    Array.isArray(item.allowedRoles) && item.allowedRoles.includes(user.role),
  )
}

function getNextPurchaseOrderNumber(items) {
  const currentYear = new Date().getFullYear()
  let highestYear = currentYear
  let highestSequence = 0

  items.forEach((item) => {
    const value = String(item.poNumber || '').trim()
    const match = value.match(/^PO-(\d{4})-(\d+)$/i)

    if (!match) {
      return
    }

    const year = Number.parseInt(match[1], 10)
    const sequence = Number.parseInt(match[2], 10)

    if (
      year > highestYear ||
      (year === highestYear && sequence > highestSequence)
    ) {
      highestYear = year
      highestSequence = sequence
    }
  })

  const nextSequence = String(highestSequence + 1).padStart(3, '0')
  return `PO-${highestYear}-${nextSequence}`
}

function getAssignedPurchaseOrderNumber(item, items) {
  return item?.poNumber || getNextPurchaseOrderNumber(items)
}

function sanitizeNumericInput(value) {
  return String(value ?? '').replace(/[^0-9.,]/g, '')
}

function getRequestAdminForm(
  item,
  defaultBranch = DEFAULT_COMPANY_SETTINGS.companyName,
) {
  if (!item) {
    return {
      title: '',
      description: '',
      branch: defaultBranch,
      department: '',
      amount: '',
      dateNeeded: '',
      status: 'open',
      currentStage: '',
      inspectionStatus: 'pending',
      supplier: '',
      poNumber: '',
      invoiceNumber: '',
      paymentReference: '',
      skipToRfp: false,
      notes: '',
    }
  }

  return {
    title: item.title ?? '',
    description: item.description ?? '',
    branch: item.branch ?? 'Januarius Holdings',
    department: item.department ?? '',
    amount: String(item.amount ?? ''),
    dateNeeded: item.dateNeeded ? item.dateNeeded.slice(0, 10) : '',
    status: item.status ?? 'open',
    currentStage:
      item.status === 'completed' ? 'Completed' : (item.currentStage ?? ''),
    inspectionStatus: item.inspectionStatus ?? 'pending',
    supplier:
      item.supplier === 'Pending selection' ? '' : (item.supplier ?? ''),
    poNumber: item.poNumber ?? '',
    invoiceNumber: item.invoiceNumber ?? '',
    paymentReference: item.paymentReference ?? '',
    skipToRfp: false,
    notes: item.notes ?? '',
  }
}

function getDashboardStats(items) {
  const openCount = items.filter((item) => item.status === 'open').length
  const completedCount = items.filter(
    (item) => item.status === 'completed',
  ).length
  const rejectedCount = items.filter(
    (item) => item.status === 'rejected',
  ).length
  const totalAmount = items.reduce(
    (sum, item) => sum + Number(item.amount || 0),
    0,
  )

  return [
    { label: 'Open Requests', value: String(openCount).padStart(2, '0') },
    { label: 'Completed', value: String(completedCount).padStart(2, '0') },
    { label: 'Total Rejected', value: String(rejectedCount).padStart(2, '0') },
    {
      label: 'Tracked Value',
      value: new Intl.NumberFormat('en-PH', {
        style: 'currency',
        currency: 'PHP',
        maximumFractionDigits: 0,
      }).format(totalAmount),
    },
  ]
}

function formatDashboardCurrency(value) {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    maximumFractionDigits: 0,
  }).format(value)
}

function isTerminalRequest(item) {
  return (
    !item ||
    ['completed', 'rejected'].includes(item.status) ||
    item.filingCompleted
  )
}

function getWorkflowStageIndex(item, stageName) {
  const stages =
    Array.isArray(item?.workflowStages) && item.workflowStages.length
      ? item.workflowStages
      : workflowStages

  return stages.indexOf(stageName)
}

function getStageCompletionDate(item, stageNames) {
  if (!Array.isArray(item?.history) || !item.history.length) {
    return null
  }

  const matchingEntries = item.history
    .filter(
      (entry) =>
        stageNames.includes(entry.stage) &&
        ['completed', 'current'].includes(entry.status) &&
        entry.updatedAt,
    )
    .sort(
      (left, right) =>
        new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime(),
    )

  return matchingEntries[0]?.updatedAt
    ? new Date(matchingEntries[0].updatedAt)
    : null
}

function getNormalizedPaymentStatus(item) {
  return String(item?.rfpDraft?.paymentStatus || '')
    .trim()
    .toLowerCase()
}

function isAccountantForApprovalItem(item) {
  return !isTerminalRequest(item) && !isRequestApprovedForRfpRecord(item)
}

function getAccountantDashboardStats(items, referenceDate = new Date()) {
  const currentMonth = referenceDate.getMonth()
  const currentYear = referenceDate.getFullYear()

  const forApprovalCount = items.filter(isAccountantForApprovalItem).length

  const forPaymentItems = getAccountantForPaymentItems(items)
  const paidThisMonthItems = getAccountantPaidThisMonthItems(
    items,
    referenceDate,
  )

  const totalAmountPending = forPaymentItems
    .reduce((sum, item) => sum + Number(item.amount || 0), 0)

  return [
    {
      label: 'For Approval',
      value: String(forApprovalCount).padStart(2, '0'),
      actionKey: 'for-approval',
    },
    {
      label: 'For Payment',
      value: String(forPaymentItems.length).padStart(2, '0'),
      actionKey: 'for-payment',
    },
    {
      label: 'Paid (This Month)',
      value: String(paidThisMonthItems.length).padStart(2, '0'),
      actionKey: 'paid-this-month',
    },
    {
      label: 'Total Amount Pending',
      value: formatDashboardCurrency(totalAmountPending),
    },
  ]
}

function getAccountantForPaymentItems(items) {
  return items.filter((item) => {
    if (isTerminalRequest(item)) {
      return false
    }

    if (getNormalizedPaymentStatus(item) === 'paid') {
      return false
    }

    const approvalIndex = getWorkflowStageIndex(item, 'Approval')
    const currentStageIndex = getWorkflowStageIndex(item, item.currentStage)
    const filingIndex = getWorkflowStageIndex(item, 'Filing')

    if (approvalIndex === -1 || currentStageIndex === -1) {
      return false
    }

    if (currentStageIndex <= approvalIndex) {
      return false
    }

    if (filingIndex !== -1 && currentStageIndex >= filingIndex) {
      return false
    }

    return true
  })
}

function getAccountantPaidThisMonthItems(items, referenceDate = new Date()) {
  const currentMonth = referenceDate.getMonth()
  const currentYear = referenceDate.getFullYear()

  return items.filter((item) => {
    const normalizedPaymentStatus = getNormalizedPaymentStatus(item)
    const hasExplicitPaidStatus = normalizedPaymentStatus === 'paid'
    const paidDate = hasExplicitPaidStatus
      ? item.updatedAt
        ? new Date(item.updatedAt)
        : null
      : getStageCompletionDate(item, ['Payment', 'Filing']) ||
        ((item.status === 'completed' || item.filingCompleted) && item.updatedAt
          ? new Date(item.updatedAt)
          : null)

    if (!paidDate) {
      return false
    }

    if (
      !hasExplicitPaidStatus &&
      item.status !== 'completed' &&
      !item.filingCompleted
    ) {
      return false
    }

    return (
      paidDate.getMonth() === currentMonth &&
      paidDate.getFullYear() === currentYear
    )
  })
}

function filterRequests(items, filter) {
  if (filter === 'open') {
    return items.filter((item) => item.status === 'open')
  }

  if (filter === 'completed') {
    return items.filter((item) => item.status === 'completed')
  }

  if (filter === 'rejected') {
    return items.filter((item) => item.status === 'rejected')
  }

  return items
}

function searchRequests(items, query) {
  const normalizedQuery = String(query || '')
    .trim()
    .toLowerCase()

  if (!normalizedQuery) {
    return items
  }

  return items.filter((item) =>
    [
      item.requestNumber,
      item.title,
      item.branch,
      item.department,
      item.requester,
      item.requesterEmail,
      item.supplier,
      item.poNumber,
    ]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(normalizedQuery)),
  )
}

function formatExportDate(value) {
  if (!value) {
    return ''
  }

  return new Intl.DateTimeFormat('en-PH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(value))
}

function escapeCsvValue(value) {
  const stringValue = String(value ?? '')
  return `"${stringValue.replaceAll('"', '""')}"`
}

function parseAmountValue(value) {
  if (value === null || typeof value === 'undefined') {
    return 0
  }

  const normalized = String(value).replaceAll(',', '').trim()
  if (!normalized) {
    return 0
  }

  return Number(normalized)
}

function formatAmountInput(value) {
  const stringValue = String(value ?? '')
  const sanitized = stringValue.replace(/[^\d.]/g, '')

  if (!sanitized) {
    return ''
  }

  const [rawIntegerPart = '', ...decimalParts] = sanitized.split('.')
  const hasDecimalPoint = sanitized.includes('.')
  const normalizedIntegerPart = rawIntegerPart.replace(/^0+(?=\d)/, '')
  const integerPart = normalizedIntegerPart || (hasDecimalPoint ? '0' : '')
  const formattedIntegerPart = integerPart
    ? new Intl.NumberFormat('en-US', {
        maximumFractionDigits: 0,
      }).format(Number(integerPart))
    : ''
  const decimalPart = decimalParts.join('').slice(0, 2)

  if (hasDecimalPoint) {
    return `${formattedIntegerPart || '0'}.${decimalPart}`
  }

  return formattedIntegerPart
}

function formatCurrencyValue(value, currency = 'PHP') {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency,
  }).format(value || 0)
}

function CompanyHeader({
  isAuthenticated,
  user,
  showRequestSearch = true,
  onLogout,
  requestSearchQuery = '',
  onRequestSearchChange,
  onOpenSuppliers,
  onOpenRfpDirectory,
  onOpenRfpRecord,
  onPrintRfpRecord,
  onOpenAuditTrail,
  onOpenUsers,
  onOpenPurchaseOrder,
  onOpenSettings,
  canOpenRfp = false,
  rfpItems = [],
  companySettings = DEFAULT_COMPANY_SETTINGS,
}) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isRfpModalOpen, setIsRfpModalOpen] = useState(false)
  const menuRef = useRef(null)

  useEffect(() => {
    if (!isMenuOpen) {
      return undefined
    }

    function handlePointerDown(event) {
      if (!menuRef.current?.contains(event.target)) {
        setIsMenuOpen(false)
      }
    }

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        setIsMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isMenuOpen])

  function handleMenuAction(action) {
    setIsMenuOpen(false)
    action?.()
  }

  function handleOpenRfpModal() {
    setIsMenuOpen(false)
    onOpenRfpDirectory?.()
    setIsRfpModalOpen(true)
  }

  function handleOpenRfpRecord(item) {
    setIsRfpModalOpen(false)
    onOpenRfpRecord?.(item)
  }

  function handlePrintRfpRecord(item) {
    onPrintRfpRecord?.(item)
  }

  function handleGoHome() {
    if (typeof window === 'undefined') {
      return
    }

    const url = new URL(window.location.href)
    url.search = ''
    url.hash = ''
    window.location.assign(`${url.origin}${url.pathname}`)
  }

  return (
    <>
      <header className='company-header' ref={menuRef}>
        <div className='brand-lockup'>
          {user ? (
            <button
              className='mobile-header-menu-button'
              type='button'
              onClick={() => setIsMenuOpen((current) => !current)}
              aria-haspopup='menu'
              aria-expanded={isMenuOpen}
              aria-label='Open menu'
            >
              <svg viewBox='0 0 20 20' aria-hidden='true'>
                <path
                  d='M3 5.5h14M3 10h14M3 14.5h14'
                  fill='none'
                  stroke='currentColor'
                  strokeLinecap='round'
                  strokeWidth='1.8'
                />
              </svg>
            </button>
          ) : null}
          <button
            className='brand-home-button'
            type='button'
            onClick={handleGoHome}
            aria-label='Go to home page'
          >
            <div className='brand-mark' aria-hidden='true'>
              <img src={companySettings.logoUrl} alt='' />
            </div>
            <div className='brand-copy'>
              <p className='brand-kicker'>{companySettings.companyName}</p>
              <strong>Procurement Management System</strong>
            </div>
          </button>
        </div>

        <div className='header-meta'>
          {user && showRequestSearch ? (
            <input
              className='header-request-search'
              type='search'
              name='request-search'
              value={requestSearchQuery}
              onChange={(event) => onRequestSearchChange?.(event.target.value)}
              placeholder='Search all requests'
              aria-label='Search all requests'
              autoComplete='off'
              autoCorrect='off'
              autoCapitalize='none'
              spellCheck={false}
            />
          ) : null}
          {user ? (
            <div className='header-menu-wrap'>
              <button
                className='header-menu-trigger'
                type='button'
                onClick={() => setIsMenuOpen((current) => !current)}
                aria-haspopup='menu'
                aria-expanded={isMenuOpen}
              >
                <span>{user.name}</span>
                <span className='header-menu-caret' aria-hidden='true'>
                  ▾
                </span>
              </button>
            </div>
          ) : null}
        </div>
        {user && isMenuOpen ? (
          <div
            className='header-menu-dropdown'
            role='menu'
            aria-label='Account menu'
          >
            <div className='header-menu-user mobile-only'>
              <strong>{user.name}</strong>
              <span>{user.email}</span>
            </div>
            <button
              type='button'
              role='menuitem'
              onClick={() => handleMenuAction(onOpenSettings)}
            >
              Settings
            </button>
            <button
              type='button'
              role='menuitem'
              onClick={() => handleMenuAction(onLogout)}
            >
              Logout
            </button>
          </div>
        ) : null}
      </header>

      {isRfpModalOpen ? (
        <Modal
          eyebrow='Request for Payment'
          title='RFP records'
          onClose={() => setIsRfpModalOpen(false)}
        >
          <div className='modal-form audit-trail-modal-content'>
            <div className='audit-trail-modal-meta'>
              <div>
                <strong>Request for Payment list</strong>
                <div className='audit-trail-cell-subtext'>
                  Open any request with active RFP access or continue a saved
                  RFP draft.
                </div>
              </div>
              <span className='panel-counter'>
                {rfpItems.length} {rfpItems.length === 1 ? 'record' : 'records'}
              </span>
            </div>

            {rfpItems.length === 0 ? (
              <p className='empty-state'>No RFP-enabled requests available.</p>
            ) : (
              <div className='supplier-table audit-trail-table-wrap'>
                <table className='supplier-table-grid audit-trail-table'>
                  <thead className='supplier-table-header'>
                    <tr>
                      <th>Request</th>
                      <th>Payee / Supplier</th>
                      <th>Invoice</th>
                      <th>Due date</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rfpItems.map((record) => {
                      const hasSavedRfpDraft = Boolean(
                        record.rfpDraft?.payee ||
                        record.rfpDraft?.tinNumber ||
                        record.rfpDraft?.invoiceNumber ||
                        record.rfpDraft?.amountRequested ||
                        record.rfpDraft?.dueDate ||
                        record.rfpDraft?.notes,
                      )

                      return (
                        <tr
                          key={record.id}
                          className='supplier-row audit-trail-row'
                        >
                          <td>
                            <strong>{record.requestNumber}</strong>
                            <div className='audit-trail-cell-subtext'>
                              {record.title}
                            </div>
                          </td>
                          <td>
                            {getRequestForPaymentFormFromItem(record).payee ||
                              'Not set'}
                          </td>
                          <td>{record.rfpDraft?.invoiceNumber || 'Not set'}</td>
                          <td>{record.rfpDraft?.dueDate || 'Not set'}</td>
                          <td>
                            <div className='table-action-row'>
                              <button
                                className='ghost-button'
                                type='button'
                                onClick={() => handleOpenRfpRecord(record)}
                              >
                                Open
                              </button>
                              <button
                                className='ghost-button'
                                type='button'
                                onClick={() => handlePrintRfpRecord(record)}
                                disabled={!hasSavedRfpDraft}
                              >
                                Print
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </Modal>
      ) : null}
    </>
  )
}

export default function App() {
  const [theme, setTheme] = useState(() => getStoredTheme())
  const [isMobileViewport, setIsMobileViewport] = useState(() => {
    if (typeof window === 'undefined') {
      return false
    }

    return window.matchMedia('(max-width: 820px)').matches
  })
  const [companySettings, setCompanySettings] = useState(
    DEFAULT_COMPANY_SETTINGS,
  )
  const [companyIdentities, setCompanyIdentities] = useState([])
  const [session, setSession] = useState(() => getStoredSession())
  const [settingsForm, setSettingsForm] = useState(DEFAULT_COMPANY_SETTINGS)
  const [requesterSettingsForm, setRequesterSettingsForm] = useState(() =>
    getInitialRequesterSettingsForm(session?.user ?? null),
  )
  const [identityForm, setIdentityForm] = useState(getInitialIdentityForm())
  const [editingIdentityId, setEditingIdentityId] = useState('')
  const [identitySaveMessage, setIdentitySaveMessage] = useState('')
  const [isIdentityModalOpen, setIsIdentityModalOpen] = useState(false)
  const [isMainSettingsEditing, setIsMainSettingsEditing] = useState(false)
  const [credentials, setCredentials] = useState({
    email: '',
    password: '',
    rememberMe: false,
  })
  const [selectedLandingApp, setSelectedLandingApp] = useState(
    getInitialLandingApp(),
  )
  const [authView, setAuthView] = useState(() => getAuthViewFromUrl())
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('')
  const [forgotPasswordMessage, setForgotPasswordMessage] = useState('')
  const [forgotPasswordError, setForgotPasswordError] = useState('')
  const [resetPasswordToken, setResetPasswordToken] = useState(() =>
    getResetPasswordTokenFromUrl(),
  )
  const [resetPasswordForm, setResetPasswordForm] = useState({
    password: '',
    confirmPassword: '',
  })
  const [resetPasswordMessage, setResetPasswordMessage] = useState('')
  const [resetPasswordError, setResetPasswordError] = useState('')
  const [items, setItems] = useState([])
  const [stages, setStages] = useState([])
  const [users, setUsers] = useState([])
  const [suppliers, setSuppliers] = useState([])
  const [selectedId, setSelectedId] = useState('')
  const [selectedUserId, setSelectedUserId] = useState('')
  const [selectedSupplierId, setSelectedSupplierId] = useState('')
  const [actionForm, setActionForm] = useState({
    supplier: '',
    notes: '',
    notifyApprover: false,
    poNumber: '',
    invoiceNumber: '',
    paymentReference: '',
    deliveryDate: '',
    inspectionStatus: 'pending',
    selectedItemId: '',
    selectedItemStage: '',
  })
  const [requestForm, setRequestForm] = useState(() =>
    getInitialRequestForm(
      session?.user?.department || '',
      session?.user?.role === 'admin' ? '' : session?.user?.name || '',
      session?.user?.role === 'admin' ? '' : session?.user?.email || '',
      companySettings.companyName,
      getBranchDeliveryAddress(
        companySettings.companyName,
        companySettings,
        companyIdentities,
      ),
    ),
  )
  const [requestQuotationFile, setRequestQuotationFile] = useState(null)
  const [requestFormErrors, setRequestFormErrors] = useState({
    title: false,
    description: false,
    amount: false,
  })
  const [uploadForm, setUploadForm] = useState({
    type: 'po',
    label: '',
    file: null,
  })
  const [requestAdminForm, setRequestAdminForm] = useState(() =>
    getRequestAdminForm(null),
  )
  const [userForm, setUserForm] = useState(getInitialUserForm())
  const [supplierForm, setSupplierForm] = useState(getInitialSupplierForm())
  const [purchaseOrderForm, setPurchaseOrderForm] = useState(
    getInitialPurchaseOrderForm(),
  )
  const [purchaseOrderDrafts, setPurchaseOrderDrafts] = useState({})
  const [isPurchaseOrderPageOpen, setIsPurchaseOrderPageOpen] = useState(false)
  const [isPurchaseOrderDirectoryOpen, setIsPurchaseOrderDirectoryOpen] =
    useState(false)
  const [isRfpDirectoryOpen, setIsRfpDirectoryOpen] = useState(false)
  const [accountantDashboardPage, setAccountantDashboardPage] = useState('')
  const [invoiceUploadRecord, setInvoiceUploadRecord] = useState(null)
  const [invoiceUploadForm, setInvoiceUploadForm] = useState({
    invoiceNumber: '',
    file: null,
  })
  const [invoiceUploadError, setInvoiceUploadError] = useState('')
  const [rfpPreviewRecord, setRfpPreviewRecord] = useState(null)
  const [rfpPreviewForm, setRfpPreviewForm] = useState({
    invoiceNumber: '',
    file: null,
    paymentStatus: '',
  })
  const [rfpPreviewError, setRfpPreviewError] = useState('')
  const [isRequestForPaymentPageOpen, setIsRequestForPaymentPageOpen] =
    useState(false)
  const [requestForPaymentForm, setRequestForPaymentForm] = useState(
    getInitialRequestForPaymentForm(),
  )
  const [requestForPaymentErrors, setRequestForPaymentErrors] = useState({})
  const [isRequestForPaymentEditing, setIsRequestForPaymentEditing] =
    useState(true)
  const [isRequestWorkspacePageOpen, setIsRequestWorkspacePageOpen] =
    useState(false)
  const [approvalConfirmationRequest, setApprovalConfirmationRequest] =
    useState(null)
  const [pendingWorkspaceLink, setPendingWorkspaceLink] = useState(() =>
    getPendingWorkspaceLink(),
  )
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isRfpPreviewSubmitting, setIsRfpPreviewSubmitting] = useState(false)
  const [authError, setAuthError] = useState('')
  const [actionError, setActionError] = useState('')
  const [uploadError, setUploadError] = useState('')
  const [userError, setUserError] = useState('')
  const [supplierError, setSupplierError] = useState('')
  const [settingsError, setSettingsError] = useState('')
  const [isCreateRequestModalOpen, setIsCreateRequestModalOpen] =
    useState(false)
  const [isEditRequestModalOpen, setIsEditRequestModalOpen] = useState(false)
  const [isUserModalOpen, setIsUserModalOpen] = useState(false)
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false)
  const [isSupplierDirectoryOpen, setIsSupplierDirectoryOpen] = useState(false)
  const [isUserDirectoryOpen, setIsUserDirectoryOpen] = useState(false)
  const [isAuditTrailPageOpen, setIsAuditTrailPageOpen] = useState(false)
  const [isSettingsPageOpen, setIsSettingsPageOpen] = useState(false)
  const [supplierModalMode, setSupplierModalMode] = useState('create')
  const [expandedPanel, setExpandedPanel] = useState('')
  const [requestRegistryFilter, setRequestRegistryFilter] = useState('all')
  const [requestRegistryView, setRequestRegistryView] = useState('list')
  const [rfpRegistryView, setRfpRegistryView] = useState('list')
  const [requestSearchQuery, setRequestSearchQuery] = useState('')
  const [confirmDialog, setConfirmDialog] = useState(null)
  const [toasts, setToasts] = useState([])
  const dashboardRefreshInFlight = useRef(false)

  const isAdmin = session?.user?.role === 'admin'
  const isAccountant = session?.user?.role === 'accountant'
  const branchOptions = Array.from(
    new Set([
      companySettings.companyName,
      ...companyIdentities
        .map((identity) => identity.branchName)
        .filter(Boolean),
    ]),
  )
  const canCreateRequest = ['requester', 'approver', 'admin', 'accountant'].includes(
    session?.user?.role,
  )
  const requesterOptions = users
  const supplierOptions = Array.from(
    new Set(
      [
        ...suppliers.map((supplier) => supplier.name),
        ...items.map((item) => item.supplier),
      ].filter((supplier) => supplier && supplier !== 'Pending selection'),
    ),
  ).sort((left, right) => left.localeCompare(right))
  const visibleRegistryItems = items.filter((item) =>
    canSeeRequestInRegistry(session?.user, item),
  )
  const filteredItems = searchRequests(
    filterRequests(visibleRegistryItems, requestRegistryFilter),
    requestSearchQuery,
  )
  const selectedItem =
    items.find((item) => item.id === selectedId) ??
    filteredItems[0] ??
    null
  const selectedUser = users.find((user) => user.id === selectedUserId) ?? null
  const selectedSupplier =
    suppliers.find((supplier) => supplier.id === selectedSupplierId) ?? null
  const dashboardStats = (
    isAccountant ? getAccountantDashboardStats(items) : getDashboardStats(items)
  ).map((stat) => {
    if (isAccountant) {
      return stat
    }

    if (stat.label === 'Open Requests') {
      return {
        ...stat,
        filterKey: 'open',
        isActive: requestRegistryFilter === 'open',
      }
    }

    if (stat.label === 'Completed') {
      return {
        ...stat,
        filterKey: 'completed',
        isActive: requestRegistryFilter === 'completed',
      }
    }

    return stat
  })
  const purchaseOrderRecords = items.filter((item) =>
    String(item.poNumber || item.poDraft?.poNumber || '').trim(),
  )
  const requestForPaymentRecords = items.filter((item) =>
    canAccessRequestForPayment(item),
  )
  const accountantForApprovalRecords = isAccountant
    ? requestForPaymentRecords.filter(isAccountantForApprovalItem)
    : []
  const accountantForPaymentRecords = isAccountant
    ? getAccountantForPaymentItems(requestForPaymentRecords)
    : []
  const accountantPaidThisMonthRecords = isAccountant
    ? getAccountantPaidThisMonthItems(requestForPaymentRecords)
    : []
  const accountantDashboardRecords = isAccountant
    ? requestForPaymentRecords
    : []
  const canOpenRequestForPaymentMenu = items.some((item) =>
    canAccessRequestForPayment(item),
  )
  const shouldPauseDashboardRefresh =
    isCreateRequestModalOpen ||
    isEditRequestModalOpen ||
    isUserModalOpen ||
    isSupplierModalOpen ||
    isRequestWorkspacePageOpen ||
    isRequestForPaymentPageOpen ||
    isPurchaseOrderPageOpen ||
    isAuditTrailPageOpen ||
    isSettingsPageOpen
  const canManageDocuments = Boolean(
    selectedItem &&
    session?.user &&
    (session.user.role === 'admin' ||
      session.user.email === selectedItem.requesterEmail ||
      selectedItem.allowedRoles.includes(session.user.role)),
  )
  const canOpenSelectedRequestForPayment = Boolean(
    (selectedItem &&
      (canAccessRequestForPayment(selectedItem) ||
        (selectedItem.currentStage === 'Approval' &&
          Boolean(actionForm.skipToRfp)))) ||
    canOpenRequestForPaymentMenu,
  )
  const canEditSelectedRequest = Boolean(
    canUserEditRequest(session?.user, selectedItem),
  )
  const canEditSelectedRequestForPayment = Boolean(
    canEditRequestForPayment(session?.user, selectedItem),
  )

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined
    }

    const mediaQuery = window.matchMedia('(max-width: 820px)')
    const handleViewportChange = (event) => {
      setIsMobileViewport(event.matches)
    }

    setIsMobileViewport(mediaQuery.matches)
    mediaQuery.addEventListener('change', handleViewportChange)

    return () => mediaQuery.removeEventListener('change', handleViewportChange)
  }, [])

  async function syncCompanySettings() {
    const response = await fetch(`${API_BASE_URL}/settings`)
    if (!response.ok) {
      throw new Error('Unable to load company settings.')
    }

    const data = await response.json()
    const nextSettings = {
      companyName: data.companyName || DEFAULT_COMPANY_SETTINGS.companyName,
      address: data.address || DEFAULT_COMPANY_SETTINGS.address,
      logoUrl: data.logoUrl || DEFAULT_COMPANY_SETTINGS.logoUrl,
      generalAccountantName:
        data.generalAccountantName ??
        DEFAULT_COMPANY_SETTINGS.generalAccountantName,
      chiefInvestmentOfficerName:
        data.chiefInvestmentOfficerName ??
        DEFAULT_COMPANY_SETTINGS.chiefInvestmentOfficerName,
      workflowStages:
        Array.isArray(data.workflowStages) && data.workflowStages.length
          ? data.workflowStages
          : DEFAULT_COMPANY_SETTINGS.workflowStages,
    }

    setCompanySettings(nextSettings)
    setSettingsForm(nextSettings)
    setCompanyIdentities(Array.isArray(data.identities) ? data.identities : [])
    return nextSettings
  }

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    localStorage.setItem('procurement-theme', theme)
  }, [theme])

  useEffect(() => {
    const favicon = document.querySelector("link[rel='icon']")
    if (favicon) {
      favicon.setAttribute('href', companySettings.logoUrl)
    }
  }, [companySettings])

  useEffect(() => {
    let ignore = false

    async function loadSettings() {
      try {
        if (ignore) {
          return
        }

        const nextSettings = await syncCompanySettings()
        if (ignore) {
          return
        }

        setIdentityForm(getInitialIdentityForm(nextSettings))
      } catch (_error) {
        if (ignore) {
          return
        }

        setCompanySettings(DEFAULT_COMPANY_SETTINGS)
        setSettingsForm(DEFAULT_COMPANY_SETTINGS)
        setCompanyIdentities([])
        setIdentityForm(getInitialIdentityForm())
      }
    }

    void loadSettings()

    return () => {
      ignore = true
    }
  }, [])

  useEffect(() => {
    if (!toasts.length) {
      return
    }

    const timers = toasts.map((toast) =>
      window.setTimeout(() => {
        setToasts((current) => current.filter((item) => item.id !== toast.id))
      }, toast.duration ?? 3200),
    )

    return () => timers.forEach((timer) => window.clearTimeout(timer))
  }, [toasts])

  useEffect(() => {
    if (!filteredItems.length) {
      setSelectedId('')
      return
    }

    if (!filteredItems.some((item) => item.id === selectedId)) {
      setSelectedId(filteredItems[0].id)
    }
  }, [filteredItems, selectedId])

  useEffect(() => {
    if (!session?.user || session.user.role === 'admin') {
      return
    }

    setIsUserDirectoryOpen(false)
    setIsSupplierDirectoryOpen(false)
    setIsPurchaseOrderDirectoryOpen(false)
    setIsPurchaseOrderPageOpen(false)
    setIsAuditTrailPageOpen(false)
  }, [session])

  useEffect(() => {
    if (!selectedItem) {
      setRequestAdminForm(
        getRequestAdminForm(null, companySettings.companyName),
      )
      return
    }

    const nextSupplier =
      selectedItem.supplier === 'Pending selection'
        ? ''
        : selectedItem.supplier
    const savedDraft =
      purchaseOrderDrafts[selectedItem.id] ??
      getPurchaseOrderDraft(selectedItem, items)

    setActionForm((current) => {
      const selectedIdChanged = current.selectedItemId !== selectedItem.id
      const selectedStageChanged =
        current.selectedItemStage !== selectedItem.currentStage
      const preserveNotifyApprover =
        !selectedIdChanged &&
        selectedStageChanged &&
        current.selectedItemStage === 'Review' &&
        selectedItem.currentStage === 'Request for Payment'

      if (!selectedIdChanged && !selectedStageChanged) {
        return {
          ...current,
          selectedItemId: selectedItem.id,
          selectedItemStage: selectedItem.currentStage,
        }
      }

      return {
        supplier: savedDraft.supplier || nextSupplier,
        notes: savedDraft.notes || '',
        notifyApprover: preserveNotifyApprover
          ? current.notifyApprover
          : false,
        poNumber:
          savedDraft.poNumber ||
          getAssignedPurchaseOrderNumber(selectedItem, items),
        invoiceNumber: selectedItem.invoiceNumber ?? '',
        paymentReference: selectedItem.paymentReference ?? '',
        deliveryDate: selectedItem.deliveryDate
          ? selectedItem.deliveryDate.slice(0, 10)
          : '',
        inspectionStatus: selectedItem.inspectionStatus ?? 'pending',
        selectedItemId: selectedItem.id,
        selectedItemStage: selectedItem.currentStage,
      }
    })
    setRequestAdminForm(
      getRequestAdminForm(selectedItem, companySettings.companyName),
    )
    setPurchaseOrderForm(() => {
      const nextDraft =
        purchaseOrderDrafts[selectedItem.id] ??
        getPurchaseOrderDraft(selectedItem, items)

      return {
        ...nextDraft,
        supplier: nextDraft.supplier || savedDraft.supplier || nextSupplier || '',
      }
    })
    setUploadForm((current) => ({
      ...current,
      label: '',
      file: null,
    }))
    setSelectedId(selectedItem.id)
  }, [selectedItem, purchaseOrderDrafts, items, companySettings.companyName])

  useEffect(() => {
    if (isUserModalOpen) {
      return
    }

    if (!selectedUser) {
      setUserForm(getInitialUserForm())
      return
    }

    setUserForm({
      name: selectedUser.name,
      email: selectedUser.email,
      role: selectedUser.role,
      department: selectedUser.department ?? '',
      password: '',
    })
  }, [selectedUser, isUserModalOpen])

  useEffect(() => {
    if (!session?.token) {
      return
    }

    const storage = session.rememberMe ? localStorage : sessionStorage
    const fallbackStorage = session.rememberMe ? sessionStorage : localStorage

    storage.setItem('procurement-session', JSON.stringify(session))
    fallbackStorage.removeItem('procurement-session')
    setRequestForm(
      getInitialRequestForm(
        session.user.department || '',
        session.user.role === 'admin' ? '' : session.user.name || '',
        session.user.role === 'admin' ? '' : session.user.email || '',
        companySettings.companyName,
        getBranchDeliveryAddress(
          companySettings.companyName,
          companySettings,
          companyIdentities,
        ),
      ),
    )
    void loadDashboard(session.token, session.user.role)
  }, [session, companySettings.companyName])

  useEffect(() => {
    if (!pendingWorkspaceLink || !session?.user || !items.length) {
      return
    }

    const targetItem =
      items.find((item) => item.id === pendingWorkspaceLink.requestId) ||
      items.find(
        (item) => item.requestNumber === pendingWorkspaceLink.requestNumber,
      )

    if (!targetItem) {
      return
    }

    if (!canAccessRequestWorkspace(session.user, targetItem)) {
      pushToast({
        title: 'Access restricted',
        message:
          pendingWorkspaceLink.stage === 'Approval'
            ? `You can no longer open the Approval stage for ${targetItem.requestNumber}.`
            : `You can no longer open ${targetItem.requestNumber}.`,
        variant: 'error',
        duration: 4200,
      })
      clearPendingWorkspaceLinkFromUrl()
      setPendingWorkspaceLink(null)
      return
    }

    setSelectedId(targetItem.id)
    setIsRequestWorkspacePageOpen(pendingWorkspaceLink.open === 'workspace')
    clearPendingWorkspaceLinkFromUrl()
    setPendingWorkspaceLink(null)
  }, [pendingWorkspaceLink, session, items])

  useEffect(() => {
    setRequesterSettingsForm(
      getInitialRequesterSettingsForm(session?.user ?? null),
    )
  }, [session?.user])

  useEffect(() => {
    if (!isAdmin) {
      return
    }

    if (!users.length) {
      return
    }

    setRequestForm((current) => {
      if (
        current.requesterEmail &&
        users.some((user) => user.email === current.requesterEmail)
      ) {
        return current
      }

      const defaultUser = users[0]
      return {
        ...current,
        requesterName: defaultUser.name,
        requesterEmail: defaultUser.email,
        department: defaultUser.department ?? '',
      }
    })
  }, [isAdmin, users])

  useEffect(() => {
    if (!branchOptions.length) {
      return
    }

    setRequestForm((current) => {
      if (branchOptions.includes(current.branch)) {
        return current
      }

      return {
        ...current,
        branch: branchOptions[0],
        deliveryAddress: getBranchDeliveryAddress(
          branchOptions[0],
          companySettings,
          companyIdentities,
        ),
      }
    })
  }, [branchOptions, companySettings, companyIdentities])

  function clearSession() {
    localStorage.removeItem('procurement-session')
    sessionStorage.removeItem('procurement-session')
    setSession(null)
    setItems([])
    setStages([])
    setUsers([])
    setSuppliers([])
    setSelectedId('')
    setSelectedUserId('')
    setRequestForm(
      getInitialRequestForm(
        '',
        '',
        '',
        DEFAULT_COMPANY_SETTINGS.companyName,
        getBranchDeliveryAddress(
          DEFAULT_COMPANY_SETTINGS.companyName,
          DEFAULT_COMPANY_SETTINGS,
          [],
        ),
      ),
    )
    setRequestQuotationFile(null)
    setRequestAdminForm(
      getRequestAdminForm(null, DEFAULT_COMPANY_SETTINGS.companyName),
    )
    setUserForm(getInitialUserForm())
    setRequesterSettingsForm(getInitialRequesterSettingsForm())
    setSupplierForm(getInitialSupplierForm())
    setIsCreateRequestModalOpen(false)
    setIsEditRequestModalOpen(false)
    setIsUserModalOpen(false)
    setIsSupplierModalOpen(false)
    setIsSupplierDirectoryOpen(false)
    setIsUserDirectoryOpen(false)
    setIsPurchaseOrderPageOpen(false)
    setIsPurchaseOrderDirectoryOpen(false)
    setIsRequestForPaymentPageOpen(false)
    setIsAuditTrailPageOpen(false)
    setIsSettingsPageOpen(false)
    setIsRequestWorkspacePageOpen(false)
    setPurchaseOrderForm(getInitialPurchaseOrderForm())
    setPurchaseOrderDrafts({})
    setRequestForPaymentForm(getInitialRequestForPaymentForm())
    setExpandedPanel('')
    setConfirmDialog(null)
    setSettingsError('')
  }

  function openLoginScreen() {
    setAuthView('login')
    setSelectedLandingApp('procurement')
    setForgotPasswordError('')
    setForgotPasswordMessage('')
    setResetPasswordError('')
    setResetPasswordMessage('')
    setResetPasswordToken('')
    setResetPasswordForm({ password: '', confirmPassword: '' })
    updateAuthUrl('login')
  }

  function openForgotPasswordScreen() {
    setAuthView('forgot-password')
    setSelectedLandingApp('procurement')
    setForgotPasswordEmail(String(credentials.email || '').trim())
    setForgotPasswordError('')
    setForgotPasswordMessage('')
    updateAuthUrl('forgot-password')
  }

  function handleForgotPasswordChange(event) {
    setForgotPasswordEmail(event.target.value)
    setForgotPasswordError('')
    setForgotPasswordMessage('')
  }

  function handleResetPasswordFormChange(event) {
    const { name, value } = event.target
    setResetPasswordForm((current) => ({
      ...current,
      [name]: value,
    }))
    setResetPasswordError('')
    setResetPasswordMessage('')
  }

  function handleSessionExpired() {
    clearSession()
    setAuthError('Your session expired. Please sign in again.')
    pushToast({
      title: 'Session expired',
      message: 'Please sign in again to continue.',
      variant: 'error',
      duration: 4200,
    })
  }

  async function loadDashboard(token, role, options = {}) {
    const { background = false } = options

    if (dashboardRefreshInFlight.current) {
      return
    }

    dashboardRefreshInFlight.current = true

    if (!background) {
      setIsLoading(true)
      setActionError('')
      setUserError('')
    }

    try {
      const workflowPromise = fetch(
        `${API_BASE_URL}/workflows/purchase-requests`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      )
      const supplierPromise = fetch(`${API_BASE_URL}/suppliers`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      const userPromise =
        role === 'admin'
          ? fetch(`${API_BASE_URL}/users`, {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            })
          : Promise.resolve(null)

      const [workflowResponse, supplierResponse, userResponse] =
        await Promise.all([workflowPromise, supplierPromise, userPromise])

      if (
        workflowResponse.status === 401 ||
        supplierResponse.status === 401 ||
        userResponse?.status === 401
      ) {
        handleSessionExpired()
        return
      }

      if (!workflowResponse.ok) {
        throw new Error('Unable to load workflow data.')
      }

      if (!supplierResponse.ok) {
        throw new Error('Unable to load suppliers.')
      }

      const workflowData = await workflowResponse.json()
      const supplierData = await supplierResponse.json()
      setStages(workflowData.stages)
      setItems(workflowData.items)
      setSuppliers(supplierData.items)
      setSelectedId((current) => current || workflowData.items[0]?.id || '')

      if (userResponse) {
        if (!userResponse.ok) {
          throw new Error('Unable to load users.')
        }

        const userData = await userResponse.json()
        setUsers(userData.items)
        setSelectedUserId((current) => current || userData.items[0]?.id || '')
      } else {
        setUsers([])
        setSelectedUserId('')
      }
    } catch (error) {
      if (!background) {
        setActionError(error.message || 'Unable to load dashboard.')
      }
    } finally {
      dashboardRefreshInFlight.current = false
      if (!background) {
        setIsLoading(false)
      }
    }
  }

  useEffect(() => {
    if (!session?.token) {
      return
    }

    if (shouldPauseDashboardRefresh) {
      return
    }

    const refreshDashboard = () => {
      if (document.hidden) {
        return
      }

      void loadDashboard(session.token, session.user.role, { background: true })
    }

    const intervalId = window.setInterval(
      refreshDashboard,
      DASHBOARD_REFRESH_MS,
    )
    window.addEventListener('focus', refreshDashboard)
    document.addEventListener('visibilitychange', refreshDashboard)

    return () => {
      window.clearInterval(intervalId)
      window.removeEventListener('focus', refreshDashboard)
      document.removeEventListener('visibilitychange', refreshDashboard)
    }
  }, [session, shouldPauseDashboardRefresh])

  function handleCredentialChange(event) {
    const nextValue =
      event.target.type === 'checkbox'
        ? event.target.checked
        : event.target.value

    setCredentials((current) => ({
      ...current,
      [event.target.name]: nextValue,
    }))
  }

  function pushToast({
    title,
    message = '',
    variant = 'success',
    duration = 3200,
  }) {
    setToasts((current) => [
      ...current,
      {
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        title,
        message,
        variant,
        duration,
      },
    ])
  }

  function dismissToast(id) {
    setToasts((current) => current.filter((toast) => toast.id !== id))
  }

  async function handleLogin() {
    setAuthError('')
    setIsSubmitting(true)

    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: credentials.email,
          password: credentials.password,
          rememberMe: Boolean(credentials.rememberMe),
        }),
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.message || 'Login failed.')
      }

      setSession({
        ...data,
        rememberMe: Boolean(credentials.rememberMe),
      })
      pushToast({
        title: 'Signed in',
        message: `Welcome back, ${data.user.name}.`,
        variant: 'success',
      })
    } catch (error) {
      setAuthError(error.message)
      pushToast({
        title: 'Sign-in failed',
        message: error.message,
        variant: 'error',
        duration: 4200,
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleForgotPasswordRequest() {
    const email = String(forgotPasswordEmail || '')
      .trim()
      .toLowerCase()

    if (!email) {
      setForgotPasswordError('Email is required.')
      return
    }

    setIsSubmitting(true)
    setForgotPasswordError('')
    setForgotPasswordMessage('')

    try {
      const response = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      })

      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(data.message || 'Failed to send reset link.')
      }

      const successMessage =
        data.message || 'If the email exists, a reset link has been sent.'

      setCredentials((current) => ({
        ...current,
        email,
      }))
      pushToast({
        title: 'Reset link sent',
        message: successMessage,
        variant: 'success',
        duration: 4200,
      })
      openLoginScreen()
    } catch (error) {
      setForgotPasswordError(error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleResetPasswordSubmit() {
    const password = String(resetPasswordForm.password || '')
    const confirmPassword = String(resetPasswordForm.confirmPassword || '')

    if (!resetPasswordToken) {
      setResetPasswordError('The reset link is invalid or missing.')
      return
    }

    if (!password || !confirmPassword) {
      setResetPasswordError('Both password fields are required.')
      return
    }

    if (password !== confirmPassword) {
      setResetPasswordError('Passwords do not match.')
      return
    }

    if (password.length < 8) {
      setResetPasswordError('Password must be at least 8 characters long.')
      return
    }

    setIsSubmitting(true)
    setResetPasswordError('')
    setResetPasswordMessage('')

    try {
      const response = await fetch(`${API_BASE_URL}/auth/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: resetPasswordToken,
          password,
        }),
      })

      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(data.message || 'Failed to reset password.')
      }

      setResetPasswordMessage(
        data.message || 'Password reset successful. You may sign in now.',
      )
      setResetPasswordForm({ password: '', confirmPassword: '' })
      setResetPasswordToken('')
      window.setTimeout(() => {
        openLoginScreen()
      }, 1200)
    } catch (error) {
      setResetPasswordError(error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  function handleRequestFormChange(event) {
    const { name, value } = event.target

    setRequestForm((current) => {
      if (name === 'requesterEmail') {
        const selectedRequester = users.find((user) => user.email === value)

        return {
          ...current,
          requesterEmail: value,
          requesterName: selectedRequester?.name ?? '',
          department: selectedRequester?.department ?? '',
        }
      }

      if (name === 'amount') {
        setRequestFormErrors((currentErrors) => ({
          ...currentErrors,
          amount: false,
        }))
        return {
          ...current,
          amount: formatAmountInput(value),
        }
      }

      if (name === 'branch') {
        return {
          ...current,
          branch: value,
          deliveryAddress: getBranchDeliveryAddress(
            value,
            companySettings,
            companyIdentities,
          ),
        }
      }

      setRequestFormErrors((currentErrors) => ({
        ...currentErrors,
        [name]: false,
      }))

      return {
        ...current,
        [name]: value,
      }
    })
  }

  function handleCloseCreateRequestModal() {
    setRequestForm(
      getInitialRequestForm(
        session?.user?.department || '',
        session?.user?.role === 'admin' ? '' : session?.user?.name || '',
        session?.user?.role === 'admin' ? '' : session?.user?.email || '',
        companySettings.companyName,
        getBranchDeliveryAddress(
          companySettings.companyName,
          companySettings,
          companyIdentities,
        ),
      ),
    )
    setRequestQuotationFile(null)
    setRequestFormErrors({
      title: false,
      description: false,
      amount: false,
    })
    setActionError('')
    setIsCreateRequestModalOpen(false)
  }

  function handleRequestQuotationFileChange(event) {
    setRequestQuotationFile(event.target.files?.[0] ?? null)
  }

  function handleClearRequestQuotationFile() {
    setRequestQuotationFile(null)
  }

  async function handleActionFormChange(event) {
    const { name, type, checked, value } = event.target
    const nextValue = type === 'checkbox' ? checked : value

    setActionForm((current) => ({
      ...current,
      [name]: nextValue,
    }))

  }

  async function handleReviewSupplierPick(value) {
    if (!selectedItem || !session?.token) {
      return
    }

    const nextSupplier = String(value ?? '').trim()
    const previousActionSupplier = actionForm.supplier
    const previousPurchaseOrderForm = purchaseOrderForm

    setActionError('')
    setActionForm((current) => ({
      ...current,
      supplier: nextSupplier,
    }))
    setPurchaseOrderForm((current) => ({
      ...current,
      supplier: nextSupplier,
    }))

    try {
      const response = await fetch(
        `${API_BASE_URL}/workflows/purchase-requests/${selectedItem.id}/po-draft`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.token}`,
          },
          body: JSON.stringify({
            ...previousPurchaseOrderForm,
            supplier: nextSupplier,
          }),
        },
      )

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.message || 'Failed to update supplier.')
      }

      const normalizedSupplier =
        data.poDraft?.supplier ||
        (data.supplier === 'Pending selection' ? '' : data.supplier) ||
        nextSupplier

      setItems((current) =>
        current.map((item) => (item.id === data.id ? data : item)),
      )
      setPurchaseOrderDrafts((current) => ({
        ...current,
        [data.id]: {
          ...(data.poDraft ?? previousPurchaseOrderForm),
          supplier: normalizedSupplier,
        },
      }))
      setActionForm((current) => ({
        ...current,
        supplier: normalizedSupplier,
      }))
      setPurchaseOrderForm((current) => ({
        ...current,
        ...(data.poDraft ?? {}),
        supplier: normalizedSupplier,
      }))

      pushToast({
        title: 'Supplier updated',
        message: normalizedSupplier
          ? `${data.requestNumber} supplier saved.`
          : `${data.requestNumber} supplier cleared.`,
        variant: 'success',
      })
    } catch (error) {
      setActionError(error.message)
      setActionForm((current) => ({
        ...current,
        supplier: previousActionSupplier,
      }))
      setPurchaseOrderForm(previousPurchaseOrderForm)
      pushToast({
        title: 'Supplier update failed',
        message: error.message,
        variant: 'error',
        duration: 4200,
      })
    }
  }

  function handleUploadFormChange(event) {
    setUploadForm((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }))
  }

  function handleUploadFileChange(event) {
    const file = event.target.files?.[0] ?? null
    setUploadForm((current) => ({
      ...current,
      file,
    }))
  }

  function handleReviewApprovalFileChange(event) {
    const file = event.target.files?.[0] ?? null
    setUploadForm({
      type: 'other',
      label: 'Boss approval attachment',
      file,
    })
  }

  function handleClearReviewApprovalFile() {
    setUploadForm({
      type: 'other',
      label: 'Boss approval attachment',
      file: null,
    })
  }

  function handleRequestAdminFormChange(event) {
    setRequestAdminForm((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }))
  }

  function handleUserFormChange(event) {
    setUserForm((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }))
  }

  function handleSupplierFormChange(event) {
    setSupplierForm((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }))
  }

  function handlePurchaseOrderFormChange(event) {
    const { name } = event.target
    const value = ['salesTax', 'shippingHandling', 'other'].includes(
      event.target.name,
    )
      ? sanitizeNumericInput(event.target.value)
      : event.target.value

    if (name === 'poNumber') {
      return
    }

    setPurchaseOrderForm((current) => {
      const nextForm = {
        ...current,
        [name]: value,
      }

      if (selectedItem?.id) {
        setPurchaseOrderDrafts((drafts) => ({
          ...drafts,
          [selectedItem.id]: nextForm,
        }))
      }

      return nextForm
    })

    if (['supplier', 'notes'].includes(name)) {
      setActionForm((current) => ({
        ...current,
        [name]: value,
      }))
    }
  }

  function handleSettingsFormChange(event) {
    setSettingsForm((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }))
  }

  function handleWorkflowStageMove(stage, direction) {
    setSettingsForm((current) => {
      const stages = Array.isArray(current.workflowStages)
        ? [...current.workflowStages]
        : [...DEFAULT_WORKFLOW_STAGES]
      const currentIndex = stages.indexOf(stage)

      if (currentIndex === -1) {
        return current
      }

      const targetIndex =
        direction === 'up' ? currentIndex - 1 : currentIndex + 1

      if (targetIndex < 0 || targetIndex >= stages.length) {
        return current
      }

      ;[stages[currentIndex], stages[targetIndex]] = [
        stages[targetIndex],
        stages[currentIndex],
      ]

      return {
        ...current,
        workflowStages: stages,
      }
    })
  }

  function handleRequesterSettingsFormChange(event) {
    const { name, type, checked, value } = event.target

    setSettingsError('')
    setRequesterSettingsForm((current) => ({
      ...current,
      [name]: type === 'checkbox' ? checked : value,
    }))
  }

  function handleIdentityFormChange(event) {
    setIdentitySaveMessage('')
    setIdentityForm((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }))
  }

  function loadImageIntoForm(file, setter, options = {}) {
    if (!file) {
      return
    }

    const { onStart, onDone, onError } = options

    void (async () => {
      try {
        onStart?.()
        const optimizedLogoUrl = await optimizeLogoFile(file)
        setter((current) => ({
          ...current,
          logoUrl: optimizedLogoUrl || current.logoUrl,
        }))
        onDone?.()
      } catch (error) {
        onError?.(error)
      }
    })()
  }

  function handleSettingsLogoChange(event) {
    const file = event.target.files?.[0]
    loadImageIntoForm(file, setSettingsForm, {
      onError: (error) =>
        pushToast({
          title: 'Logo update failed',
          message: error.message,
          variant: 'error',
          duration: 4200,
        }),
    })
  }

  function handleIdentityLogoChange(event) {
    const file = event.target.files?.[0]
    loadImageIntoForm(file, setIdentityForm, {
      onStart: () => setIdentitySaveMessage(''),
      onError: (error) =>
        pushToast({
          title: 'Logo update failed',
          message: error.message,
          variant: 'error',
          duration: 4200,
        }),
    })
  }

  function handleRequestForPaymentFormChange(event) {
    if (['payee', 'amountRequested'].includes(event.target.name)) {
      setRequestForPaymentErrors((current) => ({
        ...current,
        [event.target.name]: false,
      }))
    }

    setRequestForPaymentForm((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }))
  }

  function handleRequestForPaymentSupplierSelect(supplier) {
    setRequestForPaymentErrors((current) => ({
      ...current,
      payee: false,
    }))

    setRequestForPaymentForm((current) => ({
      ...current,
      payee: supplier?.name || '',
      tinNumber: supplier?.tinNumber || '',
    }))
  }

  function handlePurchaseOrderLineItemChange(index, field, value) {
    setPurchaseOrderForm((current) => {
      const lineItems = current.lineItems.map((item, itemIndex) => {
        if (itemIndex !== index) {
          return item
        }

        const nextValue = ['qty', 'unitPrice'].includes(field)
          ? sanitizeNumericInput(value)
          : value

        const nextItem = {
          ...item,
          [field]: nextValue,
        }

        const qty =
          Number.parseFloat(
            String(field === 'qty' ? nextValue : nextItem.qty).replaceAll(
              ',',
              '',
            ),
          ) || 0
        const unitPrice =
          Number.parseFloat(
            String(
              field === 'unitPrice' ? nextValue : nextItem.unitPrice,
            ).replaceAll(',', ''),
          ) || 0

        return {
          ...nextItem,
          total: qty > 0 && unitPrice > 0 ? String(qty * unitPrice) : '',
        }
      })

      const nextForm = {
        ...current,
        lineItems,
      }

      if (selectedItem?.id) {
        setPurchaseOrderDrafts((drafts) => ({
          ...drafts,
          [selectedItem.id]: nextForm,
        }))
      }

      return nextForm
    })
  }

  function handleAddPurchaseOrderLineItem() {
    setPurchaseOrderForm((current) => {
      const nextForm = {
        ...current,
        lineItems: [...current.lineItems, getInitialPurchaseOrderLineItem()],
      }

      if (selectedItem?.id) {
        setPurchaseOrderDrafts((drafts) => ({
          ...drafts,
          [selectedItem.id]: nextForm,
        }))
      }

      return nextForm
    })
  }

  function handleRemovePurchaseOrderLineItem(index) {
    setPurchaseOrderForm((current) => {
      const nextForm = {
        ...current,
        lineItems:
          current.lineItems.length === 1
            ? [getInitialPurchaseOrderLineItem()]
            : current.lineItems.filter((_, itemIndex) => itemIndex !== index),
      }

      if (selectedItem?.id) {
        setPurchaseOrderDrafts((drafts) => ({
          ...drafts,
          [selectedItem.id]: nextForm,
        }))
      }

      return nextForm
    })
  }

  function handleExportCsv() {
    const headers = [
      'Request Number',
      'Title',
      'Branch',
      'Department',
      'Requester',
      'Amount',
      'Status',
      'Current Stage',
      'Requested At',
      'Date Needed',
      'Supplier',
    ]

    const rows = filteredItems.map((item) => [
      item.requestNumber,
      item.title,
      item.branch,
      item.department,
      item.requester,
      item.amount,
      item.status,
      item.currentStage,
      formatExportDate(item.requestedAt),
      formatExportDate(item.dateNeeded),
      item.supplier || '',
    ])

    const csvContent = [headers, ...rows]
      .map((row) => row.map((value) => escapeCsvValue(value)).join(','))
      .join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'procurement-request-list.csv'
    link.click()
    URL.revokeObjectURL(url)

    pushToast({
      title: 'CSV exported',
      message: `${filteredItems.length} request${filteredItems.length === 1 ? '' : 's'} downloaded.`,
      variant: 'success',
    })
  }

  function handleExportRfpCsv(records = accountantDashboardRecords) {
    const exportRecords = Array.isArray(records) ? records : accountantDashboardRecords
    const headers = [
      'Request Number',
      'Title',
      'Payee / Supplier',
      'Amount Requested',
      'Due Date',
      'Invoice Number',
      'Payment Status',
      'Current Stage',
      'Requester',
    ]

    const rows = exportRecords.map((record) => [
      record.requestNumber,
      record.title,
      getEffectiveRequestForPaymentPayee(record),
      getRecordAmount(record),
      formatExportDate(record.rfpDraft?.dueDate || record.dateNeeded),
      record.rfpDraft?.invoiceNumber || '',
      record.rfpDraft?.paymentStatus || '',
      record.currentStage,
      record.requester || record.requesterName || '',
    ])

    const csvContent = [headers, ...rows]
      .map((row) => row.map((value) => escapeCsvValue(value)).join(','))
      .join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'rfp-records.csv'
    link.click()
    URL.revokeObjectURL(url)

    pushToast({
      title: 'CSV exported',
      message: `${exportRecords.length} RFP record${exportRecords.length === 1 ? '' : 's'} downloaded.`,
      variant: 'success',
    })
  }

  function handleExportPdf() {
    const printWindow = window.open('', '_blank', 'width=1200,height=900')
    if (!printWindow) {
      pushToast({
        title: 'Popup blocked',
        message: 'Allow popups to export the PDF view.',
        variant: 'error',
        duration: 4200,
      })
      return
    }

    const exportTotalValue = filteredItems.reduce(
      (sum, item) => sum + Number(item.amount || 0),
      0,
    )

    const rowsHtml = filteredItems
      .map(
        (item) => `
          <tr>
            <td>${item.requestNumber}</td>
            <td>${item.title}</td>
            <td>${item.branch ?? ''}</td>
            <td>${item.department}</td>
            <td>${item.requester}</td>
            <td>${item.currentStage}</td>
            <td>${item.status}</td>
            <td>${formatExportDate(item.requestedAt)}</td>
            <td>${formatExportDate(item.dateNeeded)}</td>
            <td>${item.supplier}</td>
          </tr>
        `,
      )
      .join('')

    printWindow.document.write(`
      <html>
        <head>
          <title>Procurement Request List</title>
          <style>
            * { box-sizing: border-box; }
            body { font-family: Arial, sans-serif; padding: 32px; color: #0f1720; }
            .report-header {
              display: flex;
              justify-content: space-between;
              gap: 24px;
              padding: 24px;
              border: 1px solid #d7dee7;
              border-radius: 18px;
              background: linear-gradient(135deg, #f8fafc 0%, #eef3f8 100%);
            }
            .brand {
              display: flex;
              gap: 14px;
              align-items: center;
            }
            .brand-mark {
              width: 52px;
              height: 52px;
              border-radius: 14px;
              display: inline-flex;
              align-items: center;
              justify-content: center;
              background: linear-gradient(135deg, #d5b56c 0%, #f0c251 100%);
              color: #12202d;
              font-size: 24px;
              font-weight: 800;
            }
            .kicker { margin: 0 0 4px; color: #8b6d2b; font-size: 11px; letter-spacing: 0.16em; text-transform: uppercase; }
            h1 { margin: 0 0 6px; font-size: 30px; }
            .subhead { margin: 0; color: #475569; }
            .meta {
              min-width: 240px;
              display: grid;
              gap: 10px;
            }
            .meta-card {
              padding: 12px 14px;
              border-radius: 14px;
              background: #ffffff;
              border: 1px solid #e2e8f0;
            }
            .meta-card span {
              display: block;
              font-size: 11px;
              color: #64748b;
              text-transform: uppercase;
              letter-spacing: 0.08em;
              margin-bottom: 4px;
            }
            .summary-grid {
              display: grid;
              grid-template-columns: repeat(3, minmax(0, 1fr));
              gap: 12px;
              margin-top: 18px;
            }
            .summary-card {
              padding: 14px 16px;
              border-radius: 14px;
              border: 1px solid #e2e8f0;
              background: #ffffff;
            }
            .summary-card span {
              display: block;
              font-size: 11px;
              color: #64748b;
              text-transform: uppercase;
              letter-spacing: 0.08em;
              margin-bottom: 6px;
            }
            .summary-card strong { font-size: 22px; }
            .filter-row {
              margin-top: 18px;
              padding: 12px 14px;
              border-radius: 14px;
              background: #f8fafc;
              border: 1px solid #e2e8f0;
              color: #334155;
              font-size: 12px;
            }
            table { width: 100%; border-collapse: collapse; margin-top: 24px; }
            th, td { border: 1px solid #d7dee7; padding: 10px; text-align: left; font-size: 12px; vertical-align: top; }
            th { background: #e8eef5; color: #1e293b; }
            tbody tr:nth-child(even) { background: #f8fafc; }
            .footer { margin-top: 18px; color: #64748b; font-size: 11px; }
          </style>
        </head>
        <body>
          <section class="report-header">
            <div>
              <div class="brand">
                <div class="brand-mark">J</div>
                <div>
                  <p class="kicker">${companySettings.companyName}</p>
                  <h1>Procurement Request Report</h1>
                  <p class="subhead">Filtered registry export from the Procurement Management System.</p>
                </div>
              </div>
              <div class="summary-grid">
                <div class="summary-card">
                  <span>Requests</span>
                  <strong>${filteredItems.length}</strong>
                </div>
                <div class="summary-card">
                  <span>Open Requests</span>
                  <strong>${filteredItems.filter((item) => item.status === 'open').length}</strong>
                </div>
                <div class="summary-card">
                  <span>Tracked Value</span>
                  <strong>${new Intl.NumberFormat('en-PH', {
                    style: 'currency',
                    currency: 'PHP',
                    maximumFractionDigits: 0,
                  }).format(exportTotalValue)}</strong>
                </div>
              </div>
              <div class="filter-row">
                <strong>Scope:</strong> All requests currently visible in the registry
              </div>
            </div>
            <div class="meta">
              <div class="meta-card">
                <span>Generated by</span>
                <strong>${session?.user?.name ?? 'System User'}</strong>
              </div>
              <div class="meta-card">
                <span>Generated on</span>
                <strong>${formatExportDate(new Date().toISOString())}</strong>
              </div>
            </div>
          </section>
          <table>
            <thead>
              <tr>
                <th>Request Number</th>
                <th>Title</th>
                <th>Branch</th>
                <th>Department</th>
                <th>Requester</th>
                <th>Current Stage</th>
                <th>Status</th>
                <th>Requested At</th>
                <th>Date Needed</th>
                <th>Supplier</th>
              </tr>
            </thead>
            <tbody>${rowsHtml}</tbody>
          </table>
          <p class="footer">Generated from the live filtered request registry.</p>
        </body>
      </html>
    `)
    printWindow.document.close()
    printWindow.focus()
    printWindow.print()

    pushToast({
      title: 'PDF view opened',
      message: 'Use the print dialog to save the filtered list as PDF.',
      variant: 'success',
    })
  }

  function openCreateRequestModal() {
    setRequestForm(
      getInitialRequestForm(
        session?.user?.department || '',
        session?.user?.role === 'admin' ? '' : session?.user?.name || '',
        session?.user?.role === 'admin' ? '' : session?.user?.email || '',
        companySettings.companyName,
        getBranchDeliveryAddress(
          companySettings.companyName,
          companySettings,
          companyIdentities,
        ),
      ),
    )
    setRequestQuotationFile(null)
    setIsCreateRequestModalOpen(true)
  }

  function openEditRequestModal() {
    if (!selectedItem || !canEditSelectedRequest) {
      return
    }

    setRequestAdminForm(getRequestAdminForm(selectedItem))
    setIsEditRequestModalOpen(true)
  }

  function openEditRequestModalForItem(requestId) {
    const targetItem = items.find((item) => item.id === requestId)

    if (
      !targetItem ||
      !session?.user ||
      (session.user.role !== 'admin' &&
        session.user.email !== targetItem.requesterEmail)
    ) {
      return
    }

    setSelectedId(targetItem.id)
    setRequestAdminForm(getRequestAdminForm(targetItem))
    setIsEditRequestModalOpen(true)
  }

  function openRequestDetailsModal() {
    if (!selectedItem || !session?.user) {
      return
    }

    if (!canAccessRequestWorkspace(session.user, selectedItem)) {
      pushToast({
        title: 'Access restricted',
        message: `You can no longer open ${selectedItem.currentStage} for this request.`,
        variant: 'error',
        duration: 4200,
      })
      return
    }

    setIsPurchaseOrderPageOpen(false)
    setIsRequestWorkspacePageOpen(true)
  }

  function openCreateUserModal() {
    setSelectedUserId('')
    setUserForm(getInitialUserForm())
    setUserError('')
    setIsUserModalOpen(true)
  }

  function openCreateSupplierModal() {
    if (!isAdmin) {
      return
    }

    setSupplierModalMode('create')
    setSelectedSupplierId('')
    setSupplierError('')
    setSupplierForm(getInitialSupplierForm())
    setIsSupplierModalOpen(true)
  }

  function openEditSupplierModal(supplierId = selectedSupplierId) {
    const targetSupplier = suppliers.find(
      (supplier) => supplier.id === supplierId,
    )

    if (!isAdmin || !targetSupplier) {
      return
    }

    setSupplierModalMode('edit')
    setSelectedSupplierId(targetSupplier.id)
    setSupplierError('')
    setSupplierForm({
      name: targetSupplier.name,
      category: targetSupplier.category,
      supplierType: targetSupplier.supplierType,
      tinNumber: targetSupplier.tinNumber ?? '',
      contactPerson: targetSupplier.contactPerson ?? '',
      email: targetSupplier.email ?? '',
      phone: targetSupplier.phone ?? '',
      address: targetSupplier.address ?? '',
      notes: targetSupplier.notes ?? '',
    })
    setIsSupplierModalOpen(true)
  }

  function openConfirmDialog(config) {
    setConfirmDialog(config)
  }

  function openEditUserModal(userId = selectedUserId) {
    const targetUser = users.find((user) => user.id === userId)

    if (!targetUser) {
      return
    }

    setSelectedUserId(targetUser.id)
    setUserForm({
      name: targetUser.name,
      email: targetUser.email,
      role: targetUser.role,
      department: targetUser.department ?? '',
      password: '',
    })
    setIsUserModalOpen(true)
  }

  function openExpandedPanel(panelKey) {
    setExpandedPanel(panelKey)
  }

  function closeExpandedPanel() {
    setExpandedPanel('')
  }

  function handleOpenWorkflowPreview(itemId) {
    if (itemId) {
      setSelectedId(itemId)
    }

    setExpandedPanel('workflow')
  }

  function handleOpenRequestSummaryPreview(itemId) {
    if (itemId) {
      setSelectedId(itemId)
    }

    setExpandedPanel('request-summary')
  }

  function openRequestForPaymentPage(targetRequest = selectedItem) {
    const fallbackRequest =
      items.find((item) => canAccessRequestForPayment(item)) ?? null
    const requestedIsImmediatelyAccessible =
      Boolean(targetRequest) && canAccessRequestForPayment(targetRequest)
    const nextTargetRequest = requestedIsImmediatelyAccessible
      ? targetRequest
      : fallbackRequest

    if (!nextTargetRequest) {
      return
    }

    const resolvedRequest =
      items.find((item) => item.id === nextTargetRequest.id) ??
      nextTargetRequest
    const isSelectedRequest = selectedItem?.id === resolvedRequest.id
    const hasImmediateRfpAccess =
      canAccessRequestForPayment(resolvedRequest) ||
      canAccessRequestForPayment(nextTargetRequest) ||
      (isSelectedRequest && canAccessRequestForPayment(selectedItem))

    if (!hasImmediateRfpAccess) {
      pushToast({
        title: 'Request for Payment unavailable',
        message:
          'Request for Payment is not available for this request yet.',
        variant: 'error',
        duration: 4200,
      })
      return
    }

    const latestDraft =
      purchaseOrderDrafts[resolvedRequest.id] ??
      getPurchaseOrderDraft(resolvedRequest, items)
    const savedSupplier =
      purchaseOrderForm.supplier ||
      actionForm.supplier ||
      latestDraft.supplier ||
      (resolvedRequest.supplier === 'Pending selection'
        ? ''
        : resolvedRequest.supplier || '')
    const matchedSupplier = suppliers.find(
      (supplier) => supplier.name === savedSupplier,
    )
    const savedRfpDraft = resolvedRequest.rfpDraft ?? {}
    const hasSavedRfpDraft = Boolean(
      savedRfpDraft.payee ||
      savedRfpDraft.tinNumber ||
      savedRfpDraft.invoiceNumber ||
      savedRfpDraft.paymentReference ||
      savedRfpDraft.amountRequested ||
      savedRfpDraft.dueDate ||
      savedRfpDraft.notes,
    )

    setSelectedId(resolvedRequest.id)
    setIsRequestWorkspacePageOpen(false)
    setIsPurchaseOrderPageOpen(false)
    setIsPurchaseOrderDirectoryOpen(false)

    const canEditRfpDraft = canEditRequestForPayment(
      session?.user,
      resolvedRequest,
    )

    setRequestForPaymentForm(getRequestForPaymentFormFromItem(resolvedRequest))
    setIsRequestForPaymentEditing(canEditRfpDraft && !hasSavedRfpDraft)
    setIsRequestForPaymentPageOpen(true)
  }

  function openPurchaseOrderPage(requestId = selectedId) {
    const targetItem =
      items.find((item) => item.id === requestId) ?? selectedItem

    if (!targetItem) {
      pushToast({
        title: 'No request selected',
        message:
          'Select a request first before opening the purchase order page.',
        variant: 'error',
        duration: 4200,
      })
      return
    }

    const baseDraft =
      purchaseOrderDrafts[targetItem.id] ??
      getPurchaseOrderDraft(targetItem, items)
    setSelectedId(targetItem.id)
    setPurchaseOrderForm({
      ...baseDraft,
      supplier:
        baseDraft.supplier ||
        actionForm.supplier ||
        (targetItem.supplier === 'Pending selection'
          ? ''
          : targetItem.supplier || ''),
      notes: baseDraft.notes || actionForm.notes || targetItem.notes || '',
      poNumber:
        baseDraft.poNumber || getAssignedPurchaseOrderNumber(targetItem, items),
    })
    setIsPurchaseOrderDirectoryOpen(false)
    setIsPurchaseOrderPageOpen(true)
  }

  function handleReviewPurchaseOrder() {
    openPurchaseOrderPage(selectedId)
  }

  function closeRequestForPaymentPage() {
    setIsRequestForPaymentPageOpen(false)
    setIsRequestForPaymentEditing(true)
    setRequestForPaymentErrors({})
  }

  function handleCancelRequestForPaymentEdit() {
    const latestItem =
      items.find((item) => item.id === selectedId) ?? selectedItem ?? null

    if (!latestItem) {
      closeRequestForPaymentPage()
      return
    }

    const savedRfpDraft = latestItem.rfpDraft ?? {}
    const hasSavedRfpDraft = Boolean(
      savedRfpDraft.payee ||
      savedRfpDraft.tinNumber ||
      savedRfpDraft.invoiceNumber ||
      savedRfpDraft.paymentReference ||
      savedRfpDraft.amountRequested ||
      savedRfpDraft.dueDate ||
      savedRfpDraft.notes,
    )

    setRequestForPaymentForm(getRequestForPaymentFormFromItem(latestItem))

    if (hasSavedRfpDraft) {
      setIsRequestForPaymentEditing(false)
      return
    }

    closeRequestForPaymentPage()
  }

  function closePurchaseOrderPage() {
    setIsPurchaseOrderPageOpen(false)
  }

  function closePurchaseOrderDirectory() {
    setIsPurchaseOrderDirectoryOpen(false)
  }

  function closeRequestWorkspacePage() {
    setIsRequestWorkspacePageOpen(false)
  }

  function closeApprovalConfirmationPage() {
    setApprovalConfirmationRequest(null)
    setIsRequestWorkspacePageOpen(false)
  }

  async function handleSaveRequestForPaymentPage() {
    if (
      !selectedItem ||
      !session?.token ||
      !canEditRequestForPayment(session?.user, selectedItem)
    ) {
      pushToast({
        title: 'RFP locked',
        message:
          'Only the admin can edit the Request for Payment once the workflow reaches Prepare PO.',
        variant: 'error',
        duration: 4200,
      })
      return
    }

    const validationErrors = getRequestForPaymentValidationErrors(
      requestForPaymentForm,
    )

    if (Object.values(validationErrors).some(Boolean)) {
      setRequestForPaymentErrors(validationErrors)
      pushToast({
        title: 'Missing required fields',
        message: 'Payee / supplier and Amount requested are required.',
        variant: 'error',
        duration: 4200,
      })
      return
    }

    setIsSubmitting(true)

    try {
      const data = await saveRequestForPaymentDraft(selectedItem)

      setItems((current) =>
        current.map((item) => (item.id === data.id ? data : item)),
      )
      setRequestForPaymentForm(getRequestForPaymentFormFromItem(data))
      setRequestForPaymentErrors({})
      setIsRequestForPaymentEditing(false)
      setActionForm((current) => ({
        ...current,
        supplier: data.supplier || current.supplier,
        invoiceNumber: data.invoiceNumber || current.invoiceNumber,
      }))
      pushToast({
        title: 'Request for payment saved',
        message: `${data.requestNumber} payment details were saved to the database.`,
        variant: 'success',
      })
    } catch (error) {
      pushToast({
        title: 'Save failed',
        message: error.message,
        variant: 'error',
        duration: 4200,
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  async function saveRequestForPaymentDraft(targetItem = selectedItem) {
    return patchRequestForPaymentDraft(targetItem, requestForPaymentForm)
  }

  async function patchRequestForPaymentDraft(targetItem, payload) {
    const response = await fetch(
      `${API_BASE_URL}/workflows/purchase-requests/${targetItem.id}/rfp-draft`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.token}`,
        },
        body: JSON.stringify(payload),
      },
    )

    const data = await response.json()
    if (!response.ok) {
      throw new Error(data.message || 'Failed to save request for payment.')
    }

    return data
  }

  async function saveRfpPaymentStatusForRecord(
    record,
    paymentStatus,
    { silent = false } = {},
  ) {
    if (!record || !session?.token) {
      return null
    }

    const normalizedPaymentStatus = String(paymentStatus || '').trim()
    const updated = await patchRequestForPaymentDraft(record, {
      ...getRequestForPaymentFormFromItem(record),
      paymentStatus: normalizedPaymentStatus,
    })

    setItems((current) =>
      current.map((item) => (item.id === updated.id ? updated : item)),
    )

    if (selectedId === updated.id) {
      setRequestForPaymentForm(getRequestForPaymentFormFromItem(updated))
    }

    if (!silent) {
      pushToast({
        title: 'Payment status saved',
        message: `${updated.requestNumber} was marked as ${normalizedPaymentStatus || 'updated'}.`,
        variant: 'success',
      })
    }

    return updated
  }

  async function handleSaveRfpPaymentStatus(record, paymentStatus) {
    return saveRfpPaymentStatusForRecord(record, paymentStatus)
  }

  function getInvoiceDocuments(record) {
    return (record?.documents || []).filter(
      (document) => document.type === 'invoice',
    )
  }

  function getCurrentInvoiceDocument(record) {
    const invoiceDocuments = getInvoiceDocuments(record)
    return invoiceDocuments[invoiceDocuments.length - 1] || null
  }

  async function removeInvoiceDocuments(record) {
    const invoiceDocuments = getInvoiceDocuments(record)

    for (const document of invoiceDocuments) {
      const response = await fetch(
        `${API_BASE_URL}/workflows/purchase-requests/${record.id}/documents/${document.id}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${session.token}`,
          },
        },
      )

      if (!response.ok) {
        let message = 'Failed to delete invoice.'

        try {
          const data = await response.json()
          message = data.message || message
        } catch {
          // Ignore JSON parse issues for empty delete responses.
        }

        throw new Error(message)
      }
    }
  }

  async function saveInvoiceDetailsForRecord(
    record,
    form,
    { silent = false } = {},
  ) {
    if (!record || !session?.token) {
      return null
    }

    const invoiceNumber = String(form?.invoiceNumber || '').trim()
    const file = form?.file || null

    let baseRecord = record

    if (file) {
      await removeInvoiceDocuments(record)

      const optimizedInvoiceFile = await optimizeDocumentFile(file)
      const formData = new FormData()
      formData.append('type', 'invoice')
      formData.append(
        'label',
        invoiceNumber || file?.name || 'Invoice',
      )
      formData.append('document', optimizedInvoiceFile)

      const uploadResponse = await fetch(
        `${API_BASE_URL}/workflows/purchase-requests/${record.id}/documents`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session.token}`,
          },
          body: formData,
        },
      )

      const uploadData = await uploadResponse.json()
      if (!uploadResponse.ok) {
        throw new Error(uploadData.message || 'Failed to upload invoice.')
      }

      baseRecord = uploadData
    }

    const updated = await patchRequestForPaymentDraft(baseRecord, {
      ...getRequestForPaymentFormFromItem(baseRecord),
      invoiceNumber,
    })

    setItems((current) =>
      current.map((item) => (item.id === updated.id ? updated : item)),
    )

    if (selectedId === updated.id) {
      setRequestForPaymentForm(getRequestForPaymentFormFromItem(updated))
    }

    if (!silent) {
      pushToast({
        title: file ? 'Invoice uploaded' : 'Invoice updated',
        message: `${updated.requestNumber} invoice details were updated.`,
        variant: 'success',
      })
    }

    return updated
  }

  async function deleteInvoiceForRecord(record, { silent = false } = {}) {
    if (!record || !session?.token) {
      return null
    }

    const currentInvoiceDocument = getCurrentInvoiceDocument(record)

    if (!currentInvoiceDocument) {
      throw new Error('No uploaded invoice file was found.')
    }

    await removeInvoiceDocuments(record)

    const updated = await patchRequestForPaymentDraft(record, {
      ...getRequestForPaymentFormFromItem(record),
      invoiceNumber: '',
    })

    setItems((current) =>
      current.map((item) => (item.id === updated.id ? updated : item)),
    )

    if (selectedId === updated.id) {
      setRequestForPaymentForm(getRequestForPaymentFormFromItem(updated))
    }

    if (!silent) {
      pushToast({
        title: 'Invoice deleted',
        message: `${updated.requestNumber} invoice file was removed.`,
        variant: 'success',
      })
    }

    return updated
  }

  async function handleSubmitInvoiceUpload() {
    if (!invoiceUploadRecord || !session?.token) {
      return
    }

    setInvoiceUploadError('')
    setIsSubmitting(true)

    try {
      await saveInvoiceDetailsForRecord(invoiceUploadRecord, invoiceUploadForm)
      closeInvoiceUploadModal()
    } catch (error) {
      const message = error.message || 'Failed to upload invoice.'
      setInvoiceUploadError(message)
      pushToast({
        title: 'Invoice upload failed',
        message,
        variant: 'error',
        duration: 4200,
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleDeleteInvoiceUpload() {
    if (!invoiceUploadRecord || !session?.token) {
      return
    }

    const currentInvoiceDocument = getCurrentInvoiceDocument(invoiceUploadRecord)

    if (!currentInvoiceDocument) {
      setInvoiceUploadError('No uploaded invoice file was found.')
      return
    }

    setInvoiceUploadError('')
    setIsSubmitting(true)

    try {
      await deleteInvoiceForRecord(invoiceUploadRecord)
      closeInvoiceUploadModal()
    } catch (error) {
      const message = error.message || 'Failed to delete invoice.'
      setInvoiceUploadError(message)
      pushToast({
        title: 'Delete failed',
        message,
        variant: 'error',
        duration: 4200,
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleSubmitRequestForPaymentToApproval() {
    if (
      !selectedItem ||
      !session?.token ||
      selectedItem.currentStage !== 'Request for Payment' ||
      !canEditRequestForPayment(session?.user, selectedItem)
    ) {
      pushToast({
        title: 'Submit unavailable',
        message:
          'Only the requester or admin can submit the Request for Payment to Approval.',
        variant: 'error',
        duration: 4200,
      })
      return
    }

    const validationErrors = getRequestForPaymentValidationErrors(
      requestForPaymentForm,
    )

    if (Object.values(validationErrors).some(Boolean)) {
      setRequestForPaymentErrors(validationErrors)
      pushToast({
        title: 'Missing required fields',
        message: 'Payee / supplier and Amount requested are required.',
        variant: 'error',
        duration: 4200,
      })
      return
    }

    setIsSubmitting(true)

    try {
      const savedDraft = await saveRequestForPaymentDraft(selectedItem)
      const response = await fetch(
        `${API_BASE_URL}/workflows/purchase-requests/${selectedItem.id}/advance`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.token}`,
          },
          body: JSON.stringify({
            notifyApprover: Boolean(actionForm.notifyApprover),
            comment: `${session.user.name} submitted ${savedDraft.requestNumber} to Approval.`,
          }),
        },
      )

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.message || 'Failed to submit Request for Payment to Approval.')
      }

      setItems((current) =>
        current.map((item) => (item.id === data.id ? data : item)),
      )
      setSelectedId(data.id)
      setRequestForPaymentForm(getRequestForPaymentFormFromItem(data))
      setRequestForPaymentErrors({})
      setIsRequestForPaymentEditing(false)
      setIsRequestForPaymentPageOpen(false)
      setActionForm((current) => ({
        ...current,
        notifyApprover: false,
        notes: '',
      }))

      pushToast({
        title: 'Sent to Approval',
        message: `${data.requestNumber} moved to ${data.currentStage}.`,
        variant: 'success',
      })

      if (data.approverNotification?.requested) {
        pushToast({
          title: data.approverNotification.skipped
            ? 'Approver email skipped'
            : 'Approver notified',
          message: data.approverNotification.skipped
            ? data.approverNotification.reason ||
              'The request moved to Approval, but the approver email was not sent.'
            : 'An approval email has been sent to the approver.',
          variant: data.approverNotification.skipped ? 'error' : 'success',
          duration: 4800,
        })
      }
    } catch (error) {
      pushToast({
        title: 'Submit failed',
        message: error.message,
        variant: 'error',
        duration: 4200,
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  function handleSavePurchaseOrderPage() {
    void (async () => {
      if (!selectedItem || !session?.token) {
        return
      }

      setIsSubmitting(true)

      try {
        const response = await fetch(
          `${API_BASE_URL}/workflows/purchase-requests/${selectedItem.id}/po-draft`,
          {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${session.token}`,
            },
            body: JSON.stringify(purchaseOrderForm),
          },
        )

        const data = await response.json()
        if (!response.ok) {
          throw new Error(
            data.message || 'Failed to save purchase order draft.',
          )
        }

        setItems((current) =>
          current.map((item) => (item.id === data.id ? data : item)),
        )
        setPurchaseOrderDrafts((drafts) => ({
          ...drafts,
          [data.id]: {
            ...(data.poDraft ?? purchaseOrderForm),
            supplier:
              data.poDraft?.supplier ||
              data.supplier ||
              purchaseOrderForm.supplier ||
              '',
          },
        }))
        setActionForm((current) => ({
          ...current,
          supplier: data.supplier || purchaseOrderForm.supplier,
          poNumber: data.poNumber || purchaseOrderForm.poNumber,
          notes: purchaseOrderForm.notes,
        }))
        setIsPurchaseOrderPageOpen(false)
        pushToast({
          title: 'Purchase order draft saved',
          message: 'The PO details and breakdown were saved.',
          variant: 'success',
        })
      } catch (error) {
        pushToast({
          title: 'Save purchase order failed',
          message: error.message,
          variant: 'error',
          duration: 4200,
        })
      } finally {
        setIsSubmitting(false)
      }
    })()
  }

  function getPurchaseOrderPreviewMarkup() {
    if (!selectedItem) {
      return null
    }

    const currency = selectedItem.currency || 'PHP'
    const subTotal = purchaseOrderForm.lineItems.reduce(
      (sum, lineItem) => sum + parseAmountValue(lineItem.total),
      0,
    )
    const salesTax = parseAmountValue(purchaseOrderForm.salesTax)
    const shippingHandling = parseAmountValue(
      purchaseOrderForm.shippingHandling,
    )
    const other = parseAmountValue(purchaseOrderForm.other)
    const netTotal = subTotal + salesTax + shippingHandling + other
    const activeCompanyIdentity = getCompanyIdentityForBranch(
      selectedItem.branch,
      companySettings,
      companyIdentities,
    )
    const printDate = formatExportDate(new Date().toISOString())
    const officeDeliveryAddress =
      String(selectedItem.deliveryAddress || '').trim() ||
      activeCompanyIdentity.address ||
      getOfficeDeliveryAddress(selectedItem.branch)
    const printableCompanyIdentity = companySettings
    const supplierName =
      purchaseOrderForm.supplier || selectedItem.supplier || 'Pending selection'
    const matchedSupplier = suppliers.find(
      (supplier) =>
        String(supplier.name || '')
          .trim()
          .toLowerCase() === supplierName.trim().toLowerCase(),
    )
    const supplierAddress = matchedSupplier?.address || ''
    const logoMarkup = printableCompanyIdentity.logoUrl
      ? `<img src="${printableCompanyIdentity.logoUrl}" alt="${printableCompanyIdentity.companyName}" />`
      : ''

    const rowsHtml = purchaseOrderForm.lineItems
      .map(
        (lineItem) => `
          <tr>
            <td>${lineItem.qty || ''}</td>
            <td>${lineItem.unit || ''}</td>
            <td>${lineItem.description || ''}</td>
            <td>${lineItem.unitPrice ? formatCurrencyValue(parseAmountValue(lineItem.unitPrice), currency) : ''}</td>
            <td>${lineItem.total ? formatCurrencyValue(parseAmountValue(lineItem.total), currency) : ''}</td>
          </tr>
        `,
      )
      .join('')

    return `
      <html>
        <head>
          <title>Purchase Order ${purchaseOrderForm.poNumber || selectedItem.requestNumber}</title>
          <style>
            * { box-sizing: border-box; }
            @page { size: A4 portrait; margin: 0; }
            body { margin: 0; background: #ffffff; font-family: Arial, sans-serif; color: #20242a; padding: 0.5in; }
            .sheet { max-width: 100%; margin: 0 auto; }
            .header { display: block; margin-bottom: 14px; }
            .brand { display: flex; gap: 16px; align-items: center; }
            .brand-mark { width: 84px; height: 84px; display: flex; align-items: center; justify-content: center; flex: 0 0 auto; }
            .brand-mark img { width: 100%; height: 100%; object-fit: contain; }
            .brand-copy { flex: 1; }
            .brand-copy h1 { margin: 0 0 4px; font-size: 34px; line-height: 0.98; }
            .brand-copy p { margin: 0 0 4px; color: #b48732; font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase; }
            .brand-copy address { margin: 0; font-style: italic; font-size: 11px; line-height: 1.3; max-width: 440px; }
            .card { border: 1.5px solid #d9d9d9; border-radius: 16px; padding: 12px 14px; background: #fff; }
            .card-label { display: block; margin-bottom: 6px; color: #6b6f74; font-size: 8.5px; letter-spacing: 0.14em; text-transform: uppercase; }
            .card-value { display: block; font-size: 12px; font-weight: 700; line-height: 1.25; }
            .header-meta-inline { display: grid; grid-template-columns: minmax(0, 230px); gap: 12px; justify-content: end; margin-top: 28px; margin-left: auto; }
            .delivery-meta { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; margin-bottom: 12px; }
            .big-card { min-height: 96px; }
            .big-card .card-value { font-size: 10.5px; font-weight: 400; line-height: 1.35; white-space: pre-wrap; }
            .supplier-primary { display: block; font-size: 12px; font-weight: 700; line-height: 1.25; margin-bottom: 6px; }
            .supplier-secondary { display: block; font-size: 10px; font-weight: 400; line-height: 1.35; white-space: pre-wrap; }
            .section-spacer { height: 10px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 14px; table-layout: auto; }
            col.qty-col { width: 8%; }
            col.unit-col { width: 10%; }
            col.description-col { width: auto; }
            col.price-col { width: 18%; }
            col.total-col { width: 18%; }
            th, td { border: 1.5px solid #d9d9d9; padding: 8px 10px; text-align: left; font-size: 10px; vertical-align: top; word-wrap: break-word; }
            th { color: #20242a; background: #fafafa; font-size: 8.5px; letter-spacing: 0.08em; text-transform: uppercase; }
            .summary-layout { display: grid; grid-template-columns: minmax(0, 1.2fr) 0.88fr; gap: 16px; align-items: start; }
            .notes-card { min-height: 180px; }
            .notes-card .card-value { font-size: 10.5px; font-style: italic; font-weight: 400; line-height: 1.45; }
            .totals-stack { display: grid; gap: 10px; }
            .totals-card .card-value { font-size: 11px; }
            .totals-card.net { background: #ececec; }
            .print-footer { margin-top: 18px; display: flex; justify-content: flex-start; }
            .approval-block { width: 260px; }
            .approval-label { display: block; margin-bottom: 28px; font-size: 10px; font-weight: 700; color: #20242a; }
            .signature-line { border-bottom: 1.5px solid #20242a; height: 24px; }
            @media print {
              body { padding: 0.5in; }
              .sheet { max-width: none; }
            }
          </style>
        </head>
        <body>
          <section class="sheet">
            <div class="header">
              <div class="brand">
                <div class="brand-mark">${logoMarkup}</div>
                <div class="brand-copy">
                  <h1>Purchase Order</h1>
                  <p>${printableCompanyIdentity.companyName}</p>
                  <address>${printableCompanyIdentity.address}</address>
                </div>
              </div>
              <div class="header-meta-inline">
                <div class="card">
                  <span class="card-label">PO Number</span>
                  <strong class="card-value">${purchaseOrderForm.poNumber || 'Pending'}</strong>
                </div>
                <div class="card">
                  <span class="card-label">Date</span>
                  <strong class="card-value">${printDate}</strong>
                </div>
              </div>
            </div>

            <div class="delivery-meta">
              <div class="card big-card">
                <span class="card-label">Supplier</span>
                <strong class="supplier-primary">${supplierName}</strong>
                <span class="supplier-secondary">${supplierAddress || 'No supplier address provided.'}</span>
              </div>
              <div class="card big-card">
                <span class="card-label">Delivery Address</span>
                <strong class="card-value">${officeDeliveryAddress}</strong>
              </div>
            </div>
            <div class="section-spacer"></div>

            <table>
              <colgroup>
                <col class="qty-col" />
                <col class="unit-col" />
                <col class="description-col" />
                <col class="price-col" />
                <col class="total-col" />
              </colgroup>
              <thead>
                <tr>
                  <th>Qty</th>
                  <th>Unit</th>
                  <th>Description</th>
                  <th>Unit Price</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>${rowsHtml}</tbody>
            </table>

            <div class="summary-layout">
              <div class="card notes-card">
                <span class="card-label">PO Notes</span>
                <strong class="card-value">${purchaseOrderForm.notes || 'No purchase order notes provided.'}</strong>
              </div>

              <div class="totals-stack">
                <div class="card totals-card">
                  <span class="card-label">Sub Total</span>
                  <strong class="card-value">${formatCurrencyValue(subTotal, currency)}</strong>
                </div>
                <div class="card totals-card">
                  <span class="card-label">Sales Tax</span>
                  <strong class="card-value">${formatCurrencyValue(salesTax, currency)}</strong>
                </div>
                <div class="card totals-card">
                  <span class="card-label">Shipping & Handling</span>
                  <strong class="card-value">${formatCurrencyValue(shippingHandling, currency)}</strong>
                </div>
                <div class="card totals-card">
                  <span class="card-label">Other</span>
                  <strong class="card-value">${formatCurrencyValue(other, currency)}</strong>
                </div>
                <div class="card totals-card net">
                  <span class="card-label">Net Total</span>
                  <strong class="card-value">${formatCurrencyValue(netTotal, currency)}</strong>
                </div>
              </div>
            </div>
            <div class="print-footer">
              <div class="approval-block">
                <span class="approval-label">Approved By:</span>
                <div class="signature-line"></div>
              </div>
            </div>
          </section>
        </body>
      </html>
    `
  }

  function handleReviewPurchaseOrder() {
    if (!selectedItem) {
      return
    }

    const previewWindow = window.open('', '_blank', 'width=1200,height=900')
    if (!previewWindow) {
      pushToast({
        title: 'Popup blocked',
        message: 'Allow popups to open the purchase order preview.',
        variant: 'error',
        duration: 4200,
      })
      return
    }

    const markup = getPurchaseOrderPreviewMarkup()
    if (!markup) {
      previewWindow.close()
      return
    }

    previewWindow.document.write(markup)
    previewWindow.document.close()
    previewWindow.focus()

    pushToast({
      title: 'PO preview opened',
      message: 'The purchase order preview was opened in a separate window.',
      variant: 'success',
    })
  }

  function handlePrintPurchaseOrderPage() {
    if (!selectedItem) {
      return
    }

    const printWindow = window.open('', '_blank', 'width=1200,height=900')
    if (!printWindow) {
      pushToast({
        title: 'Popup blocked',
        message: 'Allow popups to print the purchase order.',
        variant: 'error',
        duration: 4200,
      })
      return
    }

    const markup = getPurchaseOrderPreviewMarkup()
    if (!markup) {
      printWindow.close()
      return
    }

    printWindow.document.write(markup)

    printWindow.document.close()
    printWindow.focus()
    printWindow.print()

    pushToast({
      title: 'PO print view opened',
      message:
        'Use the print dialog to print or save the purchase order as PDF.',
      variant: 'success',
    })
  }

  function renderRequestLaunch(showExpand = true) {
    if (!selectedItem) {
      return null
    }

    return (
      <section className='panel launch-card panel-with-expand'>
        {showExpand ? (
          <PanelExpandButton
            onClick={() => openExpandedPanel('request-launch')}
            label='Expand purchase request panel'
          />
        ) : null}
        <div>
          <p className='eyebrow'>Purchase Request</p>
          <h2>{selectedItem.requestNumber}</h2>
          <p className='panel-support'>
            Open the selected request in a dedicated modal for full details.
          </p>
        </div>
        <button type='button' onClick={openRequestDetailsModal}>
          Open request details
        </button>
      </section>
    )
  }

  function renderAdminRequestLaunch(showExpand = true) {
    return (
      <section className='panel launch-card panel-with-expand'>
        {showExpand ? (
          <PanelExpandButton
            onClick={() => openExpandedPanel('admin-request')}
            label='Expand admin request panel'
          />
        ) : null}
        <div>
          <p className='eyebrow'>Admin Request</p>
          <h2>Manage selected request</h2>
          <p className='panel-support'>
            Update request metadata or remove an entry from the registry using a
            focused editor.
          </p>
        </div>
        <button
          type='button'
          onClick={openEditRequestModal}
          disabled={!selectedItem}
        >
          Open request editor
        </button>
      </section>
    )
  }

  function renderCreateRequestPage() {
    return (
      <section className='mobile-create-request-page'>
        <div className='mobile-create-request-header'>
          <p className='eyebrow'>New Request</p>
          <button
            className='ghost-button mobile-create-request-close'
            type='button'
            onClick={handleCloseCreateRequestModal}
          >
            Close
          </button>
        </div>

        <CreateRequestForm
          form={requestForm}
          branchOptions={branchOptions}
          isAdmin={isAdmin}
          requesterOptions={requesterOptions}
          onChange={handleRequestFormChange}
          onQuotationFileChange={handleRequestQuotationFileChange}
          onClearQuotationFile={handleClearRequestQuotationFile}
          quotationFile={requestQuotationFile}
          quotationFileName={requestQuotationFile?.name ?? ''}
          onSubmit={handleCreateRequest}
          onCancel={handleCloseCreateRequestModal}
          errors={requestFormErrors}
          isSubmitting={isSubmitting}
          canCreate={canCreateRequest}
          error={actionError}
        />
      </section>
    )
  }

  async function handleCreateRequest() {
    if (!session?.token) {
      return
    }

    if (!canCreateRequest) {
      setActionError('Your role cannot create a new purchase request.')
      pushToast({
        title: 'Create request unavailable',
        message:
          'Only requesters, approvers, and system admins can create new requests.',
        variant: 'error',
        duration: 4200,
      })
      return
    }

    if (!requestForm.title.trim()) {
      const message = 'Request title is required.'
      setRequestFormErrors((currentErrors) => ({
        ...currentErrors,
        title: true,
      }))
      setActionError(message)
      pushToast({
        title: 'Missing required fields',
        message,
        variant: 'error',
        duration: 4200,
      })
      return
    }

    if (!requestForm.description.trim()) {
      const message = 'Description is required.'
      setRequestFormErrors((currentErrors) => ({
        ...currentErrors,
        description: true,
      }))
      setActionError(message)
      pushToast({
        title: 'Missing required fields',
        message,
        variant: 'error',
        duration: 4200,
      })
      return
    }

    if (isAdmin && !requestForm.requesterEmail) {
      const message = 'Requester must be selected from system users.'
      setActionError(message)
      pushToast({
        title: 'Missing requester',
        message,
        variant: 'error',
        duration: 4200,
      })
      return
    }

    const parsedRequestAmount = parseAmountValue(requestForm.amount)

    if (
      requestForm.amount &&
      (Number.isNaN(parsedRequestAmount) || parsedRequestAmount <= 0)
    ) {
      const message =
        'Amount must be a valid number greater than zero if provided.'
      setRequestFormErrors((currentErrors) => ({
        ...currentErrors,
        amount: true,
      }))
      setActionError(message)
      pushToast({
        title: 'Invalid amount',
        message,
        variant: 'error',
        duration: 4200,
      })
      return
    }

    setActionError('')
    setIsSubmitting(true)

    try {
      const response = await fetch(
        `${API_BASE_URL}/workflows/purchase-requests`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.token}`,
          },
          body: JSON.stringify({
            ...requestForm,
            requesterEmail: isAdmin
              ? requestForm.requesterEmail
              : session.user.email,
            supplier: requestForm.supplier,
            amount: parsedRequestAmount,
          }),
        },
      )

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.message || 'Failed to create request.')
      }

      let createdRequest = data

      if (requestQuotationFile) {
        const optimizedQuotationFile =
          await optimizeDocumentFile(requestQuotationFile)
        const formData = new FormData()
        formData.append('type', 'quotation')
        formData.append('label', 'Approved Quotation or Request')
        formData.append('document', optimizedQuotationFile)

        const uploadResponse = await fetch(
          `${API_BASE_URL}/workflows/purchase-requests/${data.id}/documents`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${session.token}`,
            },
            body: formData,
          },
        )

        const uploadData = await uploadResponse.json()
        if (!uploadResponse.ok) {
          throw new Error(
            uploadData.message ||
              'Request created, but quotation upload failed.',
          )
        }

        createdRequest = uploadData
      }

      setItems((current) => [createdRequest, ...current])
      setSelectedId(createdRequest.id)
      setRequestForm(
        getInitialRequestForm(
          session.user.department || '',
          session.user.role === 'admin' ? '' : session.user.name || '',
          session.user.role === 'admin' ? '' : session.user.email || '',
          companySettings.companyName,
          getBranchDeliveryAddress(
            companySettings.companyName,
            companySettings,
            companyIdentities,
          ),
        ),
      )
      setRequestQuotationFile(null)
      setIsCreateRequestModalOpen(false)
      pushToast({
        title: 'Request created',
        message: `${createdRequest.requestNumber} is now in the workflow.`,
        variant: 'success',
      })
    } catch (error) {
      setActionError(error.message)
      pushToast({
        title: 'Create request failed',
        message: error.message,
        variant: 'error',
        duration: 4200,
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleAdvance() {
    if (!selectedItem || !session?.token) {
      return
    }

    setActionError('')
    setIsSubmitting(true)
    const approvalWasHandledByApprover =
      selectedItem.currentStage === 'Approval' &&
      session.user.role === 'approver'
    try {
      if (
        uploadForm.file &&
        ['Review', 'Approval'].includes(selectedItem.currentStage)
      ) {
        const optimizedUploadFile = await optimizeDocumentFile(uploadForm.file)
        const formData = new FormData()
        formData.append('type', uploadForm.type)
        formData.append('label', uploadForm.label)
        formData.append('document', optimizedUploadFile)

        const uploadResponse = await fetch(
          `${API_BASE_URL}/workflows/purchase-requests/${selectedItem.id}/documents`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${session.token}`,
            },
            body: formData,
          },
        )

        const uploadData = await uploadResponse.json()
        if (!uploadResponse.ok) {
          throw new Error(uploadData.message || 'Failed to upload document.')
        }

        setItems((current) =>
          current.map((item) =>
            item.id === uploadData.id ? uploadData : item,
          ),
        )
        setUploadForm({
          type: 'other',
          label: 'Boss approval attachment',
          file: null,
        })
      }

      const stageComment =
        actionForm.notes.trim() ||
        `${session.user.name} advanced ${selectedItem.requestNumber} to the next stage.`

      const response = await fetch(
        `${API_BASE_URL}/workflows/purchase-requests/${selectedItem.id}/advance`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.token}`,
          },
          body: JSON.stringify({
            supplier: actionForm.supplier || undefined,
            poNumber: actionForm.poNumber,
            invoiceNumber: actionForm.invoiceNumber,
            paymentReference: actionForm.paymentReference,
            deliveryDate: actionForm.deliveryDate || undefined,
            inspectionStatus: actionForm.inspectionStatus,
            notifyApprover:
              selectedItem.currentStage === 'Review' ||
              selectedItem.currentStage === 'Request for Payment'
                ? Boolean(actionForm.notifyApprover)
                : false,
            poDraft: purchaseOrderForm,
            comment: stageComment,
          }),
        },
      )

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.message || 'Failed to advance request.')
      }

      setItems((current) =>
        current.map((item) => (item.id === data.id ? data : item)),
      )
      setPurchaseOrderDrafts((current) => ({
        ...current,
        [data.id]: {
          ...(data.poDraft ?? purchaseOrderForm),
          supplier:
            data.poDraft?.supplier ||
            data.supplier ||
            purchaseOrderForm.supplier ||
            '',
        },
      }))
      const preserveNotifyApproverForRfp =
        selectedItem.currentStage === 'Review' &&
        data.currentStage === 'Request for Payment'
      setActionForm((current) => ({
        ...current,
        supplier: data.supplier || current.supplier,
        poNumber: data.poNumber || current.poNumber,
        notifyApprover: preserveNotifyApproverForRfp
          ? current.notifyApprover
          : false,
        notes: '',
      }))

      if (approvalWasHandledByApprover) {
        setApprovalConfirmationRequest(data.requestNumber)
        setIsRequestWorkspacePageOpen(false)
      }

      pushToast({
        title: 'Stage advanced',
        message: `${data.requestNumber} moved to ${data.currentStage}.`,
        variant: 'success',
      })

      if (data.approverNotification?.requested) {
        pushToast({
          title: data.approverNotification.skipped
            ? 'Approver email skipped'
            : 'Approver notified',
          message: data.approverNotification.skipped
            ? data.approverNotification.reason ||
              'The request moved to Approval, but the approver email was not sent.'
            : 'An approval email has been sent to the approver.',
          variant: data.approverNotification.skipped ? 'error' : 'success',
          duration: 4800,
        })
      }
    } catch (error) {
      setActionError(error.message)
      pushToast({
        title: 'Advance failed',
        message: error.message,
        variant: 'error',
        duration: 4200,
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleReject() {
    if (!selectedItem || !session?.token) {
      return
    }

    setActionError('')
    setIsSubmitting(true)

    try {
      const stageComment =
        actionForm.notes.trim() ||
        `${session.user.name} declined ${selectedItem.requestNumber} during ${selectedItem.currentStage}.`

      const response = await fetch(
        `${API_BASE_URL}/workflows/purchase-requests/${selectedItem.id}/reject`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.token}`,
          },
          body: JSON.stringify({
            supplier: actionForm.supplier || undefined,
            notes: actionForm.notes,
            comment: stageComment,
          }),
        },
      )

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.message || 'Failed to reject request.')
      }

      setItems((current) =>
        current.map((item) => (item.id === data.id ? data : item)),
      )
      setActionForm((current) => ({
        ...current,
        supplier: data.supplier || current.supplier,
        skipToRfp: false,
        notes: '',
      }))
      pushToast({
        title: 'Request declined',
        message: `${data.requestNumber} has been marked as rejected.`,
        variant: 'success',
      })
    } catch (error) {
      setActionError(error.message)
      pushToast({
        title: 'Decline failed',
        message: error.message,
        variant: 'error',
        duration: 4200,
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleRevert() {
    if (!selectedItem || !session?.token) {
      return
    }

    setActionError('')
    setIsSubmitting(true)

    try {
      const stageComment =
        actionForm.notes.trim() ||
        `${session.user.name} moved ${selectedItem.requestNumber} back to the previous stage.`

      const response = await fetch(
        `${API_BASE_URL}/workflows/purchase-requests/${selectedItem.id}/revert`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.token}`,
          },
          body: JSON.stringify({
            comment: stageComment,
          }),
        },
      )

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.message || 'Failed to move request back.')
      }

      setItems((current) =>
        current.map((item) => (item.id === data.id ? data : item)),
      )
      setActionForm((current) => ({
        ...current,
        notes: '',
      }))
      pushToast({
        title: 'Stage moved back',
        message: `${data.requestNumber} returned to ${data.currentStage}.`,
        variant: 'success',
      })
    } catch (error) {
      setActionError(error.message)
      pushToast({
        title: 'Move back failed',
        message: error.message,
        variant: 'error',
        duration: 4200,
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleUploadDocument() {
    if (!selectedItem || !session?.token || !uploadForm.file) {
      return
    }

    setUploadError('')
    setIsSubmitting(true)

    try {
      const optimizedUploadFile = await optimizeDocumentFile(uploadForm.file)
      const formData = new FormData()
      formData.append('type', uploadForm.type)
      formData.append('label', uploadForm.label)
      formData.append('document', optimizedUploadFile)

      const response = await fetch(
        `${API_BASE_URL}/workflows/purchase-requests/${selectedItem.id}/documents`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session.token}`,
          },
          body: formData,
        },
      )

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.message || 'Failed to upload document.')
      }

      setItems((current) =>
        current.map((item) => (item.id === data.id ? data : item)),
      )
      setUploadForm({
        type: 'po',
        label: '',
        file: null,
      })
      pushToast({
        title: 'Document uploaded',
        message: `${uploadForm.file.name} has been attached via Cloudinary.`,
        variant: 'success',
      })
    } catch (error) {
      setUploadError(error.message)
      pushToast({
        title: 'Upload failed',
        message: error.message,
        variant: 'error',
        duration: 4200,
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleDeleteDocument(documentId) {
    if (!selectedItem || !session?.token) {
      return
    }

    openConfirmDialog({
      title: 'Delete document',
      message:
        'This file will be removed from the request packet and can no longer be opened.',
      confirmLabel: 'Delete document',
      onConfirm: async () => {
        setUploadError('')
        setIsSubmitting(true)

        try {
          const response = await fetch(
            `${API_BASE_URL}/workflows/purchase-requests/${selectedItem.id}/documents/${documentId}`,
            {
              method: 'DELETE',
              headers: {
                Authorization: `Bearer ${session.token}`,
              },
            },
          )

          if (!response.ok) {
            const data = await response.json()
            throw new Error(data.message || 'Failed to delete document.')
          }

          await loadDashboard(session.token, session.user.role)
          setConfirmDialog(null)
          pushToast({
            title: 'Document deleted',
            message: 'The attachment was removed from the request.',
            variant: 'success',
          })
        } catch (error) {
          setUploadError(error.message)
          pushToast({
            title: 'Delete failed',
            message: error.message,
            variant: 'error',
            duration: 4200,
          })
        } finally {
          setIsSubmitting(false)
        }
      },
    })
  }

  async function handleSaveRequest() {
    if (
      !selectedItem ||
      !session?.token ||
      (session.user.role !== 'admin' &&
        session.user.email !== selectedItem.requesterEmail)
    ) {
      return
    }

    const parsedRequestAmount = parseAmountValue(requestAdminForm.amount)

    if (
      requestAdminForm.amount &&
      (Number.isNaN(parsedRequestAmount) || parsedRequestAmount < 0)
    ) {
      const message = 'Amount must be a valid number if provided.'
      setActionError(message)
      pushToast({
        title: 'Invalid amount',
        message,
        variant: 'error',
        duration: 4200,
      })
      return
    }

    setActionError('')
    setIsSubmitting(true)

    try {
      const response = await fetch(
        `${API_BASE_URL}/workflows/purchase-requests/${selectedItem.id}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.token}`,
          },
          body: JSON.stringify({
            ...requestAdminForm,
            amount: parsedRequestAmount,
          }),
        },
      )

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.message || 'Failed to update request.')
      }

      setItems((current) =>
        current.map((item) => (item.id === data.id ? data : item)),
      )
      setIsEditRequestModalOpen(false)
      pushToast({
        title: 'Request updated',
        message: `${data.requestNumber} changes were saved.`,
        variant: 'success',
      })
    } catch (error) {
      setActionError(error.message)
      pushToast({
        title: 'Update failed',
        message: error.message,
        variant: 'error',
        duration: 4200,
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleDeleteRequest() {
    if (!selectedItem || !session?.token || !isAdmin) {
      return
    }

    openConfirmDialog({
      title: 'Delete purchase request',
      message: `This will permanently remove ${selectedItem.requestNumber} from the registry.`,
      confirmLabel: 'Delete request',
      onConfirm: async () => {
        setActionError('')
        setIsSubmitting(true)

        try {
          const response = await fetch(
            `${API_BASE_URL}/workflows/purchase-requests/${selectedItem.id}`,
            {
              method: 'DELETE',
              headers: {
                Authorization: `Bearer ${session.token}`,
              },
            },
          )

          if (!response.ok) {
            const data = await response.json()
            throw new Error(data.message || 'Failed to delete request.')
          }

          setItems((current) =>
            current.filter((item) => item.id !== selectedItem.id),
          )
          setSelectedId('')
          setIsEditRequestModalOpen(false)
          setConfirmDialog(null)
          pushToast({
            title: 'Request deleted',
            message: `${selectedItem.requestNumber} was removed from the registry.`,
            variant: 'success',
          })
        } catch (error) {
          setActionError(error.message)
          pushToast({
            title: 'Delete failed',
            message: error.message,
            variant: 'error',
            duration: 4200,
          })
        } finally {
          setIsSubmitting(false)
        }
      },
    })
  }

  async function handleDeleteRequestById(requestId) {
    const targetRequest = items.find((item) => item.id === requestId)

    if (!targetRequest || !session?.token) {
      return
    }

    openConfirmDialog({
      title: 'Delete purchase request',
      message: `This will permanently remove ${targetRequest.requestNumber} from the registry.`,
      confirmLabel: 'Delete request',
      onConfirm: async () => {
        setActionError('')
        setIsSubmitting(true)

        try {
          const response = await fetch(
            `${API_BASE_URL}/workflows/purchase-requests/${targetRequest.id}`,
            {
              method: 'DELETE',
              headers: {
                Authorization: `Bearer ${session.token}`,
              },
            },
          )

          if (!response.ok) {
            const data = await response.json()
            throw new Error(data.message || 'Failed to delete request.')
          }

          setItems((current) =>
            current.filter((item) => item.id !== targetRequest.id),
          )
          if (selectedId === targetRequest.id) {
            setSelectedId('')
          }
          setConfirmDialog(null)
          pushToast({
            title: 'Request deleted',
            message: `${targetRequest.requestNumber} was removed from the registry.`,
            variant: 'success',
          })
        } catch (error) {
          setActionError(error.message)
          pushToast({
            title: 'Delete failed',
            message: error.message,
            variant: 'error',
            duration: 4200,
          })
        } finally {
          setIsSubmitting(false)
        }
      },
    })
  }

  async function handleCreateUser() {
    if (!session?.token || !isAdmin) {
      return
    }

    setUserError('')
    setIsSubmitting(true)

    try {
      const response = await fetch(`${API_BASE_URL}/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.token}`,
        },
        body: JSON.stringify(userForm),
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.message || 'Failed to create user.')
      }

      setUsers((current) => [data, ...current])
      setSelectedUserId(data.id)
      setIsUserModalOpen(false)
      pushToast({
        title: 'User created',
        message: `${data.name} now has access to the system.`,
        variant: 'success',
      })
    } catch (error) {
      setUserError(error.message)
      pushToast({
        title: 'Create user failed',
        message: error.message,
        variant: 'error',
        duration: 4200,
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleUpdateUser() {
    if (!session?.token || !isAdmin || !selectedUserId) {
      return
    }

    setUserError('')
    setIsSubmitting(true)

    try {
      const response = await fetch(`${API_BASE_URL}/users/${selectedUserId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.token}`,
        },
        body: JSON.stringify(userForm),
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.message || 'Failed to update user.')
      }

      setUsers((current) =>
        current.map((user) => (user.id === data.id ? data : user)),
      )

      if (session.user.id === data.id) {
        setSession((current) => ({
          ...current,
          user: {
            ...current.user,
            name: data.name,
            email: data.email,
            role: data.role,
            roleLabel: data.roleLabel,
            department: data.department,
          },
        }))
      }

      setIsUserModalOpen(false)
      pushToast({
        title: 'User updated',
        message: `${data.name}'s account details were saved.`,
        variant: 'success',
      })
    } catch (error) {
      setUserError(error.message)
      pushToast({
        title: 'Update user failed',
        message: error.message,
        variant: 'error',
        duration: 4200,
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleDeleteUser(userId = selectedUserId) {
    const targetUser = users.find((user) => user.id === userId)

    if (!session?.token || !isAdmin || !targetUser) {
      return
    }

    openConfirmDialog({
      title: 'Delete user account',
      message: `Are you sure you want to delete ${targetUser.name}? This account will lose access to the procurement workflow immediately.`,
      confirmLabel: 'Yes, delete user',
      onConfirm: async () => {
        setUserError('')
        setIsSubmitting(true)

        try {
          const response = await fetch(
            `${API_BASE_URL}/users/${targetUser.id}`,
            {
              method: 'DELETE',
              headers: {
                Authorization: `Bearer ${session.token}`,
              },
            },
          )

          if (!response.ok) {
            const data = await response.json()
            throw new Error(data.message || 'Failed to delete user.')
          }

          setUsers((current) =>
            current.filter((user) => user.id !== targetUser.id),
          )
          setSelectedUserId((current) =>
            current === targetUser.id ? '' : current,
          )
          setUserForm(getInitialUserForm())
          setIsUserModalOpen(false)
          setConfirmDialog(null)
          pushToast({
            title: 'User deleted',
            message: 'The account has been removed.',
            variant: 'success',
          })
        } catch (error) {
          setUserError(error.message)
          pushToast({
            title: 'Delete user failed',
            message: error.message,
            variant: 'error',
            duration: 4200,
          })
        } finally {
          setIsSubmitting(false)
        }
      },
    })
  }

  async function handleCreateSupplier() {
    if (!session?.token || !isAdmin) {
      return
    }

    if (!supplierForm.name.trim()) {
      const message = 'Supplier name is required.'
      setSupplierError(message)
      pushToast({
        title: 'Missing supplier name',
        message,
        variant: 'error',
        duration: 4200,
      })
      return
    }

    setSupplierError('')
    setIsSubmitting(true)

    try {
      const response = await fetch(`${API_BASE_URL}/suppliers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.token}`,
        },
        body: JSON.stringify(supplierForm),
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.message || 'Failed to create supplier.')
      }

      setSuppliers((current) =>
        [...current, data].sort((left, right) =>
          left.name.localeCompare(right.name),
        ),
      )
      setActionForm((current) => ({
        ...current,
        supplier: data.name,
      }))
      setIsSupplierModalOpen(false)
      setSupplierForm(getInitialSupplierForm())
      pushToast({
        title: 'Supplier created',
        message: `${data.name} is now available in supplier suggestions.`,
        variant: 'success',
      })
    } catch (error) {
      setSupplierError(error.message)
      pushToast({
        title: 'Create supplier failed',
        message: error.message,
        variant: 'error',
        duration: 4200,
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleUpdateSupplier() {
    if (!session?.token || !isAdmin || !selectedSupplier) {
      return
    }

    if (!supplierForm.name.trim()) {
      const message = 'Supplier name is required.'
      setSupplierError(message)
      pushToast({
        title: 'Missing supplier name',
        message,
        variant: 'error',
        duration: 4200,
      })
      return
    }

    setSupplierError('')
    setIsSubmitting(true)

    try {
      const response = await fetch(
        `${API_BASE_URL}/suppliers/${selectedSupplier.id}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.token}`,
          },
          body: JSON.stringify(supplierForm),
        },
      )

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.message || 'Failed to update supplier.')
      }

      setSuppliers((current) =>
        current
          .map((supplier) => (supplier.id === data.id ? data : supplier))
          .sort((left, right) => left.name.localeCompare(right.name)),
      )
      setSelectedSupplierId(data.id)
      setIsSupplierModalOpen(false)
      setSupplierForm(getInitialSupplierForm())
      pushToast({
        title: 'Supplier updated',
        message: `${data.name} changes were saved.`,
        variant: 'success',
      })
    } catch (error) {
      setSupplierError(error.message)
      pushToast({
        title: 'Update supplier failed',
        message: error.message,
        variant: 'error',
        duration: 4200,
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleDeleteSupplier(supplierId = selectedSupplierId) {
    const targetSupplier = suppliers.find(
      (supplier) => supplier.id === supplierId,
    )

    if (!session?.token || !isAdmin || !targetSupplier) {
      return
    }

    openConfirmDialog({
      title: 'Delete supplier',
      message: `Are you sure you want to delete ${targetSupplier.name}? This action cannot be undone and the supplier will be removed from the directory.`,
      confirmLabel: 'Yes, delete supplier',
      onConfirm: async () => {
        setSupplierError('')
        setIsSubmitting(true)

        try {
          const response = await fetch(
            `${API_BASE_URL}/suppliers/${targetSupplier.id}`,
            {
              method: 'DELETE',
              headers: {
                Authorization: `Bearer ${session.token}`,
              },
            },
          )

          if (!response.ok) {
            const data = await response.json()
            throw new Error(data.message || 'Failed to delete supplier.')
          }

          setSuppliers((current) =>
            current.filter((supplier) => supplier.id !== targetSupplier.id),
          )
          setSelectedSupplierId((current) =>
            current === targetSupplier.id ? '' : current,
          )
          setConfirmDialog(null)
          pushToast({
            title: 'Supplier deleted',
            message: `${targetSupplier.name} was removed from the directory.`,
            variant: 'success',
          })
        } catch (error) {
          setSupplierError(error.message)
          pushToast({
            title: 'Delete supplier failed',
            message: error.message,
            variant: 'error',
            duration: 4200,
          })
        } finally {
          setIsSubmitting(false)
        }
      },
    })
  }

  function handleSelect(id) {
    setSelectedId(id)
  }

  function handleSelectSupplier(id) {
    setSelectedSupplierId(id)
  }

  async function handleOpenRequestDetails(id) {
    const targetItem = items.find((item) => item.id === id)

    if (!targetItem) {
      return
    }

    setSelectedId(id)

    if (session?.user?.role === 'requester') {
      setIsRequestWorkspacePageOpen(true)
      return
    }

    if (targetItem.currentStage === 'Purchase Request' && session?.token) {
      setActionError('')
      setIsSubmitting(true)

      try {
        const response = await fetch(
          `${API_BASE_URL}/workflows/purchase-requests/${targetItem.id}/advance`,
          {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${session.token}`,
            },
            body: JSON.stringify({
              comment: `${session.user.name} opened ${targetItem.requestNumber} and moved it to Review.`,
            }),
          },
        )

        const data = await response.json()
        if (!response.ok) {
          throw new Error(data.message || 'Failed to move request to Review.')
        }

        setItems((current) =>
          current.map((item) => (item.id === data.id ? data : item)),
        )
        setSelectedId(data.id)
        pushToast({
          title: 'Moved to Review',
          message: `${data.requestNumber} is now in Review.`,
          variant: 'success',
        })
      } catch (error) {
        setActionError(error.message)
        pushToast({
          title: 'Open request failed',
          message: error.message,
          variant: 'error',
          duration: 4200,
        })
        setIsSubmitting(false)
        return
      } finally {
        setIsSubmitting(false)
      }
    }

    setIsRequestWorkspacePageOpen(true)
  }

  function handleSelectUser(id) {
    setSelectedUserId(id)
  }

  function handleLogout() {
    clearSession()
  }

  function closeHeaderMenuPages() {
    setIsSupplierDirectoryOpen(false)
    setIsUserDirectoryOpen(false)
    setIsPurchaseOrderDirectoryOpen(false)
    setIsRfpDirectoryOpen(false)
    setAccountantDashboardPage('')
    setIsPurchaseOrderPageOpen(false)
    setIsRequestForPaymentPageOpen(false)
    setIsAuditTrailPageOpen(false)
    setIsSettingsPageOpen(false)
  }

  function handleOpenUsersDirectory() {
    if (session?.user?.role !== 'admin') {
      return
    }

    closeHeaderMenuPages()
    setIsUserDirectoryOpen(true)
  }

  function handleOpenSuppliersMenu() {
    closeHeaderMenuPages()
    setIsSupplierDirectoryOpen(true)
  }

  function handleOpenPurchaseOrderMenu() {
    closeHeaderMenuPages()
    setIsPurchaseOrderDirectoryOpen(true)
  }

  function handleOpenRfpDirectoryMenu() {
    closeHeaderMenuPages()
    setIsRfpDirectoryOpen(true)
  }

  function shouldBlockAccountantRfpRecord(record) {
    if (!record || !isAccountant || isRequestApprovedForRfpRecord(record)) {
      return false
    }

    pushToast({
      title: 'Purchase request not approved',
      message: `${record.requestNumber} must be approved by the approver or admin before opening the RFP record.`,
      variant: 'error',
      duration: 4200,
    })
    return true
  }

  function handleOpenAuditTrailPage() {
    if (session?.user?.role === 'requester') {
      return
    }

    closeHeaderMenuPages()
    setIsAuditTrailPageOpen(true)
  }

  function handleOpenSettingsPage() {
    closeHeaderMenuPages()
    setSettingsError('')
    setSettingsForm(companySettings)
    setRequesterSettingsForm(
      getInitialRequesterSettingsForm(session?.user ?? null),
    )
    setIdentityForm(getInitialIdentityForm(companySettings))
    setEditingIdentityId('')
    setIsMainSettingsEditing(false)
    setIsSettingsPageOpen(true)
  }

  function handleOpenSavedRfpRecord(record) {
    if (!record) {
      return
    }

    if (shouldBlockAccountantRfpRecord(record)) {
      return
    }

    setIsRfpDirectoryOpen(false)
    setAccountantDashboardPage('')
    openRequestForPaymentPage(record)
  }

  function handleOpenAccountantForPaymentPage() {
    closeHeaderMenuPages()
    setAccountantDashboardPage('for-payment')
  }

  function handleOpenAccountantPaidThisMonthPage() {
    closeHeaderMenuPages()
    setAccountantDashboardPage('paid-this-month')
  }

  function closeAccountantDashboardPage() {
    setAccountantDashboardPage('')
  }

  function openRequestForPaymentPreviewWindow(
    record,
    { autoPrint = false } = {},
  ) {
    if (!record) {
      return
    }

    const draft = record.rfpDraft ?? {}
    const validationPayload = {
      payee: getEffectiveRequestForPaymentPayee(record),
      amountRequested:
        draft.amountRequested || getDefaultRequestForPaymentAmount(record),
    }

    if (hasRequestForPaymentValidationErrors(validationPayload)) {
      pushToast({
        title: 'Missing required fields',
        message:
          autoPrint
            ? 'Payee / supplier and Amount requested are required before printing.'
            : 'Payee / supplier and Amount requested are required before previewing.',
        variant: 'error',
        duration: 4200,
      })
      return null
    }

    const printWindow = window.open('', '_blank', 'width=1100,height=900')
    if (!printWindow) {
      pushToast({
        title: 'Popup blocked',
        message: autoPrint
          ? 'Allow popups to print the request for payment.'
          : 'Allow popups to preview the request for payment.',
        variant: 'error',
        duration: 4200,
      })
      return null
    }

    const currency = record.currency || 'PHP'
    const activeCompanyIdentity = getCompanyIdentityForBranch(
      record.branch,
      companySettings,
      companyIdentities,
    )
    const dueDate = record.rfpDraft?.dueDate || record.dateNeeded || ''
    const createdDate = record.requestedAt || record.createdAt || ''
    const amountRequested =
      record.rfpDraft?.amountRequested || String(record.amount || '')
    const description = record.rfpDraft?.notes || record.description || ''
    const payee = getEffectiveRequestForPaymentPayee(record) || 'Not set'
    const tinNumber = record.rfpDraft?.tinNumber || 'Not set'
    const invoiceNumber = record.rfpDraft?.invoiceNumber || 'Not set'
    const matchedSupplier = suppliers.find(
      (supplier) =>
        String(supplier.name || '')
          .trim()
          .toLowerCase() ===
        String(payee || '')
          .trim()
          .toLowerCase(),
    )
    const payeeAddress =
      matchedSupplier?.address ||
      record.deliveryAddress ||
      activeCompanyIdentity.address ||
      'Not set'
    const logoMarkup = companySettings.logoUrl
      ? `<img src="${companySettings.logoUrl}" alt="${companySettings.companyName}" />`
      : ''

    printWindow.document.write(`
      <html>
        <head>
          <title>Request for Payment ${record.requestNumber}</title>
          <style>
            * { box-sizing: border-box; }
            html, body {
              width: 100%;
              min-height: 100%;
            }
            @page { size: A4 portrait; margin: 0; }
            body {
              margin: 0;
              padding: 0;
              background: #ffffff;
              color: #111111;
              font-family: Arial, sans-serif;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .page {
              width: 210mm;
              min-height: 297mm;
              margin: 0 auto;
              padding: 12mm;
              background: #ffffff;
            }
            .sheet {
              width: 100%;
              min-height: calc(297mm - 24mm);
              border: 2px solid #444;
              padding: 9mm 10mm 10mm;
              display: flex;
              flex-direction: column;
            }
            .header {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 12px;
              align-items: start;
              margin-bottom: 12px;
            }
            .brand {
              display: flex;
              align-items: center;
              gap: 12px;
            }
            .brand img {
              width: 56px;
              height: 56px;
              object-fit: contain;
            }
            .brand-title {
              font-size: 18px;
              font-weight: 700;
              color: #7d1d1d;
              line-height: 1.1;
            }
            .doc-head {
              text-align: center;
            }
            .doc-address {
              margin: 0 0 4px;
              font-size: 11px;
              text-transform: uppercase;
              letter-spacing: 0.08em;
              font-weight: 700;
            }
            .doc-title {
              margin: 20px 0;
              font-size: 12px;
              font-weight: 700;
              text-transform: uppercase;
              letter-spacing: 0.08em;
            }
            .top-meta {
              display: grid;
              gap: 30px;
              margin-bottom: 8px;
            }
            .top-meta-row {
              display: grid;
              gap: 24px;
            }
            .top-meta-row--dates {
              grid-template-columns: 1fr auto;
              align-items: start;
            }
            .top-meta-row--payee {
              grid-template-columns: 1fr;
            }
            .line-stack--dates {
              min-width: 240px;
            }
            .line-stack {
              display: grid;
              gap: 10px;
            }
            .line-row {
              display: grid;
              grid-template-columns: 110px 1fr;
              align-items: end;
              gap: 2px;
              font-size: 11px;
              font-weight: 700;
            }
            .line-row--wide-label {
              grid-template-columns: max-content 1fr;
              gap: 6px;
            }
            .line-row--date {
              grid-template-columns: max-content 1fr;
              gap: 4px;
            }
            .line-fill {
              min-height: 8px;
              border-bottom: 1px solid #444;
              display: flex;
              align-items: flex-end;
              padding-bottom: 1px;
              font-size: 11px;
              font-weight: 400;
            }
            .transaction-table,
            .entry-table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 10px;
            }
            .transaction-table th,
            .transaction-table td,
            .entry-table th,
            .entry-table td {
              border: 1px solid #444;
              padding: 4px 6px;
              font-size: 11px;
              vertical-align: top;
            }
            .transaction-table th,
            .entry-table th,
            .entry-caption {
              text-transform: uppercase;
              font-weight: 700;
              letter-spacing: 0.04em;
            }
            .transaction-table th:last-child,
            .transaction-table td:last-child {
              width: 20%;
              
            }
            .transaction-desc {
              height: 85px;
              white-space: pre-wrap;
              line-height: 1.4;
              
            }
            .amount-cell {
              text-align: right;
              font-weight: 700;
              text-alignment:center;
            }
            .signature-grid {
              display: grid;
              grid-template-columns: 110px 1fr;
              gap: 20px 18px;
              margin-top: 28px;
              max-width: 420px;
              font-size: 11px;
              align-items: start;
            }
            .signature-line {
              display: grid;
              gap: 0;
              justify-items: start;
            }
            .signature-line-fill {
              width: 170px;
              min-width: 170px;
              border-bottom: 1px solid #444;
              height: 8px;
            }
            .signature-line-label {
              width: 170px;
              text-align: center;
              font-size: 10px;
              line-height: 0.95;
            }
            .accounting-block {
              margin-top: 30px;
              padding-top: 30px;
              border-top: 1px solid #444;
            }
            .accounting-only {
              margin-bottom: 8px;
              font-size: 11px;
              font-weight: 700;
            }
            .entry-caption {
              border: 1px solid #444;
              padding: 2px 6px;
              margin-bottom: 8px;
              text-align: center;
              font-size: 11px;
            }
            .entry-table td {
              height: 18px;
            }
            .entry-table .fill-row td {
              height: 16px;
            }
            .entry-table .total-row td {
              font-weight: 700;
            }
            .bottom-approvals {
              margin-top: 18px;
              display: grid;
              grid-template-columns: 110px 10px 1fr;
              gap: 30px 4px;
              align-items: center;
              font-size: 11px;
            }
            .approval-label {
              font-weight: 700;
              white-space: nowrap;
            }
            .approval-value {
              display: grid;
              gap: 0;
              min-width: 0;
              justify-items: start;
            }
            .approval-name {
              width: 170px;
              text-align: center;
              font-weight: 700;
              font-size: 10px;
              line-height: 1;
              margin-bottom: -6px;
            }
            .approval-value .line-fill {
              min-width: 170px;
              width: 170px;
              justify-content: flex-start;
              text-align: left;
              font-weight: 700;
            }
            .approval-subtitle {
              width: 170px;
              text-align: center;
              font-size: 10px;
              line-height: 1.2;
            }
            .approval-date-label {
              font-weight: 700;
              white-space: nowrap;
              align-self: center;
            }
            .approval-date-line {
              min-width: 170px;
              width: 170px;
            }
            .muted {
              color: #444;
            }
            @media screen {
              body {
                background: #eef2f7;
              }
              .page {
                box-shadow: 0 20px 50px rgba(15, 23, 42, 0.12);
              }
            }
          </style>
        </head>
        <body>
          <div class="page">
            <div class="sheet">
              <div class="header">
                <div class="brand">
                  ${logoMarkup}
                  <div class="brand-title">${companySettings.companyName}</div>
                </div>
                <div class="doc-head">
                  <p class="doc-address">${companySettings.address}</p>
                  <p class="doc-title">Request for Payment Order</p>
                </div>
              </div>

              <div class="top-meta">
                <div class="top-meta-row top-meta-row--dates">
                  <div></div>
                  <div class="line-stack line-stack--dates">
                    <div class="line-row line-row--date">
                      <span>Date</span>
                      <div class="line-fill">${formatExportDate(createdDate)}</div>
                    </div>
                    <div class="line-row line-row--date">
                      <span>Due Date:</span>
                      <div class="line-fill">${formatExportDate(dueDate)}</div>
                    </div>
                    <div class="line-row line-row--date">
                      <span>Reference No.:</span>
                      <div class="line-fill">${record.requestNumber || 'Not set'}</div>
                    </div>
                  </div>
                </div>
                <div class="top-meta-row top-meta-row--payee">
                  <div class="line-stack">
                    <div class="line-row line-row--wide-label">
                      <span>Payee</span>
                      <div class="line-fill">${payee}</div>
                    </div>
                    <div class="line-row line-row--wide-label">
                      <span>Address:</span>
                      <div class="line-fill">${payeeAddress}</div>
                    </div>
                    <div class="line-row line-row--wide-label">
                      <span>TIN:</span>
                      <div class="line-fill">${tinNumber}</div>
                    </div>
                  </div>
                </div>
              </div>

              <table class="transaction-table">
                <thead>
                  <tr>
                    <th>Description of Transaction</th>
                    <th>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td class="transaction-desc">${description || record.title || 'No description provided.'}</td>
                    <td class="amount-cell">${formatCurrencyValue(parseAmountValue(amountRequested), currency)}</td>
                  </tr>
                </tbody>
              </table>

              <div class="signature-grid">
                <span>Prepared by:</span>
                <div class="signature-line">
                  <div class="signature-line-label">${record.requester || ''}</div>
                  <div class="signature-line-fill"></div>
                </div>
                <span>Checked by:</span>
                <div class="signature-line">
                  <div class="signature-line-fill"></div>
                </div>
                <span>Approved by:</span>
                <div class="signature-line">
                  <div class="signature-line-fill"></div>
                </div>
              </div>

              <div class="accounting-block">
                <div class="accounting-only">For Accounting Only:</div>
                <div class="entry-caption">Recommending Entry Form</div>
                <table class="entry-table">
                  <thead>
                    <tr>
                      <th style="width:22%;">GL Code</th>
                      <th>Account</th>
                      <th style="width:14%;">Debit</th>
                      <th style="width:14%;">Credit</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td></td>
                      <td></td>
                      <td class="amount-cell"></td>
                      <td></td>
                    </tr>
                    <tr>
                      <td></td>
                      <td></td>
                      <td></td>
                      <td class="amount-cell"></td>
                    </tr>
                    <tr class="fill-row"><td></td><td></td><td></td><td></td></tr>
                    <tr class="fill-row"><td></td><td></td><td></td><td></td></tr>
                    <tr class="fill-row"><td></td><td></td><td></td><td></td></tr>
                    <tr class="total-row">
                      <td colspan="2" style="text-align:right;">Total</td>
                      <td class="amount-cell"></td>
                      <td class="amount-cell"></td>
                    </tr>
                  </tbody>
                </table>

                <div class="bottom-approvals">
                  <span class="approval-label">Prepared by</span>
                  <span class="muted">:</span>
                  <div class="approval-value">
                    <div class="approval-name"></div>
                    <div class="line-fill"></div>
                    <div class="approval-subtitle">Accounting Assistant</div>
                  </div>

                  <span class="approval-label">Checked by</span>
                  <span class="muted">:</span>
                  <div class="approval-value">
                    <div class="approval-name">${companySettings.generalAccountantName || ''}</div>
                    <div class="line-fill"></div>
                    <div class="approval-subtitle">General Accountant / HEADACC</div>
                  </div>

                  <span class="approval-label">Approved by</span>
                  <span class="muted">:</span>
                  <div class="approval-value">
                    <div class="approval-name">${companySettings.chiefInvestmentOfficerName || ''}</div>
                    <div class="line-fill"></div>
                    <div class="approval-subtitle">Chief of Investment Officer</div>
                  </div>

                  <span class="approval-date-label">Date</span>
                  <span class="muted">:</span>
                  <div class="line-fill approval-date-line"></div>
                </div>
              </div>
            </div>
          </div>
          ${
            autoPrint
              ? `<script>
            window.onload = function () {
              window.print();
              window.onafterprint = function () { window.close(); };
            };
          </script>`
              : ''
          }
        </body>
      </html>
    `)
    printWindow.document.close()
    printWindow.focus()
    return printWindow
  }

  function handlePreviewRequestForPaymentRecord(record) {
    if (!record) {
      return
    }

    if (shouldBlockAccountantRfpRecord(record)) {
      return
    }

    setRfpPreviewRecord(record)
    setRfpPreviewForm({
      invoiceNumber: record?.rfpDraft?.invoiceNumber || '',
      file: null,
      paymentStatus: String(record?.rfpDraft?.paymentStatus || '').trim(),
    })
    setRfpPreviewError('')
  }

  function handlePrintRequestForPaymentRecord(record) {
    if (shouldBlockAccountantRfpRecord(record)) {
      return
    }

    openRequestForPaymentPreviewWindow(record, { autoPrint: true })
  }

  function closeRfpPreviewModal() {
    setRfpPreviewRecord(null)
    setRfpPreviewForm({
      invoiceNumber: '',
      file: null,
      paymentStatus: '',
    })
    setRfpPreviewError('')
  }

  function openInvoiceUploadModal(record) {
    if (shouldBlockAccountantRfpRecord(record)) {
      return
    }

    setInvoiceUploadRecord(record)
    setInvoiceUploadForm({
      invoiceNumber: record?.rfpDraft?.invoiceNumber || '',
      file: null,
    })
    setInvoiceUploadError('')
  }

  function closeInvoiceUploadModal() {
    setInvoiceUploadRecord(null)
    setInvoiceUploadForm({
      invoiceNumber: '',
      file: null,
    })
    setInvoiceUploadError('')
  }

  function handleInvoiceUploadFormChange(event) {
    const { name, value } = event.target

    setInvoiceUploadForm((current) => ({
      ...current,
      [name]: value,
    }))
  }

  function handleInvoiceUploadFileChange(event) {
    const [file] = Array.from(event.target.files || [])

    setInvoiceUploadForm((current) => ({
      ...current,
      file: file || null,
    }))
  }

  function handleRfpPreviewFormChange(event) {
    const { name, value } = event.target

    setRfpPreviewForm((current) => ({
      ...current,
      [name]: value,
    }))
  }

  function handleRfpPreviewFileChange(event) {
    const [file] = Array.from(event.target.files || [])

    setRfpPreviewForm((current) => ({
      ...current,
      file: file || null,
    }))
  }

  async function handleSubmitRfpPreview(event) {
    event.preventDefault()

    if (!rfpPreviewRecord || !session?.token) {
      return
    }

    if (!String(rfpPreviewForm.paymentStatus || '').trim()) {
      setRfpPreviewError('Payment status is required.')
      return
    }

    setRfpPreviewError('')
    setIsRfpPreviewSubmitting(true)

    try {
      let updatedRecord = await saveInvoiceDetailsForRecord(
        rfpPreviewRecord,
        rfpPreviewForm,
        { silent: true },
      )

      updatedRecord =
        (await saveRfpPaymentStatusForRecord(
          updatedRecord || rfpPreviewRecord,
          rfpPreviewForm.paymentStatus,
          { silent: true },
        )) || updatedRecord

      if (updatedRecord) {
        setRfpPreviewRecord(updatedRecord)
        setRfpPreviewForm({
          invoiceNumber: updatedRecord?.rfpDraft?.invoiceNumber || '',
          file: null,
          paymentStatus: String(
            updatedRecord?.rfpDraft?.paymentStatus || '',
          ).trim(),
        })
      }

      pushToast({
        title: 'RFP updated',
        message: `${(updatedRecord || rfpPreviewRecord).requestNumber} invoice and payment details were saved.`,
        variant: 'success',
      })
    } catch (error) {
      const message = error.message || 'Failed to update Request for Payment.'
      setRfpPreviewError(message)
      pushToast({
        title: 'RFP update failed',
        message,
        variant: 'error',
        duration: 4200,
      })
    } finally {
      setIsRfpPreviewSubmitting(false)
    }
  }

  async function handleDeleteRfpPreviewInvoice() {
    if (!rfpPreviewRecord || !session?.token) {
      return
    }

    const currentInvoiceDocument = getCurrentInvoiceDocument(rfpPreviewRecord)

    if (!currentInvoiceDocument) {
      setRfpPreviewError('No uploaded invoice file was found.')
      return
    }

    setRfpPreviewError('')
    setIsRfpPreviewSubmitting(true)

    try {
      const updatedRecord = await deleteInvoiceForRecord(rfpPreviewRecord, {
        silent: true,
      })

      if (updatedRecord) {
        setRfpPreviewRecord(updatedRecord)
        setRfpPreviewForm((current) => ({
          ...current,
          invoiceNumber: '',
          file: null,
        }))
      }

      pushToast({
        title: 'Invoice deleted',
        message: `${(updatedRecord || rfpPreviewRecord).requestNumber} invoice file was removed.`,
        variant: 'success',
      })
    } catch (error) {
      const message = error.message || 'Failed to delete invoice.'
      setRfpPreviewError(message)
      pushToast({
        title: 'Delete failed',
        message,
        variant: 'error',
        duration: 4200,
      })
    } finally {
      setIsRfpPreviewSubmitting(false)
    }
  }

  function closeSupplierDirectory() {
    setIsSupplierDirectoryOpen(false)
  }

  function closeUserDirectory() {
    setIsUserDirectoryOpen(false)
  }

  function closeAuditTrailPage() {
    setIsAuditTrailPageOpen(false)
  }

  function closeSettingsPage() {
    setIsMainSettingsEditing(false)
    setIsIdentityModalOpen(false)
    setSettingsError('')
    setIsSettingsPageOpen(false)
  }

  function handleStartMainSettingsEdit() {
    setIsMainSettingsEditing(true)
  }

  function handleCancelMainSettingsEdit() {
    setSettingsForm(companySettings)
    setIsMainSettingsEditing(false)
  }

  function handleSaveRequesterSettings() {
    void (async () => {
      if (!session?.token || isAdmin) {
        return
      }

      if (
        requesterSettingsForm.newPassword &&
        requesterSettingsForm.newPassword !==
          requesterSettingsForm.confirmPassword
      ) {
        const message = 'New password and confirm password must match.'
        setSettingsError(message)
        pushToast({
          title: 'Save settings failed',
          message,
          variant: 'error',
          duration: 4200,
        })
        return
      }

      setSettingsError('')
      setIsSubmitting(true)

      try {
        const response = await fetch(`${API_BASE_URL}/users/me`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.token}`,
          },
          body: JSON.stringify({
            currentPassword: requesterSettingsForm.currentPassword,
            newPassword: requesterSettingsForm.newPassword,
            notifyOnRequestChanges:
              requesterSettingsForm.notifyOnRequestChanges,
          }),
        })

        const data = await response.json()
        if (!response.ok) {
          throw new Error(data.message || 'Failed to save your settings.')
        }

        setSession((current) =>
          current
            ? {
                ...current,
                user: {
                  ...current.user,
                  ...data.user,
                },
              }
            : current,
        )
        setRequesterSettingsForm(getInitialRequesterSettingsForm(data.user))
        pushToast({
          title: 'Settings saved',
          message: 'Your personal settings were updated.',
          variant: 'success',
        })
      } catch (error) {
        setSettingsError(error.message)
        pushToast({
          title: 'Save settings failed',
          message: error.message,
          variant: 'error',
          duration: 4200,
        })
      } finally {
        setIsSubmitting(false)
      }
    })()
  }

  function handleSaveSettings() {
    void (async () => {
      if (!session?.token || !isAdmin) {
        return
      }

      setIsSubmitting(true)

      try {
        const response = await fetch(`${API_BASE_URL}/settings`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.token}`,
          },
          body: JSON.stringify({
            companyName:
              settingsForm.companyName.trim() ||
              DEFAULT_COMPANY_SETTINGS.companyName,
            address:
              settingsForm.address.trim() || DEFAULT_COMPANY_SETTINGS.address,
            logoUrl: settingsForm.logoUrl || DEFAULT_COMPANY_SETTINGS.logoUrl,
            generalAccountantName: settingsForm.generalAccountantName.trim(),
            chiefInvestmentOfficerName:
              settingsForm.chiefInvestmentOfficerName.trim(),
            workflowStages:
              Array.isArray(settingsForm.workflowStages) &&
              settingsForm.workflowStages.length
                ? settingsForm.workflowStages
                : DEFAULT_COMPANY_SETTINGS.workflowStages,
          }),
        })

        const data = await response.json()
        if (!response.ok) {
          throw new Error(data.message || 'Failed to save settings.')
        }

        const nextSettings = {
          companyName: data.companyName || DEFAULT_COMPANY_SETTINGS.companyName,
          address: data.address || DEFAULT_COMPANY_SETTINGS.address,
          logoUrl: data.logoUrl || DEFAULT_COMPANY_SETTINGS.logoUrl,
          generalAccountantName:
            data.generalAccountantName ??
            DEFAULT_COMPANY_SETTINGS.generalAccountantName,
          chiefInvestmentOfficerName:
            data.chiefInvestmentOfficerName ??
            DEFAULT_COMPANY_SETTINGS.chiefInvestmentOfficerName,
          workflowStages:
            Array.isArray(data.workflowStages) && data.workflowStages.length
              ? data.workflowStages
              : DEFAULT_COMPANY_SETTINGS.workflowStages,
        }

        setCompanySettings(nextSettings)
        setSettingsForm(nextSettings)
        setCompanyIdentities(
          Array.isArray(data.identities) ? data.identities : [],
        )
        setIdentityForm(getInitialIdentityForm(nextSettings))
        setEditingIdentityId('')
        setIsMainSettingsEditing(false)
        pushToast({
          title: 'Settings saved',
          message: 'Company branding was updated.',
          variant: 'success',
        })
      } catch (error) {
        pushToast({
          title: 'Save settings failed',
          message: error.message,
          variant: 'error',
          duration: 4200,
        })
      } finally {
        setIsSubmitting(false)
      }
    })()
  }

  function handleEditIdentity(identityId) {
    const targetIdentity = companyIdentities.find(
      (identity) => identity.id === identityId,
    )

    if (!targetIdentity) {
      return
    }

    setEditingIdentityId(targetIdentity.id)
    setIdentitySaveMessage('')
    setIdentityForm({
      branchName: targetIdentity.branchName || '',
      address: targetIdentity.address || DEFAULT_COMPANY_SETTINGS.address,
      logoUrl: targetIdentity.logoUrl || DEFAULT_COMPANY_SETTINGS.logoUrl,
    })
    setIsIdentityModalOpen(true)
  }

  function handleResetIdentity() {
    setEditingIdentityId('')
    setIdentitySaveMessage('')
    setIdentityForm(getInitialIdentityForm(companySettings))
    setIsIdentityModalOpen(false)
  }

  function handleOpenCreateIdentityModal() {
    setEditingIdentityId('')
    setIdentitySaveMessage('')
    setIdentityForm(getInitialIdentityForm(companySettings))
    setIsIdentityModalOpen(true)
  }

  function handleSaveIdentity() {
    void (async () => {
      if (!session?.token || !isAdmin) {
        return
      }

      setIsSubmitting(true)

      try {
        const endpoint = editingIdentityId
          ? `${API_BASE_URL}/settings/identities/${editingIdentityId}`
          : `${API_BASE_URL}/settings/identities`
        const method = editingIdentityId ? 'PATCH' : 'POST'
        const response = await fetch(endpoint, {
          method,
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.token}`,
          },
          body: JSON.stringify({
            branchName: identityForm.branchName.trim(),
            address: identityForm.address.trim() || companySettings.address,
            logoUrl: identityForm.logoUrl || companySettings.logoUrl,
          }),
        })

        const raw = await response.text()
        let data = {}

        try {
          data = raw ? JSON.parse(raw) : {}
        } catch {
          data = {}
        }

        if (!response.ok) {
          if (response.status === 413) {
            throw new Error(
              'Logo upload is too large. Please use a smaller image.',
            )
          }

          throw new Error(data.message || 'Failed to save company identity.')
        }

        const nextSettings = await syncCompanySettings()
        setEditingIdentityId('')
        setIdentityForm(getInitialIdentityForm(nextSettings))
        setIdentitySaveMessage('Saved to database')
        setIsIdentityModalOpen(false)
        pushToast({
          title: editingIdentityId ? 'Identity updated' : 'Identity created',
          message: 'The subsidiary or branch identity was saved.',
          variant: 'success',
        })
      } catch (error) {
        pushToast({
          title: 'Save identity failed',
          message: error.message,
          variant: 'error',
          duration: 4200,
        })
      } finally {
        setIsSubmitting(false)
      }
    })()
  }

  function handleDeleteIdentity(identityId) {
    const targetIdentity = companyIdentities.find(
      (identity) => identity.id === identityId,
    )

    if (!targetIdentity || !session?.token || !isAdmin) {
      return
    }

    openConfirmDialog({
      title: 'Delete company identity?',
      message: `Are you sure you want to delete ${targetIdentity.branchName}? This action cannot be undone.`,
      confirmLabel: 'Yes, delete identity',
      onConfirm: async () => {
        setIsSubmitting(true)

        try {
          const response = await fetch(
            `${API_BASE_URL}/settings/identities/${identityId}`,
            {
              method: 'DELETE',
              headers: {
                Authorization: `Bearer ${session.token}`,
              },
            },
          )

          if (!response.ok) {
            const data = await response.json().catch(() => ({}))
            throw new Error(
              data.message || 'Failed to delete company identity.',
            )
          }

          setCompanyIdentities((current) =>
            current.filter((identity) => identity.id !== identityId),
          )
          if (editingIdentityId === identityId) {
            setEditingIdentityId('')
            setIdentityForm(getInitialIdentityForm(companySettings))
          }
          setConfirmDialog(null)
          pushToast({
            title: 'Identity deleted',
            message: 'The branch or subsidiary identity was removed.',
            variant: 'success',
          })
        } catch (error) {
          setConfirmDialog(null)
          pushToast({
            title: 'Delete identity failed',
            message: error.message,
            variant: 'error',
            duration: 4200,
          })
        } finally {
          setIsSubmitting(false)
        }
      },
    })
  }

  if (!session?.token) {
    if (selectedLandingApp !== 'procurement') {
      return (
        <main className='app-shell auth-shell'>
          <section className='app-selector-landing'>
            <div className='app-selector-copy'>
              <p className='eyebrow'>Application Hub</p>
              <h1>Choose the application you want to open.</h1>
              <p className='hero-copy app-selector-subcopy'>
                {/* Start with Procurement Management System, or keep Art Gallery
                ready as another entry point for your team. */}
              </p>
            </div>

            <div className='app-selector-grid'>
              <article className='panel app-selector-card app-selector-card-featured'>
                <p className='eyebrow'>Available now</p>
                <h2>Procurement Management System</h2>
                <p>
                  Manage purchase requests, approvals, suppliers, purchase
                  orders, request for payment, and filing in one workflow.
                </p>
                <button
                  type='button'
                  className='app-selector-button'
                  onClick={() => setSelectedLandingApp('procurement')}
                >
                  Open Procurement
                </button>
              </article>

              <article className='panel app-selector-card'>
                <p className='eyebrow'>Second application</p>
                <h2>Art Gallery</h2>
                <p>
                  A separate application slot for gallery operations, collection
                  browsing, or future art-related workflows.
                </p>
                {ART_GALLERY_URL ? (
                  <a className='app-selector-secondary' href={ART_GALLERY_URL}>
                    Open Art Gallery
                  </a>
                ) : (
                  <span className='app-selector-badge'>Coming soon</span>
                )}
              </article>
            </div>
          </section>
        </main>
      )
    }

    return (
      <main className='app-shell auth-shell'>
        <LoadingOverlay
          visible={isSubmitting || isLoading}
          title={isSubmitting ? 'Signing in' : 'Loading'}
          message={
            isSubmitting
              ? 'Please wait while we sign you in.'
              : 'Please wait while we prepare your workspace.'
          }
        />
        <section className='auth-landing'>
          <div className='auth-content'>
            <button
              type='button'
              className='auth-app-switch'
              onClick={() => setSelectedLandingApp('home')}
            >
              Back to applications
            </button>
            {authView === 'forgot-password' ? (
              <ForgotPasswordForm
                email={forgotPasswordEmail}
                onChange={handleForgotPasswordChange}
                onSubmit={handleForgotPasswordRequest}
                onBack={openLoginScreen}
                isSubmitting={isSubmitting}
                error={forgotPasswordError}
                message={forgotPasswordMessage}
              />
            ) : null}
            {authView === 'reset-password' ? (
              <ResetPasswordForm
                form={resetPasswordForm}
                onChange={handleResetPasswordFormChange}
                onSubmit={handleResetPasswordSubmit}
                onBack={openLoginScreen}
                isSubmitting={isSubmitting}
                error={resetPasswordError}
                message={resetPasswordMessage}
              />
            ) : null}
            {authView === 'login' ? (
              <LoginForm
                credentials={credentials}
                onChange={handleCredentialChange}
                onSubmit={handleLogin}
                onForgotPassword={openForgotPasswordScreen}
                isSubmitting={isSubmitting}
                error={authError}
              />
            ) : null}
          </div>
          <div className='auth-brandmark' aria-hidden='true'>
            <img
              className='auth-logo'
              src='/JANUARIUS.ico'
              alt='Januarius Holdings Inc.'
            />
            <div className='auth-wordmark'>
              <span className='auth-wordmark-primary'>Januarius</span>
              <span className='auth-wordmark-secondary'>Holdings Inc.</span>
            </div>
            <div className='auth-copy'>
              <h1>Januarius Procurement Hub</h1>
              <p className='hero-copy'>
                From purchase request to filing, in one workflow.
              </p>
            </div>
          </div>
        </section>
      </main>
    )
  }

  if (isRequestForPaymentPageOpen && selectedItem) {
    return (
      <main className='app-shell'>
        <LoadingOverlay visible={isSubmitting || isLoading} />
        <ToastStack toasts={toasts} onDismiss={dismissToast} />
        <RequestForPaymentPage
          item={selectedItem}
          form={requestForPaymentForm}
          errors={requestForPaymentErrors}
          suppliers={suppliers}
          isEditing={isRequestForPaymentEditing}
          canEdit={canEditSelectedRequestForPayment}
          onChange={handleRequestForPaymentFormChange}
          onSelectSupplier={handleRequestForPaymentSupplierSelect}
          onCreateSupplier={openCreateSupplierModal}
          canCreateSupplier={session.user.role === 'admin'}
          onEdit={() => {
            if (!canEditRequestForPayment(session?.user, selectedItem)) {
              pushToast({
                title: 'RFP locked',
                message:
                  'The requester can no longer edit the Request for Payment once the workflow reaches Prepare PO.',
                variant: 'error',
                duration: 4200,
              })
              return
            }

            setIsRequestForPaymentEditing(true)
          }}
          onCancel={handleCancelRequestForPaymentEdit}
          onPrint={() => handlePrintRequestForPaymentRecord(selectedItem)}
          onSave={handleSaveRequestForPaymentPage}
          onSubmitForApproval={handleSubmitRequestForPaymentToApproval}
          onClose={closeRequestForPaymentPage}
          isSubmitting={isSubmitting}
        />
        {isSupplierModalOpen ? (
          <Modal
            eyebrow='Create Supplier'
            title='Create supplier'
            onClose={() => setIsSupplierModalOpen(false)}
          >
            <SupplierForm
              form={supplierForm}
              onChange={handleSupplierFormChange}
              onSubmit={handleCreateSupplier}
              isSubmitting={isSubmitting}
              error={supplierError}
            />
          </Modal>
        ) : null}
      </main>
    )
  }

  if (isPurchaseOrderPageOpen && selectedItem) {
    return (
      <main className='app-shell'>
        <LoadingOverlay visible={isSubmitting || isLoading} />
        <ToastStack toasts={toasts} onDismiss={dismissToast} />
        <CompanyHeader
          isAuthenticated
          user={session.user}
          onLogout={handleLogout}
          theme={theme}
          onThemeChange={setTheme}
          requestSearchQuery={requestSearchQuery}
          onRequestSearchChange={setRequestSearchQuery}
          onOpenSuppliers={handleOpenSuppliersMenu}
          onOpenRfpDirectory={handleOpenRfpDirectoryMenu}
          onOpenRfpRecord={handleOpenSavedRfpRecord}
          onPrintRfpRecord={handlePrintRequestForPaymentRecord}
          onOpenAuditTrail={handleOpenAuditTrailPage}
          onOpenUsers={handleOpenUsersDirectory}
          onOpenPurchaseOrder={handleOpenPurchaseOrderMenu}
          onOpenSettings={handleOpenSettingsPage}
          canOpenRfp={canOpenRequestForPaymentMenu}
          rfpItems={requestForPaymentRecords}
          companySettings={companySettings}
        />
        <PurchaseOrderPage
          item={selectedItem}
          user={session.user}
          form={purchaseOrderForm}
          onChange={handlePurchaseOrderFormChange}
          onLineItemChange={handlePurchaseOrderLineItemChange}
          onAddLineItem={handleAddPurchaseOrderLineItem}
          onRemoveLineItem={handleRemovePurchaseOrderLineItem}
          onOpenRequest={openRequestDetailsModal}
          onPrint={handlePrintPurchaseOrderPage}
          onSave={handleSavePurchaseOrderPage}
          onClose={closePurchaseOrderPage}
          isSubmitting={isSubmitting}
          readOnly={
            session.user.role === 'approver' &&
            selectedItem.currentStage === 'Approve PO'
          }
        />
      </main>
    )
  }

  if (isPurchaseOrderDirectoryOpen) {
    return (
      <main className='app-shell'>
        <LoadingOverlay visible={isSubmitting || isLoading} />
        <ToastStack toasts={toasts} onDismiss={dismissToast} />
        <CompanyHeader
          isAuthenticated
          user={session.user}
          onLogout={handleLogout}
          theme={theme}
          onThemeChange={setTheme}
          requestSearchQuery={requestSearchQuery}
          onRequestSearchChange={setRequestSearchQuery}
          onOpenSuppliers={handleOpenSuppliersMenu}
          onOpenRfpDirectory={handleOpenRfpDirectoryMenu}
          onOpenRfpRecord={handleOpenSavedRfpRecord}
          onPrintRfpRecord={handlePrintRequestForPaymentRecord}
          onOpenAuditTrail={handleOpenAuditTrailPage}
          onOpenUsers={handleOpenUsersDirectory}
          onOpenPurchaseOrder={handleOpenPurchaseOrderMenu}
          onOpenSettings={handleOpenSettingsPage}
          canOpenRfp={canOpenRequestForPaymentMenu}
          rfpItems={requestForPaymentRecords}
          companySettings={companySettings}
        />
        <PurchaseOrderDirectoryPage
          items={purchaseOrderRecords}
          onOpen={openPurchaseOrderPage}
          onClose={closePurchaseOrderDirectory}
        />
      </main>
    )
  }

  if (isSupplierDirectoryOpen) {
    return (
      <main className='app-shell'>
        <LoadingOverlay visible={isSubmitting || isLoading} />
        <ToastStack toasts={toasts} onDismiss={dismissToast} />
        <CompanyHeader
          isAuthenticated
          user={session.user}
          onLogout={handleLogout}
          theme={theme}
          onThemeChange={setTheme}
          requestSearchQuery={requestSearchQuery}
          onRequestSearchChange={setRequestSearchQuery}
          onOpenSuppliers={handleOpenSuppliersMenu}
          onOpenRfpDirectory={handleOpenRfpDirectoryMenu}
          onOpenRfpRecord={handleOpenSavedRfpRecord}
          onPrintRfpRecord={handlePrintRequestForPaymentRecord}
          onOpenAuditTrail={handleOpenAuditTrailPage}
          onOpenUsers={handleOpenUsersDirectory}
          onOpenPurchaseOrder={handleOpenPurchaseOrderMenu}
          onOpenSettings={handleOpenSettingsPage}
          canOpenRfp={canOpenRequestForPaymentMenu}
          rfpItems={requestForPaymentRecords}
          companySettings={companySettings}
        />
        <SupplierManagementPage
          suppliers={suppliers}
          selectedSupplierId={selectedSupplierId}
          onSelect={handleSelectSupplier}
          onCreateNew={openCreateSupplierModal}
          onEditSelected={openEditSupplierModal}
          onDeleteSelected={handleDeleteSupplier}
          onClose={closeSupplierDirectory}
          canManage={isAdmin}
        />
        {confirmDialog ? (
          <ConfirmDialog
            title={confirmDialog.title}
            message={confirmDialog.message}
            confirmLabel={confirmDialog.confirmLabel}
            onConfirm={confirmDialog.onConfirm}
            onClose={() => setConfirmDialog(null)}
            isSubmitting={isSubmitting}
          />
        ) : null}
        {isSupplierModalOpen ? (
          <Modal
            eyebrow={
              supplierModalMode === 'edit' ? 'Edit Supplier' : 'New Supplier'
            }
            title={
              supplierModalMode === 'edit'
                ? 'Update supplier'
                : 'Create supplier'
            }
            onClose={() => setIsSupplierModalOpen(false)}
          >
            <SupplierForm
              form={supplierForm}
              onChange={handleSupplierFormChange}
              onSubmit={
                supplierModalMode === 'edit'
                  ? handleUpdateSupplier
                  : handleCreateSupplier
              }
              isSubmitting={isSubmitting}
              error={supplierError}
              submitLabel={
                supplierModalMode === 'edit'
                  ? 'Save changes'
                  : 'Create supplier'
              }
            />
          </Modal>
        ) : null}
      </main>
    )
  }

  if (isUserDirectoryOpen) {
    return (
      <main className='app-shell'>
        <LoadingOverlay visible={isSubmitting || isLoading} />
        <ToastStack toasts={toasts} onDismiss={dismissToast} />
        <CompanyHeader
          isAuthenticated
          user={session.user}
          onLogout={handleLogout}
          theme={theme}
          onThemeChange={setTheme}
          requestSearchQuery={requestSearchQuery}
          onRequestSearchChange={setRequestSearchQuery}
          onOpenSuppliers={handleOpenSuppliersMenu}
          onOpenRfpDirectory={handleOpenRfpDirectoryMenu}
          onOpenRfpRecord={handleOpenSavedRfpRecord}
          onPrintRfpRecord={handlePrintRequestForPaymentRecord}
          onOpenAuditTrail={handleOpenAuditTrailPage}
          onOpenUsers={handleOpenUsersDirectory}
          onOpenPurchaseOrder={handleOpenPurchaseOrderMenu}
          onOpenSettings={handleOpenSettingsPage}
          canOpenRfp={canOpenRequestForPaymentMenu}
          rfpItems={requestForPaymentRecords}
          companySettings={companySettings}
        />
        <section className='po-page'>
          <div className='po-page-header'>
            <div>
              <p className='eyebrow'>Admin Users</p>
              <h1>Users</h1>
              <p className='hero-copy'>
                View all user accounts and manage access from one page.
              </p>
            </div>
            <div className='po-page-actions'>
              <button
                className='ghost-button'
                type='button'
                onClick={closeUserDirectory}
              >
                Back to dashboard
              </button>
            </div>
          </div>

          <UserManagementPanel
            users={users}
            selectedUserId={selectedUserId}
            onSelect={handleSelectUser}
            onCreateNew={openCreateUserModal}
            onEditSelected={openEditUserModal}
            onDeleteSelected={handleDeleteUser}
            showExpand={false}
          />
        </section>
        {isUserModalOpen ? (
          <Modal
            eyebrow='Admin Users'
            title={selectedUserId ? 'Edit user account' : 'Create user account'}
            onClose={() => setIsUserModalOpen(false)}
          >
            <UserEditorPanel
              selectedUserId={selectedUserId}
              form={userForm}
              onChange={handleUserFormChange}
              onCreate={handleCreateUser}
              onUpdate={handleUpdateUser}
              onDelete={handleDeleteUser}
              isSubmitting={isSubmitting}
              error={userError}
            />
          </Modal>
        ) : null}
        {confirmDialog ? (
          <ConfirmDialog
            title={confirmDialog.title}
            message={confirmDialog.message}
            confirmLabel={confirmDialog.confirmLabel}
            onConfirm={confirmDialog.onConfirm}
            onClose={() => setConfirmDialog(null)}
            isSubmitting={isSubmitting}
          />
        ) : null}
      </main>
    )
  }

  if (isSettingsPageOpen) {
    return (
      <main className='app-shell'>
        <LoadingOverlay visible={isSubmitting || isLoading} />
        <ToastStack toasts={toasts} onDismiss={dismissToast} />
        <SettingsPage
          user={session.user}
          isAdmin={isAdmin}
          identities={companyIdentities}
          canManageIdentities={isAdmin}
          isMainSettingsEditing={isMainSettingsEditing}
          form={settingsForm}
          onChange={handleSettingsFormChange}
          requesterForm={requesterSettingsForm}
          onRequesterChange={handleRequesterSettingsFormChange}
          onSaveRequesterSettings={handleSaveRequesterSettings}
          onLogoFileChange={handleSettingsLogoChange}
          onWorkflowStageMove={handleWorkflowStageMove}
          onStartMainSettingsEdit={handleStartMainSettingsEdit}
          onCancelMainSettingsEdit={handleCancelMainSettingsEdit}
          onSave={handleSaveSettings}
          onCreateIdentity={handleOpenCreateIdentityModal}
          onEditIdentity={handleEditIdentity}
          onDeleteIdentity={handleDeleteIdentity}
          users={users}
          selectedUserId={selectedUserId}
          onSelectUser={handleSelectUser}
          onCreateNewUser={openCreateUserModal}
          onEditUser={openEditUserModal}
          onDeleteUser={handleDeleteUser}
          suppliers={suppliers}
          selectedSupplierId={selectedSupplierId}
          onSelectSupplier={handleSelectSupplier}
          onCreateNewSupplier={openCreateSupplierModal}
          onEditSupplier={openEditSupplierModal}
          onDeleteSupplier={handleDeleteSupplier}
          purchaseOrderItems={purchaseOrderRecords}
          onOpenPurchaseOrderItem={openPurchaseOrderPage}
          rfpItems={requestForPaymentRecords}
          onOpenRfpItem={handleOpenSavedRfpRecord}
          onPrintRfpItem={handlePrintRequestForPaymentRecord}
          auditItems={items}
          onOpenSuppliers={handleOpenSuppliersMenu}
          onOpenUsers={handleOpenUsersDirectory}
          onOpenPurchaseOrder={handleOpenPurchaseOrderMenu}
          onOpenAuditTrail={handleOpenAuditTrailPage}
          settingsError={settingsError}
          isSubmitting={isSubmitting}
          onClose={closeSettingsPage}
        />
        {isIdentityModalOpen ? (
          <Modal
            eyebrow='Subsidiaries'
            title={editingIdentityId ? 'Edit identity' : 'New identity'}
            onClose={handleResetIdentity}
          >
            <div className='modal-form'>
              <label>
                Branch or subsidiary
                <input
                  name='branchName'
                  value={identityForm.branchName}
                  onChange={handleIdentityFormChange}
                  placeholder='Example: Stats or Januarius Holdings Inc.'
                />
              </label>

              <label>
                Address
                <textarea
                  name='address'
                  value={identityForm.address}
                  onChange={handleIdentityFormChange}
                  rows='4'
                  placeholder='Enter the complete branch or subsidiary address'
                />
              </label>

              <label className='settings-file-field'>
                Replace logo
                <input
                  type='file'
                  accept='.ico,.png,.jpg,.jpeg,.svg,.webp'
                  onChange={handleIdentityLogoChange}
                />
              </label>

              <button type='button' onClick={handleSaveIdentity}>
                {editingIdentityId ? 'Save identity' : 'Add identity'}
              </button>
              {identitySaveMessage ? (
                <p className='settings-inline-status'>{identitySaveMessage}</p>
              ) : null}
            </div>
          </Modal>
        ) : null}
        {isUserModalOpen ? (
          <Modal
            eyebrow='Admin Users'
            title={selectedUserId ? 'Edit user account' : 'Create user account'}
            onClose={() => setIsUserModalOpen(false)}
          >
            <UserEditorPanel
              selectedUserId={selectedUserId}
              form={userForm}
              onChange={handleUserFormChange}
              onCreate={handleCreateUser}
              onUpdate={handleUpdateUser}
              onDelete={handleDeleteUser}
              isSubmitting={isSubmitting}
              error={userError}
            />
          </Modal>
        ) : null}
        {isSupplierModalOpen ? (
          <Modal
            eyebrow='Supplier Directory'
            title={
              selectedSupplierId && supplierModalMode === 'edit'
                ? 'Edit supplier'
                : 'Create supplier'
            }
            onClose={() => {
              setSupplierForm(getInitialSupplierForm())
              setSupplierError('')
              setSupplierModalMode('create')
              setSelectedSupplierId('')
              setIsSupplierModalOpen(false)
            }}
          >
            <SupplierForm
              form={supplierForm}
              onChange={handleSupplierFormChange}
              onSubmit={
                selectedSupplierId && supplierModalMode === 'edit'
                  ? handleUpdateSupplier
                  : handleCreateSupplier
              }
              onDelete={
                selectedSupplierId && supplierModalMode === 'edit'
                  ? handleDeleteSupplier
                  : null
              }
              submitLabel={
                selectedSupplierId && supplierModalMode === 'edit'
                  ? 'Save supplier'
                  : 'Create supplier'
              }
              error={supplierError}
              isSubmitting={isSubmitting}
            />
          </Modal>
        ) : null}
        {confirmDialog ? (
          <ConfirmDialog
            title={confirmDialog.title}
            message={confirmDialog.message}
            confirmLabel={confirmDialog.confirmLabel}
            onConfirm={confirmDialog.onConfirm}
            onClose={() => setConfirmDialog(null)}
            isSubmitting={isSubmitting}
          />
        ) : null}
      </main>
    )
  }

  if (isAuditTrailPageOpen) {
    return (
      <main className='app-shell'>
        <LoadingOverlay visible={isSubmitting || isLoading} />
        <ToastStack toasts={toasts} onDismiss={dismissToast} />
        <CompanyHeader
          isAuthenticated
          user={session.user}
          onLogout={handleLogout}
          theme={theme}
          onThemeChange={setTheme}
          onOpenSuppliers={handleOpenSuppliersMenu}
          onOpenRfpDirectory={handleOpenRfpDirectoryMenu}
          onOpenRfpRecord={handleOpenSavedRfpRecord}
          onPrintRfpRecord={handlePrintRequestForPaymentRecord}
          onOpenAuditTrail={handleOpenAuditTrailPage}
          onOpenUsers={handleOpenUsersDirectory}
          onOpenPurchaseOrder={handleOpenPurchaseOrderMenu}
          onOpenSettings={handleOpenSettingsPage}
          canOpenRfp={canOpenRequestForPaymentMenu}
          rfpItems={requestForPaymentRecords}
          companySettings={companySettings}
        />
        <AuditTrailPage items={items} onClose={closeAuditTrailPage} />
      </main>
    )
  }

  if (approvalConfirmationRequest) {
    return (
      <main className='app-shell approval-confirmation-shell'>
        <LoadingOverlay visible={isSubmitting || isLoading} />
        <ToastStack toasts={toasts} onDismiss={dismissToast} />
        <ApprovalConfirmationPage
          requestNumber={approvalConfirmationRequest}
          onHome={closeApprovalConfirmationPage}
        />
      </main>
    )
  }

  const selectedItemStages = getEffectiveWorkflowStages(selectedItem, stages)

  if (isRequestWorkspacePageOpen && selectedItem) {
    if (!canAccessRequestWorkspace(session?.user, selectedItem)) {
      return (
        <main className='app-shell'>
          <LoadingOverlay visible={isSubmitting || isLoading} />
          <ToastStack toasts={toasts} onDismiss={dismissToast} />
          <section className='settings-page'>
            <div className='settings-card approval-confirmation-card'>
              <h1>Access restricted</h1>
              <p className='hero-copy'>
                You cannot open this request while it is in the{' '}
                {selectedItem.currentStage} stage.
              </p>
              <div className='approval-confirmation-actions'>
                <button
                  className='po-primary-action'
                  type='button'
                  onClick={closeRequestWorkspacePage}
                >
                  Home
                </button>
              </div>
            </div>
          </section>
        </main>
      )
    }

    return (
      <main className='app-shell'>
        <LoadingOverlay visible={isSubmitting || isLoading} />
        <ToastStack toasts={toasts} onDismiss={dismissToast} />
        <RequestWorkspacePage
          item={selectedItem}
          stages={selectedItemStages}
          user={session.user}
          actionForm={actionForm}
          purchaseOrderForm={purchaseOrderForm}
          uploadForm={uploadForm}
          suppliers={suppliers}
          onActionChange={handleActionFormChange}
          onPurchaseOrderChange={handlePurchaseOrderFormChange}
          onPurchaseOrderLineItemChange={handlePurchaseOrderLineItemChange}
          onAddPurchaseOrderLineItem={handleAddPurchaseOrderLineItem}
          onRemovePurchaseOrderLineItem={handleRemovePurchaseOrderLineItem}
          onPrintPurchaseOrder={handlePrintPurchaseOrderPage}
          onReviewPurchaseOrder={handleReviewPurchaseOrder}
          onUploadFormChange={handleUploadFormChange}
          onUploadFileChange={handleUploadFileChange}
          onReviewAttachmentFileChange={handleReviewApprovalFileChange}
          onClearReviewAttachment={handleClearReviewApprovalFile}
          onUpload={handleUploadDocument}
          onCreateSupplier={openCreateSupplierModal}
          onSupplierPick={handleReviewSupplierPick}
          onAdvance={handleAdvance}
          onReject={handleReject}
          onBack={handleRevert}
          requestForPaymentForm={requestForPaymentForm}
          requestForPaymentErrors={requestForPaymentErrors}
          isRequestForPaymentEditing={isRequestForPaymentEditing}
          canEditRequestForPayment={canEditSelectedRequestForPayment}
          onRequestForPaymentChange={handleRequestForPaymentFormChange}
          onRequestForPaymentSupplierSelect={handleRequestForPaymentSupplierSelect}
          onRequestForPaymentEdit={() => {
            if (!canEditRequestForPayment(session?.user, selectedItem)) {
              pushToast({
                title: 'RFP locked',
                message:
                  'The requester can no longer edit the Request for Payment once the workflow reaches Prepare PO.',
                variant: 'error',
                duration: 4200,
              })
              return
            }

            setIsRequestForPaymentEditing(true)
          }}
          onRequestForPaymentCancel={handleCancelRequestForPaymentEdit}
          onRequestForPaymentPrint={() =>
            handlePrintRequestForPaymentRecord(selectedItem)
          }
          onRequestForPaymentSave={handleSaveRequestForPaymentPage}
          onRequestForPaymentSubmitForApproval={handleSubmitRequestForPaymentToApproval}
          isSubmitting={isSubmitting}
          actionError={actionError}
          onDeleteDocument={handleDeleteDocument}
          canManageDocuments={canManageDocuments}
          uploadError={uploadError}
          apiOrigin={API_ORIGIN}
          onClose={closeRequestWorkspacePage}
          onEditRequest={openEditRequestModal}
          canEditRequest={canEditSelectedRequest}
        />
        {isSupplierModalOpen ? (
          <Modal
            eyebrow='New Supplier'
            title='Create supplier'
            onClose={() => setIsSupplierModalOpen(false)}
          >
            <SupplierForm
              form={supplierForm}
              onChange={handleSupplierFormChange}
              onSubmit={handleCreateSupplier}
              isSubmitting={isSubmitting}
              error={supplierError}
            />
          </Modal>
        ) : null}
      </main>
    )
  }

  return (
    <main className='app-shell'>
      <LoadingOverlay visible={isSubmitting || isLoading} />
      <ToastStack toasts={toasts} onDismiss={dismissToast} />
      <CompanyHeader
        isAuthenticated
        user={session.user}
        showRequestSearch={false}
        onLogout={handleLogout}
        theme={theme}
        onThemeChange={setTheme}
        requestSearchQuery={requestSearchQuery}
        onRequestSearchChange={setRequestSearchQuery}
        onOpenSuppliers={handleOpenSuppliersMenu}
        onOpenRfpDirectory={handleOpenRfpDirectoryMenu}
        onOpenRfpRecord={handleOpenSavedRfpRecord}
        onPrintRfpRecord={handlePrintRequestForPaymentRecord}
        onOpenAuditTrail={handleOpenAuditTrailPage}
        onOpenUsers={handleOpenUsersDirectory}
        onOpenPurchaseOrder={handleOpenPurchaseOrderMenu}
        onOpenSettings={handleOpenSettingsPage}
        canOpenRfp={canOpenRequestForPaymentMenu}
        rfpItems={requestForPaymentRecords}
        companySettings={companySettings}
      />
      <section className='hero'>
        <div className='hero-grid'>
          <div>
            <p className='eyebrow'>Januarius Procurement Hub</p>
            <h1>Purchase Request to Payment Tracking</h1>
            <p className='hero-copy'>
              Role-based processing for review, approval, supplier selection,
              PO, delivery, invoice, matching, payment, and filing.
            </p>
          </div>
        </div>
      </section>

      {session.user.role !== 'requester' && session.user.role !== 'approver' ? (
        <section className='stats-grid'>
          {dashboardStats.map((stat) => (
            <article
              className={`panel stat-card ${stat.isActive ? 'active' : ''} ${
                stat.filterKey ? 'filterable' : ''
              }`}
              key={stat.label}
            >
              {stat.filterKey ? (
                <button
                  className='stat-card-button'
                  type='button'
                  onClick={() => {
                    if (stat.filterKey) {
                      setRequestRegistryFilter((current) =>
                        current === stat.filterKey ? 'all' : stat.filterKey,
                      )
                    }
                  }}
                >
                  <span>{stat.label}</span>
                  <strong>{stat.value}</strong>
                </button>
              ) : (
                <>
                  <span>{stat.label}</span>
                  <strong>{stat.value}</strong>
                </>
              )}
            </article>
          ))}
        </section>
      ) : null}

      {actionError ? <p className='error-text'>{actionError}</p> : null}
      {isLoading ? (
        <p className='error-text'>Loading workflow data...</p>
      ) : null}

      {isMobileViewport && isCreateRequestModalOpen ? (
        renderCreateRequestPage()
      ) : isAccountant ? (
        <RfpDirectoryPage
          items={accountantDashboardRecords}
          onCreateNew={openCreateRequestModal}
          canCreateNew={canCreateRequest}
          onOpen={handleOpenSavedRfpRecord}
          onPreview={handlePreviewRequestForPaymentRecord}
          onPrint={handlePrintRequestForPaymentRecord}
          onUploadInvoice={openInvoiceUploadModal}
          viewMode={rfpRegistryView}
          onViewModeChange={setRfpRegistryView}
          onExportCsv={handleExportRfpCsv}
          activeScope=''
          onSavePaymentStatus={handleSaveRfpPaymentStatus}
        />
      ) : session.user.role === 'requester' ? (
        <div>
          {canCreateRequest ? (
            <div className='mobile-request-list-create'>
              <button
                className='request-list-create-button'
                type='button'
                onClick={openCreateRequestModal}
              >
                New purchase request
              </button>
            </div>
          ) : null}
          <RequestList
            items={filteredItems}
            selectedId={selectedId}
            activeFilter={requestRegistryFilter}
            viewMode={requestRegistryView}
            onViewModeChange={setRequestRegistryView}
            onFilterChange={setRequestRegistryFilter}
            onCreateNew={openCreateRequestModal}
            canCreateNew={canCreateRequest}
            searchQuery={requestSearchQuery}
            onSearchChange={setRequestSearchQuery}
            onSelect={handleSelect}
            onOpenSummary={handleOpenRequestSummaryPreview}
            onOpenWorkflow={handleOpenWorkflowPreview}
            onOpenDetails={handleOpenRequestDetails}
            onEdit={openEditRequestModalForItem}
            onDelete={handleDeleteRequestById}
            onExportCsv={handleExportCsv}
            canEditItem={(item) => canUserEditRequest(session?.user, item)}
            canOpenItem={(item) =>
              Boolean(
                session?.user?.role === 'admin' ||
                (Array.isArray(item.allowedRoles) &&
                  item.allowedRoles.includes(session.user.role)),
              )
            }
            canDeleteItem={(item) =>
              Boolean(
                session?.user?.role === 'requester' &&
                item.requesterEmail === session.user.email &&
                ['Purchase Request', 'Review'].includes(item.currentStage) &&
                item.status !== 'completed',
              )
            }
            onExportPdf={handleExportPdf}
            onExpand={() => openExpandedPanel('request-list')}
          />
        </div>
      ) : (
        <div>
          {canCreateRequest ? (
            <div className='mobile-request-list-create'>
              <button
                className='request-list-create-button'
                type='button'
                onClick={openCreateRequestModal}
              >
                New purchase request
              </button>
            </div>
          ) : null}
          <RequestList
            items={filteredItems}
            selectedId={selectedId}
            activeFilter={requestRegistryFilter}
            viewMode={requestRegistryView}
            onViewModeChange={setRequestRegistryView}
            onFilterChange={setRequestRegistryFilter}
            onCreateNew={openCreateRequestModal}
            canCreateNew={canCreateRequest}
            searchQuery={requestSearchQuery}
            onSearchChange={setRequestSearchQuery}
            onSelect={handleSelect}
            onOpenSummary={handleOpenRequestSummaryPreview}
            onOpenWorkflow={handleOpenWorkflowPreview}
            onOpenDetails={handleOpenRequestDetails}
            onEdit={openEditRequestModalForItem}
            onDelete={handleDeleteRequestById}
            onExportCsv={handleExportCsv}
            canEditItem={(item) => canUserEditRequest(session?.user, item)}
            canOpenItem={(item) =>
              Boolean(
                session?.user?.role === 'admin' ||
                (Array.isArray(item.allowedRoles) &&
                  item.allowedRoles.includes(session.user.role)),
              )
            }
            canDeleteItem={(item) =>
              Boolean(
                session?.user?.role === 'requester' &&
                item.requesterEmail === session.user.email &&
                ['Purchase Request', 'Review'].includes(item.currentStage) &&
                item.status !== 'completed',
              )
            }
            onExportPdf={handleExportPdf}
            onExpand={() => openExpandedPanel('request-list')}
          />
        </div>
      )}

      {rfpPreviewRecord ? (
        <Modal
          eyebrow='Request for Payment'
          title={rfpPreviewRecord.requestNumber}
          onClose={closeRfpPreviewModal}
          actions={
            <button
              className='ghost-button'
              type='button'
              onClick={() => {
                handlePrintRequestForPaymentRecord(rfpPreviewRecord)
              }}
            >
              Print
            </button>
          }
        >
          <form className='modal-form rfp-preview-modal' onSubmit={handleSubmitRfpPreview}>
            <div className='rfp-preview-summary'>
              <div className='rfp-preview-summary-head'>
                <strong>{rfpPreviewRecord.title}</strong>
                <span>{getEffectiveRequestForPaymentPayee(rfpPreviewRecord)}</span>
              </div>
              <div className='rfp-preview-meta'>
                <div>
                  <span>Requester</span>
                  <strong>{rfpPreviewRecord.requester || rfpPreviewRecord.requesterName || 'Not set'}</strong>
                </div>
                <div>
                  <span>Due date</span>
                  <strong>{rfpPreviewRecord.rfpDraft?.dueDate || getDefaultRequestForPaymentDueDate(rfpPreviewRecord) || 'Not set'}</strong>
                </div>
                <div>
                  <span>Amount requested</span>
                  <strong>{formatCurrencyValue(getRecordAmount(rfpPreviewRecord))}</strong>
                </div>
                <div>
                  <span>Status</span>
                  <strong>{rfpPreviewRecord.rfpDraft?.paymentStatus || 'Not set'}</strong>
                </div>
              </div>
              <div className='rfp-preview-notes'>
                <span>Description</span>
                <p>{rfpPreviewRecord.rfpDraft?.notes || rfpPreviewRecord.description || 'No description provided.'}</p>
              </div>
            </div>

            <div className='rfp-preview-form-grid'>
              <label>
                Invoice number
                <input
                  name='invoiceNumber'
                  value={rfpPreviewForm.invoiceNumber}
                  onChange={handleRfpPreviewFormChange}
                  placeholder='Enter invoice number'
                />
              </label>

              <label>
                Payment status
                <select
                  name='paymentStatus'
                  value={rfpPreviewForm.paymentStatus}
                  onChange={handleRfpPreviewFormChange}
                >
                  <option value=''>Select status</option>
                  <option value='Processing'>Processing</option>
                  <option value='Paid'>Paid</option>
                  <option value='Hold'>Hold</option>
                  <option value='Decline'>Decline</option>
                </select>
              </label>
            </div>

            {getCurrentInvoiceDocument(rfpPreviewRecord) ? (
              <div className='invoice-upload-current'>
                <p className='invoice-upload-caption'>Current invoice file</p>
                <a
                  className='audit-trail-link'
                  href={getCurrentInvoiceDocument(rfpPreviewRecord).filePath}
                  target='_blank'
                  rel='noreferrer'
                >
                  Open current invoice
                </a>
              </div>
            ) : null}

            <label>
              {getCurrentInvoiceDocument(rfpPreviewRecord)
                ? 'Replace invoice file'
                : 'Invoice file'}
              <input
                type='file'
                accept='.pdf,.jpg,.jpeg,.png,.webp'
                onChange={handleRfpPreviewFileChange}
              />
            </label>

            {rfpPreviewError ? (
              <p className='error-text'>{rfpPreviewError}</p>
            ) : null}

            <div className='modal-form-actions'>
              {getCurrentInvoiceDocument(rfpPreviewRecord) ? (
                <button
                  className='danger-button'
                  type='button'
                  onClick={() => {
                    void handleDeleteRfpPreviewInvoice()
                  }}
                  disabled={isRfpPreviewSubmitting}
                >
                  Delete invoice
                </button>
              ) : (
                <span />
              )}
              <div className='rfp-preview-action-buttons'>
                <button
                  className='ghost-button'
                  type='button'
                  onClick={closeRfpPreviewModal}
                  disabled={isRfpPreviewSubmitting}
                >
                  Close
                </button>
                <button type='submit' disabled={isRfpPreviewSubmitting}>
                  {isRfpPreviewSubmitting ? 'Saving...' : 'Save changes'}
                </button>
              </div>
            </div>
          </form>
        </Modal>
      ) : null}

      {invoiceUploadRecord ? (
        <Modal
          eyebrow='Invoice'
          title={
            getCurrentInvoiceDocument(invoiceUploadRecord)
              ? 'Manage invoice'
              : 'Upload the Invoice'
          }
          onClose={closeInvoiceUploadModal}
        >
          <form
            className='modal-form'
            onSubmit={(event) => {
              event.preventDefault()
              void handleSubmitInvoiceUpload()
            }}
          >
            <label>
              Invoice number
              <input
                name='invoiceNumber'
                value={invoiceUploadForm.invoiceNumber}
                onChange={handleInvoiceUploadFormChange}
                placeholder='Enter invoice number'
              />
            </label>

            {getCurrentInvoiceDocument(invoiceUploadRecord) ? (
              <div className='invoice-upload-current'>
                <p className='invoice-upload-caption'>Current invoice file</p>
                <a
                  className='audit-trail-link'
                  href={getCurrentInvoiceDocument(invoiceUploadRecord).filePath}
                  target='_blank'
                  rel='noreferrer'
                >
                  Open current invoice
                </a>
              </div>
            ) : null}

            <label>
              {getCurrentInvoiceDocument(invoiceUploadRecord)
                ? 'Replace invoice file'
                : 'Invoice file'}
              <input
                type='file'
                accept='.pdf,.jpg,.jpeg,.png,.webp'
                onChange={handleInvoiceUploadFileChange}
              />
            </label>

            {invoiceUploadError ? (
              <p className='error-text'>{invoiceUploadError}</p>
            ) : null}

            <div className='modal-form-actions'>
              {getCurrentInvoiceDocument(invoiceUploadRecord) ? (
                <button
                  className='danger-button'
                  type='button'
                  onClick={() => {
                    void handleDeleteInvoiceUpload()
                  }}
                  disabled={isInvoiceUploadSubmitting}
                >
                  {isInvoiceUploadSubmitting ? 'Deleting…' : 'Delete invoice'}
                </button>
              ) : null}
              <button
                className='ghost-button'
                type='button'
                onClick={closeInvoiceUploadModal}
                disabled={isInvoiceUploadSubmitting}
              >
                Cancel
              </button>
              <button
                className='primary-button'
                type='submit'
                disabled={isInvoiceUploadSubmitting}
              >
                {isInvoiceUploadSubmitting ? 'Saving…' : 'Save invoice'}
              </button>
            </div>
          </form>
        </Modal>
      ) : null}

      {isCreateRequestModalOpen && !isMobileViewport ? (
        <Modal
          eyebrow='New Request'
          title=''
          onClose={handleCloseCreateRequestModal}
        >
          <CreateRequestForm
            form={requestForm}
            branchOptions={branchOptions}
            isAdmin={isAdmin}
            requesterOptions={requesterOptions}
            onChange={handleRequestFormChange}
            onQuotationFileChange={handleRequestQuotationFileChange}
            onClearQuotationFile={handleClearRequestQuotationFile}
            quotationFile={requestQuotationFile}
            quotationFileName={requestQuotationFile?.name ?? ''}
            onSubmit={handleCreateRequest}
            onCancel={handleCloseCreateRequestModal}
            errors={requestFormErrors}
            isSubmitting={isSubmitting}
            canCreate={canCreateRequest}
            error={actionError}
          />
        </Modal>
      ) : null}

      {isSupplierModalOpen ? (
        <Modal
          eyebrow='New Supplier'
          title='Create supplier'
          onClose={() => setIsSupplierModalOpen(false)}
        >
          <SupplierForm
            form={supplierForm}
            onChange={handleSupplierFormChange}
            onSubmit={handleCreateSupplier}
            isSubmitting={isSubmitting}
            error={supplierError}
          />
        </Modal>
      ) : null}

      {expandedPanel ? (
        <Modal
          eyebrow={
            expandedPanel === 'workflow'
              ? undefined
              : expandedPanel === 'request-summary'
                ? 'Purchase Request'
                : undefined
          }
          title={
            expandedPanel === 'workflow' && selectedItem
              ? undefined
              : expandedPanel === 'request-summary' && selectedItem
                ? selectedItem.requestNumber
                : undefined
          }
          actions={
            expandedPanel === 'request-summary' && selectedItem ? (
              <span className='status-pill'>{selectedItem.status === 'completed' || selectedItem.filingCompleted
                ? 'Completed'
                : selectedItem.status === 'rejected'
                  ? 'Rejected'
                  : selectedItem.currentStage}</span>
            ) : undefined
          }
          onClose={closeExpandedPanel}
        >
          {expandedPanel === 'request-list' ? (
            <RequestList
              items={filteredItems}
              selectedId={selectedId}
              activeFilter={requestRegistryFilter}
              viewMode={requestRegistryView}
              onViewModeChange={setRequestRegistryView}
              onFilterChange={setRequestRegistryFilter}
              onCreateNew={openCreateRequestModal}
              canCreateNew={canCreateRequest}
              searchQuery={requestSearchQuery}
              onSearchChange={setRequestSearchQuery}
              onSelect={handleSelect}
              onOpenSummary={handleOpenRequestSummaryPreview}
              onOpenWorkflow={handleOpenWorkflowPreview}
              onOpenDetails={handleOpenRequestDetails}
              onEdit={openEditRequestModalForItem}
              onDelete={handleDeleteRequestById}
              onExportCsv={handleExportCsv}
              canEditItem={(item) => canUserEditRequest(session?.user, item)}
              canOpenItem={(item) =>
                Boolean(
                  session?.user?.role === 'admin' ||
                  (Array.isArray(item.allowedRoles) &&
                    item.allowedRoles.includes(session.user.role)),
                )
              }
              canDeleteItem={(item) =>
                Boolean(
                  session?.user?.role === 'requester' &&
                  item.requesterEmail === session.user.email &&
                  ['Purchase Request', 'Review'].includes(item.currentStage) &&
                  item.status !== 'completed',
                )
              }
              onExportPdf={handleExportPdf}
              showExpand={false}
            />
          ) : null}
          {expandedPanel === 'stage-actions' && selectedItem ? (
            <ActionPanel
              item={selectedItem}
              stages={selectedItemStages}
              user={session.user}
              form={actionForm}
              purchaseOrderForm={purchaseOrderForm}
              uploadForm={uploadForm}
              suppliers={suppliers}
              onChange={handleActionFormChange}
              onPurchaseOrderChange={handlePurchaseOrderFormChange}
              onPurchaseOrderLineItemChange={handlePurchaseOrderLineItemChange}
              onAddPurchaseOrderLineItem={handleAddPurchaseOrderLineItem}
              onRemovePurchaseOrderLineItem={handleRemovePurchaseOrderLineItem}
              onPrintPurchaseOrder={handlePrintPurchaseOrderPage}
              onReviewPurchaseOrder={handleReviewPurchaseOrder}
              onReviewAttachmentFileChange={handleReviewApprovalFileChange}
              onClearReviewAttachment={handleClearReviewApprovalFile}
              onUpload={handleUploadDocument}
              onCreateSupplier={openCreateSupplierModal}
              onSupplierPick={handleReviewSupplierPick}
              onAdvance={handleAdvance}
              onReject={handleReject}
              onBack={handleRevert}
              isSubmitting={isSubmitting}
              error={actionError}
              showExpand={false}
            />
          ) : null}
          {expandedPanel === 'request-summary' && selectedItem ? (
            <RequestSummary
              item={selectedItem}
              apiOrigin={API_ORIGIN}
              showExpand={false}
              showHeader={false}
              showStagePill={false}
            />
          ) : null}
          {expandedPanel === 'workflow' && selectedItem ? (
            <WorkflowTimeline
              stages={selectedItemStages}
              currentStage={selectedItem.currentStage}
              requestStatus={selectedItem.status}
              history={selectedItem.history}
              onOpenRequestForPaymentPage={openRequestForPaymentPage}
              showExpand={false}
            />
          ) : null}
          {expandedPanel === 'documents' && selectedItem ? (
            <DocumentPanel
              item={selectedItem}
              uploadForm={uploadForm}
              onUploadFormChange={handleUploadFormChange}
              onFileChange={handleUploadFileChange}
              onUpload={handleUploadDocument}
              onDelete={handleDeleteDocument}
              canManage={canManageDocuments}
              isSubmitting={isSubmitting}
              error={uploadError}
              apiOrigin={API_ORIGIN}
              showExpand={false}
            />
          ) : null}
          {expandedPanel === 'admin-request'
            ? renderAdminRequestLaunch(false)
            : null}
          {expandedPanel === 'user-directory' ? (
            <UserManagementPanel
              users={users}
              selectedUserId={selectedUserId}
              onSelect={handleSelectUser}
              onCreateNew={openCreateUserModal}
              onEditSelected={openEditUserModal}
              onDeleteSelected={handleDeleteUser}
              showExpand={false}
            />
          ) : null}
        </Modal>
      ) : null}

      {isEditRequestModalOpen && selectedItem ? (
        <Modal
          eyebrow={isAdmin ? 'Admin Request' : 'Edit Request'}
          title={`Edit ${selectedItem.requestNumber}`}
          onClose={() => setIsEditRequestModalOpen(false)}
        >
          <RequestAdminPanel
            item={selectedItem}
            stages={selectedItemStages}
            branchOptions={Array.from(
              new Set([...branchOptions, selectedItem.branch].filter(Boolean)),
            )}
            form={requestAdminForm}
            onChange={handleRequestAdminFormChange}
            onSave={handleSaveRequest}
            onDelete={handleDeleteRequest}
            canDelete={isAdmin}
            isAdmin={isAdmin}
            isSubmitting={isSubmitting}
            error={actionError}
          />
        </Modal>
      ) : null}

      {isUserModalOpen ? (
        <Modal
          eyebrow='Admin Users'
          title={selectedUserId ? 'Edit user account' : 'Create user account'}
          onClose={() => setIsUserModalOpen(false)}
        >
          <UserEditorPanel
            selectedUserId={selectedUserId}
            form={userForm}
            onChange={handleUserFormChange}
            onCreate={handleCreateUser}
            onUpdate={handleUpdateUser}
            onDelete={handleDeleteUser}
            isSubmitting={isSubmitting}
            error={userError}
          />
        </Modal>
      ) : null}

      {confirmDialog ? (
        <ConfirmDialog
          title={confirmDialog.title}
          message={confirmDialog.message}
          confirmLabel={confirmDialog.confirmLabel}
          onConfirm={confirmDialog.onConfirm}
          onClose={() => setConfirmDialog(null)}
          isSubmitting={isSubmitting}
        />
      ) : null}
    </main>
  )
}

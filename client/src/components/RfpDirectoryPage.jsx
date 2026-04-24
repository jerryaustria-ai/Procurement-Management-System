import { useMemo, useState } from 'react'

const DEFAULT_WORKFLOW_STAGES = [
  'Purchase Request',
  'Review',
  'Approval',
  'Prepare PO',
  'Approve PO',
  'Send PO',
  'Delivery',
  'Inspection',
  'Request for Payment',
  'Payment',
  'Filing',
]

function getWorkflowStages(record) {
  return Array.isArray(record?.workflowStages) && record.workflowStages.length
    ? record.workflowStages
    : DEFAULT_WORKFLOW_STAGES
}

function getWorkflowStageIndex(record, stageName) {
  return getWorkflowStages(record).findIndex((stage) => stage === stageName)
}

function isTerminalRequest(record) {
  const normalizedStatus = String(record?.status || '')
    .trim()
    .toLowerCase()
  const normalizedStage = String(record?.currentStage || '')
    .trim()
    .toLowerCase()

  return (
    normalizedStatus === 'rejected' ||
    normalizedStatus === 'completed' ||
    normalizedStage === 'rejected' ||
    normalizedStage === 'completed' ||
    Boolean(record?.filingCompleted)
  )
}

function getNormalizedPaymentStatus(record) {
  return String(record?.rfpDraft?.paymentStatus || '')
    .trim()
    .toLowerCase()
}

function isForApprovalRecord(record) {
  return !isTerminalRequest(record) && record?.currentStage === 'Approval'
}

function isForPaymentRecord(record) {
  if (isTerminalRequest(record)) {
    return false
  }

  if (getNormalizedPaymentStatus(record) === 'paid') {
    return false
  }

  const approvalIndex = getWorkflowStageIndex(record, 'Approval')
  const currentStageIndex = getWorkflowStageIndex(record, record?.currentStage)
  const filingIndex = getWorkflowStageIndex(record, 'Filing')

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
}

function getPaidRecordDate(record) {
  const normalizedPaymentStatus = getNormalizedPaymentStatus(record)
  const paidDate =
    normalizedPaymentStatus === 'paid' && record?.updatedAt
      ? new Date(record.updatedAt)
      : (record?.status === 'completed' || record?.filingCompleted) &&
          record?.updatedAt
        ? new Date(record.updatedAt)
        : null

  if (!paidDate || Number.isNaN(paidDate.getTime())) {
    return null
  }

  return paidDate
}

function isPaidForPeriodRecord(record, selectedMonth, selectedYear) {
  const paidDate = getPaidRecordDate(record)

  if (!paidDate) {
    return false
  }

  return (
    paidDate.getMonth() === selectedMonth &&
    paidDate.getFullYear() === selectedYear
  )
}

function getRecordScope(record, selectedMonth, selectedYear) {
  if (isForApprovalRecord(record)) {
    return 'for-approval'
  }

  if (isForPaymentRecord(record)) {
    return 'for-payment'
  }

  if (isPaidForPeriodRecord(record, selectedMonth, selectedYear)) {
    return 'paid'
  }

  return 'all'
}

function getAvailablePaidYears(items) {
  const currentYear = new Date().getFullYear()
  const years = new Set([currentYear])

  items.forEach((record) => {
    const paidDate = getPaidRecordDate(record)
    if (paidDate) {
      years.add(paidDate.getFullYear())
    }
  })

  return [...years].sort((left, right) => right - left)
}

const MONTH_OPTIONS = [
  { value: 0, label: 'January' },
  { value: 1, label: 'February' },
  { value: 2, label: 'March' },
  { value: 3, label: 'April' },
  { value: 4, label: 'May' },
  { value: 5, label: 'June' },
  { value: 6, label: 'July' },
  { value: 7, label: 'August' },
  { value: 8, label: 'September' },
  { value: 9, label: 'October' },
  { value: 10, label: 'November' },
  { value: 11, label: 'December' },
]

const VALID_RFP_FILTERS = ['all', 'for-approval', 'for-payment', 'paid']

function getDisplayPayee(record) {
  const requestedPayeeSupplier = String(
    record?.requestedPayeeSupplier || "",
  ).trim();
  const savedPayee = String(record?.rfpDraft?.payee || "").trim();
  const currentSupplier = String(
    record?.supplier === "Pending selection" ? "" : record?.supplier || "",
  ).trim();
  const hasOriginalPayeeSupplier = Boolean(requestedPayeeSupplier);
  const shouldReplaceLegacySupplierPayee =
    !hasOriginalPayeeSupplier &&
    savedPayee &&
    currentSupplier &&
    currentSupplier !== "Pending selection" &&
    savedPayee.toLowerCase() === currentSupplier.toLowerCase();

  if (requestedPayeeSupplier) {
    return requestedPayeeSupplier;
  }

  if (currentSupplier && (!savedPayee || shouldReplaceLegacySupplierPayee)) {
    return currentSupplier;
  }

  if (!savedPayee || shouldReplaceLegacySupplierPayee) {
    return String(record?.requester || record?.requesterName || "Not set").trim() || "Not set";
  }

  return savedPayee;
}

function getCurrentInvoiceDocument(record) {
  const invoiceDocuments = (record?.documents || []).filter(
    (document) => document.type === "invoice",
  );

  return invoiceDocuments[invoiceDocuments.length - 1] || null;
}

function parseAmountValue(value) {
  if (value === null || typeof value === 'undefined') {
    return 0
  }

  const normalized = String(value).replaceAll(',', '').trim()

  if (!normalized) {
    return 0
  }

  return Number(normalized) || 0
}

function getRecordAmount(record) {
  return parseAmountValue(record?.rfpDraft?.amountRequested || record?.amount)
}

function formatCurrencyValue(value, currency = 'PHP') {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency,
  }).format(value || 0)
}

function getDisplayRfpStatus(record) {
  const normalizedPaymentStatus = getNormalizedPaymentStatus(record)

  if (normalizedPaymentStatus) {
    return (
      normalizedPaymentStatus.charAt(0).toUpperCase() +
      normalizedPaymentStatus.slice(1)
    )
  }

  if (getPaidRecordDate(record)) {
    return 'Paid'
  }

  if (isForApprovalRecord(record)) {
    return 'For Approval'
  }

  if (isForPaymentRecord(record)) {
    return 'For Payment'
  }

  return 'Not set'
}

function getSortState(sortValue, columnKey) {
  if (columnKey === 'request') {
    if (sortValue === 'request-number-asc') {
      return 'asc'
    }
    if (sortValue === 'request-number-desc') {
      return 'desc'
    }
  }

  if (columnKey === 'payee') {
    if (sortValue === 'payee-asc') {
      return 'asc'
    }
    if (sortValue === 'payee-desc') {
      return 'desc'
    }
  }

  if (columnKey === 'due-date') {
    if (sortValue === 'due-date-asc') {
      return 'asc'
    }
    if (sortValue === 'due-date-desc') {
      return 'desc'
    }
  }

  return 'inactive'
}

export default function RfpDirectoryPage({
  items,
  onCreateNew,
  canCreateNew = false,
  onOpen,
  onPreview,
  onPrint,
  onUploadInvoice,
  embedded = false,
}) {
  const currentDate = new Date()
  const [searchQuery, setSearchQuery] = useState('')
  const [filterValue, setFilterValue] = useState('all')
  const [paidMonth, setPaidMonth] = useState(currentDate.getMonth())
  const [paidYear, setPaidYear] = useState(currentDate.getFullYear())
  const [sortValue, setSortValue] = useState('due-date-asc')

  const availablePaidYears = useMemo(
    () => getAvailablePaidYears(items),
    [items],
  )

  const handleHeaderSort = (columnKey) => {
    setSortValue((current) => {
      if (columnKey === 'request') {
        return current === 'request-number-asc'
          ? 'request-number-desc'
          : 'request-number-asc'
      }

      if (columnKey === 'payee') {
        return current === 'payee-asc' ? 'payee-desc' : 'payee-asc'
      }

      if (columnKey === 'due-date') {
        return current === 'due-date-asc' ? 'due-date-desc' : 'due-date-asc'
      }

      return current
    })
  }

  const visibleItems = useMemo(() => {
    const normalizedQuery = String(searchQuery || '')
      .trim()
      .toLowerCase()

    const filteredItems = items.filter((record) => {
      const matchesSearch =
        !normalizedQuery ||
        [
          record.requestNumber,
          record.title,
          getDisplayPayee(record),
          record.rfpDraft?.invoiceNumber,
          record.rfpDraft?.dueDate,
          record.currentStage,
          record.requester,
          record.requesterName,
        ]
          .filter(Boolean)
          .some((value) =>
            String(value).toLowerCase().includes(normalizedQuery),
          )

      if (!matchesSearch) {
        return false
      }

      if (filterValue === 'for-approval') {
        return isForApprovalRecord(record)
      }

      if (filterValue === 'for-payment') {
        return isForPaymentRecord(record)
      }

      if (filterValue === 'paid') {
        return isPaidForPeriodRecord(record, paidMonth, paidYear)
      }

      return true
    })

    const sortedItems = [...filteredItems].sort((left, right) => {
      if (sortValue === 'request-number-asc') {
        return String(left.requestNumber || '').localeCompare(
          String(right.requestNumber || ''),
        )
      }

      if (sortValue === 'request-number-desc') {
        return String(right.requestNumber || '').localeCompare(
          String(left.requestNumber || ''),
        )
      }

      if (sortValue === 'payee-asc') {
        return getDisplayPayee(left).localeCompare(getDisplayPayee(right))
      }

      if (sortValue === 'payee-desc') {
        return getDisplayPayee(right).localeCompare(getDisplayPayee(left))
      }

      const leftDate = new Date(left?.rfpDraft?.dueDate || 0).getTime()
      const rightDate = new Date(right?.rfpDraft?.dueDate || 0).getTime()

      if (sortValue === 'due-date-desc') {
        return rightDate - leftDate
      }

      return leftDate - rightDate
    })

    return sortedItems
  }, [filterValue, items, paidMonth, paidYear, searchQuery, sortValue])

  const content = (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Request for Payment</p>
          <h2>RFP records</h2>
        </div>
        <span className="panel-counter">
          {visibleItems.length} {visibleItems.length === 1 ? "record" : "records"}
        </span>
      </div>

      <div className="request-list-toolbar rfp-directory-toolbar">
        <div className="request-list-toolbar-left">
          <label className="request-list-search" aria-label="Search RFP records">
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => {
                setSearchQuery(event.target.value)
              }}
              placeholder="Search RFP records"
            />
          </label>
          <label
            className="request-list-filter-select request-list-filter-select-inline"
            aria-label="Filter RFP records"
          >
            <select
              value={filterValue}
              onChange={(event) => {
                const nextFilter = VALID_RFP_FILTERS.includes(event.target.value)
                  ? event.target.value
                  : 'all'
                setFilterValue(nextFilter)
              }}
            >
              <option value="all">All records</option>
              <option value="for-approval">For Approval</option>
              <option value="for-payment">For Payment</option>
              <option value="paid">Paid</option>
            </select>
          </label>
          {filterValue === 'paid' ? (
            <>
              <label
                className="request-list-filter-select request-list-filter-select-inline"
                aria-label="Paid month"
              >
                <select
                  value={String(paidMonth)}
                  onChange={(event) => {
                    setPaidMonth(Number(event.target.value))
                  }}
                >
                  {MONTH_OPTIONS.map((month) => (
                    <option key={month.value} value={month.value}>
                      {month.label}
                    </option>
                  ))}
                </select>
              </label>
              <label
                className="request-list-filter-select request-list-filter-select-inline"
                aria-label="Paid year"
              >
                <select
                  value={String(paidYear)}
                  onChange={(event) => {
                    setPaidYear(Number(event.target.value))
                  }}
                >
                  {availablePaidYears.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </label>
            </>
          ) : null}
        </div>
        {canCreateNew ? (
          <div className="request-list-tools-top">
            <button
              className="request-list-create-button"
              type="button"
              onClick={onCreateNew}
            >
              New purchase request
            </button>
          </div>
        ) : null}
      </div>

      {visibleItems.length === 0 ? (
        <p className="empty-state">No RFP-enabled requests available.</p>
      ) : (
        <div className="supplier-table audit-trail-table-wrap">
          <table className="supplier-table-grid audit-trail-table">
            <thead className="supplier-table-header">
              <tr>
                <th>
                  <div className="sortable-table-header">
                    <span>Request</span>
                    <button
                      className={`sortable-table-header-button sortable-table-header-button-${getSortState(sortValue, 'request')}`}
                      type="button"
                      aria-label="Sort by request number"
                      onClick={() => {
                        handleHeaderSort('request')
                      }}
                    >
                      {getSortState(sortValue, 'request') === 'asc'
                        ? '↑'
                        : getSortState(sortValue, 'request') === 'desc'
                          ? '↓'
                          : '↕'}
                    </button>
                  </div>
                </th>
                <th>
                  <div className="sortable-table-header">
                    <span>Payee / Supplier</span>
                    <button
                      className={`sortable-table-header-button sortable-table-header-button-${getSortState(sortValue, 'payee')}`}
                      type="button"
                      aria-label="Sort by payee or supplier"
                      onClick={() => {
                        handleHeaderSort('payee')
                      }}
                    >
                      {getSortState(sortValue, 'payee') === 'asc'
                        ? '↑'
                        : getSortState(sortValue, 'payee') === 'desc'
                          ? '↓'
                          : '↕'}
                    </button>
                  </div>
                </th>
                <th>
                  <div className="sortable-table-header">
                    <span>Due date</span>
                    <button
                      className={`sortable-table-header-button sortable-table-header-button-${getSortState(sortValue, 'due-date')}`}
                      type="button"
                      aria-label="Sort by due date"
                      onClick={() => {
                        handleHeaderSort('due-date')
                      }}
                    >
                      {getSortState(sortValue, 'due-date') === 'asc'
                        ? '↑'
                        : getSortState(sortValue, 'due-date') === 'desc'
                          ? '↓'
                          : '↕'}
                    </button>
                  </div>
                </th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {visibleItems.map((record) => {
                const handlePreview = () => {
                  if (typeof onPreview === "function") {
                    onPreview(record);
                  }
                };

                return (
                  <tr
                    key={record.id}
                    className="supplier-row audit-trail-row"
                    onClick={handlePreview}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        handlePreview();
                      }
                    }}
                    tabIndex={0}
                  >
                    <td>
                      <strong>{record.requestNumber}</strong>
                      <div className="audit-trail-cell-subtext">{record.title}</div>
                    </td>
                    <td>{getDisplayPayee(record)}</td>
                    <td>{record?.rfpDraft?.dueDate || 'Not set'}</td>
                    <td>
                      <span className="rfp-status-text">
                        {getDisplayRfpStatus(record)}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );

  if (embedded) {
    return <div className="settings-embedded-page">{content}</div>;
  }

  return content;
}

import { calculateRenewalDate, renewalTone, renewalLabel } from '../utils/renewal.js'
import { useEffect, useMemo, useState } from 'react'
import { EquipmentTable, EquipmentForm, EquipmentDetails, EQUIPMENT_FIELDS, equipmentValue } from './EquipmentInventory.jsx'
import { EquipmentScanner } from './EquipmentQr.jsx'
import { CompanySelect, CompanyForm, CompanyTable } from './CompanyDirectory.jsx'
import { EquipmentImport } from './EquipmentImport.jsx'

const ISP_FIELDS = [
  ['provider', 'ISP or Provider'],
  ['accountNumber', 'Account Number'],
  ['planName', 'Plan Name'],
  ['planSpeed', 'Plan Speed'],
  ['monthlyFee', 'Monthly Fee', 'number'],
  ['installationAddress', 'Installation Address or Place Installed'],
  ['company', 'Company Name', 'text', true],
  ['accountableTo', 'Person or Department Accountable', 'text', true],
  ['contractStartDate', 'Contract Start Date', 'date'],
  ['contractEndDate', 'Contract End Date', 'date'],
  ['routerModel', 'Modem or Router Model'],
  ['serialNumber', 'Modem or Router Serial Number'],
  ['status', 'Status', 'select', true],
  ['remarks', 'Remarks', 'textarea'],
]

function ispValue(item, [key, , , root]) {
  return (root ? item[key] : item.data?.[key]) ?? ''
}

function IspTable({ items, onView }) {
  const columns = [
    ['provider', 'ISP Provider'],
    ['accountNumber', 'Account No.'],
    ['planName', 'Plan Name'],
    ['installationAddress', 'Installation Address'],
  ]
  return <table><thead><tr>{columns.map(([key, label]) => <th key={key}>{label}</th>)}<th>Actions</th></tr></thead><tbody>{items.map((item) => <tr key={item.id} className={item.status?.trim().toLowerCase() === 'terminated' ? 'inventory-isp-terminated' : undefined}>{columns.map((field) => <td key={field[0]}>{ispValue(item, field) || '-'}</td>)}<td><button className='inventory-link' onClick={() => onView(item)}>View</button></td></tr>)}</tbody></table>
}

function IspForm({ form, setForm, onSubmit, onClose, editing, config, companies }) {
  function setField(field, value) {
    const [key, , , root] = field
    setForm((current) => {
      if (root) return { ...current, [key]: value }
      const data = { ...current.data, [key]: value }
      return { ...current, data, ...(['contractStartDate', 'contractEndDate'].includes(key) ? { renewalDate: calculateRenewalDate(data.contractStartDate, data.contractEndDate) } : {}) }
    })
  }
  return <div className='inventory-modal-backdrop'><form className='inventory-modal' onSubmit={onSubmit}>
    <div className='inventory-modal-head'><div><p className='eyebrow'>{editing ? 'Edit ISP account' : 'New ISP account'}</p><h2>Internet / ISP Plan</h2></div><button type='button' onClick={onClose}>Close</button></div>
    <div className='inventory-form-grid'>{ISP_FIELDS.map((field) => {
      const [key, label, type = 'text'] = field
      const value = ispValue(form, field)
      if (key === 'company') return <label key={key}>{label}<CompanySelect companies={companies} value={value} onChange={(value) => setField(field, value)} /></label>
      return <label key={key}>{label}{type === 'select' ? <select value={value} onChange={(event) => setField(field, event.target.value)}>{config.statuses.map((status) => <option key={status}>{status}</option>)}</select> : type === 'textarea' ? <textarea rows='3' value={value} onChange={(event) => setField(field, event.target.value)} /> : <input type={type} required={['provider', 'accountNumber'].includes(key)} min={type === 'number' ? '0' : undefined} step={type === 'number' ? '0.01' : undefined} value={type === 'date' ? value.slice(0, 10) : value} onChange={(event) => setField(field, event.target.value)} />}</label>
    })}</div>
    <div className='inventory-form-actions'><button type='button' className='inventory-secondary' onClick={onClose}>Cancel</button><button className='inventory-primary'>Save ISP Plan</button></div>
  </form></div>
}

const MODULES = {
  postpaid: {
    label: 'Postpaid Plans',
    singular: 'Postpaid line',
    statuses: ['Active', 'For Renewal', 'Renewed', 'Temporarily Disconnected', 'For Termination', 'Terminated', 'Suspended', 'Transferred', 'Inactive'],
    fields: [
      ['provider', 'Provider'], ['accountNumber', 'Account Number'], ['mobileNumber', 'Mobile Number'],
      ['planName', 'Plan Name'], ['monthlyAmount', 'Monthly Plan Amount', 'number'], ['department', 'Department'], ['cashoutAmount', 'Cashout Amount', 'number'],
      ['handsetBrand', 'Handset Brand'], ['handsetModel', 'Handset Model'], ['handsetSerialNumber', 'Handset Serial Number'], ['imei', 'IMEI Number'],
      ['otherDetails', 'Other Details'], ['remarks', 'Remarks'],
    ],
  },
  isp: {
    label: 'Internet / ISP Plans',
    singular: 'ISP account',
    statuses: ['Active', 'For Renewal', 'Temporarily Disconnected', 'For Termination', 'Terminated', 'Suspended', 'Inactive'],
    fields: ISP_FIELDS,
  },
  equipment: {
    label: 'Office Equipment',
    singular: 'Equipment',
    statuses: ['Available', 'Issued', 'In Storage', 'Borrowed', 'Under Repair', 'For Replacement', 'Returned', 'Lost', 'Retired', 'Disposed'],
    fields: [
      ['category', 'Equipment Category'], ['brand', 'Brand'], ['model', 'Model'], ['serialNumber', 'Serial Number'],
      ['purchaseDate', 'Purchase Date', 'date'], ['purchasePrice', 'Purchase Price', 'number'], ['supplier', 'Supplier'],
      ['poNumber', 'Purchase Order Number'], ['warrantyExpirationDate', 'Warranty Expiration Date', 'date'],
      ['issueDate', 'Issue Date', 'date'], ['department', 'Employee Department'], ['location', 'Office / Location'],
      ['condition', 'Condition'], ['remarks', 'Remarks'],
    ],
  },
  employees: {
    label: 'Employees', singular: 'Employee', statuses: ['Active', 'Inactive'],
    fields: [['employeeId', 'Employee ID'], ['department', 'Department'], ['position', 'Position'], ['email', 'Email Address', 'email'], ['contactNumber', 'Contact Number']],
  },
  companies: {
    label: 'Companies', singular: 'Company', statuses: ['Active', 'Inactive'],
    fields: [['address', 'Address'], ['contactNumber', 'Contact Number'], ['remarks', 'Remarks']],
  },
}

const NAV_ITEMS = [
  ['dashboard', 'Dashboard'], ['postpaid', 'Postpaid Plans'], ['isp', 'Internet / ISP'],
  ['equipment', 'Office Equipment'], ['employees', 'Employees'], ['companies', 'Companies'],
  ['reports', 'Reports'], ['audit', 'Audit Logs'],
]

function emptyForm(moduleName) {
  const config = MODULES[moduleName]
  return {
    recordCode: '', name: '', status: config?.statuses?.[0] || 'Active', company: '',
    accountableTo: '', renewalDate: '', value: '', data: {},
  }
}

function formatDate(value) {
  if (!value) return 'Not set'
  return new Intl.DateTimeFormat('en-PH', { dateStyle: 'medium', timeZone: 'Asia/Manila' }).format(new Date(value))
}

function RenewalBadge({ value }) {
  return <span className={`inventory-renewal ${renewalTone(value)}`}>{formatDate(value)}{value ? <small>{renewalLabel(value)}</small> : null}</span>
}

export default function InventoryApp({ apiBaseUrl, session, onOpenProcurement, onLogout }) {
  const [page, setPage] = useState(() => new URLSearchParams(window.location.search).has('equipmentId') ? 'equipment' : 'dashboard')
  const [showScanner, setShowScanner] = useState(false)
  const [showEquipmentImport, setShowEquipmentImport] = useState(false)
  const [items, setItems] = useState([])
  const [dashboard, setDashboard] = useState({ totals: {}, alerts: [] })
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('All')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState(emptyForm('postpaid'))
  const [editing, setEditing] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [selected, setSelected] = useState(null)
  const [postpaidAction, setPostpaidAction] = useState(null)
  const [archivedRecords, setArchivedRecords] = useState([])
  const [showArchived, setShowArchived] = useState(false)

  const [companies, setCompanies] = useState([])
  const isSuperAdmin = session.user.role === 'super_admin'
  const isAdmin = ['admin', 'super_admin'].includes(session.user.role)
  const canEdit = isAdmin && (page !== 'companies' || isSuperAdmin)
  const config = MODULES[page]

  async function api(path, options = {}) {
    const response = await fetch(`${apiBaseUrl}/inventory${path}`, {
      ...options,
      headers: { ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }), Authorization: `Bearer ${session.token}`, ...(options.headers || {}) },
    })
    const text = response.status === 204 ? '' : await response.text()
    let data = null
    try { data = text ? JSON.parse(text) : null } catch {
      throw new Error(`Inventory API returned an unexpected response (HTTP ${response.status}). Check that the inventory backend is deployed and the API URL is correct.`)
    }
    if (!response.ok) throw new Error(data?.message || 'Inventory request failed.')
    return data
  }

  async function loadPage(target = page) {
    setLoading(true); setError('')
    try {
      if (target === 'dashboard') setDashboard(await api('/dashboard'))
      else if (target === 'audit') setItems((await api('/audit')).items)
      else if (MODULES[target]) setItems((await api(`/${target}`)).items)
    } catch (loadError) { setError(loadError.message) }
    finally { setLoading(false) }
  }

  useEffect(() => { void loadPage(page) }, [page])

  async function loadCompanies() {
    try { setCompanies((await api('/companies')).items.sort((a, b) => a.name.localeCompare(b.name))) }
    catch (failure) { setError(`Unable to load company options: ${failure.message}`) }
  }
  useEffect(() => { void loadCompanies() }, [])

  async function openEquipmentId(id) {
    setShowScanner(false); setPage('equipment'); setError('')
    if (!/^[a-f\d]{24}$/i.test(id || '')) { setError('Invalid equipment QR link.'); return }
    try { setSelected(await api(`/equipment/${id}`)) } catch (failure) { setError(failure.message) }
  }

  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get('equipmentId')
    if (id) void openEquipmentId(id)
  }, [])

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return items.filter((item) => {
      const matchesStatus = status === 'All' || item.status === status
      const haystack = JSON.stringify(item).toLowerCase()
      return matchesStatus && (!needle || haystack.includes(needle))
    })
  }, [items, query, status])

  function openCreate() {
    void loadCompanies()
    setEditing(null); setForm(emptyForm(page)); setShowForm(true)
  }

  function openEdit(item) {
    void loadCompanies()
    setEditing(item); setForm({ ...emptyForm(page), ...item, renewalDate: item.renewalDate?.slice?.(0, 10) || '', data: item.data || {} }); setShowForm(true)
  }

  async function save(event) {
    event.preventDefault(); setLoading(true); setError('')
    try {
      const startDate = form.data?.contractStartDate
      const endDate = form.data?.contractEndDate
      if (startDate && endDate && new Date(endDate) < new Date(startDate)) {
        throw new Error('Contract End Date cannot be earlier than Contract Start Date.')
      }
      if (form.data?.imei && !/^\d{15}$/.test(form.data.imei)) {
        throw new Error('IMEI must contain exactly 15 digits.')
      }
      if (page === 'postpaid' && form.data?.mobileNumber && !/^(?:\+63|0)?9\d{9}$/.test(form.data.mobileNumber.replace(/[\s-]/g, ''))) {
        throw new Error('Enter a valid Philippine mobile number.')
      }
      const numericValues = [form.value, form.data?.monthlyAmount, form.data?.monthlyFee, form.data?.purchasePrice]
      if (numericValues.some((value) => value !== '' && value != null && Number(value) < 0)) {
        throw new Error('Amounts and prices cannot be negative.')
      }
      const renewalDate = calculateRenewalDate(startDate, endDate, form.renewalDate)
      const payload = { ...form, renewalDate, value: Number(form.value || 0) }
      delete payload.pendingFiles
      if (page === 'equipment') {
        payload.value = Number(form.data?.purchasePrice || 0)
        payload.renewalDate = form.data?.warrantyExpirationDate || null
      }
      if (page === 'isp') {
        payload.recordCode = form.recordCode?.trim() || `ISP-${crypto.randomUUID()}`
        payload.name = [form.data?.planName, form.data?.provider, form.data?.accountNumber, payload.recordCode]
          .map((value) => String(value || '').trim()).find(Boolean)
        payload.status = form.status?.trim() || 'Active'
      }
      let saved = await api(editing ? `/${page}/${editing.id}` : `/${page}`, {
        method: editing ? 'PATCH' : 'POST', body: JSON.stringify(payload),
      })
      setItems((current) => editing ? current.map((item) => item.id === saved.id ? saved : item) : [saved, ...current])
      if (page === 'equipment') {
        setEditing(saved)
        setForm((current) => ({ ...current, ...saved, renewalDate: saved.renewalDate?.slice(0, 10) || '' }))
        for (const [kind, files] of Object.entries(form.pendingFiles || {})) {
          for (const file of files) {
            const body = new FormData(); body.append('kind', kind); body.append('document', file)
            try {
              saved = await api(`/equipment/${saved.id}/attachments`, { method: 'POST', body })
              setItems((current) => current.map((item) => item.id === saved.id ? saved : item))
              setForm((current) => ({ ...current, attachments: saved.attachments, pendingFiles: { ...current.pendingFiles, [kind]: current.pendingFiles[kind].filter((entry) => entry !== file) } }))
            } catch (failure) { throw new Error(`Equipment saved, but ${file.name} could not upload: ${failure.message} Retry Save Equipment to upload remaining files.`) }
          }
        }
      }
      setShowForm(false); setEditing(null)
      if (page === 'companies') await loadCompanies()
    } catch (saveError) { setError(saveError.message) }
    finally { setLoading(false) }
  }

  async function archive(item) {
    if (!window.confirm(`Archive ${item.recordCode}? You can restore it later from Archived Records.`)) return
    try {
      await api(`/${page}/${item.id}`, { method: 'PATCH', body: JSON.stringify({ archived: true, historyAction: 'Record archived' }) })
      setItems((current) => current.filter((entry) => entry.id !== item.id))
      setSelected(null)
      if (page === 'companies') await loadCompanies()
    } catch (archiveError) { setError(archiveError.message) }
  }

  async function recordEquipmentMovement(values) {
    const saved = await api(`/equipment/${selected.id}/accountability`, { method: 'POST', body: JSON.stringify(values) })
    setSelected(saved)
    setItems((current) => current.map((item) => item.id === saved.id ? saved : item))
  }

  function exportCsv() {
    const rows = page === 'equipment' ? [EQUIPMENT_FIELDS.map((field) => field[1]), ...filtered.map((item) => EQUIPMENT_FIELDS.map((field) => equipmentValue(item, field)))] : page === 'isp' ? [ISP_FIELDS.map((field) => field[1]), ...filtered.map((item) => ISP_FIELDS.map((field) => ispValue(item, field)))] : page === 'postpaid'
      ? [['Provider', 'Account Number', 'Mobile Number', 'Plan Name', 'Monthly Plan Amount', 'Employee or Person Accountable', 'Department', 'Cashout Amount', 'Handset Brand', 'Handset Model', 'Handset Serial Number', 'IMEI Number', 'Other Details', 'Status', 'Remarks'], ...filtered.map((item) => [item.data?.provider, item.data?.accountNumber, item.data?.mobileNumber, item.data?.planName, item.data?.monthlyAmount, item.accountableTo, item.data?.department, item.data?.cashoutAmount, item.data?.handsetBrand, item.data?.handsetModel, item.data?.handsetSerialNumber, item.data?.imei, item.data?.otherDetails, item.status, item.data?.remarks])]
      : [['Code', 'Name', 'Status', 'Company', 'Accountable To', 'Renewal Date', 'Value'], ...filtered.map((item) => [item.recordCode, item.name, item.status, item.company, item.accountableTo, item.renewalDate || '', item.value || 0])]
    const csv = rows.map((row) => row.map((cell) => `"${String(cell ?? '').replaceAll('"', '""')}"`).join(',')).join('\n')
    const link = document.createElement('a'); link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); link.download = `${page}-inventory.csv`; link.click(); URL.revokeObjectURL(link.href)
  }

  function exportExcel() {
    const table = document.querySelector('.inventory-table-wrap table')?.outerHTML || ''
    const link = document.createElement('a'); link.href = URL.createObjectURL(new Blob([`<html><body>${table}</body></html>`], { type: 'application/vnd.ms-excel' })); link.download = `${page}-inventory.xls`; link.click(); URL.revokeObjectURL(link.href)
  }

  function closeToolbarMenu(event) {
    event.currentTarget.closest('details')?.removeAttribute('open')
  }

  async function openArchivedRecords(event) {
    closeToolbarMenu(event)
    setLoading(true); setError('')
    try {
      const results = await Promise.all(Object.keys(MODULES).filter((key) => key !== 'companies' || isSuperAdmin).map(async (moduleKey) => {
        const response = await api(`/${moduleKey}?archived=only`)
        return response.items.map((item) => ({ ...item, moduleKey, moduleLabel: MODULES[moduleKey].singular }))
      }))
      setArchivedRecords(results.flat().sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)))
      setShowArchived(true)
    } catch (archiveError) { setError(archiveError.message) }
    finally { setLoading(false) }
  }

  async function unarchiveRecord(record) {
    if (!window.confirm(`Unarchive ${record.recordCode}?`)) return
    setLoading(true); setError('')
    try {
      const saved = await api(`/${record.moduleKey}/${record.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ archived: false, historyAction: 'Record unarchived' }),
      })
      setArchivedRecords((current) => current.filter((item) => item.id !== record.id))
      if (page === record.moduleKey) setItems((current) => [saved, ...current.filter((item) => item.id !== saved.id)])
      if (record.moduleKey === 'companies') await loadCompanies()
    } catch (archiveError) { setError(archiveError.message) }
    finally { setLoading(false) }
  }

  async function completePostpaidAction(action) {
    setLoading(true); setError('')
    try {
      const item = action.item
      let saved
      if (action.type === 'renewal') {
        saved = await api(`/postpaid/${item.id}/contracts`, { method: 'POST', body: JSON.stringify(action.values) })
      } else if (action.type === 'contract-edit') {
        saved = await api(`/postpaid/${item.id}/contracts/${action.contract._id}`, { method: 'PATCH', body: JSON.stringify(action.values) })
      } else if (action.type === 'transfer') {
        saved = await api(`/postpaid/${item.id}`, { method: 'PATCH', body: JSON.stringify({ accountableTo: action.values.accountableTo, status: 'Transferred', data: { ...item.data, department: action.values.department }, historyAction: 'Accountability transferred', historyDetails: action.values }) })
      } else {
        saved = await api(`/postpaid/${item.id}`, { method: 'PATCH', body: JSON.stringify({ data: { ...item.data, handsetBrand: action.values.handsetBrand, handsetModel: action.values.handsetModel, handsetSerialNumber: action.values.handsetSerialNumber, imei: action.values.imei }, historyAction: 'Handset replaced', historyDetails: action.values }) })
      }
      setItems((current) => current.map((entry) => entry.id === saved.id ? saved : entry)); setSelected(saved); setPostpaidAction(null)
    } catch (actionError) { setError(actionError.message) }
    finally { setLoading(false) }
  }

  async function deletePostpaidContract(item, contract) {
    if (!window.confirm(`Delete contract history ${contract.contractNumber}? This action cannot be undone.`)) return
    setLoading(true); setError('')
    try {
      const saved = await api(`/postpaid/${item.id}/contracts/${contract._id}`, { method: 'DELETE' })
      setItems((current) => current.map((entry) => entry.id === saved.id ? saved : entry)); setSelected(saved)
    } catch (deleteError) { setError(deleteError.message) }
    finally { setLoading(false) }
  }

  return (
    <main className='inventory-app'>
      <aside className='inventory-sidebar'>
        <div className='inventory-brand'><span>JH</span><div><strong>Januarius Holdings</strong><small>Inventory Management</small></div></div>
        <nav aria-label='Inventory navigation'>
          {NAV_ITEMS.filter(([key]) => key !== 'audit' || isAdmin).map(([key, label]) => (
            <button key={key} className={page === key ? 'active' : ''} onClick={() => { setPage(key); setQuery(''); setStatus('All') }}>{label}</button>
          ))}
        </nav>
        <div className='inventory-sidebar-actions'>
          <button onClick={onOpenProcurement}>Open Procurement</button>
          <button onClick={onLogout}>Logout</button>
        </div>
      </aside>

      <section className='inventory-main'>
        <header className='inventory-header'>
          <div><p className='eyebrow'>Inventory workspace</p><h1>{page === 'dashboard' ? 'Dashboard' : page === 'reports' ? 'Reports' : page === 'audit' ? 'Audit Logs' : config?.label}</h1></div>
          <div className='inventory-user'><span>{session.user.name}</span><small>{isSuperAdmin ? 'Super Admin' : isAdmin ? 'Administrator' : 'Viewer'}</small></div>
        </header>
        {error ? <p className='inventory-error'>{error}</p> : null}
        {page === 'equipment' ? <button className='inventory-secondary' onClick={() => setShowScanner(true)}>Scan Equipment QR Code</button> : null}
        {showScanner ? <EquipmentScanner onScan={openEquipmentId} onClose={() => setShowScanner(false)} /> : null}
        {loading ? <div className='inventory-loading'>Loading inventory data...</div> : null}

        {page === 'dashboard' ? <InventoryDashboard dashboard={dashboard} onNavigate={setPage} /> : null}
        {page === 'reports' ? <InventoryReports api={api} /> : null}
        {page === 'audit' ? <AuditTable items={items} /> : null}
        {config ? (
          <section className='inventory-directory'>
            <div className='inventory-toolbar'>
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={`Search ${config.label.toLowerCase()}`} />
              <select value={status} onChange={(e) => setStatus(e.target.value)}><option>All</option>{config.statuses.map((option) => <option key={option}>{option}</option>)}</select>
              <details className='inventory-toolbar-menu'>
                <summary aria-label='Open export and print menu' title='Export and print'>
                  <span aria-hidden='true'></span>
                  <span aria-hidden='true'></span>
                  <span aria-hidden='true'></span>
                </summary>
              <div className='inventory-toolbar-menu-popover'>
                  <button type='button' onClick={(event) => { exportCsv(); closeToolbarMenu(event) }}>Export CSV</button>
                  <button type='button' onClick={(event) => { exportExcel(); closeToolbarMenu(event) }}>Export Excel</button>
                  <button type='button' onClick={(event) => { window.print(); closeToolbarMenu(event) }}>Print</button>
                  {canEdit ? <button type='button' className='inventory-menu-archive' onClick={openArchivedRecords}>Archived Records</button> : null}
                  {page === 'equipment' && canEdit ? <button type='button' onClick={(event) => { setShowEquipmentImport(true); closeToolbarMenu(event) }}>Import Excel</button> : null}
                </div>
              </details>
              {canEdit ? <button className='inventory-primary' onClick={openCreate}>New {config.singular}</button> : null}
            </div>
            <div className='inventory-table-wrap'>
              {page === 'companies' ? <CompanyTable items={filtered} canEdit={canEdit} onView={setSelected} onEdit={openEdit} /> : page === 'equipment' ? <EquipmentTable items={filtered} canEdit={canEdit} onView={setSelected} onEdit={openEdit} /> : page === 'isp' ? <IspTable items={filtered} onView={setSelected} /> : page === 'postpaid' ? <PostpaidTable items={filtered} canEdit={canEdit} onView={setSelected} onEdit={openEdit} /> : <table><thead><tr><th>Code</th><th>Name</th><th>Status</th><th>Company</th><th>Accountable to</th><th>Renewal / Warranty</th><th>Actions</th></tr></thead><tbody>{filtered.map((item) => <tr key={item.id}><td><strong>{item.recordCode}</strong></td><td>{item.name}</td><td><span className={`inventory-status ${renewalTone(item.renewalDate)}`}>{item.status}</span></td><td>{item.company || '-'}</td><td>{item.accountableTo || '-'}</td><td><RenewalBadge value={item.renewalDate} /></td><td><button className='inventory-link' onClick={() => setSelected(item)}>View</button>{canEdit ? <button className='inventory-link' onClick={() => openEdit(item)}>Edit</button> : null}</td></tr>)}</tbody></table>}
              {!filtered.length && !loading ? <p className='inventory-empty'>No records match the current search and filter.</p> : null}
            </div>
          </section>
        ) : null}
      </section>

      {showForm && page === 'companies' ? <CompanyForm form={form} setForm={setForm} onSubmit={save} onClose={() => setShowForm(false)} editing={editing} busy={loading} error={error} /> : showForm && page === 'equipment' ? <EquipmentForm companies={companies} form={form} setForm={setForm} onSubmit={save} onClose={() => setShowForm(false)} editing={editing} busy={loading} error={error} /> : showForm ? <InventoryForm companies={companies} config={config} form={form} setForm={setForm} onSubmit={save} onClose={() => setShowForm(false)} editing={editing} /> : null}
      {selected && page === 'equipment' ? <EquipmentDetails item={selected} canEdit={canEdit} onClose={() => setSelected(null)} onEdit={() => { openEdit(selected); setSelected(null) }} onArchive={() => archive(selected)} onMovement={recordEquipmentMovement} /> : selected ? <InventoryDetails onEdit={() => { openEdit(selected); setSelected(null) }} item={selected} config={config} canEdit={canEdit} onClose={() => setSelected(null)} onArchive={() => archive(selected)} onPostpaidAction={(type, contract = null) => setPostpaidAction({ type, item: selected, contract })} onDeleteContract={(contract) => deletePostpaidContract(selected, contract)} /> : null}
      {postpaidAction ? <PostpaidActionModal action={postpaidAction} onClose={() => setPostpaidAction(null)} onSubmit={completePostpaidAction} /> : null}
      {showArchived ? <ArchivedRecordsModal records={archivedRecords} onClose={() => setShowArchived(false)} onUnarchive={unarchiveRecord} /> : null}
      {showEquipmentImport ? <EquipmentImport api={api} onClose={() => setShowEquipmentImport(false)} onImported={(newItems) => setItems((current) => [...newItems, ...current])} /> : null}
    </main>
  )
}

function ArchivedRecordsModal({ records, onClose, onUnarchive }) {
  return <div className='inventory-modal-backdrop'><section className='inventory-modal inventory-archived-modal'><div className='inventory-modal-head'><div><p className='eyebrow'>Inventory archive</p><h2>Archived Records</h2><p>{records.length} archived {records.length === 1 ? 'record' : 'records'}</p></div><button onClick={onClose}>Close</button></div><div className='inventory-table-wrap'><table><thead><tr><th>Type</th><th>Code</th><th>Name</th><th>Status</th><th>Company</th><th>Last updated</th><th>Action</th></tr></thead><tbody>{records.map((record) => <tr key={`${record.moduleKey}-${record.id}`}><td>{record.moduleLabel}</td><td><strong>{record.recordCode}</strong></td><td>{record.name}</td><td>{record.status}</td><td>{record.company || '-'}</td><td>{formatDate(record.updatedAt)}</td><td><button className='inventory-primary inventory-unarchive-button' onClick={() => onUnarchive(record)}>Unarchive</button></td></tr>)}</tbody></table>{!records.length ? <p className='inventory-empty'>There are no archived inventory records.</p> : null}</div></section></div>
}

function InventoryDashboard({ dashboard, onNavigate }) {
  const cards = [['Active postpaid lines', dashboard.totals.activePostpaid, 'postpaid'], ['Plans due for renewal', dashboard.totals.postpaidRenewals, 'postpaid'], ['Active ISP accounts', dashboard.totals.activeIsp, 'isp'], ['Office equipment', dashboard.totals.equipment, 'equipment'], ['Currently issued', dashboard.totals.issued, 'equipment'], ['Available equipment', dashboard.totals.available, 'equipment'], ['Under repair', dashboard.totals.underRepair, 'equipment'], ['Retired / disposed', dashboard.totals.retired, 'equipment']]
  return <><div className='inventory-stats'>{cards.map(([label, value, target]) => <button key={label} onClick={() => onNavigate(target)}><span>{label}</span><strong>{String(value || 0).padStart(2, '0')}</strong></button>)}</div><section className='inventory-alerts'><div><p className='eyebrow'>Attention needed</p><h2>Renewal alerts</h2></div>{dashboard.alerts?.length ? dashboard.alerts.map((item) => <div className='inventory-alert' key={item.id}><strong>{item.recordCode} · {item.name}</strong><RenewalBadge value={item.renewalDate} /></div>) : <p className='inventory-empty'>No contracts are due within the next 90 days.</p>}</section></>
}

function InventoryForm({ config, form, setForm, onSubmit, onClose, editing, companies }) {
  if (config === MODULES.isp) {
    return <IspForm {...{ config, form, setForm, onSubmit, onClose, editing, companies }} />
  }
  if (config.label === 'Postpaid Plans') {
    return <PostpaidLineForm companies={companies} form={form} setForm={setForm} onSubmit={onSubmit} onClose={onClose} editing={editing} config={config} />
  }

  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }))
  const setData = (key, value) => setForm((current) => {
    const data = { ...current.data, [key]: value }
    return { ...current, data, ...(['contractStartDate', 'contractEndDate'].includes(key) ? { renewalDate: calculateRenewalDate(data.contractStartDate, data.contractEndDate) } : {}) }
  })
  return <div className='inventory-modal-backdrop'><form className='inventory-modal' onSubmit={onSubmit}><div className='inventory-modal-head'><div><p className='eyebrow'>{editing ? 'Edit record' : 'New record'}</p><h2>{config.singular}</h2></div><button type='button' onClick={onClose}>Close</button></div><div className='inventory-form-grid'><label>Record code *<input required value={form.recordCode} onChange={(e) => set('recordCode', e.target.value)} /></label><label>Name *<input required value={form.name} onChange={(e) => set('name', e.target.value)} /></label><label>Status *<select value={form.status} onChange={(e) => set('status', e.target.value)}>{config.statuses.map((option) => <option key={option}>{option}</option>)}</select></label><label>Company Name<CompanySelect companies={companies} value={form.company} onChange={(value) => set('company', value)} /></label><label>Person accountable<input value={form.accountableTo} onChange={(e) => set('accountableTo', e.target.value)} /></label><label>Renewal / warranty date<input type='date' value={form.renewalDate} onChange={(e) => set('renewalDate', e.target.value)} /></label><label>Inventory value<input type='number' min='0' value={form.value} onChange={(e) => set('value', e.target.value)} /></label>{config.fields.map(([key, label, type = 'text']) => <label key={key}>{label}<input type={type} min={type === 'number' ? '0' : undefined} value={form.data?.[key] || ''} onChange={(e) => setData(key, e.target.value)} /></label>)}</div><div className='inventory-form-actions'><button type='button' className='inventory-secondary' onClick={onClose}>Cancel</button><button className='inventory-primary'>Save record</button></div></form></div>
}

function PostpaidLineForm({ form, setForm, onSubmit, onClose, editing, config, companies }) {
  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }))
  const setData = (key, value) => setForm((current) => {
    const data = { ...current.data, [key]: value }
    return { ...current, data, ...(['contractStartDate', 'contractEndDate'].includes(key) ? { renewalDate: calculateRenewalDate(data.contractStartDate, data.contractEndDate) } : {}) }
  })
  const fields = [
    ['provider', 'Provider', 'text', true],
    ['accountNumber', 'Account Number', 'text', true],
    ['mobileNumber', 'Mobile Number', 'tel', true],
    ['planName', 'Plan Name', 'text', true],
    ['monthlyAmount', 'Monthly Plan Amount', 'number', true],
    ['department', 'Department', 'text', true],
    ['cashoutAmount', 'Cashout Amount', 'number'],
    ['handsetBrand', 'Handset Brand'],
    ['handsetModel', 'Handset Model'],
    ['handsetSerialNumber', 'Handset Serial Number'],
    ['imei', 'IMEI Number'],
    ['contractStartDate', 'Contract Start Date', 'date'],
    ['contractEndDate', 'Contract End Date', 'date'],
  ]

  return <div className='inventory-modal-backdrop'><form className='inventory-modal inventory-postpaid-form' onSubmit={onSubmit}><div className='inventory-modal-head'><div><p className='eyebrow'>{editing ? 'Edit postpaid line' : 'New postpaid line'}</p><h2>Postpaid Line</h2></div><button type='button' onClick={onClose}>Close</button></div><div className='inventory-form-grid'>{fields.slice(0, 5).map(([key, label, type = 'text', required]) => <label key={key}>{label}{required ? ' *' : ''}<input required={required} type={type} min={type === 'number' ? '0' : undefined} value={form.data?.[key] || ''} onChange={(event) => setData(key, event.target.value)} /></label>)}<label>Company Name<CompanySelect companies={companies} value={form.company} onChange={(value) => set('company', value)} /></label><label>Employee or Person Accountable *<input required value={form.accountableTo} onChange={(event) => set('accountableTo', event.target.value)} /></label>{fields.slice(5).map(([key, label, type = 'text', required]) => <label key={key}>{label}{required ? ' *' : ''}<input required={required} type={type} min={type === 'number' ? '0' : undefined} value={form.data?.[key] || ''} onChange={(event) => setData(key, event.target.value)} /></label>)}<label>Next Renewal Date<input type='date' value={form.renewalDate} onChange={(event) => set('renewalDate', event.target.value)} /><small>Defaults to contract end date, or start date + 2 years. You may correct it manually. Changing contract dates recalculates it.</small><RenewalBadge value={form.renewalDate} /></label><label>Other Details<textarea rows='3' value={form.data?.otherDetails || ''} onChange={(event) => setData('otherDetails', event.target.value)} /></label><label>Status *<select required value={form.status} onChange={(event) => set('status', event.target.value)}>{config.statuses.map((option) => <option key={option}>{option}</option>)}</select></label><label className='inventory-form-wide'>Remarks<textarea rows='3' value={form.data?.remarks || ''} onChange={(event) => setData('remarks', event.target.value)} /></label></div><div className='inventory-form-actions'><button type='button' className='inventory-secondary' onClick={onClose}>Cancel</button><button className='inventory-primary'>Save Postpaid Line</button></div></form></div>
}

function formatCurrency(value) {
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(Number(value || 0))
}

function PostpaidTable({ items, canEdit, onView, onEdit }) {
  return <table className='inventory-postpaid-table'><thead><tr><th>Provider</th><th>Account Number</th><th>Mobile Number</th><th>Plan Name</th><th>Monthly Plan Amount</th><th>Employee or Person Accountable</th><th>Department</th><th>Cashout Amount</th><th>Handset Brand</th><th>Handset Model</th><th>Handset Serial Number</th><th>IMEI Number</th><th>Other Details</th><th>Status</th><th>Remarks</th><th>Next Renewal Date</th><th>Actions</th></tr></thead><tbody>{items.map((item) => <tr key={item.id}><td>{item.data?.provider || '-'}</td><td>{item.data?.accountNumber || '-'}</td><td>{item.data?.mobileNumber || '-'}</td><td>{item.data?.planName || '-'}</td><td>{formatCurrency(item.data?.monthlyAmount)}</td><td>{item.accountableTo || '-'}</td><td>{item.data?.department || '-'}</td><td>{formatCurrency(item.data?.cashoutAmount)}</td><td>{item.data?.handsetBrand || '-'}</td><td>{item.data?.handsetModel || '-'}</td><td>{item.data?.handsetSerialNumber || '-'}</td><td>{item.data?.imei || '-'}</td><td>{item.data?.otherDetails || '-'}</td><td><span className={`inventory-status ${renewalTone(item.renewalDate)}`}>{item.status}</span></td><td>{item.data?.remarks || '-'}</td><td><RenewalBadge value={item.renewalDate} /></td><td><button className='inventory-link' onClick={() => onView(item)}>View</button>{canEdit ? <button className='inventory-link' onClick={() => onEdit(item)}>Edit</button> : null}</td></tr>)}</tbody></table>
}

function InventoryDetails({ item, config, canEdit, onEdit, onClose, onArchive, onPostpaidAction, onDeleteContract }) {
  const isPostpaid = config.label === 'Postpaid Plans'
  return <div className='inventory-modal-backdrop'><section className='inventory-modal'><div className='inventory-modal-head'><div><p className='eyebrow'>{config.singular}</p><h2>{item.recordCode}</h2></div><button onClick={onClose}>Close</button></div><div className='inventory-detail-grid'>{config !== MODULES.isp && config !== MODULES.companies ? <div><span>Next Renewal Date</span><RenewalBadge value={item.renewalDate} /></div> : null}{config === MODULES.isp ? ISP_FIELDS.map((field) => <div key={field[0]}><span>{field[1]}</span><strong>{field[2] === 'date' ? formatDate(ispValue(item, field)) : field[2] === 'number' ? formatCurrency(ispValue(item, field)) : ispValue(item, field) || 'Not set'}</strong></div>) : <><div><span>Name</span><strong>{item.name}</strong></div><div><span>Status</span><strong>{item.status}</strong></div><div><span>Company</span><strong>{item.company || 'Not set'}</strong></div><div><span>Accountable to</span><strong>{item.accountableTo || 'Not set'}</strong></div>{Object.entries(item.data || {}).map(([key, value]) => <div key={key}><span>{key.replace(/([A-Z])/g, ' $1')}</span><strong>{value || 'Not set'}</strong></div>)}</>}</div>{isPostpaid ? <><div className='inventory-section-heading'><div><h3>Contract History</h3><p>The latest entry is automatically marked as the current contract.</p></div>{canEdit ? <div><button className='inventory-primary' onClick={() => onPostpaidAction('renewal')}>Add renewal</button><button className='inventory-secondary' onClick={() => onPostpaidAction('transfer')}>Transfer accountability</button><button className='inventory-secondary' onClick={() => onPostpaidAction('handset')}>Replace handset</button></div> : null}</div><ContractHistory entries={item.contractHistory || []} canEdit={canEdit} onEdit={(contract) => onPostpaidAction('contract-edit', contract)} onDelete={onDeleteContract} /></> : null}<h3>Activity history</h3><div className='inventory-history'>{item.history?.map((entry) => <div key={entry._id || entry.recordedAt}><strong>{entry.action}</strong><span>{formatDate(entry.recordedAt)} · {entry.recordedBy}</span></div>)}</div><div className='inventory-form-actions'><button className='inventory-secondary' onClick={() => window.print()}>Print / Save PDF</button>{canEdit && [MODULES.isp, MODULES.companies].includes(config) ? <button className='inventory-primary' onClick={onEdit}>Edit {config.singular}</button> : null}{canEdit ? <button className='inventory-danger' onClick={onArchive}>Archive record</button> : null}</div></section></div>
}

function ContractHistory({ entries, canEdit, onEdit, onDelete }) {
  function buildHistoryRows() {
    const headers = ['Contract', 'Start Date', 'End Date', 'Renewal Date', 'Plan', 'Monthly Amount', 'Cashout', 'Handset', 'Serial', 'IMEI', 'Remarks', 'Created', 'Created By', 'Current']
    const rows = entries.map((entry) => [entry.contractNumber, entry.contractStartDate, entry.contractEndDate, entry.renewalDate, entry.planName, entry.monthlyPlanAmount, entry.cashoutAmount, entry.handsetIssued, entry.handsetSerialNumber, entry.imeiNumber, entry.remarks, entry.createdAt, entry.createdBy, entry.isCurrent ? 'Yes' : 'No'])
    return [headers, ...rows]
  }
  function exportHistory() {
    const rows = buildHistoryRows()
    const csv = rows.map((row) => row.map((cell) => `"${String(cell || '').replaceAll('"', '""')}"`).join(',')).join('\n')
    const link = document.createElement('a'); link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); link.download = 'postpaid-contract-history.csv'; link.click(); URL.revokeObjectURL(link.href)
  }
  function exportHistoryExcel() {
    const html = `<table>${buildHistoryRows().map((row, index) => `<tr>${row.map((cell) => `<${index ? 'td' : 'th'}>${String(cell || '')}</${index ? 'td' : 'th'}>`).join('')}</tr>`).join('')}</table>`
    const link = document.createElement('a'); link.href = URL.createObjectURL(new Blob([html], { type: 'application/vnd.ms-excel' })); link.download = 'postpaid-contract-history.xls'; link.click(); URL.revokeObjectURL(link.href)
  }
  if (!entries.length) return <p className='inventory-empty'>No contract history recorded yet.</p>
  return <div className='inventory-contract-wrap'><div><button className='inventory-link' onClick={exportHistory}>Export CSV</button><button className='inventory-link' onClick={exportHistoryExcel}>Export Excel</button><button className='inventory-link' onClick={() => window.print()}>Print / PDF</button></div><table><thead><tr><th>Contract</th><th>Period</th><th>Renewal</th><th>Plan</th><th>Handset / IMEI</th><th>Created</th>{canEdit ? <th>Actions</th> : null}</tr></thead><tbody>{[...entries].reverse().map((entry) => <tr key={entry._id || entry.contractNumber}><td><strong>{entry.contractNumber}</strong>{entry.isCurrent ? <span className='inventory-current-contract'>Current Contract</span> : null}</td><td>{formatDate(entry.contractStartDate)} to {formatDate(entry.contractEndDate)}</td><td><RenewalBadge value={entry.renewalDate} /></td><td>{entry.planName}<small>₱{Number(entry.monthlyPlanAmount || 0).toLocaleString('en-PH')}</small></td><td>{entry.handsetIssued || '-'}<small>{entry.handsetSerialNumber || '-'} · {entry.imeiNumber || '-'}</small></td><td>{formatDate(entry.createdAt)}<small>{entry.createdBy}</small></td>{canEdit ? <td><button className='inventory-link' onClick={() => onEdit(entry)}>Edit</button><button className='inventory-link inventory-link-danger' onClick={() => onDelete(entry)}>Delete</button></td> : null}</tr>)}</tbody></table></div>
}

function getNextContractNumber(item) {
  const generatedSequences = (item.contractHistory || [])
    .map((entry) => String(entry.contractNumber || '').match(/^Contract\s+(\d+)$/i))
    .filter(Boolean)
    .map((match) => Number(match[1]))
  const inferredSequence = Math.max(item.contractHistory?.length || 0, ...generatedSequences, 0) + 1
  const sequence = Math.max(Number(item.nextContractSequence || 1), inferredSequence)
  return `Contract ${String(sequence).padStart(3, '0')}`
}

function PostpaidActionModal({ action, onClose, onSubmit }) {
  const isRenewal = ['renewal', 'contract-edit'].includes(action.type)
  const contract = action.contract
  const [values, setValues] = useState(isRenewal ? { contractNumber: contract?.contractNumber || getNextContractNumber(action.item), contractStartDate: contract?.contractStartDate?.slice(0, 10) || '', contractEndDate: contract?.contractEndDate?.slice(0, 10) || '', renewalDate: contract?.renewalDate?.slice(0, 10) || '', planName: contract?.planName || action.item.data?.planName || '', monthlyAmount: contract?.monthlyPlanAmount ?? action.item.data?.monthlyAmount ?? '', cashoutAmount: contract?.cashoutAmount ?? action.item.data?.cashoutAmount ?? '', handsetBrand: contract?.handsetIssued?.split(' ')?.[0] || action.item.data?.handsetBrand || '', handsetModel: contract?.handsetIssued?.split(' ')?.slice(1).join(' ') || action.item.data?.handsetModel || '', handsetSerialNumber: contract?.handsetSerialNumber || action.item.data?.handsetSerialNumber || '', imei: contract?.imeiNumber || action.item.data?.imei || '', remarks: contract?.remarks || '' } : action.type === 'transfer' ? { accountableTo: '', department: '' } : { handsetBrand: '', handsetModel: '', handsetSerialNumber: '', imei: '' })
  const set = (key, value) => setValues((current) => {
    const next = { ...current, [key]: value }
    if (['contractStartDate', 'contractEndDate'].includes(key)) next.renewalDate = calculateRenewalDate(next.contractStartDate, next.contractEndDate)
    return next
  })
  const fields = isRenewal ? [['contractNumber', 'Contract Number / Sequence'], ['contractStartDate', 'Contract Start Date', 'date'], ['contractEndDate', 'Contract End Date', 'date'], ['renewalDate', 'Next Renewal Date (editable)', 'date'], ['planName', 'Plan Name'], ['monthlyAmount', 'Monthly Plan Amount', 'number'], ['cashoutAmount', 'Cashout Amount', 'number'], ['handsetBrand', 'Handset Brand'], ['handsetModel', 'Handset Model'], ['handsetSerialNumber', 'Handset Serial Number'], ['imei', 'IMEI Number'], ['remarks', 'Remarks']] : action.type === 'transfer' ? [['accountableTo', 'New Person Accountable'], ['department', 'Department']] : [['handsetBrand', 'Handset Brand'], ['handsetModel', 'Handset Model'], ['handsetSerialNumber', 'Handset Serial Number'], ['imei', 'IMEI Number']]
  return <div className='inventory-modal-backdrop'><form className='inventory-modal inventory-action-modal' onSubmit={(event) => { event.preventDefault(); onSubmit({ ...action, values }) }}><div className='inventory-modal-head'><div><p className='eyebrow'>Postpaid action</p><h2>{action.type === 'contract-edit' ? 'Edit contract history' : isRenewal ? 'Add contract renewal' : action.type === 'transfer' ? 'Transfer accountability' : 'Record handset replacement'}</h2></div><button type='button' onClick={onClose}>Close</button></div><div className='inventory-form-grid'>{fields.map(([key, label, type = 'text']) => <label key={key}>{label}{isRenewal && ['contractNumber', 'contractStartDate'].includes(key) ? ' *' : ''}<input required={isRenewal && ['contractNumber', 'contractStartDate'].includes(key)} readOnly={key === 'contractNumber'} type={type} min={type === 'number' ? 0 : undefined} value={key === 'renewalDate' ? calculateRenewalDate(values.contractStartDate, values.contractEndDate, values.renewalDate) : values[key]} onChange={(e) => set(key, e.target.value)} /></label>)}</div><div className='inventory-form-actions'><button type='button' className='inventory-secondary' onClick={onClose}>Cancel</button><button className='inventory-primary'>{action.type === 'contract-edit' ? 'Save changes' : 'Save action'}</button></div></form></div>
}

function AuditTable({ items }) { return <div className='inventory-table-wrap'><table><thead><tr><th>Date</th><th>User</th><th>Action</th><th>Module</th><th>Record</th><th>IP address</th></tr></thead><tbody>{items.map((item) => <tr key={item.id}><td>{formatDate(item.createdAt)}</td><td>{item.userName}<small>{item.userEmail}</small></td><td>{item.action}</td><td>{item.module}</td><td>{item.recordCode}</td><td>{item.ipAddress || '-'}</td></tr>)}</tbody></table></div> }

function InventoryReports() { return <section className='inventory-reports'><p className='eyebrow'>Report center</p><h2>Inventory reports</h2><p>Use the module filters to prepare current reports, then export them to CSV or print them to PDF using your browser's print dialog.</p><div className='inventory-report-list'>{['Postpaid accounts by company and employee', 'Plans due for renewal', 'Internet accounts by provider and location', 'Equipment by company and category', 'Equipment issued per employee', 'Available and under-repair equipment', 'Inventory value by company', 'Complete accountability history'].map((name) => <div key={name}>{name}</div>)}</div></section> }

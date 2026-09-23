import { useState } from 'react'
import { EquipmentDocuments } from './EquipmentQr.jsx'
import { CompanySelect } from './CompanyDirectory.jsx'

const ACTION_LABELS = { issue: 'Issue Equipment', transfer: 'Transfer Equipment', return: 'Return Equipment', 'repair-out': 'Send for Repair', 'repair-in': 'Return from Repair', lost: 'Mark as Lost', retire: 'Retire Equipment', dispose: 'Dispose of Equipment' }

export function EquipmentTable({ items, canEdit, onView, onEdit }) {
  return <table>
    <thead><tr><th>Code</th><th>Type</th><th>Item</th><th>Issued To</th><th>Location</th><th>Action</th></tr></thead>
    <tbody>{items.map((item) => <tr key={item.id}>
      <td><strong>{item.recordCode}</strong></td>
      <td>{item.data?.category || '-'}</td>
      <td>{item.name || '-'}</td>
      <td>{item.accountableTo || '-'}</td>
      <td>{item.data?.location || '-'}</td>
      <td><button className='inventory-link' onClick={() => onView(item)}>View</button>{canEdit ? <button className='inventory-link' onClick={() => onEdit(item)}>Edit</button> : null}</td>
    </tr>)}</tbody>
  </table>
}

export const EQUIPMENT_CATEGORIES = ['Laptop', 'MacBook', 'Desktop Computer', 'iPad', 'Tablet', 'Mobile Phone', 'Monitor', 'Printer', 'Projector', 'Router', 'Network Device', 'UPS', 'External Drive', 'Other Equipment']
export const EQUIPMENT_CONDITIONS = ['Brand New', 'Good', 'Fair', 'Damaged', 'Defective', 'For Repair', 'Beyond Repair']
export const EQUIPMENT_STATUSES = ['Available', 'Issued', 'In Storage', 'Borrowed', 'Under Repair', 'For Replacement', 'Returned', 'Lost', 'Retired', 'Disposed']
export const EQUIPMENT_FIELDS = [
  ['recordCode', 'Asset Tag or Inventory Number', 'text', true],
  ['company', 'Company Name', 'text', true],
  ['category', 'Equipment Category or Device Type', 'category'],
  ['name', 'Item or Equipment Name', 'text', true],
  ['brand', 'Brand'], ['model', 'Model'], ['description', 'Description', 'textarea'],
  ['serialNumber', 'Serial Number'], ['purchaseDate', 'Purchase Date', 'date'],
  ['purchasePrice', 'Purchase Price', 'number'], ['supplier', 'Supplier'], ['poNumber', 'Purchase Order Number'],
  ['invoiceNumber', 'Official Receipt or Invoice Number'], ['warrantyExpirationDate', 'Warranty Expiration Date', 'date'],
  ['issueDate', 'Issue Date', 'date'], ['accountableTo', 'Issued To', 'text', true],
  ['department', 'Employee Department'], ['location', 'Office or Location'],
  ['status', 'Status', 'status', true], ['condition', 'Condition', 'condition'], ['remarks', 'Remarks', 'textarea'],
]
const choices = { category: EQUIPMENT_CATEGORIES, condition: EQUIPMENT_CONDITIONS, status: EQUIPMENT_STATUSES }
export const equipmentValue = (item, [key, , , root]) => (root ? item[key] : item.data?.[key]) ?? ''

function Field({ label, type = 'text', value, onChange, disabled, required, companies }) {
  if (type === 'company') return <label>{label}<CompanySelect value={value} onChange={onChange} companies={companies} /></label>
  const options = choices[type]
  return <label>{label}{required ? ' *' : ''}{options ? <select required={required} disabled={disabled} value={value} onChange={(event) => onChange(event.target.value)}><option value=''>Select…</option>{value && !options.includes(value) ? <option>{value}</option> : null}{options.map((option) => <option key={option}>{option}</option>)}</select> : type === 'textarea' ? <textarea rows='3' value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)} /> : <input type={type} required={required} disabled={disabled} min={type === 'number' ? '0' : undefined} step={type === 'number' ? '0.01' : undefined} value={type === 'date' ? String(value).slice(0, 10) : value} onChange={(event) => onChange(event.target.value)} />}</label>
}

export function EquipmentForm({ form, setForm, onSubmit, onClose, editing, busy, error, companies }) {
  const setField = ([key, , , root], value) => setForm((current) => root ? { ...current, [key]: value, ...(key === 'accountableTo' && !editing ? { status: value.trim() ? 'Issued' : 'Available' } : {}) } : { ...current, data: { ...current.data, [key]: value } })
  return <div className='inventory-modal-backdrop'><form className='inventory-modal' onSubmit={onSubmit}>
    <div className='inventory-modal-head'><h2>{editing ? 'Edit Equipment' : 'New Equipment'}</h2><button type='button' disabled={busy} onClick={onClose}>Close</button></div>
    {error ? <p role='alert' className='inventory-error'>{error}</p> : null}
    {editing ? <p>Use the movement actions in equipment details to change status or accountability.</p> : null}
    <fieldset disabled={busy} className='equipment-fieldset'><div className='inventory-form-grid'>{EQUIPMENT_FIELDS.map((field) => <Field key={field[0]} label={field[1]} type={field[0] === 'company' ? 'company' : field[2]} companies={companies} value={equipmentValue(form, field)} required={['recordCode', 'name', 'category', 'condition', 'status'].includes(field[0])} disabled={!!editing && ['status', 'accountableTo', 'department', 'issueDate'].includes(field[0])} onChange={(value) => setField(field, value)} />)}</div>
    {!editing && form.accountableTo ? <><h3>Initial accountability</h3><div className='inventory-form-grid'>{[['issuedBy', 'Issued By'], ['receivedBy', 'Received By'], ['transferDetails', 'Transfer Details'], ['remarks', 'Accountability Remarks']].map(([key, label]) => <Field key={key} label={label} required={['issuedBy', 'receivedBy'].includes(key)} value={form.initialAccountability?.[key] || ''} onChange={(value) => setForm((current) => ({ ...current, initialAccountability: { ...current.initialAccountability, [key]: value } }))} />)}</div></> : null}
    <div className='inventory-form-grid'>{[['photo', 'Attachment or Photo'], ['document', 'Supporting Document Attachment']].map(([kind, label]) => <label key={kind}>{label}<input type='file' multiple accept='.jpg,.jpeg,.png,.webp,.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt' onChange={(event) => setForm((current) => ({ ...current, pendingFiles: { ...current.pendingFiles, [kind]: Array.from(event.target.files) } }))} /><small>Up to 10 MB per file. Files upload after the equipment is saved.</small></label>)}</div>
    <AttachmentList item={form} />
    <div className='inventory-form-actions'><button type='button' onClick={onClose}>Cancel</button><button className='inventory-primary'>{busy ? 'Saving…' : 'Save Equipment'}</button></div></fieldset>
  </form></div>
}

function AttachmentList({ item }) {
  return <div className='inventory-detail-grid'>{(item.attachments || []).map((attachment) => <div key={attachment._id}><span>{attachment.kind === 'photo' ? 'Attachment or Photo' : 'Supporting Document Attachment'}</span><a href={attachment.url} target='_blank' rel='noreferrer'>{attachment.name}</a></div>)}</div>
}

const historyFields = [
  ['employeeName', 'Employee Name'], ['department', 'Department'], ['issueDate', 'Issue Date'], ['returnDate', 'Return Date'],
  ['conditionUponIssue', 'Equipment Condition Upon Issue'], ['conditionUponReturn', 'Equipment Condition Upon Return'],
  ['issuedBy', 'Issued By'], ['receivedBy', 'Received By'], ['returnReceivedBy', 'Return Received By'],
  ['transferDetails', 'Transfer Details'], ['remarks', 'Remarks'], ['recordedAt', 'Date Recorded'], ['recordedBy', 'Recorded By'],
  ['returnTransferDetails', 'Return / Transfer Details'], ['returnRemarks', 'Return Remarks'], ['returnRecordedAt', 'Return Date Recorded'], ['returnRecordedBy', 'Return Recorded By'],
]

export function EquipmentDetails({ item, canEdit, onClose, onEdit, onArchive, onMovement }) {
  const [action, setAction] = useState('')
  const [values, setValues] = useState({})
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  function openAction(next) { setAction(next); setValues({ condition: item.data?.condition || '', conditionUponIssue: item.data?.condition || '', conditionUponReturn: item.data?.condition || '' }); setError('') }
  async function submit(event) {
    event.preventDefault(); setBusy(true); setError('')
    try { await onMovement({ ...values, action }); setAction('') } catch (failure) { setError(failure.message) } finally { setBusy(false) }
  }
  const assigned = !!item.accountableTo || item.accountabilityHistory?.some((entry) => !entry.returnDate)
  const lifecycle = !['issue', 'transfer', 'return'].includes(action)
  const availableActions = item.status === 'Disposed' ? [] : item.status === 'Retired' ? ['dispose'] : item.status === 'Under Repair' ? ['repair-in', 'lost'] : item.status === 'Lost' ? (assigned ? ['return'] : ['retire', 'dispose']) : [...(assigned ? ['transfer', 'return'] : ['issue', 'retire', 'dispose']), 'repair-out', 'lost']
  const movementFields = lifecycle ? [
    ['movementDate', 'Movement Date', 'date'], ['condition', 'Equipment Condition', 'condition'], ['handledBy', 'Handled By'],
    ...(action === 'repair-out' ? [['repairProvider', 'Repair Provider or Technician']] : []), ['remarks', 'Reason / Remarks', 'textarea'],
  ] : [
    ...(action !== 'issue' ? [['returnDate', 'Return Date', 'date'], ['conditionUponReturn', 'Equipment Condition Upon Return', 'condition'], ['returnReceivedBy', 'Return Received By']] : []),
    ...(action !== 'return' ? [['employeeName', 'Employee Name'], ['department', 'Department'], ['issueDate', 'Issue Date', 'date'], ['conditionUponIssue', 'Equipment Condition Upon Issue', 'condition'], ['issuedBy', 'Issued By'], ['receivedBy', 'Received By']] : []),
    ['transferDetails', 'Transfer Details', 'textarea'], ['remarks', 'Remarks', 'textarea'],
  ]
  return <div className='inventory-modal-backdrop'><section className='inventory-modal'>
    <div className='inventory-modal-head'><div><p className='eyebrow'>Office Equipment</p><h2>{item.recordCode} · {item.name}</h2></div><button disabled={busy} onClick={onClose}>Close</button></div>
    <div className='inventory-detail-grid'>{EQUIPMENT_FIELDS.map((field) => <div key={field[0]}><span>{field[1]}</span><strong>{String(equipmentValue(item, field)) || 'Not set'}</strong></div>)}</div>
    <h3>Attachments</h3><AttachmentList item={item} />{!item.attachments?.length ? <p>No attachments.</p> : null}
    <h3>Equipment Accountability History</h3>
    {canEdit && !item.archived ? <div className='inventory-form-actions'>{availableActions.map((type) => <button key={type} disabled={busy} className='inventory-primary' onClick={() => openAction(type)}>{ACTION_LABELS[type]}</button>)}</div> : null}
    {action ? <form onSubmit={submit}><h3>{ACTION_LABELS[action]}</h3>{error ? <p role='alert' className='inventory-error'>{error}</p> : null}<fieldset disabled={busy} className='equipment-fieldset'><div className='inventory-form-grid'>{movementFields.map(([key, label, type]) => <Field key={key} label={label} type={type} value={values[key] || ''} required={lifecycle || (key !== 'remarks' && (key !== 'transferDetails' || action === 'transfer'))} onChange={(value) => setValues((current) => ({ ...current, [key]: value }))} />)}</div><div className='inventory-form-actions'><button type='button' onClick={() => setAction('')}>Cancel</button><button className='inventory-primary'>{busy ? 'Saving…' : 'Record Movement'}</button></div></fieldset></form> : null}
    <div className='inventory-table-wrap'><table><thead><tr>{historyFields.map(([key, label]) => <th key={key}>{label}</th>)}</tr></thead><tbody>{[...(item.accountabilityHistory || [])].reverse().map((entry) => <tr key={entry._id}>{historyFields.map(([key]) => <td key={key}>{entry[key] ? key.endsWith('At') ? new Date(entry[key]).toLocaleString('en-PH', { timeZone: 'Asia/Manila' }) : entry[key] : '—'}</td>)}</tr>)}</tbody></table></div>
    {!item.accountabilityHistory?.length ? <p>{assigned ? 'Existing assignment shown above. It will be preserved in history when transferred or returned.' : 'No equipment issuances recorded yet.'}</p> : null}
    <h3>Movement History</h3><div className='inventory-history'>{[...(item.movementHistory || [])].reverse().map((entry) => <div key={entry._id}><strong>{ACTION_LABELS[entry.action] || entry.action} · {entry.movementDate}</strong><p>{entry.before?.status} → {entry.after?.status} · {entry.before?.employee || 'Unassigned'} → {entry.after?.employee || 'Unassigned'}</p><p>Condition: {entry.before?.condition || '—'} → {entry.after?.condition || '—'}</p><p>Department: {entry.before?.department || '—'} → {entry.after?.department || '—'} · Location: {entry.before?.location || '—'} → {entry.after?.location || '—'}</p><p>Handled by: {entry.handledBy || '—'} · Received by: {entry.receivedBy || '—'} · Repair provider: {entry.repairProvider || '—'}</p><p>{entry.transferDetails}</p><p>{entry.remarks}</p><span>{new Date(entry.recordedAt).toLocaleString('en-PH', { timeZone: 'Asia/Manila' })} · Recorded by {entry.recordedBy}</span></div>)}</div>
    {!item.movementHistory?.length ? <p>No movement actions recorded yet. Earlier records remain in accountability and activity history.</p> : null}
    <EquipmentDocuments item={item} />
    <h3>Activity history</h3><div className='inventory-history'>{item.history?.map((entry) => <div key={entry._id}><strong>{entry.action}</strong><span>{new Date(entry.recordedAt).toLocaleString('en-PH')} · {entry.recordedBy}</span><details><summary>View recorded details</summary><pre style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{JSON.stringify(entry.details, null, 2)}</pre></details></div>)}</div>
    <div className='inventory-form-actions'><button onClick={() => window.print()}>Print / Save PDF</button>{canEdit ? <><button disabled={busy} className='inventory-primary' onClick={onEdit}>Edit Equipment</button><button disabled={busy} className='inventory-danger' onClick={onArchive}>Archive</button></> : null}</div>
  </section></div>
}

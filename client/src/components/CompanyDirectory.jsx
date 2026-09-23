export function CompanySelect({ value, onChange, companies = [] }) {
  const active = companies.filter((company) => company.status === 'Active' && !company.archived)
  return <select value={value || ''} onChange={(event) => onChange(event.target.value)}>
    <option value=''>Select Company</option>
    {value && !active.some((company) => company.name === value) ? <option value={value}>{value} (existing record)</option> : null}
    {active.map((company) => <option key={company.id} value={company.name}>{company.name}</option>)}
  </select>
}

export function CompanyForm({ form, setForm, onSubmit, onClose, editing, busy, error }) {
  return <div className='inventory-modal-backdrop'><form className='inventory-modal' onSubmit={onSubmit}>
    <div className='inventory-modal-head'><h2>{editing ? 'Edit Company' : 'New Company'}</h2><button type='button' disabled={busy} onClick={onClose}>Close</button></div>
    {error ? <p role='alert' className='inventory-error'>{error}</p> : null}
    <fieldset disabled={busy} className='equipment-fieldset'><div className='inventory-form-grid'>
      <label>Company Name *<input required value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} /></label>
      <label>Status<select value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}><option>Active</option><option>Inactive</option></select></label>
      {[['address', 'Address'], ['contactNumber', 'Contact Number'], ['remarks', 'Remarks']].map(([key, label]) => <label key={key}>{label}<input value={form.data?.[key] || ''} onChange={(event) => setForm((current) => ({ ...current, data: { ...current.data, [key]: event.target.value } }))} /></label>)}
    </div><p>Only active companies appear as choices for new inventory assignments. Existing records retain their saved company name.</p><div className='inventory-form-actions'><button type='button' onClick={onClose}>Cancel</button><button className='inventory-primary'>Save Company</button></div></fieldset>
  </form></div>
}

export function CompanyTable({ items, canEdit, onView, onEdit }) {
  return <table><thead><tr><th>Company Name</th><th>Status</th><th>Contact Number</th><th>Action</th></tr></thead><tbody>{items.map((item) => <tr key={item.id}><td>{item.name}</td><td>{item.status}</td><td>{item.data?.contactNumber || '—'}</td><td><button className='inventory-link' onClick={() => onView(item)}>View</button>{canEdit ? <button className='inventory-link' onClick={() => onEdit(item)}>Edit</button> : null}</td></tr>)}</tbody></table>
}

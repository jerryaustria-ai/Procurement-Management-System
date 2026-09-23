import { useEffect, useState } from 'react'

const sections = [
  ['postpaid', 'My Postpaid Plans', [['provider', 'Provider'], ['accountNumber', 'Account Number'], ['mobileNumber', 'Mobile Number'], ['status', 'Status']]],
  ['isp', 'My Internet / ISP Plans', [['provider', 'Provider'], ['accountNumber', 'Account Number'], ['location', 'Installation Address'], ['status', 'Status']]],
  ['equipment', 'My Office Equipment', [['code', 'Code'], ['type', 'Type'], ['name', 'Item'], ['location', 'Location'], ['status', 'Status']]],
]

export default function MyInventorySummary({ apiBaseUrl, session, onLogout }) {
  const [summary, setSummary] = useState(null)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    setSummary(null); setError('')
    async function load() {
      try {
        const response = await fetch(`${apiBaseUrl}/inventory/my-summary`, { headers: { Authorization: `Bearer ${session.token}` }, signal: controller.signal })
        if (!response.ok) throw new Error('Unable to load your inventory summary. Please try again.')
        const data = await response.json()
        if (!controller.signal.aborted) setSummary(data)
      } catch (failure) {
        if (!controller.signal.aborted) setError(failure.message)
      }
    }
    void load()
    return () => controller.abort()
  }, [apiBaseUrl, session.token, attempt])

  return <main className='inventory-app' style={{ display: 'block' }}>
    <section className='inventory-main'>
      <header className='inventory-header'>
        <div><p className='eyebrow'>Inventory workspace</p><h1>My Inventory</h1><p>Items currently assigned to you.</p></div>
        <div className='inventory-user'><strong>{session.user.name}</strong><button className='inventory-secondary' onClick={onLogout}>Logout</button></div>
      </header>
      {error ? <div role='alert' className='inventory-error'>{error} <button onClick={() => setAttempt(attempt + 1)}>Retry</button></div> : !summary ? <p role='status'>Loading your inventory...</p> : <>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
          {sections.map(([key, title]) => <section className='inventory-directory' key={key}><h2>{title}</h2><strong>{summary[key].length}</strong></section>)}
        </div>
        {sections.map(([key, title, columns]) => <section className='inventory-directory' key={key}>
          <h2>{title}</h2>
          <div style={{ overflowX: 'auto' }}><table className='inventory-table'>
            <thead><tr>{columns.map(([field, label]) => <th key={field}>{label}</th>)}</tr></thead>
            <tbody>{summary[key].length ? summary[key].map((item) => <tr key={item.id}>{columns.map(([field]) => <td key={field}>{item[field] || '—'}</td>)}</tr>) : <tr><td colSpan={columns.length}>No items assigned to you.</td></tr>}</tbody>
          </table></div>
        </section>)}
      </>}
    </section>
  </main>
}

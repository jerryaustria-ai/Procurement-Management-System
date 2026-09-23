import { useEffect, useState } from 'react'

export default function ProcurementUserSelect({ directoryUrl, token, form, setForm }) {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [retry, setRetry] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    setLoading(true); setError('')
    async function load() {
      try {
        const response = await fetch(directoryUrl, { headers: { Authorization: `Bearer ${token}` }, signal: controller.signal })
        if (!response.ok) throw new Error('Unable to load Procurement users. Please retry.')
        const result = await response.json()
        if (controller.signal.aborted) return
        setUsers(result.items)
        setForm((current) => {
          const existing = result.items.find((user) => user.id === current.accountableUserId)
          const matches = result.items.filter((user) => user.name.trim().toLowerCase() === (current.accountableTo || '').trim().toLowerCase())
          const selected = existing || (!current.accountableUserId && matches.length === 1 ? matches[0] : null)
          return { ...current, accountableUserId: selected?.id || '', ...(selected ? { accountableTo: selected.name } : {}) }
        })
      } catch (failure) { if (!controller.signal.aborted) setError(failure.message) }
      finally { if (!controller.signal.aborted) setLoading(false) }
    }
    void load()
    return () => controller.abort()
  }, [directoryUrl, token, retry, setForm])
  return <label>Employee or Person Accountable *
    <select required disabled={loading || !!error} value={form.accountableUserId || ''} onChange={(event) => {
      const user = users.find((entry) => entry.id === event.target.value)
      setForm((current) => ({ ...current, accountableUserId: user?.id || '', accountableTo: user?.name || '' }))
    }}>
      <option value=''>{loading ? 'Loading users…' : 'Select User'}</option>
      {users.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}
    </select>
    {!loading && !form.accountableUserId && form.accountableTo ? <small>Previously saved: {form.accountableTo}. Select the matching Procurement user.</small> : null}
    {!loading && !error && !users.length ? <small>No Procurement users are available.</small> : null}
    {error ? <><small role='alert'>{error}</small><button type='button' onClick={() => setRetry((current) => current + 1)}>Retry loading users</button></> : null}
  </label>
}

import { useEffect, useState } from 'react'

export function useEquipmentUsers(directoryUrl, token) {
  const [directory, setDirectory] = useState({ users: [], loading: true, error: '' })
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    setDirectory({ users: [], loading: true, error: '' })
    async function load() {
      try {
        const response = await fetch(directoryUrl, { headers: { Authorization: `Bearer ${token}` }, signal: controller.signal })
        if (!response.ok) throw new Error('Unable to load users. Please retry.')
        const data = await response.json()
        if (!controller.signal.aborted) setDirectory({ users: data.items, loading: false, error: '' })
      } catch (error) {
        if (!controller.signal.aborted) setDirectory({ users: [], loading: false, error: error.message })
      }
    }
    void load()
    return () => controller.abort()
  }, [directoryUrl, token, attempt])
  return { ...directory, retry: () => setAttempt((value) => value + 1) }
}

export function EquipmentUserSelect({ label, value, onChange, required, disabled, directory }) {
  const { users, loading, error, retry } = directory
  const listed = users.some((user) => user.name === value)
  return <label>{label}{required ? ' *' : ''}
    <select required={required} disabled={disabled} value={value || ''} onChange={(event) => onChange(event.target.value)}>
      <option value=''>{loading ? 'Loading users…' : 'Select User'}</option>
      {value && !listed ? <option value={value} disabled={!disabled}>{value}</option> : null}
      {users.map((user) => <option key={user.id} value={user.name}>{user.name}</option>)}
    </select>
    {!loading && !error && !users.length ? <small>No users are available.</small> : null}
    {error && !disabled ? <><small role='alert'>{error}</small><button type='button' onClick={retry}>Retry loading users</button></> : null}
  </label>
}

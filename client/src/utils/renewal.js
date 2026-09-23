export function calculateRenewalDate(start, end, manual) {
  if (manual) return new Date(manual).toISOString().slice(0, 10)
  if (end) return new Date(end).toISOString().slice(0, 10)
  if (!start) return ''
  const date = new Date(start)
  if (!Number.isFinite(date.getTime())) return ''
  const month = date.getUTCMonth()
  date.setUTCFullYear(date.getUTCFullYear() + 2)
  if (date.getUTCMonth() !== month) date.setUTCDate(0)
  return date.toISOString().slice(0, 10)
}

export function daysUntil(value, now = new Date()) {
  if (!value) return null
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now)
  const days = (Date.parse(String(value).slice(0, 10)) - Date.parse(today)) / 86400000
  return Number.isFinite(days) ? Math.round(days) : null
}

export function renewalTone(value, now) {
  const days = daysUntil(value, now)
  if (days === null) return 'neutral'
  if (days <= 0) return 'danger'
  if (days <= 30) return 'warning'
  if (days <= 90) return 'due'
  return 'success'
}

export function renewalLabel(value, now) {
  const days = daysUntil(value, now)
  if (days === null) return 'Not set'
  if (days === 0) return 'Due today · 0 days remaining'
  return days < 0 ? `${Math.abs(days)} days overdue` : `${days} days remaining`
}

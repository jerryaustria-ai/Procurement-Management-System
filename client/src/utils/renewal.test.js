import test from 'node:test'
import assert from 'node:assert/strict'
import { calculateRenewalDate, daysUntil, renewalTone, renewalLabel } from './renewal.js'

test('renewal calculation and date precedence', () => {
  assert.equal(calculateRenewalDate('2026-09-22'), '2028-09-22')
  assert.equal(calculateRenewalDate('2024-02-29'), '2026-02-28')
  assert.equal(calculateRenewalDate('2026-09-22', '2027-12-01'), '2027-12-01')
  assert.equal(calculateRenewalDate('2026-09-22', '2027-12-01', '2028-01-15'), '2028-01-15')
  assert.equal(calculateRenewalDate('', '', ''), '')
})

test('Philippine calendar-day boundaries and renewal colors', () => {
  const now = new Date('2026-09-21T16:01:00Z')
  for (const [offset, tone] of [[-1, 'danger'], [0, 'danger'], [1, 'warning'], [30, 'warning'], [31, 'due'], [90, 'due'], [91, 'success']]) {
    const value = new Date(Date.UTC(2026, 8, 22 + offset)).toISOString()
    assert.equal(daysUntil(value, now), offset)
    assert.equal(renewalTone(value, now), tone)
  }
  assert.equal(renewalLabel('2026-09-22', now), 'Due today · 0 days remaining')
  assert.equal(daysUntil(null, now), null)
  assert.equal(renewalTone(null, now), 'neutral')
})

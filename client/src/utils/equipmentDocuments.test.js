import test from 'node:test'
import assert from 'node:assert/strict'
import QRCode from 'qrcode'
import jsQR from 'jsqr'
import { equipmentUrl, equipmentIdFromQr, accountabilityHtml } from './equipmentDocuments.js'

const id = '507f1f77bcf86cd799439011'
const base = 'https://inventory.example.test'

test('equipment QR code decodes to authenticated record link', () => {
  const url = equipmentUrl(id, base)
  const qr = QRCode.create(url, { errorCorrectionLevel: 'M' })
  const scale = 6, margin = 4, width = (qr.modules.size + margin * 2) * scale
  const pixels = new Uint8ClampedArray(width * width * 4).fill(255)
  for (let y = 0; y < qr.modules.size; y++) for (let x = 0; x < qr.modules.size; x++) {
    if (!qr.modules.get(y, x)) continue
    for (let dy = 0; dy < scale; dy++) for (let dx = 0; dx < scale; dx++) {
      const pos = (((y + margin) * scale + dy) * width + (x + margin) * scale + dx) * 4
      pixels[pos] = pixels[pos + 1] = pixels[pos + 2] = 0
    }
  }
  const result = jsQR(pixels, width, width)
  assert.equal(result.data, url)
  assert.equal(equipmentIdFromQr(result.data, base), id)
  assert.throws(() => equipmentIdFromQr(`https://attacker.test/inventory?equipmentId=${id}`, base))
  assert.throws(() => equipmentIdFromQr(`${base}/inventory?equipmentId=invalid`, base))
});

test('print form includes selected accountability and escapes stored text', () => {
  const item = { recordCode: 'EQ-001', name: '<script>alert(1)</script>', company: 'Company', data: { serialNumber: 'SERIAL-01' } }
  const assignment = { employeeName: 'Employee A', department: 'HR', issueDate: '2026-09-23', issuedBy: 'IT Admin', receivedBy: 'Employee A', conditionUponIssue: 'Good' }
  const html = accountabilityHtml(item, assignment, '')
  for (const value of ['Equipment Accountability Form', 'EQ-001', 'Employee A', 'HR', 'SERIAL-01', '2026-09-23', 'Employee Signature / Date']) assert.ok(html.includes(value))
  assert.ok(!html.includes('<script>'))
  assert.ok(html.includes('&lt;script&gt;'))
  const label = accountabilityHtml(item, assignment, '', true)
  assert.ok(label.includes('Equipment QR Label'))
  assert.ok(!label.includes('Employee A'))
});

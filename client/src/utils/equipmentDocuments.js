export function equipmentUrl(id, base) {
  const url = new URL('/inventory', base)
  url.searchParams.set('equipmentId', id)
  return url.toString()
}

export function equipmentIdFromQr(value, base) {
  const url = new URL(value)
  if (url.origin !== new URL(base).origin || url.pathname.replace(/\/$/, '') !== '/inventory') throw new Error('Scan an equipment QR code from this inventory system.')
  const id = url.searchParams.get('equipmentId')
  if (!/^[a-f\d]{24}$/i.test(id || '')) throw new Error('This QR code does not contain a valid equipment record.')
  return id
}

const escape = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character])

export function accountabilityHtml(item, assignment, qr, labelOnly = false) {
  const cell = (label, value) => `<div><small>${escape(label)}</small><p>${escape(value || '—')}</p></div>`
  const qrImage = qr && /^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(qr) ? `<img src="${qr}" alt="Equipment QR code" width="180" height="180">` : ''
  return `<!doctype html><html><head><meta charset="utf-8"><title>${escape(item.recordCode)} — ${labelOnly ? 'Equipment QR Label' : 'Equipment Accountability Form'}</title><style>
    *{box-sizing:border-box}body{font:14px Arial,sans-serif;color:#172b23;margin:32px;max-width:900px}h1{font-size:24px}small{color:#52685e}p{margin:6px 0 14px;white-space:pre-wrap;overflow-wrap:anywhere}.grid{display:grid;grid-template-columns:1fr 1fr;gap:12px 24px}.grid>div{border-bottom:1px solid #ddd;break-inside:avoid}.header{display:flex;justify-content:space-between;gap:24px;align-items:center}.signatures{display:flex;gap:36px;margin-top:72px}.signatures>div{border-top:1px solid #333;flex:1;padding-top:10px}button{padding:10px 18px;margin-bottom:20px}@media print{button{display:none}body{margin:0;max-width:none}.header,.signatures{break-inside:avoid}@page{size:A4;margin:16mm}}
    </style></head><body><button id="print">Print / Save PDF</button><div class="header"><div><p>${escape(item.company || 'Januarius Holdings')}</p><h1>${labelOnly ? 'Equipment QR Label' : 'Equipment Accountability Form'}</h1><h2>${escape(item.recordCode)}</h2><p>${escape(item.name)}</p></div>${qrImage}</div>
    ${labelOnly ? '<p>Scan to view equipment details. Sign-in required.</p>' : `<div class="grid">${[
      ['Type', item.data?.category], ['Brand / Model', [item.data?.brand, item.data?.model].filter(Boolean).join(' / ')],
      ['Serial Number', item.data?.serialNumber], ['Location', item.data?.location], ['Description', item.data?.description], ['Current Status', item.status],
      ['Employee Name', assignment?.employeeName || item.accountableTo], ['Department', assignment?.department || item.data?.department],
      ['Issue Date', assignment?.issueDate || item.data?.issueDate], ['Condition Upon Issue', assignment?.conditionUponIssue],
      ['Issued By', assignment?.issuedBy], ['Received By', assignment?.receivedBy], ['Return Date', assignment?.returnDate], ['Condition Upon Return', assignment?.conditionUponReturn],
      ['Transfer Details', assignment?.transferDetails], ['Remarks', assignment?.remarks], ['Recorded By', assignment?.recordedBy], ['Date Recorded', assignment?.recordedAt],
    ].map(([label, value]) => cell(label, value)).join('')}</div><p>I acknowledge receipt of the equipment described above and agree to take reasonable care of it and return it when required.</p><div class="signatures"><div>Employee Signature / Date</div><div>Issued By / Date</div><div>Verified By / Date</div></div>`}
    </body></html>`
}

export function openEquipmentPrint(item, assignment, qr, labelOnly) {
  const popup = window.open('', '_blank')
  if (!popup) throw new Error('Allow pop-ups to open the printable equipment form.')
  popup.opener = null
  popup.document.write(accountabilityHtml(item, assignment, qr, labelOnly))
  popup.document.close()
  popup.document.getElementById('print').addEventListener('click', () => popup.print())
}

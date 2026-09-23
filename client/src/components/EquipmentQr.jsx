import { useEffect, useRef, useState } from 'react'
import { equipmentUrl, equipmentIdFromQr, openEquipmentPrint } from '../utils/equipmentDocuments.js'

const publicBase = () => import.meta.env.VITE_EQUIPMENT_PUBLIC_URL || window.location.origin

export function EquipmentDocuments({ item }) {
  const [qr, setQr] = useState('')
  const [error, setError] = useState('')
  const [assignmentId, setAssignmentId] = useState('')
  const url = equipmentUrl(item.id, publicBase())
  const entries = item.accountabilityHistory || []
  const assignment = entries.find((entry) => entry._id === assignmentId) || entries.find((entry) => !entry.returnDate) || entries.at(-1)
  useEffect(() => {
    let active = true
    setQr(''); setError('')
    import('qrcode').then(({ default: QRCode }) => QRCode.toDataURL(url, { width: 320, margin: 4, errorCorrectionLevel: 'M' })).then((value) => { if (active) setQr(value) }).catch(() => { if (active) setError('Unable to generate QR code.') })
    return () => { active = false }
  }, [url])
  function print(labelOnly) { try { openEquipmentPrint(item, assignment, qr, labelOnly) } catch (failure) { setError(failure.message) } }
  return <section className='equipment-documents'><h3>Equipment Form and QR Code</h3>{error ? <p role='alert' className='inventory-error'>{error}</p> : null}
    {qr ? <img src={qr} width='180' height='180' alt={`QR code for ${item.recordCode}`} /> : <p>Generating QR code…</p>}
    <p>Scan with your phone camera to open this record. Sign-in is required.</p>
    <a href={url}>Open equipment link</a>
    {entries.length ? <label>Accountability record<select value={assignment?._id || ''} onChange={(event) => setAssignmentId(event.target.value)}>{[...entries].reverse().map((entry) => <option key={entry._id} value={entry._id}>{entry.employeeName} · {entry.issueDate || 'Date unknown'}{entry.returnDate ? ' · Returned' : ' · Current'}</option>)}</select></label> : null}
    <div className='inventory-form-actions'><button disabled={!qr} onClick={() => print(false)}>Generate Accountability Form</button><button disabled={!qr} onClick={() => print(true)}>Print QR Label</button>{qr ? <a download={`${item.recordCode}-qr.png`} href={qr}>Download QR Code</a> : null}</div>
  </section>
}

export function EquipmentScanner({ onScan, onClose }) {
  const video = useRef(null)
  const stream = useRef(null)
  const frame = useRef(null)
  const mounted = useRef(true)
  const [error, setError] = useState('')
  const [scanning, setScanning] = useState(false)
  function stop() { cancelAnimationFrame(frame.current); stream.current?.getTracks().forEach((track) => track.stop()); stream.current = null }
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; stop() } }, [])
  async function decode(source, width, height) {
    const { default: jsQR } = await import('jsqr')
    const scale = Math.min(1, 1000 / Math.max(width, height))
    const canvas = document.createElement('canvas'); canvas.width = Math.round(width * scale); canvas.height = Math.round(height * scale)
    const context = canvas.getContext('2d', { willReadFrequently: true }); context.drawImage(source, 0, 0, canvas.width, canvas.height)
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height)
    return jsQR(pixels.data, pixels.width, pixels.height)?.data
  }
  function accept(value) {
    const id = equipmentIdFromQr(value, publicBase())
    stop(); onScan(id)
  }
  async function startCamera() {
    setError(''); stop(); setScanning(true)
    try {
      const media = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false })
      if (!mounted.current) { media.getTracks().forEach((track) => track.stop()); return }
      stream.current = media; video.current.srcObject = media; await video.current.play()
      async function tick() {
        if (!mounted.current || !stream.current) return
        try {
          if (video.current.readyState >= 2) {
            const value = await decode(video.current, video.current.videoWidth, video.current.videoHeight)
            if (!mounted.current || !stream.current) return
            if (value) { accept(value); return }
          }
        } catch (failure) { setError(failure.message) }
        frame.current = requestAnimationFrame(tick)
      }
      frame.current = requestAnimationFrame(tick)
    } catch { if (mounted.current) { stop(); setScanning(false); setError('Camera unavailable. Allow camera access over HTTPS, or upload a QR image below.') } }
  }
  async function scanImage(file) {
    if (!file) return
    stop(); setScanning(false); setError('')
    const url = URL.createObjectURL(file)
    try {
      const img = new Image(); img.src = url; await img.decode()
      if (!mounted.current) return
      const value = await decode(img, img.naturalWidth, img.naturalHeight)
      if (!mounted.current) return
      if (!value) throw new Error('No QR code found. Upload a clear image of the equipment QR label.')
      accept(value)
    } catch (failure) { if (mounted.current) setError(failure.message) } finally { URL.revokeObjectURL(url) }
  }
  return <div className='inventory-modal-backdrop'><section className='inventory-modal'><div className='inventory-modal-head'><h2>Scan Equipment QR Code</h2><button onClick={onClose}>Close</button></div>
    {error ? <p role='alert' className='inventory-error'>{error}</p> : null}
    <video ref={video} muted playsInline style={{ width: '100%', maxHeight: 360, display: scanning ? 'block' : 'none' }} />
    <button disabled={scanning} className='inventory-primary' onClick={startCamera}>Start Camera</button>
    <label>Or upload a QR image<input type='file' accept='image/*' onChange={(event) => { void scanImage(event.target.files[0]); event.target.value = '' }} /></label>
  </section></div>
}

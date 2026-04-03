export default function LoadingOverlay({
  visible,
  title = 'Loading',
  message = 'Please wait while we prepare your workspace.',
}) {
  if (!visible) {
    return null
  }

  return (
    <div className='loading-overlay' role='status' aria-live='polite'>
      <div className='loading-overlay-backdrop' />
      <div className='loading-overlay-card'>
        <div className='loading-overlay-spinner' aria-hidden='true' />
        <strong>{title}</strong>
        <p>{message}</p>
      </div>
    </div>
  )
}

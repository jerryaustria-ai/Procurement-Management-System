export default function ForgotPasswordForm({
  email,
  onChange,
  onSubmit,
  onBack,
  isSubmitting,
  error,
  message,
}) {
  return (
    <form
      className='panel auth-panel'
      onSubmit={(event) => {
        event.preventDefault()
        onSubmit()
      }}
    >
      <div className='panel-heading'>
        <div>
          <p className='eyebrow'>Authentication</p>
          <h2>Reset your password</h2>
        </div>
      </div>

      <p className='panel-support'>
        Enter your email address. If the account exists, we&apos;ll send a reset
        link so you can set a new password.
      </p>

      <label>
        Email
        <input
          name='forgotPasswordEmail'
          type='email'
          value={email}
          onChange={onChange}
          placeholder='Enter your email address'
        />
      </label>

      <button
        className='auth-signin-button'
        disabled={isSubmitting}
        type='submit'
      >
        {isSubmitting ? 'Sending reset link...' : 'Send reset link'}
      </button>

      <div className='auth-panel-actions auth-panel-actions-split'>
        <button
          type='button'
          className='auth-inline-button'
          onClick={onBack}
        >
          Back to sign in
        </button>
      </div>

      {message ? <p className='success-text'>{message}</p> : null}
      {error ? <p className='error-text'>{error}</p> : null}
    </form>
  )
}

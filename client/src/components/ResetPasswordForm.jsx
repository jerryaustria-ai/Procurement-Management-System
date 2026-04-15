export default function ResetPasswordForm({
  form,
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
          <h2>Create a new password</h2>
        </div>
      </div>

      <p className='panel-support'>
        Set your new password below. Once saved, you can sign in right away
        with the updated password.
      </p>

      <label>
        New password
        <input
          name='password'
          type='password'
          value={form.password}
          onChange={onChange}
          placeholder='Enter your new password'
        />
      </label>

      <label>
        Confirm password
        <input
          name='confirmPassword'
          type='password'
          value={form.confirmPassword}
          onChange={onChange}
          placeholder='Confirm your new password'
        />
      </label>

      <button
        className='auth-signin-button'
        disabled={isSubmitting}
        type='submit'
      >
        {isSubmitting ? 'Updating password...' : 'Reset password'}
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

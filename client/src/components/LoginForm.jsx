export default function LoginForm({
  credentials,
  onChange,
  onSubmit,
  onForgotPassword,
  isSubmitting,
  error,
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
          <h2>Sign in to approve</h2>
        </div>
      </div>

      <label>
        Email
        <input
          name='email'
          type='email'
          value={credentials.email}
          onChange={onChange}
          placeholder='Enter your email address'
        />
      </label>

      <label>
        Password
        <input
          name='password'
          type='password'
          value={credentials.password}
          onChange={onChange}
          placeholder='Enter your password'
        />
      </label>

      <label className='auth-remember-option'>
        <input
          name='rememberMe'
          type='checkbox'
          checked={Boolean(credentials.rememberMe)}
          onChange={onChange}
        />
        <span>Remember me</span>
      </label>

      <button
        className='auth-signin-button'
        disabled={isSubmitting}
        type='submit'
      >
        {isSubmitting ? 'Signing in...' : 'Sign in'}
      </button>
      <div className='auth-panel-actions'>
        <button
          type='button'
          className='auth-forgot-link auth-inline-button'
          onClick={onForgotPassword}
        >
          Forgot password?
        </button>
      </div>
      {error ? <p className='error-text'>{error}</p> : null}
    </form>
  )
}

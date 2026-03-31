export default function LoginForm({
  credentials,
  onChange,
  onSubmit,
  isSubmitting,
  error
}) {
  return (
    <form
      className="panel auth-panel"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Authentication</p>
          <h2>Sign in to approve</h2>
        </div>
      </div>

      <label>
        Email
        <input
          name="email"
          type="email"
          value={credentials.email}
          onChange={onChange}
          placeholder="reviewer@januarius.app"
        />
      </label>

      <label>
        Password
        <input
          name="password"
          type="password"
          value={credentials.password}
          onChange={onChange}
          placeholder="password123"
        />
      </label>

      <button
        className="auth-signin-button"
        disabled={isSubmitting}
        type="submit"
      >
        {isSubmitting ? "Signing in..." : "Sign in"}
      </button>
      <div className="auth-panel-actions">
        <a
          className="auth-forgot-link"
          href="mailto:admin@januarius.app?subject=Forgot%20Password%20Request"
        >
          Forgot password?
        </a>
      </div>
      {error ? <p className="error-text">{error}</p> : null}
    </form>
  );
}

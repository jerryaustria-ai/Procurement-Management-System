export default function LoginForm({
  credentials,
  onChange,
  onSubmit,
  isSubmitting,
  error
}) {
  return (
    <section className="panel auth-panel">
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

      <button disabled={isSubmitting} onClick={onSubmit} type="button">
        {isSubmitting ? "Signing in..." : "Sign in"}
      </button>
      {error ? <p className="error-text">{error}</p> : null}
    </section>
  );
}

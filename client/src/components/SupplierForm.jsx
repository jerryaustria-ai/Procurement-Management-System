export default function SupplierForm({
  form,
  onChange,
  onSubmit,
  isSubmitting,
  error
}) {
  return (
    <section className="panel action-panel">
      <div className="form-grid two-column">
        <label>
          Supplier name
          <input
            name="name"
            value={form.name}
            onChange={onChange}
            placeholder="ABC Trading"
            required
          />
        </label>
        <label>
          Contact person
          <input
            name="contactPerson"
            value={form.contactPerson}
            onChange={onChange}
            placeholder="Maria Santos"
          />
        </label>
        <label>
          Email
          <input
            name="email"
            value={form.email}
            onChange={onChange}
            placeholder="supplier@example.com"
          />
        </label>
        <label>
          Phone
          <input
            name="phone"
            value={form.phone}
            onChange={onChange}
            placeholder="+63 917 000 0000"
          />
        </label>
      </div>

      <label>
        Address
        <textarea
          name="address"
          value={form.address}
          onChange={onChange}
          rows="3"
          placeholder="Office or warehouse address"
        />
      </label>

      <label>
        Notes
        <textarea
          name="notes"
          value={form.notes}
          onChange={onChange}
          rows="3"
          placeholder="Accreditation or delivery notes"
        />
      </label>

      <button disabled={isSubmitting} onClick={onSubmit} type="button">
        {isSubmitting ? "Saving..." : "Create supplier"}
      </button>

      {error ? <p className="error-text">{error}</p> : null}
    </section>
  );
}

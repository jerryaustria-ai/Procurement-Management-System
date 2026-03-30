export default function SupplierForm({
  form,
  onChange,
  onSubmit,
  isSubmitting,
  error,
  submitLabel = "Create supplier"
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
          Supplier Category
          <select name="category" value={form.category} onChange={onChange}>
            <option value="Product">Product</option>
            <option value="Service">Service</option>
            <option value="Contractor">Contractor</option>
          </select>
        </label>
        <label>
          Supplier Type
          <select name="supplierType" value={form.supplierType} onChange={onChange}>
            <option value="Manufacturer">Manufacturer</option>
            <option value="Distributor">Distributor</option>
            <option value="Reseller">Reseller</option>
            <option value="Wholesaler">Wholesaler</option>
            <option value="Retailer">Retailer</option>
            <option value="Service Provider">Service Provider</option>
            <option value="Contractor">Contractor</option>
            <option value="Consultant">Consultant</option>
            <option value="Other">Other</option>
          </select>
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
          TIN No.
          <input
            name="tinNumber"
            value={form.tinNumber}
            onChange={onChange}
            placeholder="123-456-789-000"
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
        {isSubmitting ? "Saving..." : submitLabel}
      </button>

      {error ? <p className="error-text">{error}</p> : null}
    </section>
  );
}

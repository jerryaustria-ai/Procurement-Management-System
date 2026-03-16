const roleOptions = [
  { value: "requester", label: "Requester" },
  { value: "reviewer", label: "Reviewer" },
  { value: "approver", label: "Approver" },
  { value: "procurement", label: "Procurement Officer" },
  { value: "receiver", label: "Receiving Officer" },
  { value: "inspector", label: "Inspector" },
  { value: "finance", label: "Finance Officer" },
  { value: "accountant", label: "Accountant" },
  { value: "treasury", label: "Treasury Officer" },
  { value: "filing", label: "Records Officer" },
  { value: "admin", label: "System Admin" }
];

export default function UserManagementPanel({
  users,
  selectedUserId,
  onSelect,
  form,
  onChange,
  onCreate,
  onUpdate,
  onDelete,
  onReset,
  isSubmitting,
  error
}) {
  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Admin Users</p>
          <h2>Create, edit, or delete users</h2>
        </div>
      </div>

      <div className="user-admin-grid">
        <div className="user-admin-list">
          {users.map((user) => (
            <button
              key={user.id}
              type="button"
              className={`request-list-item ${selectedUserId === user.id ? "selected" : ""}`}
              onClick={() => onSelect(user.id)}
            >
              <strong>{user.name}</strong>
              <span>{user.roleLabel}</span>
              <small>{user.email}</small>
            </button>
          ))}
        </div>

        <div className="action-panel">
          <div className="form-grid two-column">
            <label>
              Name
              <input name="name" value={form.name} onChange={onChange} />
            </label>
            <label>
              Email
              <input name="email" value={form.email} onChange={onChange} />
            </label>
            <label>
              Role
              <select name="role" value={form.role} onChange={onChange}>
                {roleOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Department
              <input name="department" value={form.department} onChange={onChange} />
            </label>
          </div>

          <label>
            Password
            <input
              name="password"
              type="password"
              value={form.password}
              onChange={onChange}
              placeholder={selectedUserId ? "Leave blank to keep current password" : "Required"}
            />
          </label>

          <div className="button-row">
            <button disabled={isSubmitting} type="button" onClick={selectedUserId ? onUpdate : onCreate}>
              {isSubmitting ? "Saving..." : selectedUserId ? "Update user" : "Create user"}
            </button>
            <button className="ghost-button" disabled={isSubmitting} type="button" onClick={onReset}>
              New form
            </button>
            {selectedUserId ? (
              <button className="danger-button" disabled={isSubmitting} type="button" onClick={onDelete}>
                Delete user
              </button>
            ) : null}
          </div>
          {error ? <p className="error-text">{error}</p> : null}
        </div>
      </div>
    </section>
  );
}

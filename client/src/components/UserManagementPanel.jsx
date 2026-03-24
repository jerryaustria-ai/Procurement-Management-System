import PanelExpandButton from "./PanelExpandButton.jsx";

export default function UserManagementPanel({
  users,
  selectedUserId,
  onSelect,
  onCreateNew,
  onEditSelected,
  onDeleteSelected,
  onExpand,
  showExpand = true
}) {
  return (
    <section className="panel panel-with-expand">
      {showExpand && onExpand ? (
        <PanelExpandButton onClick={onExpand} label="Expand user directory" />
      ) : null}
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Admin Users</p>
          <h2>User directory</h2>
        </div>
        <span className="panel-counter">{users.length} users</span>
      </div>

      <p className="panel-support">
        Manage internal approvers, finance users, and request owners from a central directory.
      </p>

      <div className="toolbar-actions left">
        <button type="button" onClick={onCreateNew}>
          New user
        </button>
      </div>

      <div className="user-admin-list">
        {users.map((user) => (
          <article
            key={user.id}
            className={`request-list-item ${selectedUserId === user.id ? "selected" : ""}`}
          >
            <button className="supplier-card-button" type="button" onClick={() => onSelect(user.id)}>
              <strong>{user.name}</strong>
              <span>{user.roleLabel}</span>
              <small>{user.email}</small>
            </button>
            <div className="request-list-footer">
              <small>{user.department || "No department set"}</small>
              <div className="request-list-actions-inline">
                <button
                  className="request-open-link"
                  type="button"
                  onClick={() => onEditSelected(user.id)}
                >
                  Edit
                </button>
                <button
                  className="request-open-link danger-link"
                  type="button"
                  onClick={() => onDeleteSelected(user.id)}
                >
                  Delete
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

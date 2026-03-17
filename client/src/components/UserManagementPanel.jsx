import PanelExpandButton from "./PanelExpandButton.jsx";

export default function UserManagementPanel({
  users,
  selectedUserId,
  onSelect,
  onCreateNew,
  onEditSelected,
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
        <button className="ghost-button" type="button" onClick={onEditSelected} disabled={!selectedUserId}>
          Edit selected user
        </button>
      </div>

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
    </section>
  );
}

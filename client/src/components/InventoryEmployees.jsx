export function InventoryEmployees({ items }) {
  return <table><thead><tr><th>Name</th><th>Email Address</th><th>Department</th><th>Role</th></tr></thead>
    <tbody>{items.map((user) => <tr key={user.id}><td>{user.name}</td><td>{user.email}</td><td>{user.department || '—'}</td><td>{user.role.replaceAll('_', ' ')}</td></tr>)}</tbody>
  </table>
}

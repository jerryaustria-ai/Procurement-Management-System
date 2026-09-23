// Inventory reads the procurement account directory; never expose account secrets.
export function serializeInventoryEmployee(user) {
  return {
    id: user._id.toString(), name: user.name, email: user.email,
    department: user.department || '', role: user.role,
  };
}

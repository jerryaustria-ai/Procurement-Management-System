import { requireRole } from './auth.js';

export function requireInventoryEditor(req, res, next) {
  if (String(req.params.module).toLowerCase() === 'employees') {
    return res.status(403).json({ message: 'Manage employee accounts in Procurement Users. Inventory uses the same user directory.' });
  }
  return requireRole(...(String(req.params.module).toLowerCase() === 'companies' ? ['super_admin'] : ['admin', 'super_admin']))(req, res, next);
}

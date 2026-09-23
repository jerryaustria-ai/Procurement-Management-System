import { requireRole } from './auth.js';

export function requireInventoryEditor(req, res, next) {
  return requireRole(...(String(req.params.module).toLowerCase() === 'companies' ? ['super_admin'] : ['admin', 'super_admin']))(req, res, next);
}

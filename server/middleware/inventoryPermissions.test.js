import test from 'node:test';
import assert from 'node:assert/strict';
import { requireInventoryEditor } from './inventoryPermissions.js';

function permission(role, module) {
  let allowed = false, status = 200;
  requireInventoryEditor({ params: { module }, user: role ? { role } : null }, {
    status(value) { status = value; return this; }, json() {},
  }, () => { allowed = true; });
  return { allowed, status };
}

test('only Super Admin can modify companies, including archive and restore', () => {
  assert.deepEqual(permission('super_admin', 'companies'), { allowed: true, status: 200 });
  for (const role of ['admin', 'requester', 'finance']) assert.deepEqual(permission(role, 'companies'), { allowed: false, status: 403 });
  assert.deepEqual(permission('admin', 'COMPANIES'), { allowed: false, status: 403 });
  assert.deepEqual(permission(null, 'companies'), { allowed: false, status: 401 });
});

test('regular admins retain write access to other inventory modules', () => {
  for (const module of ['equipment', 'isp', 'postpaid', 'employees']) {
    assert.equal(permission('admin', module).allowed, true);
    assert.equal(permission('super_admin', module).allowed, true);
    assert.equal(permission('requester', module).allowed, false);
  }
});

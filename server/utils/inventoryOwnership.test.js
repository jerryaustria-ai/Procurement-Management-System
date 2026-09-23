import test from 'node:test';
import assert from 'node:assert/strict';
import { ownershipQuery, personalSummary } from './inventoryOwnership.js';
import { requireRole } from '../middleware/auth.js';

test('ownership uses authenticated ID and excludes archived records', () => {
  assert.deepEqual(ownershipQuery({ _id: 'user-1', name: 'Alex' }, false), {
    archived: false, $or: [{ accountableUserId: 'user-1' }],
  });
});

test('legacy matching requires unique name, escapes regex, and never overrides an assigned ID', () => {
  const query = ownershipQuery({ _id: 'user-1', name: 'A. (Lee)' }, true);
  const legacy = query.$or[1];
  assert.equal(legacy.accountableUserId, null);
  const matcher = new RegExp(legacy.accountableTo.$regex, legacy.accountableTo.$options);
  assert.equal(matcher.test(' a. (lee) '), true);
  assert.equal(matcher.test('Ab Lee'), false);
  assert.equal(matcher.test('Other A. (Lee)'), false);
});

test('personal response excludes other employees history, attachments and audit data', () => {
  const result = personalSummary({ _id: 'item', name: 'Laptop', accountabilityHistory: [{ employeeName: 'Other' }], attachments: ['private'], data: { remarks: 'private', category: 'Laptop' } });
  assert.equal(result.type, 'Laptop');
  for (const field of ['accountabilityHistory', 'attachments', 'data', 'history']) assert.equal(field in result, false);
});

test('shared inventory gate admits only administrators', () => {
  for (const role of ['admin', 'super_admin', 'requester', 'approver', 'accountant', 'viewer']) {
    let allowed = false;
    let status;
    requireRole('admin', 'super_admin')({ user: { role } }, { status(value) { status = value; return this; }, json() {} }, () => { allowed = true; });
    assert.equal(allowed, ['admin', 'super_admin'].includes(role));
    if (!allowed) assert.equal(status, 403);
  }
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { serializeInventoryEmployee } from './inventoryEmployee.js';

test('inventory employee uses the procurement user identity and exposes only directory fields', () => {
  const employee = serializeInventoryEmployee({ _id: 'shared-user-id', name: 'Employee A', email: 'a@example.test', department: 'Finance', role: 'requester', passwordHash: 'private', resetPasswordTokenHash: 'private' });
  assert.deepEqual(employee, { id: 'shared-user-id', name: 'Employee A', email: 'a@example.test', department: 'Finance', role: 'requester' });
});

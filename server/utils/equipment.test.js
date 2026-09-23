import test from 'node:test';
import assert from 'node:assert/strict';
import { OfficeEquipment } from '../models/Inventory.js';
import { applyAccountability, applyEquipmentMovement, issueEntry, validateEquipment } from './equipment.js';

const user = { email: 'admin@example.test' };
const issuance = { action: 'issue', employeeName: 'Employee A', department: 'Finance', issueDate: '2026-09-23', conditionUponIssue: 'Good', issuedBy: 'IT Admin', receivedBy: 'Employee A', remarks: 'With charger' };
const equipment = () => new OfficeEquipment({ recordCode: 'TEST-001', name: 'Laptop', status: 'Available', data: { category: 'Laptop', condition: 'Good' } });

test('issue, transfer, return, and reissue preserve original accountability', () => {
  const item = equipment();
  applyAccountability(item, issuance, user);
  const original = item.accountabilityHistory[0].toObject();
  assert.equal(item.status, 'Issued');
  assert.equal(item.accountableTo, 'Employee A');
  applyAccountability(item, { ...issuance, action: 'transfer', employeeName: 'Employee B', receivedBy: 'Employee B', department: 'HR', issueDate: '2026-10-01', returnDate: '2026-10-01', conditionUponReturn: 'Fair', returnReceivedBy: 'IT Admin', transferDetails: 'Finance to HR', remarks: 'Reassigned' }, user);
  assert.equal(item.accountabilityHistory.length, 2);
  const closed = item.accountabilityHistory[0];
  for (const key of ['employeeName', 'department', 'issueDate', 'conditionUponIssue', 'issuedBy', 'receivedBy', 'remarks', 'recordedBy']) assert.equal(closed[key], original[key]);
  assert.equal(closed.returnDate, '2026-10-01');
  assert.equal(closed.conditionUponReturn, 'Fair');
  assert.equal(closed.returnTransferDetails, 'Finance to HR');
  assert.equal(item.accountableTo, 'Employee B');
  applyAccountability(item, { action: 'return', returnDate: '2026-10-15', conditionUponReturn: 'Good', returnReceivedBy: 'Storekeeper' }, user);
  assert.equal(item.status, 'Returned');
  assert.equal(item.accountableTo, '');
  assert.equal(item.accountabilityHistory[1].employeeName, 'Employee B');
  assert.throws(() => applyAccountability(item, { ...issuance, issueDate: '2026-10-01' }, user), /previous return date/);
  applyAccountability(item, { ...issuance, issueDate: '2026-11-01' }, user);
  assert.equal(item.accountabilityHistory.length, 3);
  assert.equal(item.validateSync(), undefined);
});

test('invalid movement dates, missing fields, and double issuance are rejected', () => {
  const item = equipment();
  assert.throws(() => issueEntry({ ...issuance, issueDate: '2026-02-30' }, user), /required/);
  assert.throws(() => issueEntry({ ...issuance, issuedBy: '' }, user), /required/);
  assert.throws(() => applyAccountability(item, { action: 'return' }, user), /no active assignment/);
  applyAccountability(item, issuance, user);
  assert.throws(() => applyAccountability(item, issuance, user), /already issued/);
  assert.throws(() => applyAccountability(item, { action: 'return', returnDate: '2026-09-01', conditionUponReturn: 'Good', returnReceivedBy: 'Admin' }, user), /precede/);
  assert.equal(item.accountabilityHistory[0].returnDate, '');
});

test('legacy assignments are preserved and category/condition options validated', () => {
  const item = equipment(); item.accountableTo = 'Previous Employee'; item.data.department = 'Operations'; item.data.issueDate = '2025-01-01';
  applyAccountability(item, { action: 'return', returnDate: '2026-09-23', conditionUponReturn: 'Good', returnReceivedBy: 'Admin' }, user);
  assert.equal(item.accountabilityHistory[0].employeeName, 'Previous Employee');
  assert.equal(item.accountabilityHistory[0].issueDate, '2025-01-01');
  assert.equal(item.accountabilityHistory[0].recordedBy, user.email);
  assert.match(item.accountabilityHistory[0].remarks, /legacy/);
  validateEquipment(item);
  assert.throws(() => validateEquipment({ status: 'Invalid', data: item.data }), /status/);
  assert.throws(() => validateEquipment({ status: 'Available', data: { category: 'Unknown' } }), /category/);
});

const lifecycleValues = (action, extra = {}) => ({ action, movementDate: '2026-10-01', condition: 'Good', handledBy: 'IT Admin', remarks: 'Documented reason', repairProvider: 'Service Center', ...extra });

test('repair preserves custody and logs return; lost equipment can be physically returned', () => {
  const item = equipment();
  applyEquipmentMovement(item, issuance, user);
  applyEquipmentMovement(item, lifecycleValues('repair-out', { condition: 'For Repair' }), user);
  assert.equal(item.status, 'Under Repair');
  assert.equal(item.accountableTo, 'Employee A');
  assert.equal(item.accountabilityHistory[0].returnDate, '');
  assert.throws(() => applyEquipmentMovement(item, { ...issuance, action: 'transfer', issueDate: '2026-10-01' }, user), /current status/);
  applyEquipmentMovement(item, lifecycleValues('repair-in', { movementDate: '2026-10-02' }), user);
  assert.equal(item.status, 'Issued');
  assert.equal(item.accountabilityHistory.length, 1);
  applyEquipmentMovement(item, lifecycleValues('lost', { movementDate: '2026-10-03' }), user);
  assert.equal(item.status, 'Lost');
  assert.equal(item.accountableTo, 'Employee A');
  assert.throws(() => applyEquipmentMovement(item, lifecycleValues('retire', { movementDate: '2026-10-04' }), user), /Return equipment/);
  applyEquipmentMovement(item, { action: 'return', returnDate: '2026-10-04', conditionUponReturn: 'Good', returnReceivedBy: 'IT Admin', remarks: 'Recovered' }, user);
  assert.equal(item.status, 'Returned');
  assert.equal(item.movementHistory.length, 5);
  assert.equal(item.movementHistory[1].repairProvider, 'Service Center');
  assert.equal(item.movementHistory[1].before.status, 'Issued');
  assert.equal(item.movementHistory[1].after.status, 'Under Repair');
  assert.equal(item.movementHistory[1].recordedBy, user.email);
  assert.equal(item.validateSync(), undefined);
});

test('unassigned repair returns available, then retirement and disposal are final', () => {
  const item = equipment();
  assert.throws(() => applyEquipmentMovement(item, lifecycleValues('repair-in'), user), /Only equipment under repair/);
  assert.throws(() => applyEquipmentMovement(item, lifecycleValues('repair-out', { repairProvider: '' }), user), /provider/);
  assert.throws(() => applyEquipmentMovement(item, lifecycleValues('lost', { remarks: '' }), user), /remarks/);
  applyEquipmentMovement(item, lifecycleValues('repair-out'), user);
  assert.throws(() => applyEquipmentMovement(item, lifecycleValues('dispose'), user), /from repair first/);
  applyEquipmentMovement(item, lifecycleValues('repair-in'), user);
  assert.equal(item.status, 'Available');
  applyEquipmentMovement(item, lifecycleValues('retire'), user);
  assert.equal(item.status, 'Retired');
  assert.throws(() => applyEquipmentMovement(item, { ...issuance, issueDate: '2026-10-02' }, user), /current status/);
  applyEquipmentMovement(item, lifecycleValues('dispose'), user);
  assert.equal(item.status, 'Disposed');
  assert.throws(() => applyEquipmentMovement(item, lifecycleValues('repair-out'), user), /Disposed/);
  assert.throws(() => applyEquipmentMovement(item, lifecycleValues('lost', { movementDate: '2026-09-01' }), user), /latest recorded/);
  assert.equal(item.movementHistory.length, 4);
});

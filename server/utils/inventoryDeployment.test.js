import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { calculateRenewalDate } from './renewal.js';

test('server entrypoint and local imports remain inside the Render root directory', async () => {
  const root = fileURLToPath(new URL('../', import.meta.url));
  const visited = new Set();
  async function visit(file) {
    const relative = path.relative(root, file);
    assert.ok(!relative.startsWith('..') && !path.isAbsolute(relative), `Dependency outside server root: ${file}`);
    if (visited.has(file)) return;
    visited.add(file);
    const source = await readFile(file, 'utf8');
    for (const match of source.matchAll(/(?:from\s+|import\s*)['"](\.[^'"]+)['"]/g)) {
      await visit(path.resolve(path.dirname(file), match[1]));
    }
  }
  await visit(path.join(root, 'index.js'));
  assert.ok(visited.has(path.join(root, 'routes/inventory.js')));
});

test('inventory router loads without starting MongoDB or importing frontend code', async () => {
  const { default: router } = await import('../routes/inventory.js');
  assert.ok(router.stack.some((layer) => layer.route?.path === '/dashboard'));
  assert.ok(router.stack.some((layer) => layer.route?.path === '/:module' && layer.route.methods.get));
});

test('server renewal calculation retains date precedence and leap-year behavior', () => {
  assert.equal(calculateRenewalDate('2026-09-23'), '2028-09-23');
  assert.equal(calculateRenewalDate('2024-02-29'), '2026-02-28');
  assert.equal(calculateRenewalDate('2026-09-23', '2027-12-01'), '2027-12-01');
  assert.equal(calculateRenewalDate('2026-09-23', '2027-12-01', '2028-01-10'), '2028-01-10');
});

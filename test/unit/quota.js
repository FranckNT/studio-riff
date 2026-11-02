import { test } from 'node:test';
import assert from 'node:assert/strict';
import { assertQuota } from '../../src/domain/rules/quota.js';
import { ConflictError } from '../../src/domain/errors.js';

test('0 et 1 réservation à venir : accepté', () => {
  assert.doesNotThrow(() => assertQuota(0));
  assert.doesNotThrow(() => assertQuota(1));
});
test('2 réservations à venir : refusé (cas member-1 le 2 nov. 2026)', () => {
  assert.throws(() => assertQuota(2), (e) => e instanceof ConflictError && e.code === 'member_quota');
});

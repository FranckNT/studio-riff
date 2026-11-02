import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateSlot } from '../../src/domain/rules/slot.js';
import { ValidationError } from '../../src/domain/errors.js';

const ok = (s, e) => validateSlot(s, e);
const ko = (s, e, code) =>
  assert.throws(() => validateSlot(s, e), (err) => err instanceof ValidationError && err.code === code);

test('accepte un créneau de 2 h à 14 h', () => {
  const { start, end } = ok('2026-11-04T14:00:00Z', '2026-11-04T16:00:00Z');
  assert.equal(start.toISOString(), '2026-11-04T14:00:00.000Z');
  assert.equal(end.toISOString(), '2026-11-04T16:00:00.000Z');
});
test('accepte les durées limites 1 h et 4 h', () => {
  ok('2026-11-04T10:00:00Z', '2026-11-04T11:00:00Z');
  ok('2026-11-04T10:00:00Z', '2026-11-04T14:00:00Z');
});
test('refuse 30 minutes, 5 h, et une fin avant le début', () => {
  ko('2026-11-04T14:00:00Z', '2026-11-04T14:30:00Z', 'slot_not_full_hour');
  ko('2026-11-04T14:00:00Z', '2026-11-04T19:00:00Z', 'slot_bad_duration');
  ko('2026-11-04T14:00:00Z', '2026-11-04T13:00:00Z', 'slot_bad_duration');
});
test("refuse un début qui n'est pas une heure pleine", () => {
  ko('2026-11-04T14:30:00Z', '2026-11-04T16:00:00Z', 'slot_not_full_hour');
});
test('refuse un début avant 10 h ou à minuit', () => {
  ko('2026-11-04T09:00:00Z', '2026-11-04T11:00:00Z', 'slot_out_of_hours');
  ko('2026-11-05T00:00:00Z', '2026-11-05T02:00:00Z', 'slot_out_of_hours');
});
test('accepte un début à 23 h', () => {
  ok('2026-11-04T23:00:00Z', '2026-11-05T00:00:00Z');
});
test('refuse les dates sans fuseau UTC ou non ISO', () => {
  ko('2026-11-04T14:00:00+01:00', '2026-11-04T16:00:00Z', 'invalid_date');
  ko('pas une date', '2026-11-04T16:00:00Z', 'invalid_date');
  ko(undefined, '2026-11-04T16:00:00Z', 'invalid_date');
});

import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { startContext } from '../support/context.js';

let ctx;
before(async () => { ctx = await startContext(); });
after(async () => { await ctx.close(); });
beforeEach(async () => { await ctx.reset(); }); // chaque test repart des données de départ

const slot = (memberId, start, end) => ({ memberId, start, end });

test('GET /rooms -> 200, 4 salles', async () => {
  const r = await ctx.call('GET', '/rooms');
  assert.equal(r.status, 200);
  assert.deepEqual(r.body.map((x) => x.id), ['room-1', 'room-2', 'room-3', 'room-4']);
  assert.equal(r.body[3].maintenanceStart, '2026-11-05T00:00:00.000Z');
});

test('GET /rooms/:id/bookings -> 200 avec from/to, 404 salle inconnue', async () => {
  const r = await ctx.call('GET', '/rooms/room-1/bookings?from=2026-11-02T00:00:00Z&to=2026-11-09T00:00:00Z');
  assert.equal(r.status, 200);
  assert.deepEqual(r.body, [{ id: 'booking-1', roomId: 'room-1', memberId: 'member-1',
    start: '2026-11-03T18:00:00Z', end: '2026-11-03T20:00:00Z', status: 'confirmed' }]);
  assert.equal((await ctx.call('GET', '/rooms/nope/bookings')).status, 404);
});

test('GET /rooms/:id/bookings sans from/to -> la semaine à partir de maintenant', async () => {
  const r = await ctx.call('GET', '/rooms/room-2/bookings');
  assert.equal(r.status, 200);
  assert.deepEqual(r.body.map((b) => b.id), ['booking-3']); // booking-4 est passée
});

test('GET /rooms/:id/bookings avec dates invalides -> 400', async () => {
  assert.equal((await ctx.call('GET', '/rooms/room-1/bookings?from=hier')).status, 400);
});

test('POST /rooms/:id/bookings -> 201 + Location + corps du sujet', async () => {
  const r = await ctx.call('POST', '/rooms/room-1/bookings', slot('member-3', '2026-11-04T14:00:00Z', '2026-11-04T16:00:00Z'));
  assert.equal(r.status, 201);
  assert.equal(r.headers.get('location'), `/bookings/${r.body.id}`);
  assert.deepEqual({ ...r.body, id: undefined }, { id: undefined, roomId: 'room-1', memberId: 'member-3',
    start: '2026-11-04T14:00:00Z', end: '2026-11-04T16:00:00Z', status: 'confirmed' });
  const again = await ctx.call('GET', r.headers.get('location'));
  assert.equal(again.status, 200);
  assert.equal(again.body.id, r.body.id);
});

test('POST -> 400 (créneau invalide, JSON cassé, memberId absent)', async () => {
  assert.equal((await ctx.call('POST', '/rooms/room-1/bookings', slot('member-3', '2026-11-04T14:30:00Z', '2026-11-04T16:00:00Z'))).status, 400);
  assert.equal((await ctx.call('POST', '/rooms/room-1/bookings', slot('member-3', '2026-11-04T14:00:00Z', '2026-11-04T19:00:00Z'))).status, 400);
  assert.equal((await ctx.call('POST', '/rooms/room-1/bookings', { start: '2026-11-04T14:00:00Z', end: '2026-11-04T16:00:00Z' })).status, 400);
  const raw = await fetch(`${ctx.baseUrl}/rooms/room-1/bookings`, { method: 'POST', body: '{pas du json' });
  assert.equal(raw.status, 400);
});

test('POST -> 404 salle ou membre inconnu', async () => {
  assert.equal((await ctx.call('POST', '/rooms/nope/bookings', slot('member-3', '2026-11-04T14:00:00Z', '2026-11-04T16:00:00Z'))).status, 404);
  assert.equal((await ctx.call('POST', '/rooms/room-1/bookings', slot('nobody', '2026-11-04T14:00:00Z', '2026-11-04T16:00:00Z'))).status, 404);
});

test('POST -> 409 chevauchement, mais 201 pour un créneau collé', async () => {
  assert.equal((await ctx.call('POST', '/rooms/room-1/bookings', slot('member-3', '2026-11-03T19:00:00Z', '2026-11-03T21:00:00Z'))).status, 409);
  assert.equal((await ctx.call('POST', '/rooms/room-1/bookings', slot('member-3', '2026-11-03T20:00:00Z', '2026-11-03T22:00:00Z'))).status, 201);
});

test('POST -> 409 quota : member-1 a déjà 2 réservations à venir', async () => {
  const r = await ctx.call('POST', '/rooms/room-1/bookings', slot('member-1', '2026-11-04T14:00:00Z', '2026-11-04T16:00:00Z'));
  assert.equal(r.status, 409);
  assert.equal(r.body.error, 'member_quota');
});

test('POST -> 409 maintenance de la salle Björk', async () => {
  const r = await ctx.call('POST', '/rooms/room-4/bookings', slot('member-3', '2026-11-04T23:00:00Z', '2026-11-05T01:00:00Z'));
  assert.equal(r.status, 409);
  assert.equal(r.body.error, 'room_maintenance');
});

test('GET /bookings/:id -> 200 / 404', async () => {
  assert.equal((await ctx.call('GET', '/bookings/booking-1')).status, 200);
  assert.equal((await ctx.call('GET', '/bookings/nope')).status, 404);
});

test('DELETE -> 204 puis statut cancelled ; 409 la 2e fois ; 404 inconnue', async () => {
  assert.equal((await ctx.call('DELETE', '/bookings/booking-1')).status, 204);
  assert.equal((await ctx.call('GET', '/bookings/booking-1')).body.status, 'cancelled');
  assert.equal((await ctx.call('DELETE', '/bookings/booking-1')).status, 409);
  assert.equal((await ctx.call('DELETE', '/bookings/nope')).status, 404);
});

test('DELETE booking-3 (dans moins de 24 h) -> late_cancelled', async () => {
  await ctx.call('DELETE', '/bookings/booking-3');
  assert.equal((await ctx.call('GET', '/bookings/booking-3')).body.status, 'late_cancelled');
});

test('GET /members/:id/bookings -> 200 (annulées incluses) / 404', async () => {
  await ctx.call('DELETE', '/bookings/booking-1');
  const r = await ctx.call('GET', '/members/member-1/bookings');
  assert.equal(r.status, 200);
  assert.deepEqual(r.body.map((b) => [b.id, b.status]), [['booking-1', 'cancelled'], ['booking-2', 'confirmed']]);
  assert.equal((await ctx.call('GET', '/members/nobody/bookings')).status, 404);
});

test('route inconnue -> 404', async () => {
  assert.equal((await ctx.call('GET', '/nimportequoi')).status, 404);
});

// --- Concurrence : n'a de sens que contre la vraie base (contrainte d'exclusion + verrou membre)
test('deux POST simultanés sur le même créneau : un 201, un 409', { skip: process.env.TEST_BACKEND === 'memory' }, async () => {
  const mk = (m) => ctx.call('POST', '/rooms/room-1/bookings', slot(m, '2026-11-06T14:00:00Z', '2026-11-06T16:00:00Z'));
  const statuses = (await Promise.all([mk('member-2'), mk('member-3')])).map((r) => r.status).sort();
  assert.deepEqual(statuses, [201, 409]);
});

test('3 POST simultanés du même membre (créneaux distincts) : 2 passent au maximum', { skip: process.env.TEST_BACKEND === 'memory' }, async () => {
  const mk = (day) => ctx.call('POST', '/rooms/room-1/bookings', slot('member-3', `2026-11-0${day}T14:00:00Z`, `2026-11-0${day}T15:00:00Z`));
  const statuses = (await Promise.all([mk(4), mk(6), mk(7)])).map((r) => r.status).sort();
  assert.deepEqual(statuses, [201, 201, 409]);
});

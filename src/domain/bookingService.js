import { randomUUID } from 'node:crypto';
import { NotFoundError, ValidationError } from './errors.js';
import { validateSlot, parseUtc } from './rules/slot.js';
import { assertNoOverlap } from './rules/overlap.js';
import { assertQuota } from './rules/quota.js';
import { cancellationStatus } from './rules/cancellation.js';
import { assertNotInMaintenance } from './rules/maintenance.js';

const WEEK = 7 * 24 * 3600_000;

export const toDto = (b) => ({
  id: b.id,
  roomId: b.roomId,
  memberId: b.memberId,
  start: b.start.toISOString().replace('.000Z', 'Z'),
  end: b.end.toISOString().replace('.000Z', 'Z'),
  status: b.status,
});

// Cache nul : utilisé quand on ne veut pas de cache (tests, Valkey absent).
export const noCache = {
  get: async () => null,
  set: async () => {},
  invalidateRoom: async () => {},
};

/**
 * Orchestration des cas d'usage. Dépend de PORTS (repo, cache, clock) injectés :
 * aucune connaissance de HTTP, de pg ni de Valkey.
 */
export class BookingService {
  constructor({ repo, cache = noCache, clock, newId = () => `booking-${randomUUID()}` }) {
    this.repo = repo;
    this.cache = cache;
    this.clock = clock;
    this.newId = newId;
  }

  async listRooms() {
    return this.repo.listRooms();
  }

  async getPlanning(roomId, fromIso, toIso) {
    const room = await this.repo.getRoom(roomId);
    if (!room) throw new NotFoundError('salle introuvable', 'room_not_found');
    const now = this.clock.now();
    const from = fromIso ? parseUtc(fromIso, 'from') : now;
    const to = toIso ? parseUtc(toIso, 'to') : new Date(from.getTime() + WEEK);
    if (to <= from) throw new ValidationError('to doit être après from', 'invalid_range');

    const cached = await this.cache.get(roomId, from, to);
    if (cached) return cached;
    const planning = (await this.repo.listRoomBookings(roomId, from, to)).map(toDto);
    await this.cache.set(roomId, from, to, planning);
    return planning;
  }

  async createBooking(roomId, body) {
    if (!body || typeof body !== 'object' || typeof body.memberId !== 'string' || !body.memberId) {
      throw new ValidationError('memberId est obligatoire', 'invalid_body');
    }
    const slot = validateSlot(body.start, body.end);

    const room = await this.repo.getRoom(roomId);
    if (!room) throw new NotFoundError('salle introuvable', 'room_not_found');
    const member = await this.repo.getMember(body.memberId);
    if (!member) throw new NotFoundError('membre introuvable', 'member_not_found');

    assertNotInMaintenance(room, slot);

    const now = this.clock.now();
    const booking = await this.repo.transaction(async (tx) => {
      // Verrou sur la ligne du membre : sérialise ses créations concurrentes, sinon deux
      // requêtes simultanées liraient toutes deux "1 réservation" et passeraient à 3.
      await tx.lockMember(member.id);
      assertQuota(await tx.countUpcoming(member.id, now));
      assertNoOverlap(slot, await tx.activeInRoom(room.id, slot.start, slot.end));
      const b = { id: this.newId(), roomId: room.id, memberId: member.id, ...slot, status: 'confirmed' };
      await tx.insertBooking(b); // la contrainte d'exclusion reste le dernier rempart
      return b;
    });

    await this.cache.invalidateRoom(room.id);
    return toDto(booking);
  }

  async getBooking(id) {
    const b = await this.repo.getBooking(id);
    if (!b) throw new NotFoundError('réservation introuvable', 'booking_not_found');
    return toDto(b);
  }

  async cancelBooking(id) {
    const roomId = await this.repo.transaction(async (tx) => {
      const b = await tx.getBookingForUpdate(id);
      if (!b) throw new NotFoundError('réservation introuvable', 'booking_not_found');
      const status = cancellationStatus(b, this.clock.now());
      await tx.updateStatus(id, status, this.clock.now());
      return b.roomId;
    });
    await this.cache.invalidateRoom(roomId);
  }

  async listMemberBookings(memberId) {
    const member = await this.repo.getMember(memberId);
    if (!member) throw new NotFoundError('membre introuvable', 'member_not_found');
    return (await this.repo.listMemberBookings(memberId)).map(toDto);
  }
}

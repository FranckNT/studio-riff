import { ConflictError } from '../errors.js';

export const MAX_UPCOMING_BOOKINGS = 2;

// Règle sur un ENSEMBLE de réservations : le service la déclenche après avoir verrouillé
// la ligne du membre (voir DECISIONS.md), puis lui passe le nombre de réservations à venir.
export function assertQuota(upcomingCount) {
  if (upcomingCount >= MAX_UPCOMING_BOOKINGS) {
    throw new ConflictError(
      `un membre a au plus ${MAX_UPCOMING_BOOKINGS} réservations à venir`, 'member_quota');
  }
}

import { ConflictError } from '../errors.js';
import { overlaps } from './overlap.js';

// Une salle en maintenance refuse toute réservation qui empiète sur la période [debut, fin).
export function assertNotInMaintenance(room, slot) {
  if (!room.maintenanceStart) return;
  const maintenance = { start: room.maintenanceStart, end: room.maintenanceEnd };
  if (overlaps(slot, maintenance)) {
    throw new ConflictError('la salle est en maintenance sur cette période', 'room_maintenance');
  }
}

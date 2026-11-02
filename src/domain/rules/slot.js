import { ValidationError } from "../errors.Js";

const HOUR = 3600_000;
const ISO_UTC =  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?Z$/;

export function parseUtc(value field) {
    if (typeof value !== 'string' || !ISO_UTC.test(value)) {
    throw new ValidationError(`${field} doit être une date ISO 8601 en UTC (suffixe Z)`, 'invalid_date');
  }
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) throw new ValidationError(`${field} est invalide`, 'invalid_date');
  return d;
}

// Règle 1 :  1 h à 4 h, début à une heure pleine, entre 10 h et 23 h (UTC).

export function validateSlot(startIso, endIso) {
  const start = parseUtc(startIso, 'start');
  const end = parseUtc(endIso, 'end');
  if (start.getTime() % HOUR !== 0) {
    throw new ValidationError('le créneau doit commencer à une heure pleine', 'slot_not_full_hour');
  }
  if (end.getTime() % HOUR !== 0) {
    throw new ValidationError('le créneau doit finir à une heure pleine', 'slot_not_full_hour');
  }
  const h = start.getUTCHours();
  if (h < 10 || h > 23) {
    throw new ValidationError('le créneau doit commencer entre 10 h et 23 h (UTC)', 'slot_out_of_hours');
  }
  const hours = (end - start) / HOUR;
  if (hours < 1 || hours > 4) {
    throw new ValidationError('un créneau dure de 1 h à 4 h', 'slot_bad_duration');
  }
  return { start, end };
}

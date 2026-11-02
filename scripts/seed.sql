DELETE FROM bookings;

INSERT INTO rooms (id, name, capacity, maintenance_start, maintenance_end) VALUES
  ('room-1', 'Studio 1', 4, NULL, NULL),
  ('room-2', 'Studio 2', 4, NULL, NULL),
  ('room-3', 'Studio 3', 4, NULL, NULL),
  ('room-4', 'Björk', 4, '2026-11-05T00:00:00Z', '2026-11-08T00:00:00Z')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  capacity = EXCLUDED.capacity,
  maintenance_start = EXCLUDED.maintenance_start,
  maintenance_end = EXCLUDED.maintenance_end;

INSERT INTO members (id, name) VALUES
  ('member-1', 'Member 1'),
  ('member-2', 'Member 2'),
  ('member-3', 'Member 3'),
  ('member-4', 'Member 4')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

INSERT INTO bookings (id, room_id, member_id, start_at, end_at, status) VALUES
  ('booking-1', 'room-1', 'member-1', '2026-11-03T18:00:00Z', '2026-11-03T20:00:00Z', 'confirmed'),
  ('booking-2', 'room-4', 'member-1', '2026-11-04T10:00:00Z', '2026-11-04T12:00:00Z', 'confirmed'),
  ('booking-3', 'room-2', 'member-3', '2026-11-02T19:00:00Z', '2026-11-02T21:00:00Z', 'confirmed'),
  ('booking-4', 'room-3', 'member-2', '2026-11-01T10:00:00Z', '2026-11-01T12:00:00Z', 'confirmed'),
  ('booking-5', 'room-3', 'member-2', '2026-11-04T10:00:00Z', '2026-11-04T12:00:00Z', 'confirmed');

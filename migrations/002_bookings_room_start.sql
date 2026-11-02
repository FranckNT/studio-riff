CREATE INDEX bookings_room_start
  ON bookings (room_id, start_at)
  WHERE status = 'confirmed';

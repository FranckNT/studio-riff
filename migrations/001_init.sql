CREATE EXTENSION IF NOT EXISTS btree_gist;

DO $$ BEGIN
  EXECUTE format('ALTER DATABASE %I SET timezone = ''UTC''', current_database());
END $$;


CREATE TABLE rooms (
  id                text PRIMARY KEY,
  name              text NOT NULL,
  capacity          integer NOT NULL CHECK (capacity > 0),
  maintenance_start timestamptz,
  maintenance_end   timestamptz,
  CHECK ((maintenance_start IS NULL) = (maintenance_end IS NULL)),
  CHECK (maintenance_end IS NULL OR maintenance_end > maintenance_start)
);

CREATE TABLE members (
  id   text PRIMARY KEY,
  name text NOT NULL
);

CREATE TABLE bookings (
  id           text PRIMARY KEY,
  room_id      text NOT NULL REFERENCES rooms(id),
  member_id    text NOT NULL REFERENCES members(id),
  start_at     timestamptz NOT NULL,
  end_at       timestamptz NOT NULL,
  status       text NOT NULL DEFAULT 'confirmed'
               CHECK (status IN ('confirmed', 'cancelled', 'late_cancelled')),
  cancelled_at timestamptz,


  
  CHECK (end_at > start_at),
  CHECK (end_at - start_at BETWEEN interval '1 hour' AND interval '4 hours'),
  CHECK (start_at = date_trunc('hour', start_at AT TIME ZONE 'UTC') AT TIME ZONE 'UTC'),
  CHECK (extract(hour FROM start_at AT TIME ZONE 'UTC') BETWEEN 10 AND 23),


  CONSTRAINT bookings_no_overlap
    EXCLUDE USING gist (room_id WITH =, tstzrange(start_at, end_at, '[)') WITH &&)
    WHERE (status = 'confirmed')
);

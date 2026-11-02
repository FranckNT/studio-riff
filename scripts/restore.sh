#!/usr/bin/env bash
set -euo pipefail

: "${DATABASE_URL:?DATABASE_URL (source database) must be set}"
: "${TARGET_DATABASE_URL:?TARGET_DATABASE_URL (new target database) must be set}"
if [[ $# -ne 1 || ! -f "$1" ]]; then
  printf 'Usage: %s <backup-archive>\n' "$0" >&2
  exit 2
fi

source_database="$(psql -X -A -t "$DATABASE_URL" -c 'SELECT current_database()')"
target_database="$(psql -X -A -t "$TARGET_DATABASE_URL" -c 'SELECT current_database()')"
if [[ "$source_database" == "$target_database" ]]; then
  printf 'Refusing to restore into the source database.\n' >&2
  exit 2
fi

pg_restore --exit-on-error --no-owner --no-acl --dbname="$TARGET_DATABASE_URL" "$1"
count_query="SELECT (SELECT count(*) FROM rooms) || ':' || (SELECT count(*) FROM members) || ':' || (SELECT count(*) FROM bookings)"
source_counts="$(psql -X -A -t "$DATABASE_URL" -c "$count_query")"
target_counts="$(psql -X -A -t "$TARGET_DATABASE_URL" -c "$count_query")"
printf 'Source rooms:members:bookings = %s\n' "$source_counts"
printf 'Target rooms:members:bookings = %s\n' "$target_counts"
if [[ "$source_counts" != "$target_counts" ]]; then
  printf 'Restored row counts do not match the source.\n' >&2
  exit 1
fi
printf 'Restore verified in a database distinct from the source.\n'

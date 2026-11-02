#!/usr/bin/env bash
set -euo pipefail

: "${DATABASE_URL:?DATABASE_URL must be set}"
BACKUP_DIR="${BACKUP_DIR:-backups}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
mkdir -p "$BACKUP_DIR"

timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
archive="$BACKUP_DIR/studio-riff-$timestamp.dump"
pg_dump --format=custom --file="$archive" "$DATABASE_URL"
find "$BACKUP_DIR" -type f -name 'studio-riff-*.dump' -mtime "+$RETENTION_DAYS" -delete
printf 'Backup created: %s\n' "$archive"

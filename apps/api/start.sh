#!/bin/sh
set -e


if [ -z "$DATABASE_URL" ]; then
  echo "Error: DATABASE_URL is missing!"
  exit 1
fi

if [ -z "$JWT_SECRET" ]; then
  echo "Error: JWT_SECRET is missing!"
  exit 1
fi

echo "Running database migrations..."
cd /app/apps/api

if [ "$SKIP_MIGRATIONS" = "true" ]; then
  echo "Skipping migrations (SKIP_MIGRATIONS=true)."
else
  MIGRATIONS_TABLE=$(psql "$DATABASE_URL" -Atc "select to_regclass('public._prisma_migrations');" || echo "")
  if [ -z "$MIGRATIONS_TABLE" ] || [ "$MIGRATIONS_TABLE" = "null" ]; then
    echo "Skipping migrations (no _prisma_migrations table found)."
  else
    npx prisma migrate deploy
  fi
fi

echo "Starting application..."
cd /app/apps/api
node dist/src/main.js

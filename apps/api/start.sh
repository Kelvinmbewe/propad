#!/bin/sh
set -e

echo "Running migrations..."
pnpm --filter @propad/api exec prisma migrate deploy --schema ./prisma/schema.prisma

echo "Starting application..."
node apps/api/dist/src/main.js

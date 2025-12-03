#!/bin/sh
set -e

echo "Running migrations..."
echo "Current directory: $(pwd)"
ls -la
find . -name prisma -type f | grep bin || echo "prisma binary not found"
pnpm --filter @propad/api exec prisma migrate deploy --schema apps/api/prisma/schema.prisma

echo "Starting application..."
node apps/api/dist/main.js

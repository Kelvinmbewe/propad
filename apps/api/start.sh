#!/bin/sh
set -e

echo "Running migrations..."
npx prisma migrate deploy --schema apps/api/prisma/schema.prisma

echo "Starting application..."
node apps/api/dist/main.js

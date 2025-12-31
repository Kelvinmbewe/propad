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



echo "Starting application..."
node apps/api/dist/src/main.js

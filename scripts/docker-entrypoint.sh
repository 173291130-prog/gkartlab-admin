#!/bin/sh
set -e

mkdir -p /app/data /app/storage/uploads /app/storage/generated

pnpm exec prisma db push
pnpm exec tsx scripts/seed-if-empty.ts

exec pnpm start -- -H 0.0.0.0 -p 3000

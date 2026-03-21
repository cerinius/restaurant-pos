#!/bin/bash
echo "ð Starting RestaurantOS development environment..."

# Start databases
docker-compose -f docker-compose.dev.yml up -d
echo "â³ Waiting for PostgreSQL..."
until docker exec pos_postgres_dev pg_isready -U posuser -d restaurant_pos 2>/dev/null; do
  sleep 1
done
echo "â PostgreSQL ready"

# Generate and migrate
npm run db:generate
npm run db:migrate
npm run db:seed

# Start dev servers
npm run dev

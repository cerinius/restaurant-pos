#!/bin/bash
echo "ð Starting RestaurantOS production..."

docker-compose up -d --build

echo "â³ Waiting for services..."
sleep 10

# Run migrations in API container
docker exec pos_api npx prisma migrate deploy --schema=/app/prisma/schema.prisma
docker exec pos_api node -e "
  const { execSync } = require('child_process');
  try { execSync('node dist/seed.js', { stdio: 'inherit' }); } catch(e) { console.log('Seed skipped (already seeded)'); }
"

echo ""
echo "â RestaurantOS is running!"
echo "   POS Terminal: http://localhost:3000/pos"
echo "   Admin Panel:  http://localhost:3000/admin"
echo "   KDS Screen:   http://localhost:3000/kds"
echo "   API Docs:     http://localhost:3001/docs"
echo "   pgAdmin:      Not available in production mode"
echo ""
echo "ð Default PINs: Owner=1234, Manager=2222, Server=3333, Bar=4444"

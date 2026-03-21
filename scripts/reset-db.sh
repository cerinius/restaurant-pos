#!/bin/bash
echo "â ï¸  Resetting database..."
read -p "Are you sure? This will delete all data. (y/N): " confirm
if [ "$confirm" = "y" ]; then
  docker exec pos_postgres_dev psql -U posuser -c "DROP DATABASE IF EXISTS restaurant_pos;"
  docker exec pos_postgres_dev psql -U posuser -c "CREATE DATABASE restaurant_pos;"
  npm run db:migrate
  npm run db:seed
  echo "â Database reset complete"
else
  echo "Cancelled"
fi

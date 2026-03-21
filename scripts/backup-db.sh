#!/bin/bash
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="backups/pos_backup_$TIMESTAMP.sql"
mkdir -p backups
docker exec pos_postgres pg_dump -U posuser restaurant_pos > $BACKUP_FILE
echo "â Database backed up to $BACKUP_FILE"

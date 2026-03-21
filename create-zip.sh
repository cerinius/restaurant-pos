
#!/bin/bash
# Creates the complete RestaurantOS ZIP archive
# Run: chmod +x create-zip.sh && ./create-zip.sh

set -e

echo "ð¦ Creating RestaurantOS ZIP archive..."

ZIP_NAME="restaurant-pos-complete.zip"

# Remove old zip if exists
rm -f $ZIP_NAME

# Create zip excluding unnecessary files
zip -r $ZIP_NAME restaurant-pos/ \
  --exclude "*/node_modules/*" \
  --exclude "*/.next/*" \
  --exclude "*/dist/*" \
  --exclude "*/.git/*" \
  --exclude "*/backups/*" \
  --exclude "*.tsbuildinfo" \
  --exclude "*/prisma/migrations/dev/*"

echo ""
echo "â ZIP created: $ZIP_NAME"
echo "   Size: $(du -sh $ZIP_NAME | cut -f1)"
echo ""
echo "ð To install:"
echo "   unzip $ZIP_NAME"
echo "   cd restaurant-pos"
echo "   make dev"

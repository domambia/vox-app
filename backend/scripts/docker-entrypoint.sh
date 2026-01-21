#!/bin/sh
set -e

echo "🚀 Starting VOX Backend..."

# Wait for database to be ready using Prisma
echo "⏳ Waiting for database to be ready..."
max_attempts=30
attempt=0

while [ $attempt -lt $max_attempts ]; do
  # Try to connect using a simple Node.js script
  if node -e "
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    prisma.\$connect()
      .then(() => {
        prisma.\$disconnect();
        process.exit(0);
      })
      .catch(() => {
        process.exit(1);
      });
  " 2>/dev/null; then
    echo "✅ Database is ready!"
    break
  fi
  
  attempt=$((attempt + 1))
  if [ $attempt -lt $max_attempts ]; then
    echo "   Database is unavailable - sleeping (attempt $attempt/$max_attempts)"
    sleep 2
  fi
done

if [ $attempt -eq $max_attempts ]; then
  echo "❌ Database connection failed after $max_attempts attempts"
  exit 1
fi

# Generate Prisma Client (in case it's not generated)
echo "📦 Generating Prisma Client..."
npx prisma generate

# Apply migrations
echo "🔄 Applying database migrations..."
if [ "$NODE_ENV" = "production" ]; then
  # Production: use migrate deploy
  if npx prisma migrate deploy; then
    echo "✅ Migrations applied successfully!"
  else
    echo "⚠️  Migration deploy failed, trying db push as fallback..."
    if npx prisma db push --accept-data-loss; then
      echo "✅ Database schema pushed successfully!"
    else
      echo "❌ Failed to apply migrations"
      exit 1
    fi
  fi
else
  # Development: use db push (faster, no migration files needed)
  if npx prisma db push --accept-data-loss; then
    echo "✅ Database schema pushed successfully!"
  else
    echo "⚠️  DB push failed, trying migrate deploy..."
    if npx prisma migrate deploy; then
      echo "✅ Migrations applied successfully!"
    else
      echo "❌ Failed to apply database schema"
      exit 1
    fi
  fi
fi

# Run seed
echo "🌱 Seeding database..."
if npx prisma db seed; then
  echo "✅ Database seeded successfully!"
else
  echo "⚠️  Seed failed, but continuing..."
fi

# Start the server
echo "🚀 Starting server..."
exec "$@"

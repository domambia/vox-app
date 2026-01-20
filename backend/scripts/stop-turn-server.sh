#!/bin/bash

# Stop TURN Server Script

echo "🛑 Stopping TURN Server..."

if docker ps | grep -q vox-turn-server; then
    if docker compose version &> /dev/null; then
        docker compose -f docker-compose.turn.yml down
    else
        docker-compose -f docker-compose.turn.yml down
    fi
    echo "✅ TURN server stopped"
else
    echo "ℹ️  TURN server is not running"
fi


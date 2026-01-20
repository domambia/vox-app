#!/bin/bash

# TURN Server Setup Script for VOX Backend
# This script helps set up a TURN server for WebRTC testing

set -e

echo "🚀 Setting up TURN Server for VOX Backend..."

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    echo "   Visit: https://docs.docker.com/get-docker/"
    exit 1
fi

# Check if docker-compose is installed
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo "❌ docker-compose is not installed. Please install docker-compose first."
    exit 1
fi

# Create turnserver.conf if it doesn't exist
if [ ! -f "turnserver.conf" ]; then
    echo "📝 Creating turnserver.conf..."
    cp turnserver.conf.example turnserver.conf 2>/dev/null || cat > turnserver.conf << 'EOF'
# TURN Server Configuration for VOX - Testing
listening-port=3478
tls-listening-port=5349
min-port=49152
max-port=65535
realm=vox-app.local
user=testuser:testpass123
no-auth
verbose
log-file=/var/log/turnserver.log
fingerprint
EOF
    echo "✅ Created turnserver.conf"
fi

# Get public IP (if available)
PUBLIC_IP=$(curl -s ifconfig.me 2>/dev/null || curl -s icanhazip.com 2>/dev/null || echo "")
if [ -n "$PUBLIC_IP" ]; then
    echo "🌐 Detected public IP: $PUBLIC_IP"
    echo "   You may want to add this to turnserver.conf as external-ip"
fi

# Start TURN server with Docker
echo "🐳 Starting TURN server with Docker..."
if docker compose version &> /dev/null; then
    docker compose -f docker-compose.turn.yml up -d
else
    docker-compose -f docker-compose.turn.yml up -d
fi

# Wait for server to start
echo "⏳ Waiting for TURN server to start..."
sleep 3

# Check if server is running
if docker ps | grep -q vox-turn-server; then
    echo "✅ TURN server is running!"
    echo ""
    echo "📋 Server Information:"
    echo "   - STUN/TURN URL: stun:localhost:3478"
    echo "   - TURN URL: turn:localhost:3478"
    echo "   - Username: testuser"
    echo "   - Password: testpass123"
    echo ""
    echo "🔧 Update your .env file with:"
    echo "   TURN_SERVER_URL=turn:localhost:3478"
    echo "   TURN_USERNAME=testuser"
    echo "   TURN_CREDENTIAL=testpass123"
    echo ""
    echo "📝 For production, update turnserver.conf with:"
    echo "   - Strong passwords"
    echo "   - TLS certificates"
    echo "   - External IP address"
    echo "   - Remove 'no-auth' option"
    echo ""
    echo "🧪 Test the server:"
    echo "   Visit: https://webrtc.github.io/samples/src/content/peerconnection/trickle-ice/"
    echo "   Add server: turn:localhost:3478"
    echo "   Username: testuser"
    echo "   Password: testpass123"
else
    echo "❌ Failed to start TURN server. Check logs with:"
    echo "   docker logs vox-turn-server"
    exit 1
fi


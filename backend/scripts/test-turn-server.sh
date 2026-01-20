#!/bin/bash

# TURN Server Test Script
# Tests if the TURN server is working correctly

set -e

echo "🧪 Testing TURN Server..."

TURN_HOST="${TURN_HOST:-localhost}"
TURN_PORT="${TURN_PORT:-3478}"
TURN_USER="${TURN_USER:-testuser}"
TURN_PASS="${TURN_PASS:-testpass123}"

echo "Testing connection to $TURN_HOST:$TURN_PORT..."

# Test 1: Check if server is running
if ! docker ps | grep -q vox-turn-server; then
    echo "❌ TURN server container is not running"
    echo "   Start it with: ./scripts/setup-turn-server.sh"
    exit 1
fi

echo "✅ TURN server container is running"

# Test 2: Check if port is accessible
if command -v nc &> /dev/null; then
    if nc -z -u $TURN_HOST $TURN_PORT 2>/dev/null; then
        echo "✅ UDP port $TURN_PORT is accessible"
    else
        echo "⚠️  UDP port $TURN_PORT may not be accessible"
    fi
    
    if nc -z $TURN_HOST $TURN_PORT 2>/dev/null; then
        echo "✅ TCP port $TURN_PORT is accessible"
    else
        echo "⚠️  TCP port $TURN_PORT may not be accessible"
    fi
else
    echo "⚠️  netcat (nc) not installed, skipping port test"
fi

# Test 3: Check server logs
echo ""
echo "📋 Recent server logs:"
docker logs --tail 10 vox-turn-server 2>/dev/null || echo "   Could not retrieve logs"

# Test 4: Test with stunclient (if available)
if command -v stunclient &> /dev/null; then
    echo ""
    echo "🧪 Testing with stunclient..."
    stunclient $TURN_HOST $TURN_PORT || echo "   stunclient test failed"
else
    echo ""
    echo "💡 Install stunclient for more detailed testing:"
    echo "   macOS: brew install stun"
    echo "   Linux: apt-get install stun-client"
fi

echo ""
echo "✅ Basic tests completed!"
echo ""
echo "🌐 For comprehensive testing, use:"
echo "   https://webrtc.github.io/samples/src/content/peerconnection/trickle-ice/"
echo ""
echo "   Server URL: turn:$TURN_HOST:$TURN_PORT"
echo "   Username: $TURN_USER"
echo "   Password: $TURN_PASS"


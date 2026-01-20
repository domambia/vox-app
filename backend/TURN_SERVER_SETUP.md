# TURN Server Setup Guide

## Overview

This guide explains how to set up a TURN (Traversal Using Relays around NAT) server for WebRTC voice calls in the VOX backend. TURN servers are essential for NAT traversal when direct peer-to-peer connections fail.

## What is a TURN Server?

A TURN server acts as a relay for WebRTC media streams when:
- Users are behind strict NATs
- Firewalls block direct peer connections
- Symmetric NAT prevents direct connection

**Flow:**
1. STUN server tries direct connection (free, fast)
2. If STUN fails, TURN server relays traffic (requires server, some latency)

## Quick Start (Testing)

### Option 1: Docker (Recommended)

The easiest way to set up a TURN server for testing:

```bash
# 1. Start TURN server
npm run turn:setup

# 2. Test the server
npm run turn:test

# 3. Update .env file
echo "TURN_SERVER_URL=turn:localhost:3478" >> .env
echo "TURN_USERNAME=testuser" >> .env
echo "TURN_CREDENTIAL=testpass123" >> .env

# 4. Restart your backend
npm run dev
```

### Option 2: Manual Installation

#### macOS

```bash
# Install coturn
brew install coturn

# Copy configuration
sudo cp turnserver.conf /etc/turnserver.conf

# Edit configuration
sudo nano /etc/turnserver.conf

# Start service
brew services start coturn
```

#### Ubuntu/Debian

```bash
# Install coturn
sudo apt-get update
sudo apt-get install coturn

# Copy configuration
sudo cp turnserver.conf /etc/turnserver.conf

# Edit configuration
sudo nano /etc/turnserver.conf

# Start service
sudo systemctl start coturn
sudo systemctl enable coturn
```

## Configuration

### Testing Configuration (`turnserver.conf`)

```conf
listening-port=3478
realm=vox-app.local
user=testuser:testpass123
no-auth  # For testing only!
min-port=49152
max-port=65535
```

**⚠️ Warning:** The `no-auth` option is for testing only. Remove it for production!

### Production Configuration

For production, use `turnserver.production.conf`:

1. **Remove `no-auth`** - Require authentication
2. **Use strong passwords** - Generate secure credentials
3. **Set external IP** - Required if server is behind NAT
4. **Enable TLS/DTLS** - For secure connections
5. **Configure database** - For user management

```conf
# Production settings
listening-port=3478
tls-listening-port=5349
realm=turn.vox.app
user=production-user:STRONG_PASSWORD
# no-auth  # REMOVED for production

# External IP (REQUIRED)
external-ip=YOUR_PUBLIC_IP

# TLS certificates
cert=/path/to/cert.pem
pkey=/path/to/key.pem

# Database for user management
psql-userdb="host=localhost dbname=coturn user=coturn password=..."
```

## Environment Variables

Add to your `.env` file:

```env
# TURN Server Configuration
TURN_SERVER_URL=turn:localhost:3478
TURN_USERNAME=testuser
TURN_CREDENTIAL=testpass123
```

For production:
```env
TURN_SERVER_URL=turn:turn.vox.app:3478
TURN_USERNAME=production-user
TURN_CREDENTIAL=STRONG_PASSWORD_HERE
```

## Testing

### 1. Test with Online Tool

Visit: https://webrtc.github.io/samples/src/content/peerconnection/trickle-ice/

1. Click "Add Server"
2. Enter:
   - **Server URL:** `turn:localhost:3478`
   - **Username:** `testuser`
   - **Password:** `testpass123`
3. Click "Add"
4. Click "Gather candidates"
5. Look for `relay` candidates (indicates TURN is working)

### 2. Test with Script

```bash
npm run turn:test
```

### 3. Test from Backend

```bash
# Start backend
npm run dev

# In another terminal, test the config endpoint
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3000/api/v1/calls/webrtc-config
```

Expected response:
```json
{
  "success": true,
  "data": {
    "iceServers": [
      { "urls": "stun:stun.l.google.com:19302" },
      { "urls": "stun:stun1.l.google.com:19302" },
      {
        "urls": "turn:localhost:3478",
        "username": "testuser",
        "credential": "testpass123"
      }
    ]
  }
}
```

## Docker Setup Details

### Using Docker Compose

The `docker-compose.turn.yml` file sets up coturn in a container:

```yaml
services:
  coturn:
    image: coturn/coturn:latest
    network_mode: host
    volumes:
      - ./turnserver.conf:/etc/turnserver.conf:ro
```

**Why `network_mode: host`?**
- TURN server needs to bind to specific ports
- Host networking simplifies port management
- For production, use bridge networking with port mapping

### Start/Stop Commands

```bash
# Start
npm run turn:setup
# Or: docker compose -f docker-compose.turn.yml up -d

# Stop
npm run turn:stop
# Or: docker compose -f docker-compose.turn.yml down

# View logs
npm run turn:logs
# Or: docker logs -f vox-turn-server
```

## Production Deployment

### Option 1: Same Server

Run TURN server on the same server as your backend:

```bash
# Install coturn
sudo apt-get install coturn

# Configure
sudo cp turnserver.production.conf /etc/turnserver.conf
sudo nano /etc/turnserver.conf

# Update external-ip with your public IP
# Update passwords
# Remove no-auth

# Start
sudo systemctl start coturn
sudo systemctl enable coturn
```

### Option 2: Separate Server

Run TURN server on a dedicated server:

1. **Set up server** (Ubuntu/Debian recommended)
2. **Install coturn**
3. **Configure firewall:**
   ```bash
   # Allow TURN ports
   sudo ufw allow 3478/tcp
   sudo ufw allow 3478/udp
   sudo ufw allow 49152:65535/udp
   ```
4. **Configure coturn** with public IP
5. **Update backend `.env`** with TURN server URL

### Option 3: Cloud TURN Service

Use a managed TURN service:

- **Twilio TURN** (paid, reliable)
- **Metered.ca TURN** (paid, good pricing)
- **Xirsys** (paid, global network)

Update `.env`:
```env
TURN_SERVER_URL=turn:your-provider.com:3478
TURN_USERNAME=your-username
TURN_CREDENTIAL=your-credential
```

## Security Considerations

### Testing Environment
- ✅ `no-auth` is acceptable
- ✅ Simple passwords are fine
- ✅ Localhost access only

### Production Environment
- ❌ **Never use `no-auth`**
- ❌ **Never use simple passwords**
- ✅ Use strong, randomly generated passwords
- ✅ Enable TLS/DTLS encryption
- ✅ Restrict access with firewall rules
- ✅ Use database for user management
- ✅ Monitor and log access
- ✅ Set up rate limiting

## Troubleshooting

### Port Already in Use

```bash
# Check what's using port 3478
sudo lsof -i :3478

# Change port in turnserver.conf
listening-port=3479

# Update .env
TURN_SERVER_URL=turn:localhost:3479
```

### Connection Fails

1. **Check server is running:**
   ```bash
   docker ps | grep vox-turn-server
   # Or:
   sudo systemctl status coturn
   ```

2. **Check firewall:**
   ```bash
   sudo ufw status
   # Allow ports if needed
   sudo ufw allow 3478/tcp
   sudo ufw allow 3478/udp
   ```

3. **Check logs:**
   ```bash
   docker logs vox-turn-server
   # Or:
   sudo journalctl -u coturn -f
   ```

### NAT Traversal Still Fails

1. **Verify external IP is set:**
   ```conf
   external-ip=YOUR_PUBLIC_IP
   ```

2. **Test from external network:**
   - Use mobile hotspot
   - Test from different network
   - Use online testing tools

3. **Check TURN server is accessible:**
   ```bash
   # From external network
   telnet YOUR_PUBLIC_IP 3478
   ```

### High Latency

- TURN adds latency (relay through server)
- This is expected for NAT traversal
- Consider optimizing network path
- Use geographically close TURN servers

## Performance Tuning

### Resource Limits

```conf
# Limit total bandwidth
total-quota=1000  # MB per hour

# Limit per user
user-quota=100  # MB per hour

# Limit connections
max-allocate-lifetime=3600
max-allocate-timeout=60
```

### Port Range

```conf
# Smaller range = less resources
min-port=50000
max-port=55000
```

## Monitoring

### Check Server Status

```bash
# Docker
docker stats vox-turn-server

# System service
sudo systemctl status coturn
```

### View Logs

```bash
# Docker
docker logs -f vox-turn-server

# System service
sudo journalctl -u coturn -f
```

### Metrics

coturn provides metrics via CLI (if enabled):
```bash
# Connect to CLI
telnet localhost 5766

# Commands:
# users - list users
# sessions - list sessions
# quit - exit
```

## Cost Considerations

### Self-Hosted (Free)
- ✅ No per-minute charges
- ✅ Full control
- ❌ Server costs
- ❌ Maintenance overhead

### Cloud Service (Paid)
- ✅ Managed service
- ✅ Global network
- ✅ High reliability
- ❌ Per-GB or per-minute costs

**Recommendation:** Start with self-hosted for testing, consider cloud service for production scale.

## Next Steps

1. ✅ Set up TURN server for testing
2. ✅ Test WebRTC calls with TURN
3. ⬜ Configure production TURN server
4. ⬜ Set up monitoring
5. ⬜ Optimize performance
6. ⬜ Document production deployment

## References

- [coturn Documentation](https://github.com/coturn/coturn)
- [WebRTC TURN Server Guide](https://webrtc.org/getting-started/turn-server)
- [TURN Server Testing](https://webrtc.github.io/samples/src/content/peerconnection/trickle-ice/)


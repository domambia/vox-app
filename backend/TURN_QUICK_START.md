# TURN Server Quick Start

## 🚀 3-Step Setup for Testing

### Step 1: Start TURN Server

```bash
cd backend
npm run turn:setup
```

This will:
- Check Docker is installed
- Create `turnserver.conf` if needed
- Start coturn in Docker container
- Display connection details

### Step 2: Add to .env

Add these lines to your `.env` file:

```env
TURN_SERVER_URL=turn:localhost:3478
TURN_USERNAME=testuser
TURN_CREDENTIAL=testpass123
```

### Step 3: Test

```bash
# Test the server
npm run turn:test

# Or test with online tool:
# Visit: https://webrtc.github.io/samples/src/content/peerconnection/trickle-ice/
# Add server: turn:localhost:3478
# Username: testuser
# Password: testpass123
```

## ✅ Verify It Works

1. **Check container is running:**
   ```bash
   docker ps | grep vox-turn-server
   ```

2. **Check backend config endpoint:**
   ```bash
   # Start backend
   npm run dev
   
   # In another terminal, test (replace YOUR_TOKEN)
   curl -H "Authorization: Bearer YOUR_TOKEN" \
     http://localhost:3000/api/v1/calls/webrtc-config
   ```

3. **Expected response includes TURN server:**
   ```json
   {
     "iceServers": [
       { "urls": "stun:stun.l.google.com:19302" },
       { "urls": "turn:localhost:3478", "username": "testuser", "credential": "testpass123" }
     ]
   }
   ```

## 🛑 Stop Server

```bash
npm run turn:stop
```

## 📋 Useful Commands

```bash
# Start TURN server
npm run turn:setup

# Test TURN server
npm run turn:test

# Stop TURN server
npm run turn:stop

# View logs
npm run turn:logs
```

## 🔧 Troubleshooting

**Port already in use?**
- Change port in `turnserver.conf`: `listening-port=3479`
- Update `.env`: `TURN_SERVER_URL=turn:localhost:3479`

**Docker not installed?**
- Install Docker: https://docs.docker.com/get-docker/
- Or use manual installation (see `TURN_SERVER_SETUP.md`)

**Connection fails?**
- Check firewall: `sudo ufw status`
- Allow ports: `sudo ufw allow 3478/tcp && sudo ufw allow 3478/udp`
- Check logs: `npm run turn:logs`

## 📚 More Info

- Full guide: `TURN_SERVER_SETUP.md`
- Production setup: See `turnserver.production.conf`


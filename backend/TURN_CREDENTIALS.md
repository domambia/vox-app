# TURN Server Credentials

## Default Credentials (Testing)

The TURN server is configured with the following **default credentials** for testing:

### From docker-compose.yml and docker-compose.dev.yml:

```yaml
TURN_SERVER_URL: turn:turn:3478    # For Docker network (service name: "turn")
TURN_USERNAME: testuser
TURN_CREDENTIAL: testpass123
```

### From turnserver.conf:

```
user=testuser:testpass123
```

## Credential Details

| Setting | Default Value | Description |
|---------|--------------|-------------|
| **TURN_SERVER_URL** | `turn:turn:3478` | TURN server URL (Docker service name) |
| **TURN_USERNAME** | `testuser` | Username for TURN authentication |
| **TURN_CREDENTIAL** | `testpass123` | Password for TURN authentication |

## Usage in .env File

Add these to your `.env` file:

```env
# TURN Server Configuration
TURN_SERVER_URL=turn:localhost:3478    # For external access (from host)
# OR
TURN_SERVER_URL=turn:turn:3478         # For internal access (from Docker network)

TURN_USERNAME=testuser
TURN_CREDENTIAL=testpass123
```

## Important Notes

### For Testing/Development:
- ✅ Default credentials (`testuser`/`testpass123`) are fine
- ✅ `no-auth` is enabled in `turnserver.conf` (no authentication required)
- ✅ Works with Docker Compose setup

### For Production:
- ❌ **Change these credentials!**
- ❌ Remove `no-auth` from `turnserver.conf`
- ✅ Use strong, randomly generated passwords
- ✅ Update both `turnserver.conf` and `.env` files

## Server URL Variations

The TURN server URL depends on where you're accessing it from:

1. **From Docker network (backend service):**
   ```
   turn:turn:3478
   ```
   Uses the Docker service name `turn`

2. **From host machine (localhost):**
   ```
   turn:localhost:3478
   ```
   For testing from your local machine

3. **From external network (production):**
   ```
   turn:your-domain.com:3478
   ```
   Or your public IP address

## Verification

To verify the credentials work:

1. **Test from backend container:**
   ```bash
   docker compose exec backend curl http://localhost:3000/api/v1/calls/webrtc-config
   ```

2. **Test with online tool:**
   - Visit: https://webrtc.github.io/samples/src/content/peerconnection/trickle-ice/
   - Add server: `turn:localhost:3478`
   - Username: `testuser`
   - Password: `testpass123`

3. **Check turnserver.conf:**
   ```bash
   cat turnserver.conf | grep user
   # Should show: user=testuser:testpass123
   ```

## Changing Credentials

To change the credentials:

1. **Update turnserver.conf:**
   ```conf
   user=newusername:newpassword123
   ```

2. **Update .env:**
   ```env
   TURN_USERNAME=newusername
   TURN_CREDENTIAL=newpassword123
   ```

3. **Restart TURN server:**
   ```bash
   docker compose restart turn
   ```

4. **Restart backend:**
   ```bash
   docker compose restart backend
   ```

## Security Warning

⚠️ **The default credentials are for testing only!**

For production:
- Generate strong passwords (32+ characters)
- Use different credentials for each environment
- Consider using database-backed authentication
- Enable TLS/DTLS encryption
- Remove `no-auth` option


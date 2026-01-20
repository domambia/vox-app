# VOX Backend API

Backend API for the VOX Community Platform, built with Node.js, Express, TypeScript, and Prisma.

## Features

- ✅ TypeScript for type safety
- ✅ Express.js RESTful API
- ✅ Prisma ORM with PostgreSQL
- ✅ JWT Authentication
- ✅ File upload handling (local storage)
- ✅ Request validation with Zod
- ✅ Error handling middleware
- ✅ Rate limiting
- ✅ Winston logging
- ✅ Health check endpoints

## Prerequisites

### Option 1: Docker (Recommended)
- Docker 20.10+
- Docker Compose 2.0+

### Option 2: Local Development
- Node.js 18+ 
- PostgreSQL 14+
- npm or yarn

## Setup

### Docker Setup (Recommended)

See [DOCKER_SETUP.md](./DOCKER_SETUP.md) for complete Docker setup guide.

**Quick start:**
```bash
# 1. Create .env file
cp .env.docker.example .env
# Edit .env with your values

# 2. Start all services
npm run docker:up

# 3. Run migrations
npm run docker:migrate

# 4. (Optional) Seed database
docker compose exec backend npm run prisma:seed
```

### Local Development Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Variables

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

Required variables:
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - Secret key for JWT tokens
- `JWT_REFRESH_SECRET` - Secret key for refresh tokens

### 3. Database Setup

```bash
# Generate Prisma Client
npm run prisma:generate

# Run migrations
npm run prisma:migrate

# (Optional) Open Prisma Studio to view data
npm run prisma:studio
```

### 4. Create Upload Directories

The upload directories will be created automatically on first run, but you can create them manually:

```bash
mkdir -p uploads/profiles uploads/kyc uploads/voice-bios uploads/events
mkdir -p logs
```

## Development

```bash
# Start development server with hot reload
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

The API will be available at `http://localhost:3000`

## API Endpoints

### Health Check
- `GET /api/v1/health` - Health check
- `GET /api/v1/health/ready` - Readiness check
- `GET /api/v1/health/live` - Liveness check

### File Serving
- `GET /api/v1/files/:fileType/:filename` - Serve uploaded files (requires authentication)

## Project Structure

```
backend/
├── src/
│   ├── config/          # Configuration files
│   ├── controllers/     # Request handlers
│   ├── middleware/      # Express middleware
│   ├── routes/          # API routes
│   ├── services/        # Business logic
│   ├── types/           # TypeScript types
│   ├── utils/           # Utility functions
│   ├── app.ts           # Express app setup
│   └── server.ts         # Server entry point
├── prisma/              # Prisma schema and migrations
├── uploads/             # Local file storage
└── tests/               # Test files
```

## File Upload

Files are stored locally in the `uploads/` directory, organized by type:
- `uploads/profiles/` - Profile pictures
- `uploads/kyc/` - KYC documents
- `uploads/voice-bios/` - Voice bio recordings
- `uploads/events/` - Event images

Files are served via `/api/v1/files/:fileType/:filename` endpoint.

## Database Schema

The database schema is defined in `prisma/schema.prisma` and includes:
- Users
- Profiles
- Groups
- Group Members
- Friendships
- Events
- Event RSVPs
- KYC Verifications
- Likes
- Matches

## API Documentation

Swagger UI documentation is available at:

- **Swagger UI**: `http://localhost:3000/api-docs`
- **Swagger JSON**: `http://localhost:3000/api-docs/json`

See [SWAGGER_SETUP.md](./SWAGGER_SETUP.md) for details on using and extending the documentation.

## Testing

```bash
# Run tests
npm test

# Run tests in watch mode
npm run test:watch
```

## Linting & Formatting

```bash
# Lint code
npm run lint

# Format code
npm run format
```

## Environment Variables

See `.env.docker.example` for Docker setup or `.env.example` for local development.

## Docker Commands

```bash
# Start all services (production)
npm run docker:up

# Start development services (with hot reload)
npm run docker:dev

# Stop services
npm run docker:down

# View logs
npm run docker:logs

# Run migrations
npm run docker:migrate

# Open Prisma Studio
npm run docker:studio

# Build images
npm run docker:build
```

For detailed Docker setup, see [DOCKER_SETUP.md](./DOCKER_SETUP.md).

Required variables:
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - Secret key for JWT tokens
- `JWT_REFRESH_SECRET` - Secret key for refresh tokens

Optional variables for WebRTC:
- `TURN_SERVER_URL` - TURN server URL (e.g., `turn:localhost:3478`)
- `TURN_USERNAME` - TURN server username
- `TURN_CREDENTIAL` - TURN server password

## TURN Server Setup (for WebRTC Voice Calls)

VOX uses WebRTC for peer-to-peer voice calls. For NAT traversal, a TURN server is required.

### Quick Setup (Testing)

1. **Start TURN server:**
   ```bash
   npm run turn:setup
   # Or manually:
   ./scripts/setup-turn-server.sh
   ```

2. **Test TURN server:**
   ```bash
   npm run turn:test
   # Or manually:
   ./scripts/test-turn-server.sh
   ```

3. **Update `.env` file:**
   ```env
   TURN_SERVER_URL=turn:localhost:3478
   TURN_USERNAME=testuser
   TURN_CREDENTIAL=testpass123
   ```

4. **Stop TURN server:**
   ```bash
   npm run turn:stop
   # Or manually:
   ./scripts/stop-turn-server.sh
   ```

### Manual Setup

If you prefer to set up coturn manually:

1. **Install coturn:**
   ```bash
   # macOS
   brew install coturn
   
   # Ubuntu/Debian
   sudo apt-get install coturn
   ```

2. **Configure:**
   - Copy `turnserver.conf` to `/etc/turnserver.conf`
   - Update configuration with your settings

3. **Start service:**
   ```bash
   sudo systemctl start coturn
   sudo systemctl enable coturn
   ```

### Production Setup

For production:

1. **Use production configuration:**
   ```bash
   cp turnserver.production.conf turnserver.conf
   # Edit turnserver.conf with production values
   ```

2. **Important production settings:**
   - Remove `no-auth` option
   - Use strong passwords
   - Configure TLS/DTLS certificates
   - Set `external-ip` to your public IP
   - Set up database for user management
   - Configure firewall rules

3. **Deploy TURN server:**
   - Can run on same server or separate server
   - Ensure ports 3478 (TCP/UDP) and 49152-65535 (UDP) are open
   - Use Docker or native installation

### Testing TURN Server

1. **Online testing tool:**
   - Visit: https://webrtc.github.io/samples/src/content/peerconnection/trickle-ice/
   - Add server: `turn:localhost:3478`
   - Username: `testuser`
   - Password: `testpass123`
   - Click "Gather candidates"

2. **Check server logs:**
   ```bash
   npm run turn:logs
   # Or:
   docker logs vox-turn-server
   ```

### Troubleshooting

- **Port already in use:** Change port in `turnserver.conf` and update `.env`
- **Connection fails:** Check firewall rules and ensure ports are open
- **NAT traversal issues:** Ensure TURN server has public IP and `external-ip` is set
- **Authentication fails:** Verify username/password in config and `.env` match

## Next Steps

- [x] Implement authentication routes
- [x] Implement profile routes
- [x] Implement KYC routes
- [x] Implement group routes
- [x] Implement event routes
- [x] Implement messaging with WebSocket
- [x] Implement voice calls with WebRTC
- [ ] Add Redis caching (optional)
- [ ] Add comprehensive tests

## License

ISC


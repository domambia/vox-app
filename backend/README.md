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

- Node.js 18+ 
- PostgreSQL 14+
- npm or yarn

## Setup

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

See `.env.example` for all available environment variables.

## Next Steps

- [ ] Implement authentication routes
- [ ] Implement profile routes
- [ ] Implement KYC routes
- [ ] Implement group routes
- [ ] Implement event routes
- [ ] Add Firebase integration for messaging
- [ ] Add Redis caching (optional)
- [ ] Add comprehensive tests

## License

ISC


# Docker Setup Guide

This guide explains how to run the VOX backend using Docker and Docker Compose.

## Prerequisites

- Docker 20.10+
- Docker Compose 2.0+ (or `docker compose` plugin)

## Quick Start

### 1. Create Environment File

```bash
cp .env.docker.example .env
```

Edit `.env` and update:
- `POSTGRES_PASSWORD` - Strong password for PostgreSQL
- `JWT_SECRET` - Random secret string
- `JWT_REFRESH_SECRET` - Random secret string
- `CORS_ORIGIN` - Your frontend URL

### 2. Start All Services

```bash
# Production mode
docker compose up -d

# Development mode (with hot reload)
docker compose -f docker-compose.dev.yml up -d
```

### 3. Run Database Migrations

```bash
# Production
docker compose exec backend npx prisma migrate deploy

# Development
docker compose -f docker-compose.dev.yml exec backend npx prisma migrate dev
```

### 4. (Optional) Seed Database

```bash
docker compose exec backend npm run prisma:seed
```

## Services

The docker-compose setup includes:

1. **PostgreSQL** - Database server
   - Port: `5432`
   - Database: `vox_db`
   - User: `vox_user`

2. **TURN Server** - WebRTC relay server
   - Port: `3478` (TCP/UDP)
   - RTP ports: `49152-65535` (UDP)

3. **Redis** - Caching/session storage (optional)
   - Port: `6379`

4. **Backend API** - VOX backend service
   - Port: `3000`
   - Health check: `/api/v1/health`

## Docker Compose Files

### Production (`docker-compose.yml`)

- Optimized multi-stage build
- Production Node.js image
- Health checks enabled
- Persistent volumes for data

### Development (`docker-compose.dev.yml`)

- Hot reload with `tsx`
- Source code mounted as volume
- Development-friendly settings
- Faster startup

## Common Commands

### Start Services

```bash
# Production
docker compose up -d

# Development
docker compose -f docker-compose.dev.yml up -d

# View logs
docker compose logs -f backend
```

### Stop Services

```bash
# Production
docker compose down

# Development
docker compose -f docker-compose.dev.yml down

# Stop and remove volumes (⚠️ deletes data)
docker compose down -v
```

### Database Operations

```bash
# Run migrations
docker compose exec backend npx prisma migrate deploy

# Open Prisma Studio
docker compose exec backend npx prisma studio

# Access PostgreSQL CLI
docker compose exec postgres psql -U vox_user -d vox_db

# Backup database
docker compose exec postgres pg_dump -U vox_user vox_db > backup.sql

# Restore database
docker compose exec -T postgres psql -U vox_user vox_db < backup.sql
```

### Backend Operations

```bash
# View logs
docker compose logs -f backend

# Execute commands in container
docker compose exec backend npm run <command>

# Rebuild backend
docker compose build backend

# Restart backend
docker compose restart backend
```

### Health Checks

```bash
# Check all services
docker compose ps

# Check backend health
curl http://localhost:3000/api/v1/health

# Check database
docker compose exec postgres pg_isready -U vox_user

# Check Redis
docker compose exec redis redis-cli ping
```

## Environment Variables

Key environment variables (see `.env.docker.example`):

| Variable | Description | Default |
|----------|-------------|---------|
| `POSTGRES_USER` | PostgreSQL username | `vox_user` |
| `POSTGRES_PASSWORD` | PostgreSQL password | (required) |
| `POSTGRES_DB` | Database name | `vox_db` |
| `JWT_SECRET` | JWT signing secret | (required) |
| `JWT_REFRESH_SECRET` | Refresh token secret | (required) |
| `CORS_ORIGIN` | Allowed CORS origin | `http://localhost:3000` |
| `TURN_SERVER_URL` | TURN server URL | `turn:turn:3478` |
| `TURN_USERNAME` | TURN username | `testuser` |
| `TURN_CREDENTIAL` | TURN password | `testpass123` |

## Volumes

Persistent data is stored in Docker volumes:

- `postgres_data` - PostgreSQL database files
- `redis_data` - Redis data files
- `./uploads` - Uploaded files (mounted from host)
- `./logs` - Application logs (mounted from host)

## Networking

All services are on the `vox-network` bridge network:

- Services can communicate using service names:
  - `postgres:5432`
  - `redis:6379`
  - `turn:3478`
  - `backend:3000`

## Troubleshooting

### Backend won't start

1. **Check database connection:**
   ```bash
   docker compose logs postgres
   docker compose exec postgres pg_isready
   ```

2. **Check environment variables:**
   ```bash
   docker compose exec backend env | grep DATABASE_URL
   ```

3. **Check migrations:**
   ```bash
   docker compose exec backend npx prisma migrate status
   ```

### Database connection errors

1. **Verify PostgreSQL is healthy:**
   ```bash
   docker compose ps postgres
   ```

2. **Check DATABASE_URL format:**
   ```
   postgresql://user:password@postgres:5432/dbname?schema=public
   ```

3. **Test connection:**
   ```bash
   docker compose exec backend npx prisma db pull
   ```

### TURN server issues

1. **Check TURN server logs:**
   ```bash
   docker compose logs turn
   ```

2. **Verify ports are open:**
   ```bash
   docker compose ps turn
   ```

3. **Test TURN server:**
   ```bash
   # From host
   telnet localhost 3478
   ```

### Port conflicts

If ports are already in use:

1. **Change ports in `.env`:**
   ```env
   PORT=3001
   POSTGRES_PORT=5433
   TURN_PORT=3479
   REDIS_PORT=6380
   ```

2. **Or stop conflicting services**

### Permission issues

If you see permission errors:

```bash
# Fix uploads directory
sudo chown -R $USER:$USER uploads/

# Fix logs directory
sudo chown -R $USER:$USER logs/
```

## Production Deployment

### Security Checklist

- [ ] Change all default passwords
- [ ] Use strong JWT secrets (32+ characters)
- [ ] Set `NODE_ENV=production`
- [ ] Configure proper CORS origins
- [ ] Enable TLS/HTTPS
- [ ] Set up firewall rules
- [ ] Configure TURN server with proper auth
- [ ] Set up log rotation
- [ ] Configure backup strategy

### Performance Tuning

1. **Database:**
   - Adjust PostgreSQL settings in `docker-compose.yml`
   - Consider connection pooling

2. **Redis:**
   - Configure memory limits
   - Set up persistence

3. **Backend:**
   - Adjust Node.js memory limits
   - Configure worker processes (if needed)

### Monitoring

Consider adding:
- Prometheus for metrics
- Grafana for visualization
- ELK stack for log aggregation

## Development Workflow

1. **Start services:**
   ```bash
   docker compose -f docker-compose.dev.yml up -d
   ```

2. **Run migrations:**
   ```bash
   docker compose -f docker-compose.dev.yml exec backend npx prisma migrate dev
   ```

3. **Make code changes** - Hot reload will pick them up

4. **View logs:**
   ```bash
   docker compose -f docker-compose.dev.yml logs -f backend
   ```

5. **Stop services:**
   ```bash
   docker compose -f docker-compose.dev.yml down
   ```

## Building Images

### Build production image

```bash
docker compose build backend
```

### Build without cache

```bash
docker compose build --no-cache backend
```

### Tag and push to registry

```bash
docker tag vox-backend:latest your-registry/vox-backend:latest
docker push your-registry/vox-backend:latest
```

## Next Steps

- [ ] Set up CI/CD pipeline
- [ ] Configure production environment
- [ ] Set up monitoring
- [ ] Configure backups
- [ ] Set up SSL/TLS certificates


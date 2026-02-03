# VOX Backend – Server Setup (Ubuntu + Docker + Nginx)

This guide covers deploying the VOX backend on **Ubuntu Linux** using **Docker** and **Docker Compose**, and exposing it on **port 80** via **Nginx** as a reverse proxy.

---

## 1. Prerequisites

- Ubuntu 22.04 LTS (or 20.04+) with sudo
- Server with at least 2GB RAM and public IP (or domain pointing to it)

---

## 2. Install Docker on Ubuntu

```bash
# Update and install dependencies
sudo apt-get update
sudo apt-get install -y ca-certificates curl gnupg

# Add Docker’s official GPG key and repo
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker Engine
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Start and enable Docker
sudo systemctl enable docker
sudo systemctl start docker
sudo systemctl status docker
```

### Run Docker without sudo (optional)

```bash
sudo usermod -aG docker $USER
# Log out and back in (or run: newgrp docker)
```

Verify:

```bash
docker --version
docker compose version
```

---

## 3. Clone Project and Configure Environment

```bash
# Example: clone into /opt/vox-app (adjust path as needed)
sudo mkdir -p /opt/vox-app
sudo chown $USER:$USER /opt/vox-app
cd /opt/vox-app
git clone <your-repo-url> .
cd backend
```

Create `.env` from your secrets (required variables from `docker-compose.yml`):

```bash
cp .env.example .env   # if you have one; otherwise create .env
nano .env
```

**Required in `.env`:**

- `JWT_SECRET` – strong random string for access tokens
- `JWT_REFRESH_SECRET` – strong random string for refresh tokens
- `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` (or keep defaults)
- `CORS_ORIGIN` – your frontend origin, e.g. `https://yourdomain.com`
- Optional: `NODE_ENV`, `TURN_*`, `REDIS_*`, etc.

Example minimal `.env`:

```env
NODE_ENV=production
JWT_SECRET=your-long-random-jwt-secret
JWT_REFRESH_SECRET=your-long-random-refresh-secret
CORS_ORIGIN=https://yourdomain.com
POSTGRES_USER=vox_user
POSTGRES_PASSWORD=secure-db-password
POSTGRES_DB=vox_db
```

---

## 4. Run Backend with Docker Compose

From the **backend** directory:

```bash
cd /opt/vox-app/backend

# Build and start all services (postgres, redis, turn, backend)
docker compose up -d --build

# Check status
docker compose ps
docker compose logs -f backend   # follow backend logs
```

The API will be listening **inside** the host on **port 3000** (mapped from the `backend` container). Do **not** expose 3000 to the internet if you use Nginx on 80.

Optional: restrict backend to localhost so only Nginx can reach it (recommended when using Nginx):

Edit `docker-compose.yml` and change the backend port mapping from:

```yaml
ports:
  - "3000:3000"
```

to:

```yaml
ports:
  - "127.0.0.1:3000:3000"
```

Then:

```bash
docker compose up -d
```

---

## 5. Install and Configure Nginx (Reverse Proxy to Port 80)

### Install Nginx

```bash
sudo apt-get update
sudo apt-get install -y nginx
sudo systemctl enable nginx
sudo systemctl start nginx
```

### Proxy Backend (port 3000) to Port 80

Create a site config (replace `yourdomain.com` with your domain or use the server’s IP):

```bash
sudo nano /etc/nginx/sites-available/vox-backend
```

Paste (adjust `server_name` and `CORS_ORIGIN` if needed):

```nginx
# VOX Backend API – reverse proxy to Docker backend on 3000
upstream vox_backend {
    server 127.0.0.1:3000;
    keepalive 64;
}

server {
    listen 80;
    listen [::]:80;
    server_name yourdomain.com;   # or your server IP

    client_max_body_size 10M;

    location / {
        proxy_pass http://vox_backend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Connection "";
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
```

Enable the site and reload Nginx:

```bash
sudo ln -sf /etc/nginx/sites-available/vox-backend /etc/nginx/sites-enabled/
# Remove default site if it conflicts
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

Test:

- From the server: `curl http://127.0.0.1/api/v1/health`
- From the internet: `http://yourdomain.com/api/v1/health` or `http://YOUR_SERVER_IP/api/v1/health`

---

## 6. Optional: HTTPS with Let’s Encrypt (Certbot)

If you use a domain name:

```bash
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com
```

Follow prompts. Certbot will adjust your Nginx config for HTTPS and auto-renewal. Then use `https://yourdomain.com` and set `CORS_ORIGIN` and any app base URLs to `https://yourdomain.com`.

---

## 7. Useful Commands

| Task              | Command                                  |
| ----------------- | ---------------------------------------- |
| Start stack       | `cd backend && docker compose up -d`     |
| Stop stack        | `docker compose down`                    |
| Rebuild backend   | `docker compose up -d --build backend`   |
| View backend logs | `docker compose logs -f backend`         |
| Nginx reload      | `sudo systemctl reload nginx`            |
| Nginx logs        | `sudo tail -f /var/log/nginx/access.log` |

---

## 8. Firewall (UFW)

If UFW is enabled, allow HTTP/HTTPS and optionally SSH:

```bash
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
# TURN (if clients connect to this server for WebRTC)
sudo ufw allow 3478/udp
sudo ufw allow 3478/tcp
sudo ufw enable
```

---

## Summary

- **Docker + Docker Compose** run PostgreSQL, Redis, Coturn, and the VOX backend.
- Backend listens on **port 3000** (optionally only on `127.0.0.1:3000`).
- **Nginx** on port 80 proxies all requests to the backend, so the API is available at `http://yourdomain.com` (or `http://SERVER_IP`).
- Optional **Certbot** adds HTTPS on port 443.

After setup, the API base URL is:

- HTTP: `http://yourdomain.com` or `http://SERVER_IP`
- Health: `http://yourdomain.com/api/v1/health`

Use this base URL (and HTTPS URL if you configured Certbot) in your mobile app and set `CORS_ORIGIN` accordingly.

# Pinkhuff Website Deployment Guide

Complete guide to deploying the dockerized Pinkhuff website with blog functionality and Cloudflare Tunnels.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Quick Start](#quick-start)
3. [Environment Setup](#environment-setup)
4. [Docker Deployment](#docker-deployment)
5. [Cloudflare Tunnel Setup](#cloudflare-tunnel-setup)
6. [Admin Access](#admin-access)
7. [Creating Blog Posts](#creating-blog-posts)
8. [Troubleshooting](#troubleshooting)
9. [Production Checklist](#production-checklist)

---

## Prerequisites

### Required Software

- Docker (v20.10+)
- Docker Compose (v2.0+)
- cloudflared (for Cloudflare Tunnels)

### Installation

**Docker (Ubuntu/Debian)**
```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
```

**Docker Compose**
```bash
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

**cloudflared**
```bash
# Linux
wget https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
sudo dpkg -i cloudflared-linux-amd64.deb

# macOS
brew install cloudflare/cloudflare/cloudflared
```

---

## Quick Start

### 1. Generate Admin Password Hash

First, generate a bcrypt hash for your admin password:

```bash
cd api
npm install
node -e "const bcrypt = require('bcrypt'); bcrypt.hash('YOUR_SECURE_PASSWORD', 10).then(console.log);"
```

Copy the output hash.

### 2. Create Environment File

Create `.env` file in the project root:

```bash
cat > .env << 'EOF'
# JWT Secret (generate a random string)
JWT_SECRET=$(openssl rand -base64 32)

# Admin Password Hash (paste the hash from step 1)
ADMIN_PASSWORD_HASH=your_bcrypt_hash_here

# Cloudflare Tunnel Token (leave empty for now)
TUNNEL_TOKEN=
EOF
```

Generate JWT secret:
```bash
openssl rand -base64 32
```

Update the `.env` file with the generated secret and your password hash.

### 3. Build and Start Containers

```bash
# Build images
docker-compose build

# Start services
docker-compose up -d

# View logs
docker-compose logs -f
```

### 4. Access the Application

- **Frontend**: http://localhost:8080
- **Blog**: http://localhost:8080/blog.html
- **Admin**: http://localhost:8080/admin-login.html
- **API**: http://localhost:3000

---

## Environment Setup

### Environment Variables

Create `.env` file in project root:

```env
# Server Configuration
NODE_ENV=production
PORT=3000

# Security
JWT_SECRET=your-super-secret-jwt-key-change-this
ADMIN_PASSWORD_HASH=$2b$10$your_bcrypt_hash_here

# Database
DATABASE_PATH=/app/database/blog.db

# File Upload
MAX_FILE_SIZE=5242880

# CORS (update with your domains)
ALLOWED_ORIGINS=http://localhost:8080,https://pinkhuff.com,https://blog.pinkhuff.com

# Cloudflare Tunnel
TUNNEL_TOKEN=your-tunnel-token-here
```

### Generating Secure Values

**JWT Secret:**
```bash
openssl rand -base64 32
```

**Admin Password Hash:**
```bash
cd api
npm install bcrypt
node -e "const bcrypt = require('bcrypt'); bcrypt.hash('YourPassword123!', 10).then(console.log);"
```

---

## Docker Deployment

### Development Mode

```bash
# Start in development with logs visible
docker-compose up

# Or in detached mode
docker-compose up -d
```

### Production Mode

1. **Update ALLOWED_ORIGINS** in `.env` with your production domains
2. **Set strong JWT_SECRET** and **ADMIN_PASSWORD_HASH**
3. **Build and deploy**:

```bash
# Build optimized images
docker-compose build --no-cache

# Start in detached mode
docker-compose up -d

# View logs
docker-compose logs -f
```

### Useful Docker Commands

```bash
# Stop all containers
docker-compose down

# Rebuild and restart
docker-compose up -d --build

# View running containers
docker-compose ps

# View logs
docker-compose logs -f

# View logs for specific service
docker-compose logs -f api

# Execute command in container
docker-compose exec api sh

# Remove everything including volumes
docker-compose down -v
```

---

## Cloudflare Tunnel Setup

### Step 1: Authenticate with Cloudflare

```bash
cloudflared tunnel login
```

This opens a browser window. Select your domain and authorize.

### Step 2: Create a Tunnel

```bash
cloudflared tunnel create pinkhuff
```

**Important**: Note the tunnel ID returned. You'll need it.

### Step 3: Configure DNS

Route your domain(s) to the tunnel:

```bash
# Main domain
cloudflared tunnel route dns YOUR_TUNNEL_ID pinkhuff.com

# Blog subdomain (optional)
cloudflared tunnel route dns YOUR_TUNNEL_ID blog.pinkhuff.com
```

### Step 4: Option A - Host-Based Tunnel (Recommended for Start)

Create tunnel config file:

```bash
cp cloudflare-tunnel-config.yml.example cloudflare-tunnel-config.yml
```

Edit `cloudflare-tunnel-config.yml`:
- Replace `YOUR_TUNNEL_ID` with your tunnel ID
- Update credentials file path

Run the tunnel:

```bash
cloudflared tunnel --config cloudflare-tunnel-config.yml run
```

**Run as systemd service (Linux):**

```bash
sudo cloudflared service install
sudo systemctl start cloudflared
sudo systemctl enable cloudflared
```

### Step 5: Option B - Docker-Based Tunnel

Get your tunnel token:

```bash
cloudflared tunnel token YOUR_TUNNEL_ID
```

Add token to `.env`:
```env
TUNNEL_TOKEN=your-long-tunnel-token-here
```

Uncomment the `cloudflared` service in `docker-compose.yml`:

```yaml
cloudflared:
  image: cloudflare/cloudflared:latest
  container_name: pinkhuff-tunnel
  command: tunnel --no-autoupdate run
  environment:
    - TUNNEL_TOKEN=${TUNNEL_TOKEN}
  depends_on:
    - nginx
  networks:
    - pinkhuff-network
  restart: unless-stopped
```

Restart Docker Compose:

```bash
docker-compose up -d
```

### Verify Tunnel

Check tunnel status:

```bash
cloudflared tunnel info YOUR_TUNNEL_ID
```

Visit your domain: https://pinkhuff.com

---

## Admin Access

### First Login

1. Navigate to: https://pinkhuff.com/admin-login.html
2. Enter the admin password you set
3. Click **[ AUTHENTICATE ]**
4. You'll be redirected to the admin panel

### Admin Panel Features

- **Upload Posts**: Upload .md files with frontmatter
- **Manage Posts**: View, delete existing posts
- **Copy Template**: Get markdown template for new posts

### Security Notes

- Admin sessions expire after 24 hours
- All login attempts are logged
- Use strong passwords
- Consider IP whitelisting for admin routes in nginx

---

## Creating Blog Posts

### Blog Post Format

Create a `.md` file with this structure:

```markdown
---
title: "Exploiting CVE-2024-XXXXX: A Deep Dive"
date: 2025-12-30
author: Pinkhuff
tags: ["vulnerability", "exploitation", "research"]
excerpt: "A comprehensive analysis of CVE-2024-XXXXX and exploitation techniques"
published: true
---

# Introduction

Your blog post content starts here...

## Technical Details

Use standard markdown:

- Bullet points
- **Bold text**
- *Italic text*
- [Links](https://example.com)

### Code Examples

```python
def exploit():
    print("Example code")
```

## Conclusion

Wrap up your post.
```

### Frontmatter Fields

- `title` (required): Post title
- `date` (optional): Publication date (YYYY-MM-DD)
- `author` (optional): Author name (default: "Pinkhuff")
- `tags` (optional): Array of tags
- `excerpt` (optional): Short description for listing
- `published` (optional): true/false (default: true)

### Uploading Posts

1. Go to admin panel: https://pinkhuff.com/admin.html
2. Click **[ BROWSE ]** and select your .md file
3. Click **[ UPLOAD POST ]**
4. Post will appear immediately on the blog

---

## Troubleshooting

### Container Issues

**Containers won't start:**
```bash
# Check logs
docker-compose logs

# Rebuild without cache
docker-compose build --no-cache
docker-compose up -d
```

**Port conflicts:**
```bash
# Check what's using ports
sudo lsof -i :8080
sudo lsof -i :3000

# Change ports in docker-compose.yml if needed
```

### API Issues

**Can't connect to API:**
```bash
# Check API container is running
docker-compose ps

# View API logs
docker-compose logs api

# Test API health
curl http://localhost:3000/api/health
```

**Database errors:**
```bash
# Access container
docker-compose exec api sh

# Check database file
ls -la /app/database/

# Recreate database volume
docker-compose down -v
docker-compose up -d
```

### Authentication Issues

**Admin login fails:**

1. Verify password hash is correct
2. Check JWT_SECRET is set
3. Clear browser localStorage:
   ```javascript
   // In browser console
   localStorage.clear()
   ```

**Token expired:**
- Login again (tokens expire after 24 hours)

### Cloudflare Tunnel Issues

**Tunnel not connecting:**
```bash
# Check tunnel status
cloudflared tunnel info YOUR_TUNNEL_ID

# Test locally first
curl http://localhost:8080

# View tunnel logs
docker-compose logs cloudflared
# or for host-based:
sudo journalctl -u cloudflared -f
```

**DNS not resolving:**
```bash
# Check DNS records
dig pinkhuff.com
nslookup pinkhuff.com

# Wait 5-10 minutes for DNS propagation
```

---

## Production Checklist

### Security

- [ ] Set strong JWT_SECRET (32+ random characters)
- [ ] Set strong admin password hash
- [ ] Update ALLOWED_ORIGINS with production domains
- [ ] Enable HTTPS via Cloudflare
- [ ] Consider IP whitelisting for /admin routes
- [ ] Regular security updates for Docker images
- [ ] Set up monitoring and alerts

### Performance

- [ ] Enable Cloudflare caching
- [ ] Configure Cloudflare WAF rules
- [ ] Set up Cloudflare Analytics
- [ ] Monitor container resource usage
- [ ] Set up log rotation

### Backup

- [ ] Regular backups of blog database:
  ```bash
  docker cp pinkhuff-api:/app/database/blog.db ./backup-$(date +%Y%m%d).db
  ```
- [ ] Store backups securely offsite
- [ ] Test restore procedures

### Monitoring

- [ ] Set up health check endpoints
- [ ] Configure Cloudflare health checks
- [ ] Set up uptime monitoring (UptimeRobot, etc.)
- [ ] Log aggregation (optional)

### Documentation

- [ ] Document your custom configurations
- [ ] Keep credentials in secure password manager
- [ ] Document disaster recovery procedures

---

## Maintenance

### Updating the Application

```bash
# Pull latest code
git pull

# Rebuild containers
docker-compose build --no-cache

# Restart services
docker-compose up -d

# Verify
docker-compose ps
```

### Database Backups

```bash
# Manual backup
docker cp pinkhuff-api:/app/database/blog.db ./backup-$(date +%Y%m%d).db

# Automated backups (add to crontab)
0 2 * * * docker cp pinkhuff-api:/app/database/blog.db /backups/blog-$(date +\%Y\%m\%d).db
```

### Log Management

```bash
# View logs
docker-compose logs -f --tail=100

# Clear logs
docker-compose down
docker system prune -a
docker-compose up -d
```

---

## Support

For issues or questions:

1. Check logs: `docker-compose logs -f`
2. Review IMPLEMENTATION_PLAN.md for architecture details
3. Check Cloudflare dashboard for tunnel status
4. Raise issues at GitHub repository

---

## Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [Cloudflare Tunnels Documentation](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/)
- [Markdown Guide](https://www.markdownguide.org/)
- [Nginx Documentation](https://nginx.org/en/docs/)

---

**Deployment Complete!** Your Pinkhuff security research website is now live with blog functionality and Cloudflare protection.

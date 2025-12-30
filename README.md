# Pinkhuff Security Research Website

A dockerized security research website with matrix-themed design, featuring a blog system with markdown upload capabilities and Cloudflare Tunnel integration.

## Features

- **Matrix Terminal Theme**: Cybersecurity-focused aesthetic with Matrix rain background
- **Blog System**: Full-featured blog with markdown support
- **Admin Panel**: Secure admin interface for managing blog posts
- **Markdown Upload**: Upload .md files with frontmatter
- **Docker Deployment**: Fully containerized application
- **Cloudflare Tunnels**: Secure hosting without exposing ports
- **Search & Filtering**: Full-text search and tag-based filtering
- **Responsive Design**: Works on all devices

## Quick Start

### Prerequisites

- Docker & Docker Compose
- cloudflared (for Cloudflare Tunnels)

### 1. Generate Admin Credentials

```bash
# Generate JWT secret
openssl rand -base64 32

# Generate password hash
cd api && npm install
node -e "const bcrypt = require('bcrypt'); bcrypt.hash('YOUR_PASSWORD', 10).then(console.log);"
```

### 2. Configure Environment

Create `.env` file:

```env
JWT_SECRET=your-generated-secret
ADMIN_PASSWORD_HASH=your-generated-hash
TUNNEL_TOKEN=
```

### 3. Deploy

```bash
# Build and start
docker-compose up -d

# View logs
docker-compose logs -f
```

### 4. Access

- **Website**: http://localhost:8080
- **Blog**: http://localhost:8080/blog.html
- **Admin**: http://localhost:8080/admin-login.html

## Documentation

- **[DEPLOYMENT.md](DEPLOYMENT.md)** - Complete deployment guide
- **[IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md)** - Architecture and design details

## Architecture

```
┌─────────────────────────────────────────┐
│         Cloudflare Tunnel               │
│                                         │
└─────────────┬───────────────────────────┘
              │
┌─────────────▼───────────────────────────┐
│         Nginx (Port 8080)               │
│     Static Files + Reverse Proxy        │
└─────────────┬───────────────────────────┘
              │
    ┌─────────┴─────────┐
    │                   │
┌───▼────┐         ┌───▼─────┐
│ Static │         │   API   │
│  HTML  │         │ Node.js │
│  CSS   │         │ Express │
│   JS   │         │ SQLite  │
└────────┘         └─────────┘
```

## Technology Stack

### Frontend
- HTML5/CSS3/JavaScript
- Matrix-themed terminal design
- Fetch API for backend communication
- Highlight.js for code syntax highlighting

### Backend
- Node.js 18+
- Express.js
- SQLite (better-sqlite3)
- JWT authentication
- Markdown parsing (marked + gray-matter)
- File uploads (multer)

### Infrastructure
- Docker & Docker Compose
- Nginx
- Cloudflare Tunnels
- GitHub for version control

## Project Structure

```
.
├── public/                    # Frontend files
│   ├── index.html            # Main page
│   ├── blog.html             # Blog listing
│   ├── blog-post.html        # Individual post
│   ├── admin-login.html      # Admin login
│   ├── admin.html            # Admin panel
│   ├── css/
│   │   └── blog.css          # Blog styles
│   └── js/
│       ├── blog.js           # Blog functionality
│       └── admin.js          # Admin functionality
│
├── api/                      # Backend
│   ├── server.js             # Express server
│   ├── routes/
│   │   └── blog.js           # API endpoints
│   ├── middleware/
│   │   ├── auth.js           # JWT authentication
│   │   └── upload.js         # File upload handling
│   ├── utils/
│   │   └── markdown.js       # Markdown parser
│   └── database/
│       ├── db.js             # Database connection
│       └── schema.sql        # Database schema
│
├── Dockerfile.nginx          # Nginx container
├── Dockerfile.api            # API container
├── docker-compose.yml        # Docker orchestration
├── nginx.conf                # Nginx configuration
└── cloudflare-tunnel-config.yml.example
```

## API Endpoints

### Public Endpoints
- `GET /api/posts` - List all posts (paginated)
- `GET /api/posts/:slug` - Get single post
- `GET /api/search?q=query` - Search posts
- `GET /api/tags/:tag` - Posts by tag
- `GET /api/health` - Health check

### Protected Endpoints (require JWT)
- `POST /api/auth/login` - Admin authentication
- `POST /api/posts` - Upload new post
- `PUT /api/posts/:id` - Update post
- `DELETE /api/posts/:id` - Delete post

## Creating Blog Posts

Create a `.md` file with frontmatter:

```markdown
---
title: "Your Post Title"
date: 2025-12-30
author: Pinkhuff
tags: ["security", "research"]
excerpt: "Brief description"
published: true
---

# Your Content

Write your post in markdown...
```

Upload via admin panel at `/admin.html`

## Security Features

- **JWT Authentication**: Secure admin access
- **bcrypt Password Hashing**: Secure password storage
- **Input Sanitization**: XSS protection
- **Rate Limiting**: DDoS mitigation
- **CORS Protection**: Allowed origins only
- **Helmet.js**: Security headers
- **File Validation**: .md files only, size limits

## Development

```bash
# Start in development mode
docker-compose up

# View API logs
docker-compose logs -f api

# Access API container
docker-compose exec api sh

# Rebuild after changes
docker-compose up -d --build
```

## Production Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for complete production deployment guide including:

- Environment configuration
- Cloudflare Tunnel setup
- Security hardening
- Backup procedures
- Monitoring setup

## Maintenance

### Backup Database

```bash
docker cp pinkhuff-api:/app/database/blog.db ./backup-$(date +%Y%m%d).db
```

### Update Application

```bash
git pull
docker-compose build --no-cache
docker-compose up -d
```

### View Logs

```bash
docker-compose logs -f
```

## Troubleshooting

Common issues and solutions:

**Port conflicts:**
```bash
sudo lsof -i :8080
sudo lsof -i :3000
```

**Container issues:**
```bash
docker-compose down -v
docker-compose up -d --build
```

**Admin login fails:**
- Verify password hash in .env
- Check JWT_SECRET is set
- Clear browser localStorage

See [DEPLOYMENT.md](DEPLOYMENT.md) for more troubleshooting steps.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

See LICENSE file for details.

## Support

For issues or questions:
- Check logs: `docker-compose logs -f`
- Review documentation
- Raise an issue on GitHub

---

**Built with security in mind. Stay vigilant. Stay secure.**

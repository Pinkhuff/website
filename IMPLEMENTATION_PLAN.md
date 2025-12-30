# Pinkhuff Website Dockerization & Blog Implementation Plan

## Project Overview
Transform the current static Pinkhuff website into a containerized application with:
1. Docker containerization
2. Cloudflare Tunnel integration for hosting
3. Blog feature with markdown (.md) file upload capability

---

## Current Stack Analysis
- **Frontend**: Static HTML/CSS/JavaScript
- **Features**: Matrix background animation, PGP key display
- **Deployment**: Currently appears to be GitHub Pages (CNAME file present)
- **Dependencies**: None (pure vanilla JS)

---

## Architecture Design

### 1. DOCKERIZATION APPROACH

#### Option A: Static File Server (Nginx) - RECOMMENDED FOR CURRENT SITE
**Pros:**
- Lightweight (~20MB image)
- Fast performance
- Simple configuration
- Low resource usage

**Cons:**
- No dynamic capabilities (but we need backend for blog anyway)

#### Option B: Node.js Server
**Pros:**
- Can serve static files + API
- Single container solution possible
- JavaScript ecosystem for blog backend

**Cons:**
- Larger image size
- More resource intensive

**RECOMMENDED APPROACH**: Use **multi-container setup**:
- Container 1: Nginx for static frontend
- Container 2: Node.js/Express API for blog backend
- Container 3: MongoDB/PostgreSQL for blog storage (or use volume-based SQLite)

---

### 2. BLOG ARCHITECTURE

#### Backend Components
```
Backend Stack Options:

Option 1 - Node.js + Express + SQLite (Lightweight)
├── API endpoints for blog CRUD
├── Markdown file upload handling
├── Markdown to HTML conversion (using marked.js)
├── File storage in SQLite database
└── Authentication for admin upload

Option 2 - Node.js + Express + MongoDB (Scalable)
├── Similar to above but with MongoDB
├── Better for future scaling
└── Requires additional container

RECOMMENDED: SQLite for simplicity
```

#### Frontend Components
```
Frontend Additions:
├── /blog.html - Blog listing page (styled to match theme)
├── /blog-post.html - Individual post view
├── /admin.html - Admin panel for uploading .md files
├── /assets/blog/ - Blog-related assets
└── Updates to navigation in index.html
```

#### Blog Features
1. **Public Features**:
   - Blog post listing with pagination
   - Individual blog post view
   - Markdown rendering with syntax highlighting
   - Search/filter by date or tags
   - Matrix-themed styling consistent with main site

2. **Admin Features** (Protected):
   - Upload .md files
   - Edit existing posts
   - Delete posts
   - Preview before publishing
   - Basic authentication

#### Markdown Upload Flow
```
1. Admin accesses /admin route
2. Authenticates (basic auth or token)
3. Selects .md file from local system
4. File uploaded to backend API
5. Backend parses frontmatter (title, date, tags, author)
6. Converts markdown to HTML
7. Stores in database with metadata
8. Returns success/preview to admin
9. Post appears on blog listing
```

#### Markdown File Format
```markdown
---
title: "Post Title Here"
date: 2025-12-30
author: Pinkhuff
tags: ["security", "research", "vulnerabilities"]
excerpt: "Short description for listing page"
---

# Your Blog Content Here

Markdown content with code blocks, images, etc.
```

---

### 3. CLOUDFLARE TUNNEL CONFIGURATION

#### Setup Process
```
1. Install cloudflared in Docker container (or host machine)
2. Authenticate with Cloudflare account
3. Create tunnel configuration
4. Route domain/subdomain to local Docker containers
5. Configure SSL/TLS (handled by Cloudflare)
```

#### Docker Integration Options

**Option A: Separate cloudflared container**
```yaml
services:
  cloudflared:
    image: cloudflare/cloudflared:latest
    command: tunnel --no-autoupdate run
    environment:
      - TUNNEL_TOKEN=${TUNNEL_TOKEN}
    depends_on:
      - nginx
      - api
```

**Option B: Host-based cloudflared** (simpler for single server)
- Run cloudflared on host machine
- Point to Docker containers via localhost ports

**RECOMMENDED**: Option B for initial setup, Option A for production

---

## Implementation Plan

### Phase 1: Dockerization (Foundation)
```
Files to Create:
1. Dockerfile.nginx - For serving static content
2. Dockerfile.api - For Node.js blog backend
3. docker-compose.yml - Orchestrate all services
4. .dockerignore - Exclude unnecessary files
5. nginx.conf - Custom nginx configuration
```

### Phase 2: Blog Backend Development
```
Files to Create:
1. /api/package.json - Node dependencies
2. /api/server.js - Express server
3. /api/routes/blog.js - Blog API routes
4. /api/middleware/auth.js - Authentication
5. /api/middleware/upload.js - File upload handling
6. /api/utils/markdown.js - MD to HTML converter
7. /api/database/db.js - SQLite setup
8. /api/database/schema.sql - Database schema
```

API Endpoints:
- `GET /api/posts` - List all blog posts (paginated)
- `GET /api/posts/:id` - Get single post
- `POST /api/posts` - Upload new .md file (protected)
- `PUT /api/posts/:id` - Update post (protected)
- `DELETE /api/posts/:id` - Delete post (protected)
- `POST /api/auth/login` - Admin authentication

### Phase 3: Blog Frontend Development
```
Files to Create:
1. /blog.html - Blog listing page
2. /blog-post.html - Single post template
3. /admin.html - Admin upload interface
4. /admin-login.html - Admin login page
5. /js/blog.js - Blog frontend logic
6. /js/admin.js - Admin panel logic
7. /css/blog.css - Blog-specific styles (matrix theme)
```

Updates to Existing Files:
- index.html: Add navigation link to blog
- style.css: Extend with blog styles

### Phase 4: Cloudflare Tunnel Setup
```
Steps:
1. Create Cloudflare account (if not exists)
2. Install cloudflared
3. Run: cloudflared tunnel login
4. Create tunnel: cloudflared tunnel create pinkhuff
5. Configure tunnel: Create config.yml
6. Route domain: cloudflared tunnel route dns <tunnel> blog.pinkhuff.com
7. Test connection
8. Add to Docker Compose or systemd service
```

### Phase 5: Integration & Testing
```
1. Test Docker build and deployment
2. Test blog upload functionality
3. Test markdown rendering
4. Test Cloudflare tunnel connectivity
5. Security audit (especially admin endpoints)
6. Performance testing
```

---

## File Structure After Implementation

```
/home/user/website/
├── .dockerignore
├── docker-compose.yml
├── Dockerfile.nginx
├── Dockerfile.api
├── nginx.conf
├── cloudflare-tunnel-config.yml
├── IMPLEMENTATION_PLAN.md (this file)
│
├── public/                          # Static frontend files
│   ├── index.html
│   ├── blog.html                    # NEW
│   ├── blog-post.html              # NEW
│   ├── admin.html                  # NEW
│   ├── admin-login.html            # NEW
│   ├── style.css
│   ├── script.js
│   ├── js/
│   │   ├── blog.js                 # NEW
│   │   └── admin.js                # NEW
│   └── css/
│       └── blog.css                # NEW
│
├── api/                            # NEW - Backend
│   ├── package.json
│   ├── server.js
│   ├── .env.example
│   ├── routes/
│   │   └── blog.js
│   ├── middleware/
│   │   ├── auth.js
│   │   └── upload.js
│   ├── utils/
│   │   └── markdown.js
│   └── database/
│       ├── db.js
│       ├── schema.sql
│       └── blog.db (created at runtime)
│
└── volumes/                        # NEW - Docker volumes
    └── blog-data/
```

---

## Technology Stack Summary

### Frontend
- HTML5/CSS3/JavaScript (existing)
- Fetch API for backend communication
- Marked.js (markdown rendering on client if needed)
- Highlight.js (code syntax highlighting)

### Backend
- Node.js v18+ LTS
- Express.js (web framework)
- Multer (file upload handling)
- marked (markdown to HTML server-side)
- better-sqlite3 (database)
- jsonwebtoken (auth tokens)
- bcrypt (password hashing)

### Infrastructure
- Docker & Docker Compose
- Nginx (reverse proxy & static hosting)
- Cloudflare Tunnel (external access)
- SQLite (database - file-based)

---

## Security Considerations

### 1. Admin Authentication
- JWT-based authentication
- Secure password hashing (bcrypt)
- Rate limiting on login endpoint
- HTTPS-only (via Cloudflare)

### 2. File Upload Security
- Validate file extensions (.md only)
- File size limits (e.g., 5MB max)
- Sanitize filenames
- Validate markdown content (no script injection)

### 3. Docker Security
- Non-root user in containers
- Minimal base images (alpine)
- No unnecessary ports exposed
- Environment variables for secrets
- Regular image updates

### 4. Cloudflare Protection
- SSL/TLS encryption
- DDoS protection (built-in)
- Firewall rules
- Rate limiting
- Access controls

---

## Environment Variables Required

```bash
# API Container
NODE_ENV=production
PORT=3000
JWT_SECRET=<generate-secure-random-string>
ADMIN_PASSWORD_HASH=<bcrypt-hashed-password>
DATABASE_PATH=/app/database/blog.db
MAX_FILE_SIZE=5242880  # 5MB in bytes
ALLOWED_ORIGINS=https://pinkhuff.com,https://blog.pinkhuff.com

# Cloudflare Tunnel
TUNNEL_TOKEN=<your-tunnel-token>
```

---

## Deployment Commands

### Local Development
```bash
# Build and start all containers
docker-compose up --build

# Access locally
Frontend: http://localhost:8080
API: http://localhost:3000
Admin: http://localhost:8080/admin-login.html
```

### Production Deployment
```bash
# Build optimized images
docker-compose -f docker-compose.prod.yml build

# Start in detached mode
docker-compose -f docker-compose.prod.yml up -d

# View logs
docker-compose logs -f

# Setup Cloudflare Tunnel
cloudflared tunnel --config cloudflare-tunnel-config.yml run
```

---

## Estimated Timeline

- **Phase 1 - Dockerization**: 2-3 hours
- **Phase 2 - Blog Backend**: 4-6 hours
- **Phase 3 - Blog Frontend**: 3-4 hours
- **Phase 4 - Cloudflare Tunnel**: 1-2 hours
- **Phase 5 - Testing & Refinement**: 2-3 hours

**Total**: 12-18 hours of development time

---

## Next Steps

1. **Review this plan** and provide feedback
2. **Decide on architecture choices**:
   - SQLite vs MongoDB?
   - Embedded cloudflared vs separate container?
   - Authentication approach (JWT vs session)?
3. **Approve to begin implementation**
4. I'll start with Phase 1 (Dockerization) and proceed sequentially

---

## Questions to Consider

1. Do you want public users to comment on blog posts?
2. Should blog posts support image uploads or just markdown text?
3. Do you need multiple admin users or just one?
4. Should there be draft/published states for posts?
5. Do you want RSS feed support?
6. Should old posts be versioned/have edit history?
7. What domain/subdomain for the blog? (blog.pinkhuff.com?)

---

## Alternative Lightweight Approach

If you want something simpler without a database:

**File-Based Blog System**:
- Upload .md files to `/blog/posts/` directory
- Backend scans directory and parses markdown files
- No database needed
- Posts stored as files with frontmatter
- Simpler but less scalable

This could reduce complexity by ~40% but limits future features.

---

**Ready to proceed?** Let me know if you'd like to:
- Start implementation as planned
- Modify any architectural decisions
- Clarify any aspects of the plan
- Go with the simpler file-based approach

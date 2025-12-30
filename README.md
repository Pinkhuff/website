# Pinkhuff Website

A security research company website with a Matrix-themed design.

## 🚀 Deployment

This website is configured to deploy on **Cloudflare Pages**.

### Deploying to Cloudflare Pages

1. **Connect your repository to Cloudflare Pages:**
   - Log in to your [Cloudflare Dashboard](https://dash.cloudflare.com/)
   - Go to **Pages** and click **Create a project**
   - Connect your GitHub account and select this repository

2. **Configure build settings:**
   - **Framework preset:** None (Static HTML)
   - **Build command:** (leave empty - no build needed)
   - **Build output directory:** `/` (root directory)
   - **Root directory:** `/` (or leave empty)

3. **Deploy:**
   - Click **Save and Deploy**
   - Cloudflare Pages will automatically deploy your site
   - Your site will be available at `https://<project-name>.pages.dev`

### Custom Domain

To use a custom domain:
1. Go to your Pages project settings
2. Click **Custom domains**
3. Add your domain and follow the DNS configuration instructions

## 📁 Project Structure

```
.
├── index.html       # Main website file
├── _headers         # Cloudflare Pages headers configuration
├── _redirects       # Cloudflare Pages redirects configuration
└── README.md        # This file
```

## 🔒 Security Headers

This site includes security headers configured in `_headers`:
- X-Frame-Options
- X-Content-Type-Options
- Content Security Policy
- And more...

## 🛠️ Local Development

Simply open `index.html` in your browser. No build process required!

## 📝 License

Apache License 2.0 - See LICENSE file for full details.
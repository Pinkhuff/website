# Pinkhuff Security Research Website

A terminal/hacker-themed security research company website with blog functionality.

## Features

- Matrix-style animated background
- Terminal/hacker aesthetic with typing effects
- Blog system with markdown support
- PGP public key integration
- Fully responsive design

## Local Development

To run the website locally:

```bash
# Start a local web server
python3 -m http.server 8000
```

Then open http://localhost:8000 in your browser.

**Note:** A local web server is required because the blog system uses `fetch()` to load markdown files, which doesn't work with the `file://` protocol due to CORS restrictions.

## Blog System

### Structure

- `blog/` - Main blog directory
  - `content/` - Contains all blog post markdown files
  - `content/blog-manifest.json` - Auto-generated index of all blog posts
  - `blog.html` - Individual blog post viewer
  - `blog-index.html` - List of all blog posts
  - `blog.js` - Blog post loading logic
  - `blog-index.js` - Blog index loading logic
- `generate-blog-manifest.py` - Script to generate the blog manifest (root level)

### Adding a New Blog Post

1. Create a new markdown file in the `blog/content/` directory (e.g., `blog/content/my-new-post.md`)

2. Format your post with metadata at the top:

```markdown
# Your Post Title

**Published:** December 30, 2025
**Author:** Pinkhuff Team
**Category:** Your Category

## Overview

Your content here...
```

3. Run the manifest generator:

```bash
python3 generate-blog-manifest.py
```

4. The new post will automatically appear on:
   - `blog/blog-index.html` (all posts page)
   - Your homepage if you manually add it to `index.html`

### Viewing Blog Posts

- **All posts:** http://localhost:8000/blog/blog-index.html
- **Individual post:** http://localhost:8000/blog/blog.html?post=your-post-filename

## File Structure

```
website/
├── index.html              # Homepage
├── style.css               # Main stylesheet
├── script.js               # Matrix effect and animations
├── generate-blog-manifest.py  # Manifest generator script
├── blog/
│   ├── blog.html           # Blog post viewer
│   ├── blog-index.html     # All blog posts listing
│   ├── blog.js             # Blog post loading logic
│   ├── blog-index.js       # Blog index loading logic
│   └── content/
│       ├── blog-manifest.json  # Auto-generated blog index
│       └── *.md            # Blog post markdown files
└── README.md
```

## Technologies

- HTML5
- CSS3 (with animations)
- Vanilla JavaScript
- [marked.js](https://marked.js.org/) - Markdown parser (loaded via CDN)
- Python 3 - For manifest generation

## SEO & Branding

The site includes:
- **Favicon**: Terminal-themed SVG icon (`favicon.svg`)
- **Open Graph tags**: Optimized for Facebook/LinkedIn sharing
- **Twitter Card tags**: Enhanced Twitter previews
- **Sitemap**: Auto-generated `sitemap.xml` for search engines
- **Robots.txt**: Search engine crawler configuration

### Generating Sitemap

Run this before deploying to update the sitemap with latest blog posts:

```bash
python3 generate-sitemap.py
```

This will create/update `sitemap.xml` with:
- Homepage
- Blog index
- All individual blog posts

## Deployment

For static hosting (GitHub Pages, Netlify, etc.):

1. Generate the blog manifest and sitemap:
   ```bash
   python3 generate-blog-manifest.py
   python3 generate-sitemap.py
   ```

2. Update the base URL in `generate-sitemap.py` to your actual domain

3. Commit all files including:
   - `blog/content/blog-manifest.json`
   - `sitemap.xml`

4. Deploy the entire directory to your hosting service

5. Submit `sitemap.xml` to Google Search Console for better indexing

## License

See LICENSE file for details.

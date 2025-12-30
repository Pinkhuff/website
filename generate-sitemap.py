#!/usr/bin/env python3
"""
Sitemap Generator
Automatically generates sitemap.xml for the website
"""

import json
from pathlib import Path
from datetime import datetime
from urllib.parse import quote

def generate_sitemap():
    """Generate sitemap.xml for the website"""

    # Base URL - update this to your actual domain
    base_url = "https://pinkhuff.com"

    # Get current date in W3C format
    today = datetime.now().strftime('%Y-%m-%d')

    # Start sitemap XML
    sitemap = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
        ''
    ]

    # Add homepage
    sitemap.extend([
        '  <url>',
        f'    <loc>{base_url}/</loc>',
        f'    <lastmod>{today}</lastmod>',
        '    <changefreq>weekly</changefreq>',
        '    <priority>1.0</priority>',
        '  </url>',
        ''
    ])

    # Add blog index page
    sitemap.extend([
        '  <url>',
        f'    <loc>{base_url}/blog/blog-index.html</loc>',
        f'    <lastmod>{today}</lastmod>',
        '    <changefreq>weekly</changefreq>',
        '    <priority>0.9</priority>',
        '  </url>',
        ''
    ])

    # Add individual blog posts from manifest
    manifest_path = Path(__file__).parent / 'blog' / 'content' / 'blog-manifest.json'

    if manifest_path.exists():
        with open(manifest_path, 'r', encoding='utf-8') as f:
            posts = json.load(f)

        print(f"Found {len(posts)} blog post(s)")

        for post in posts:
            post_id = post['id']
            # Try to parse date, fallback to today
            try:
                post_date = datetime.strptime(post['date'], '%B %d, %Y').strftime('%Y-%m-%d')
            except:
                post_date = today

            sitemap.extend([
                '  <url>',
                f'    <loc>{base_url}/blog/blog.html?post={quote(post_id)}</loc>',
                f'    <lastmod>{post_date}</lastmod>',
                '    <changefreq>monthly</changefreq>',
                '    <priority>0.8</priority>',
                '  </url>',
                ''
            ])

            print(f"  Added: {post['title']}")
    else:
        print("Warning: blog-manifest.json not found")

    # Close sitemap
    sitemap.extend([
        '</urlset>'
    ])

    # Write sitemap.xml
    sitemap_path = Path(__file__).parent / 'sitemap.xml'
    with open(sitemap_path, 'w', encoding='utf-8') as f:
        f.write('\n'.join(sitemap))

    print(f"\n✓ Sitemap generated successfully!")
    print(f"  Location: {sitemap_path}")
    print(f"  Total URLs: {len(posts) + 2 if manifest_path.exists() else 2}")

if __name__ == '__main__':
    generate_sitemap()

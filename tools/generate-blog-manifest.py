#!/usr/bin/env python3
"""
Blog Manifest Generator
Automatically scans content/ directory for .md files and generates blog-manifest.json
"""

import os
import json
import re
from pathlib import Path
from datetime import datetime

def extract_metadata_from_markdown(filepath):
    """Extract title, date, author, category, and excerpt from markdown file"""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Initialize metadata
    metadata = {
        'id': Path(filepath).stem,  # filename without extension
        'title': '',
        'date': '',
        'author': 'Pinkhuff Team',
        'excerpt': '',
        'category': ''
    }

    lines = content.split('\n')

    # Extract title (first # heading)
    for line in lines:
        if line.strip().startswith('# '):
            metadata['title'] = line.strip()[2:].strip()
            break

    # Extract metadata from bold fields in the beginning
    for i, line in enumerate(lines[:20]):  # Check first 20 lines
        # Published date
        if line.startswith('**Published:**'):
            metadata['date'] = line.replace('**Published:**', '').strip()

        # Author
        elif line.startswith('**Author:**'):
            metadata['author'] = line.replace('**Author:**', '').strip()

        # Category
        elif line.startswith('**Category:**'):
            metadata['category'] = line.replace('**Category:**', '').strip()

    # Extract excerpt from the first ## Overview or first regular paragraph
    in_overview = False
    excerpt_lines = []

    for line in lines:
        # Skip empty lines and metadata
        if not line.strip() or line.startswith('#') or line.startswith('**'):
            if line.startswith('## Overview'):
                in_overview = True
            continue

        # If we're in overview section or haven't found excerpt yet
        if in_overview or not excerpt_lines:
            excerpt_lines.append(line.strip())

            # Stop after first paragraph (about 2-3 sentences)
            if len(excerpt_lines) >= 2:
                break

    # Join excerpt lines
    metadata['excerpt'] = ' '.join(excerpt_lines)

    # Truncate excerpt if too long (max ~300 chars)
    if len(metadata['excerpt']) > 300:
        metadata['excerpt'] = metadata['excerpt'][:297] + '...'

    return metadata

def generate_manifest():
    """Scan content directory and generate blog-manifest.json"""
    content_dir = Path(__file__).parent / 'blog' / 'content'

    if not content_dir.exists():
        print(f"Error: Content directory not found: {content_dir}")
        return

    # Find all .md files
    md_files = list(content_dir.glob('*.md'))

    if not md_files:
        print("No markdown files found in content directory")
        return

    print(f"Found {len(md_files)} markdown file(s)")

    # Extract metadata from each file
    blog_posts = []
    for md_file in md_files:
        print(f"Processing: {md_file.name}")
        try:
            metadata = extract_metadata_from_markdown(md_file)
            blog_posts.append(metadata)
            print(f"  ✓ Title: {metadata['title']}")
        except Exception as e:
            print(f"  ✗ Error processing {md_file.name}: {e}")

    # Sort by date (newest first) - basic sorting, can be improved
    blog_posts.sort(key=lambda x: x['date'], reverse=True)

    # Write to blog-manifest.json
    manifest_path = content_dir / 'blog-manifest.json'
    with open(manifest_path, 'w', encoding='utf-8') as f:
        json.dump(blog_posts, f, indent=2, ensure_ascii=False)

    print(f"\n✓ Blog manifest generated successfully!")
    print(f"  Location: {manifest_path}")
    print(f"  Total posts: {len(blog_posts)}")

if __name__ == '__main__':
    generate_manifest()

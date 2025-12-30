const express = require('express');
const router = express.Router();
const { statements } = require('../database/db');
const { verifyToken, login } = require('../middleware/auth');
const { upload, handleUploadError } = require('../middleware/upload');
const { parseMarkdown, validateMarkdown } = require('../utils/markdown');

// Health check endpoint
router.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Authentication endpoint
router.post('/auth/login', async (req, res) => {
    try {
        const { password } = req.body;

        if (!password) {
            return res.status(400).json({ error: 'Password is required' });
        }

        const token = await login(password);

        res.json({
            success: true,
            token,
            expiresIn: '24h'
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(401).json({ error: 'Authentication failed' });
    }
});

// Get all posts (public)
router.get('/posts', (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;

        const posts = statements.getAllPosts.all(limit, offset);
        const { count } = statements.getPostCount.get();

        // Parse tags from comma-separated string to array
        const postsWithTags = posts.map(post => ({
            ...post,
            tags: post.tags ? post.tags.split(',').filter(Boolean) : []
        }));

        res.json({
            posts: postsWithTags,
            pagination: {
                page,
                limit,
                total: count,
                totalPages: Math.ceil(count / limit)
            }
        });
    } catch (error) {
        console.error('Error fetching posts:', error);
        res.status(500).json({ error: 'Failed to fetch posts' });
    }
});

// Get single post by slug (public)
router.get('/posts/:slug', (req, res) => {
    try {
        const { slug } = req.params;
        const post = statements.getPostBySlug.get(slug);

        if (!post) {
            return res.status(404).json({ error: 'Post not found' });
        }

        // Increment view count
        statements.incrementViewCount.run(post.id);

        // Parse tags
        post.tags = post.tags ? post.tags.split(',').filter(Boolean) : [];

        res.json(post);
    } catch (error) {
        console.error('Error fetching post:', error);
        res.status(500).json({ error: 'Failed to fetch post' });
    }
});

// Search posts (public)
router.get('/search', (req, res) => {
    try {
        const { q, limit = 20 } = req.query;

        if (!q) {
            return res.status(400).json({ error: 'Search query is required' });
        }

        const posts = statements.searchPosts.all(q, parseInt(limit));

        // Parse tags
        const postsWithTags = posts.map(post => ({
            ...post,
            tags: post.tags ? post.tags.split(',').filter(Boolean) : []
        }));

        res.json({ posts: postsWithTags, query: q });
    } catch (error) {
        console.error('Search error:', error);
        res.status(500).json({ error: 'Search failed' });
    }
});

// Get posts by tag (public)
router.get('/tags/:tag', (req, res) => {
    try {
        const { tag } = req.params;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;

        const posts = statements.getPostsByTag.all(`%${tag}%`, limit, offset);

        // Parse tags
        const postsWithTags = posts.map(post => ({
            ...post,
            tags: post.tags ? post.tags.split(',').filter(Boolean) : []
        }));

        res.json({ posts: postsWithTags, tag });
    } catch (error) {
        console.error('Error fetching posts by tag:', error);
        res.status(500).json({ error: 'Failed to fetch posts' });
    }
});

// Upload new post (protected)
router.post('/posts', verifyToken, upload.single('markdown'), handleUploadError, async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const markdownContent = req.file.buffer.toString('utf8');

        // Validate markdown
        const validation = validateMarkdown(markdownContent);
        if (!validation.valid) {
            return res.status(400).json({
                error: 'Invalid markdown file',
                details: validation.errors
            });
        }

        // Parse markdown
        const parsedData = parseMarkdown(markdownContent);

        // Check if slug already exists
        const existingPost = statements.getPostBySlug.get(parsedData.slug);
        if (existingPost) {
            return res.status(409).json({
                error: 'A post with this slug already exists',
                slug: parsedData.slug
            });
        }

        // Insert into database
        const result = statements.createPost.run(
            parsedData.title,
            parsedData.slug,
            parsedData.content,
            parsedData.htmlContent,
            parsedData.excerpt,
            parsedData.author,
            parsedData.tags,
            parsedData.published
        );

        const newPost = statements.getPostById.get(result.lastInsertRowid);

        res.status(201).json({
            success: true,
            message: 'Post created successfully',
            post: newPost
        });
    } catch (error) {
        console.error('Error creating post:', error);
        res.status(500).json({ error: error.message || 'Failed to create post' });
    }
});

// Update post (protected)
router.put('/posts/:id', verifyToken, upload.single('markdown'), handleUploadError, async (req, res) => {
    try {
        const { id } = req.params;

        // Check if post exists
        const existingPost = statements.getPostById.get(id);
        if (!existingPost) {
            return res.status(404).json({ error: 'Post not found' });
        }

        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const markdownContent = req.file.buffer.toString('utf8');

        // Validate markdown
        const validation = validateMarkdown(markdownContent);
        if (!validation.valid) {
            return res.status(400).json({
                error: 'Invalid markdown file',
                details: validation.errors
            });
        }

        // Parse markdown
        const parsedData = parseMarkdown(markdownContent);

        // Check if new slug conflicts with another post
        if (parsedData.slug !== existingPost.slug) {
            const conflictPost = statements.getPostBySlug.get(parsedData.slug);
            if (conflictPost && conflictPost.id !== parseInt(id)) {
                return res.status(409).json({
                    error: 'A post with this slug already exists',
                    slug: parsedData.slug
                });
            }
        }

        // Update database
        statements.updatePost.run(
            parsedData.title,
            parsedData.slug,
            parsedData.content,
            parsedData.htmlContent,
            parsedData.excerpt,
            parsedData.author,
            parsedData.tags,
            id
        );

        const updatedPost = statements.getPostById.get(id);

        res.json({
            success: true,
            message: 'Post updated successfully',
            post: updatedPost
        });
    } catch (error) {
        console.error('Error updating post:', error);
        res.status(500).json({ error: error.message || 'Failed to update post' });
    }
});

// Delete post (protected)
router.delete('/posts/:id', verifyToken, (req, res) => {
    try {
        const { id } = req.params;

        // Check if post exists
        const post = statements.getPostById.get(id);
        if (!post) {
            return res.status(404).json({ error: 'Post not found' });
        }

        // Delete post
        statements.deletePost.run(id);

        res.json({
            success: true,
            message: 'Post deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting post:', error);
        res.status(500).json({ error: 'Failed to delete post' });
    }
});

module.exports = router;

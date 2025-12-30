const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const dbPath = process.env.DATABASE_PATH || path.join(__dirname, 'blog.db');
const schemaPath = path.join(__dirname, 'schema.sql');

// Ensure database directory exists
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}

// Initialize database
const db = new Database(dbPath, { verbose: console.log });

// Enable WAL mode for better concurrency
db.pragma('journal_mode = WAL');

// Initialize schema
function initializeDatabase() {
    const schema = fs.readFileSync(schemaPath, 'utf8');
    db.exec(schema);
    console.log('Database initialized successfully');
}

// Initialize on first run
initializeDatabase();

// Prepared statements for better performance
const statements = {
    // Get all published posts
    getAllPosts: db.prepare(`
        SELECT id, title, slug, excerpt, author, tags, created_at, updated_at, view_count
        FROM posts
        WHERE published = 1
        ORDER BY created_at DESC
        LIMIT ? OFFSET ?
    `),

    // Get total count of published posts
    getPostCount: db.prepare(`
        SELECT COUNT(*) as count
        FROM posts
        WHERE published = 1
    `),

    // Get single post by slug
    getPostBySlug: db.prepare(`
        SELECT *
        FROM posts
        WHERE slug = ? AND published = 1
    `),

    // Get single post by ID
    getPostById: db.prepare(`
        SELECT *
        FROM posts
        WHERE id = ?
    `),

    // Create new post
    createPost: db.prepare(`
        INSERT INTO posts (title, slug, content, html_content, excerpt, author, tags, published)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `),

    // Update post
    updatePost: db.prepare(`
        UPDATE posts
        SET title = ?, slug = ?, content = ?, html_content = ?, excerpt = ?, author = ?, tags = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
    `),

    // Delete post
    deletePost: db.prepare(`
        DELETE FROM posts WHERE id = ?
    `),

    // Increment view count
    incrementViewCount: db.prepare(`
        UPDATE posts SET view_count = view_count + 1 WHERE id = ?
    `),

    // Search posts
    searchPosts: db.prepare(`
        SELECT posts.id, posts.title, posts.slug, posts.excerpt, posts.author, posts.tags, posts.created_at
        FROM posts_fts
        JOIN posts ON posts_fts.rowid = posts.id
        WHERE posts_fts MATCH ?
        AND posts.published = 1
        ORDER BY rank
        LIMIT ?
    `),

    // Get posts by tag
    getPostsByTag: db.prepare(`
        SELECT id, title, slug, excerpt, author, tags, created_at, updated_at
        FROM posts
        WHERE published = 1 AND tags LIKE ?
        ORDER BY created_at DESC
        LIMIT ? OFFSET ?
    `)
};

module.exports = {
    db,
    statements
};

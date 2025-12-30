-- Blog Posts Table
CREATE TABLE IF NOT EXISTS posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    content TEXT NOT NULL,
    html_content TEXT NOT NULL,
    excerpt TEXT,
    author TEXT DEFAULT 'Pinkhuff',
    tags TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    published BOOLEAN DEFAULT 1,
    view_count INTEGER DEFAULT 0
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_published ON posts(published);
CREATE INDEX IF NOT EXISTS idx_created_at ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_slug ON posts(slug);

-- Full-text search support
CREATE VIRTUAL TABLE IF NOT EXISTS posts_fts USING fts5(
    title,
    content,
    tags,
    content=posts,
    content_rowid=id
);

-- Triggers to keep FTS table in sync
CREATE TRIGGER IF NOT EXISTS posts_ai AFTER INSERT ON posts BEGIN
    INSERT INTO posts_fts(rowid, title, content, tags)
    VALUES (new.id, new.title, new.content, new.tags);
END;

CREATE TRIGGER IF NOT EXISTS posts_ad AFTER DELETE ON posts BEGIN
    DELETE FROM posts_fts WHERE rowid = old.id;
END;

CREATE TRIGGER IF NOT EXISTS posts_au AFTER UPDATE ON posts BEGIN
    UPDATE posts_fts SET title = new.title, content = new.content, tags = new.tags
    WHERE rowid = new.id;
END;

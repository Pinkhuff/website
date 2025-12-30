const { marked } = require('marked');
const matter = require('gray-matter');
const sanitizeHtml = require('sanitize-html');

// Configure marked for security and features
marked.setOptions({
    headerIds: true,
    mangle: false,
    breaks: true,
    gfm: true
});

// Sanitize HTML to prevent XSS
const sanitizeOptions = {
    allowedTags: sanitizeHtml.defaults.allowedTags.concat([
        'img', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'pre', 'code', 'span', 'div', 'hr'
    ]),
    allowedAttributes: {
        ...sanitizeHtml.defaults.allowedAttributes,
        'a': ['href', 'name', 'target', 'rel'],
        'img': ['src', 'alt', 'title', 'width', 'height'],
        'code': ['class'],
        'pre': ['class'],
        'span': ['class'],
        'div': ['class']
    },
    allowedSchemes: ['http', 'https', 'mailto'],
    allowedClasses: {
        'code': ['language-*'],
        'pre': ['language-*']
    }
};

/**
 * Parse markdown file with frontmatter
 * @param {string} markdownContent - Raw markdown content with frontmatter
 * @returns {Object} Parsed content with metadata
 */
function parseMarkdown(markdownContent) {
    try {
        // Parse frontmatter
        const { data, content } = matter(markdownContent);

        // Validate required fields
        if (!data.title) {
            throw new Error('Missing required field: title');
        }

        // Convert markdown to HTML
        const rawHtml = marked(content);

        // Sanitize HTML
        const htmlContent = sanitizeHtml(rawHtml, sanitizeOptions);

        // Generate slug from title if not provided
        const slug = data.slug || generateSlug(data.title);

        // Extract excerpt if not provided (first 200 chars)
        const excerpt = data.excerpt || extractExcerpt(content);

        // Process tags
        const tags = Array.isArray(data.tags)
            ? data.tags.join(',')
            : (data.tags || '');

        return {
            title: data.title,
            slug: slug,
            content: content,
            htmlContent: htmlContent,
            excerpt: excerpt,
            author: data.author || 'Pinkhuff',
            tags: tags,
            published: data.published !== false ? 1 : 0,
            metadata: data
        };
    } catch (error) {
        throw new Error(`Failed to parse markdown: ${error.message}`);
    }
}

/**
 * Generate URL-friendly slug from title
 * @param {string} title - Post title
 * @returns {string} URL-friendly slug
 */
function generateSlug(title) {
    return title
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_-]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

/**
 * Extract excerpt from content
 * @param {string} content - Markdown content
 * @returns {string} Excerpt
 */
function extractExcerpt(content) {
    // Remove markdown formatting
    const plainText = content
        .replace(/#+\s/g, '')
        .replace(/\*\*/g, '')
        .replace(/\*/g, '')
        .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1')
        .replace(/`/g, '')
        .trim();

    // Take first 200 characters
    const excerpt = plainText.substring(0, 200);

    return excerpt.length < plainText.length
        ? excerpt + '...'
        : excerpt;
}

/**
 * Validate markdown file content
 * @param {string} markdownContent - Raw markdown content
 * @returns {Object} Validation result
 */
function validateMarkdown(markdownContent) {
    const errors = [];

    if (!markdownContent || markdownContent.trim().length === 0) {
        errors.push('Markdown content is empty');
        return { valid: false, errors };
    }

    try {
        const { data } = matter(markdownContent);

        if (!data.title) {
            errors.push('Missing required field: title');
        }

        if (data.title && data.title.length > 200) {
            errors.push('Title is too long (max 200 characters)');
        }

    } catch (error) {
        errors.push(`Invalid frontmatter: ${error.message}`);
    }

    return {
        valid: errors.length === 0,
        errors
    };
}

module.exports = {
    parseMarkdown,
    generateSlug,
    extractExcerpt,
    validateMarkdown
};

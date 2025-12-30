// Blog index page - loads all blog posts from manifest

let allPosts = []; // Store all posts for searching

async function loadBlogIndex() {
    const blogList = document.getElementById('blog-list');

    try {
        // Fetch the blog manifest
        const response = await fetch('content/blog-manifest.json');

        if (!response.ok) {
            throw new Error(`Failed to load blog manifest: ${response.status}`);
        }

        const posts = await response.json();

        // Sort posts by date (newest first) - simple reverse for now
        posts.reverse();

        // Store posts for search functionality
        allPosts = posts;

        // Render all posts
        renderPosts(posts);

        // Initialize search
        initializeSearch();

    } catch (error) {
        console.error('Error loading blog index:', error);
        blogList.innerHTML = `
            <div class="error-message">
                <h2>[ ERROR: BLOG INDEX NOT FOUND ]</h2>
                <p>Could not load the blog post list.</p>
                <p>Error: ${error.message}</p>
                <p><a href="index.html">Return to homepage</a></p>
            </div>
        `;
        document.querySelector('section .terminal-prompt').textContent = 'ERROR LOADING ARCHIVE';
    }
}

function renderPosts(posts, searchTerm = '') {
    const blogList = document.getElementById('blog-list');

    // Generate HTML for each post
    let html = '';
    posts.forEach((post, index) => {
        // Highlight search term if present
        const title = highlightText(post.title, searchTerm);
        const excerpt = highlightText(post.excerpt, searchTerm);
        const category = post.category ? highlightText(post.category, searchTerm) : '';

        html += `
            <article class="blog-post" data-post-id="${post.id}">
                <h3 class="blog-post-title">[${String(index + 1).padStart(2, '0')}] ${title}</h3>
                <p class="blog-post-meta">Published: ${post.date} | Author: ${post.author}</p>
                ${category ? `<p class="blog-post-category">Category: ${category}</p>` : ''}
                <p class="blog-post-excerpt">
                    ${excerpt}
                </p>
                <a href="blog.html?post=${post.id}" class="read-more">[ READ FULL POST ]</a>
            </article>
        `;
    });

    // Insert into page
    blogList.innerHTML = html;

    // Update count
    updateSearchCount(posts.length);
}

function highlightText(text, searchTerm) {
    if (!searchTerm) return text;

    const regex = new RegExp(`(${escapeRegex(searchTerm)})`, 'gi');
    return text.replace(regex, '<mark>$1</mark>');
}

function escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function initializeSearch() {
    const searchInput = document.getElementById('search-input');

    if (!searchInput) return;

    searchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.trim().toLowerCase();

        if (!searchTerm) {
            // Show all posts if search is empty
            renderPosts(allPosts);
            return;
        }

        // Filter posts based on search term
        const filteredPosts = allPosts.filter(post => {
            const searchableText = [
                post.title,
                post.excerpt,
                post.category || '',
                post.author,
                post.date
            ].join(' ').toLowerCase();

            return searchableText.includes(searchTerm);
        });

        // Render filtered posts with highlighting
        renderPosts(filteredPosts, searchTerm);
    });
}

function updateSearchCount(count) {
    const searchCount = document.getElementById('search-count');
    const totalCount = allPosts.length;

    if (count === totalCount) {
        document.querySelector('section .terminal-prompt').textContent = `FOUND ${count} POST${count !== 1 ? 'S' : ''}:`;
        if (searchCount) searchCount.textContent = '';
    } else {
        document.querySelector('section .terminal-prompt').textContent = `SEARCH RESULTS:`;
        if (searchCount) {
            searchCount.textContent = `Showing ${count} of ${totalCount} post${totalCount !== 1 ? 's' : ''}`;
        }
    }
}

// Load blog index when page loads
document.addEventListener('DOMContentLoaded', loadBlogIndex);

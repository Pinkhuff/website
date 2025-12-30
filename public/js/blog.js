// API configuration
const API_BASE_URL = window.location.hostname === 'localhost'
    ? 'http://localhost:3000/api'
    : '/api';

// Format date helper
function formatDate(dateString) {
    const date = new Date(dateString);
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
}

// Show error message
function showError(message) {
    const errorDiv = document.getElementById('error');
    const errorText = errorDiv.querySelector('.error-text');
    if (errorDiv && errorText) {
        errorText.textContent = message;
        errorDiv.style.display = 'block';
    }
}

// Hide loading
function hideLoading() {
    const loading = document.getElementById('loading');
    if (loading) {
        loading.style.display = 'none';
    }
}

// ===== BLOG LISTING PAGE =====
if (window.location.pathname.endsWith('blog.html') || window.location.pathname.endsWith('/blog')) {
    let currentPage = 1;
    const postsPerPage = 10;

    // Load posts
    async function loadPosts(page = 1) {
        try {
            const response = await fetch(`${API_BASE_URL}/posts?page=${page}&limit=${postsPerPage}`);

            if (!response.ok) {
                throw new Error('Failed to load posts');
            }

            const data = await response.json();
            displayPosts(data.posts);
            displayPagination(data.pagination);
            hideLoading();
        } catch (error) {
            console.error('Error loading posts:', error);
            hideLoading();
            showError('Failed to load blog posts. Please try again later.');
        }
    }

    // Display posts
    function displayPosts(posts) {
        const container = document.getElementById('posts-container');

        if (!posts || posts.length === 0) {
            container.innerHTML = '<p class="terminal-prompt">No posts found.</p>';
            return;
        }

        container.innerHTML = posts.map(post => `
            <article class="post-item">
                <h3 class="post-item-title">
                    <a href="blog-post.html?slug=${post.slug}">> ${escapeHtml(post.title)}</a>
                </h3>
                <div class="post-item-meta">
                    <span>By ${escapeHtml(post.author)}</span>
                    <span>·</span>
                    <span>${formatDate(post.created_at)}</span>
                    ${post.view_count ? `<span>· ${post.view_count} views</span>` : ''}
                </div>
                ${post.excerpt ? `<p class="post-item-excerpt">${escapeHtml(post.excerpt)}</p>` : ''}
                ${post.tags && post.tags.length > 0 ? `
                    <div class="post-item-tags">
                        ${post.tags.map(tag => `<span class="tag">#${escapeHtml(tag)}</span>`).join('')}
                    </div>
                ` : ''}
                <a href="blog-post.html?slug=${post.slug}" class="read-more">[ READ MORE ]</a>
            </article>
        `).join('');
    }

    // Display pagination
    function displayPagination(pagination) {
        const container = document.getElementById('pagination');

        if (pagination.totalPages <= 1) {
            container.innerHTML = '';
            return;
        }

        let paginationHTML = '<div class="pagination-controls">';

        // Previous button
        if (pagination.page > 1) {
            paginationHTML += `<button class="pagination-btn" onclick="changePage(${pagination.page - 1})">[ PREV ]</button>`;
        }

        // Page info
        paginationHTML += `<span class="pagination-info">Page ${pagination.page} of ${pagination.totalPages}</span>`;

        // Next button
        if (pagination.page < pagination.totalPages) {
            paginationHTML += `<button class="pagination-btn" onclick="changePage(${pagination.page + 1})">[ NEXT ]</button>`;
        }

        paginationHTML += '</div>';
        container.innerHTML = paginationHTML;
    }

    // Change page
    window.changePage = function(page) {
        currentPage = page;
        window.scrollTo({ top: 0, behavior: 'smooth' });
        document.getElementById('loading').style.display = 'block';
        loadPosts(page);
    };

    // Search functionality
    const searchBtn = document.getElementById('search-btn');
    const searchInput = document.getElementById('search-input');

    if (searchBtn && searchInput) {
        searchBtn.addEventListener('click', performSearch);
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                performSearch();
            }
        });
    }

    async function performSearch() {
        const query = searchInput.value.trim();

        if (!query) {
            loadPosts(1);
            return;
        }

        try {
            document.getElementById('loading').style.display = 'block';
            const response = await fetch(`${API_BASE_URL}/search?q=${encodeURIComponent(query)}`);

            if (!response.ok) {
                throw new Error('Search failed');
            }

            const data = await response.json();
            displayPosts(data.posts);
            document.getElementById('pagination').innerHTML = '';
            hideLoading();
        } catch (error) {
            console.error('Search error:', error);
            hideLoading();
            showError('Search failed. Please try again.');
        }
    }

    // Initial load
    loadPosts(1);
}

// ===== BLOG POST PAGE =====
if (window.location.pathname.endsWith('blog-post.html')) {
    const urlParams = new URLSearchParams(window.location.search);
    const slug = urlParams.get('slug');

    if (!slug) {
        hideLoading();
        showError('No post specified.');
    } else {
        loadPost(slug);
    }

    async function loadPost(slug) {
        try {
            const response = await fetch(`${API_BASE_URL}/posts/${slug}`);

            if (!response.ok) {
                if (response.status === 404) {
                    throw new Error('Post not found');
                }
                throw new Error('Failed to load post');
            }

            const post = await response.json();
            displayPost(post);
            hideLoading();
        } catch (error) {
            console.error('Error loading post:', error);
            hideLoading();
            showError(error.message || 'Failed to load post. Please try again later.');
        }
    }

    function displayPost(post) {
        document.getElementById('post-title').textContent = post.title + ' - Pinkhuff';
        document.getElementById('post-title-main').textContent = post.title;
        document.getElementById('post-author').textContent = post.author;
        document.getElementById('post-date').textContent = formatDate(post.created_at);
        document.getElementById('post-views').textContent = post.view_count || 0;
        document.getElementById('post-body').innerHTML = post.html_content;

        // Display tags
        const tagsContainer = document.getElementById('post-tags');
        if (post.tags && post.tags.length > 0) {
            tagsContainer.innerHTML = post.tags.map(tag =>
                `<span class="tag">#${escapeHtml(tag)}</span>`
            ).join('');
        }

        // Show post content
        document.getElementById('post-content').style.display = 'block';

        // Syntax highlighting for code blocks
        if (typeof hljs !== 'undefined') {
            document.querySelectorAll('pre code').forEach((block) => {
                hljs.highlightElement(block);
            });
        }
    }
}

// Escape HTML helper
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// API configuration
const API_BASE_URL = window.location.hostname === 'localhost'
    ? 'http://localhost:3000/api'
    : '/api';

const TOKEN_KEY = 'admin_token';

// Get stored token
function getToken() {
    return localStorage.getItem(TOKEN_KEY);
}

// Store token
function setToken(token) {
    localStorage.setItem(TOKEN_KEY, token);
}

// Remove token
function removeToken() {
    localStorage.removeItem(TOKEN_KEY);
}

// Check if user is authenticated
function isAuthenticated() {
    return !!getToken();
}

// ===== ADMIN LOGIN PAGE =====
if (window.location.pathname.endsWith('admin-login.html')) {
    // If already authenticated, redirect to admin panel
    if (isAuthenticated()) {
        window.location.href = 'admin.html';
    }

    const loginForm = document.getElementById('login-form');
    const errorMessage = document.getElementById('error-message');
    const errorText = errorMessage.querySelector('.error-text');
    const loading = document.getElementById('loading');
    const loginBtn = document.getElementById('login-btn');

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const password = document.getElementById('password').value;

        // Show loading
        loading.style.display = 'block';
        loginBtn.disabled = true;
        errorMessage.style.display = 'none';

        try {
            const response = await fetch(`${API_BASE_URL}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ password })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Authentication failed');
            }

            // Store token
            setToken(data.token);

            // Redirect to admin panel
            window.location.href = 'admin.html';

        } catch (error) {
            console.error('Login error:', error);
            errorText.textContent = error.message;
            errorMessage.style.display = 'block';
            loading.style.display = 'none';
            loginBtn.disabled = false;
        }
    });
}

// ===== ADMIN PANEL PAGE =====
if (window.location.pathname.endsWith('admin.html')) {
    // Check authentication
    if (!isAuthenticated()) {
        window.location.href = 'admin-login.html';
    }

    // Logout functionality
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            removeToken();
            window.location.href = 'admin-login.html';
        });
    }

    // File input handling
    const fileInput = document.getElementById('markdown-file');
    const fileName = document.getElementById('file-name');

    if (fileInput && fileName) {
        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                fileName.textContent = e.target.files[0].name;
            } else {
                fileName.textContent = 'No file selected';
            }
        });
    }

    // Upload form
    const uploadForm = document.getElementById('upload-form');
    const uploadStatus = document.getElementById('upload-status');
    const statusText = uploadStatus.querySelector('.status-text');
    const loading = document.getElementById('loading');
    const uploadBtn = document.getElementById('upload-btn');

    uploadForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const file = fileInput.files[0];

        if (!file) {
            alert('Please select a markdown file');
            return;
        }

        // Validate file extension
        if (!file.name.endsWith('.md')) {
            alert('Please select a .md file');
            return;
        }

        // Show loading
        loading.style.display = 'block';
        uploadBtn.disabled = true;
        uploadStatus.style.display = 'none';

        try {
            const formData = new FormData();
            formData.append('markdown', file);

            const response = await fetch(`${API_BASE_URL}/posts`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${getToken()}`
                },
                body: formData
            });

            const data = await response.json();

            if (!response.ok) {
                if (response.status === 401 || response.status === 403) {
                    removeToken();
                    window.location.href = 'admin-login.html';
                    return;
                }
                throw new Error(data.error || 'Upload failed');
            }

            // Success
            statusText.textContent = '✓ Post uploaded successfully!';
            statusText.style.color = '#00ff00';
            uploadStatus.style.display = 'block';

            // Reset form
            uploadForm.reset();
            fileName.textContent = 'No file selected';

            // Reload posts list
            loadPosts();

        } catch (error) {
            console.error('Upload error:', error);
            statusText.textContent = '✗ ' + error.message;
            statusText.style.color = '#ff0000';
            uploadStatus.style.display = 'block';
        } finally {
            loading.style.display = 'none';
            uploadBtn.disabled = false;
        }
    });

    // Load existing posts
    async function loadPosts() {
        const postsLoading = document.getElementById('posts-loading');
        const postsList = document.getElementById('posts-list');

        try {
            const response = await fetch(`${API_BASE_URL}/posts?limit=100`);

            if (!response.ok) {
                throw new Error('Failed to load posts');
            }

            const data = await response.json();

            if (postsLoading) postsLoading.style.display = 'none';

            if (!data.posts || data.posts.length === 0) {
                postsList.innerHTML = '<p class="terminal-prompt">No posts yet. Upload your first post!</p>';
                return;
            }

            postsList.innerHTML = data.posts.map(post => `
                <div class="admin-post-item">
                    <div class="admin-post-info">
                        <h4>${escapeHtml(post.title)}</h4>
                        <p class="admin-post-meta">
                            <span>Slug: ${escapeHtml(post.slug)}</span> ·
                            <span>${formatDate(post.created_at)}</span> ·
                            <span>${post.view_count || 0} views</span>
                        </p>
                    </div>
                    <div class="admin-post-actions">
                        <a href="blog-post.html?slug=${post.slug}" target="_blank" class="action-btn">[ VIEW ]</a>
                        <button onclick="deletePost(${post.id}, '${escapeHtml(post.title)}')" class="action-btn delete-btn">[ DELETE ]</button>
                    </div>
                </div>
            `).join('');

        } catch (error) {
            console.error('Error loading posts:', error);
            if (postsLoading) postsLoading.style.display = 'none';
            postsList.innerHTML = '<p class="terminal-prompt error-text">Failed to load posts</p>';
        }
    }

    // Delete post
    window.deletePost = async function(postId, postTitle) {
        if (!confirm(`Are you sure you want to delete "${postTitle}"?`)) {
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/posts/${postId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${getToken()}`
                }
            });

            if (!response.ok) {
                if (response.status === 401 || response.status === 403) {
                    removeToken();
                    window.location.href = 'admin-login.html';
                    return;
                }
                throw new Error('Failed to delete post');
            }

            // Reload posts list
            loadPosts();

        } catch (error) {
            console.error('Delete error:', error);
            alert('Failed to delete post: ' + error.message);
        }
    };

    // Copy template
    window.copyTemplate = function() {
        const template = document.querySelector('.code-block').textContent;

        navigator.clipboard.writeText(template).then(() => {
            const btn = event.target;
            const originalText = btn.textContent;
            btn.textContent = '[ COPIED! ]';

            setTimeout(() => {
                btn.textContent = originalText;
            }, 2000);
        }).catch(err => {
            console.error('Failed to copy:', err);
            alert('Failed to copy template. Please select and copy manually.');
        });
    };

    // Initial load
    loadPosts();
}

// Helper functions
function formatDate(dateString) {
    const date = new Date(dateString);
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Blog index page - loads all blog posts from manifest

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

        // Generate HTML for each post
        let html = '';
        posts.forEach((post, index) => {
            html += `
                <article class="blog-post">
                    <h3 class="blog-post-title">[${String(index + 1).padStart(2, '0')}] ${post.title}</h3>
                    <p class="blog-post-meta">Published: ${post.date} | Author: ${post.author}</p>
                    ${post.category ? `<p class="blog-post-category">Category: ${post.category}</p>` : ''}
                    <p class="blog-post-excerpt">
                        ${post.excerpt}
                    </p>
                    <a href="blog.html?post=${post.id}" class="read-more">[ READ FULL POST ]</a>
                </article>
            `;
        });

        // Insert into page
        blogList.innerHTML = html;

        // Update loading message
        document.querySelector('section .terminal-prompt').textContent = `FOUND ${posts.length} POST${posts.length !== 1 ? 'S' : ''}:`;

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

// Load blog index when page loads
document.addEventListener('DOMContentLoaded', loadBlogIndex);

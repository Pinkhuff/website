// Blog system for loading and rendering markdown files

// Get the blog post filename from URL parameter
function getBlogPostFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('post');
}

// Load and render markdown content
async function loadBlogPost(filename) {
    const articleContainer = document.getElementById('article-container');

    try {
        // Fetch the markdown file
        const response = await fetch(`content/${filename}.md`);

        if (!response.ok) {
            throw new Error(`Failed to load blog post: ${response.status}`);
        }

        const markdown = await response.text();

        // Parse and render markdown using marked.js
        const htmlContent = marked.parse(markdown);

        // Insert the rendered HTML
        articleContainer.innerHTML = htmlContent;

        // Update the loading message
        document.querySelector('#blog-content .terminal-prompt').textContent = 'ARTICLE LOADED SUCCESSFULLY';

        // Add typing effect to any headers in the article
        addTypingEffectToArticle();

    } catch (error) {
        console.error('Error loading blog post:', error);
        articleContainer.innerHTML = `
            <div class="error-message">
                <h2>[ ERROR: BLOG POST NOT FOUND ]</h2>
                <p>The requested article could not be loaded.</p>
                <p>Error: ${error.message}</p>
                <p><a href="index.html">Return to homepage</a></p>
            </div>
        `;
        document.querySelector('#blog-content .terminal-prompt').textContent = 'ERROR LOADING ARTICLE';
    }
}

// Add typing effect to article headers (optional enhancement)
function addTypingEffectToArticle() {
    const headers = document.querySelectorAll('#article-container h1, #article-container h2');

    headers.forEach((header, index) => {
        const text = header.textContent;
        header.textContent = '';
        header.setAttribute('data-text', text);
        header.classList.add('terminal-header');

        // Delay each header slightly
        setTimeout(() => {
            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting && !header.classList.contains('typing')) {
                        typeText(header, text, 40);
                        observer.unobserve(entry.target);
                    }
                });
            }, {
                threshold: 0.5
            });

            observer.observe(header);
        }, index * 100);
    });
}

// Initialize blog when page loads
document.addEventListener('DOMContentLoaded', () => {
    const postFilename = getBlogPostFromURL();

    if (postFilename) {
        loadBlogPost(postFilename);
    } else {
        // No post specified, show error or list of posts
        document.getElementById('article-container').innerHTML = `
            <div class="error-message">
                <h2>[ NO BLOG POST SPECIFIED ]</h2>
                <p>Please specify a blog post using the URL parameter.</p>
                <p>Example: blog.html?post=embedded-security-intro</p>
                <p><a href="index.html">Return to homepage</a></p>
            </div>
        `;
        document.querySelector('#blog-content .terminal-prompt').textContent = 'NO POST PARAMETER FOUND';
    }
});

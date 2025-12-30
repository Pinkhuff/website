// Matrix rain effect
const canvas = document.getElementById('matrix-bg');
const ctx = canvas.getContext('2d');

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const matrix = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%^&*()_+-=[]{}|;:,.<>?/";
const fontSize = 14;
let columns = Math.floor(canvas.width / fontSize);

let drops = [];
for (let i = 0; i < columns; i++) {
    drops[i] = Math.random() * canvas.height / fontSize;
}

function draw() {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#00ff00';
    ctx.font = fontSize + 'px monospace';

    for (let i = 0; i < drops.length; i++) {
        const text = matrix.charAt(Math.floor(Math.random() * matrix.length));
        ctx.fillText(text, i * fontSize, drops[i] * fontSize);

        if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
            drops[i] = 0;
        }
        drops[i]++;
    }
}

setInterval(draw, 35);

// Handle window resize
window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    columns = Math.floor(canvas.width / fontSize);
    drops = [];
    for (let i = 0; i < columns; i++) {
        drops[i] = Math.random() * canvas.height / fontSize;
    }
});

// Terminal typing effect
function typeText(element, text, speed = 80) {
    return new Promise((resolve) => {
        element.classList.add('typing');
        let i = 0;
        
        function type() {
            if (i < text.length) {
                element.textContent = text.substring(0, i + 1);
                i++;
                setTimeout(type, speed);
            } else {
                element.classList.add('typing-complete');
                resolve();
            }
        }
        
        type();
    });
}

// Initialize typing effect for all headers
async function initializeTypingEffects() {
    const headers = document.querySelectorAll('.terminal-header');
    
    for (let header of headers) {
        const text = header.getAttribute('data-text');
        
        // Create an Intersection Observer for each header
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting && !header.classList.contains('typing')) {
                    typeText(header, text, 60);
                    observer.unobserve(entry.target);
                }
            });
        }, {
            threshold: 0.5
        });
        
        observer.observe(header);
    }
}

// Start typing effects when page loads
document.addEventListener('DOMContentLoaded', initializeTypingEffects);

// PGP Panel Toggle
function togglePGP() {
    const content = document.getElementById('pgp-content');
    const arrow = document.getElementById('pgp-arrow');
    
    content.classList.toggle('open');
    arrow.classList.toggle('open');
}

// Copy PGP Key to Clipboard
function copyPGPKey() {
    const keyText = document.getElementById('pgp-key').textContent;
    
    navigator.clipboard.writeText(keyText).then(() => {
        const btn = event.target;
        const originalText = btn.textContent;
        btn.textContent = '[ COPIED! ]';
        
        setTimeout(() => {
            btn.textContent = originalText;
        }, 2000);
    }).catch(err => {
        console.error('Failed to copy:', err);
        alert('Failed to copy key. Please select and copy manually.');
    });
}

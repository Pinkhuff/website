// Security Headers Checker Tool
// Client-side analysis of HTTP security headers

class SecurityChecker {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.urlInput = this.container.querySelector('#check-url');
        this.checkBtn = this.container.querySelector('#check-btn');
        this.resultsDiv = this.container.querySelector('#security-results');

        // Security headers to check
        this.securityHeaders = {
            'strict-transport-security': {
                name: 'Strict-Transport-Security',
                description: 'Enforces HTTPS connections',
                severity: 'high'
            },
            'content-security-policy': {
                name: 'Content-Security-Policy',
                description: 'Prevents XSS and injection attacks',
                severity: 'high'
            },
            'x-frame-options': {
                name: 'X-Frame-Options',
                description: 'Prevents clickjacking attacks',
                severity: 'medium'
            },
            'x-content-type-options': {
                name: 'X-Content-Type-Options',
                description: 'Prevents MIME-sniffing attacks',
                severity: 'medium'
            },
            'referrer-policy': {
                name: 'Referrer-Policy',
                description: 'Controls referrer information',
                severity: 'low'
            },
            'permissions-policy': {
                name: 'Permissions-Policy',
                description: 'Controls browser features/APIs',
                severity: 'low'
            },
            'x-xss-protection': {
                name: 'X-XSS-Protection',
                description: 'Legacy XSS filter (deprecated)',
                severity: 'low'
            }
        };

        this.init();
    }

    init() {
        this.checkBtn.addEventListener('click', () => this.checkHeaders());
        this.urlInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.checkHeaders();
            }
        });
    }

    async checkHeaders() {
        let url = this.urlInput.value.trim();

        if (!url) {
            this.showError('Please enter a URL to check');
            return;
        }

        // Add https:// if no protocol specified
        if (!url.match(/^https?:\/\//)) {
            url = 'https://' + url;
        }

        // Validate URL
        try {
            new URL(url);
        } catch (e) {
            this.showError('Invalid URL format');
            return;
        }

        this.checkBtn.disabled = true;
        this.checkBtn.textContent = '[ SCANNING... ]';
        this.resultsDiv.innerHTML = '<p class="terminal-prompt">Analyzing security headers...</p>';

        try {
            // Note: Due to CORS, we can only check headers if the server allows it
            // This is a limitation of client-side checks
            const response = await fetch(url, { method: 'HEAD' });

            this.analyzeHeaders(response.headers, url);

        } catch (error) {
            // CORS error or network error
            this.showCORSMessage(url);
        } finally {
            this.checkBtn.disabled = false;
            this.checkBtn.textContent = '[ SCAN HEADERS ]';
        }
    }

    analyzeHeaders(headers, url) {
        let html = '';
        let score = 0;
        let maxScore = 0;
        const found = [];
        const missing = [];

        html += '<div class="security-report">';
        html += `<h3>Security Headers Report</h3>`;
        html += `<p class="url-checked">URL: ${this.escapeHtml(url)}</p>`;
        html += '<div class="headers-list">';

        // Check each security header
        for (const [key, info] of Object.entries(this.securityHeaders)) {
            const headerValue = headers.get(key);
            const points = info.severity === 'high' ? 3 : (info.severity === 'medium' ? 2 : 1);
            maxScore += points;

            if (headerValue) {
                score += points;
                found.push(info.name);
                html += `
                    <div class="header-item present">
                        <span class="header-status">[✓]</span>
                        <strong>${info.name}</strong>
                        <p class="header-desc">${info.description}</p>
                        <p class="header-value">${this.escapeHtml(headerValue)}</p>
                    </div>
                `;
            } else {
                missing.push(info.name);
                html += `
                    <div class="header-item missing">
                        <span class="header-status">[✗]</span>
                        <strong>${info.name}</strong>
                        <p class="header-desc">${info.description}</p>
                        <p class="header-value severity-${info.severity}">Missing (${info.severity} severity)</p>
                    </div>
                `;
            }
        }

        html += '</div>';

        // Calculate grade
        const percentage = (score / maxScore) * 100;
        const grade = this.calculateGrade(percentage);
        const gradeClass = grade === 'A' ? 'grade-a' : (grade === 'B' ? 'grade-b' : (grade === 'C' ? 'grade-c' : 'grade-f'));

        html += `
            <div class="security-score">
                <h4>Security Score</h4>
                <div class="score-display ${gradeClass}">
                    <span class="grade">${grade}</span>
                    <span class="percentage">${Math.round(percentage)}%</span>
                </div>
                <p>${found.length} of ${Object.keys(this.securityHeaders).length} security headers present</p>
            </div>
        `;

        html += '</div>';

        this.resultsDiv.innerHTML = html;
    }

    showCORSMessage(url) {
        this.resultsDiv.innerHTML = `
            <div class="security-report">
                <h3>CORS Restriction</h3>
                <p class="error">Unable to check headers for <strong>${this.escapeHtml(url)}</strong></p>
                <p>This website blocks cross-origin requests (CORS policy).</p>
                <p class="info-box">
                    <strong>How to check manually:</strong><br><br>
                    1. Open browser DevTools (F12)<br>
                    2. Go to the Network tab<br>
                    3. Visit ${this.escapeHtml(url)}<br>
                    4. Click on the request and view Response Headers
                </p>
                <p class="terminal-prompt">Try checking: https://pinkhuff.com</p>
            </div>
        `;
    }

    showError(message) {
        this.resultsDiv.innerHTML = `
            <div class="error-message">
                <p class="error">[!] ${message}</p>
            </div>
        `;
    }

    calculateGrade(percentage) {
        if (percentage >= 90) return 'A';
        if (percentage >= 75) return 'B';
        if (percentage >= 60) return 'C';
        if (percentage >= 40) return 'D';
        return 'F';
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize security checker when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const checkerContainer = document.getElementById('security-headers-checker');
    if (checkerContainer) {
        new SecurityChecker('security-headers-checker');
    }
});

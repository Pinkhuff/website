// PGP Message Encryption Tool
// Client-side encryption using OpenPGP.js

class PGPTool {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.messageInput = this.container.querySelector('#pgp-message');
        this.encryptBtn = this.container.querySelector('#encrypt-btn');
        this.output = this.container.querySelector('#encrypted-output');
        this.copyEncryptedBtn = this.container.querySelector('#copy-encrypted-btn');
        this.statusDiv = this.container.querySelector('#encryption-status');

        // Pinkhuff public key (embedded)
        this.publicKeyArmored = `-----BEGIN PGP PUBLIC KEY BLOCK-----
xjMEaVPtNRYJKwYBBAHaRw8BAQdAp89agfx6+GjHy+XMOaZeqIeqIkbSfXvB
jd487L3uNObNLXNlY3VyaXR5QHBpbmtodWZmLmNvbSA8c2VjdXJpdHlAcGlu
a2h1ZmYuY29tPsLAEQQTFgoAgwWCaVPtNQMLCQcJEPRQZr5b4hSoRRQAAAAA
ABwAIHNhbHRAbm90YXRpb25zLm9wZW5wZ3Bqcy5vcmcmxzGTeDhltxE7q25k
coKcUkS3HmqqEmMTMZl7ORUM3QMVCggEFgACAQIZAQKbAwIeARYhBJITZzGo
Vkvx8N6NhvRQZr5b4hSoAADXkQEAw/YcksjB9PGBFGv0epQaKuNop9mH+uaN
yxBLw0GiodMBAPfC/STrFPVqro4nyhbv9ror3o97i7sNhKFcmRPKLjAGzjgE
aVPtNRIKKwYBBAGXVQEFAQEHQO2IIec3HKBkd9wH0/3vpJTg/MWMafp4GQo0
c/CH4qp/AwEIB8K+BBgWCgBwBYJpU+01CRD0UGa+W+IUqEUUAAAAAAAcACBz
YWx0QG5vdGF0aW9ucy5vcGVucGdwanMub3Jn3EV5uq4u+mTlRk1NJi4N8t48
UirDUnP6i7XKidkHT+ECmwwWIQSSE2cxqFZL8fDejYb0UGa+W+IUqAAAzlQB
AJaPtTs5zuptUVOKsiwwNXruzw8XlY63JEFbfZiTcjQoAQCkj15fjPHGcb3U
KSG0TNMUZ9aKCjxYW3cRMAOyFDuVBA==
=3CY5
-----END PGP PUBLIC KEY BLOCK-----`;

        this.init();
    }

    init() {
        this.encryptBtn.addEventListener('click', () => this.encryptMessage());
        this.copyEncryptedBtn.addEventListener('click', () => this.copyEncrypted());

        // Check if OpenPGP.js is loaded
        this.checkOpenPGP();
    }

    checkOpenPGP() {
        if (typeof openpgp === 'undefined') {
            this.showStatus('Loading encryption library...', 'info');
            // The library should be loaded via CDN in the HTML
            setTimeout(() => this.checkOpenPGP(), 100);
        } else {
            this.showStatus('Ready to encrypt messages', 'success');
        }
    }

    async encryptMessage() {
        const message = this.messageInput.value.trim();

        if (!message) {
            this.showStatus('Please enter a message to encrypt', 'error');
            return;
        }

        if (typeof openpgp === 'undefined') {
            this.showStatus('Encryption library not loaded. Please refresh the page.', 'error');
            return;
        }

        try {
            this.showStatus('Encrypting message...', 'info');
            this.encryptBtn.disabled = true;

            // Read the public key
            const publicKey = await openpgp.readKey({ armoredKey: this.publicKeyArmored });

            // Encrypt the message
            const encrypted = await openpgp.encrypt({
                message: await openpgp.createMessage({ text: message }),
                encryptionKeys: publicKey
            });

            // Display encrypted message
            this.output.value = encrypted;
            this.output.style.display = 'block';
            this.copyEncryptedBtn.style.display = 'inline-block';

            this.showStatus('Message encrypted successfully! Copy and send via email.', 'success');

        } catch (error) {
            console.error('Encryption error:', error);
            this.showStatus(`Encryption failed: ${error.message}`, 'error');
        } finally {
            this.encryptBtn.disabled = false;
        }
    }

    copyEncrypted() {
        this.output.select();
        this.output.setSelectionRange(0, 99999); // For mobile devices

        try {
            document.execCommand('copy');
            this.showStatus('Encrypted message copied to clipboard!', 'success');
        } catch (err) {
            // Fallback for modern browsers
            navigator.clipboard.writeText(this.output.value).then(() => {
                this.showStatus('Encrypted message copied to clipboard!', 'success');
            }).catch(() => {
                this.showStatus('Failed to copy. Please copy manually.', 'error');
            });
        }
    }

    showStatus(message, type) {
        this.statusDiv.textContent = message;
        this.statusDiv.className = `encryption-status ${type}`;
        this.statusDiv.style.display = 'block';
    }
}

// Initialize PGP tool when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const pgpContainer = document.getElementById('pgp-encryption-tool');
    if (pgpContainer) {
        new PGPTool('pgp-encryption-tool');
    }
});

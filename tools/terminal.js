// Interactive Terminal Emulator
// Provides a command-line interface with security-themed commands

class Terminal {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.output = this.container.querySelector('.terminal-output');
        this.input = this.container.querySelector('.terminal-input');
        this.commandHistory = [];
        this.historyIndex = -1;
        this.currentPath = '~';

        this.commands = {
            help: this.helpCommand.bind(this),
            about: this.aboutCommand.bind(this),
            services: this.servicesCommand.bind(this),
            blog: this.blogCommand.bind(this),
            contact: this.contactCommand.bind(this),
            clear: this.clearCommand.bind(this),
            whoami: this.whoamiCommand.bind(this),
            ls: this.lsCommand.bind(this),
            cat: this.catCommand.bind(this),
            nmap: this.nmapCommand.bind(this),
            exploit: this.exploitCommand.bind(this),
            decrypt: this.decryptCommand.bind(this),
            hack: this.hackCommand.bind(this),
            banner: this.bannerCommand.bind(this),
            skills: this.skillsCommand.bind(this),
            pgp: this.pgpCommand.bind(this),
        };

        this.init();
    }

    init() {
        this.input.addEventListener('keydown', this.handleKeyDown.bind(this));
        this.printWelcome();
    }

    handleKeyDown(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            const command = this.input.value.trim();
            if (command) {
                this.executeCommand(command);
                this.commandHistory.push(command);
                this.historyIndex = this.commandHistory.length;
            }
            this.input.value = '';
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (this.historyIndex > 0) {
                this.historyIndex--;
                this.input.value = this.commandHistory[this.historyIndex];
            }
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (this.historyIndex < this.commandHistory.length - 1) {
                this.historyIndex++;
                this.input.value = this.commandHistory[this.historyIndex];
            } else {
                this.historyIndex = this.commandHistory.length;
                this.input.value = '';
            }
        }
    }

    executeCommand(input) {
        this.printLine(`<span class="terminal-prompt-text">${this.currentPath} $</span> ${input}`);

        const parts = input.split(' ');
        const cmd = parts[0].toLowerCase();
        const args = parts.slice(1);

        if (this.commands[cmd]) {
            this.commands[cmd](args);
        } else {
            this.printLine(`<span class="error">bash: ${cmd}: command not found</span>`);
            this.printLine('Type <span class="highlight">help</span> for available commands.');
        }
    }

    printLine(text) {
        const line = document.createElement('div');
        line.innerHTML = text;
        this.output.appendChild(line);
        this.scrollToBottom();
    }

    printWelcome() {
        this.printLine('┌──────────────────────────────────────────────────┐');
        this.printLine('│   <span class="highlight">PINKHUFF SECURITY RESEARCH TERMINAL v1.0</span>   │');
        this.printLine('└──────────────────────────────────────────────────┘');
        this.printLine('');
        this.printLine('Welcome to the Pinkhuff interactive terminal.');
        this.printLine('Type <span class="highlight">help</span> to see available commands.');
        this.printLine('');
    }

    scrollToBottom() {
        this.output.scrollTop = this.output.scrollHeight;
    }

    // Command implementations

    helpCommand() {
        this.printLine('');
        this.printLine('<span class="highlight">AVAILABLE COMMANDS:</span>');
        this.printLine('');
        this.printLine('  <span class="command">help</span>        - Show this help message');
        this.printLine('  <span class="command">about</span>       - About Pinkhuff');
        this.printLine('  <span class="command">services</span>    - List our services');
        this.printLine('  <span class="command">blog</span>        - Navigate to blog');
        this.printLine('  <span class="command">contact</span>     - Contact information');
        this.printLine('  <span class="command">pgp</span>         - Show PGP public key');
        this.printLine('  <span class="command">clear</span>       - Clear the terminal');
        this.printLine('  <span class="command">whoami</span>      - Display current user');
        this.printLine('  <span class="command">ls</span>          - List directory contents');
        this.printLine('  <span class="command">cat</span>         - Read file contents');
        this.printLine('  <span class="command">banner</span>      - Display ASCII banner');
        this.printLine('  <span class="command">skills</span>      - Show our expertise');
        this.printLine('');
        this.printLine('<span class="dim">Easter eggs:</span> <span class="command">nmap</span>, <span class="command">exploit</span>, <span class="command">decrypt</span>, <span class="command">hack</span>');
        this.printLine('');
    }

    aboutCommand() {
        this.printLine('');
        this.printLine('<span class="highlight">ABOUT PINKHUFF</span>');
        this.printLine('');
        this.printLine('Pinkhuff is a cutting-edge security research company dedicated to');
        this.printLine('exploring the depths of cybersecurity, vulnerability analysis, and');
        this.printLine('threat intelligence.');
        this.printLine('');
        this.printLine('We operate in the shadows of the digital realm, uncovering');
        this.printLine('vulnerabilities before malicious actors can exploit them.');
        this.printLine('');
    }

    servicesCommand() {
        this.printLine('');
        this.printLine('<span class="highlight">SERVICES AVAILABLE:</span>');
        this.printLine('');
        this.printLine('  [01] Penetration Testing');
        this.printLine('  [02] Vulnerability Research');
        this.printLine('  [03] Threat Intelligence');
        this.printLine('  [04] Security Audits');
        this.printLine('  [05] Incident Response');
        this.printLine('  [06] Training & Consulting');
        this.printLine('  [07] AI Research');
        this.printLine('  [08] Embedded Systems & IoT');
        this.printLine('');
    }

    blogCommand() {
        this.printLine('');
        this.printLine('Redirecting to blog...');
        setTimeout(() => {
            window.location.href = 'blog/blog-index.html';
        }, 1000);
    }

    contactCommand() {
        this.printLine('');
        this.printLine('<span class="highlight">CONTACT INFORMATION:</span>');
        this.printLine('');
        this.printLine('Email:   security@pinkhuff.com');
        this.printLine('Twitter: @pinkhuff');
        this.printLine('');
        this.printLine('For secure communication, use our PGP key (type <span class="command">pgp</span>)');
        this.printLine('');
    }

    pgpCommand() {
        this.printLine('');
        this.printLine('<span class="highlight">PGP FINGERPRINT:</span>');
        this.printLine('9213 6731 A856 4BF1 F0DE  8D86 F450 66BE 5BE2 14A8');
        this.printLine('');
        this.printLine('Scroll down to the Contact section to copy the full public key.');
        this.printLine('');
    }

    clearCommand() {
        this.output.innerHTML = '';
    }

    whoamiCommand() {
        this.printLine('');
        this.printLine('guest@pinkhuff.com');
        this.printLine('');
    }

    lsCommand() {
        this.printLine('');
        this.printLine('<span class="dir">about/</span>');
        this.printLine('<span class="dir">services/</span>');
        this.printLine('<span class="dir">blog/</span>');
        this.printLine('<span class="dir">contact/</span>');
        this.printLine('<span class="file">README.md</span>');
        this.printLine('');
    }

    catCommand(args) {
        if (!args.length) {
            this.printLine('');
            this.printLine('<span class="error">cat: missing file operand</span>');
            this.printLine('Usage: cat [file]');
            this.printLine('');
            return;
        }

        const filename = args[0].toLowerCase();
        if (filename === 'readme.md' || filename === 'readme') {
            this.printLine('');
            this.printLine('# Pinkhuff Security Research');
            this.printLine('');
            this.printLine('Elite security research company specializing in:');
            this.printLine('- Penetration Testing');
            this.printLine('- Vulnerability Analysis');
            this.printLine('- Embedded Systems Security');
            this.printLine('- Threat Intelligence');
            this.printLine('');
        } else {
            this.printLine('');
            this.printLine(`<span class="error">cat: ${args[0]}: No such file or directory</span>`);
            this.printLine('');
        }
    }

    bannerCommand() {
        this.printLine('');
        this.printLine(' ____  _       _     _            __  __ ');
        this.printLine('|  _ \\(_)_ __ | | __| |__  _   _ / _|/ _|');
        this.printLine('| |_) | | \'_ \\| |/ /| \'_ \\| | | | |_| |_ ');
        this.printLine('|  __/| | | | |   < | | | | |_| |  _|  _|');
        this.printLine('|_|   |_|_| |_|_|\\_\\|_| |_|\\__,_|_| |_|  ');
        this.printLine('');
        this.printLine('    [ SECURITY RESEARCH & ANALYSIS ]');
        this.printLine('');
    }

    skillsCommand() {
        this.printLine('');
        this.printLine('<span class="highlight">CORE COMPETENCIES:</span>');
        this.printLine('');
        this.printLine('  • Reverse Engineering        [████████████] 95%');
        this.printLine('  • Exploit Development        [███████████░] 90%');
        this.printLine('  • Network Security           [████████████] 98%');
        this.printLine('  • Embedded Systems           [██████████░░] 85%');
        this.printLine('  • Cryptography               [███████████░] 92%');
        this.printLine('  • Social Engineering         [████████░░░░] 75%');
        this.printLine('');
    }

    // Easter eggs

    nmapCommand() {
        this.printLine('');
        this.printLine('Starting Nmap scan...');
        this.printLine('');
        setTimeout(() => {
            this.printLine('Nmap scan report for localhost (127.0.0.1)');
            this.printLine('Host is up (0.00042s latency).');
            this.printLine('');
            this.printLine('PORT      STATE SERVICE');
            this.printLine('22/tcp    open  ssh');
            this.printLine('80/tcp    open  http');
            this.printLine('443/tcp   open  https');
            this.printLine('31337/tcp open  elite');
            this.printLine('');
            this.printLine('Nmap done: 1 IP address scanned');
            this.printLine('');
        }, 800);
    }

    exploitCommand(args) {
        this.printLine('');
        this.printLine('[*] Initializing exploit framework...');
        setTimeout(() => {
            this.printLine('[*] Loading payload modules...');
        }, 500);
        setTimeout(() => {
            this.printLine('[+] Exploit framework ready!');
            this.printLine('[!] <span class="error">Remember: Only use exploits with proper authorization!</span>');
            this.printLine('');
        }, 1000);
    }

    decryptCommand() {
        this.printLine('');
        this.printLine('Decrypting message...');
        this.printLine('');
        const chars = '█▓▒░';
        let progress = 0;
        const interval = setInterval(() => {
            const bar = chars[Math.floor(Math.random() * chars.length)].repeat(20);
            this.output.lastChild.innerHTML = `[${bar}] ${progress}%`;
            progress += 10;
            if (progress > 100) {
                clearInterval(interval);
                this.printLine('[✓] Decryption complete!');
                this.printLine('');
                this.printLine('Message: "Welcome to Pinkhuff Security Research"');
                this.printLine('');
            }
        }, 200);
    }

    hackCommand() {
        this.printLine('');
        this.printLine('<span class="error">Access Denied.</span>');
        this.printLine('');
        this.printLine('Just kidding! We believe in ethical hacking. 😉');
        this.printLine('Contact us for legitimate security services.');
        this.printLine('');
    }
}

// Initialize terminal when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const terminalContainer = document.getElementById('interactive-terminal');
    if (terminalContainer) {
        new Terminal('interactive-terminal');
    }
});

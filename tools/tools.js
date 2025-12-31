// Encoding/Decoding Functions

function setStatus(message, isError = false) {
    const statusElement = document.getElementById('status-message');
    statusElement.textContent = message;
    statusElement.style.color = isError ? '#ff0000' : '#00ff00';
}

// Convert input based on selected format to all other formats
function convertAll() {
    const input = document.getElementById('input-text').value;
    const inputFormat = document.getElementById('input-format').value;

    if (!input) {
        setStatus('ERROR: No input data provided', true);
        return;
    }

    try {
        let textData = '';

        // First, convert input to text/bytes based on input format
        switch(inputFormat) {
            case 'text':
                textData = input;
                break;
            case 'hex':
                textData = hexToText(input);
                break;
            case 'binary':
                textData = binaryToText(input);
                break;
            case 'decimal':
                textData = decimalToText(input);
                break;
            default:
                textData = input;
        }

        // Now convert to all formats
        document.getElementById('output-text').value = textData;
        document.getElementById('output-hex').value = textToHex(textData);
        document.getElementById('output-binary').value = textToBinary(textData);
        document.getElementById('output-decimal').value = textToDecimal(textData);

        setStatus('SUCCESS: Conversion completed');
    } catch (error) {
        setStatus('ERROR: ' + error.message, true);
    }
}

// Text to Base64
function textToBase64(text) {
    try {
        return btoa(unescape(encodeURIComponent(text)));
    } catch (e) {
        throw new Error('Invalid text for Base64 encoding');
    }
}

// Text to Hex
function textToHex(text) {
    let hex = '';
    for (let i = 0; i < text.length; i++) {
        const charCode = text.charCodeAt(i);
        const hexValue = charCode.toString(16).padStart(2, '0');
        hex += hexValue + ' ';
    }
    return hex.trim();
}

// Hex to Text
function hexToText(hex) {
    hex = hex.replace(/[^0-9A-Fa-f]/g, '');
    let text = '';
    for (let i = 0; i < hex.length; i += 2) {
        const byte = parseInt(hex.substr(i, 2), 16);
        text += String.fromCharCode(byte);
    }
    return text;
}

// Text to Binary
function textToBinary(text) {
    let binary = '';
    for (let i = 0; i < text.length; i++) {
        const charCode = text.charCodeAt(i);
        const binaryValue = charCode.toString(2).padStart(8, '0');
        binary += binaryValue + ' ';
    }
    return binary.trim();
}

// Binary to Text
function binaryToText(binary) {
    binary = binary.replace(/[^01]/g, '');
    let text = '';
    for (let i = 0; i < binary.length; i += 8) {
        const byte = binary.substr(i, 8);
        if (byte.length === 8) {
            text += String.fromCharCode(parseInt(byte, 2));
        }
    }
    return text;
}

// Text to Decimal (byte array)
function textToDecimal(text) {
    let decimal = '';
    for (let i = 0; i < text.length; i++) {
        decimal += text.charCodeAt(i) + ' ';
    }
    return decimal.trim();
}

// Decimal to Text
function decimalToText(decimal) {
    const bytes = decimal.trim().split(/\s+/);
    let text = '';
    for (let byte of bytes) {
        const num = parseInt(byte);
        if (!isNaN(num) && num >= 0 && num <= 255) {
            text += String.fromCharCode(num);
        }
    }
    return text;
}

// Simple hash functions (using SubtleCrypto API for SHA-256)
async function generateHashes(text) {
    // MD5 (simplified - using a basic implementation)
    document.getElementById('output-md5').value = await md5(text);

    // SHA-256
    const sha256Hash = await sha256(text);
    document.getElementById('output-sha256').value = sha256Hash;
}

// SHA-256 using SubtleCrypto API
async function sha256(text) {
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Simple MD5 implementation
async function md5(string) {
    // For a proper MD5 implementation, we'd need a library
    // This is a simplified version for demonstration
    // In production, use a proper MD5 library like crypto-js

    // For now, we'll use a simple hash as placeholder
    let hash = 0;
    for (let i = 0; i < string.length; i++) {
        const char = string.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }

    // Convert to hex-like string (this is NOT real MD5, just a placeholder)
    const hex = Math.abs(hash).toString(16).padStart(32, '0');
    return 'MD5_PLACEHOLDER_' + hex.substring(0, 32);
}

// Copy output to clipboard
function copyOutput(outputId) {
    const output = document.getElementById(outputId);
    output.select();
    document.execCommand('copy');

    // Visual feedback
    const btn = event.target;
    const originalText = btn.textContent;
    btn.textContent = 'COPIED!';
    btn.style.backgroundColor = 'rgba(0, 255, 0, 0.3)';

    setTimeout(() => {
        btn.textContent = originalText;
        btn.style.backgroundColor = '';
    }, 1500);
}

// Clear all fields
function clearAll() {
    document.getElementById('input-text').value = '';
    document.getElementById('output-text').value = '';
    document.getElementById('output-hex').value = '';
    document.getElementById('output-binary').value = '';
    document.getElementById('output-decimal').value = '';
    setStatus('All fields cleared');
}

// Linguistics Analysis
function analyzeLinguistics() {
    const input = document.getElementById('linguistics-input').value;

    if (!input) {
        // Clear all displays
        document.getElementById('common-letters').innerHTML = '<p style="color: #00aa00;">Enter text to analyze...</p>';
        document.getElementById('letter-frequency').innerHTML = '';
        document.getElementById('ling-char-count').textContent = '0';
        document.getElementById('ling-letter-count').textContent = '0';
        document.getElementById('ling-word-count').textContent = '0';
        document.getElementById('ling-line-count').textContent = '0';
        document.getElementById('ling-byte-count').textContent = '0';
        document.getElementById('ling-vowel-count').textContent = '0';
        document.getElementById('ling-consonant-count').textContent = '0';
        document.getElementById('ling-digit-count').textContent = '0';
        document.getElementById('ling-space-count').textContent = '0';
        document.getElementById('ling-special-count').textContent = '0';
        document.getElementById('ling-unique-count').textContent = '0';
        return;
    }

    // Count letter frequencies
    const letterFreq = {};
    let totalLetters = 0;
    let vowelCount = 0;
    let consonantCount = 0;
    let digitCount = 0;
    let spaceCount = 0;
    let specialCount = 0;

    const vowels = 'aeiouAEIOU';

    for (let char of input) {
        if (char.match(/[a-zA-Z]/)) {
            const upperChar = char.toUpperCase();
            letterFreq[upperChar] = (letterFreq[upperChar] || 0) + 1;
            totalLetters++;

            if (vowels.includes(char)) {
                vowelCount++;
            } else {
                consonantCount++;
            }
        } else if (char.match(/[0-9]/)) {
            digitCount++;
        } else if (char === ' ') {
            spaceCount++;
        } else {
            specialCount++;
        }
    }

    // Sort by frequency
    const sortedLetters = Object.entries(letterFreq)
        .sort((a, b) => b[1] - a[1]);

    // Display most common letters (top 10)
    const topLetters = sortedLetters.slice(0, 10);
    let commonLettersHTML = '<div class="top-letters">';
    topLetters.forEach((entry, index) => {
        const [letter, count] = entry;
        const percentage = ((count / totalLetters) * 100).toFixed(2);
        commonLettersHTML += `
            <div class="letter-item">
                <span class="letter-rank">#${index + 1}</span>
                <span class="letter-char">${letter}</span>
                <span class="letter-count">${count} (${percentage}%)</span>
            </div>
        `;
    });
    commonLettersHTML += '</div>';
    document.getElementById('common-letters').innerHTML = commonLettersHTML;

    // Display frequency bars for all letters
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
    let frequencyBarsHTML = '';
    const maxFreq = sortedLetters.length > 0 ? sortedLetters[0][1] : 1;

    alphabet.forEach(letter => {
        const count = letterFreq[letter] || 0;
        const percentage = totalLetters > 0 ? ((count / totalLetters) * 100).toFixed(1) : 0;
        const barWidth = maxFreq > 0 ? (count / maxFreq) * 100 : 0;

        frequencyBarsHTML += `
            <div class="freq-bar-container">
                <span class="freq-letter">${letter}</span>
                <div class="freq-bar-wrapper">
                    <div class="freq-bar" style="width: ${barWidth}%"></div>
                </div>
                <span class="freq-count">${count} (${percentage}%)</span>
            </div>
        `;
    });
    document.getElementById('letter-frequency').innerHTML = frequencyBarsHTML;

    // Update statistics
    document.getElementById('ling-char-count').textContent = input.length;
    document.getElementById('ling-letter-count').textContent = totalLetters;
    document.getElementById('ling-word-count').textContent = input.trim().split(/\s+/).filter(w => w.length > 0).length;
    document.getElementById('ling-line-count').textContent = input.split('\n').length;
    document.getElementById('ling-byte-count').textContent = new Blob([input]).size;
    document.getElementById('ling-vowel-count').textContent = vowelCount;
    document.getElementById('ling-consonant-count').textContent = consonantCount;
    document.getElementById('ling-digit-count').textContent = digitCount;
    document.getElementById('ling-space-count').textContent = spaceCount;
    document.getElementById('ling-special-count').textContent = specialCount;
    document.getElementById('ling-unique-count').textContent = Object.keys(letterFreq).length;
}

// Reverse String
function reverseString() {
    const input = document.getElementById('reverse-input').value;
    const output = input.split('').reverse().join('');
    document.getElementById('reverse-output').value = output;
}

// URL Encode/Decode
function processURL() {
    const input = document.getElementById('url-input').value;
    const mode = document.getElementById('url-mode').value;
    let output = '';

    try {
        if (mode === 'encode') {
            output = encodeURIComponent(input);
        } else {
            output = decodeURIComponent(input);
        }
        document.getElementById('url-output').value = output;
    } catch (error) {
        document.getElementById('url-output').value = 'Error: Invalid input for decoding';
    }
}

// Character Count
function countChars() {
    const input = document.getElementById('count-input').value;

    document.getElementById('char-count').textContent = input.length;
    document.getElementById('word-count').textContent = input.trim().split(/\s+/).filter(w => w.length > 0).length;
    document.getElementById('line-count').textContent = input.split('\n').length;
    document.getElementById('byte-count').textContent = new Blob([input]).size;
}

// Generate hashes for separate hash section
async function generateAllHashes() {
    const input = document.getElementById('hash-input').value;

    if (!input) {
        document.getElementById('output-base64').value = '';
        document.getElementById('output-md5').value = '';
        document.getElementById('output-sha256').value = '';
        return;
    }

    // Base64
    document.getElementById('output-base64').value = textToBase64(input);

    // MD5
    document.getElementById('output-md5').value = await md5(input);

    // SHA-256
    document.getElementById('output-sha256').value = await sha256(input);
}

// Auto-convert on input (optional - can be enabled)
document.getElementById('input-text').addEventListener('input', function() {
    // Uncomment the line below to enable auto-conversion on typing
    // convertAll();
});

// Toggle collapsible sections
function toggleSection(sectionId) {
    const content = document.getElementById(sectionId);
    const arrow = document.getElementById(sectionId + '-arrow');

    if (content.classList.contains('collapsed')) {
        content.classList.remove('collapsed');
        arrow.textContent = '▼';
    } else {
        content.classList.add('collapsed');
        arrow.textContent = '▶';
    }
}

// IP Address Analysis
function analyzeIP() {
    const input = document.getElementById('ip-input').value.trim();

    if (!input) {
        clearIPResults();
        return;
    }

    try {
        // Parse IP and CIDR
        let ipAddress, cidr;
        if (input.includes('/')) {
            [ipAddress, cidr] = input.split('/');
            cidr = parseInt(cidr);

            // Validate CIDR
            if (isNaN(cidr) || cidr < 0 || cidr > 32) {
                showInvalidIP();
                return;
            }
        } else {
            ipAddress = input;
            cidr = 32; // Default to /32 for single IP
        }

        // Validate IP address
        const octets = ipAddress.split('.').map(Number);
        if (octets.length !== 4 || octets.some(o => isNaN(o) || o < 0 || o > 255)) {
            showInvalidIP();
            return;
        }

        // IP Classification
        const firstOctet = octets[0];
        let ipClass = '';
        if (firstOctet >= 1 && firstOctet <= 126) ipClass = 'A';
        else if (firstOctet >= 128 && firstOctet <= 191) ipClass = 'B';
        else if (firstOctet >= 192 && firstOctet <= 223) ipClass = 'C';
        else if (firstOctet >= 224 && firstOctet <= 239) ipClass = 'D (Multicast)';
        else if (firstOctet >= 240 && firstOctet <= 255) ipClass = 'E (Reserved)';

        // Check if private IP
        const isPrivate =
            (firstOctet === 10) ||
            (firstOctet === 172 && octets[1] >= 16 && octets[1] <= 31) ||
            (firstOctet === 192 && octets[1] === 168);

        // Check if loopback
        const isLoopback = (firstOctet === 127);

        // Check if multicast
        const isMulticast = (firstOctet >= 224 && firstOctet <= 239);

        // Determine type
        let ipType = 'Public';
        if (isPrivate) ipType = 'Private (RFC 1918)';
        else if (isLoopback) ipType = 'Loopback';
        else if (isMulticast) ipType = 'Multicast';
        else if (firstOctet === 169 && octets[1] === 254) ipType = 'Link-Local (APIPA)';

        // Convert IP to 32-bit integer
        const ipInt = (octets[0] << 24) | (octets[1] << 16) | (octets[2] << 8) | octets[3];

        // Calculate subnet mask
        const maskInt = (0xFFFFFFFF << (32 - cidr)) >>> 0;
        const maskOctets = [
            (maskInt >>> 24) & 0xFF,
            (maskInt >>> 16) & 0xFF,
            (maskInt >>> 8) & 0xFF,
            maskInt & 0xFF
        ];

        // Calculate network address
        const networkInt = (ipInt & maskInt) >>> 0;
        const networkOctets = [
            (networkInt >>> 24) & 0xFF,
            (networkInt >>> 16) & 0xFF,
            (networkInt >>> 8) & 0xFF,
            networkInt & 0xFF
        ];

        // Calculate broadcast address
        const wildcardInt = (~maskInt) >>> 0;
        const broadcastInt = (networkInt | wildcardInt) >>> 0;
        const broadcastOctets = [
            (broadcastInt >>> 24) & 0xFF,
            (broadcastInt >>> 16) & 0xFF,
            (broadcastInt >>> 8) & 0xFF,
            broadcastInt & 0xFF
        ];

        // Calculate wildcard mask
        const wildcardOctets = [
            (wildcardInt >>> 24) & 0xFF,
            (wildcardInt >>> 16) & 0xFF,
            (wildcardInt >>> 8) & 0xFF,
            wildcardInt & 0xFF
        ];

        // Calculate host counts
        const totalHosts = Math.pow(2, 32 - cidr);
        const usableHosts = cidr === 32 ? 1 : (cidr === 31 ? 2 : totalHosts - 2);

        // First and last usable IPs
        const firstUsableInt = cidr === 32 ? networkInt : (cidr === 31 ? networkInt : networkInt + 1);
        const lastUsableInt = cidr === 32 ? networkInt : (cidr === 31 ? broadcastInt : broadcastInt - 1);

        const firstUsableOctets = [
            (firstUsableInt >>> 24) & 0xFF,
            (firstUsableInt >>> 16) & 0xFF,
            (firstUsableInt >>> 8) & 0xFF,
            firstUsableInt & 0xFF
        ];

        const lastUsableOctets = [
            (lastUsableInt >>> 24) & 0xFF,
            (lastUsableInt >>> 16) & 0xFF,
            (lastUsableInt >>> 8) & 0xFF,
            lastUsableInt & 0xFF
        ];

        // Binary representations
        const ipBinary = octets.map(o => o.toString(2).padStart(8, '0')).join('.');
        const maskBinary = maskOctets.map(o => o.toString(2).padStart(8, '0')).join('.');

        // Update UI
        document.getElementById('ip-version').textContent = 'IPv4';
        document.getElementById('ip-class').textContent = ipClass;
        document.getElementById('ip-type').textContent = ipType;
        document.getElementById('ip-private').textContent = isPrivate ? 'Yes' : 'No';
        document.getElementById('ip-loopback').textContent = isLoopback ? 'Yes' : 'No';
        document.getElementById('ip-multicast').textContent = isMulticast ? 'Yes' : 'No';

        document.getElementById('subnet-network').textContent = networkOctets.join('.');
        document.getElementById('subnet-broadcast').textContent = broadcastOctets.join('.');
        document.getElementById('subnet-mask').textContent = maskOctets.join('.');
        document.getElementById('subnet-wildcard').textContent = wildcardOctets.join('.');
        document.getElementById('subnet-cidr').textContent = `/${cidr}`;
        document.getElementById('subnet-total-hosts').textContent = totalHosts.toLocaleString();
        document.getElementById('subnet-usable-hosts').textContent = usableHosts.toLocaleString();
        document.getElementById('subnet-first-ip').textContent = firstUsableOctets.join('.');
        document.getElementById('subnet-last-ip').textContent = lastUsableOctets.join('.');

        document.getElementById('ip-binary').textContent = ipBinary;
        document.getElementById('mask-binary').textContent = maskBinary;

    } catch (error) {
        showInvalidIP();
    }
}

function showInvalidIP() {
    document.getElementById('ip-version').textContent = 'INVALID';
    document.getElementById('ip-class').textContent = 'INVALID';
    document.getElementById('ip-type').textContent = 'INVALID';
    document.getElementById('ip-private').textContent = 'INVALID';
    document.getElementById('ip-loopback').textContent = 'INVALID';
    document.getElementById('ip-multicast').textContent = 'INVALID';
    document.getElementById('subnet-network').textContent = 'INVALID';
    document.getElementById('subnet-broadcast').textContent = 'INVALID';
    document.getElementById('subnet-mask').textContent = 'INVALID';
    document.getElementById('subnet-wildcard').textContent = 'INVALID';
    document.getElementById('subnet-cidr').textContent = 'INVALID';
    document.getElementById('subnet-total-hosts').textContent = 'INVALID';
    document.getElementById('subnet-usable-hosts').textContent = 'INVALID';
    document.getElementById('subnet-first-ip').textContent = 'INVALID';
    document.getElementById('subnet-last-ip').textContent = 'INVALID';
    document.getElementById('ip-binary').textContent = 'INVALID';
    document.getElementById('mask-binary').textContent = 'INVALID';
}

function clearIPResults() {
    document.getElementById('ip-version').textContent = '-';
    document.getElementById('ip-class').textContent = '-';
    document.getElementById('ip-type').textContent = '-';
    document.getElementById('ip-private').textContent = '-';
    document.getElementById('ip-loopback').textContent = '-';
    document.getElementById('ip-multicast').textContent = '-';
    document.getElementById('subnet-network').textContent = '-';
    document.getElementById('subnet-broadcast').textContent = '-';
    document.getElementById('subnet-mask').textContent = '-';
    document.getElementById('subnet-wildcard').textContent = '-';
    document.getElementById('subnet-cidr').textContent = '-';
    document.getElementById('subnet-total-hosts').textContent = '-';
    document.getElementById('subnet-usable-hosts').textContent = '-';
    document.getElementById('subnet-first-ip').textContent = '-';
    document.getElementById('subnet-last-ip').textContent = '-';
    document.getElementById('ip-binary').textContent = '-';
    document.getElementById('mask-binary').textContent = '-';
}

// Initialize status
setStatus('Ready to convert data');

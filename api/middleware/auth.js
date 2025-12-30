const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

const JWT_SECRET = process.env.JWT_SECRET || 'change-this-secret-in-production';
const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH;

if (!ADMIN_PASSWORD_HASH) {
    console.warn('WARNING: ADMIN_PASSWORD_HASH not set. Admin login will be disabled.');
}

// Verify JWT token middleware
function verifyToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
        return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(403).json({ error: 'Invalid or expired token.' });
    }
}

// Login function
async function login(password) {
    if (!ADMIN_PASSWORD_HASH) {
        throw new Error('Admin authentication not configured');
    }

    const isValid = await bcrypt.compare(password, ADMIN_PASSWORD_HASH);

    if (!isValid) {
        throw new Error('Invalid password');
    }

    // Generate token (expires in 24 hours)
    const token = jwt.sign(
        { role: 'admin', user: 'admin' },
        JWT_SECRET,
        { expiresIn: '24h' }
    );

    return token;
}

// Generate password hash (utility function)
async function generatePasswordHash(password) {
    const saltRounds = 10;
    return await bcrypt.hash(password, saltRounds);
}

module.exports = {
    verifyToken,
    login,
    generatePasswordHash
};

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const blogRoutes = require('./routes/blog');

const app = express();
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Parse allowed origins
const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',')
    : ['http://localhost:8080'];

// Security middleware
app.use(helmet({
    contentSecurityPolicy: false, // Disable for now, configure based on needs
    crossOriginEmbedderPolicy: false
}));

// CORS configuration
app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);

        if (allowedOrigins.indexOf(origin) !== -1 || NODE_ENV === 'development') {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true
}));

// Body parser middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.'
});

// Apply rate limiting to API routes
app.use('/api/', limiter);

// Stricter rate limiting for auth endpoints
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Limit each IP to 5 login attempts per windowMs
    message: 'Too many login attempts, please try again later.'
});

app.use('/api/auth/', authLimiter);

// Request logging middleware
app.use((req, res, next) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${req.method} ${req.path}`);
    next();
});

// API routes
app.use('/api', blogRoutes);

// Root endpoint
app.get('/', (req, res) => {
    res.json({
        message: 'Pinkhuff Blog API',
        version: '1.0.0',
        endpoints: {
            health: '/api/health',
            posts: '/api/posts',
            singlePost: '/api/posts/:slug',
            search: '/api/search?q=query',
            tagPosts: '/api/tags/:tag',
            auth: '/api/auth/login (POST)'
        }
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Endpoint not found' });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err);

    if (err.message === 'Not allowed by CORS') {
        return res.status(403).json({ error: 'CORS policy violation' });
    }

    res.status(err.status || 500).json({
        error: NODE_ENV === 'production'
            ? 'Internal server error'
            : err.message
    });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`
╔═══════════════════════════════════════════════╗
║   Pinkhuff Blog API Server                    ║
║   Environment: ${NODE_ENV.padEnd(30)}║
║   Port: ${String(PORT).padEnd(36)}║
║   Status: ONLINE                              ║
╚═══════════════════════════════════════════════╝
    `);
    console.log(`API available at: http://localhost:${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/api/health`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM signal received: closing HTTP server');
    server.close(() => {
        console.log('HTTP server closed');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('\nSIGINT signal received: closing HTTP server');
    process.exit(0);
});

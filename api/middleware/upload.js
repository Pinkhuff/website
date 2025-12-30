const multer = require('multer');
const path = require('path');

const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE) || 5242880; // 5MB default

// Configure multer for memory storage
const storage = multer.memoryStorage();

// File filter to only allow .md files
const fileFilter = (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();

    if (ext !== '.md') {
        return cb(new Error('Only .md (markdown) files are allowed'), false);
    }

    // Sanitize filename
    const sanitizedName = file.originalname
        .replace(/[^a-zA-Z0-9.-]/g, '_')
        .toLowerCase();

    file.originalname = sanitizedName;
    cb(null, true);
};

// Create multer upload instance
const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: MAX_FILE_SIZE,
        files: 1
    }
});

// Error handling middleware for multer
function handleUploadError(err, req, res, next) {
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                error: `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB`
            });
        }
        return res.status(400).json({ error: err.message });
    } else if (err) {
        return res.status(400).json({ error: err.message });
    }
    next();
}

module.exports = {
    upload,
    handleUploadError
};

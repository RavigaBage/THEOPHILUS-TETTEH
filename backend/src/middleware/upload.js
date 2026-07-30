const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');


const ensureDir = (dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

const BASE_UPLOAD_DIR = path.join(__dirname, '../../uploads');
ensureDir(BASE_UPLOAD_DIR);

const CATEGORY_DIRS = {
  'image/jpeg': 'images',
  'image/png': 'images',
  'image/gif': 'images',
  'image/webp': 'images',
  'application/pdf': 'documents',
  'application/msword': 'documents',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'documents',
  'application/vnd.ms-excel': 'spreadsheets',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'spreadsheets',
  'application/vnd.ms-powerpoint': 'presentations',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'presentations',
  'video/mp4': 'videos',
  'video/avi': 'videos',
  'video/mkv': 'videos',
  'audio/mpeg': 'audio',
  'audio/wav': 'audio',
  'application/zip': 'archives',
  'application/x-rar-compressed': 'archives',
};

const ALLOWED_MIME_TYPES = Object.keys(CATEGORY_DIRS);

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const subDir = CATEGORY_DIRS[file.mimetype] || 'others';
    const uploadPath = path.join(BASE_UPLOAD_DIR, subDir);
    ensureDir(uploadPath);
    cb(null, uploadPath);
  },

  filename: (req, file, cb) => {
    const uniqueSuffix = crypto.randomBytes(12).toString('hex');
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${uniqueSuffix}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error(`File type '${file.mimetype}' is not allowed. Allowed types: images, documents, spreadsheets, presentations, videos, audio, archives.`),
      false
    );
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 100 * 1024 * 1024, 
    files: 5,                   
  },
});


const getCategoryFromMime = (mimeType) => {
  const subDir = CATEGORY_DIRS[mimeType] || 'other';
  const map = {
    images: 'image',
    documents: 'document',
    spreadsheets: 'spreadsheet',
    presentations: 'presentation',
    videos: 'video',
    audio: 'audio',
    archives: 'archive',
  };
  return map[subDir] || 'other';
};


const buildFileUrl = (req, filePath) => {
  const relative = path.relative(BASE_UPLOAD_DIR, filePath).replace(/\\/g, '/');
  return `${req.protocol}://${req.get('host')}/uploads/${relative}`;
};

module.exports = { upload, getCategoryFromMime, buildFileUrl, BASE_UPLOAD_DIR };
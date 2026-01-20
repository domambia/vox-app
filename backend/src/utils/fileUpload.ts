import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { config } from '@/config/env';

// Ensure upload directories exist
const ensureUploadDirs = () => {
  const dirs = [
    config.upload.uploadDir,
    path.join(config.upload.uploadDir, 'profiles'),
    path.join(config.upload.uploadDir, 'kyc'),
    path.join(config.upload.uploadDir, 'voice-bios'),
    path.join(config.upload.uploadDir, 'events'),
    path.join(config.upload.uploadDir, 'messages'),
  ];

  dirs.forEach((dir) => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
};

ensureUploadDirs();

// Storage configuration
const storage = multer.diskStorage({
  destination: (_req, file, cb) => {
    let uploadPath = config.upload.uploadDir;

    // Determine upload path based on field name or file type
    if (file.fieldname === 'profilePicture') {
      uploadPath = path.join(config.upload.uploadDir, 'profiles');
    } else if (file.fieldname === 'kycDocument') {
      uploadPath = path.join(config.upload.uploadDir, 'kyc');
    } else if (file.fieldname === 'voiceBio') {
      uploadPath = path.join(config.upload.uploadDir, 'voice-bios');
    } else if (file.fieldname === 'eventImage') {
      uploadPath = path.join(config.upload.uploadDir, 'events');
    } else if (file.fieldname === 'messageAttachment') {
      uploadPath = path.join(config.upload.uploadDir, 'messages');
    }

    cb(null, uploadPath);
  },
  filename: (_req, file, cb) => {
    // Generate unique filename: uuid-originalname
    const uniqueName = `${uuidv4()}-${file.originalname}`;
    cb(null, uniqueName);
  },
});

// File filter
const fileFilter = (
  _req: any,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  const allowedMimes: { [key: string]: string[] } = {
    'image/jpeg': ['.jpg', '.jpeg'],
    'image/png': ['.png'],
    'image/webp': ['.webp'],
    'application/pdf': ['.pdf'],
    'audio/mpeg': ['.mp3'],
    'audio/wav': ['.wav'],
    'audio/m4a': ['.m4a'],
    'audio/ogg': ['.ogg'],
    'application/msword': ['.doc'],
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    'text/plain': ['.txt'],
    'video/mp4': ['.mp4'],
    'video/quicktime': ['.mov'],
  };

  const allowedTypes = Object.keys(allowedMimes);
  const fileExt = path.extname(file.originalname).toLowerCase();

  if (allowedTypes.includes(file.mimetype)) {
    const allowedExts = allowedMimes[file.mimetype];
    if (allowedExts.includes(fileExt)) {
      cb(null, true);
      return;
    }
  }

  cb(new Error(`Invalid file type. Allowed types: ${allowedTypes.join(', ')}`));
};

// Multer configuration
export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: config.upload.maxFileSize,
  },
});

// Helper to get file URL
export const getFileUrl = (filePath: string): string => {
  // Get the relative path from upload directory
  // filePath might be: ./uploads/voice-bios/uuid-file.wav or uploads/voice-bios/uuid-file.wav
  // We need: voice-bios/uuid-file.wav
  const normalizedUploadDir = path.normalize(config.upload.uploadDir);
  const normalizedFilePath = path.normalize(filePath);
  
  // Remove upload directory prefix
  let relativePath = normalizedFilePath;
  if (normalizedFilePath.startsWith(normalizedUploadDir)) {
    relativePath = normalizedFilePath.substring(normalizedUploadDir.length);
  }
  
  // Remove leading slashes
  relativePath = relativePath.replace(/^[\\/]+/, '');
  
  // Convert backslashes to forward slashes for URL
  relativePath = relativePath.replace(/\\/g, '/');
  
  // Return relative URL that can be served by Express
  return `/api/${config.apiVersion}/files/${relativePath}`;
};

// Helper to delete file
export const deleteFile = (filePath: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    fs.unlink(filePath, (err) => {
      if (err && err.code !== 'ENOENT') {
        reject(err);
      } else {
        resolve();
      }
    });
  });
};

// Helper to get file path from URL
export const getFilePathFromUrl = (url: string): string => {
  // Extract path from URL like /api/v1/files/profiles/uuid-filename.jpg
  const match = url.match(/\/files\/(.+)$/);
  if (match) {
    return path.join(config.upload.uploadDir, match[1]);
  }
  throw new Error('Invalid file URL');
};

// Specific upload handlers
export const uploadProfilePicture = upload.single('profilePicture');
export const uploadKYCDocument = upload.single('kycDocument');
export const uploadVoiceBio = upload.single('voiceBio');
export const uploadEventImage = upload.single('eventImage');
export const uploadMessageAttachment = upload.single('messageAttachment');

// Multiple files upload (for message attachments)
export const uploadMessageAttachments = upload.array('attachments', 5);


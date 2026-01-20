import { Router, Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { config } from '@/config/env';
import { authenticate } from '@/middleware/auth.middleware';
import { sendError } from '@/utils/response';

const router = Router();

// Serve files (protected route)
router.get('/:fileType/:filename', authenticate, (req: Request, res: Response) => {
  const { fileType, filename } = req.params;

  // Validate file type
  const allowedTypes = ['profiles', 'kyc', 'voice-bios', 'events'];
  if (!allowedTypes.includes(fileType)) {
    sendError(res, 'INVALID_FILE_TYPE', 'Invalid file type', 400);
    return;
  }

  const filePath = path.join(config.upload.uploadDir, fileType, filename);

  // Check if file exists
  if (!fs.existsSync(filePath)) {
    sendError(res, 'FILE_NOT_FOUND', 'File not found', 404);
    return;
  }

  // Send file
  res.sendFile(path.resolve(filePath));
});

export default router;


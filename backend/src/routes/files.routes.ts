import { Router, Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { config } from '@/config/env';
import { authenticate } from '@/middleware/auth.middleware';
import { sendError } from '@/utils/response';

const router = Router();

/**
 * @swagger
 * /files/{fileType}/{filename}:
 *   get:
 *     summary: Serve uploaded files
 *     description: Retrieve uploaded files (profiles, KYC documents, voice bios, events). Protected route requiring authentication.
 *     tags: [Files]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: fileType
 *         required: true
 *         schema:
 *           type: string
 *           enum: [profiles, kyc, voice-bios, events]
 *         description: Type of file to retrieve
 *         example: "profiles"
 *       - in: path
 *         name: filename
 *         required: true
 *         schema:
 *           type: string
 *         description: Name of the file
 *         example: "image.jpg"
 *     responses:
 *       200:
 *         description: File retrieved successfully
 *         content:
 *           image/jpeg:
 *             schema:
 *               type: string
 *               format: binary
 *           image/png:
 *             schema:
 *               type: string
 *               format: binary
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 *           audio/mpeg:
 *             schema:
 *               type: string
 *               format: binary
 *       400:
 *         description: Invalid file type
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: File not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
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

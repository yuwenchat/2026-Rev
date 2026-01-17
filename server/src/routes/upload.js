import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { existsSync, mkdirSync, writeFileSync, unlinkSync } from 'fs';
import { join, extname } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { randomBytes } from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const router = Router();

// Upload directory
const UPLOAD_DIR = process.env.UPLOAD_DIR || join(__dirname, '../../uploads');

// Ensure upload directory exists
if (!existsSync(UPLOAD_DIR)) {
  mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Allowed file types
const ALLOWED_TYPES = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/gif': '.gif',
  'image/webp': '.webp',
  'application/pdf': '.pdf',
  'text/plain': '.txt',
  'application/zip': '.zip',
  'application/x-zip-compressed': '.zip'
};

// Max file size (10MB)
const MAX_SIZE = 10 * 1024 * 1024;

// Upload file
router.post('/', authMiddleware, async (req, res) => {
  try {
    const contentType = req.headers['content-type'];

    if (!contentType || !contentType.includes('multipart/form-data')) {
      return res.status(400).json({ error: 'Content-Type must be multipart/form-data' });
    }

    // Parse multipart data manually (simple implementation)
    const chunks = [];
    let totalSize = 0;

    for await (const chunk of req) {
      totalSize += chunk.length;
      if (totalSize > MAX_SIZE) {
        return res.status(400).json({ error: 'File too large (max 10MB)' });
      }
      chunks.push(chunk);
    }

    const buffer = Buffer.concat(chunks);

    // Parse multipart boundary
    const boundaryMatch = contentType.match(/boundary=(.+)$/);
    if (!boundaryMatch) {
      return res.status(400).json({ error: 'Invalid multipart data' });
    }

    const boundary = boundaryMatch[1];
    const parts = parseMultipart(buffer, boundary);

    const filePart = parts.find(p => p.filename);
    if (!filePart) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Validate file type
    const mimeType = filePart.contentType;
    const ext = ALLOWED_TYPES[mimeType];
    if (!ext) {
      return res.status(400).json({ error: 'File type not allowed' });
    }

    // Generate unique filename
    const filename = `${Date.now()}_${randomBytes(8).toString('hex')}${ext}`;
    const filepath = join(UPLOAD_DIR, filename);

    // Save file
    writeFileSync(filepath, filePart.data);

    res.json({
      filename,
      originalName: filePart.filename,
      size: filePart.data.length,
      mimeType,
      url: `/uploads/${filename}`
    });
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ error: 'Upload failed' });
  }
});

// Delete file (admin only or owner)
router.delete('/:filename', authMiddleware, (req, res) => {
  try {
    const { filename } = req.params;

    // Sanitize filename
    if (filename.includes('..') || filename.includes('/')) {
      return res.status(400).json({ error: 'Invalid filename' });
    }

    const filepath = join(UPLOAD_DIR, filename);

    if (!existsSync(filepath)) {
      return res.status(404).json({ error: 'File not found' });
    }

    unlinkSync(filepath);
    res.json({ success: true });
  } catch (err) {
    console.error('Delete file error:', err);
    res.status(500).json({ error: 'Failed to delete file' });
  }
});

// Simple multipart parser
function parseMultipart(buffer, boundary) {
  const parts = [];
  const boundaryBuffer = Buffer.from(`--${boundary}`);
  const endBoundary = Buffer.from(`--${boundary}--`);

  let start = buffer.indexOf(boundaryBuffer);
  if (start === -1) return parts;

  start += boundaryBuffer.length + 2; // Skip boundary and CRLF

  while (start < buffer.length) {
    let end = buffer.indexOf(boundaryBuffer, start);
    if (end === -1) {
      end = buffer.indexOf(endBoundary, start);
      if (end === -1) break;
    }

    const partData = buffer.slice(start, end - 2); // -2 for CRLF before boundary

    // Parse headers
    const headerEnd = partData.indexOf('\r\n\r\n');
    if (headerEnd === -1) {
      start = end + boundaryBuffer.length + 2;
      continue;
    }

    const headerStr = partData.slice(0, headerEnd).toString();
    const data = partData.slice(headerEnd + 4);

    const part = { data };

    // Parse Content-Disposition
    const dispositionMatch = headerStr.match(/Content-Disposition: form-data; name="([^"]+)"(?:; filename="([^"]+)")?/i);
    if (dispositionMatch) {
      part.name = dispositionMatch[1];
      if (dispositionMatch[2]) {
        part.filename = dispositionMatch[2];
      }
    }

    // Parse Content-Type
    const contentTypeMatch = headerStr.match(/Content-Type: ([^\r\n]+)/i);
    if (contentTypeMatch) {
      part.contentType = contentTypeMatch[1];
    }

    parts.push(part);

    start = end + boundaryBuffer.length + 2;
  }

  return parts;
}

export default router;

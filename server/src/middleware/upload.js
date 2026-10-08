import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { HttpError } from '../utils/http.js';

export const UPLOAD_DIR = path.resolve(process.env.UPLOAD_DIR || 'uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const ALLOWED = ['.pdf', '.ppt', '.pptx', '.doc', '.docx', '.xls', '.xlsx', '.png', '.jpg', '.jpeg', '.webp', '.txt'];

export const upload = multer({
  storage: multer.diskStorage({
    destination: UPLOAD_DIR,
    filename: (req, file, cb) => cb(null, `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${path.extname(file.originalname).toLowerCase()}`),
  }),
  limits: { fileSize: Number(process.env.MAX_UPLOAD_MB || 10) * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ALLOWED.includes(ext)) cb(null, true);
    else cb(new HttpError(400, `File type ${ext || '(none)'} is not allowed. Allowed: ${ALLOWED.join(', ')}`));
  },
});

export function removeFile(filePath) {
  if (filePath) fs.promises.unlink(path.resolve(UPLOAD_DIR, path.basename(filePath))).catch(() => {});
}

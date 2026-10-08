/** Module 7 — Document Repository with version history. */
import { Router } from 'express';
import path from 'path';
import { Document, User } from '../models/index.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { upload, removeFile, UPLOAD_DIR } from '../middleware/upload.js';
import { loadStartup } from '../services/access.js';
import { notify, mentorUserIdsForStartup } from '../services/notify.js';
import { HttpError } from '../utils/http.js';

const router = Router();
router.use(authenticate);

export const CATEGORIES = ['Pitch Deck', 'Business Plan', 'Prototype Image', 'Presentation', 'Report', 'Other'];

router.get('/', async (req, res) => {
  if (!req.query.startupId) throw new HttpError(400, 'startupId is required');
  const startup = await loadStartup(req, req.query.startupId, { investorView: true });
  const docs = await Document.findAll({
    where: { startupId: startup.id },
    include: [{ model: User, as: 'uploadedBy', attributes: ['id', 'name'] }],
    order: [['fileName', 'ASC'], ['version', 'DESC']],
  });
  res.json(docs);
});

router.post('/', authorize('student', 'admin'), upload.single('file'), async (req, res) => {
  if (!req.file) throw new HttpError(400, 'Please choose a file to upload');
  let startup;
  try {
    startup = await loadStartup(req, req.body.startupId, { ownerOnly: true });
  } catch (err) {
    removeFile(req.file.filename);
    throw err;
  }
  const fileName = String(req.body.title || path.parse(req.file.originalname).name).trim();
  // Re-uploading a document with the same name creates a new version.
  const latest = await Document.max('version', { where: { startupId: startup.id, fileName } });
  const doc = await Document.create({
    startupId: startup.id,
    uploadedById: req.user.id,
    fileName,
    originalName: req.file.originalname,
    fileType: path.extname(req.file.originalname).slice(1).toLowerCase(),
    category: CATEGORIES.includes(req.body.category) ? req.body.category : 'Other',
    filePath: req.file.filename,
    size: req.file.size,
    version: (latest || 0) + 1,
  });
  await notify(await mentorUserIdsForStartup(startup.id), {
    message: `${startup.startupName} uploaded "${fileName}" (v${doc.version})`, type: 'startup', link: `/startups/${startup.id}?tab=documents`,
  }, { email: false });
  res.status(201).json(doc);
});

router.get('/:id/download', async (req, res) => {
  const doc = await Document.findByPk(req.params.id);
  if (!doc) throw new HttpError(404, 'Document not found');
  await loadStartup(req, doc.startupId, { investorView: true });
  const ext = path.extname(doc.filePath);
  res.download(path.join(UPLOAD_DIR, path.basename(doc.filePath)), `${doc.fileName} v${doc.version}${ext}`);
});

router.delete('/:id', authorize('student', 'admin'), async (req, res) => {
  const doc = await Document.findByPk(req.params.id);
  if (!doc) throw new HttpError(404, 'Document not found');
  await loadStartup(req, doc.startupId, { ownerOnly: true });
  await doc.destroy();
  removeFile(doc.filePath);
  res.json({ message: 'Document deleted' });
});

export default router;

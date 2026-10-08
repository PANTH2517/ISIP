/** Module 5 — Funding Requests: apply, modify, approve / reject / request modification, history. */
import { Router } from 'express';
import { FundingRequest, Startup, Document } from '../models/index.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { loadStartup, visibleStartupIds, incubateIfFinanced } from '../services/access.js';
import { notify, adminIds } from '../services/notify.js';
import { HttpError, requireFields, parseAmount } from '../utils/http.js';

const router = Router();
router.use(authenticate, authorize('student', 'mentor', 'admin'));

const inr = (n) => `₹${Number(n).toLocaleString('en-IN')}`;
const docAttrs = ['id', 'fileName', 'version', 'fileType'];
const includes = [
  { model: Startup, as: 'startup', attributes: ['id', 'startupName', 'industry', 'createdById'] },
  { model: Document, as: 'businessPlan', attributes: docAttrs },
  { model: Document, as: 'supportingDocument', attributes: docAttrs },
];

async function validateBody(body, startupId) {
  const amount = parseAmount(body.amount);
  for (const key of ['businessPlanId', 'supportingDocumentId']) {
    if (body[key] && !(await Document.count({ where: { id: body[key], startupId } }))) throw new HttpError(400, 'Selected document does not belong to this startup');
  }
  return {
    purpose: String(body.purpose).trim(),
    amount,
    businessPlanId: body.businessPlanId || null,
    supportingDocumentId: body.supportingDocumentId || null,
  };
}

router.get('/', async (req, res) => {
  const where = {};
  const ids = await visibleStartupIds(req);
  if (ids) where.startupId = ids;
  if (req.query.startupId) {
    await loadStartup(req, req.query.startupId);
    where.startupId = req.query.startupId;
  }
  if (req.query.status) where.status = req.query.status;
  res.json(await FundingRequest.findAll({ where, include: includes, order: [['requestDate', 'DESC']] }));
});

router.post('/', authorize('student'), async (req, res) => {
  requireFields(req.body, ['startupId', 'purpose', 'amount']);
  const startup = await loadStartup(req, req.body.startupId, { ownerOnly: true });
  if (!['approved', 'incubated'].includes(startup.status)) throw new HttpError(400, 'Funding can be requested once your startup is approved');
  const data = await validateBody(req.body, startup.id);
  const request = await FundingRequest.create({ ...data, startupId: startup.id });
  await notify(await adminIds(), { message: `${startup.startupName} requested funding of ${inr(data.amount)}`, type: 'funding', link: '/admin/funding' });
  res.status(201).json(request);
});

router.put('/:id', authorize('student'), async (req, res) => {
  const request = await FundingRequest.findByPk(req.params.id);
  if (!request) throw new HttpError(404, 'Funding request not found');
  const startup = await loadStartup(req, request.startupId, { ownerOnly: true });
  if (!['pending', 'modification_requested'].includes(request.status)) throw new HttpError(400, `A ${request.status} request cannot be modified`);
  requireFields(req.body, ['purpose', 'amount']);
  const wasModification = request.status === 'modification_requested';
  await request.update({ ...(await validateBody(req.body, startup.id)), status: 'pending', requestDate: new Date() });
  if (wasModification) {
    await notify(await adminIds(), { message: `${startup.startupName} resubmitted a modified funding request (${inr(request.amount)})`, type: 'funding', link: '/admin/funding' });
  }
  res.json(request);
});

router.patch('/:id/decision', authorize('admin'), async (req, res) => {
  const { status, adminRemarks } = req.body;
  if (!['approved', 'rejected', 'modification_requested'].includes(status)) throw new HttpError(400, 'Invalid decision');
  const request = await FundingRequest.findByPk(req.params.id, { include: includes });
  if (!request) throw new HttpError(404, 'Funding request not found');
  if (request.status !== 'pending') throw new HttpError(400, `This request is already ${request.status.replace('_', ' ')}`);
  if (status !== 'approved' && !String(adminRemarks || '').trim()) throw new HttpError(400, 'Please add remarks explaining the decision');
  const approvedAmount = status === 'approved' ? Number(req.body.approvedAmount || request.amount) : null;
  if (status === 'approved' && (!(approvedAmount > 0) || approvedAmount > Number(request.amount))) {
    throw new HttpError(400, 'Approved amount must be positive and not exceed the requested amount');
  }
  await request.update({ status, adminRemarks, approvedAmount, decidedAt: new Date() });
  const text = {
    approved: `Funding approved for ${request.startup.startupName}: ${inr(approvedAmount)} 🎉`,
    rejected: `Funding request for ${request.startup.startupName} was rejected.`,
    modification_requested: `Modification requested on your funding request for ${request.startup.startupName}.`,
  }[status];
  await notify(request.startup.createdById, { message: `${text}${adminRemarks ? ` Remarks: ${adminRemarks}` : ''}`, type: 'funding', link: `/startups/${request.startupId}?tab=funding` });
  // Securing finance moves an approved startup into incubation.
  const incubated = status === 'approved' ? await incubateIfFinanced(request.startupId, `incubation funding of ${inr(approvedAmount)}`) : false;
  res.json({ ...request.toJSON(), incubated });
});

export default router;

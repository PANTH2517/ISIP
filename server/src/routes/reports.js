/** Module 10 — Reports (summary statistics, generated reports, CSV & PDF export) and audit log. */
import { Router } from 'express';
import { Report, User, AuditLog } from '../models/index.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { summary, reportRows, REPORT_TYPES } from '../services/stats.js';
import { HttpError } from '../utils/http.js';
import { renderReportPdf } from '../services/reportPdf.js';

const router = Router();
router.use(authenticate, authorize('admin'));

router.get('/summary', async (req, res) => res.json(await summary()));

router.get('/types', (req, res) => res.json(REPORT_TYPES));

router.get('/', async (req, res) => {
  const reports = await Report.findAll({
    attributes: ['id', 'reportType', 'createdAt'],
    include: [{ model: User, as: 'generatedBy', attributes: ['id', 'name'] }],
    order: [['createdAt', 'DESC']],
    limit: 50,
  });
  res.json(reports);
});

router.post('/generate', async (req, res) => {
  const type = req.body.reportType;
  if (!REPORT_TYPES[type]) throw new HttpError(400, `Unknown report type. Choose one of: ${Object.keys(REPORT_TYPES).join(', ')}`);
  const data = await reportRows(type);
  const report = await Report.create({ reportType: type, data, generatedById: req.user.id });
  res.status(201).json({ id: report.id, reportType: type, title: REPORT_TYPES[type], createdAt: report.createdAt, ...data });
});

router.get('/audit/logs', async (req, res) => {
  res.json(await AuditLog.findAll({
    include: [{ model: User, as: 'user', attributes: ['id', 'name', 'email'] }],
    order: [['createdAt', 'DESC']],
    limit: Math.min(Number(req.query.limit) || 200, 1000),
  }));
});

router.get('/:id', async (req, res) => {
  const report = await Report.findByPk(req.params.id);
  if (!report) throw new HttpError(404, 'Report not found');
  res.json({ id: report.id, reportType: report.reportType, title: REPORT_TYPES[report.reportType], createdAt: report.createdAt, ...report.data });
});

const csvCell = (v) => {
  let s = v === null || v === undefined ? '' : String(v);
  if (typeof v === 'string' && /^[=+\-@\t\r]/.test(s)) s = `'${s}`; // neutralise spreadsheet formulas
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

router.get('/:id/csv', async (req, res) => {
  const report = await Report.findByPk(req.params.id);
  if (!report) throw new HttpError(404, 'Report not found');
  const { columns, rows } = report.data;
  const csv = [columns, ...rows].map((r) => r.map(csvCell).join(',')).join('\r\n');
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="isip-${report.reportType}-report-${report.id}.csv"`);
  res.send('﻿' + csv);
});

router.get('/:id/pdf', async (req, res) => {
  const report = await Report.findByPk(req.params.id, { include: [{ model: User, as: 'generatedBy', attributes: ['name'] }] });
  if (!report) throw new HttpError(404, 'Report not found');
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="isip-${report.reportType}-report-${report.id}.pdf"`);
  renderReportPdf({
    title: REPORT_TYPES[report.reportType] || report.reportType,
    createdAt: report.createdAt,
    generatedBy: report.generatedBy?.name,
    ...report.data,
  }, res);
});

export default router;

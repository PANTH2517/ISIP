import { AuditLog } from '../models/index.js';

/** NFR: Audit logging — records every state-changing request once the response is sent. */
export function auditLogger(req, res, next) {
  if (req.method === 'GET' || req.method === 'OPTIONS' || req.method === 'HEAD') return next();
  res.on('finish', () => {
    const path = req.originalUrl.split('?')[0];
    AuditLog.create({
      userId: req.user?.id ?? null,
      method: req.method,
      path,
      statusCode: res.statusCode,
      ip: req.ip,
      action: req.auditAction || describe(req.method, path),
    }).catch(() => {});
  });
  next();
}

function describe(method, path) {
  const resource = path.replace(/^\/api\//, '').replace(/\/\d+/g, '/:id');
  const verb = { POST: 'Create', PUT: 'Update', PATCH: 'Update', DELETE: 'Delete' }[method] || method;
  return `${verb} ${resource}`;
}

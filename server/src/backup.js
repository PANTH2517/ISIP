/** NFR: Backup support — `npm run backup` exports every table to backups/isip-backup-<timestamp>.json. */
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { sequelize } from './models/index.js';

const dir = path.resolve('backups');
fs.mkdirSync(dir, { recursive: true });

const backup = { createdAt: new Date().toISOString(), dialect: sequelize.getDialect(), tables: {} };
for (const [name, model] of Object.entries(sequelize.models)) {
  backup.tables[name] = (await model.findAll({ raw: true })).map((row) => row);
}
const file = path.join(dir, `isip-backup-${backup.createdAt.replace(/[:.]/g, '-')}.json`);
fs.writeFileSync(file, JSON.stringify(backup, null, 2));
const counts = Object.entries(backup.tables).map(([k, v]) => `${k}: ${v.length}`).join(', ');
console.log(`Backup written to ${file}\n${counts}`);
await sequelize.close();

import crypto from 'crypto';

// AES-256-GCM field encryption used for sensitive personal data (NFR: Data Encryption).
const key = () => crypto.createHash('sha256').update(process.env.ENCRYPTION_KEY || 'isip-dev-encryption-key').digest();

export function encrypt(text) {
  if (text === null || text === undefined || text === '') return text;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key(), iv);
  const data = Buffer.concat([cipher.update(String(text), 'utf8'), cipher.final()]);
  return ['v1', iv.toString('base64'), cipher.getAuthTag().toString('base64'), data.toString('base64')].join(':');
}

export function decrypt(payload) {
  if (!payload || !String(payload).startsWith('v1:')) return payload;
  try {
    const [, iv, tag, data] = payload.split(':');
    const decipher = crypto.createDecipheriv('aes-256-gcm', key(), Buffer.from(iv, 'base64'));
    decipher.setAuthTag(Buffer.from(tag, 'base64'));
    return Buffer.concat([decipher.update(Buffer.from(data, 'base64')), decipher.final()]).toString('utf8');
  } catch {
    return null;
  }
}

export const randomToken = () => crypto.randomBytes(24).toString('hex');

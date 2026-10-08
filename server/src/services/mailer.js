import nodemailer from 'nodemailer';

let transporter = null;
if (process.env.SMTP_HOST) {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
  });
}

/** Sends an email via SMTP when configured, otherwise prints it to the console (development). */
export async function sendMail(to, subject, text) {
  if (!transporter) {
    console.log(`\n[email] To: ${to}\n[email] Subject: ${subject}\n[email] ${text}\n`);
    return;
  }
  await transporter.sendMail({ from: process.env.MAIL_FROM || 'StartIn ISIP <no-reply@isip.local>', to, subject, text });
}

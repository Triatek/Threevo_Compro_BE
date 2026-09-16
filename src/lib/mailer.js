import nodemailer from 'nodemailer';
import { env } from '../config/env.js';
import { logger } from './logger.js';

export const isSmtpConfigured = Boolean(env.SMTP_HOST);

// Without SMTP the email is rendered to JSON and only logged (development mode).
const transporter = isSmtpConfigured
  ? nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT ?? (env.SMTP_SECURE ? 465 : 587),
      secure: env.SMTP_SECURE,
      ...(env.SMTP_USER && { auth: { user: env.SMTP_USER, pass: env.SMTP_PASS } }),
    })
  : nodemailer.createTransport({ jsonTransport: true });

/** Wrapped in an object so tests can spy on `mailer.send`. */
export const mailer = {
  /**
   * @param {{ to: string, subject: string, html: string, text: string, replyTo?: string }} options
   */
  async send({ to, subject, html, text, replyTo }) {
    const info = await transporter.sendMail({ from: env.MAIL_FROM, to, subject, html, text, replyTo });

    if (!isSmtpConfigured) {
      logger.info({ mail: { to, subject, text } }, 'SMTP not configured, email logged instead of sent');
    }
    return info;
  },
};

import { env } from '../config/env.js';
import { logger } from './logger.js';

const TURNSTILE_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
const TIMEOUT_MS = 5000;

let warnedMissingSecret = false;

/** Wrapped in an object so tests can spy on `captcha.verify`. */
export const captcha = {
  /**
   * Verify a Cloudflare Turnstile token. Skipped (returns true) when
   * TURNSTILE_SECRET_KEY is not configured.
   * @returns {Promise<boolean>}
   */
  async verify(token, ipAddress) {
    if (!env.TURNSTILE_SECRET_KEY) {
      if (!warnedMissingSecret && !env.isTest) {
        logger.warn('TURNSTILE_SECRET_KEY is not set, CAPTCHA verification is skipped');
        warnedMissingSecret = true;
      }
      return true;
    }
    if (!token) return false;

    try {
      const response = await fetch(TURNSTILE_VERIFY_URL, {
        method: 'POST',
        body: new URLSearchParams({
          secret: env.TURNSTILE_SECRET_KEY,
          response: token,
          ...(ipAddress && { remoteip: ipAddress }),
        }),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      const result = await response.json();
      return result.success === true;
    } catch (err) {
      logger.error({ err }, 'Turnstile verification request failed');
      return false;
    }
  },
};

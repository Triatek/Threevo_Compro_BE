import { env } from '../../config/env.js';
import { actorFromRequest } from '../../lib/audit.js';
import { ACCESS_TOKEN_COOKIE } from '../../middlewares/auth.js';
import { sendSuccess } from '../../utils/response.js';
import * as authService from './auth.service.js';

export const REFRESH_TOKEN_COOKIE = 'refresh_token';

const baseCookieOptions = {
  httpOnly: true,
  secure: env.COOKIE_SECURE,
  sameSite: 'lax',
  ...(env.COOKIE_DOMAIN && { domain: env.COOKIE_DOMAIN }),
};

const accessCookieOptions = { ...baseCookieOptions, path: '/' };
// The refresh token is only sent to /auth endpoints.
const refreshCookieOptions = { ...baseCookieOptions, path: `${env.API_PREFIX}/auth` };

function requestMeta(req) {
  return {
    userAgent: req.get('user-agent'),
    ipAddress: actorFromRequest(req).ipAddress,
  };
}

function setAuthCookies(res, { accessToken, refreshToken, refreshTokenExpiresAt }) {
  // Cookie lifetime follows the JWT expiry.
  const [, payload] = accessToken.split('.');
  const { exp } = JSON.parse(Buffer.from(payload, 'base64url').toString());

  res.cookie(ACCESS_TOKEN_COOKIE, accessToken, {
    ...accessCookieOptions,
    maxAge: exp * 1000 - Date.now(),
  });
  res.cookie(REFRESH_TOKEN_COOKIE, refreshToken, {
    ...refreshCookieOptions,
    expires: refreshTokenExpiresAt,
  });
}

function clearAuthCookies(res) {
  res.clearCookie(ACCESS_TOKEN_COOKIE, accessCookieOptions);
  res.clearCookie(REFRESH_TOKEN_COOKIE, refreshCookieOptions);
}

export async function login(req, res) {
  const result = await authService.login(req.validated.body, requestMeta(req));
  setAuthCookies(res, result);
  sendSuccess(res, { user: result.user }, { message: 'Login berhasil' });
}

export async function refresh(req, res) {
  try {
    const result = await authService.refresh(req.cookies?.[REFRESH_TOKEN_COOKIE], requestMeta(req));
    setAuthCookies(res, result);
    sendSuccess(res, { user: result.user }, { message: 'Sesi diperbarui' });
  } catch (err) {
    // An invalid refresh token must not stay in the browser.
    clearAuthCookies(res);
    throw err;
  }
}

export async function logout(req, res) {
  await authService.logout(req.cookies?.[REFRESH_TOKEN_COOKIE], requestMeta(req));
  clearAuthCookies(res);
  sendSuccess(res, null, { message: 'Logout berhasil' });
}

export async function me(req, res) {
  sendSuccess(res, req.user);
}

export async function changePassword(req, res) {
  await authService.changePassword(
    actorFromRequest(req),
    req.validated.body,
    req.cookies?.[REFRESH_TOKEN_COOKIE],
  );
  sendSuccess(res, null, { message: 'Password berhasil diubah' });
}

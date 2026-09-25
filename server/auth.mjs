import crypto from "node:crypto";
import { config } from "dotenv";

config();

const COOKIE_NAME = "laya_session";
const SESSION_MAX_AGE_SEC = 7 * 24 * 60 * 60; // 7 days
const LOGIN_RATE_LIMIT = 8;
const LOGIN_RATE_WINDOW_MS = 15 * 60 * 1000;

const AUTH_EMAIL = process.env.AUTH_EMAIL?.trim() || "";
const AUTH_PASSWORD = process.env.AUTH_PASSWORD?.trim() || "";
const AUTH_SECRET = process.env.AUTH_SECRET?.trim() || "";

const loginAttempts = new Map();

function hashValue(value) {
  return crypto.createHash("sha256").update(value, "utf8").digest();
}

function timingSafeEqualStrings(a, b) {
  const hashA = hashValue(a);
  const hashB = hashValue(b);
  return crypto.timingSafeEqual(hashA, hashB);
}

export function isAuthConfigured() {
  return Boolean(AUTH_EMAIL && AUTH_PASSWORD && AUTH_SECRET);
}

export function getAuthEmail() {
  return AUTH_EMAIL;
}

function signPayload(payload) {
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto
    .createHmac("sha256", AUTH_SECRET)
    .update(encoded)
    .digest("base64url");
  return `${encoded}.${signature}`;
}

function verifyToken(token) {
  if (!token || !AUTH_SECRET) return null;

  const parts = token.split(".");
  if (parts.length !== 2) return null;

  const [encoded, signature] = parts;
  const expected = crypto
    .createHmac("sha256", AUTH_SECRET)
    .update(encoded)
    .digest("base64url");

  const sigBuf = Buffer.from(signature, "base64url");
  const expectedBuf = Buffer.from(expected, "base64url");
  if (sigBuf.length !== expectedBuf.length) return null;
  if (!crypto.timingSafeEqual(sigBuf, expectedBuf)) return null;

  try {
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
    if (
      typeof payload.exp !== "number" ||
      typeof payload.iat !== "number" ||
      payload.exp <= Date.now()
    ) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

function parseCookies(req) {
  const header = req.headers.cookie;
  if (!header) return {};

  const cookies = {};
  for (const part of header.split(";")) {
    const [rawKey, ...rest] = part.trim().split("=");
    if (!rawKey) continue;
    cookies[rawKey] = decodeURIComponent(rest.join("="));
  }
  return cookies;
}

function isSecureRequest(req) {
  if (req.headers["x-forwarded-proto"] === "https") return true;
  return false;
}

function buildCookie(name, value, options = {}) {
  const parts = [`${name}=${value}`];
  if (options.maxAge !== undefined) parts.push(`Max-Age=${options.maxAge}`);
  parts.push("Path=/");
  if (options.httpOnly) parts.push("HttpOnly");
  if (options.sameSite) parts.push(`SameSite=${options.sameSite}`);
  if (options.secure) parts.push("Secure");
  return parts.join("; ");
}

export function createSessionCookie(req) {
  const now = Date.now();
  const payload = {
    iat: now,
    exp: now + SESSION_MAX_AGE_SEC * 1000,
  };
  const token = signPayload(payload);
  const cookie = buildCookie(COOKIE_NAME, token, {
    maxAge: SESSION_MAX_AGE_SEC,
    httpOnly: true,
    sameSite: "Strict",
    secure: isSecureRequest(req),
  });
  return cookie;
}

export function clearSessionCookie(req) {
  return buildCookie(COOKIE_NAME, "", {
    maxAge: 0,
    httpOnly: true,
    sameSite: "Strict",
    secure: isSecureRequest(req),
  });
}

export function getSessionFromRequest(req) {
  const cookies = parseCookies(req);
  const token = cookies[COOKIE_NAME];
  const payload = verifyToken(token);
  if (!payload) return null;
  return { email: AUTH_EMAIL };
}

export function verifyCredentials(email, password) {
  if (!isAuthConfigured()) return false;
  if (!email || !password) return false;
  if (!timingSafeEqualStrings(email, AUTH_EMAIL)) return false;
  if (!timingSafeEqualStrings(password, AUTH_PASSWORD)) return false;
  return true;
}

function getClientIp(req) {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.length > 0) {
    return forwarded.split(",")[0].trim();
  }
  return req.socket?.remoteAddress || "unknown";
}

export function checkLoginRateLimit(req) {
  const ip = getClientIp(req);
  const now = Date.now();
  const entry = loginAttempts.get(ip);

  if (!entry || now - entry.windowStart > LOGIN_RATE_WINDOW_MS) {
    loginAttempts.set(ip, { windowStart: now, count: 0 });
    return { allowed: true };
  }

  if (entry.count >= LOGIN_RATE_LIMIT) {
    const retryAfterSec = Math.ceil(
      (LOGIN_RATE_WINDOW_MS - (now - entry.windowStart)) / 1000,
    );
    return { allowed: false, retryAfterSec };
  }

  return { allowed: true };
}

export function recordLoginFailure(req) {
  const ip = getClientIp(req);
  const now = Date.now();
  const entry = loginAttempts.get(ip);

  if (!entry || now - entry.windowStart > LOGIN_RATE_WINDOW_MS) {
    loginAttempts.set(ip, { windowStart: now, count: 1 });
    return;
  }

  entry.count += 1;
}

export function clearLoginFailures(req) {
  const ip = getClientIp(req);
  loginAttempts.delete(ip);
}

import crypto from "node:crypto";
import { config } from "dotenv";

config();

const COOKIE_NAME = "session";
const SESSION_MAX_AGE_SEC = 7 * 24 * 60 * 60; // 7 days
const LOGIN_RATE_LIMIT = 8;
const LOGIN_RATE_WINDOW_MS = 15 * 60 * 1000;

const AUTH_EMAIL = process.env.AUTH_EMAIL?.trim() || "";
const AUTH_PASSWORD = process.env.AUTH_PASSWORD?.trim() || "";
const AUTH_SECRET = process.env.AUTH_SECRET?.trim() || "";

const GUEST_EMAIL = process.env.GUEST_EMAIL?.trim() || "";
const GUEST_PASSWORD = process.env.GUEST_PASSWORD?.trim() || "";
const GUEST_API = process.env.GUEST_API?.trim() || "";

const loginAttempts = new Map();

function hashValue(value) {
  return crypto.createHash("sha256").update(value, "utf8").digest();
}

function timingSafeEqualStrings(a, b) {
  const hashA = hashValue(a);
  const hashB = hashValue(b);
  return crypto.timingSafeEqual(hashA, hashB);
}

export function isAdminConfigured() {
  return Boolean(AUTH_EMAIL && AUTH_PASSWORD);
}

export function isGuestConfigured() {
  return Boolean(GUEST_EMAIL && GUEST_PASSWORD && GUEST_API);
}

export function isAuthConfigured() {
  return Boolean(isAdminConfigured() && AUTH_SECRET);
}

export function isLoginEnabled() {
  return Boolean(AUTH_SECRET && (isAdminConfigured() || isGuestConfigured()));
}

export function getAuthEmail() {
  return AUTH_EMAIL;
}

export function getGuestApiKey() {
  return isGuestConfigured() ? GUEST_API : "";
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
      payload.exp <= Date.now() ||
      typeof payload.email !== "string" ||
      !payload.email ||
      (payload.role !== "admin" && payload.role !== "guest")
    ) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

function parseCookieHeader(header) {
  if (!header) return {};

  const cookies = {};
  for (const part of header.split(";")) {
    const [rawKey, ...rest] = part.trim().split("=");
    if (!rawKey) continue;
    cookies[rawKey] = decodeURIComponent(rest.join("="));
  }
  return cookies;
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

export function createRequestContext(source) {
  if (source?.headers?.get) {
    const forwarded = source.headers.get("x-forwarded-for");
    return {
      cookieHeader: source.headers.get("cookie"),
      secure: source.headers.get("x-forwarded-proto") === "https",
      clientIp:
        (typeof forwarded === "string" && forwarded.split(",")[0].trim()) ||
        "unknown",
    };
  }

  const forwarded = source.headers?.["x-forwarded-for"];
  return {
    cookieHeader: source.headers?.cookie || null,
    secure: source.headers?.["x-forwarded-proto"] === "https",
    clientIp:
      (typeof forwarded === "string" && forwarded.split(",")[0].trim()) ||
      source.socket?.remoteAddress ||
      "unknown",
  };
}

export function createSessionCookie(ctx, session) {
  const now = Date.now();
  const payload = {
    iat: now,
    exp: now + SESSION_MAX_AGE_SEC * 1000,
    email: session.email,
    role: session.role,
  };
  const token = signPayload(payload);
  return buildCookie(COOKIE_NAME, token, {
    maxAge: SESSION_MAX_AGE_SEC,
    httpOnly: true,
    sameSite: "Strict",
    secure: ctx.secure,
  });
}

export function clearSessionCookie(ctx) {
  return buildCookie(COOKIE_NAME, "", {
    maxAge: 0,
    httpOnly: true,
    sameSite: "Strict",
    secure: ctx.secure,
  });
}

export function getSessionFromContext(ctx) {
  const cookies = parseCookieHeader(ctx.cookieHeader);
  const token = cookies[COOKIE_NAME];
  const payload = verifyToken(token);
  if (!payload) return null;
  return { email: payload.email, role: payload.role };
}

export function getSessionFromRequest(req) {
  return getSessionFromContext(createRequestContext(req));
}

export function verifyCredentials(email, password) {
  if (!isLoginEnabled()) return { ok: false };
  if (!email || !password) return { ok: false };

  if (isAdminConfigured()) {
    if (
      timingSafeEqualStrings(email, AUTH_EMAIL) &&
      timingSafeEqualStrings(password, AUTH_PASSWORD)
    ) {
      return { ok: true, email: AUTH_EMAIL, role: "admin" };
    }
  }

  if (isGuestConfigured()) {
    if (
      timingSafeEqualStrings(email, GUEST_EMAIL) &&
      timingSafeEqualStrings(password, GUEST_PASSWORD)
    ) {
      return { ok: true, email: GUEST_EMAIL, role: "guest" };
    }
  }

  return { ok: false };
}

export function checkLoginRateLimit(ctx) {
  const ip = ctx.clientIp;
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

export function recordLoginFailure(ctx) {
  const ip = ctx.clientIp;
  const now = Date.now();
  const entry = loginAttempts.get(ip);

  if (!entry || now - entry.windowStart > LOGIN_RATE_WINDOW_MS) {
    loginAttempts.set(ip, { windowStart: now, count: 1 });
    return;
  }

  entry.count += 1;
}

export function clearLoginFailures(ctx) {
  loginAttempts.delete(ctx.clientIp);
}

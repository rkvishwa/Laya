import {
  checkLoginRateLimit,
  clearLoginFailures,
  clearSessionCookie,
  createSessionCookie,
  getAuthEmail,
  getSessionFromContext,
  isAuthConfigured,
  recordLoginFailure,
  verifyCredentials,
} from "./auth.mjs";
import { forwardPredict, layaConfig } from "./upstream.mjs";

function jsonResult(status, body, headers = {}) {
  return { status, body, headers };
}

function requireSession(ctx) {
  const session = getSessionFromContext(ctx);
  if (!session) {
    return { error: jsonResult(401, { error: "Unauthorized" }) };
  }
  return { session };
}

export function handleLogin(ctx, body) {
  if (!isAuthConfigured()) {
    return jsonResult(503, {
      error: "Authentication not configured",
      detail:
        "Set AUTH_EMAIL, AUTH_PASSWORD, and AUTH_SECRET before logging in.",
    });
  }

  const rateLimit = checkLoginRateLimit(ctx);
  if (!rateLimit.allowed) {
    return jsonResult(
      429,
      {
        error: "Too many login attempts",
        detail: `Try again in ${rateLimit.retryAfterSec} seconds.`,
      },
      { "Retry-After": String(rateLimit.retryAfterSec) },
    );
  }

  const email = typeof body?.email === "string" ? body.email.trim() : "";
  const password = typeof body?.password === "string" ? body.password : "";

  if (verifyCredentials(email, password)) {
    clearLoginFailures(ctx);
    return jsonResult(
      200,
      { email: getAuthEmail() },
      { "Set-Cookie": createSessionCookie(ctx) },
    );
  }

  recordLoginFailure(ctx);
  return jsonResult(401, { error: "Invalid email or password" });
}

export function handleLogout(ctx) {
  return jsonResult(200, { ok: true }, {
    "Set-Cookie": clearSessionCookie(ctx),
  });
}

export function handleSession(ctx) {
  const session = getSessionFromContext(ctx);
  if (!session) {
    return jsonResult(401, { error: "Unauthorized" });
  }
  return jsonResult(200, { email: session.email });
}

export function handleHealth(ctx) {
  const auth = requireSession(ctx);
  if (auth.error) return auth.error;

  const { configured, domain } = layaConfig();
  return jsonResult(200, {
    configured,
    domain: domain || null,
  });
}

export async function handlePredict(ctx, rawBody) {
  const auth = requireSession(ctx);
  if (auth.error) return auth.error;

  const { status, body } = await forwardPredict(rawBody);
  return jsonResult(status, body);
}

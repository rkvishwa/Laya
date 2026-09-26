import {
  checkLoginRateLimit,
  clearLoginFailures,
  clearSessionCookie,
  createSessionCookie,
  getGuestApiKey,
  getSessionFromContext,
  isGuestConfigured,
  isLoginEnabled,
  recordLoginFailure,
  verifyCredentials,
} from "./auth.mjs";
import {
  forwardPredict,
  getApiKeyForRole,
  isPredictConfiguredForSession,
  modelConfig,
  predictUrl,
} from "./upstream.mjs";

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
  if (!isLoginEnabled()) {
    return jsonResult(503, {
      error: "Authentication not configured",
      detail:
        "Set AUTH_SECRET and admin (AUTH_EMAIL, AUTH_PASSWORD) or guest (GUEST_EMAIL, GUEST_PASSWORD, GUEST_API) credentials before logging in.",
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

  const verified = verifyCredentials(email, password);
  if (verified.ok) {
    clearLoginFailures(ctx);
    return jsonResult(
      200,
      { email: verified.email, role: verified.role },
      {
        "Set-Cookie": createSessionCookie(ctx, {
          email: verified.email,
          role: verified.role,
        }),
      },
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
  return jsonResult(200, { email: session.email, role: session.role });
}

export function handleHealth(ctx) {
  const auth = requireSession(ctx);
  if (auth.error) return auth.error;

  const configured = isPredictConfiguredForSession(auth.session);
  return jsonResult(200, {
    configured,
  });
}

export function handleDocsInfo(ctx) {
  const auth = requireSession(ctx);
  if (auth.error) return auth.error;

  const { baseUrl } = modelConfig();
  const guestLoginEnabled = isGuestConfigured();

  return jsonResult(200, {
    guestLoginEnabled,
    guestApiKey: guestLoginEnabled ? getGuestApiKey() : null,
    predictUrl: baseUrl ? predictUrl(baseUrl) : null,
  });
}

export async function handlePredict(ctx, rawBody) {
  const auth = requireSession(ctx);
  if (auth.error) return auth.error;

  const apiKey = getApiKeyForRole(auth.session.role);
  const { status, body } = await forwardPredict(rawBody, { apiKey });
  return jsonResult(status, body);
}

import http from "node:http";
import { config } from "dotenv";
import {
  checkLoginRateLimit,
  clearLoginFailures,
  clearSessionCookie,
  createSessionCookie,
  getAuthEmail,
  getSessionFromRequest,
  isAuthConfigured,
  recordLoginFailure,
  verifyCredentials,
} from "./auth.mjs";

config();

const PORT = Number(process.env.PROXY_PORT || 3001);
const DOMAIN = process.env.LAYA_DOMAIN?.trim() || "";
const API_KEY = process.env.LAYA_API_KEY?.trim() || "";

function normalizeDomain(raw) {
  if (!raw) return null;

  let base = raw.replace(/\/+$/, "");
  if (!/^https?:\/\//i.test(base)) {
    base = `https://${base}`;
  }

  if (base.endsWith("/v1/predict")) {
    return base;
  }

  return `${base}/v1/predict`;
}

const PREDICT_URL = normalizeDomain(DOMAIN);

function sendJson(res, status, body, headers = {}) {
  res.writeHead(status, {
    "Content-Type": "application/json",
    ...headers,
  });
  res.end(JSON.stringify(body));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

function requireSession(req, res) {
  const session = getSessionFromRequest(req);
  if (!session) {
    sendJson(res, 401, { error: "Unauthorized" });
    return null;
  }
  return session;
}

async function handleLogin(req, res) {
  if (!isAuthConfigured()) {
    sendJson(res, 503, {
      error: "Authentication not configured",
      detail:
        "Set AUTH_EMAIL, AUTH_PASSWORD, and AUTH_SECRET in .env before logging in.",
    });
    return;
  }

  const rateLimit = checkLoginRateLimit(req);
  if (!rateLimit.allowed) {
    sendJson(
      res,
      429,
      {
        error: "Too many login attempts",
        detail: `Try again in ${rateLimit.retryAfterSec} seconds.`,
      },
      { "Retry-After": String(rateLimit.retryAfterSec) },
    );
    return;
  }

  let rawBody;
  try {
    rawBody = await readBody(req);
    const body = JSON.parse(rawBody);
    const email = typeof body.email === "string" ? body.email.trim() : "";
    const password = typeof body.password === "string" ? body.password : "";

    if (verifyCredentials(email, password)) {
      clearLoginFailures(req);
      sendJson(res, 200, { email: getAuthEmail() }, {
        "Set-Cookie": createSessionCookie(req),
      });
      return;
    }

    recordLoginFailure(req);
    sendJson(res, 401, { error: "Invalid email or password" });
  } catch {
    sendJson(res, 400, { error: "Invalid JSON body" });
  }
}

function handleLogout(req, res) {
  sendJson(res, 200, { ok: true }, {
    "Set-Cookie": clearSessionCookie(req),
  });
}

function handleSession(req, res) {
  const session = getSessionFromRequest(req);
  if (!session) {
    sendJson(res, 401, { error: "Unauthorized" });
    return;
  }
  sendJson(res, 200, { email: session.email });
}

function handleHealth(req, res) {
  if (!requireSession(req, res)) return;

  sendJson(res, 200, {
    configured: Boolean(PREDICT_URL && API_KEY),
    domain: DOMAIN || null,
  });
}

async function handlePredict(req, res) {
  if (!requireSession(req, res)) return;

  if (!PREDICT_URL || !API_KEY) {
    sendJson(res, 503, {
      error: "Missing configuration",
      detail:
        "Set LAYA_DOMAIN and LAYA_API_KEY in .env before running predictions.",
    });
    return;
  }

  let rawBody;
  try {
    rawBody = await readBody(req);
    JSON.parse(rawBody);
  } catch {
    sendJson(res, 400, { error: "Invalid JSON body" });
    return;
  }

  try {
    const upstream = await fetch(PREDICT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": API_KEY,
      },
      body: rawBody,
    });

    const text = await upstream.text();
    let payload;
    try {
      payload = JSON.parse(text);
    } catch {
      payload = { raw: text };
    }

    sendJson(res, upstream.status, payload);
  } catch (err) {
    sendJson(res, 502, {
      error: "Upstream request failed",
      detail: err instanceof Error ? err.message : String(err),
    });
  }
}

const server = http.createServer(async (req, res) => {
  const url = req.url?.split("?")[0] || "";

  if (req.method === "POST" && url === "/api/login") {
    await handleLogin(req, res);
    return;
  }

  if (req.method === "POST" && url === "/api/logout") {
    handleLogout(req, res);
    return;
  }

  if (req.method === "GET" && url === "/api/session") {
    handleSession(req, res);
    return;
  }

  if (req.method === "GET" && url === "/api/health") {
    handleHealth(req, res);
    return;
  }

  if (req.method === "POST" && url === "/api/predict") {
    await handlePredict(req, res);
    return;
  }

  sendJson(res, 404, { error: "Not found" });
});

server.listen(PORT, () => {
  console.log(`Laya proxy listening on http://localhost:${PORT}`);
  if (!isAuthConfigured()) {
    console.warn(
      "Warning: AUTH_EMAIL, AUTH_PASSWORD, and/or AUTH_SECRET are not set in .env",
    );
  }
  if (!PREDICT_URL || !API_KEY) {
    console.warn(
      "Warning: LAYA_DOMAIN and/or LAYA_API_KEY are not set in .env",
    );
  } else {
    console.log(`Forwarding to ${PREDICT_URL}`);
  }
});

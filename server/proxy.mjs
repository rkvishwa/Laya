import http from "node:http";
import { config } from "dotenv";

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

function sendJson(res, status, body) {
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
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

const server = http.createServer(async (req, res) => {
  if (req.method === "OPTIONS") {
    sendJson(res, 204, {});
    return;
  }

  if (req.method === "GET" && req.url === "/api/health") {
    sendJson(res, 200, {
      configured: Boolean(PREDICT_URL && API_KEY),
      domain: DOMAIN || null,
    });
    return;
  }

  if (req.method !== "POST" || req.url !== "/api/predict") {
    sendJson(res, 404, { error: "Not found" });
    return;
  }

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
});

server.listen(PORT, () => {
  console.log(`Laya proxy listening on http://localhost:${PORT}`);
  if (!PREDICT_URL || !API_KEY) {
    console.warn(
      "Warning: LAYA_DOMAIN and/or LAYA_API_KEY are not set in .env",
    );
  } else {
    console.log(`Forwarding to ${PREDICT_URL}`);
  }
});

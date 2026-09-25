import http from "node:http";
import { config } from "dotenv";
import { createRequestContext, isAuthConfigured } from "./auth.mjs";
import {
  handleHealth,
  handleLogin,
  handleLogout,
  handlePredict,
  handleSession,
} from "./handlers.mjs";
import { layaConfig } from "./upstream.mjs";

config();

const PORT = Number(process.env.PROXY_PORT || 3001);

function sendResult(res, result) {
  res.writeHead(result.status, {
    "Content-Type": "application/json",
    ...(result.headers || {}),
  });
  res.end(JSON.stringify(result.body));
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
  const url = req.url?.split("?")[0] || "";
  const ctx = createRequestContext(req);

  if (req.method === "POST" && url === "/api/login") {
    try {
      const rawBody = await readBody(req);
      const body = JSON.parse(rawBody);
      sendResult(res, handleLogin(ctx, body));
    } catch {
      sendResult(res, { status: 400, body: { error: "Invalid JSON body" } });
    }
    return;
  }

  if (req.method === "POST" && url === "/api/logout") {
    sendResult(res, handleLogout(ctx));
    return;
  }

  if (req.method === "GET" && url === "/api/session") {
    sendResult(res, handleSession(ctx));
    return;
  }

  if (req.method === "GET" && url === "/api/health") {
    sendResult(res, handleHealth(ctx));
    return;
  }

  if (req.method === "POST" && url === "/api/predict") {
    try {
      const rawBody = await readBody(req);
      sendResult(res, await handlePredict(ctx, rawBody));
    } catch {
      sendResult(res, { status: 400, body: { error: "Invalid JSON body" } });
    }
    return;
  }

  sendResult(res, { status: 404, body: { error: "Not found" } });
});

server.listen(PORT, () => {
  const { configured, predictUrl } = layaConfig();
  console.log(`Laya proxy listening on http://localhost:${PORT}`);
  if (!isAuthConfigured()) {
    console.warn(
      "Warning: AUTH_EMAIL, AUTH_PASSWORD, and/or AUTH_SECRET are not set in .env",
    );
  }
  if (!configured) {
    console.warn(
      "Warning: LAYA_DOMAIN and/or LAYA_API_KEY are not set in .env",
    );
  } else {
    console.log(`Forwarding to ${predictUrl}`);
  }
});

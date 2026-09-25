import http from "node:http";
import { config } from "dotenv";
import { forwardPredict, layaConfig } from "./upstream.mjs";

config();

const PORT = Number(process.env.PROXY_PORT || 3001);
const { domain, predictUrl, configured } = layaConfig();

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
      configured,
      domain: domain || null,
    });
    return;
  }

  if (req.method !== "POST" || req.url !== "/api/predict") {
    sendJson(res, 404, { error: "Not found" });
    return;
  }

  const rawBody = await readBody(req);
  const result = await forwardPredict(rawBody);
  sendJson(res, result.status, result.body);
});

server.listen(PORT, () => {
  console.log(`Laya proxy listening on http://localhost:${PORT}`);
  if (!configured) {
    console.warn(
      "Warning: LAYA_DOMAIN and/or LAYA_API_KEY are not set in .env",
    );
  } else {
    console.log(`Forwarding to ${predictUrl}`);
  }
});

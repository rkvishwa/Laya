import { createRequestContext } from "./auth.mjs";

export function nodeContext(req) {
  return createRequestContext(req);
}

export function sendNodeResponse(res, result) {
  for (const [key, value] of Object.entries(result.headers || {})) {
    res.setHeader(key, value);
  }
  res.status(result.status).json(result.body);
}

export function readJsonBody(req) {
  if (req.body && typeof req.body === "object") {
    return req.body;
  }
  if (typeof req.body === "string" && req.body.length > 0) {
    return JSON.parse(req.body);
  }
  return {};
}

export function readPredictBody(req) {
  if (typeof req.body === "string") {
    return req.body;
  }
  if (req.body && typeof req.body === "object") {
    return JSON.stringify(req.body);
  }
  return "{}";
}

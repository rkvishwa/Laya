import { getGuestApiKey } from "./auth.mjs";

export function predictUrl(baseUrl) {
  if (!baseUrl) return null;

  let base = baseUrl.trim().replace(/\/+$/, "");
  if (!/^https?:\/\//i.test(base)) {
    base = `https://${base}`;
  }

  if (base.endsWith("/v1/predict")) {
    return base;
  }

  return `${base}/v1/predict`;
}

export function modelConfig() {
  const baseUrl = process.env.MODEL_BASE_URL?.trim() || "";
  const apiKey = process.env.MODEL_API_KEY?.trim() || "";
  return {
    baseUrl,
    apiKey,
    predictUrl: predictUrl(baseUrl),
    configured: Boolean(baseUrl && apiKey),
  };
}

export function getApiKeyForRole(role) {
  if (role === "guest") {
    return getGuestApiKey();
  }
  return process.env.MODEL_API_KEY?.trim() || "";
}

export function isPredictConfiguredForSession(session) {
  const baseUrl = process.env.MODEL_BASE_URL?.trim() || "";
  const apiKey = getApiKeyForRole(session?.role);
  return Boolean(baseUrl && apiKey);
}

function sanitizePredictPayload(payload) {
  if (payload === null || typeof payload !== "object" || Array.isArray(payload)) {
    return payload;
  }
  const { model: _model, ...rest } = payload;
  return rest;
}

export async function forwardPredict(rawBody, { apiKey }) {
  const baseUrl = process.env.MODEL_BASE_URL?.trim() || "";
  const url = predictUrl(baseUrl);
  const key = apiKey?.trim() || "";

  if (!baseUrl || !key) {
    return {
      status: 503,
      body: {
        error: "Missing configuration",
        detail:
          "Set MODEL_BASE_URL and the appropriate API key before running predictions.",
      },
    };
  }

  try {
    JSON.parse(rawBody);
  } catch {
    return { status: 400, body: { error: "Invalid JSON body" } };
  }

  try {
    const upstream = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": key,
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

    return {
      status: upstream.status,
      body: sanitizePredictPayload(payload),
    };
  } catch (err) {
    return {
      status: 502,
      body: {
        error: "Upstream request failed",
        detail: err instanceof Error ? err.message : String(err),
      },
    };
  }
}

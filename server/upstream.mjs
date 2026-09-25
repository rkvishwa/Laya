export function predictUrl(domain) {
  if (!domain) return null;

  let base = domain.trim().replace(/\/+$/, "");
  if (!/^https?:\/\//i.test(base)) {
    base = `https://${base}`;
  }

  if (base.endsWith("/v1/predict")) {
    return base;
  }

  return `${base}/v1/predict`;
}

export function layaConfig() {
  const domain = process.env.LAYA_DOMAIN?.trim() || "";
  const apiKey = process.env.LAYA_API_KEY?.trim() || "";
  return {
    domain,
    apiKey,
    predictUrl: predictUrl(domain),
    configured: Boolean(domain && apiKey),
  };
}

export async function forwardPredict(rawBody) {
  const { apiKey, predictUrl: url, configured } = layaConfig();

  if (!configured) {
    return {
      status: 503,
      body: {
        error: "Missing configuration",
        detail:
          "Set LAYA_DOMAIN and LAYA_API_KEY before running predictions.",
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
        "X-API-Key": apiKey,
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

    return { status: upstream.status, body: payload };
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

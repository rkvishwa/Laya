# Laya Query Playground

Local playground for composing Laya / TypeSafe-style queries and calling your self-hosted model.

## Setup

1. Copy `.env.example` to `.env` if needed.
2. Fill in your server details:

```env
LAYA_DOMAIN=https://laya.yourdomain.com
LAYA_API_KEY=your-generated-key
```

`LAYA_DOMAIN` is the base URL of your Laya server. The proxy calls `POST {LAYA_DOMAIN}/v1/predict`. You can include a port (`http://laya.example.com:8000`) or pass the full predict path if needed.

3. Install and run:

```bash
npm install
npm run dev
```

Open http://localhost:5173

## How it works

- The React UI builds `{ state, questions }` with `choice`, `score`, and `noul` question types.
- The local proxy at `server/proxy.mjs` forwards requests to your `LAYA_DOMAIN` with the `X-API-Key` header.
- Your API key stays in `.env` and is never sent to the browser.

## Presets

- **Invoice routing** — matches the sample curl from the Laya docs.
- **Invoice + urgency + refund** — exercises all three question types in one request.

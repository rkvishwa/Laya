# Laya Query Playground

Local playground for composing Laya / TypeSafe-style queries and calling your self-hosted model.

## Setup

1. Copy `.env.example` to `.env` if needed.
2. Fill in your server details:

```env
LAYA_DOMAIN=https://laya.yourdomain.com
LAYA_API_KEY=your-generated-key
AUTH_EMAIL=you@example.com
AUTH_PASSWORD=your-password
AUTH_SECRET=generate-a-long-random-string
```

`LAYA_DOMAIN` is the base URL of your Laya server. The proxy calls `POST {LAYA_DOMAIN}/v1/predict`. You can include a port (`http://laya.example.com:8000`) or pass the full predict path if needed.

`AUTH_EMAIL` and `AUTH_PASSWORD` are the single shared login for this app. There is no registration flow — only the credentials in `.env` can sign in.

`AUTH_SECRET` signs the session cookie. Generate one with:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

3. Install and run:

```bash
npm install
npm run dev
```

Open http://localhost:5173 and sign in with your `AUTH_EMAIL` / `AUTH_PASSWORD`.

## Deploy to Vercel

1. Push the repo to GitHub and import it in Vercel.
2. Add these environment variables in the Vercel project settings:
   - `LAYA_DOMAIN`
   - `LAYA_API_KEY`
   - `AUTH_EMAIL`
   - `AUTH_PASSWORD`
   - `AUTH_SECRET`
3. Deploy. Vercel serves the React app from `client/dist` and runs the API routes in `api/` as serverless functions.

Local dev uses `server/proxy.mjs`. Production on Vercel uses the same shared handlers in `server/handlers.mjs`, so auth and predict behavior match.

## How it works

- The React UI builds `{ state, questions }` with `choice`, `score`, and `noul` question types.
- The local proxy at `server/proxy.mjs` forwards requests to your `LAYA_DOMAIN` with the `X-API-Key` header.
- Your API key stays in `.env` and is never sent to the browser.
- Login is required before the playground or API routes (`/api/health`, `/api/predict`) are available. Sessions are stored in an httpOnly cookie signed with `AUTH_SECRET`.

## Presets

- **Invoice routing** — matches the sample curl from the Laya docs.
- **Invoice + urgency + refund** — exercises all three question types in one request.

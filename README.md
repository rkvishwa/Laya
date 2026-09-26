# Brainvave Decision Model

Playground and proxy for composing structured decision requests and calling your self-hosted predict endpoint.

## Setup

1. Copy `.env.example` to `.env` if needed.
2. Fill in your server details:

```env
MODEL_BASE_URL=https://your-server.example.com
MODEL_API_KEY=your-generated-key
AUTH_EMAIL=you@example.com
AUTH_PASSWORD=your-password
AUTH_SECRET=generate-a-long-random-string
GUEST_EMAIL=guest@example.com
GUEST_PASSWORD=guest-password
GUEST_API=your-guest-api-key
```

`MODEL_BASE_URL` is the base URL of your decision API server. The proxy calls `POST {MODEL_BASE_URL}/v1/predict`. You can include a port (`http://your-server.example.com:8000`) or pass the full predict path if needed.

`AUTH_EMAIL` and `AUTH_PASSWORD` are the admin login for this app. There is no registration flow — only credentials in `.env` can sign in.

Optional **guest** access (all three required to enable guest login):

- `GUEST_EMAIL` / `GUEST_PASSWORD` — sign-in for testers
- `GUEST_API` — API key used for guest playground requests and shown on the **Documentation** page (`/docs`) to any signed-in user for direct API testing

`AUTH_SECRET` signs the session cookie. Generate one with:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

3. Install and run:

```bash
npm install
npm run dev
```

Open http://localhost:5173, sign in, and read **Documentation** at `/docs` for how to structure state and questions.

## Deploy to Vercel

1. Push the repo to GitHub and import it in Vercel.
2. Add these environment variables in the Vercel project settings:
   - `MODEL_BASE_URL`
   - `MODEL_API_KEY`
   - `AUTH_EMAIL`
   - `AUTH_PASSWORD`
   - `AUTH_SECRET`
   - `GUEST_EMAIL`, `GUEST_PASSWORD`, `GUEST_API` (optional, for guest login and docs)
3. Deploy. Vercel serves the React app from `client/dist` and runs the API routes in `api/` as serverless functions.

Local dev uses `server/proxy.mjs`. Production on Vercel uses the same shared handlers in `server/handlers.mjs`, so auth and predict behavior match.

## How it works

- The React UI builds `{ state, questions }`: `state` is a JSON object, and each question is `choice` (categorical) or `score` (ordinal). Yes/no decisions use `choice` with criteria keys `true` and `false`.
- The local proxy forwards requests to your `MODEL_BASE_URL` with the `X-API-Key` header (`MODEL_API_KEY` for admin sessions, `GUEST_API` for guest sessions).
- Admin and guest API keys stay in environment variables; only the guest key is exposed in the authenticated docs UI for testing.
- Login is required before the playground, documentation, or API routes (`/api/health`, `/api/predict`, `/api/docs-info`) are available. Sessions are stored in an httpOnly cookie signed with `AUTH_SECRET`.

## Presets

- **Invoice routing** — single `choice` question for department routing.
- **Support ticket** — `choice` department and refund flag plus `score` urgency.

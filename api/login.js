import { createRequestContext } from "../server/auth.mjs";
import { handleLogin } from "../server/handlers.mjs";
import { toResponse } from "../server/web.mjs";

export default async function handler(request) {
  if (request.method !== "POST") {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const body = await request.json();
    const ctx = createRequestContext(request);
    return toResponse(handleLogin(ctx, body));
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }
}

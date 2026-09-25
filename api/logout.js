import { createRequestContext } from "../server/auth.mjs";
import { handleLogout } from "../server/handlers.mjs";
import { toResponse } from "../server/web.mjs";

export default function handler(request) {
  if (request.method !== "POST") {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  const ctx = createRequestContext(request);
  return toResponse(handleLogout(ctx));
}

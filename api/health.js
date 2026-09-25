import { createRequestContext } from "../server/auth.mjs";
import { handleHealth } from "../server/handlers.mjs";
import { toResponse } from "../server/web.mjs";

export default function handler(request) {
  if (request.method !== "GET") {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  const ctx = createRequestContext(request);
  return toResponse(handleHealth(ctx));
}

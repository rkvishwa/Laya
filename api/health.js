import { layaConfig } from "../server/upstream.mjs";

export default function handler() {
  const { configured, domain } = layaConfig();
  return Response.json({
    configured,
    domain: domain || null,
  });
}

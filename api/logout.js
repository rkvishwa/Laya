import { handleLogout } from "../server/handlers.mjs";
import { nodeContext, sendNodeResponse } from "../server/vercel-node.mjs";

export default function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(404).json({ error: "Not found" });
  }

  sendNodeResponse(res, handleLogout(nodeContext(req)));
}

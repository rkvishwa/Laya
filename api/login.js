import { handleLogin } from "../server/handlers.mjs";
import {
  nodeContext,
  readJsonBody,
  sendNodeResponse,
} from "../server/vercel-node.mjs";

export default function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(404).json({ error: "Not found" });
  }

  try {
    sendNodeResponse(res, handleLogin(nodeContext(req), readJsonBody(req)));
  } catch {
    res.status(400).json({ error: "Invalid JSON body" });
  }
}

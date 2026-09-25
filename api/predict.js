import { handlePredict } from "../server/handlers.mjs";
import {
  nodeContext,
  readPredictBody,
  sendNodeResponse,
} from "../server/vercel-node.mjs";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(404).json({ error: "Not found" });
  }

  sendNodeResponse(res, await handlePredict(nodeContext(req), readPredictBody(req)));
}

import { forwardPredict } from "../server/upstream.mjs";

export default async function handler(request) {
  if (request.method !== "POST") {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  const { status, body } = await forwardPredict(await request.text());
  return Response.json(body, { status });
}

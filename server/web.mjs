export function toResponse(result) {
  const headers = new Headers({ "Content-Type": "application/json" });

  for (const [key, value] of Object.entries(result.headers || {})) {
    headers.set(key, value);
  }

  return new Response(JSON.stringify(result.body), {
    status: result.status,
    headers,
  });
}

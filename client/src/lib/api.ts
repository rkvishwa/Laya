export async function parseJsonResponse<T>(res: Response): Promise<T> {
  const text = await res.text();
  if (!text) {
    throw new Error(
      "Server returned an empty response. Make sure the API proxy is running (npm run dev).",
    );
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(
      "Server returned an invalid response. Make sure the API proxy is running (npm run dev).",
    );
  }
}

export async function fetchWithIdempotency(url: string, options: RequestInit = {}) {
  const method = options.method?.toUpperCase() || "GET";
  const isMutatingRequest = ["POST", "PUT", "PATCH", "DELETE"].includes(method);
  
  const headers = new Headers(options.headers || {});
  
  if (isMutatingRequest && !headers.has("Idempotency-Key")) {
    headers.set("Idempotency-Key", crypto.randomUUID());
  }

  const response = await fetch(url, { ...options, headers });

  if (response.status === 409 || response.status === 422) {
    throw new Error("Conflict: This action is already being processed. Please refresh the page and try again.");
  }

  if (!response.ok) {
    throw new Error(`Network request failed: ${response.statusText}`);
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}
/**
 * Builds Threads Graph API URL with path and query params (includes access_token).
 * @param token - Access token
 * @param path - API path
 * @param params - Query params
 * @returns Full URL string
 */
export function getThreadsURL(
  token: string,
  path: string,
  params: Record<string, string>,
) {
  return `https://graph.threads.net/v1.0/${path}?${Object.keys(params)
    .map((key) => `${key}=${params[key]}`)
    .join("&")}&access_token=${token}`;
}

/**
 * Fetches JSON from Threads Graph API (GET or POST).
 * @param token - Access token
 * @param path - API path
 * @param params - Query params
 * @param method - "POST" for mutations
 * @returns Promise of response data or null
 */
export function getThreadsData<T>(
  token: string,
  path: string,
  params: Record<string, string>,
  method?: "POST",
): Promise<T | null> {
  return fetch(getThreadsURL(token, path, params), {
    method: method || "GET",
  }).then((res) => res.json());
}

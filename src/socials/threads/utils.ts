/**
 * Builds a Threads Graph API URL with the given path and query parameters (includes `access_token`).
 *
 * @param token - Threads access token.
 * @param path - API path (e.g. `"me/threads"`, `"me/threads_publish"`).
 * @param params - Query parameters.
 * @returns Full URL string.
 * @category Socials
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
 * Fetches JSON from the Threads Graph API (GET or POST).
 *
 * @param token - Threads access token.
 * @param path - API path.
 * @param params - Query parameters.
 * @param method - Set to `"POST"` for mutations; defaults to `"GET"`.
 * @returns Promise of response data (typed as `T`) or `null`.
 * @category Socials
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

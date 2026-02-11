import { InstagramError } from "@/src/socials/instagram/types";

/**
 * Builds an Instagram Graph API URL with the given path and query parameters (includes `access_token`).
 *
 * @param token - Instagram access token.
 * @param path - API path (e.g. `"me"`, `"me/media"`, `"me/conversations"`).
 * @param params - Additional query parameters.
 * @returns Full URL string.
 * @category Socials
 */
export function getInstagramURL(
  token: string,
  path: string,
  params: Record<string, string>,
) {
  return `https://graph.instagram.com/v23.0/${path}?${Object.keys(params)
    .map((key) => `${key}=${params[key]}`)
    .join("&")}&access_token=${token}`;
}

/**
 * Fetches JSON from the Instagram Graph API (GET or POST depending on whether `postData` is provided).
 *
 * @param token - Instagram access token.
 * @param path - API path.
 * @param params - Query parameters (default: `{}`).
 * @param postData - Optional POST body (if provided, the request becomes a POST).
 * @returns Promise of `(T & InstagramError) | null`.
 * @category Socials
 */
export function getInstagramData<T>(
  token: string,
  path: string,
  params: Record<string, string> = {},
  postData?: object,
): Promise<(T & InstagramError) | null> {
  return fetch(getInstagramURL(token, path, params), {
    method: postData ? "POST" : "GET",
    body: JSON.stringify(postData),
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  }).then((res) => res.json());
}

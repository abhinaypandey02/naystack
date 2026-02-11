import { InstagramError } from "@/src/socials/instagram/types";

/**
 * Builds Instagram Graph API URL with path and query params (includes access_token).
 * @param token - Access token
 * @param path - API path (e.g. "me", "me/media")
 * @param params - Query params
 * @returns Full URL string
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
 * Fetches JSON from Instagram Graph API (GET or POST).
 * @param token - Access token
 * @param path - API path
 * @param params - Query params
 * @param postData - Optional POST body
 * @returns Promise of response data or null
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

import { createGraphClient } from "@/src/socials/meta/request";

const client = createGraphClient("https://graph.instagram.com/v23.0");

/**
 * Fetches JSON from the Instagram Graph API.
 *
 * @param token - Instagram access token.
 * @param path - API path.
 * @param options - `params` (query), `method`, `body`.
 * @returns Promise of `(T & GraphError) | null`.
 */
export const getInstagramData = client.request;

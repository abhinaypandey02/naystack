import { createGraphClient } from "@/src/socials/meta/request";

const client = createGraphClient("https://graph.threads.net/v1.0");

/**
 * Fetches JSON from the Threads Graph API.
 *
 * @param token - Threads access token.
 * @param path - API path.
 * @param options - `params` (query), `method`, `body`.
 * @returns Promise of `(T & GraphError) | null`.
 */
export const getThreadsData = client.request;

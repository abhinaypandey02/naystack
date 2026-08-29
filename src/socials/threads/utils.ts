import { createGraphClient } from "@/src/socials/meta/request";

const client = createGraphClient("https://graph.threads.net/v1.0");

/**
 * Calls the Threads Graph API directly — the escape hatch for endpoints this
 * module doesn't wrap. The Instagram counterpart is {@link getInstagramData};
 * see it for the POST-via-`params` convention and an example.
 *
 * @param token - Threads access token.
 * @param path - API path, relative to the versioned root (e.g. `"me/threads"`).
 * @param options - See {@link GraphRequestOptions} — `params` (query), `method`, `body`.
 * @returns Promise of `(T & GraphError) | null` — check `.error` before reading `T`.
 *
 * @category Socials
 */
export const getThreadsData = client.request;

import { createGraphClient } from "@/src/socials/meta/request";

const client = createGraphClient("https://graph.instagram.com/v23.0");

/**
 * Calls the Instagram Graph API directly — the escape hatch for endpoints this
 * module doesn't wrap. Despite the name it does POSTs too: Graph mutations take
 * their arguments as query `params`, so pass `method: "POST"` with `params`.
 *
 * The base URL and API version stay pinned here, so callers never hardcode either.
 * Pair it with {@link readGraphID} to unwrap an `id` and log the API's own error.
 *
 * @param token - Instagram access token.
 * @param path - API path, relative to the versioned root (e.g. `"me/media"`).
 * @param options - See {@link GraphRequestOptions} — `params` (query), `method`, `body`.
 * @returns Promise of `(T & GraphError) | null` — check `.error` before reading `T`.
 *
 * @example
 * ```ts
 * import { getInstagramData, readGraphID } from "naystack/socials";
 *
 * // An endpoint with no dedicated helper.
 * const id = readGraphID(
 *   "Instagram comment reply",
 *   await getInstagramData<{ id: string }>(token, `${commentID}/replies`, {
 *     params: { message: "thanks!" },
 *     method: "POST",
 *   }),
 * );
 * ```
 *
 * @category Socials
 */
export const getInstagramData = client.request;

import { GraphError, GraphParams } from "./types";

/**
 * Options for a single Graph API request.
 *
 * @property params - Query parameters. Most Graph mutations take their arguments here, not in a body.
 * @property method - Defaults to `"POST"` when `body` is set, `"GET"` otherwise.
 * @property body - JSON body, for the few endpoints that need one (e.g. Instagram messaging).
 *
 * @category Socials
 */
export type GraphRequestOptions = {
  params?: GraphParams;
  method?: "GET" | "POST";
  body?: object;
};

/**
 * A Graph API client bound to one platform's base URL.
 *
 * @category Socials
 */
export type GraphClient = {
  buildURL: (token: string, path: string, params?: GraphParams) => string;
  request: <T>(
    token: string,
    path: string,
    options?: GraphRequestOptions,
  ) => Promise<(T & GraphError) | null>;
};

/**
 * Creates a Graph API client for a base URL (Instagram, Threads — same protocol,
 * different host and version).
 *
 * Every param is URL-encoded, so captions may contain spaces, `&`, `#` and newlines.
 *
 * @param baseURL - Versioned API root, e.g. `"https://graph.instagram.com/v23.0"`.
 * @returns `{ buildURL, request }`.
 * @category Socials
 */
export function createGraphClient(baseURL: string): GraphClient {
  const buildURL = (token: string, path: string, params: GraphParams = {}) => {
    const search = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) search.set(key, String(value));
    }
    search.set("access_token", token);
    return `${baseURL}/${path}?${search.toString()}`;
  };

  const request = async <T>(
    token: string,
    path: string,
    options: GraphRequestOptions = {},
  ) => {
    const response = await fetch(buildURL(token, path, options.params), {
      method: options.method || (options.body ? "POST" : "GET"),
      headers: {
        Authorization: `Bearer ${token}`,
        ...(options.body ? { "Content-Type": "application/json" } : {}),
      },
      ...(options.body ? { body: JSON.stringify(options.body) } : {}),
    });
    return response.json().catch(() => null) as Promise<
      (T & GraphError) | null
    >;
  };

  return { buildURL, request };
}

/**
 * Unwraps the `id` from a Graph API response, logging the API's own message
 * when the call failed. Keeps publishing helpers to a single `null` return.
 *
 * @param label - Name used in the error log, e.g. `"Instagram media container"`.
 * @param result - Raw Graph API response.
 * @returns The id, or `null` on error.
 * @category Socials
 */
export function readGraphID(
  label: string,
  result: ({ id?: string } & GraphError) | null,
) {
  if (result?.error) {
    console.error(`[naystack] ${label} failed: ${result.error.message}`);
    return null;
  }
  return result?.id || null;
}

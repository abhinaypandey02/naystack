import { EnvVariable, getEnv } from "@/src/env";

/**
 * Module-level access-token store.
 *
 * The token also lives in React state (`TokenContext`), but the Apollo link
 * chain is built once, outside React, and needs to read the *live* token on
 * every request — including on a retry that happens after a refresh. Context
 * can't serve that: `useAuthMutation`'s callback closes over the token value
 * from the render that created it, so a retry would replay the stale one.
 *
 * So the store is the source of truth and `AuthWrapper` subscribes to it,
 * rather than the other way around. Writes are synchronous, which means a
 * mutation fired immediately after login can't race the state commit.
 *
 * **Client-only.** Module state is shared by every request in a Node server
 * process, so writing a user's token here during SSR would leak it into the next
 * request's render. Every writer is reached only from an event handler or an
 * effect, which keeps this `undefined` on the server — do not call
 * `setAccessToken` or `refreshAccessToken` from a Server Component, a route
 * handler, or a module top level.
 */
let currentToken: string | null | undefined;

const listeners = new Set<(token: string | null | undefined) => void>();

/** In-flight refresh, shared so N concurrent 401s trigger one network call. */
let inFlightRefresh: Promise<string | null> | null = null;

/**
 * Reads the current access token synchronously, outside React.
 * Used by the Apollo auth link; components should use `useToken()`.
 *
 * @returns The access token, `null` when logged out, or `undefined` before the first fetch resolves.
 * @category Auth
 */
export function getAccessToken() {
  return currentToken;
}

/**
 * Writes the access token and notifies subscribers (which updates `TokenContext`).
 *
 * @param token - New token, or `null` to clear the session.
 * @category Auth
 */
export function setAccessToken(token: string | null | undefined) {
  if (token === currentToken) return;
  currentToken = token;
  listeners.forEach((listener) => listener(token));
}

/**
 * Subscribes to token changes. `AuthWrapper` uses this to mirror the store into React state.
 *
 * @param listener - Called with the new token on every change.
 * @returns Unsubscribe function.
 * @category Auth
 */
export function subscribeToAccessToken(
  listener: (token: string | null | undefined) => void,
) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Exchanges the httpOnly refresh cookie for a fresh access token via the auth endpoint,
 * and stores the result. Concurrent callers share one request.
 *
 * The auth endpoint answers 200 in both directions, so the body is the signal:
 * a token means the session is alive, an empty body means the refresh cookie is
 * gone or expired and the user is logged out (which clears the token, and in turn
 * trips `ClearStoreOnLogout`).
 *
 * A transport failure (offline, 5xx) rejects **without** clearing the token — a
 * flaky network shouldn't end a valid session.
 *
 * @returns The new access token, or `null` if the session has ended.
 * @throws If the request fails at the transport level or the endpoint returns non-2xx.
 * @category Auth
 */
export function refreshAccessToken(): Promise<string | null> {
  if (inFlightRefresh) return inFlightRefresh;

  inFlightRefresh = (async () => {
    const res = await fetch(
      getEnv(EnvVariable.NEXT_PUBLIC_EMAIL_AUTH_ENDPOINT),
      { credentials: "include" },
    );
    if (!res.ok) throw new Error(`Token refresh failed: ${res.status}`);
    const token = (await res.text()) || null;
    setAccessToken(token);
    return token;
  })().finally(() => {
    inFlightRefresh = null;
  });

  return inFlightRefresh;
}

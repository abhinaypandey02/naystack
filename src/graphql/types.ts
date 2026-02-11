/**
 * Request context passed to GraphQL resolvers. Built automatically from the request's
 * `Authorization` header or refresh cookie by the built-in `getContext`.
 *
 * @property userId - Authenticated user id, or `null` if the request is unauthenticated.
 * @property isRefreshID - `true` if the user was identified via the refresh cookie (not an access token).
 *   When `isRefreshID` is true, mutations are blocked by default (only queries are allowed via refresh cookie).
 *
 * @category GraphQL
 */
export interface Context {
  userId: number | null;
  isRefreshID?: boolean;
}

/**
 * Context for resolvers that require authentication (`authorized: true`). The `userId` is guaranteed to be non-null.
 *
 * When you set `authorized: true` on a `query()` or `field()`, the resolver's `ctx` parameter is typed as `AuthorizedContext`
 * instead of `Context`, so you can safely access `ctx.userId` without null checks.
 *
 * @property userId - Authenticated user id (guaranteed non-null).
 * @property isRefreshID - `true` if identified via refresh cookie.
 *
 * @category GraphQL
 */
export interface AuthorizedContext {
  userId: number;
  isRefreshID?: boolean;
}

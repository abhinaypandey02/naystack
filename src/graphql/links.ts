import { ApolloLink, fromPromise, HttpLink } from "@apollo/client";
import { setContext } from "@apollo/client/link/context";
import { onError } from "@apollo/client/link/error";
import type { GraphQLFormattedError } from "graphql";

import { getAccessToken, refreshAccessToken } from "@/src/auth/token-store";
import { EnvVariable, getEnv } from "@/src/env";

/** Marks an operation as already retried, so a still-failing refresh can't loop. */
const RETRY_CONTEXT_KEY = "__naystackRetried";

/**
 * `@Authorized()` with no roles throws type-graphql's `AuthenticationError`,
 * which carries this code. Its sibling `AuthorizationError` (`UNAUTHORIZED`) and
 * `GQLError(403)` (`extensions.statusCode`) both mean "this user may not do
 * this" — a fresh token wouldn't change the answer, so neither triggers a retry.
 */
function isExpiredTokenError(error: GraphQLFormattedError) {
  return error.extensions?.code === "UNAUTHENTICATED";
}

/**
 * Attaches the current access token as a Bearer header.
 *
 * Skipped when the operation opted into `credentials: "include"` — that's the
 * cookie-authenticated path `useAuthQuery` uses, where the server reads the
 * refresh cookie instead and marks the context `isRefreshID`. Sending both would
 * silently switch those reads onto the short-lived token.
 */
const authLink = setContext((_, previousContext) => {
  const token = getAccessToken();
  if (!token || previousContext.credentials === "include")
    return previousContext;
  return {
    ...previousContext,
    headers: {
      ...previousContext.headers,
      authorization: `Bearer ${token}`,
    },
    credentials: "omit",
  };
});

/**
 * On an expired access token: refresh once, then replay the operation.
 *
 * The retry re-enters the chain through `authLink`, which re-reads the store, so
 * the replayed request picks up the new token without this link rewriting headers.
 */
const refreshLink = onError(({ graphQLErrors, operation, forward }) => {
  if (!graphQLErrors?.some(isExpiredTokenError)) return;
  if (operation.getContext()[RETRY_CONTEXT_KEY]) return;

  return fromPromise(
    // A failed refresh still replays once: the retry reproduces the original
    // error for the caller instead of surfacing the refresh's error in its place.
    refreshAccessToken().catch(() => null),
  ).flatMap(() => {
    operation.setContext((previousContext: Record<string, unknown>) => ({
      ...previousContext,
      [RETRY_CONTEXT_KEY]: true,
    }));
    return forward(operation);
  });
});

/**
 * Builds the client link chain: refresh-and-retry → auth header → HTTP.
 *
 * `refreshLink` sits outermost so its replayed operation passes back through
 * `authLink` and picks up the refreshed token.
 *
 * @returns An `ApolloLink` for the `link` option of `ApolloClient`.
 * @category GraphQL
 */
export function makeAuthLink() {
  return ApolloLink.from([
    refreshLink,
    authLink,
    new HttpLink({
      uri: getEnv(EnvVariable.NEXT_PUBLIC_GRAPHQL_ENDPOINT),
    }),
  ]);
}

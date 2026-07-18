"use client";

import { useApolloClient } from "@apollo/client";
import { useToken } from "naystack/auth/client";
import { useEffect, useRef } from "react";

/**
 * Clears the Apollo cache on logout so a subsequent login can't read the
 * previous user's cached data. Mount inside an `ApolloProvider` — both the
 * native (`ApolloWrapper` in `graphql/client`) and Next (`graphql/next`)
 * wrappers render it, so any query that opts into a cache-reading `fetchPolicy`
 * is safe across account switches without per-call-site cleanup.
 *
 * Keyed on the token transitioning to `null` (logout / session loss). Same-user
 * access-token refreshes go string→string and never pass through `null`, so the
 * cache survives them; only a real logout empties the store. Renders nothing.
 *
 * @category GraphQL
 */
export function ClearStoreOnLogout() {
  const client = useApolloClient();
  const token = useToken();
  const hadToken = useRef(false);

  useEffect(() => {
    if (token) {
      hadToken.current = true;
    } else if (token === null && hadToken.current) {
      hadToken.current = false;
      void client.clearStore();
    }
  }, [client, token]);

  return null;
}

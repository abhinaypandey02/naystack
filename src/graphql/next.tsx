"use client";

import { type InMemoryCacheConfig } from "@apollo/client";
import {
  ApolloClient,
  ApolloNextAppProvider,
  InMemoryCache,
} from "@apollo/client-integration-nextjs";
import React, { PropsWithChildren } from "react";

import { ClearStoreOnLogout } from "./clear-store";
import { makeAuthLink } from "./links";

/**
 * `ApolloWrapper` built on `@apollo/client-integration-nextjs` (`ApolloNextAppProvider`),
 * for apps that use Apollo's App Router streaming — `useSuspenseQuery`, `useBackgroundQuery`
 * — from client components. Same auth link chain and logout cache clearing as the
 * `naystack/graphql/client` wrapper; pick this one only if you need that integration.
 * The GraphQL endpoint is read from `NEXT_PUBLIC_GRAPHQL_ENDPOINT`.
 *
 * Must be placed **inside** `AuthWrapper` (since `useAuthQuery` / `useAuthMutation` depend on the auth token).
 *
 * @param props - Component props.
 * @param props.children - React children (your app or page content).
 * @param props.cacheConfig - Optional `InMemoryCache` config (e.g. `typePolicies`, `addTypename`). Passed to Apollo's `InMemoryCache`.
 * @returns Provider component that supplies Apollo Client to the tree.
 *
 * @example
 * ```tsx
 * // app/layout.tsx
 * import { AuthWrapper } from "naystack/auth/client";
 * import { ApolloWrapper } from "naystack/graphql/next";
 *
 * export default function RootLayout({ children }: { children: React.ReactNode }) {
 *   return (
 *     <html lang="en">
 *       <body>
 *         <AuthWrapper>
 *           <ApolloWrapper>{children}</ApolloWrapper>
 *         </AuthWrapper>
 *       </body>
 *     </html>
 *   );
 * }
 * ```
 *
 * @category GraphQL
 */

function makeClient(cacheConfig?: InMemoryCacheConfig) {
  return new ApolloClient({
    cache: new InMemoryCache(cacheConfig),
    link: makeAuthLink(),
  });
}

export const ApolloWrapper = ({
  children,
  cacheConfig,
}: PropsWithChildren<{ cacheConfig?: InMemoryCacheConfig }>) => {
  return (
    <ApolloNextAppProvider makeClient={() => makeClient(cacheConfig)}>
      <ClearStoreOnLogout />
      {children}
    </ApolloNextAppProvider>
  );
};

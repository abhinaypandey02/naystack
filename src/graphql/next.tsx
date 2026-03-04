"use client";

import { HttpLink, type InMemoryCacheConfig } from "@apollo/client";
import {
  ApolloClient,
  ApolloNextAppProvider,
  InMemoryCache,
} from "@apollo/client-integration-nextjs";
import React, { PropsWithChildren } from "react";

import { EnvVariable, getEnv } from "@/src/env";

/**
 * Apollo Client provider for Next.js. Wrap your app (or a subtree) so client components can run GraphQL queries and mutations.
 * The GraphQL endpoint is read from `NEXT_PUBLIC_GRAPHQL_ENDPOINT` env var.
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
 * import { AuthWrapper } from "naystack/auth/email/client";
 * import { ApolloWrapper } from "naystack/graphql/client";
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
    link: new HttpLink({
      uri: getEnv(EnvVariable.NEXT_PUBLIC_GRAPHQL_ENDPOINT),
    }),
  });
}

export const ApolloWrapper = ({
  children,
  cacheConfig,
}: PropsWithChildren<{ cacheConfig?: InMemoryCacheConfig }>) => {
  return (
    <ApolloNextAppProvider makeClient={() => makeClient(cacheConfig)}>
      {children}
    </ApolloNextAppProvider>
  );
};

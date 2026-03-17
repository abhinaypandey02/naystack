"use client";

import {
  ApolloClient,
  ApolloProvider,
  HttpLink,
  InMemoryCache,
  type InMemoryCacheConfig,
  MutationHookOptions,
  type OperationVariables,
  useLazyQuery,
  useMutation,
} from "@apollo/client";
import type { TypedDocumentNode } from "@graphql-typed-document-node/core";
import { useToken } from "naystack/auth/email/client";
import React, {
  PropsWithChildren,
  useCallback,
  useEffect,
  useRef,
} from "react";

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
    <ApolloProvider client={makeClient(cacheConfig)}>{children}</ApolloProvider>
  );
};

/**
 * Builds the Apollo link context so requests include the user's Bearer token.
 * Used internally by `useAuthQuery` / `useAuthMutation`; you typically don't call this directly.
 *
 * @param token - The JWT access token. If `null`/`undefined`, returns `undefined` (no auth header).
 * @returns Context object with `headers.authorization` and `credentials: 'omit'`, or `undefined` if no token.
 *
 * @category GraphQL
 */
export const tokenContext = (token?: string | null) => {
  if (!token) return undefined;
  return {
    headers: {
      authorization: `Bearer ${token}`,
    },
    credentials: `omit`,
  };
};

/**
 * Hook to run a GraphQL query with the current user's token. The query auto-fires when both the token
 * and variables are available. Returns a refetch function and the Apollo query result.
 *
 * Uses `fetchPolicy: "no-cache"` by default to always get fresh data.
 *
 * @param query - A `TypedDocumentNode` for the query (e.g. from codegen or a `gql` template).
 * @param variables - Optional initial variables (the `input` value). Automatically wrapped as `{ input: variables }` before sending. Query fires automatically when this and token are set; change to refetch.
 * @returns Tuple: `[refetch, result]`.
 *   - `refetch(input)` — runs the query again with the given input (wrapped as `variables.input`).
 *   - `result` — `{ data, loading, error, hasAuth }` from Apollo. `hasAuth` is `true` when an auth token is available.
 *
 * @example Lazy query (no initial variables, manually triggered):
 * ```tsx
 * import { useAuthQuery } from "naystack/graphql/client";
 * import { GET_SUMMARY } from "@/constants/graphql/queries";
 *
 * function SummaryCard({ type }: { type: string }) {
 *   const [getSummary, { loading, data }] = useAuthQuery(GET_SUMMARY);
 *
 *   const handleFetch = async () => {
 *     const result = await getSummary({ type });
 *     if (result.data?.getSummary) setSummary(result.data.getSummary);
 *   };
 *
 *   return <button onClick={handleFetch} disabled={loading}>Get Summary</button>;
 * }
 * ```
 *
 * @example Auto-firing query with variables:
 * ```tsx
 * const [refetch, { data, loading }] = useAuthQuery(GET_ORGANIZATION_DETAILS, { id: orgId });
 * // Query fires automatically when orgId and token are available
 * ```
 *
 * @category GraphQL
 */
export function useAuthQuery<T, V extends OperationVariables>(
  query: TypedDocumentNode<T, V>,
  variables?: V["input"],
) {
  const token = useToken();
  const [fetch, result] = useLazyQuery(query, {
    fetchPolicy: "no-cache",
  });
  const prevVarsRef = useRef<string>(null);

  useEffect(() => {
    const serialized = JSON.stringify(variables);
    if (token && variables && prevVarsRef.current !== serialized) {
      prevVarsRef.current = serialized;
      void fetch({
        // @ts-expect-error -- to allow dynamic props
        variables: { input: variables },
        context: tokenContext(token),
      });
    }
  }, [fetch, token, variables]);

  const reFetch = useCallback(
    (input?: V["input"]) =>
      fetch({
        // @ts-expect-error -- to allow dynamic props
        variables: { input },
        context: tokenContext(token),
      }),
    [fetch, token],
  );

  return [reFetch, { ...result, hasAuth: !!token }] as const;
}

/**
 * Hook to run a GraphQL mutation with the current user's token. Returns a function you call with the mutation input.
 *
 * The input is sent as `variables.input` to the GraphQL endpoint.
 *
 * @param mutation - A `TypedDocumentNode` for the mutation (e.g. from codegen or a `gql` template).
 * @param options - Optional Apollo `MutationHookOptions` (e.g. `onCompleted`, `onError`, `refetchQueries`).
 * @returns Tuple: `[mutate, result]`.
 *   - `mutate(input)` — runs the mutation with the given input (wrapped as `variables.input`). Returns a Promise with `{ data }`.
 *   - `result` — `{ data, loading, error, hasAuth }` from Apollo. `hasAuth` is `true` when an auth token is available.
 *
 * @example
 * ```tsx
 * import { useAuthMutation } from "naystack/graphql/client";
 * import { CREATE_DEAL } from "@/lib/gql/mutations";
 *
 * function CreateDealModal({ propertyId }: { propertyId: number }) {
 *   const [createDeal, { loading }] = useAuthMutation(CREATE_DEAL);
 *
 *   const onSubmit = async (values: FormFields) => {
 *     const response = await createDeal({
 *       propertyId,
 *       share: Number(values.share),
 *       targetProfit: Number(values.targetProfit),
 *     });
 *     const dealId = response.data?.createDeal;
 *     if (dealId) router.push(`/deals/${dealId}`);
 *   };
 *
 *   return <form onSubmit={handleSubmit(onSubmit)}>...</form>;
 * }
 * ```
 *
 * @category GraphQL
 */
export function useAuthMutation<T, V extends OperationVariables>(
  mutation: TypedDocumentNode<T, V>,
  options?: MutationHookOptions<T, V>,
) {
  const token = useToken();
  const [mutate, result] = useMutation(mutation, options);
  const method = useCallback(
    (input?: V["input"]) =>
      mutate({
        // @ts-expect-error -- to allow dynamic props
        variables: { input },
        context: tokenContext(token),
      }),
    [token],
  );
  return [method, { ...result, hasAuth: !!token }] as const;
}

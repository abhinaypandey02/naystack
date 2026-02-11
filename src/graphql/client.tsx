"use client";

import {
  HttpLink,
  type InMemoryCacheConfig,
  MutationHookOptions,
  type OperationVariables,
  useLazyQuery,
  useMutation,
} from "@apollo/client";
import {
  ApolloClient,
  ApolloNextAppProvider,
  InMemoryCache,
} from "@apollo/client-integration-nextjs";
import type { TypedDocumentNode } from "@graphql-typed-document-node/core";
import { useToken } from "naystack/auth/email/client";
import React, {
  PropsWithChildren,
  useCallback,
  useEffect,
  useState,
} from "react";

import { EnvVariable, getEnv } from "@/src/env";

/**
 * Apollo Client provider for Next.js; uses the configured GraphQL endpoint.
 * @param props - children and optional cacheConfig
 */
export const ApolloWrapper = ({
  children,
  cacheConfig,
}: PropsWithChildren<{ cacheConfig?: InMemoryCacheConfig }>) => {
  function makeClient() {
    return new ApolloClient({
      cache: new InMemoryCache(cacheConfig),
      link: new HttpLink({
        uri: getEnv(EnvVariable.NEXT_PUBLIC_GRAPHQL_ENDPOINT),
      }),
    });
  }
  return (
    <ApolloNextAppProvider makeClient={makeClient}>
      {children}
    </ApolloNextAppProvider>
  );
};

/**
 * Builds Apollo context for authenticated requests (Bearer header).
 * @param token - Access token or null
 * @returns Context object with authorization header, or undefined if no token
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
 * Lazy query hook that runs when token and variables are available; returns [reFetch, result].
 * @param query - TypedDocumentNode for the query
 * @param variables - Query variables
 * @returns Tuple of reFetch(input) and query result
 */
export function useAuthQuery<T, V extends OperationVariables>(
  query: TypedDocumentNode<T, V>,
  variables?: V,
) {
  const token = useToken();
  const [fetch, result] = useLazyQuery(query);
  const [calledVars, setCalledVars] = useState<string | undefined>();
  useEffect(() => {
    if (token && variables && calledVars !== JSON.stringify(variables)) {
      setCalledVars(JSON.stringify(variables));
      void fetch({
        variables,
        context: tokenContext(token),
        fetchPolicy: "no-cache",
      });
    }
  }, [fetch, token, variables, calledVars]);
  const reFetch = useCallback(
    (input: V["input"]) =>
      fetch({
        // @ts-expect-error -- to allow dynamic props
        variables: { input },
        context: tokenContext(token),
        fetchPolicy: "no-cache",
      }),
    [fetch, token],
  );
  return [reFetch, result] as const;
}

/**
 * Mutation hook with auth context; returns [method, result] where method(input) runs the mutation.
 * @param mutation - TypedDocumentNode for the mutation
 * @param options - Optional MutationHookOptions
 * @returns Tuple of (input) => mutate and mutation result
 */
export function useAuthMutation<T, V extends OperationVariables>(
  mutation: TypedDocumentNode<T, V>,
  options?: MutationHookOptions<T, V>,
) {
  const token = useToken();
  const [mutate, result] = useMutation(mutation, options);
  const method = useCallback(
    (input: V["input"]) =>
      mutate({
        // @ts-expect-error -- to allow dynamic props
        variables: { input },
        context: tokenContext(token),
      }),
    [token],
  );
  return [method, result] as const;
}

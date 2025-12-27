"use client";
import {
  HttpLink,
  MutationHookOptions,
  type OperationVariables,
  useLazyQuery,
  useMutation,
} from "@apollo/client";
import { InMemoryCacheConfig } from "@apollo/client/cache";
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

export const getApolloWrapper = ({
  graphqlUri,
  cacheConfig,
  authEndpoint,
}: {
  graphqlUri: string;
  authEndpoint: string;
  cacheConfig?: InMemoryCacheConfig;
}) => {
  function makeClient() {
    return new ApolloClient({
      cache: new InMemoryCache(cacheConfig),
      link: new HttpLink({
        uri: graphqlUri,
      }),
    });
  }
  return ({ children }: PropsWithChildren) => {
    return (
      <ApolloNextAppProvider makeClient={makeClient}>
        {children}
      </ApolloNextAppProvider>
    );
  };
};

export const tokenContext = (token?: string | null) => {
  if (!token) return undefined;
  return {
    headers: {
      authorization: `Bearer ${token}`,
    },
    credentials: `omit`,
  };
};

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
    (v?: V) =>
      fetch({
        variables: v,
        context: tokenContext(token),
        fetchPolicy: "no-cache",
      }),
    [fetch, token],
  );
  return [reFetch, result] as const;
}

export function useAuthMutation<T, V extends OperationVariables>(
  mutation: TypedDocumentNode<T, V>,
  options?: MutationHookOptions<T, V>,
) {
  const token = useToken();
  const [mutate, result] = useMutation(mutation, options);
  const method = useCallback(
    (variables?: V) =>
      mutate({
        variables,
        context: tokenContext(token),
      }),
    [token],
  );
  return [method, result] as const;
}

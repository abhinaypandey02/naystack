import {
  ApolloClient,
  HttpLink,
  InMemoryCache,
  type OperationVariables,
} from "@apollo/client";
import { registerApolloClient } from "@apollo/client-integration-nextjs";
import type { TypedDocumentNode } from "@graphql-typed-document-node/core";
import { cookies } from "next/headers";
import type { FC } from "react";
import { Suspense } from "react";

type OmittedProps<Y> = Omit<Omit<Y, "loading">, "data">;

type ComponentProps<Y> =
  OmittedProps<Y> extends Record<string, never>
    ? { props?: object }
    : { props: OmittedProps<Y> };

export function Injector<T, Y>({
  fetch,
  Component,
  props,
}: {
  fetch: () => Promise<T>;
  Component: FC<{ data?: T; loading: boolean } & Y>;
} & ComponentProps<Y>) {
  return (
    <Suspense fallback={<Component {...((props || {}) as Y)} loading />}>
      {/*@ts-expect-error -- to allow dynamic props*/}
      <InjectorSuspensed Component={Component} fetch={fetch} props={props} />
    </Suspense>
  );
}
async function InjectorSuspensed<T, Y>({
  fetch,
  Component,
  props,
}: {
  fetch: () => Promise<T>;
  Component: FC<{ data?: T; loading: boolean } & Y>;
} & ComponentProps<Y>) {
  const data = await fetch();
  return <Component loading={false} {...((props || {}) as Y)} data={data} />;
}

export const getGraphQLQuery = ({ uri }: { uri: string }) => {
  const { query } = registerApolloClient(() => {
    return new ApolloClient({
      cache: new InMemoryCache(),
      link: new HttpLink({
        uri,
      }),
    });
  });

  return async <T, V extends OperationVariables>(
    _query: TypedDocumentNode<T, V>,
    options?: {
      variables?: V;
      revalidate?: number;
      tags?: string[];
      noCookie?: boolean;
    },
  ): Promise<T> => {
    const res = await query({
      query: _query,
      variables: options?.variables,
      context: {
        headers: {
          Cookie: options?.noCookie ? undefined : await cookies(),
        },
        fetchOptions: {
          cache: options?.revalidate ? "force-cache" : undefined,
          next: {
            revalidate: options?.revalidate || 0,
            tags: options?.tags,
          },
        },
      },
    });
    return res.data;
  };
};

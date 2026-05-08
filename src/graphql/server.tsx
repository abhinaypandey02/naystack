import {
  ApolloClient,
  HttpLink,
  InMemoryCache,
  type OperationVariables,
} from "@apollo/client";
import { registerApolloClient } from "@apollo/client-integration-nextjs";
import type { TypedDocumentNode } from "@graphql-typed-document-node/core";
import { cookies } from "next/headers";
import { connection } from "next/server";
import type { FC } from "react";
import React from "react";
import { Suspense } from "react";

import { EnvVariable, getEnv } from "@/src/env";

/** Component props type minus loading and data (inferred from Injector Component). */
type OmittedProps<Y> = Omit<Omit<Y, "loading">, "data">;

/** Props for Injector: either optional or required based on remaining Component props. */
type ComponentProps<Y> =
  OmittedProps<Y> extends Record<string, never>
    ? { props?: object }
    : { props: OmittedProps<Y> };

/**
 * Server component that wraps a client component with server-fetched data using Suspense.
 *
 * While the `fetch` function is resolving, the `Component` is rendered with `loading={true}` (and no `data`).
 * Once the fetch resolves, the `Component` re-renders with `loading={false}` and `data` set to the result.
 *
 * This is the primary way to inject server-side data into client components in naystack.
 * Use `.authCall()` or `.call()` from your query definitions inside the `fetch` function.
 *
 * By default, `Injector` calls `connection()` from `next/server` before
 * running `fetch`, marking the surrounding route segment as dynamic. This
 * is what consumers almost always want: data fetched at request time
 * should not be statically prerendered. Pass `isStatic` when you
 * are intentionally rendering inside a cached/static segment (e.g. the
 * `fetch` is wrapped in `"use cache"`).
 *
 * @param injectorProps - Configuration object.
 * @param injectorProps.fetch - Async function that returns the data to pass to the component. Runs on the server.
 * @param injectorProps.Component - React component that receives `{ data?: T; loading: boolean }` plus any extra props.
 * @param injectorProps.props - Optional. Any additional props to pass to `Component`. Required if the Component has props other than `data` and `loading`.
 * @param injectorProps.isStatic - Optional. When true, suppresses the implicit `connection()` call. Default: false.
 * @returns A React element that suspends until `fetch()` completes, then renders `Component` with the data.
 *
 * @example Simple usage:
 * ```tsx
 * import { Injector } from "naystack/graphql/server";
 * import getCurrentUser from "@/app/api/(graphql)/User/resolvers/get-current-user";
 * import AuthChecker from "./components/auth-checker";
 *
 * export default async function Layout({ children }: { children: React.ReactNode }) {
 *   return (
 *     <div>
 *       {children}
 *       <Injector fetch={getCurrentUser.authCall} Component={AuthChecker} />
 *     </div>
 *   );
 * }
 * ```
 *
 * @example Fetching multiple queries:
 * ```tsx
 * import { Injector } from "naystack/graphql/server";
 * import getCurrentUser from "@/app/api/(graphql)/User/resolvers/get-current-user";
 * import getChats from "@/app/api/(graphql)/Chat/resolvers/get-chats";
 * import { ChatWindow } from "./components/chat-window";
 *
 * export default async function ChatPage() {
 *   return (
 *     <Injector
 *       fetch={async () => ({
 *         user: await getCurrentUser.authCall(),
 *         chats: await getChats.authCall(),
 *       })}
 *       Component={ChatWindow}
 *     />
 *   );
 * }
 * ```
 *
 * @category GraphQL
 */
export async function Injector<T, Y>({
  fetch,
  Component,
  props,
  isStatic,
}: {
  fetch: () => Promise<T>;
  Component: FC<{ data?: T; loading: boolean } & Y>;
  isStatic?: boolean;
} & ComponentProps<Y>) {
  if (!isStatic) {
    await connection();
  }
  return (
    <Suspense fallback={<Component {...((props || {}) as Y)} loading />}>
      {/*@ts-expect-error -- to allow dynamic props*/}
      <InjectorSuspensed Component={Component} fetch={fetch} props={props} />
    </Suspense>
  );
}

/** Internal: fetches data and renders Component with data and loading=false. */
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

/** Registered Apollo client used for server-side query with cookies. */
const { query: gqlQuery } = registerApolloClient(() => {
  return new ApolloClient({
    cache: new InMemoryCache(),
    link: new HttpLink({
      uri: getEnv(EnvVariable.NEXT_PUBLIC_GRAPHQL_ENDPOINT),
    }),
  });
});

/**
 * Runs a raw GraphQL query on the server using the registered Apollo client.
 * Cookies are forwarded automatically so the backend can identify the user.
 *
 * Use this in Server Components, Server Actions, or route handlers when you need to
 * run a query against the GraphQL endpoint (rather than calling a resolver directly with `.call()`/`.authCall()`).
 *
 * Supports Next.js ISR via `revalidate` and on-demand revalidation via `tags`.
 *
 * @param _query - A `TypedDocumentNode` (e.g. from codegen) defining the query and its result type.
 * @param options - Optional query options.
 * @param options.variables - Variables object for the query (must match the document's variable types).
 * @param options.revalidate - Next.js revalidate in seconds; when set, enables caching with this TTL.
 * @param options.tags - Next.js cache tags for on-demand revalidation.
 * @param options.noCookie - If `true`, the request is sent without cookies (unauthenticated).
 * @returns Promise resolving to the query result data (typed by the document).
 *
 * @example
 * ```ts
 * import { query } from "naystack/graphql/server";
 * import { GetUserDocument } from "@/generated/graphql";
 *
 * // In a Server Component:
 * const data = await query(GetUserDocument, {
 *   variables: { id: userId },
 *   revalidate: 60,       // Cache for 60s (Next.js ISR)
 *   tags: ["user"],        // For on-demand revalidation
 * });
 * return <Profile user={data.user} />;
 * ```
 *
 * @category GraphQL
 */
export const query = async <T, V extends OperationVariables>(
  _query: TypedDocumentNode<T, V>,
  options?: {
    variables?: V;
    revalidate?: number;
    tags?: string[];
    noCookie?: boolean;
  },
): Promise<T> => {
  const res = await gqlQuery({
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

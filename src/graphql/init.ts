import "reflect-metadata";

import { ApolloServer, ApolloServerPlugin } from "@apollo/server";
import {
  ApolloServerPluginLandingPageLocalDefault,
  ApolloServerPluginLandingPageProductionDefault,
} from "@apollo/server/plugin/landingPage/default";
import { startServerAndCreateNextHandler } from "@as-integrations/next";
import { NextRequest, NextResponse } from "next/server";
import {
  AuthChecker,
  buildTypeDefsAndResolvers,
  NonEmptyArray,
} from "type-graphql";

import { EnvVariable, getEnv } from "@/src/env";
import { withCors } from "@/src/utils/route";

import { getContext } from "../auth/email/utils";
import { Context } from "./types";

/**
 * Builds the Apollo GraphQL server and Next.js GET/POST route handlers.
 * Call this at the top level of your GraphQL route file (e.g. `app/api/(graphql)/route.ts`) and export the returned `GET` and `POST`.
 *
 * Uses `type-graphql` to build the schema from the resolver classes you provide (created with `QueryLibrary` and `FieldLibrary`).
 * The default `authChecker` authorizes requests where `context.userId` is truthy.
 * The default `getContext` reads the `Authorization: Bearer` header or the refresh cookie — pass a custom one to override.
 *
 * In production (`NODE_ENV=production`), introspection is disabled and the Apollo production landing page is shown.
 * In development, the Apollo Sandbox is available.
 *
 * @param options - Configuration object.
 * @param options.authChecker - Optional custom type-graphql `AuthChecker`. Default: authorized if `context.userId` is truthy.
 * @param options.resolvers - Array of type-graphql resolver classes (from `QueryLibrary` / `FieldLibrary`). **Required.**
 * @param options.plugins - Optional Apollo Server plugins (e.g. logging, tracing, caching).
 * @param options.getContext - Optional function to build context from the request. Default: reads Bearer token or refresh cookie.
 *   Signature: `(req: NextRequest) => Promise<Context> | Context`. Must return at least `{ userId: number | null }`.
 * @returns Promise of `{ GET, POST }` — export these as your route's handlers.
 *
 * @example
 * ```ts
 * // app/api/(graphql)/route.ts
 * import { initGraphQLServer } from "naystack/graphql";
 * import { UserResolvers, UserFieldResolvers } from "./User/graphql";
 * import { ChatResolvers } from "./Chat/graphql";
 *
 * export const { GET, POST } = await initGraphQLServer({
 *   resolvers: [UserResolvers, UserFieldResolvers, ChatResolvers],
 * });
 * ```
 *
 * @category GraphQL
 */
export async function initGraphQLServer({
  authChecker,
  resolvers,
  plugins,
  getContext: overrideGetContext,
  allowedOrigins,
}: {
  authChecker?: AuthChecker<any>;
  resolvers: NonEmptyArray<Function>;
  plugins?: ApolloServerPlugin[];
  getContext?: (req: NextRequest) => Promise<any> | any;
  allowedOrigins?: string[];
}) {
  const { typeDefs, resolvers: builtResolvers } =
    await buildTypeDefsAndResolvers({
      validate: true,
      authChecker: authChecker || (({ context }) => !!context.userId),
      resolvers,
    });
  const server = new ApolloServer({
    typeDefs,
    resolvers: builtResolvers,
    plugins: [
      getEnv(EnvVariable.NODE_ENV, true) === "production"
        ? ApolloServerPluginLandingPageProductionDefault()
        : ApolloServerPluginLandingPageLocalDefault(),
      {
        async requestDidStart({ request, contextValue }) {
          if (
            (contextValue as any).isRefreshID &&
            !request.query?.startsWith("query")
          )
            (contextValue as Context).userId = null;
        },
      },
      ...(plugins || []),
    ],
    introspection: getEnv(EnvVariable.NODE_ENV, true) !== "production",
    status400ForVariableCoercionErrors: true,
  });
  const handler = startServerAndCreateNextHandler(server, {
    context:
      overrideGetContext ||
      (getContext as (req: NextRequest) => Promise<any> | any),
  });

  return {
    GET: withCors((request: NextRequest) => handler(request), allowedOrigins),
    POST: withCors((request: NextRequest) => handler(request), allowedOrigins),
    OPTIONS: withCors(
      (_request: NextRequest) =>
        Promise.resolve(new NextResponse(null, { status: 204 })),
      allowedOrigins,
    ),
  };
}

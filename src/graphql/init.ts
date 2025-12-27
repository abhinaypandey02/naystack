import "reflect-metadata";

import { ApolloServer, ApolloServerPlugin } from "@apollo/server";
import {
  ApolloServerPluginLandingPageLocalDefault,
  ApolloServerPluginLandingPageProductionDefault,
} from "@apollo/server/plugin/landingPage/default";
import { startServerAndCreateNextHandler } from "@as-integrations/next";
import { NextRequest } from "next/server";
import {
  AuthChecker,
  buildTypeDefsAndResolvers,
  NonEmptyArray,
} from "type-graphql";

import { Context } from "./types";

export async function initGraphQLServer({
  authChecker,
  resolvers,
  plugins,
  getContext,
}: {
  authChecker?: AuthChecker<any>;
  // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
  resolvers: NonEmptyArray<Function>;
  plugins?: ApolloServerPlugin[];
  getContext?: (req: NextRequest) => Promise<any> | any;
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
      process.env.NODE_ENV === "production"
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
    introspection: process.env.NODE_ENV !== "production",
    status400ForVariableCoercionErrors: true,
  });
  const handler = startServerAndCreateNextHandler(server, {
    context: getContext,
  });

  return {
    GET: (request: NextRequest) => handler(request),
    POST: (request: NextRequest) => handler(request),
  };
}

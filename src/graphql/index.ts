/**
 * GraphQL module: server setup, resolver/field helpers, resolver libraries, error helpers, and context types.
 *
 * @example
 * ```ts
 * // Server-side (resolvers, route setup)
 * import { resolver, field, QueryLibrary, FieldLibrary, setupGraphQL, GQLError } from "naystack/graphql";
 *
 * // Type helpers
 * import type { QueryResponseType, FieldResponseType, Context, AuthorizedContext } from "naystack/graphql";
 * ```
 *
 * @module
 */
export { GQLError } from "./errors";
export { setupGraphQL } from "./init";
export type { AuthorizedContext, Context } from "./types";
export {
  field,
  FieldLibrary,
  type FieldResolverDefinition,
  type FieldResponseType,
  resolver,
  type QueryDefinition,
  QueryLibrary,
  type QueryResponseType,
} from "./utils";

export * from "./server";
export * from "./next";
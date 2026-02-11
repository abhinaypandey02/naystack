/**
 * GraphQL module: server init, query/field helpers, resolver libraries, error helpers, and context types.
 *
 * @example
 * ```ts
 * // Server-side (resolvers, route setup)
 * import { query, field, QueryLibrary, FieldLibrary, initGraphQLServer, GQLError } from "naystack/graphql";
 *
 * // Type helpers
 * import type { QueryResponseType, FieldResponseType, Context, AuthorizedContext } from "naystack/graphql";
 * ```
 *
 * @module
 */
export { GQLError } from "./errors";
export { initGraphQLServer } from "./init";
export type { AuthorizedContext, Context } from "./types";
export {
  field,
  FieldLibrary,
  type FieldResponseType,
  query,
  QueryLibrary,
  type QueryResponseType,
} from "./utils";

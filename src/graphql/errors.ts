import { GraphQLError } from "graphql/error";

/** Default message for GQLError by status code. */
function getErrorMessage(status?: number) {
  switch (status) {
    case 400:
      return "Please provide all required inputs";
    case 403:
      return "You are not allowed to perform this action";
    case 404:
      return "Entity not found";
    default:
      return "Server Error";
  }
}

/**
 * Creates a GraphQL error with an HTTP status code in `extensions.statusCode`.
 * Use in resolvers when validation, authorization, or lookup fails.
 *
 * Default messages by status:
 * - **400** → "Please provide all required inputs"
 * - **403** → "You are not allowed to perform this action"
 * - **404** → "Entity not found"
 * - **other** → "Server Error"
 *
 * @param status - HTTP-like status code (e.g. 400, 403, 404). Defaults to 500.
 * @param message - Override the default message for the status. If omitted, the default above is used.
 * @returns GraphQLError with `extensions.statusCode` set.
 *
 * @example
 * ```ts
 * import { GQLError } from "naystack/graphql";
 *
 * // In a resolver:
 * if (!input.email) throw GQLError(400);
 * if (!ctx.userId)  throw GQLError(403);
 * if (!deal)        throw GQLError(404, "Deal not found");
 * ```
 *
 * @category GraphQL
 */
export function GQLError(status?: number, message?: string) {
  return new GraphQLError(message || getErrorMessage(status), {
    extensions: {
      statusCode: status || 500,
    },
  });
}

import { GraphQLError } from "graphql/error";

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
 * Creates a GraphQL error with an optional HTTP status code in extensions.
 * @param status - HTTP status code (400, 403, 404, or 500)
 * @param message - Custom message (defaults based on status)
 * @returns GraphQLError instance
 */
export function GQLError(status?: number, message?: string) {
  return new GraphQLError(message || getErrorMessage(status), {
    extensions: {
      statusCode: status || 500,
    },
  });
}

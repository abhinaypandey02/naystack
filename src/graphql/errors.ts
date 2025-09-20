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

export function GQLError(status?: number, message?: string) {
  return new GraphQLError(message || getErrorMessage(status), {
    extensions: {
      statusCode: status || 500,
    },
  });
}

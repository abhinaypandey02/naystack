import { getDeleteRoute } from "./routes/delete";
import { getGetRoute } from "./routes/get";
import { getPostRoute } from "./routes/post";
import { getPutRoute } from "./routes/put";
import { InitRoutesOptions } from "./types";
export { checkAuthStatus } from "./token";
export { getContext } from "./utils";

/**
 * Returns route handlers for email auth: GET (refresh), POST (sign up), PUT (login), DELETE (logout).
 * @param options - Init options (getUser, createUser, onError, callbacks)
 * @returns Object with GET, POST, PUT, DELETE handler functions
 */
export function getEmailAuthRoutes(options: InitRoutesOptions) {
  return {
    GET: getGetRoute(options),
    POST: getPostRoute(options),
    PUT: getPutRoute(options),
    DELETE: getDeleteRoute(options),
  };
}

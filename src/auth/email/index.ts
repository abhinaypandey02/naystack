import { NextRequest } from "next/server";

import { getUserContext } from "@/src/auth/email/utils";

import { getDeleteRoute } from "./routes/delete";
import { getGetRoute } from "./routes/get";
import { getPostRoute } from "./routes/post";
import { getPutRoute } from "./routes/put";
import { InitRoutesOptions } from "./types";

export function getEmailAuthRoutes(options: InitRoutesOptions) {
  return {
    GET: getGetRoute(options),
    POST: getPostRoute(options),
    PUT: getPutRoute(options),
    DELETE: getDeleteRoute(options),
    getUserIdFromRequest: (req: NextRequest) =>
      getUserContext(options.refreshKey, options.signingKey, req),
  };
}

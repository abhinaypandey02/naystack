import { NextRequest } from "next/server";

import { getContext } from "@/src/auth/email/utils";

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
    getContext: (req: NextRequest) =>
      getContext(options.refreshKey, options.signingKey, req),
  };
}

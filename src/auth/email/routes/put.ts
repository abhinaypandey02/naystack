import { NextRequest } from "next/server";

import { EnvVariable, getEnv } from "@/src/env";

import { handleError } from "../../utils/errors";
import {
  generateAccessToken,
  generateRefreshToken,
  getTokenizedResponse,
  verifyUser,
} from "../token";
import { SetupEmailAuthOptions } from "../types";
import { massageRequest } from "../utils";

/**
 * Returns the PUT route handler for login.
 * @param options - SetupEmailAuthOptions
 * @returns Async route handler
 */
export const getPutRoute =
  (options: SetupEmailAuthOptions) => async (req: NextRequest) => {
    const { data, error } = await massageRequest(req, options);
    if (error || !data) return error;

    const user = await options.getUser(data);
    if (!user)
      return handleError(400, "A user does not exist", options.onError);

    if (await verifyUser(user, data.password)) {
      if (options.onLogin) {
        try {
          await options.onLogin?.(user.id, data);
        } catch (e) {
          console.error(e);
        }
      }
      return getTokenizedResponse(user.id
      );
    }
    return handleError(403, "Invalid password", options.onError);
  };

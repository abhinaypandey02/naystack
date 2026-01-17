import { NextRequest } from "next/server";

import { EnvVariable, getEnv } from "@/src";

import { handleError } from "../../utils/errors";
import {
  generateAccessToken,
  generateRefreshToken,
  getTokenizedResponse,
  verifyUser,
} from "../token";
import { InitRoutesOptions } from "../types";
import { massageRequest } from "../utils";

export const getPutRoute =
  (options: InitRoutesOptions) => async (req: NextRequest) => {
    const { data, error } = await massageRequest(req, options);
    if (error || !data) return error;

    const user = await options.getUser(data);
    if (!user)
      return handleError(400, "A user does not exist", options.onError);

    if (await verifyUser(user, data.password)) {
      if (options.onLogin) {
        await options.onLogin?.(user.id, data);
      }
      return getTokenizedResponse(
        generateAccessToken(user.id, getEnv(EnvVariable.SIGNING_KEY)),
        generateRefreshToken(user.id, getEnv(EnvVariable.REFRESH_KEY)),
      );
    }
    return handleError(403, "Invalid password", options.onError);
  };

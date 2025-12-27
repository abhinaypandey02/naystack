import { NextRequest } from "next/server";

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

    const user = await options.getUser(data.email);
    if (!user)
      return handleError(400, "A user does not exist", options.onError);

    if (await verifyUser(user, data.password)) {
      if (options.onLogin) {
        await options.onLogin?.(user.id, req);
      }
      return getTokenizedResponse(
        generateAccessToken(user.id, options.keys.signing),
        generateRefreshToken(user.id, options.keys.refresh),
      );
    }
    return handleError(403, "Invalid password", options.onError);
  };

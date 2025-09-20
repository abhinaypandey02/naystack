import { hash } from "bcryptjs";
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

export const getPostRoute =
  (options: InitRoutesOptions) => async (req: NextRequest) => {
    const { data, error } = await massageRequest(req, options);
    if (error || !data) return error;

    const existingUser = await options.getUser(data.email);
    if (existingUser) {
      if (await verifyUser(existingUser, data.password)) {
        return getTokenizedResponse(
          generateAccessToken(existingUser.id, options.signingKey),
          generateRefreshToken(existingUser.id, options.refreshKey),
        );
      }
      return handleError(400, "A user already exists", options.onError);
    }

    const encryptedPassword = await hash(data.password, 10);
    const newUser = await options.createUser({
      ...data,
      password: encryptedPassword,
    });

    if (newUser) {
      options.onSignUp?.(newUser);

      return getTokenizedResponse(
        generateAccessToken(newUser.id, options.signingKey),
        generateRefreshToken(newUser.id, options.refreshKey),
      );
    }
    return getTokenizedResponse();
  };

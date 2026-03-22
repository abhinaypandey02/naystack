import { hash } from "bcryptjs";
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
 * Returns the POST route handler for sign up.
 * @param options - SetupEmailAuthOptions
 * @returns Async route handler
 */
export const getPostRoute =
  (options: SetupEmailAuthOptions) => async (req: NextRequest) => {
    const { data, error } = await massageRequest(req, options);
    if (error || !data) return error;

    const existingUser = await options.getUser(data);
    if (existingUser) {
      if (await verifyUser(existingUser, data.password)) {
        return getTokenizedResponse(
          generateAccessToken(existingUser.id, getEnv(EnvVariable.SIGNING_KEY)),
          generateRefreshToken(
            existingUser.id,
            getEnv(EnvVariable.REFRESH_KEY),
          ),
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
      if (options.onSignUp) {
        await options.onSignUp?.(newUser.id, data);
      }
      return getTokenizedResponse(
        generateAccessToken(newUser.id, getEnv(EnvVariable.SIGNING_KEY)),
        generateRefreshToken(newUser.id, getEnv(EnvVariable.REFRESH_KEY)),
      );
    }
    return getTokenizedResponse();
  };

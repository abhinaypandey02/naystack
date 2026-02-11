import { EnvVariable, getEnv } from "@/src/env";

/**
 * Creates a function that builds the Instagram OAuth authorization URL for a given state token.
 * @param redirectURL - OAuth redirect URI
 * @returns Function (token) => authorization URL string
 */
export const getInstagramAuthorizationURLSetup =
  (redirectURL: string) => (token: string) =>
    `https://www.instagram.com/oauth/authorize?client_id=${getEnv(
      EnvVariable.INSTAGRAM_CLIENT_ID,
    )}&response_type=code&enable_fb_login=0&force_authentication=1&scope=instagram_business_basic&state=${token}&redirect_uri=${redirectURL}`;

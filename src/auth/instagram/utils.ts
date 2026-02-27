import { EnvVariable, getEnv } from "@/src/env";

/**
 * Exchanges a long-lived Instagram token for a refreshed token.
 * @param token - Current long-lived access token
 * @returns New access token or undefined
 */
export async function getRefreshedInstagramAccessToken(token: string) {
  const request = await fetch(
    `https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=${token}`,
  );
  const response = (await request.json()) as { access_token?: string };
  return response.access_token;
}

/**
 * Exchanges an OAuth code for a long-lived Instagram access token.
 * @param code - OAuth authorization code from redirect
 * @param redirectURL - Registered redirect URI
 * @param clientId - Instagram app client id
 * @param clientSecret - Instagram app client secret
 * @returns Object with accessToken and userId, or undefined
 */
export async function getLongLivedToken(
  code: string,
  redirectURL: string,
  clientId: string,
  clientSecret: string,
) {
  const formData = new FormData();
  formData.set("client_id", clientId);
  formData.set("client_secret", clientSecret);
  formData.set("grant_type", "authorization_code");
  formData.set("redirect_uri", redirectURL);
  formData.set("code", code);
  const shortRes = await fetch("https://api.instagram.com/oauth/access_token", {
    method: "POST",
    body: formData,
  });
  if (shortRes.ok) {
    const shortResData = (await shortRes.json()) as {
      access_token: string;
      user_id: string;
      permissions: string[];
    };
    if (shortResData.access_token) {
      const shortLivedToken = shortResData.access_token;
      const longRes = await fetch(
        `https://graph.instagram.com/access_token?grant_type=ig_exchange_token&access_token=${shortLivedToken}&client_secret=${getEnv(EnvVariable.INSTAGRAM_CLIENT_SECRET)}`,
      );
      if (longRes.ok) {
        const longResData = (await longRes.json()) as {
          access_token: string;
          token_type: "bearer";
          expires_in: number;
        };
        return {
          accessToken: longResData.access_token,
          userId: shortResData.user_id,
        };
      }
    }
  }
}

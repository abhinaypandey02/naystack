import { getInstagramRoute } from "@/src/auth/instagram/route";
import { getRefreshedAccessToken } from "@/src/auth/instagram/utils";
import { InstagramUser } from "@/src/socials/instagram/types";

export interface InitInstagramAuthOptions {
  onUser: (
    data: InstagramUser,
    id: number | null,
    accessToken: string,
  ) => Promise<string | void>;
  successRedirectURL: string;
  errorRedirectURL: string;
  refreshKey: string;
}

/**
 * Initializes Instagram OAuth auth: returns GET route handler and token refresh helper.
 * @param props - Options including onUser, redirect URLs, refreshKey
 * @returns Object with GET route and getRefreshedAccessToken
 */
export function initInstagramAuth(props: InitInstagramAuthOptions) {
  return {
    GET: getInstagramRoute(props),
    getRefreshedAccessToken,
  };
}

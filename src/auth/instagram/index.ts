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
  authRoute: string;
  clientId: string;
  clientSecret: string;
  refreshKey: string;
}

export function initInstagramAuth(props: InitInstagramAuthOptions) {
  return {
    GET: getInstagramRoute(props),
    getRefreshedAccessToken,
  };
}

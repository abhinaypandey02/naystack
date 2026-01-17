import type { oauth2_v2 } from "googleapis";

import { getGoogleGetRoute } from "@/src/auth/google/get";

type Schema$Userinfo = oauth2_v2.Schema$Userinfo;

export interface InitGoogleAuthOptions {
  getUserIdFromEmail: (email: Schema$Userinfo) => Promise<number | null>;
  redirectURL: string;
  errorRedirectURL?: string;
}

export function initGoogleAuth(props: InitGoogleAuthOptions) {
  return {
    GET: getGoogleGetRoute(props),
  };
}

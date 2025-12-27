import type { oauth2_v2 } from "googleapis";

import { getGoogleGetRoute } from "@/src/auth/google/get";

import { AuthKeys } from "../email/types";
type Schema$Userinfo = oauth2_v2.Schema$Userinfo;

export interface InitGoogleAuthOptions {
  getUserIdFromEmail: (email: Schema$Userinfo) => Promise<number | null>;
  redirectURL: string;
  errorRedirectURL?: string;
  url: string;
  clientId: string;
  clientSecret: string;
  keys: AuthKeys;
}

export function initGoogleAuth(props: InitGoogleAuthOptions) {
  return {
    GET: getGoogleGetRoute(props),
  };
}

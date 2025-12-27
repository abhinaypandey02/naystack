import { google } from "googleapis";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { v4 } from "uuid";

import { generateRefreshToken } from "@/src/auth/email/token";
import { InitGoogleAuthOptions } from "@/src/auth/google/index";

import { REFRESH_COOKIE_NAME } from "../constants";

export const getGoogleGetRoute = ({
  getUserIdFromEmail,
  redirectURL,
  errorRedirectURL,
  url,
  clientId,
  clientSecret,
  keys,
}: InitGoogleAuthOptions) => {
  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, url);
  return async (req: NextRequest) => {
    const code = req.nextUrl.searchParams.get("code");
    const error = req.nextUrl.searchParams.get("error");

    if (!code && !error) {
      const state = v4();
      const authorizationUrl = oauth2Client.generateAuthUrl({
        scope: [
          "https://www.googleapis.com/auth/userinfo.profile",
          "https://www.googleapis.com/auth/userinfo.email",
        ],
        state,
        include_granted_scopes: true,
        prompt: "consent",
        redirect_uri: url,
      });
      const res = NextResponse.redirect(authorizationUrl);
      res.cookies.set("state", state, {
        httpOnly: true,
        secure: true,
      });
      return res;
    }
    const errorURL = errorRedirectURL || redirectURL;
    if (error) {
      return NextResponse.redirect(errorURL);
    }
    const state = req.nextUrl.searchParams.get("state") || undefined;
    if (code && state) {
      const localState = req.cookies.get("state")?.value;
      if (localState !== state) return NextResponse.redirect(errorURL);
      const { tokens } = await oauth2Client.getToken(code);
      oauth2Client.setCredentials(tokens);

      const userInfoRequest = await google
        .oauth2({
          auth: oauth2Client,
          version: "v2",
        })
        .userinfo.get();

      const user = userInfoRequest.data;
      if (user.email) {
        const id = await getUserIdFromEmail(user);
        const res = NextResponse.redirect(redirectURL);
        if (id) {
          res.cookies.set(
            REFRESH_COOKIE_NAME,
            generateRefreshToken(id, keys.refresh),
            {
              httpOnly: true,
              secure: true,
            },
          );
        }
        res.cookies.set("state", "", {
          httpOnly: true,
          secure: true,
          maxAge: 0,
        });
        return res;
      }
    }
    return NextResponse.redirect(errorURL);
  };
};

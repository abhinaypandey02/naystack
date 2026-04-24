import { AuthApply, AuthWrapper as AuthWrapperClient } from "naystack/auth/client";
import { cookies } from "next/headers";
import React from "react";

import { REFRESH_COOKIE_NAME } from "@/src/auth/constants";
import { EnvVariable, getEnv } from "@/src/env";
import { Injector } from "@/src/graphql/server";
import { AuthWrapperProps } from "./client";

export function AuthFetch() {
  return (
    <Injector
      fetch={async () => {
        const cookie = await cookies();
        const token = cookie.get(REFRESH_COOKIE_NAME);
        if (!token) return null;
        return fetch(getEnv(EnvVariable.NEXT_PUBLIC_EMAIL_AUTH_ENDPOINT), {
          credentials: "include",
          headers: {
            Cookie: cookie.toString(),
          },
        })
          .then((res) => res.text())
          .catch(() => null);
      }}
      Component={AuthApply}
    />
  );
}

export function AuthWrapper({ children, skipInitialFetch }: AuthWrapperProps) {
  return <>
    <AuthWrapperClient skipInitialFetch>
      {!skipInitialFetch && <AuthFetch />}
      {children}
    </AuthWrapperClient>
  </>
}
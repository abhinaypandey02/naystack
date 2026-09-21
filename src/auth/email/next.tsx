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

/**
 * Server Component `AuthWrapper`. Same contract as the one in `naystack/auth/client`,
 * but the first token fetch runs on the server with the refresh cookie forwarded and
 * streams in through Suspense, so the client never starts logged-out-then-logged-in.
 * Use it in a server layout; it renders the client provider underneath.
 *
 * @example
 * ```tsx
 * // app/layout.tsx (Server Component)
 * import { AuthWrapper } from "naystack/auth";
 * import { ApolloWrapper } from "naystack/graphql/client";
 *
 * export default function RootLayout({ children }: { children: React.ReactNode }) {
 *   return (
 *     <html lang="en">
 *       <body>
 *         <AuthWrapper>
 *           <ApolloWrapper>{children}</ApolloWrapper>
 *         </AuthWrapper>
 *       </body>
 *     </html>
 *   );
 * }
 * ```
 *
 * @category Auth
 */
export function AuthWrapper({ children, skipInitialFetch }: AuthWrapperProps) {
  return <>
    <AuthWrapperClient skipInitialFetch>
      {!skipInitialFetch && <AuthFetch />}
      {children}
    </AuthWrapperClient>
  </>
}
"use client";

import React, {
  createContext,
  Dispatch,
  PropsWithChildren,
  SetStateAction,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

import { REFRESH_HEADER_NAME } from "@/src/auth/constants";
import {
  getAccessToken,
  refreshAccessToken,
  setAccessToken,
  subscribeToAccessToken,
} from "@/src/auth/token-store";
import { EnvVariable, getEnv } from "@/src/env";

export {
  getAccessToken,
  refreshAccessToken,
  setAccessToken,
} from "@/src/auth/token-store";

/**
 * React context holding the current access token and setter; used by useToken/useSetToken and auth hooks.
 * @category Auth
 */
export const TokenContext = createContext<{
  token: string | null | undefined;
  setToken: Dispatch<SetStateAction<string | null | undefined>>;
}>({
  token: undefined,
  setToken: () => null,
});

export type AuthWrapperProps = PropsWithChildren<{
  onTokenUpdate?: (token: string | null) => void;
  skipInitialFetch?: boolean;
}>

/**
 * Provider that fetches the current access token from your auth endpoint and exposes it via TokenContext.
 * Wrap your app (or the part that needs auth) so that `useToken()`, `useLogin()`, `useSignUp()`, `useLogout()` work.
 * On mount it GETs `NEXT_PUBLIC_EMAIL_AUTH_ENDPOINT` with credentials; the response's `accessToken` is stored and provided to children.
 *
 * Must be placed **above** `ApolloWrapper` in the component tree (since `ApolloWrapper` needs the token).
 *
 * @param children - React children (e.g. your app or a layout).
 * @param onTokenUpdate - Optional callback fired whenever the token changes (after initial load). Receives `token` (string) or `null` on logout.
 * @returns TokenContext.Provider wrapping children.
 *
 * @example
 * ```tsx
 * // app/layout.tsx
 * import { AuthWrapper } from "naystack/auth/client";
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
export const AuthWrapper = ({
  children,
  skipInitialFetch
}: AuthWrapperProps) => {
  // The module store is the source of truth (see `auth/token-store`); this state
  // is a mirror of it, so a refresh triggered by the Apollo link re-renders here.
  const [token, setTokenState] = useState<string | null | undefined>(
    getAccessToken,
  );

  useEffect(() => subscribeToAccessToken(setTokenState), []);

  const setToken = useCallback<
    Dispatch<SetStateAction<string | null | undefined>>
  >((action) => {
    setAccessToken(
      typeof action === "function" ? action(getAccessToken()) : action,
    );
  }, []);

  return (
    <TokenContext.Provider value={{ token, setToken }}>
      {!skipInitialFetch && <AuthChildComponent />}
      {children}
    </TokenContext.Provider>
  );
};

function AuthChildComponent() {
  useAuthFetch();
  return null;
}

/**
 * Fetches the access token on mount by calling the auth endpoint. Stores the result in TokenContext.
 * Used internally by auth setup; prefer `AuthWrapper` for typical usage.
 *
 * @param getRefreshToken - Optional async function that returns a refresh token string (e.g. from cookies or storage). If omitted, the request relies on httpOnly cookies via `credentials: "include"`.
 *
 * @category Auth
 */
export function useAuthFetch({ skip }: { skip?: boolean } = {}) {
  useEffect(() => {
    if (skip) return;
    // Shares the in-flight promise with link-triggered refreshes, and writes
    // straight to the store — no `setToken` needed, the provider is subscribed.
    void refreshAccessToken().catch(() => null);
  }, []);
}

/**
 * Component that applies a server-provided access token into TokenContext on mount.
 * Useful for hydrating auth state from server-side rendering.
 *
 * @param data - The access token string to set. If falsy, no update occurs.
 *
 * @category Auth
 */
export function AuthApply({ data }: { data?: string | null }) {
  const setToken = useSetToken();
  useEffect(() => {
    if (data!==undefined) {
      setToken(data);
    }
  }, [data]);
  return null;
}
/**
 * Returns the current JWT access token from TokenContext. Must be used inside `AuthWrapper`.
 *
 * Common uses: conditional rendering based on auth state, passing to custom fetch headers.
 *
 * @returns The access token string, or `null` if not yet loaded or user is logged out.
 *
 * @example
 * ```tsx
 * import { useToken } from "naystack/auth/client";
 *
 * function Navbar() {
 *   const token = useToken();
 *   return <Link href={token ? "/dashboard" : "/login"}>{token ? "Dashboard" : "Log in"}</Link>;
 * }
 * ```
 *
 * @example Using the token for custom API calls:
 * ```tsx
 * const token = useToken();
 * const response = await fetch("/api/custom", {
 *   headers: { Authorization: `Bearer ${token}` },
 * });
 * ```
 *
 * @category Auth
 */
export function useToken() {
  const { token } = useContext(TokenContext);
  return token;
}

/**
 * Returns the setter for the access token in TokenContext. Use to update token after login/signup or clear it on logout.
 * Must be used inside `AuthWrapper`. Typically you won't need this directly — use `useLogin`, `useSignUp`, and `useLogout` instead.
 *
 * @returns `Dispatch<SetStateAction<string | null>>` — call with a string to set the token, or `null` to clear.
 *
 * @category Auth
 */
export function useSetToken() {
  const { setToken } = useContext(TokenContext);
  return setToken;
}

/**
 * Returns a sign-up function that POSTs to the auth endpoint with credentials. On success, the response's
 * `accessToken` is stored and the token context updates automatically.
 *
 * The payload must include at least `email` and `password`. You can include any extra fields (e.g. `name`, `designation`)
 * and they will be forwarded to the `createUser` callback on the server.
 *
 * @returns A function `(data) => Promise<null | string>`. Call with sign-up payload. Returns `null` on success, or the error response text on failure.
 *
 * @example
 * ```tsx
 * import { useSignUp } from "naystack/auth/client";
 *
 * function SignUpForm() {
 *   const signUp = useSignUp();
 *
 *   const handleSubmit = async (data: { name: string; email: string; password: string }) => {
 *     const error = await signUp(data);
 *     if (error) {
 *       setMessage(error); // e.g. "A user already exists"
 *     } else {
 *       router.replace("/dashboard");
 *     }
 *   };
 * }
 * ```
 *
 * @category Auth
 */
export function useSignUp() {
  const setToken = useSetToken();
  return useCallback(
    async (data: object) => {
      const res = await fetch(
        getEnv(EnvVariable.NEXT_PUBLIC_EMAIL_AUTH_ENDPOINT),
        {
          method: "POST",
          body: JSON.stringify(data),
          credentials: "include",
        },
      );
      if (res.ok) {
        const accessToken = await res.text();
        setToken(accessToken);
        return null;
      }
      return res.text();
    },
    [setToken],
  );
}

/**
 * Returns a login function that PUTs to the auth endpoint with credentials. On success, the response's
 * `accessToken` is stored and the token context updates automatically.
 *
 * @returns A function `(data) => Promise<null | string>`. Call with `{ email, password }`. Returns `null` on success, or the error message on failure (e.g. `"Invalid password"`).
 *
 * @example
 * ```tsx
 * import { useLogin } from "naystack/auth/client";
 *
 * function LoginForm() {
 *   const login = useLogin();
 *
 *   const handleSubmit = async (data: { email: string; password: string }) => {
 *     const error = await login(data);
 *     if (error) {
 *       form.setError("password", { message: error });
 *     } else {
 *       router.replace("/dashboard");
 *     }
 *   };
 * }
 * ```
 *
 * @category Auth
 */
export function useLogin() {
  const setToken = useSetToken();
  return useCallback(
    async (data: object) => {
      const res = await fetch(
        getEnv(EnvVariable.NEXT_PUBLIC_EMAIL_AUTH_ENDPOINT),
        {
          method: "PUT",
          body: JSON.stringify(data),
          credentials: "include",
        },
      );
      if (res.ok) {
        const accessToken = await res.text();
        setToken(accessToken);
        return null;
      }
      return res.text();
    },
    [setToken],
  );
}

/**
 * Returns a logout function that clears the token in context and sends DELETE to the auth endpoint with credentials.
 * The token is cleared **immediately** (optimistic), and the DELETE request runs in the background.
 *
 * @returns A function `(data?) => Promise<void>`. Call with optional body (forwarded to the server's `onLogout` callback). Token is cleared immediately.
 *
 * @example
 * ```tsx
 * import { useLogout } from "naystack/auth/client";
 *
 * function SettingsPage() {
 *   const logout = useLogout();
 *   const router = useRouter();
 *
 *   return (
 *     <button onClick={() => { logout(); router.push("/login"); }}>
 *       Log out
 *     </button>
 *   );
 * }
 * ```
 *
 * @category Auth
 */
export function useLogout() {
  const setToken = useSetToken();
  return useCallback(
    async (data?: object) => {
      setToken(null);
      await fetch(getEnv(EnvVariable.NEXT_PUBLIC_EMAIL_AUTH_ENDPOINT), {
        method: "DELETE",
        credentials: "include",
        body: JSON.stringify(data),
      });
    },
    [setToken],
  );
}

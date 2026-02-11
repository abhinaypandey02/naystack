"use client";

import React, {
  createContext,
  Dispatch,
  SetStateAction,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

import { EnvVariable, getEnv } from "@/src/env";

export const TokenContext = createContext<{
  token: string | null;
  setToken: Dispatch<SetStateAction<string | null>>;
}>({
  token: null,
  setToken: () => null,
});

/**
 * Provider that fetches the current access token and exposes it via TokenContext.
 * @param props - React children
 */
export const AuthWrapper = ({ children }: { children: React.ReactNode }) => {
  const [token, setToken] = useState<string | null>(null);
  useEffect(() => {
    fetch(getEnv(EnvVariable.NEXT_PUBLIC_EMAIL_AUTH_ENDPOINT), {
      credentials: "include",
    })
      .then((res) => res.json())
      .then((data) => setToken(data.accessToken));
  }, []);
  return (
    <TokenContext.Provider value={{ token, setToken }}>
      {children}
    </TokenContext.Provider>
  );
};

/**
 * Returns the current access token from TokenContext.
 * @returns Token string or null
 */
export function useToken() {
  const { token } = useContext(TokenContext);
  return token;
}

/**
 * Returns the setState function for the access token from TokenContext.
 */
export function useSetToken() {
  const { setToken } = useContext(TokenContext);
  return setToken;
}

/**
 * Returns a sign-up function that POSTs to the auth endpoint and updates the token on success.
 * @returns Async (data) => null on success, error text on failure
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
        const data = await res.json();
        setToken(data.accessToken);
        return null;
      }
      return res.text();
    },
    [setToken],
  );
}

/**
 * Returns a login function that PUTs to the auth endpoint and updates the token on success.
 * @returns Async (data) => null on success, error text on failure
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
        const data = await res.json();
        setToken(data.accessToken);
        return null;
      }
      return res.text();
    },
    [setToken],
  );
}

/**
 * Returns a logout function that clears the token and calls the auth DELETE endpoint.
 * @returns Async (data?) => void
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

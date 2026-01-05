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

export const TokenContext = createContext<{
  token: string | null;
  setToken: Dispatch<SetStateAction<string | null>>;
}>({
  token: null,
  setToken: () => null,
});
export const AuthWrapper =
  ({ children }: { children: React.ReactNode }) => {
    const [token, setToken] = useState<string | null>(null);
    useEffect(() => {
      fetch(process.env.NEXT_PUBLIC_EMAIL_AUTH_ENDPOINT!, {
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

export function useToken() {
  const { token } = useContext(TokenContext);
  return token;
}

export function useSetToken() {
  const { setToken } = useContext(TokenContext);
  return setToken;
}

export function useSignUpWithEmail(endpoint: string) {
  const setToken = useSetToken();
  return useCallback(
    async (data: object) => {
      const res = await fetch(process.env.NEXT_PUBLIC_EMAIL_AUTH_ENDPOINT!, {
        method: "POST",
        body: JSON.stringify(data),
        credentials: "include",
      });
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

export function useLoginWithEmail() {
  const setToken = useSetToken();
  return useCallback(
    async (data: object) => {
      const res = await fetch(process.env.NEXT_PUBLIC_EMAIL_AUTH_ENDPOINT!, {
        method: "PUT",
        body: JSON.stringify(data),
        credentials: "include",
      });
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

export function useLogout() {
  const setToken = useSetToken();
  return useCallback(
    async (data?: object) => {
      setToken(null);
      await fetch(process.env.NEXT_PUBLIC_EMAIL_AUTH_ENDPOINT!, {
        method: "DELETE",
        credentials: "include",
        body: JSON.stringify(data),
      });
    },
    [setToken],
  );
}

import { useCallback, useContext } from "react";

import { TokenContext } from "@/src/graphql/client";

function useSignUpWithEmail(endpoint: string) {
  const { setToken } = useContext(TokenContext);
  return useCallback(
    async (data: object) => {
      const res = await fetch(endpoint, {
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

function useLoginWithEmail(endpoint: string) {
  const { setToken } = useContext(TokenContext);
  return useCallback(
    async (data: object) => {
      const res = await fetch(endpoint, {
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

function useLogout(endpoint: string) {
  const { setToken } = useContext(TokenContext);
  return useCallback(
    async (data?: object) => {
      setToken(null);
      await fetch(endpoint, {
        method: "DELETE",
        credentials: "include",
        body: JSON.stringify(data),
      });
    },
    [setToken],
  );
}

export function getEmailAuthUtils(endpoint: string) {
  return {
    useSignUp: () => useSignUpWithEmail(endpoint),
    useLogin: () => useLoginWithEmail(endpoint),
    useLogout: () => useLogout(endpoint),
  };
}

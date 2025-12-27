import {
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
export const getAuthWrapper =
  (endpoint: string) =>
  ({ children }: { children: React.ReactNode }) => {
    const [token, setToken] = useState<string | null>(null);
    useEffect(() => {
      fetch(endpoint, {
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

function useSignUpWithEmail(endpoint: string) {
  const setToken = useSetToken();
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
  const setToken = useSetToken();
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
  const setToken = useSetToken();
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

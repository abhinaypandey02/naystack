import { AuthApply } from "naystack/auth/email/client";
import { cookies } from "next/headers";

import { Injector } from "@/src/graphql/server";

export default function AuthFetch() {
  return (
    <Injector
      fetch={async () => {
        const cookie = await cookies();
        const token = cookie.get("refresh");
        if (!token) return null;
        return fetch(process.env.NEXT_PUBLIC_BACKEND_BASE_URL + `/email`, {
          credentials: "include",
          headers: {
            Cookie: cookie.toString(),
          },
        })
          .then((res) => res.json())
          .then((data) => data.accessToken)
          .catch(() => null);
      }}
      Component={AuthApply}
    />
  );
}

import { cookies } from "next/headers";

import { REFRESH_COOKIE_NAME } from "../constants";

export async function getRefreshToken() {
  const Cookie = await cookies();
  return Cookie.get(REFRESH_COOKIE_NAME)?.value;
}

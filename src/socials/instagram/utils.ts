import { InstagramError } from "@/src/socials/instagram/types";

export function getInstagramURL(
  token: string,
  path: string,
  params: Record<string, string>,
) {
  return `https://graph.instagram.com/v23.0/${path}?${Object.keys(params)
    .map((key) => `${key}=${params[key]}`)
    .join("&")}&access_token=${token}`;
}

export function getInstagramData<T>(
  token: string,
  path: string,
  params: Record<string, string> = {},
  postData?: object,
): Promise<(T & InstagramError) | null> {
  return fetch(getInstagramURL(token, path, params), {
    method: postData ? "POST" : "GET",
    body: JSON.stringify(postData),
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  }).then((res) => res.json());
}

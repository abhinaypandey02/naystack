export function getThreadsURL(
  token: string,
  path: string,
  params: Record<string, string>,
) {
  return `https://graph.threads.net/v1.0/${path}?${Object.keys(params)
    .map((key) => `${key}=${params[key]}`)
    .join("&")}&access_token=${token}`;
}

export function getThreadsData<T>(
  token: string,
  path: string,
  params: Record<string, string>,
  method?: "POST",
): Promise<T | null> {
  return fetch(getThreadsURL(token, path, params), {
    method: method || "GET",
  }).then((res) => res.json());
}

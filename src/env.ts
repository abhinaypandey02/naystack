/** Environment variable keys used by the stack. */
export enum EnvVariable {
  NEXT_PUBLIC_GRAPHQL_ENDPOINT = "NEXT_PUBLIC_GRAPHQL_ENDPOINT",
  NEXT_PUBLIC_EMAIL_AUTH_ENDPOINT = "NEXT_PUBLIC_EMAIL_AUTH_ENDPOINT",
  NEXT_PUBLIC_GOOGLE_AUTH_ENDPOINT = "NEXT_PUBLIC_GOOGLE_AUTH_ENDPOINT",
  NEXT_PUBLIC_INSTAGRAM_AUTH_ENDPOINT = "NEXT_PUBLIC_INSTAGRAM_AUTH_ENDPOINT",
  NEXT_PUBLIC_FILE_ENDPOINT = "NEXT_PUBLIC_FILE_ENDPOINT",
  NEXT_PUBLIC_BASE_URL = "NEXT_PUBLIC_BASE_URL",
  REFRESH_KEY = "REFRESH_KEY",
  SIGNING_KEY = "SIGNING_KEY",
  INSTAGRAM_CLIENT_SECRET = "INSTAGRAM_CLIENT_SECRET",
  INSTAGRAM_CLIENT_ID = "INSTAGRAM_CLIENT_ID",
  GOOGLE_CLIENT_SECRET = "GOOGLE_CLIENT_SECRET",
  GOOGLE_CLIENT_ID = "GOOGLE_CLIENT_ID",
  TURNSTILE_KEY = "TURNSTILE_KEY",
  AWS_ACCESS_KEY_ID = "AWS_ACCESS_KEY_ID",
  AWS_ACCESS_KEY_SECRET = "AWS_ACCESS_KEY_SECRET",
  AWS_REGION = "AWS_REGION",
  AWS_BUCKET = "AWS_BUCKET",
  NODE_ENV = "NODE_ENV",
}

/**
 * Reads an environment variable by key (no throw).
 * @param key - EnvVariable enum member
 * @returns Value or undefined
 */
export const getEnvValue = (key: EnvVariable): string | undefined => {
  switch (key) {
    case EnvVariable.NEXT_PUBLIC_GRAPHQL_ENDPOINT:
      return process.env.NEXT_PUBLIC_GRAPHQL_ENDPOINT;
    case EnvVariable.NEXT_PUBLIC_EMAIL_AUTH_ENDPOINT:
      return process.env.NEXT_PUBLIC_EMAIL_AUTH_ENDPOINT;
    case EnvVariable.NEXT_PUBLIC_GOOGLE_AUTH_ENDPOINT:
      return process.env.NEXT_PUBLIC_GOOGLE_AUTH_ENDPOINT;
    case EnvVariable.NEXT_PUBLIC_INSTAGRAM_AUTH_ENDPOINT:
      return process.env.NEXT_PUBLIC_INSTAGRAM_AUTH_ENDPOINT;
    case EnvVariable.NEXT_PUBLIC_FILE_ENDPOINT:
      return process.env.NEXT_PUBLIC_FILE_ENDPOINT;
    case EnvVariable.NEXT_PUBLIC_BASE_URL:
      return process.env.NEXT_PUBLIC_BASE_URL;
    case EnvVariable.REFRESH_KEY:
      return process.env.REFRESH_KEY;
    case EnvVariable.SIGNING_KEY:
      return process.env.SIGNING_KEY;
    case EnvVariable.INSTAGRAM_CLIENT_SECRET:
      return process.env.INSTAGRAM_CLIENT_SECRET;
    case EnvVariable.INSTAGRAM_CLIENT_ID:
      return process.env.INSTAGRAM_CLIENT_ID;
    case EnvVariable.GOOGLE_CLIENT_SECRET:
      return process.env.GOOGLE_CLIENT_SECRET;
    case EnvVariable.GOOGLE_CLIENT_ID:
      return process.env.GOOGLE_CLIENT_ID;
    case EnvVariable.TURNSTILE_KEY:
      return process.env.TURNSTILE_KEY;
    case EnvVariable.AWS_ACCESS_KEY_ID:
      return process.env.AWS_ACCESS_KEY_ID;
    case EnvVariable.AWS_ACCESS_KEY_SECRET:
      return process.env.AWS_ACCESS_KEY_SECRET;
    case EnvVariable.AWS_REGION:
      return process.env.AWS_REGION;
    case EnvVariable.AWS_BUCKET:
      return process.env.AWS_BUCKET;
    case EnvVariable.NODE_ENV:
      return process.env.NODE_ENV;
    default:
      return process.env[key];
  }
};

/**
 * Reads a required env variable; throws if missing unless skipCheck is true.
 * @param key - EnvVariable enum member
 * @param skipCheck - If true, returns string | undefined without throwing
 * @returns Value (or undefined when skipCheck is true)
 */
export function getEnv<T extends boolean = false>(
  key: EnvVariable,
  skipCheck?: T,
): T extends true ? string | undefined : string {
  const value = getEnvValue(key);

  if (!skipCheck && !value) throw new Error(`${key} is not defined`);
  return value as T extends true ? string | undefined : string;
}

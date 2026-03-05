/**
 * Enum of all environment variable keys used by the naystack stack.
 * Use with {@link getEnv} or {@link getEnvValue} to read these variables.
 *
 * @category Environment
 */
export enum EnvVariable {
  /** GraphQL endpoint URL (client-side, e.g. `/api/graphql`). */
  NEXT_PUBLIC_GRAPHQL_ENDPOINT = "NEXT_PUBLIC_GRAPHQL_ENDPOINT",
  /** Email auth endpoint URL (client-side, e.g. `/api/email`). */
  NEXT_PUBLIC_EMAIL_AUTH_ENDPOINT = "NEXT_PUBLIC_EMAIL_AUTH_ENDPOINT",
  /** Google OAuth endpoint URL (client-side, e.g. `/api/google`). */
  NEXT_PUBLIC_GOOGLE_AUTH_ENDPOINT = "NEXT_PUBLIC_GOOGLE_AUTH_ENDPOINT",
  /** Instagram OAuth endpoint URL (client-side, e.g. `/api/instagram`). */
  NEXT_PUBLIC_INSTAGRAM_AUTH_ENDPOINT = "NEXT_PUBLIC_INSTAGRAM_AUTH_ENDPOINT",
  /** File upload endpoint URL (client-side, e.g. `/api/file`). */
  NEXT_PUBLIC_FILE_ENDPOINT = "NEXT_PUBLIC_FILE_ENDPOINT",
  /** Base URL of the app (e.g. `https://yourapp.com`). Used for SEO and Apple Web App metadata. */
  NEXT_PUBLIC_BASE_URL = "NEXT_PUBLIC_BASE_URL",
  /** Secret key for signing JWT refresh tokens. */
  REFRESH_KEY = "REFRESH_KEY",
  /** Secret key for signing JWT access tokens. */
  SIGNING_KEY = "SIGNING_KEY",
  /** Instagram app client secret (from Meta Developer Portal). */
  INSTAGRAM_CLIENT_SECRET = "INSTAGRAM_CLIENT_SECRET",
  /** Instagram app client id (from Meta Developer Portal). */
  INSTAGRAM_CLIENT_ID = "INSTAGRAM_CLIENT_ID",
  /** Google OAuth client secret (from Google Cloud Console). */
  GOOGLE_CLIENT_SECRET = "GOOGLE_CLIENT_SECRET",
  /** Google OAuth client id (from Google Cloud Console). */
  GOOGLE_CLIENT_ID = "GOOGLE_CLIENT_ID",
  /** Cloudflare Turnstile secret key (optional — enables captcha on auth routes). */
  TURNSTILE_KEY = "TURNSTILE_KEY",
  /** AWS access key id for S3. */
  AWS_ACCESS_KEY_ID = "AWS_ACCESS_KEY_ID",
  /** AWS secret access key for S3. */
  AWS_ACCESS_KEY_SECRET = "AWS_ACCESS_KEY_SECRET",
  /** AWS region for S3 (e.g. `us-east-1`). */
  AWS_REGION = "AWS_REGION",
  /** AWS S3 bucket name. */
  AWS_BUCKET = "AWS_BUCKET",
  /** Node environment (`development`, `production`, etc.). Used for Apollo landing page and introspection. */
  NODE_ENV = "NODE_ENV",
}

const EXTRA_ENV =
  (globalThis as any).__NAYSTACK_ENV__ ||
  ((globalThis as any).__NAYSTACK_ENV__ = {});

export function addEnv(key: string, value: string) {
  console.log("Adding env", key, value);
  EXTRA_ENV[key] = value;
}

/**
 * Reads an environment variable by key. Does **not** throw if the value is missing.
 *
 * @param key - One of the {@link EnvVariable} enum values.
 * @returns The value of the env var, or `undefined` if unset.
 *
 * @example
 * ```ts
 * import { getEnvValue, EnvVariable } from "naystack/env";
 *
 * const region = getEnvValue(EnvVariable.AWS_REGION); // "us-east-1" or undefined
 * ```
 *
 * @category Environment
 */
export const getEnvValue = (key: EnvVariable): string | undefined => {
  console.log(EXTRA_ENV, key);
  switch (key) {
    case EnvVariable.NEXT_PUBLIC_GRAPHQL_ENDPOINT:
      return (
        process.env.NEXT_PUBLIC_GRAPHQL_ENDPOINT || EXTRA_ENV.GRAPHQL_ENDPOINT
      );
    case EnvVariable.NEXT_PUBLIC_EMAIL_AUTH_ENDPOINT:
      return (
        process.env.NEXT_PUBLIC_EMAIL_AUTH_ENDPOINT ||
        EXTRA_ENV.EMAIL_AUTH_ENDPOINT
      );
    case EnvVariable.NEXT_PUBLIC_GOOGLE_AUTH_ENDPOINT:
      return (
        process.env.NEXT_PUBLIC_GOOGLE_AUTH_ENDPOINT ||
        EXTRA_ENV.GOOGLE_AUTH_ENDPOINT
      );
    case EnvVariable.NEXT_PUBLIC_INSTAGRAM_AUTH_ENDPOINT:
      return (
        process.env.NEXT_PUBLIC_INSTAGRAM_AUTH_ENDPOINT ||
        EXTRA_ENV.INSTAGRAM_AUTH_ENDPOINT
      );
    case EnvVariable.NEXT_PUBLIC_FILE_ENDPOINT:
      return process.env.NEXT_PUBLIC_FILE_ENDPOINT || EXTRA_ENV.FILE_ENDPOINT;
    case EnvVariable.NEXT_PUBLIC_BASE_URL:
      return process.env.NEXT_PUBLIC_BASE_URL || EXTRA_ENV.BASE_URL;
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
 * Reads an environment variable and **throws** if it's missing (unless `skipCheck` is `true`).
 * Use this for required configuration values.
 *
 * @param key - One of the {@link EnvVariable} enum values.
 * @param skipCheck - If `true`, the function does **not** throw when the value is missing and returns `string | undefined`.
 *   Useful for optional vars (e.g. `getEnv(EnvVariable.TURNSTILE_KEY, true)`).
 * @returns The env value. When `skipCheck` is `true`, the type is `string | undefined`; otherwise `string` (throws before returning if missing).
 *
 * @example
 * ```ts
 * import { getEnv, EnvVariable } from "naystack/env";
 *
 * // Required — throws if missing:
 * const signingKey = getEnv(EnvVariable.SIGNING_KEY);
 *
 * // Optional — returns undefined if missing:
 * const turnstile = getEnv(EnvVariable.TURNSTILE_KEY, true);
 * ```
 *
 * @category Environment
 */
export function getEnv<T extends boolean = false>(
  key: EnvVariable,
  skipCheck?: T,
): T extends true ? string | undefined : string {
  const value = getEnvValue(key);

  if (!skipCheck && !value) throw new Error(`${key} is not defined`);
  return value as T extends true ? string | undefined : string;
}

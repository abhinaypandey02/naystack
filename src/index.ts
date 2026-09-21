/**
 * Naystack — a minimal, powerful stack for Next.js app development.
 *
 * Use subpath imports for the specific module you need:
 * - `naystack/auth` — Email + Google login routes, server-side session helpers
 * - `naystack/auth/client` — Client-side auth hooks (useLogin, useSignUp, useLogout, useToken)
 * - `naystack/auth/token-store` — The access token outside React (getAccessToken, refreshAccessToken)
 * - `naystack/graphql` — GraphQL server: resolver, field, QueryLibrary, FieldLibrary, setupGraphQL, Injector, query
 * - `naystack/graphql/client` — Client-side GraphQL hooks (useAuthQuery, useAuthMutation, ApolloWrapper)
 * - `naystack/graphql/next` — ApolloWrapper built on Apollo's Next.js App Router integration
 * - `naystack/file` — S3 file upload route and server-side helpers
 * - `naystack/file/client` — Client-side file upload hook (useFileUpload)
 * - `naystack/utils/client` — Client hooks (useVisibility, useBreakpoint) and SEO (setupSEO)
 * - `naystack/socials` — Connect, read and publish: Instagram, Threads, YouTube
 * - `naystack/socials/types` — Platform-neutral shapes (SocialPlatform, SocialProfile, SocialPost)
 * - `naystack/env` — Typed env access (getEnv, EnvVariable, addEnv)
 *
 * @module
 */
export const hello = "world";

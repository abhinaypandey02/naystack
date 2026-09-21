# naystack

**The backend layer for Next.js App Router apps — auth, GraphQL, file uploads and social-media APIs in one typed package. Bring your own database.**

[![npm version](https://img.shields.io/npm/v/naystack.svg)](https://www.npmjs.com/package/naystack)
[![npm downloads](https://img.shields.io/npm/dm/naystack.svg)](https://www.npmjs.com/package/naystack)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6.svg)](https://www.typescriptlang.org/)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](https://opensource.org/licenses/ISC)

**[API Reference](https://abhinaypandey02.github.io/naystack/)** · [npm](https://www.npmjs.com/package/naystack) · [GitHub](https://github.com/abhinaypandey02/naystack)

naystack is a set of Next.js route handlers, React hooks and server helpers that
cover the parts every app needs and nobody enjoys re-writing:

- **Authentication** — email + password and Google login as JWT access tokens
  with an httpOnly refresh cookie. Cloudflare Turnstile captcha, CORS for a
  separate frontend or a mobile app, and hooks that keep the token in sync.
- **GraphQL** — resolvers as plain typed functions on top of `type-graphql` and
  Apollo Server. Every resolver can also be called directly from a Server
  Component. Client hooks refresh an expired token and retry for you.
- **File uploads** — one route handler that authenticates, optionally transforms
  the file, writes it to S3 (or any S3-compatible store) and calls you back with
  the URL. A matching upload hook for the browser and React Native.
- **Social APIs** — connect Instagram, Threads and YouTube accounts with one
  OAuth route, read profiles and posts through one normalized shape, and publish
  to Instagram and Threads without touching Meta's container/publish dance.
- **Utilities** — Next.js metadata factory for SEO, `useBreakpoint`,
  `useVisibility`, typed env access.

Everything is a subpath import (`naystack/auth`, `naystack/graphql`, …) so you
only bundle what you use. Database access is yours: examples use
[Drizzle](https://orm.drizzle.team), but any query layer works.

## Table of contents

- [Installation](#installation)
- [Quick start](#quick-start)
- [Modules at a glance](#modules-at-a-glance)
- [Authentication](#authentication)
- [GraphQL](#graphql)
- [File uploads](#file-uploads)
- [Social APIs](#social-apis)
- [Client utilities](#client-utilities)
- [Environment variables](#environment-variables)
- [React Native / Expo](#react-native--expo)
- [Requirements](#requirements)

## Installation

```bash
pnpm add naystack
# or
npm install naystack
```

Peer dependencies: `next >= 13` (App Router), `react` and `react-dom` 18 or 19.

## Quick start

Three files and four env vars get you email auth and an authenticated GraphQL
API.

**1. Environment**

```bash
SIGNING_KEY=change-me            # signs access tokens
REFRESH_KEY=change-me-too        # signs refresh tokens
NEXT_PUBLIC_EMAIL_AUTH_ENDPOINT=/api/email
NEXT_PUBLIC_GRAPHQL_ENDPOINT=/api/graphql
```

**2. Auth route** — `app/api/email/route.ts`

```ts
import { setupEmailAuth } from "naystack/auth";

export const { GET, POST, PUT, DELETE } = setupEmailAuth({
  getUser: async ({ email }: { email: string }) => {
    const [user] = await db
      .select({ id: UserTable.id, password: UserTable.password })
      .from(UserTable)
      .where(eq(UserTable.email, email));
    return user;
  },
  createUser: async (data: { email: string; password: string; name: string }) => {
    const [user] = await db
      .insert(UserTable)
      .values(data)
      .returning({ id: UserTable.id, password: UserTable.password });
    return user;
  },
});
```

**3. GraphQL route** — `app/api/graphql/route.ts`

```ts
import { setupGraphQL, resolver, QueryLibrary } from "naystack/graphql";

const getCurrentUser = resolver(
  async (ctx) => db.query.users.findFirst({ where: eq(UserTable.id, ctx.userId) }),
  { output: User, outputOptions: { nullable: true }, authorized: true },
);

export const { GET, POST } = await setupGraphQL({
  resolvers: [QueryLibrary({ getCurrentUser })],
});
```

**4. Layout** — `app/layout.tsx`

```tsx
import { AuthWrapper } from "naystack/auth";
import { ApolloWrapper } from "naystack/graphql/client";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthWrapper>
          <ApolloWrapper>{children}</ApolloWrapper>
        </AuthWrapper>
      </body>
    </html>
  );
}
```

From here, `useLogin()` / `useSignUp()` log users in, and `useAuthQuery()` /
`useAuthMutation()` call your schema as that user.

## Modules at a glance

| Import                      | Runs on | What's in it                                                                                                  |
| --------------------------- | ------- | ------------------------------------------------------------------------------------------------------------- |
| `naystack/auth`             | server  | `setupEmailAuth`, `setupGoogleAuth`, `AuthWrapper` (SSR), `getContext`, `checkAuthStatus`, `getRefreshToken`, `getTokenizedResponse` |
| `naystack/auth/client`      | client  | `AuthWrapper`, `useToken`, `useLogin`, `useSignUp`, `useLogout`, `getAccessToken`, `refreshAccessToken`      |
| `naystack/auth/token-store` | client  | The access token outside React — `getAccessToken`, `setAccessToken`, `refreshAccessToken`, `subscribeToAccessToken` |
| `naystack/graphql`          | server  | `setupGraphQL`, `resolver`, `field`, `QueryLibrary`, `FieldLibrary`, `GQLError`, `Injector`, `query`, type helpers |
| `naystack/graphql/client`   | client  | `ApolloWrapper`, `useAuthQuery`, `useAuthMutation`                                                            |
| `naystack/graphql/next`     | client  | `ApolloWrapper` on `@apollo/client-integration-nextjs`, for `useSuspenseQuery` streaming                      |
| `naystack/file`             | server  | `setupFileUpload`, `uploadFile`, `deleteFile`, `getUploadURL`, `getDownloadURL`                               |
| `naystack/file/client`      | client  | `useFileUpload`                                                                                               |
| `naystack/socials`          | server  | `setupSocialAuth`, `InstagramProvider`, `YouTubeProvider`, `createInstagramPost`, `createThreadsPost`, readers, webhooks |
| `naystack/socials/types`    | both    | `SocialPlatform`, `SocialProfile`, `SocialPost`, `SocialTokens`, `socialProfileURL` — no server code          |
| `naystack/utils/client`     | client  | `setupSEO`, `useVisibility`, `useBreakpoint`                                                                  |
| `naystack/env`              | both    | `getEnv`, `getEnvValue`, `EnvVariable`, `addEnv`                                                              |

---

## Authentication

### How sessions work

- **Access token** — a 24-hour JWT signed with `SIGNING_KEY`. Lives in memory on
  the client (never in storage) and goes out as `Authorization: Bearer …`.
- **Refresh token** — a 1-year JWT signed with `REFRESH_KEY`, set as an httpOnly,
  secure cookie named `refresh`. Only the server ever reads it.
- On page load `AuthWrapper` exchanges the cookie for a fresh access token. When
  a GraphQL call fails with an expired token, the client refreshes once and
  retries the call — you never handle it.
- Server Components and route handlers identify the user from either the bearer
  header or the cookie via `getContext(req)`.

### Email + password

`setupEmailAuth` returns the four route handlers. Passwords are hashed with
bcrypt on sign-up; you only store what `createUser` receives.

```ts
// app/api/email/route.ts
import { setupEmailAuth } from "naystack/auth";

export const { GET, POST, PUT, DELETE, OPTIONS } = setupEmailAuth({
  // Look up by whatever the client sent (email here). Used by login and by
  // sign-up's duplicate check. Return at least { id, password }.
  getUser: async ({ email }: { email: string }) => {
    const [user] = await db
      .select({ id: UserTable.id, password: UserTable.password })
      .from(UserTable)
      .where(eq(UserTable.email, email));
    return user;
  },
  // `password` is already hashed. Any extra fields the client sent are here too.
  createUser: async (data: { email: string; password: string; name: string }) => {
    const [user] = await db
      .insert(UserTable)
      .values(data)
      .returning({ id: UserTable.id, password: UserTable.password });
    return user;
  },

  // All optional:
  onSignUp: async (userId, body) => {},   // after a successful sign-up
  onLogin: async (userId, body) => {},    // after a successful login
  onRefresh: async (userId, body) => {},  // on every token refresh (GET)
  onLogout: async (userId, body) => {},   // on logout (DELETE)
  onError: ({ status, message }) =>       // customize error responses
    NextResponse.json({ error: message }, { status }),
  allowedOrigins: ["https://app.example.com"], // enable CORS for these origins
});
```

| Handler  | Method | What it does                                                                                    |
| -------- | ------ | ----------------------------------------------------------------------------------------------- |
| `GET`    | GET    | Exchange the refresh cookie for a new access token. Body is the token, or empty when logged out |
| `POST`   | POST   | Sign up. If the email exists **and** the password matches, logs in instead of failing           |
| `PUT`    | PUT    | Log in                                                                                          |
| `DELETE` | DELETE | Log out — clears the refresh cookie                                                             |
| `OPTIONS`| OPTIONS| Only returned when `allowedOrigins` is set; answers CORS preflights                             |

Every success response has the access token as its **plain-text body** and sets
the refresh cookie. Errors are plain-text messages with a 4xx status (`"A user
already exists"`, `"Invalid password"`, …) — the client hooks return them to you
as strings.

**Captcha.** Set `TURNSTILE_KEY` and sign-up/login will require a `captchaToken`
field in the body, verified against Cloudflare Turnstile.

**CORS.** `allowedOrigins` adds the CORS headers, rejects unlisted cross-origin
requests with 403, and marks the refresh cookie `SameSite=None` so a frontend on
another origin still receives it.

### Client: `AuthWrapper` and hooks

`AuthWrapper` holds the access token and gives the hooks below their context. It
comes in two flavours with the same props:

- `import { AuthWrapper } from "naystack/auth"` — a **Server Component**. The
  first token fetch runs during SSR with the cookie forwarded and streams in, so
  the client never renders logged-out and then flips. Use this in `app/layout.tsx`.
- `import { AuthWrapper } from "naystack/auth/client"` — the plain client
  provider. Use it inside a tree that is already `"use client"`.

Either way it must sit **above** `ApolloWrapper`.

```tsx
import { useToken, useLogin, useSignUp, useLogout } from "naystack/auth/client";

function Nav() {
  const token = useToken(); // string | null (logged out) | undefined (not loaded yet)
  return <Link href={token ? "/dashboard" : "/login"}>…</Link>;
}

function LoginForm() {
  const login = useLogin();
  const onSubmit = async (data: { email: string; password: string }) => {
    const error = await login(data); // null on success, message string on failure
    if (error) form.setError("password", { message: error });
    else router.replace("/dashboard");
  };
}

function SignUpForm() {
  const signUp = useSignUp();
  // Extra fields (name, orgTitle, …) are forwarded to `createUser` / `onSignUp`.
  const onSubmit = async (data: { name: string; email: string; password: string }) => {
    const error = await signUp(data);
    if (error) setMessage(error);
  };
}

function LogoutButton() {
  const logout = useLogout(); // clears the token immediately, then calls DELETE
  return <button onClick={() => { logout(); router.push("/login"); }}>Log out</button>;
}
```

**The token outside React.** The Apollo link, a custom `fetch` wrapper or a
WebSocket client can read the live token from `naystack/auth/token-store`:

```ts
import { getAccessToken, refreshAccessToken } from "naystack/auth/token-store";

const res = await fetch("/api/custom", {
  headers: { Authorization: `Bearer ${getAccessToken()}` },
});
if (res.status === 401) await refreshAccessToken(); // shared: N callers, one request
```

### Server helpers

```ts
import {
  getContext,
  getRefreshToken,
  checkAuthStatus,
  getTokenizedResponse,
} from "naystack/auth";

// Route handlers: who is calling? Reads the bearer header, else the cookie.
export const POST = async (req: NextRequest) => {
  const { userId, isRefreshID } = getContext(req);
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });
  // isRefreshID is true when identified by cookie rather than access token
};

// Server Components / layouts: gate a page.
export default async function ProtectedLayout({ children }) {
  await checkAuthStatus("/login"); // redirects when there is no refresh cookie
  return children;
}

// Or read the cookie yourself.
const refresh = await getRefreshToken(); // string | null

// Custom login flows (magic link, passkey, …) end the same way the built-ins do:
export const POST = async (req: NextRequest) => {
  const userId = await verifyMagicLink(await req.json());
  if (!userId) return new NextResponse("Invalid link", { status: 400 });
  return getTokenizedResponse(userId); // access token body + refresh cookie
};
```

### Google login

One GET handler starts the OAuth flow and handles the callback.

```ts
// app/api/google/route.ts
import { setupGoogleAuth } from "naystack/auth";

export const { GET } = setupGoogleAuth({
  // Map the Google profile to your user id. Return null to refuse.
  getUserIdFromEmail: async (googleUser, data) => {
    return findOrCreateUserByEmail(googleUser.email!, googleUser.name);
  },
  redirectURL: "/dashboard",
  errorRedirectURL: "/login", // defaults to redirectURL
});
```

Point users at `NEXT_PUBLIC_GOOGLE_AUTH_ENDPOINT` (e.g. `<a href="/api/google">`).
The entry point accepts optional query params: `?redirectURL=` and
`?errorRedirectURL=` override the configured ones for that request, and `?data=`
is an opaque string handed to `getUserIdFromEmail` as its second argument
(invite codes, referral ids). On success the refresh cookie is set and the
browser lands on `redirectURL`; `AuthWrapper` picks the session up from there.

Requires `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` and
`NEXT_PUBLIC_GOOGLE_AUTH_ENDPOINT` (the absolute callback URL registered in
Google Cloud).

> Linking an Instagram or YouTube account to a user who is already logged in is
> not login — see [Social APIs](#social-apis).

---

## GraphQL

Resolvers are plain functions wrapped in `resolver()` / `field()`. naystack turns
them into `type-graphql` classes, builds the schema, and serves it with Apollo
Server. Types for input and output are `type-graphql` classes you already write
(`@ObjectType`, `@InputType`).

### Queries and mutations

```ts
// app/api/graphql/User/resolvers/get-current-user.ts
import { resolver } from "naystack/graphql";

export default resolver(
  async (ctx) => {
    if (!ctx.userId) return null;
    const [user] = await db.select().from(UserTable).where(eq(UserTable.id, ctx.userId));
    return user ?? null;
  },
  {
    output: User,                       // @ObjectType class, or String / Number / Boolean
    outputOptions: { nullable: true },
  },
);
```

```ts
// app/api/graphql/Feedback/resolvers/submit-feedback.ts
export default resolver(
  async (ctx, input: SubmitFeedbackInput) => {
    await db.insert(FeedbackTable).values({ userId: ctx.userId, ...input });
    return true;
  },
  {
    output: Boolean,
    input: SubmitFeedbackInput,   // @InputType class → the `input` argument
    authorized: true,             // rejects anonymous calls; ctx.userId is typed non-null
    mutation: true,               // Mutation instead of Query
  },
);
```

`inputOptions: { nullable: true }` makes the argument optional. Inside the
resolver, `ctx` is `Context` — `{ userId: number | null, isRefreshID?: boolean }`
— or `AuthorizedContext` (`userId: number`) when `authorized: true`.

### Field resolvers

```ts
// app/api/graphql/Property/resolvers/seller-field.ts
import { field } from "naystack/graphql";

export default field(
  async (property: PropertyDB, ctx) => {
    if (!property.sellerId) return null;
    return db.query.contacts.findFirst({ where: eq(ContactTable.id, property.sellerId) });
  },
  { output: ContactGQL, outputOptions: { nullable: true } },
);
```

If the parent query already put a value on the row (`property.seller`), the
field resolver is skipped and that value is returned — cheap hydration without
N+1. Set `alwaysResolve: true` on a field that checks `ctx` (an access gate) so
the check can't be bypassed that way.

### Registering resolvers

```ts
// app/api/graphql/User/graphql.ts
import { QueryLibrary, FieldLibrary } from "naystack/graphql";

// Each key becomes the Query / Mutation field name.
export const UserResolvers = QueryLibrary({ getCurrentUser, onboardUser, updateUser });

// Each key becomes a field on the User type. <UserDB> is the parent row's type.
export const UserFieldResolvers = FieldLibrary<UserDB>(User, { organizations });
```

```ts
// app/api/graphql/route.ts
import { setupGraphQL } from "naystack/graphql";

export const { GET, POST, OPTIONS } = await setupGraphQL({
  resolvers: [UserResolvers, UserFieldResolvers, ChatResolvers],
  // Optional:
  allowedOrigins: ["https://app.example.com"], // CORS
  plugins: [],                                  // Apollo Server plugins
  authChecker: ({ context }) => !!context.userId, // the default
  getContext: (req) => ({ userId: … }),         // replace how users are identified
});
```

In development Apollo Sandbox is served on GET; in production (`NODE_ENV=production`)
introspection is off.

**Cookie vs token.** The built-in `getContext` accepts a bearer access token or
the refresh cookie. A request identified by **cookie only** can run `query`
operations but nothing else — `ctx.userId` is nulled for mutations — so a
CSRF'd form post can't write as the user. `useAuthQuery` sends the cookie; `useAuthMutation`
sends the bearer token.

### Errors

```ts
import { GQLError } from "naystack/graphql";

if (!input.email) throw GQLError(400);              // "Please provide all required inputs"
if (deal.ownerId !== ctx.userId) throw GQLError(403); // "You are not allowed to perform this action"
if (!deal) throw GQLError(404, "Deal not found");   // custom message
```

The status lands in `extensions.statusCode` on the client.

### Calling resolvers from Server Components

Every definition carries `.call(input)` and `.authCall(input)`. Both are wrapped
in React `cache()`, so calling the same resolver twice in one render costs one
query.

```ts
const planets = await getPlanets.call();      // as an anonymous caller
const user = await getCurrentUser.authCall(); // reads the refresh cookie
```

For an `authorized: true` resolver, both resolve to **`null` when there is no
session** instead of running the resolver with a null user — so the type is
`Result | null` and you handle the logged-out case where it shows up.

#### `Injector` — stream server data into a client component

```tsx
// app/(dashboard)/chat/page.tsx
import { Injector } from "naystack/graphql";
import { ChatWindow } from "./chat-window";

export default function ChatPage() {
  return (
    <Injector
      fetch={async () => ({
        user: await getCurrentUser.authCall(),
        chats: await getChats.authCall(),
      })}
      Component={ChatWindow}
      props={{ roomId: 1 }} // any extra props ChatWindow needs
    />
  );
}
```

`ChatWindow` renders immediately with `loading: true`, then again with `data`
once `fetch` resolves — Suspense underneath, no `useEffect` fetching. Pass
`isComponentDynamic` when `Component` comes from `next/dynamic`.

```tsx
"use client";
export function ChatWindow({ data, loading, roomId }: { data?: { user: …; chats: … }; loading: boolean; roomId: number }) {
  if (loading) return <Spinner />;
  return <ul>{data?.chats.map(…)}</ul>;
}
```

#### `query` — run a GraphQL document on the server

For code that already has typed documents (GraphQL Codegen) and wants Next.js
caching semantics:

```ts
import { query } from "naystack/graphql";

const data = await query(GetUserDocument, {
  variables: { id },
  revalidate: 60,      // ISR: cache for 60s
  tags: ["user"],      // revalidateTag("user") busts it
  noCookie: false,     // default: the request carries the user's cookies
});
```

### Client hooks

Wrap the app in `ApolloWrapper` (inside `AuthWrapper`). It builds one Apollo
client with the auth/refresh link chain and clears the cache on logout so the
next user can't see the previous one's data.

```tsx
import { ApolloWrapper } from "naystack/graphql/client";

<ApolloWrapper cacheConfig={{ typePolicies: … }}>{children}</ApolloWrapper>
```

If you use Apollo's App Router integration (`useSuspenseQuery`,
`useBackgroundQuery`), import the same component from `naystack/graphql/next`
instead — it is built on `ApolloNextAppProvider`.

```tsx
import { useAuthQuery, useAuthMutation } from "naystack/graphql/client";

// Auto-fires when `variables` is set, refires when it changes.
const [refetch, { data, loading, error }] = useAuthQuery(GET_ORG, { id: orgId });

// Without variables it's lazy — call it yourself.
const [getSummary, { loading }] = useAuthQuery(GET_SUMMARY);
const result = await getSummary({ type });

// Mutations: input goes out as `variables.input`.
const [createDeal, { loading, hasAuth }] = useAuthMutation(CREATE_DEAL);
const { data } = await createDeal({ propertyId, share: 10 });
```

Both take Apollo's hook options as the last argument. `useAuthQuery` defaults to
`fetchPolicy: "no-cache"` (always fresh); pass `{ fetchPolicy: "cache-first" }`
for reference data. Your operations should declare a single `$input` variable:

```graphql
mutation CreateDeal($input: CreateDealInput!) {
  createDeal(input: $input)
}
```

### Type helpers

```ts
import type { QueryResponseType, FieldResponseType } from "naystack/graphql";
import type getCurrentUser from "@/app/api/graphql/User/resolvers/get-current-user";

type CurrentUser = QueryResponseType<typeof getCurrentUser>; // what .call() resolves to
```

---

## File uploads

One authenticated `PUT` route that stores a multipart upload in S3 and tells you
where it went. Works with AWS S3 and anything S3-compatible (Cloudflare R2, MinIO)
via `S3_ENDPOINT`.

### Server

```ts
// app/api/file/route.ts
import { setupFileUpload } from "naystack/file";

export const { PUT } = setupFileUpload({
  // Required. Called once the object is stored. Whatever you return is sent
  // back to the client as `onUploadResponse`.
  onUpload: async ({ url, type, userId, data }) => {
    if (type === "avatar") {
      await db.update(UserTable).set({ avatar: url }).where(eq(UserTable.id, userId));
    }
    return { url };
  },

  // Optional. S3 object key — defaults to a UUID.
  getKey: async ({ type, userId }) => `${type}/${userId}/${crypto.randomUUID()}`,

  // Optional. Transform before storing — resize, re-encode, strip EXIF.
  // Only the returned bytes are written; the blob's `type` becomes Content-Type.
  processFile: async (file, { type }) =>
    type === "avatar" ? await resizeToWebp(file, 512) : file,

  // Optional. Per-upload S3 put fields.
  putOptions: ({ type }) => ({
    CacheControl: type === "avatar" ? "public, max-age=31536000, immutable" : undefined,
  }),
});
```

`type` is a free-form string the client sends (`"avatar"`, `"DealDocument"`),
and `data` is the optional JSON the client attached — it is `undefined` unless
the client sent one, so narrow it before reading.

The route requires a **bearer access token** (not the cookie), so uploads always
go through `useFileUpload` or a request that sets `Authorization` itself.

Server-side helpers, same env:

```ts
import { uploadFile, deleteFile, getUploadURL, getDownloadURL } from "naystack/file";

await uploadFile(["exports", `${id}.csv`], { blob });          // → public URL
await uploadFile("imports/remote.jpg", { url: "https://…" });   // fetch then store
await uploadFile(key, { blob, put: { ContentDisposition: "attachment" } });
await deleteFile(url);                                          // by its public URL
await getUploadURL(key);                                        // presigned PUT, 5 min
getDownloadURL(["avatars", "1.webp"]);                          // https://<NEXT_PUBLIC_S3_DOMAIN>/avatars/1.webp
```

### Client

```tsx
import { useFileUpload } from "naystack/file/client";

function AvatarPicker() {
  const upload = useFileUpload();

  const onChange = async (file: File) => {
    const result = await upload(file, "avatar", {
      data: { crop: "square" }, // optional, arrives as `data` on the server
      async: true,              // optional: respond before the S3 write finishes
    });
    console.log(result?.url, result?.onUploadResponse);
  };

  return <input type="file" onChange={(e) => e.target.files?.[0] && onChange(e.target.files[0])} />;
}
```

`upload` also accepts a React Native `{ uri, name, type }` descriptor, which RN
streams from disk.

---

## Social APIs

Connect a user's Instagram, Threads or YouTube account, keep reading it, and
publish to it. Three layers:

1. **`setupSocialAuth`** — one OAuth route for every platform. Hands you a
   normalized profile and tokens to store.
2. **Providers** (`InstagramProvider`, `YouTubeProvider`) — read a profile or
   recent posts from any stored token, through one `SocialProvider` interface.
   Write the sync job once.
3. **Per-platform publishing** — `createInstagramPost`, `createThreadsPost`,
   plus the messaging, comment and webhook helpers. Publishing stays
   per-platform on purpose: stories, reels, carousels, reply controls and
   text-only posts don't fit one honest signature.

| Platform  | Connect | Profile | Posts | Refresh tokens | Publish | Messaging / comments | Webhooks |
| --------- | :-----: | :-----: | :---: | :------------: | :-----: | :------------------: | :------: |
| Instagram |   ✓     |   ✓     |  ✓    |       ✓        |   ✓     |          ✓           |    ✓     |
| Threads   |         |         |  ✓    |                |   ✓     |                      |    ✓     |
| YouTube   |   ✓     |   ✓     |  ✓    |       ✓        |         |                      |          |

`SocialPlatform` also lists `TikTok` so `socialProfileURL` can link to a stored
handle; there is no TikTok provider yet.

### Import `SocialPlatform` from `naystack/socials/types`

The enums and row shapes — `SocialPlatform`, `SocialMediaKind`, `SocialProfile`,
`SocialPost`, `SocialTokens`, `socialProfileURL` — live in their own entry and
are **not** re-exported from `naystack/socials`. That entry has no server code,
so client bundles and GraphQL schema files can import it too.

```ts
import { InstagramProvider, setupSocialAuth } from "naystack/socials";
import { SocialPlatform } from "naystack/socials/types";
```

> Why: the build inlines shared modules into each entry. If the barrel re-exported
> the enum, code mixing both paths would hold two enum objects with equal values —
> fine for `===`, fatal for identity-keyed registries like type-graphql's
> (`"Cannot determine GraphQL input type"`). One path, one instance.

### Connecting accounts

Mount the handler on a dynamic segment; `/api/social/instagram`,
`/api/social/youtube`, … all resolve to it.

```ts
// app/api/social/[platform]/route.ts
import { InstagramProvider, YouTubeProvider, setupSocialAuth } from "naystack/socials";
import { SocialPlatform } from "naystack/socials/types";

export const { GET } = setupSocialAuth({
  providers: [InstagramProvider, YouTubeProvider],
  endpoint: "https://yourapp.com/api/social", // redirect URI is <endpoint>/<platform>
  redirectURL: "/settings/accounts",
  errorRedirectURL: "/settings/accounts",
  onConnect: async ({ platform, profile, tokens, userId }) => {
    if (!userId) return "You are not logged in"; // a string = show this error
    await upsertSocialAccount(userId, platform, profile, tokens);
  },
  // Optional per-platform scopes; each provider has a sensible default.
  scopes: { [SocialPlatform.Instagram]: ["instagram_business_basic", "instagram_business_content_publish"] },
});
```

To start a connection send the user to
`${NEXT_PUBLIC_SOCIAL_AUTH_ENDPOINT}/instagram?state=<access token>`. The state
is the logged-in user's access token; `onConnect` receives it decoded as
`userId`. Register `<endpoint>/instagram`, `<endpoint>/youtube`, … as redirect
URIs with each platform — they must match verbatim.

**Native apps** add `&returnTo=yourapp://accounts` to the entry point. It rides
along in the OAuth state and replaces `redirectURL` (or `errorRedirectURL`, with
`?error=` appended) at the end, so an in-app auth session gets its custom-scheme
callback. Failures during the callback always redirect with `?error=…`, never a
bare 500.

`onConnect` receives the same shapes for every platform:

```ts
type SocialProfile = {
  platform: SocialPlatform;
  platformUserId: string | null; // stable — key on this, not username
  username: string;
  displayName: string | null;
  avatar: string | null;         // usually a signed CDN URL; copy it
  followers: number | null;      // null = hidden by the platform, never 0
  contentCount: number;
  metadata: Record<string, unknown>;
};

type SocialTokens = {
  accessToken: string;
  refreshToken?: string; // Google-style platforms
  expiresAt?: Date;
  scopes?: string[];
};
```

### Reading through providers

A provider is a plain object — import it, no construction. Capabilities are
optional methods: `fetchMedia` is absent on a platform with no content API,
`auth.refresh` on one whose tokens don't expire. Narrow with `if`.

```ts
import { InstagramProvider, YouTubeProvider } from "naystack/socials";

const profile = await InstagramProvider.fetchProfile(accessToken);
// { platform: "Instagram", username, followers: 12043, contentCount: 87, … }

const posts = await YouTubeProvider.fetchMedia?.(accessToken, { limit: 12 });
// SocialPost[]: { kind: "Video", permalink, thumbnail, likes, comments, views, publishedAt, … }
// null  → the request failed (retry later)
// []    → the account has nothing (cache it)

InstagramProvider.profileURL(profile.username); // "https://instagram.com/…"
```

Every metric on a `SocialPost` is `number | null`; `null` always means *the
platform didn't say* — hidden, not requested, or nonexistent there — so an
average can skip it rather than count a fake zero.

A refresh job stays platform-agnostic:

```ts
const providers = [InstagramProvider, YouTubeProvider];

for (const account of expiringAccounts) {
  const provider = providers.find((p) => p.platform === account.platform);
  const next = await provider?.auth.refresh?.(account.tokens);
  if (next) await saveTokens(account.id, next);
  else if (next === null) await markDisconnected(account.id); // revoked
}
```

`refresh` returns `null` only when the grant is gone; a network or quota error
throws, so an outage is never recorded as a revocation.

### Instagram

**Publishing.** One call; what gets posted follows from the media:

| `media`                 | Result                        |
| ----------------------- | ----------------------------- |
| one photo               | feed image                    |
| one video               | reel                          |
| 2–10 items              | carousel (counts as one post) |
| any, with `story: true` | story, from the first item    |

```ts
import { createInstagramPost, MetaMediaType } from "naystack/socials";

// Feed image — JPEG only
await createInstagramPost(accessToken, {
  media: { url: "https://cdn.example.com/launch.jpg", type: MetaMediaType.Photo, altText: "Launch poster" },
  caption: "New campaign is live 🎉",
});

// Reel — 9:16, 5–90s
await createInstagramPost(accessToken, {
  media: { url: "https://cdn.example.com/promo.mp4", type: MetaMediaType.Video },
  caption: "Behind the scenes",
  shareToFeed: true,
  thumbOffset: 1500,        // ms into the video, or coverURL
  collaborators: ["acme"],  // up to 3
});

// Story — gone in 24h
await createInstagramPost(accessToken, {
  media: { url: "https://cdn.example.com/story.mp4", type: MetaMediaType.Video },
  story: true,
});

// Carousel
await createInstagramPost(accessToken, {
  caption: "Campaign recap",
  media: [
    { url: "https://cdn.example.com/1.jpg", type: MetaMediaType.Photo },
    { url: "https://cdn.example.com/2.mp4", type: MetaMediaType.Video },
  ],
});
```

Returns the published media id, or `null` if any step failed (the API's own
error is logged). Under the hood it creates the container, polls until Instagram
has processed it, retries transient container failures, then publishes — tune
with `wait: { intervalMS, timeoutMS }` and `retry: { attempts, backoffMS }`.
Media URLs must be publicly reachable; the token needs
`instagram_business_content_publish` and a professional account; Instagram
allows 100 posts per rolling 24 hours.

`canPublishToInstagram(token)` answers whether a token may publish without
posting anything — Meta has no scope-listing endpoint for Instagram Login
tokens, so it probes the publishing-quota endpoint, which needs the same scope.
It rejects (rather than returning `false`) if the request itself fails.

**Reading, messaging, comments:**

```ts
import {
  getInstagramUser,
  getInstagramMedia,
  getInstagramConversations,
  getInstagramConversation,
  getInstagramConversationByUser,
  sendInstagramMessage,
  replyToInstagramComment,
  setupInstagramWebhook,
} from "naystack/socials";

const user = await getInstagramUser(accessToken);           // { username, followers_count, media_count }
const media = await getInstagramMedia(accessToken, undefined, 10);

const convos = await getInstagramConversations(accessToken, 25);
const next = await convos.fetchMore?.();                     // cursor pagination

const thread = await getInstagramConversationByUser(accessToken, otherUserId);
await sendInstagramMessage(accessToken, otherUserId, "Hello!");
await replyToInstagramComment(accessToken, commentId, "Thanks!"); // needs manage_comments

// app/api/webhooks/instagram/route.ts
export const { GET, POST } = setupInstagramWebhook({
  secret: process.env.WEBHOOK_SECRET!, // the verify token from the Meta portal
  callback: async (type, value, entryId) => {
    if (type === "messaging") await handleDM(value);
  },
});
```

Every getter takes an optional `fields` array to request more than the default
columns, and a generic to type the result. Anything not wrapped is one call
away with the base URL and API version already pinned:

```ts
import { getInstagramData, readGraphID } from "naystack/socials";

const id = readGraphID(
  "Instagram comment reply",
  await getInstagramData<{ id: string }>(token, `${commentId}/replies`, {
    params: { message: "thanks!" }, method: "POST",
  }),
);
```

**OAuth primitives** — `getInstagramAuthorizationURL`, `getLongLivedInstagramToken`,
`refreshInstagramAccessToken` — are exported for flows `setupSocialAuth` doesn't
cover. They need `INSTAGRAM_CLIENT_ID` and `INSTAGRAM_CLIENT_SECRET`.

### Threads

No media → text post; one item → image or video; 2–20 → carousel.

```ts
import { createThreadsPost, createThread, getThreads, getThreadsReplies, setupThreadsWebhook, MetaMediaType } from "naystack/socials";

await createThreadsPost(accessToken, "Hello from naystack!");

await createThreadsPost(accessToken, {
  text: "Campaign is live",
  media: { url: "https://cdn.example.com/campaign.jpg", type: MetaMediaType.Photo },
  replyControl: "everyone", // | "accounts_you_follow" | "mentioned_only"
});

await createThreadsPost(accessToken, {
  text: "Read more", linkAttachment: "https://example.com/post", // text-only posts
});

// A thread: each post replies to the previous one. Returns the first id.
await createThread(accessToken, [
  "First post",
  "Second post",
  { text: "Third, with a picture", media: { url: "https://cdn.example.com/3.jpg", type: MetaMediaType.Photo } },
]);

const posts = await getThreads(accessToken);            // [{ text, permalink, username }]
const replies = await getThreadsReplies(accessToken, postId);

// app/api/webhooks/threads/route.ts
export const { GET, POST } = setupThreadsWebhook({
  secret: process.env.WEBHOOK_SECRET!,
  callback: async (field, value) => true, // false → respond 500 so Meta retries
});
```

`getThreadsData` is the raw-call escape hatch, like `getInstagramData`.

### YouTube

Connect via `setupSocialAuth` with `YouTubeProvider` (Google OAuth with
`access_type=offline` + `prompt=consent`, so a refresh token is always issued).
Reads need only a bearer token:

```ts
import { YouTubeProvider, getYouTubeChannel, getYouTubeUploads, refreshYouTubeToken } from "naystack/socials";

const profile = await YouTubeProvider.fetchProfile(accessToken);
// followers is null when the channel hides its subscriber count

const channel = await getYouTubeChannel(accessToken);        // raw youtube_v3.Schema$Channel, null if none
const playlist = channel?.contentDetails?.relatedPlaylists?.uploads;
if (playlist) await getYouTubeUploads(accessToken, playlist, 50); // includes private/unlisted for the owner

const fresh = await refreshYouTubeToken(refreshToken);        // null = revoked
```

`fetchMedia` returns only public videos, newest first. Credentials come from
`YOUTUBE_CLIENT_ID` / `YOUTUBE_CLIENT_SECRET`, falling back to the Google login
ones so a single Google Cloud client can serve both.

### Waiting and retrying

The poll/retry helpers behind publishing are exported for any API that hands
back a job id:

```ts
import { pollUntilReady, withRetry } from "naystack/socials";

const state = await pollUntilReady(() => readJob(id), (s) => s.status === "PENDING", { intervalMS: 2000 });
const result = await withRetry(() => tryCreate(), { attempts: 3, backoffMS: 1000 });
```

---

## Client utilities

`naystack/utils/client`:

```ts
// lib/seo.ts
import { setupSEO } from "naystack/utils/client";

export const getSEO = setupSEO({
  title: "Acme — Ship faster",
  description: "The Acme platform.",
  siteName: "Acme",
  themeColor: "#5b9364",
});

// app/dashboard/page.tsx
export const metadata = getSEO("Dashboard", "Your personalized dashboard");
// title "Dashboard • Acme", Open Graph + Twitter cards, Apple web-app tags

// With an image; { imageSize: "small" } for avatars/icons so chat apps render a thumbnail card
export async function generateMetadata({ params }) {
  const post = await getPost(params.id);
  return getSEO(post.title, post.excerpt, post.author.avatar, { imageSize: "small" });
}
```

```tsx
import { useVisibility, useBreakpoint } from "naystack/utils/client";

const ref = useVisibility(() => loadMore());        // IntersectionObserver, 100px margin
<section ref={ref} />;

const isMobile = useBreakpoint("(max-width: 639px)"); // true | false | null during SSR
```

---

## Environment variables

Set only what the modules you use need. Public ones are read on the client too.

| Variable                              | Needed by            | Notes                                                                 |
| ------------------------------------- | -------------------- | --------------------------------------------------------------------- |
| `SIGNING_KEY`                         | auth, graphql, file  | Signs access tokens                                                   |
| `REFRESH_KEY`                         | auth, graphql        | Signs refresh tokens                                                  |
| `NEXT_PUBLIC_EMAIL_AUTH_ENDPOINT`     | auth                 | `/api/email` — where `setupEmailAuth` is mounted                      |
| `NEXT_PUBLIC_GRAPHQL_ENDPOINT`        | graphql              | `/api/graphql`                                                        |
| `NEXT_PUBLIC_FILE_ENDPOINT`           | file                 | `/api/file`                                                           |
| `NEXT_PUBLIC_BASE_URL`                | utils/client         | `https://yourapp.com` — used by `setupSEO`                            |
| `TURNSTILE_KEY`                       | auth (optional)      | Cloudflare Turnstile secret; turns captcha on for sign-up/login       |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | auth (Google)  | From Google Cloud Console                                             |
| `NEXT_PUBLIC_GOOGLE_AUTH_ENDPOINT`    | auth (Google)        | Absolute callback URL, registered in Google Cloud                     |
| `NEXT_PUBLIC_SOCIAL_AUTH_ENDPOINT`    | socials              | `/api/social` — base of the `setupSocialAuth` route                   |
| `INSTAGRAM_CLIENT_ID` / `INSTAGRAM_CLIENT_SECRET` | socials  | From the Meta developer portal. Server-only                           |
| `YOUTUBE_CLIENT_ID` / `YOUTUBE_CLIENT_SECRET` | socials      | Optional — fall back to the `GOOGLE_*` pair                           |
| `S3_REGION`, `S3_BUCKET`              | file                 |                                                                       |
| `S3_ACCESS_KEY_ID` / `S3_ACCESS_KEY_SECRET` | file           |                                                                       |
| `NEXT_PUBLIC_S3_DOMAIN`               | file                 | Host that serves the bucket — `bucket.s3.amazonaws.com` or your CDN   |
| `S3_ENDPOINT`                         | file (optional)      | Custom endpoint for R2, MinIO and other S3-compatible stores          |
| `NODE_ENV`                            | graphql              | `production` disables introspection and the sandbox                   |

Read them in your own code the same way naystack does:

```ts
import { getEnv, getEnvValue, EnvVariable } from "naystack/env";

getEnv(EnvVariable.SIGNING_KEY);            // throws if unset
getEnv(EnvVariable.TURNSTILE_KEY, true);    // string | undefined
getEnvValue(EnvVariable.S3_REGION);         // never throws
```

## React Native / Expo

The auth, GraphQL and file client entries have no DOM dependencies, and the
server side handles the mobile cases: `allowedOrigins` for CORS, `returnTo` for custom-scheme OAuth
callbacks, and `useFileUpload` accepting a `{ uri, name, type }` file. Without a
`NEXT_PUBLIC_*` build step, set the endpoints at startup:

```ts
import { addEnv } from "naystack/env";

addEnv("EMAIL_AUTH_ENDPOINT", "https://yourapp.com/api/email");
addEnv("GRAPHQL_ENDPOINT", "https://yourapp.com/api/graphql");
addEnv("FILE_ENDPOINT", "https://yourapp.com/api/file");
```

## Requirements

- Next.js 13+ with the App Router (route handlers, `next/headers`)
- React 18 or 19
- Node.js 18+ (uses the global `fetch` and `FormData`)
- `type-graphql` needs `experimentalDecorators` and `emitDecoratorMetadata` in
  your `tsconfig.json`, and `import "reflect-metadata"` at the top of the
  GraphQL route file, before your `@ObjectType` classes are imported

## License

ISC © [Abhinay Pandey](https://github.com/abhinaypandey02)

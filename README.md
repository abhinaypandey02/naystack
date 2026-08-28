# Naystack

A minimal, powerful stack for Next.js app development. Provides end-to-end **Auth + GraphQL + File Upload + Other utilities**. With bring-your-own database.

[![npm version](https://img.shields.io/npm/v/naystack.svg)](https://www.npmjs.com/package/naystack)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](https://opensource.org/licenses/ISC)

**[API Reference](https://abhinaypandey02.github.io/naystack/)**

## Installation

```bash
pnpm add naystack
```

---

## 1. Authentication

Naystack provides a seamless email-based authentication system with optional support for Google and Instagram OAuth.

### Server Setup

Define your auth routes in `app/api/(auth)/email/route.ts`. The library reads `SIGNING_KEY` and `REFRESH_KEY` from environment variables automatically.

```typescript
import { setupEmailAuth } from "naystack/auth";
import { db } from "@/app/api/lib/db";
import { UserTable } from "@/app/api/(graphql)/User/db";
import { eq } from "drizzle-orm";

export const { GET, POST, PUT, DELETE } = setupEmailAuth({
  // Fetch user by request data (used for login & sign-up duplicate check)
  getUser: async ({ email }: { email: string }) => {
    const [user] = await db
      .select({ id: UserTable.id, password: UserTable.password })
      .from(UserTable)
      .where(eq(UserTable.email, email));
    return user;
  },
  // Create a new user with the hashed password
  createUser: async (data: {
    email: string;
    password: string;
    name: string;
  }) => {
    const [user] = await db
      .insert(UserTable)
      .values(data)
      .returning({ id: UserTable.id, password: UserTable.password });
    return user;
  },
  // Optional: callback after successful sign-up
  onSignUp: async (userId, body: { orgTitle?: string }) => {
    if (body.orgTitle && userId) {
      await createOrg(userId, { title: body.orgTitle });
    }
  },
});
```

The returned route handlers map to:

| Handler  | HTTP Method | Purpose                                   |
| -------- | ----------- | ----------------------------------------- |
| `GET`    | GET         | Refresh tokens (exchange refresh cookie)  |
| `POST`   | POST        | Sign up (create user, return tokens)      |
| `PUT`    | PUT         | Login (verify credentials, return tokens) |
| `DELETE` | DELETE      | Logout (clear refresh cookie)             |

### Client Setup

Wrap your application with `AuthWrapper` in your root layout. This fetches the access token on mount and provides it to all auth hooks via React context.

```tsx
// app/layout.tsx
import { AuthWrapper } from "naystack/auth/client";
import { ApolloWrapper } from "naystack/graphql/client";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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

### Frontend Hooks

#### `useToken()`

Returns the current JWT access token (or `null` if not loaded / logged out). Use it for conditional rendering or passing to custom fetch calls.

```tsx
import { useToken } from "naystack/auth/client";

export default function Home() {
  const token = useToken();

  return (
    <Link href={token ? "/dashboard" : "/signup"}>
      <button>{token ? "Dashboard" : "Get Started"}</button>
    </Link>
  );
}
```

#### `useSignUp()`

Returns a function that registers a new user. Sends a POST to the auth endpoint. Returns `null` on success, or the error message string on failure.

```tsx
import { useSignUp } from "naystack/auth/client";

function SignUpForm() {
  const signUp = useSignUp();

  const handleSubmit = async (data: {
    name: string;
    email: string;
    password: string;
  }) => {
    const error = await signUp(data);
    if (error) {
      setMessage(error);
    } else {
      router.replace("/dashboard");
    }
  };
}
```

#### `useLogin()`

Returns a function that logs the user in. Sends a PUT to the auth endpoint. Returns `null` on success, or the error message string on failure.

```tsx
import { useLogin } from "naystack/auth/client";

function LoginForm() {
  const login = useLogin();

  const handleSubmit = async (data: { email: string; password: string }) => {
    const error = await login(data);
    if (error) {
      form.setError("password", { message: error });
    } else {
      router.replace("/dashboard");
    }
  };
}
```

#### `useLogout()`

Returns a function that logs the user out. Clears the token immediately and sends DELETE to the auth endpoint.

```tsx
import { useLogout } from "naystack/auth/client";

function LogoutButton() {
  const logout = useLogout();

  return (
    <button
      onClick={() => {
        logout();
        router.push("/login");
      }}
    >
      Log out
    </button>
  );
}
```

### Server-side Auth Helpers

#### `getContext(req)`

Extracts the auth context from a `NextRequest`. Reads either the `Authorization: Bearer <token>` header or the refresh cookie. Use it in API routes outside of GraphQL.

```typescript
import { getContext } from "naystack/auth";

export const POST = async (req: NextRequest) => {
  const ctx = getContext(req);
  if (!ctx?.userId) return new NextResponse("Unauthorized", { status: 401 });

  // ctx.userId is available for authenticated operations
  const chats = await db
    .select()
    .from(ChatTable)
    .where(eq(ChatTable.userId, ctx.userId));
  return NextResponse.json(chats);
};
```

#### `getRefreshToken()`

Server-side function to read the refresh token from cookies. Useful in Server Components and layouts to check if the user is logged in.

```typescript
import { getRefreshToken } from "naystack/auth";
import { redirect } from "next/navigation";

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const token = await getRefreshToken();
  if (!token) return redirect("/login");
  return <div>{children}</div>;
}
```

#### `checkAuthStatus(redirectURL?)`

Checks if the current request has a valid refresh cookie. Optionally redirects to the given URL if not authorized.

```typescript
import { checkAuthStatus } from "naystack/auth";

// In a Server Component:
await checkAuthStatus("/login"); // Redirects to /login if not authorized
```

### Google OAuth

```typescript
import { setupGoogleAuth } from "naystack/auth";

export const { GET } = setupGoogleAuth({
  getUserIdFromEmail: async (googleUser) => {
    // Find or create user by Google email
    return findOrCreateUserByEmail(googleUser.email!);
  },
  redirectURL: "/dashboard",
  errorRedirectURL: "/login",
});
```

### Instagram OAuth

```typescript
import { setupInstagramAuth } from "naystack/auth";

export const { GET } = setupInstagramAuth({
  onUser: async (igUser, appUserId, accessToken) => {
    await saveInstagramUser(appUserId, igUser, accessToken);
  },
  redirectURL: "/dashboard",
  errorRedirectURL: "/login",
  // Default: ["instagram_business_basic"]. Publishing needs the extra scope.
  scopes: ["instagram_business_basic", "instagram_business_content_publish"],
});
```

Scopes apply to users who authorize afterwards — already-stored tokens keep the
permissions they were granted, so widening `scopes` means existing users must reconnect.

#### `getRefreshedInstagramAccessToken(token)`

Refreshes a long-lived Instagram access token. Exported separately from `naystack/auth`.

```typescript
import { getRefreshedInstagramAccessToken } from "naystack/auth";

const newToken = await getRefreshedInstagramAccessToken(existingToken);
```

---

## 2. GraphQL

Naystack provides a type-safe GraphQL layer built on `type-graphql` and `Apollo Server`. Define resolvers as plain functions and let the library generate the schema.

### Defining Queries and Mutations

Use `resolver()` to define a resolver. It returns an object with the resolver function, plus `.call()` and `.authCall()` for direct server-side invocation (e.g. in Server Components).

```typescript
// app/api/(graphql)/User/resolvers/get-current-user.ts
import { resolver } from "naystack/graphql";

export default resolver(
  async (ctx) => {
    if (!ctx.userId) return null;
    const [user] = await db
      .select()
      .from(UserTable)
      .where(eq(UserTable.id, ctx.userId));
    return user || null;
  },
  {
    output: User, // GraphQL return type (type-graphql class)
    outputOptions: { nullable: true }, // Return type is nullable
  },
);
```

**With input and authorization:**

```typescript
// app/api/(graphql)/Feedback/resolvers/submit-feedback.ts
import { resolver } from "naystack/graphql";

export default resolver(
  async (ctx, input: SubmitFeedbackInput) => {
    await db.insert(FeedbackTable).values({
      userId: ctx.userId, // guaranteed non-null when authorized: true
      score: input.score,
      text: input.text,
    });
    return true;
  },
  {
    output: Boolean,
    input: SubmitFeedbackInput, // GraphQL input type (type-graphql @InputType class)
    authorized: true, // Requires authenticated user (ctx.userId non-null)
    mutation: true, // Registers as a Mutation (default is Query)
  },
);
```

### Defining Field Resolvers

Use `field()` to define resolvers for computed fields on a parent type. The first argument is the parent object.

```typescript
// app/api/(graphql)/Property/resolvers/seller-field.ts
import { field } from "naystack/graphql";

export default field(
  async (property: PropertyDB) => {
    if (!property.sellerId) return null;
    const [seller] = await db
      .select()
      .from(ContactTable)
      .where(eq(ContactTable.id, property.sellerId));
    return seller || null;
  },
  {
    output: ContactGQL,
    outputOptions: { nullable: true },
  },
);
```

### Registering Resolvers

Use `QueryLibrary()` for queries/mutations and `FieldLibrary()` for field resolvers. Pass the returned classes to `setupGraphQL`.

```typescript
// app/api/(graphql)/User/graphql.ts
import { QueryLibrary, FieldLibrary } from "naystack/graphql";
import getCurrentUser from "./resolvers/get-current-user";
import onboardUser from "./resolvers/onboard-user";
import updateUser from "./resolvers/update-user";
import organizations from "./resolvers/organizations-field";
import { User } from "./types";

// Each key becomes a Query or Mutation field name in the schema
export const UserResolvers = QueryLibrary({
  getCurrentUser,
  onboardUser,
  updateUser,
});

// Each key becomes a field resolver on the User type
export const UserFieldResolvers = FieldLibrary<UserDB>(User, {
  organizations,
});
```

### Initializing the GraphQL Server

```typescript
// app/api/(graphql)/route.ts
import { setupGraphQL } from "naystack/graphql";
import { UserResolvers, UserFieldResolvers } from "./User/graphql";
import { ChatResolvers } from "./Chat/graphql";
import { FeedbackResolvers } from "./Feedback/graphql";

export const { GET, POST } = await setupGraphQL({
  resolvers: [
    UserResolvers,
    UserFieldResolvers,
    ChatResolvers,
    FeedbackResolvers,
  ],
});
```

The `getContext` function is built in — it reads the `Authorization` header or refresh cookie automatically. Pass a custom `getContext` if you need to override it.

### Throwing Errors

Use `GQLError()` to throw structured GraphQL errors from resolvers:

```typescript
import { GQLError } from "naystack/graphql";

// In a resolver:
if (!input.email) throw GQLError(400); // "Please provide all required inputs"
if (!ctx.userId) throw GQLError(403); // "You are not allowed to perform this action"
if (!deal) throw GQLError(404, "Deal not found"); // Custom message
```

### Type Helpers: `QueryResponseType` / `FieldResponseType`

Infer the return type of a query or field resolver definition. Use them to type component props that receive resolver results.

```typescript
import type { QueryResponseType, FieldResponseType } from "naystack/graphql";
import type getCurrentUser from "@/app/api/(graphql)/User/resolvers/get-current-user";
import type getDeal from "@/app/api/(graphql)/Deal/queries/get-deal";
import type sellerField from "@/app/api/(graphql)/Property/resolvers/seller-field";

interface DealDetailsProps {
  user: QueryResponseType<typeof getCurrentUser>;
  deal: QueryResponseType<typeof getDeal>;
  seller: FieldResponseType<typeof sellerField>;
}
```

### Server-Side Data Fetching

#### Direct calls with `.call()` / `.authCall()`

Every query definition has `.call()` (unauthenticated or based on `authorized` flag) and `.authCall()` (always reads the refresh cookie for auth). Use these in Server Components.

```typescript
// In a Server Component:
const user = await getCurrentUser.authCall();
const planets = await getPlanets.authCall();
```

#### `Injector` Component

Wraps a client component and injects server-fetched data via Suspense. The component receives `{ data, loading }` as props.

```tsx
// app/(dashboard)/chat/page.tsx
import { Injector } from "naystack/graphql/server";
import getCurrentUser from "@/app/api/(graphql)/User/resolvers/get-current-user";
import getChats from "@/app/api/(graphql)/Chat/resolvers/get-chats";
import { ChatWindow } from "./components/chat-window";

export default async function ChatPage() {
  return (
    <Injector
      fetch={async () => {
        const user = await getCurrentUser.authCall();
        const chats = await getChats.authCall();
        return { user, chats };
      }}
      Component={ChatWindow}
    />
  );
}
```

The `ChatWindow` component receives `{ data, loading }`:

```tsx
// components/chat-window.tsx
export function ChatWindow({ data, loading }: { data?: { user: ...; chats: ... }; loading: boolean }) {
  if (loading) return <Spinner />;
  return <div>{data?.user.name}'s chats: {data?.chats.length}</div>;
}
```

#### Server-side `query()` (from `naystack/graphql/server`)

Run a raw GraphQL query on the server using the registered Apollo client. Cookies are sent automatically.

```typescript
import { query } from "naystack/graphql/server";

const data = await query(GetUserDocument, {
  variables: { id: userId },
  revalidate: 60, // Cache for 60s (Next.js ISR)
  tags: ["user"], // For on-demand revalidation
});
```

### Client Setup (Apollo)

Wrap your app with `ApolloWrapper` (inside `AuthWrapper`) so client components can use GraphQL hooks:

```tsx
// app/layout.tsx
import { AuthWrapper } from "naystack/auth/client";
import { ApolloWrapper } from "naystack/graphql/client";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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

### Client Hooks

#### `useAuthQuery(query, variables?)`

Hook to run a GraphQL query with the current user's token. Returns `[refetch, { data, loading, error }]`.

```tsx
import { useAuthQuery } from "naystack/graphql/client";
import { GET_SUMMARY } from "@/constants/graphql/queries";

function SummaryCard({ type }: { type: string }) {
  const [getSummary, { loading, data }] = useAuthQuery(GET_SUMMARY);

  const handleFetch = async () => {
    const result = await getSummary({ type });
    if (result.data?.getSummary) {
      setSummary(result.data.getSummary);
    }
  };

  return (
    <button onClick={handleFetch} disabled={loading}>
      Get Summary
    </button>
  );
}
```

#### `useAuthMutation(mutation, options?)`

Hook to run a GraphQL mutation with the current user's token. Returns `[mutate, { data, loading, error }]`.

```tsx
import { useAuthMutation } from "naystack/graphql/client";
import { CREATE_DEAL } from "@/lib/gql/mutations";

function CreateDealModal({ propertyId }: { propertyId: number }) {
  const [createDeal, { loading }] = useAuthMutation(CREATE_DEAL);

  const onSubmit = async (values: FormFields) => {
    const response = await createDeal({
      propertyId,
      share: Number(values.share),
      targetProfit: Number(values.targetProfit),
    });
    const dealId = response.data?.createDeal;
    if (dealId) router.push(`/deals/${dealId}`);
  };

  return <form onSubmit={handleSubmit(onSubmit)}>...</form>;
}
```

---

## 3. File Upload

Naystack simplifies AWS S3 file uploads with presigned URLs and client-side helpers. AWS credentials are read from environment variables automatically.

### Server Setup

```typescript
// app/api/(rest)/file/route.ts
import { setupFileUpload } from "naystack/file";

export const { PUT } = setupFileUpload({
  // Called after each successful upload. Return value is sent in the response as `onUploadResponse`.
  onUpload: async ({ url, type, userId, data }) => {
    if (type === "DealDocument" && url) {
      const payload = data as {
        dealId: number;
        fileName: string;
        category: string;
      };
      const [row] = await db
        .insert(DealDocumentsTable)
        .values({
          dealId: payload.dealId,
          fileURL: url,
          fileName: payload.fileName,
          category: payload.category,
        })
        .returning();
      return row ?? {};
    }
    return {};
  },
  // Optional: customize the S3 key (defaults to UUID)
  getKey: async ({ type, userId }) =>
    `${type}/${userId}/${crypto.randomUUID()}`,
});
```

The `setupFileUpload` also returns server-side helpers:

- **`uploadFile(keys, { url?, blob? })`** — Upload a file from a URL or Blob to S3.
- **`deleteFile(url)`** — Delete a file by its full S3 URL.
- **`getUploadURL(keys)`** — Get a presigned PUT URL.
- **`getDownloadURL(keys)`** — Get the public download URL.

### Client Usage

```tsx
import { useFileUpload } from "naystack/file/client";

function FileUploader({ dealId }: { dealId: number }) {
  const uploadFile = useFileUpload();
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const result = await uploadFile(file, "DealDocument", {
        data: { dealId, fileName: file.name, category: "Contract" },
      });
      if (result?.url) {
        console.log("Uploaded:", result.url);
        router.refresh();
      }
    } finally {
      setUploading(false);
    }
  };

  return (
    <input
      type="file"
      onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])}
    />
  );
}
```

---

## 4. Client Utilities

### SEO

The `setupSEO` utility creates a metadata factory for Next.js. Call it once with your site defaults, then use the returned function per-page.

```typescript
// lib/utils/seo.ts
import { setupSEO } from "naystack/client";

export const getSEO = setupSEO({
  title: "My App - Tagline",
  description: "Description of my application.",
  siteName: "My App",
  themeColor: "#5b9364",
});

// In a page:
export const metadata = getSEO("Dashboard", "Your personalized dashboard");
// Produces: title = "Dashboard • My App", description = "Your personalized dashboard"
```

### `useVisibility(onVisible?)`

Triggers a callback when a DOM element enters the viewport. Returns a ref to attach to the observed element.

```tsx
import { useVisibility } from "naystack/client";

function LazySection() {
  const ref = useVisibility(() => loadMoreData());
  return <section ref={ref}>...</section>;
}
```

### `useBreakpoint(query)`

Responsive media query hook. Returns `true`/`false` or `null` during SSR.

```tsx
import { useBreakpoint } from "naystack/client";

function ResponsiveNav() {
  const isMobile = useBreakpoint("(max-width: 639px)");
  if (isMobile === null) return <Skeleton />;
  return isMobile ? <MobileNav /> : <DesktopNav />;
}
```

---

## 5. Social APIs

Publish to and read from Instagram and Threads.

Each platform exposes **one publishing method** that picks the right media type from
what you pass. Meta's container/upload/publish dance underneath is an implementation
detail — you never touch it.

| Path                                     | What it is                                                                                                            |
| ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `socials/meta/`                          | Meta's Graph protocol — request client, container polling, webhook verification. Shared by Instagram and Threads only |
| `socials/instagram/`, `socials/threads/` | One folder per platform: getters, setters, types                                                                      |

A platform that isn't on Meta's Graph API (X, LinkedIn) brings its own client and
exposes its own `create<Platform>Post`; it doesn't touch `socials/meta/`.

### Instagram

`createInstagramPost(token, input)` — feed image, reel, story or carousel:

| `media`                 | Result                        |
| ----------------------- | ----------------------------- |
| one image               | feed image                    |
| one video               | reel                          |
| 2–10 items              | carousel (counts as one post) |
| any, with `story: true` | story, from the first item    |

```typescript
import { createInstagramPost } from "naystack/socials";

// Feed image — JPEG only
await createInstagramPost(accessToken, {
  media: { url: "https://cdn.example.com/launch.jpg", type: "image" },
  caption: "New campaign is live 🎉",
});

// Reel — 9:16, 5–90s, H.264/HEVC to reach the Reels tab
await createInstagramPost(accessToken, {
  media: { url: "https://cdn.example.com/promo.mp4", type: "video" },
  caption: "Behind the scenes",
  shareToFeed: true,
  thumbOffset: 1500, // or coverURL
});

// Story — gone in 24h
await createInstagramPost(accessToken, {
  media: { url: "https://cdn.example.com/story.mp4", type: "video" },
  story: true,
});

// Carousel
await createInstagramPost(accessToken, {
  caption: "Campaign recap",
  media: [
    { url: "https://cdn.example.com/1.jpg", type: "image" },
    { url: "https://cdn.example.com/2.mp4", type: "video" },
  ],
});
```

`canPublishToInstagram(token)` answers whether a token is allowed to publish. Meta
exposes no scope-listing endpoint for Instagram Login tokens, so it probes the
publishing quota — a read-only endpoint needing exactly the same
`instagram_business_content_publish` scope. Nothing is posted:

```typescript
import { canPublishToInstagram } from "naystack/socials";

if (!(await canPublishToInstagram(process.env.INSTAGRAM_ACCESS_TOKEN!))) {
  throw new Error(
    "Instagram token cannot publish — reconnect with the publish scope",
  );
}
```

It rejects rather than answering `false` if the request itself fails, so a network blip
is never reported as a missing permission. For a one-off manual check, Meta's
[Access Token Debugger](https://developers.facebook.com/tools/debug/accesstoken/) shows
a token's scopes in the browser.

`createInstagramPost` returns the published media id, or `null` if any step failed — the
API's own error is logged. Media URLs must be publicly reachable (Instagram downloads them server-side)
and images must be JPEG. Publishing needs a token with the
`instagram_business_content_publish` scope and an Instagram professional account;
Instagram allows 100 published posts per rolling 24 hours. Tune container polling with
`wait: { intervalMS, timeoutMS }`.

Reading and messaging:

```typescript
import {
  getInstagramUser,
  getInstagramMedia,
  getInstagramConversations,
  getInstagramConversation,
  getInstagramConversationByUser,
  getInstagramConversationsByUser,
  getInstagramMessage,
  sendInstagramMessage,
  setupInstagramWebhook,
} from "naystack/socials";

// Fetch the authenticated user's profile
const user = await getInstagramUser(accessToken);
// => { username: "johndoe", followers_count: 1234, media_count: 56 }

// Fetch recent media
const media = await getInstagramMedia(accessToken, undefined, 10);
// => { data: [{ like_count: 5, comments_count: 2, permalink: "..." }, ...] }

// Fetch conversations with pagination
const convos = await getInstagramConversations(accessToken, 25);
for (const convo of convos.data ?? []) {
  console.log(convo.participants, convo.messages);
}
if (convos.fetchMore) {
  const nextPage = await convos.fetchMore();
}

// Fetch conversations filtered by a specific user
const userConvos = await getInstagramConversationsByUser(accessToken, userId);

// Fetch the single conversation with a specific user (2-participant thread)
const convo = await getInstagramConversationByUser(accessToken, userId);

// Send a message
await sendInstagramMessage(accessToken, recipientId, "Hello!");

// Webhook setup (app/api/webhooks/instagram/route.ts)
export const { GET, POST } = setupInstagramWebhook({
  secret: process.env.WEBHOOK_SECRET!,
  callback: async (type, value, id) => {
    console.log("Webhook event:", type, value, id);
  },
});
```

### Threads

`createThreadsPost(token, input)` — no media is a text post, one item is a single
image or video, 2–20 is a carousel:

```typescript
import {
  getThread,
  getThreads,
  getThreadsReplies,
  createThreadsPost,
  createThread,
  setupThreadsWebhook,
} from "naystack/socials";

// Text post — a bare string works
await createThreadsPost(accessToken, "Hello from Naystack!");

// Media, replies, reply controls
await createThreadsPost(accessToken, {
  text: "Campaign is live",
  media: { url: "https://cdn.example.com/campaign.jpg", type: "image" },
  replyControl: "everyone",
});

// Carousel
await createThreadsPost(accessToken, {
  text: "Campaign recap",
  media: [
    { url: "https://cdn.example.com/1.jpg", type: "image" },
    { url: "https://cdn.example.com/2.mp4", type: "video" },
  ],
});

// A thread — each post replies to the previous one
const firstPostId = await createThread(accessToken, [
  "First post in thread",
  "Second post (reply to first)",
  {
    text: "Third, with a picture",
    media: { url: "https://cdn.example.com/3.jpg", type: "image" },
  },
]);

// Fetch user's threads
const threads = await getThreads(accessToken);
// => [{ text: "Hello world", permalink: "...", username: "johndoe" }]

// Webhook setup (app/api/webhooks/threads/route.ts)
export const { GET, POST } = setupThreadsWebhook({
  secret: process.env.WEBHOOK_SECRET!,
  callback: async (field, value) => {
    console.log("Threads event:", field, value);
    return true; // Return false to respond with 500
  },
});
```

---

## Environment Variables

Naystack reads configuration from environment variables. Set the ones you need based on which modules you use.

### Required (Core Auth)

```bash
SIGNING_KEY=your-jwt-signing-key
REFRESH_KEY=your-jwt-refresh-key
```

### Required (Client-side endpoints)

```bash
NEXT_PUBLIC_EMAIL_AUTH_ENDPOINT=/api/email
NEXT_PUBLIC_GRAPHQL_ENDPOINT=/api/graphql
NEXT_PUBLIC_FILE_ENDPOINT=/api/file
NEXT_PUBLIC_BASE_URL=https://yourapp.com
```

### Google OAuth

```bash
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
NEXT_PUBLIC_GOOGLE_AUTH_ENDPOINT=/api/google
```

### Instagram OAuth

```bash
NEXT_PUBLIC_INSTAGRAM_CLIENT_ID=your-instagram-client-id
INSTAGRAM_CLIENT_SECRET=your-instagram-client-secret
NEXT_PUBLIC_INSTAGRAM_AUTH_ENDPOINT=/api/instagram
```

### AWS S3 (File Upload)

```bash
S3_REGION=us-east-1
S3_BUCKET=your-bucket-name
S3_ACCESS_KEY_ID=your-access-key-id
S3_ACCESS_KEY_SECRET=your-secret-access-key
```

### Optional

```bash
TURNSTILE_KEY=cloudflare-turnstile-secret-key
NODE_ENV=production
```

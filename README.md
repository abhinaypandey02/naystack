# Naystack

> A stack built with tight **Next.js + Drizzle ORM + GraphQL** integration

[![npm version](https://img.shields.io/npm/v/naystack.svg)](https://www.npmjs.com/package/naystack)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](https://opensource.org/licenses/ISC)

## Installation

```bash
npm install naystack
# or
pnpm add naystack
# or
yarn add naystack
```

## Modules

Naystack provides the following modules, each accessible via its own import path:

| Module      | Import Path        | Description                                     |
| ----------- | ------------------ | ----------------------------------------------- |
| **Auth**    | `naystack/auth`    | Email, Google, and Instagram authentication     |
| **GraphQL** | `naystack/graphql` | GraphQL server initialization with type-graphql |
| **Client**  | `naystack/client`  | Client-side hooks and utilities                 |
| **File**    | `naystack/file`    | File upload to AWS S3                           |
| **Socials** | `naystack/socials` | Instagram and Threads API integration           |

---

## Auth Module

```typescript
import {
  getEmailAuthRoutes,
  initGoogleAuth,
  initInstagramAuth,
} from "naystack/auth";
```

### Email Authentication

Setup email-based authentication with JWT tokens and optional Turnstile captcha verification.

```typescript
const emailAuth = getEmailAuthRoutes({
  getUser: async (email: string) => { /* fetch user by email */ },
  createUser: async (user: UserInput) => { /* create new user */ },
  signingKey: process.env.JWT_SIGNING_KEY!,
  refreshKey: process.env.JWT_REFRESH_KEY!,
  turnstileKey?: string,           // Optional: Cloudflare Turnstile secret key
  onSignUp: (user) => { /* callback on signup */ },
  onLogout?: (body) => { /* callback on logout */ },
  onError?: (error) => { /* custom error handler */ },
});

// Export in Next.js route handler
export const { GET, POST, PUT, DELETE, getUserIdFromRequest } = emailAuth;
```

#### Options

| Option         | Type                                                    | Required | Description                     |
| -------------- | ------------------------------------------------------- | -------- | ------------------------------- |
| `getUser`      | `(email: string) => Promise<UserOutput \| undefined>`   | ✅       | Fetch user by email             |
| `createUser`   | `(user: UserInput) => Promise<UserOutput \| undefined>` | ✅       | Create new user                 |
| `signingKey`   | `string`                                                | ✅       | JWT signing key                 |
| `refreshKey`   | `string`                                                | ✅       | JWT refresh key                 |
| `turnstileKey` | `string`                                                | ❌       | Cloudflare Turnstile secret key |
| `onSignUp`     | `(user: UserOutput) => void`                            | ✅       | Callback when user signs up     |
| `onLogout`     | `(body: string) => Promise<void>`                       | ❌       | Callback on logout              |
| `onError`      | `ErrorHandler`                                          | ❌       | Custom error handler            |

#### Types

```typescript
interface UserInput {
  email: string;
  password: string;
  [key: string]: unknown;
}

interface UserOutput {
  id: number;
  email: string;
  password: string | null;
  [key: string]: unknown;
}
```

---

### Google Authentication

```typescript
const googleAuth = initGoogleAuth({
  clientId: process.env.GOOGLE_CLIENT_ID!,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
  authRoute: "/api/auth/google",
  successRedirectURL: "/dashboard",
  errorRedirectURL: "/login?error=google",
  refreshKey: process.env.JWT_REFRESH_KEY!,
  getUserIdFromEmail: async (userInfo) => {
    /* return user ID or null */
  },
});

export const { GET } = googleAuth;
```

#### Options

| Option               | Type                                                  | Required | Description                       |
| -------------------- | ----------------------------------------------------- | -------- | --------------------------------- |
| `clientId`           | `string`                                              | ✅       | Google OAuth client ID            |
| `clientSecret`       | `string`                                              | ✅       | Google OAuth client secret        |
| `authRoute`          | `string`                                              | ✅       | OAuth callback route              |
| `successRedirectURL` | `string`                                              | ✅       | Redirect URL on success           |
| `errorRedirectURL`   | `string`                                              | ✅       | Redirect URL on error             |
| `refreshKey`         | `string`                                              | ✅       | JWT refresh key                   |
| `getUserIdFromEmail` | `(email: Schema$Userinfo) => Promise<number \| null>` | ✅       | Get user ID from Google user info |

---

### Instagram Authentication

```typescript
const instagramAuth = initInstagramAuth({
  clientId: process.env.INSTAGRAM_CLIENT_ID!,
  clientSecret: process.env.INSTAGRAM_CLIENT_SECRET!,
  authRoute: "/api/auth/instagram",
  successRedirectURL: "/dashboard",
  errorRedirectURL: "/login?error=instagram",
  refreshKey: process.env.JWT_REFRESH_KEY!,
  onUser: async (data, userId, accessToken) => {
    /* handle Instagram user */
  },
});

export const { GET, getRefreshedAccessToken } = instagramAuth;
```

#### Options

| Option               | Type                                                                                        | Required | Description                       |
| -------------------- | ------------------------------------------------------------------------------------------- | -------- | --------------------------------- |
| `clientId`           | `string`                                                                                    | ✅       | Instagram app client ID           |
| `clientSecret`       | `string`                                                                                    | ✅       | Instagram app client secret       |
| `authRoute`          | `string`                                                                                    | ✅       | OAuth callback route              |
| `successRedirectURL` | `string`                                                                                    | ✅       | Redirect URL on success           |
| `errorRedirectURL`   | `string`                                                                                    | ✅       | Redirect URL on error             |
| `refreshKey`         | `string`                                                                                    | ✅       | JWT refresh key                   |
| `onUser`             | `(data: InstagramUser, id: number \| null, accessToken: string) => Promise<string \| void>` | ✅       | Callback with Instagram user data |

---

## GraphQL Module

```typescript
import {
  initGraphQLServer,
  GQLError,
  query,
  field,
  QueryLibrary,
  FieldLibrary,
} from "naystack/graphql";
import type { Context, AuthorizedContext } from "naystack/graphql";
```

### Initialize GraphQL Server

```typescript
const { GET, POST } = await initGraphQLServer({
  resolvers: [UserResolver, PostResolver],
  authChecker: ({ context }) => !!context.userId,
  plugins: [], // Optional Apollo plugins
  context: async (req) => ({
    // Custom context builder
    userId: await getUserIdFromRequest(req),
  }),
});

export { GET, POST };
```

#### Options

| Option        | Type                                 | Required | Description                      |
| ------------- | ------------------------------------ | -------- | -------------------------------- |
| `resolvers`   | `NonEmptyArray<Function>`            | ✅       | Array of TypeGraphQL resolvers   |
| `authChecker` | `AuthChecker<any>`                   | ❌       | Custom auth checker function     |
| `plugins`     | `ApolloServerPlugin[]`               | ❌       | Additional Apollo Server plugins |
| `context`     | `(req: NextRequest) => Promise<any>` | ❌       | Context builder function         |

### Error Handling

```typescript
import { GQLError } from "naystack/graphql";

// Usage in resolvers
throw GQLError(404, "User not found");
throw GQLError(403); // "You are not allowed to perform this action"
throw GQLError(400); // "Please provide all required inputs"
throw GQLError(); // "Server Error" (500)
```

### Query & Field Helpers

Build resolvers functionally using `query`, `field`, `QueryLibrary`, and `FieldLibrary`:

```typescript
import { query, QueryLibrary, field, FieldLibrary } from "naystack/graphql";

// Define queries/mutations
const queries = {
  getUser: query(
    async (ctx, input) => {
      return await db.query.users.findFirst({ where: eq(users.id, input) });
    },
    {
      output: User,
      input: Number,
      authorized: true,
    }
  ),
  createUser: query(
    async (ctx, input) => {
      /* ... */
    },
    {
      output: User,
      input: CreateUserInput,
      mutation: true, // Makes this a mutation instead of query
    }
  ),
};

// Generate resolver class
const UserResolver = QueryLibrary(queries);

// Define field resolvers
const fields = {
  posts: field(
    async (root, ctx) => {
      return await db.query.posts.findMany({
        where: eq(posts.userId, root.id),
      });
    },
    { output: [Post] }
  ),
};

const UserFieldResolver = FieldLibrary(User, fields);
```

### Types

```typescript
interface Context {
  userId: number | null;
}

interface AuthorizedContext {
  userId: number;
}
```

---

## Client Module

```typescript
import {
  useVisibility,
  useBreakpoint,
  setupSEO,
  getHandleImageUpload,
  getInstagramAuthorizationURLSetup,
} from "naystack/client";
```

### Hooks

#### `useVisibility`

Observe element visibility using Intersection Observer.

```typescript
function Component() {
  const ref = useVisibility(() => {
    console.log("Element is visible!");
  });

  return <div ref={ref}>Watch me!</div>;
}
```

#### `useBreakpoint`

React to media query changes.

```typescript
function Component() {
  const isMobile = useBreakpoint("(max-width: 768px)");

  return <div>{isMobile ? "Mobile" : "Desktop"}</div>;
}
```

### SEO Helper

```typescript
const getSEO = setupSEO({
  title: "My App",
  description: "Default description",
  siteName: "MyApp",
  themeColor: "#000000",
});

// In page
export const metadata = getSEO(
  "Page Title",
  "Page description",
  "/og-image.png"
);
```

### Instagram Authorization URL

```typescript
const getInstagramAuthURL = getInstagramAuthorizationURLSetup(
  process.env.INSTAGRAM_CLIENT_ID!,
  "https://myapp.com/api/auth/instagram"
);

// Usage
const authURL = getInstagramAuthURL(userToken);
```

### Image Upload Client

```typescript
const uploadImage = getHandleImageUpload("/api/upload");

const result = await uploadImage({
  file: imageFile,
  token: authToken,
  type: "avatar",
  data: { userId: 123 }, // Optional additional data
  sync: true, // Optional: wait for processing
});
```

---

## File Module

```typescript
import { setupFileUpload } from "naystack/file";
```

### Setup File Upload

```typescript
const fileUpload = setupFileUpload({
  refreshKey: process.env.JWT_REFRESH_KEY!,
  signingKey: process.env.JWT_SIGNING_KEY!,
  region: "us-east-1",
  bucket: "my-bucket",
  awsKey: process.env.AWS_ACCESS_KEY_ID!,
  awsSecret: process.env.AWS_SECRET_ACCESS_KEY!,
  processFile: async ({ url, type, userId, data }) => {
    // Process uploaded file
    return {
      deleteURL: url, // URL to delete if needed
      response: { success: true },
    };
  },
});

// Export route handler
export const { PUT } = fileUpload;

// Server-side utilities
const { getUploadFileURL, uploadImage, deleteImage, getFileURL, uploadFile } =
  fileUpload;
```

#### Options

| Option        | Type       | Required | Description              |
| ------------- | ---------- | -------- | ------------------------ |
| `refreshKey`  | `string`   | ✅       | JWT refresh key          |
| `signingKey`  | `string`   | ✅       | JWT signing key          |
| `region`      | `string`   | ✅       | AWS S3 region            |
| `bucket`      | `string`   | ✅       | AWS S3 bucket name       |
| `awsKey`      | `string`   | ✅       | AWS access key ID        |
| `awsSecret`   | `string`   | ✅       | AWS secret access key    |
| `processFile` | `Function` | ✅       | File processing callback |

#### Returned Utilities

| Utility            | Description                    |
| ------------------ | ------------------------------ |
| `PUT`              | Route handler for file uploads |
| `getUploadFileURL` | Get presigned URL for upload   |
| `uploadImage`      | Upload image to S3             |
| `deleteImage`      | Delete image from S3           |
| `getFileURL`       | Get public URL for a file      |
| `uploadFile`       | Upload any file to S3          |

---

## Socials Module

```typescript
import {
  // Instagram
  getInstagramUser,
  getInstagramMedia,
  getInstagramConversations,
  getInstagramConversationsByUser,
  getInstagramConversationByUser,
  getInstagramConversation,
  getInstagramMessage,
  sendInstagramMessage,
  setupInstagramWebhook,
  // Threads
  getThread,
  getThreads,
  getThreadsReplies,
  createThread,
  createThreadsPost,
  setupThreadsWebhook,
} from "naystack/socials";
```

### Instagram API

#### Get User Data

```typescript
const user = await getInstagramUser(accessToken);
const user = await getInstagramUser(accessToken, "user_id");
const user = await getInstagramUser(accessToken, "me", [
  "username",
  "followers_count",
]);
```

#### Get Media

```typescript
const media = await getInstagramMedia(accessToken);
const media = await getInstagramMedia(
  accessToken,
  ["like_count", "comments_count"],
  24
);
```

#### Conversations

```typescript
// Get all conversations
const { data, fetchMore } = await getInstagramConversations(accessToken);

// Get conversations by user
const conversations = await getInstagramConversationsByUser(
  accessToken,
  userId
);

// Get single conversation
const conversation = await getInstagramConversationByUser(accessToken, userId);

// Get conversation with messages
const { messages, participants, fetchMore } = await getInstagramConversation(
  accessToken,
  conversationId
);
```

#### Messages

```typescript
// Get message details
const message = await getInstagramMessage(accessToken, messageId);

// Send message
const result = await sendInstagramMessage(accessToken, recipientId, "Hello!");
```

#### Webhook

```typescript
const instagramWebhook = setupInstagramWebhook({
  secret: process.env.INSTAGRAM_WEBHOOK_SECRET!,
  callback: async (type, value, id) => {
    // Handle webhook events
  },
});

export const { GET, POST } = instagramWebhook;
```

---

### Threads API

#### Get Threads

```typescript
// Get single thread
const thread = await getThread(accessToken, threadId);
const thread = await getThread(accessToken, threadId, ["text", "permalink"]);

// Get all threads
const threads = await getThreads(accessToken);

// Get thread replies
const replies = await getThreadsReplies(accessToken, threadId);
```

#### Create Threads

```typescript
// Create single post
const postId = await createThreadsPost(accessToken, "Hello, Threads!");

// Reply to a thread
const replyId = await createThreadsPost(
  accessToken,
  "Reply text",
  parentThreadId
);

// Create threaded posts (carousel)
const firstPostId = await createThread(accessToken, [
  "First post",
  "Second post in thread",
  "Third post in thread",
]);
```

#### Webhook

```typescript
const threadsWebhook = setupThreadsWebhook({
  secret: process.env.THREADS_WEBHOOK_SECRET!,
  callback: async (type, value) => {
    // Handle webhook events
    return true; // Return false to indicate failure
  },
});

export const { GET, POST } = threadsWebhook;
```

---

## Environment Variables

Here's a summary of common environment variables used:

```env
# JWT Keys
JWT_SIGNING_KEY=your-signing-key
JWT_REFRESH_KEY=your-refresh-key

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Instagram
INSTAGRAM_CLIENT_ID=your-instagram-client-id
INSTAGRAM_CLIENT_SECRET=your-instagram-client-secret
INSTAGRAM_WEBHOOK_SECRET=your-instagram-webhook-secret

# Threads
THREADS_WEBHOOK_SECRET=your-threads-webhook-secret

# AWS S3
AWS_ACCESS_KEY_ID=your-aws-key
AWS_SECRET_ACCESS_KEY=your-aws-secret

# Cloudflare Turnstile (optional)
TURNSTILE_SECRET_KEY=your-turnstile-key

# App
NEXT_PUBLIC_BASE_URL=https://your-app.com
```

---

## License

ISC © [Abhinay Pandey](mailto:abhinaypandey02@gmail.com)

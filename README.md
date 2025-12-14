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

**Basic Example:**

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

**Real-World Example with Drizzle ORM:**

```typescript
import { db } from "@/lib/db";
import { UserTable, WebPushSubscriptionTable } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getEmailAuthRoutes } from "naystack/auth";
import { waitUntil } from "@vercel/functions";

export const { GET, POST, PUT, DELETE, getUserIdFromRequest } =
  getEmailAuthRoutes({
    // Fetch user by email using Drizzle
    getUser: (email: string) => 
      db.query.UserTable.findFirst({ 
        where: eq(UserTable.email, email) 
      }),
    
    // Create new user
    createUser: async (user) => {
      const [newUser] = await db
        .insert(UserTable)
        .values(user)
        .returning();
      return newUser;
    },
    
    signingKey: process.env.SIGNING_KEY!,
    refreshKey: process.env.REFRESH_KEY!,
    turnstileKey: process.env.TURNSTILE_KEY!,
    
    // Send welcome email on signup
    onSignUp: ({ id, email }) =>
      waitUntil(
        (async () => {
          const link = await getVerificationLink(id);
          if (link && email) {
            await sendTemplateEmail(email, "WelcomeUser", {
              verifyLink: link,
            });
          }
        })(),
      ),
    
    // Clean up push subscriptions on logout
    onLogout: async (endpoint: string) => {
      await db
        .delete(WebPushSubscriptionTable)
        .where(eq(WebPushSubscriptionTable.endpoint, endpoint));
    },
  });
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

**Real-World Example:**

```typescript
import { db } from "@/lib/db";
import { UserTable } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { initGoogleAuth } from "naystack/auth";

export const { GET } = initGoogleAuth({
  clientId: process.env.GOOGLE_CLIENT_ID!,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
  authRoute: `${process.env.NEXT_PUBLIC_BASE_URL}/api/auth/google`,
  successRedirectURL: "/dashboard",
  errorRedirectURL: "/login?error=google",
  refreshKey: process.env.REFRESH_KEY!,
  
  // Find existing user or create new one
  getUserIdFromEmail: async ({ email, name }) => {
    if (!email) return null;

    // Update existing user's email verification status
    const [existingUser] = await db
      .update(UserTable)
      .set({ emailVerified: true })
      .where(eq(UserTable.email, email))
      .returning({ id: UserTable.id });
    
    if (existingUser) {
      return existingUser.id;
    }
    
    // Create new user if doesn't exist
    if (name && email) {
      const [newUser] = await db
        .insert(UserTable)
        .values({
          email,
          name,
          emailVerified: true,
        })
        .returning({ id: UserTable.id });
      
      return newUser?.id || null;
    }
    
    return null;
  },
});
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

**Real-World Example:**

```typescript
import { db } from "@/lib/db";
import { InstagramDetails, UserTable } from "@/lib/db/schema";
import { and, eq, ne } from "drizzle-orm";
import { initInstagramAuth } from "naystack/auth";

export const { GET, getRefreshedAccessToken } = initInstagramAuth({
  clientId: process.env.NEXT_PUBLIC_INSTAGRAM_CLIENT_ID!,
  clientSecret: process.env.INSTAGRAM_CLIENT_SECRET!,
  authRoute: `${process.env.NEXT_PUBLIC_BASE_URL}/api/auth/instagram`,
  successRedirectURL: "/profile",
  errorRedirectURL: "/signup",
  refreshKey: process.env.REFRESH_KEY!,
  
  // Verify and link Instagram account
  onUser: async (instagramData, userId, accessToken) => {
    if (!userId) return "You are not logged in";
    
    const user = await db.query.UserTable.findFirst({
      where: eq(UserTable.id, userId),
    });
    
    if (!user?.instagramDetails) {
      return "Please connect Instagram first";
    }

    // Update Instagram verification status
    const [updated] = await db
      .update(InstagramDetails)
      .set({ 
        isVerified: true, 
        accessToken: accessToken 
      })
      .where(
        and(
          eq(InstagramDetails.id, user.instagramDetails),
          eq(InstagramDetails.username, instagramData.username),
        ),
      )
      .returning({ username: InstagramDetails.username });

    if (!updated) {
      return "Please login with the same username as the connected account";
    }

    // Disconnect from other users if linked
    await db
      .update(UserTable)
      .set({ instagramDetails: null })
      .where(
        and(
          ne(UserTable.id, userId),
          eq(UserTable.instagramDetails, user.instagramDetails),
        ),
      );
  },
});
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

**Basic Example:**

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

**Real-World Example with Advanced Context:**

```typescript
import { initGraphQLServer } from "naystack/graphql";
import { getUserIdFromRequest } from "@/api/(auth)/email/setup";
import { authChecker } from "@/lib/auth/context";

export const { GET, POST } = await initGraphQLServer({
  resolvers: [
    UserResolver,
    PostResolver,
    ApplicationResolver,
    ChatResolver,
    // ... more resolvers
  ],
  authChecker,
  context: async (req) => {
    const res = getUserIdFromRequest(req);
    if (!res) return { userId: null };
    
    // Handle refresh token user ID
    if (res.refreshUserID) {
      const isMobile = req.headers.get("x-platform-is-mobile");
      if (isMobile) return { userId: null };
      return { userId: res.refreshUserID, onlyQuery: true };
    }
    
    // Handle access token user ID
    if (res.accessUserId) {
      return { userId: res.accessUserId };
    }
    
    return { userId: null };
  },
});
```

#### Options

| Option        | Type                                 | Required | Description                      |
| ------------- | ------------------------------------ | -------- | -------------------------------- |
| `resolvers`   | `NonEmptyArray<Function>`            | ✅       | Array of TypeGraphQL resolvers   |
| `authChecker` | `AuthChecker<any>`                   | ❌       | Custom auth checker function     |
| `plugins`     | `ApolloServerPlugin[]`               | ❌       | Additional Apollo Server plugins |
| `context`     | `(req: NextRequest) => Promise<any>` | ❌       | Context builder function         |

### Error Handling

**Basic Usage:**

```typescript
import { GQLError } from "naystack/graphql";

// Usage in resolvers
throw GQLError(404, "User not found");
throw GQLError(403); // "You are not allowed to perform this action"
throw GQLError(400); // "Please provide all required inputs"
throw GQLError(); // "Server Error" (500)
```

**Real-World Example in Resolvers:**

```typescript
import { GQLError } from "naystack/graphql";
import { db } from "@/lib/db";
import { UserTable, PostingTable } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function createPosting(
  ctx: Context,
  input: NewPostingInput,
): Promise<number | null> {
  // Authentication check
  if (!ctx.userId) {
    throw GQLError(400, "Please login to create posting");
  }

  const user = await db.query.UserTable.findFirst({
    where: eq(UserTable.id, ctx.userId),
  });

  // Authorization check
  if (!user || user.role === "CREATOR") {
    throw GQLError(400, "Only onboarded users can create postings");
  }

  // Validation check
  if (!user.emailVerified) {
    throw GQLError(400, "Please verify email to create posting");
  }

  // Rate limiting check
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const recentPostings = await db.query.PostingTable.findMany({
    where: and(
      eq(PostingTable.userId, ctx.userId),
      gte(PostingTable.createdAt, yesterday),
    ),
  });

  if (recentPostings.length >= MAXIMUM_POSTINGS_DAY) {
    throw GQLError(
      400,
      `Only ${MAXIMUM_POSTINGS_DAY} allowed in 24 hours. Try again later.`,
    );
  }

  // Create posting...
}
```

### Query & Field Helpers

Build resolvers functionally using `query`, `field`, `QueryLibrary`, and `FieldLibrary`:

**Basic Example:**

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

**Real-World Example:**

```typescript
import { query, QueryLibrary, field, FieldLibrary } from "naystack/graphql";
import { db } from "@/lib/db";
import { NotificationTable } from "@/lib/db/schema";
import { eq, lte } from "drizzle-orm";
import { waitUntil } from "@vercel/functions";

// Query with side effects
export const getNotifications = query(
  async (ctx) => {
    if (!ctx.userId) return [];
    
    // Mark all as read
    const notifications = await db
      .update(NotificationTable)
      .set({ read: true })
      .where(eq(NotificationTable.user, ctx.userId))
      .returning();
    
    // Clean up old notifications (async)
    const weekBefore = new Date();
    weekBefore.setDate(weekBefore.getDate() - 7);
    waitUntil(
      db
        .delete(NotificationTable)
        .where(lte(NotificationTable.createdAt, weekBefore)),
    );
    
    return notifications.sort((a, b) => a.id - b.id);
  },
  {
    output: [NotificationGQL!],
  },
);

// Create resolver from queries
export const NotificationResolver = QueryLibrary({
  getNotifications,
  getUnreadNotifications,
});

// Field resolver example
export const UserFields = FieldLibrary(UserGQL, {
  isOnboarded: field(
    async (user) => {
      return getIsOnboarded(user);
    },
    {
      output: Boolean,
    }
  ),
});
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

Observe element visibility using Intersection Observer. Perfect for infinite scroll and lazy loading.

**Basic Example:**

```typescript
function Component() {
  const ref = useVisibility(() => {
    console.log("Element is visible!");
  });

  return <div ref={ref}>Watch me!</div>;
}
```

**Real-World Example - Infinite Scroll:**

```typescript
"use client";

import { useVisibility } from "naystack/client";
import { useRef } from "react";

export default function PostingCard({ 
  posting, 
  fetchMore 
}: { 
  posting: Posting;
  fetchMore?: () => void;
}) {
  // Trigger fetchMore when card becomes visible
  const mainRef = useVisibility(fetchMore);

  return (
    <div ref={mainRef} className="posting-card">
      <h3>{posting.title}</h3>
      <p>{posting.description}</p>
    </div>
  );
}
```

#### `useBreakpoint`

React to media query changes. Useful for responsive layouts and conditional rendering.

**Basic Example:**

```typescript
function Component() {
  const isMobile = useBreakpoint("(max-width: 768px)");

  return <div>{isMobile ? "Mobile" : "Desktop"}</div>;
}
```

**Real-World Example - Responsive Layout:**

```typescript
"use client";

import { useBreakpoint } from "naystack/client";

export default function LayoutWrapper({ 
  children 
}: { 
  children: React.ReactNode;
}) {
  const isLarge = useBreakpoint("(min-width: 1024px)");

  return (
    <div
      style={{
        height: isLarge 
          ? "calc(100svh - 80px)" 
          : "calc(100svh - 55px)",
      }}
      className="flex flex-col"
    >
      {children}
    </div>
  );
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

Generate Instagram OAuth authorization URLs for client-side redirects.

**Example:**

```typescript
import { getInstagramAuthorizationURLSetup } from "naystack/client";

// Setup once
const getInstagramAuthorizationURL = getInstagramAuthorizationURLSetup(
  process.env.NEXT_PUBLIC_INSTAGRAM_CLIENT_ID!,
  `${process.env.NEXT_PUBLIC_BASE_URL}/api/auth/instagram`,
);

// Usage in component
function ConnectInstagramButton() {
  const handleConnect = () => {
    const authURL = getInstagramAuthorizationURL(userToken);
    window.location.href = authURL;
  };

  return <button onClick={handleConnect}>Connect Instagram</button>;
}
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

**Basic Example:**

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

**Real-World Example with Multiple File Types:**

```typescript
import { setupFileUpload } from "naystack/file";
import { db } from "@/lib/db";
import { PortfolioTable, UserTable } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { waitUntil } from "@vercel/functions";

export const { deleteImage, getUploadFileURL, getFileURL, uploadImage, PUT } =
  setupFileUpload({
    region: process.env.SITE_AWS_REGION!,
    refreshKey: process.env.REFRESH_KEY!,
    awsSecret: process.env.SITE_AWS_SECRET_ACCESS_KEY!,
    awsKey: process.env.SITE_AWS_ACCESS_KEY_ID!,
    signingKey: process.env.SIGNING_KEY!,
    bucket: process.env.SITE_AWS_BUCKET!,
    
    processFile: async ({ url, userId, data, type }) => {
      switch (type) {
        case "PORTFOLIO":
          // Handle portfolio image upload
          waitUntil(
            (async () => {
              if (!url) return {};
              const id = (data as { id?: number }).id;
              
              if (id) {
                // Update existing portfolio
                const [existing] = await db
                  .select()
                  .from(PortfolioTable)
                  .where(
                    and(
                      eq(PortfolioTable.id, id),
                      eq(PortfolioTable.user, userId),
                    ),
                  );

                if (!existing) {
                  return { deleteURL: url };
                }
                
                const oldURL = existing.imageURL;
                await db
                  .update(PortfolioTable)
                  .set({ imageURL: url })
                  .where(
                    and(
                      eq(PortfolioTable.id, id),
                      eq(PortfolioTable.user, userId),
                    ),
                  );

                return {
                  deleteURL: oldURL,
                  data: { id },
                };
              } else {
                // Create new portfolio
                const [portfolio] = await db
                  .insert(PortfolioTable)
                  .values({
                    user: userId,
                    imageURL: url,
                    caption: "",
                    link: "",
                  })
                  .returning({ id: PortfolioTable.id });
                
                return { data: { id: portfolio?.id } };
              }
            })(),
          );
          break;
          
        case "PROFILE_PICTURE":
          // Handle profile picture upload
          waitUntil(
            (async () => {
              const user = await db.query.UserTable.findFirst({
                where: eq(UserTable.id, userId),
              });
              
              if (!user && url) {
                return { deleteURL: url };
              }
              
              const oldPhoto = user?.photo;
              await db
                .update(UserTable)
                .set({ photo: url })
                .where(eq(UserTable.id, userId));

              return {
                deleteURL: oldPhoto || undefined,
              };
            })(),
          );
          break;
      }
      
      return {};
    },
  });
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

**Basic Usage:**

```typescript
const media = await getInstagramMedia(accessToken);
const media = await getInstagramMedia(
  accessToken,
  ["like_count", "comments_count"],
  24
);
```

**Real-World Example - Fetching Media with Custom Fields:**

```typescript
import { getInstagramMedia } from "naystack/socials";

export async function fetchInstagramGraphMedia(
  accessToken: string,
  followers: number,
  userId: number,
) {
  const fetchReq = await getInstagramMedia<{
    thumbnail_url?: string;
    id: string;
    like_count?: number;
    comments_count: number;
    permalink: string;
    caption: string;
    media_url?: string;
    media_type?: string;
    timestamp: string;
  }>(accessToken, [
    "id",
    "thumbnail_url",
    "media_url",
    "like_count",
    "comments_count",
    "media_type",
    "permalink",
    "caption",
    "timestamp",
  ]);
  
  if (fetchReq?.data) {
    return fetchReq.data.map((media) => ({
      isVideo: media.media_type === "VIDEO",
      comments: media.comments_count || -1,
      likes: media.like_count || 0,
      link: media.permalink,
      thumbnail: media.thumbnail_url || media.media_url,
      mediaURL: media.media_url,
      timestamp: media.timestamp,
      caption: media.caption,
      appID: media.id,
      user: userId,
      er: calculateEngagementRate(
        followers,
        media.like_count || 0,
        media.comments_count || -1,
      ),
    }));
  }
}
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

**Basic Example:**

```typescript
const instagramWebhook = setupInstagramWebhook({
  secret: process.env.INSTAGRAM_WEBHOOK_SECRET!,
  callback: async (type, value, id) => {
    // Handle webhook events
  },
});

export const { GET, POST } = instagramWebhook;
```

**Real-World Example - Auto-Reply Bot:**

```typescript
import {
  getInstagramConversationByUser,
  sendInstagramMessage,
  setupInstagramWebhook,
} from "naystack/socials";

export const { GET, POST } = setupInstagramWebhook({
  secret: process.env.REFRESH_KEY!,
  callback: async (
    type,
    value: {
      sender: { id: string };
      message: { text: string };
      recipient: { id: string };
    },
  ) => {
    if (
      type === "messaging" &&
      value.message.text &&
      value.sender.id !== "YOUR_PAGE_ID" &&
      value.recipient.id === "YOUR_PAGE_ID"
    ) {
      // Check if message is recent (within 24 hours)
      const conversation = await getInstagramConversationByUser(
        process.env.INSTAGRAM_ACCESS_TOKEN!,
        value.sender.id,
      );
      
      const lastMessage = conversation?.messages?.data[1]?.created_time;
      if (lastMessage) {
        const lastMessageDate = new Date(lastMessage);
        if (lastMessageDate.getTime() > Date.now() - 1000 * 60 * 60 * 24) {
          return; // Already replied recently
        }
      }
      
      // Generate reply (using your AI/LLM service)
      const reply = await generateReply(value.message.text);
      if (reply && reply !== '""') {
        await sendInstagramMessage(
          process.env.INSTAGRAM_ACCESS_TOKEN!,
          value.sender.id,
          reply,
        );
      }
    }
  },
});
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

**Basic Example:**

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

**Real-World Example - Auto-Reply to Threads:**

```typescript
import {
  createThreadsPost,
  getThreadsReplies,
  setupThreadsWebhook,
} from "naystack/socials";
import { db } from "@/lib/db";
import { SocialPostsTable } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

const REPLIES = [
  "Thanks for your interest! Check out campaign ${ID}",
  "We'd love to work with you! See campaign ${ID}",
];

export const { GET, POST } = setupThreadsWebhook({
  secret: process.env.REFRESH_KEY!,
  callback: async (
    field,
    value: {
      id: string;
      username: string;
      text: string;
      replied_to: { id: string };
      root_post: { id: string; username: string };
    },
  ) => {
    // Skip if replying to own post
    if (value.root_post.username === value.username) return true;
    
    // Only reply to direct replies to root post
    if (value.root_post.id !== value.replied_to.id) return true;
    
    // Check if already replied
    const replies = await getThreadsReplies(
      process.env.THREADS_ACCESS_TOKEN!,
      value.id,
    );
    if (replies?.length ?? 0 > 0) return true;
    
    // Find associated campaign
    const [post] = await db
      .select()
      .from(SocialPostsTable)
      .where(eq(SocialPostsTable.postID, value.root_post.id));
    
    if (!post) return true;
    
    // Generate reply message
    const message = REPLIES[
      Math.floor(Math.random() * REPLIES.length)
    ]?.replace("${ID}", post.campaignID.toString());
    
    if (!message) return true;

    // Send reply
    const res = await createThreadsPost(
      process.env.THREADS_ACCESS_TOKEN!,
      message,
      value.id,
    );
    
    return !!res;
  },
});
```

---

## Best Practices & Common Patterns

### Authentication Flow

1. **Email Auth with Database Integration:**
   - Use Drizzle ORM queries in `getUser` and `createUser`
   - Send verification emails in `onSignUp` callback
   - Clean up session data in `onLogout`

2. **OAuth Integration:**
   - Always verify email/username matches existing accounts
   - Create new users only when necessary
   - Update verification status for existing users

### GraphQL Resolver Patterns

1. **Error Handling:**
   - Use `GQLError` for all error cases
   - Provide clear, user-friendly error messages
   - Use appropriate HTTP status codes (400, 403, 404, 500)

2. **Authorization:**
   - Check authentication first (`if (!ctx.userId)`)
   - Verify permissions before operations
   - Use `authChecker` for role-based access control

3. **Query Library Pattern:**
   - Use `query()` helper for simple queries/mutations
   - Use `QueryLibrary()` to combine multiple queries
   - Use `field()` and `FieldLibrary()` for computed fields

### File Upload Patterns

1. **Multiple File Types:**
   - Use `type` parameter to distinguish upload types
   - Handle each type in `processFile` callback
   - Return `deleteURL` for old files to clean up

2. **Async Processing:**
   - Use `waitUntil()` for non-blocking operations
   - Process file metadata in background
   - Update database after successful upload

### Webhook Patterns

1. **Instagram Webhooks:**
   - Verify sender/recipient IDs
   - Check message timestamps to avoid duplicates
   - Use async operations for replies

2. **Threads Webhooks:**
   - Filter by reply structure (root_post vs replied_to)
   - Check for existing replies before responding
   - Return `true`/`false` to indicate success/failure

### Client-Side Patterns

1. **Infinite Scroll:**
   - Use `useVisibility` hook with `fetchMore` callback
   - Attach ref to last item in list
   - Handle loading states

2. **Responsive Design:**
   - Use `useBreakpoint` for conditional rendering
   - Adjust layout based on screen size
   - Combine with CSS for optimal UX

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

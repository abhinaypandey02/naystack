# Naystack

A minimal, powerful stack for Next.js app development. Built with **Next.js + Drizzle ORM + GraphQL + S3 Auth**.

[![npm version](https://img.shields.io/npm/v/naystack.svg)](https://www.npmjs.com/package/naystack)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](https://opensource.org/licenses/ISC)

## Installation

```bash
pnpm add naystack
```

---

## 1. Authentication

Naystack provides a seamless email-based authentication system with optional support for Google and Instagram.

### Server Setup

Define your auth routes in `app/api/(auth)/email/index.ts`:

```typescript
import { getEmailAuthRoutes } from "naystack/auth";
import { db } from "@/app/api/lib/db";
import { UserTable } from "@/app/api/(graphql)/User/db";
import { eq } from "drizzle-orm";

export const { GET, POST, PUT, DELETE, getContext } = getEmailAuthRoutes({
  createUser: async (data) => {
    const [user] = await db.insert(UserTable).values(data).returning();
    return user;
  },
  getUser: async (email) => {
    const [user] = await db
      .select({
        id: UserTable.id,
        email: UserTable.email,
        password: UserTable.password,
      })
      .from(UserTable)
      .where(eq(UserTable.email, email));
    return user;
  },
  keys: {
    signing: process.env.SIGNING_KEY!,
    refresh: process.env.REFRESH_KEY!,
  },
});
```

> **Note:** Google and Instagram auth are also available via `initGoogleAuth` and `initInstagramAuth` from `naystack/auth`.

### Client Setup

Wrap your application with `AuthWrapper` in your root layout or a client component.

```typescript
// gql/client.ts
"use client";
import { getAuthWrapper } from "naystack/auth/email/client";

export const AuthWrapper = getAuthWrapper("/api/email");
```

### Frontend Usage

```typescript
import { getEmailAuthUtils, useToken } from "naystack/auth/email/client";

const { useLogin, useSignUp, useLogout } = getEmailAuthUtils("/api/email");

function AuthComponent() {
  const login = useLogin();
  const signup = useSignUp();
  const logout = useLogout();
  const token = useToken(); // Get current JWT token

  // ... forms and handlers
}
```

---

## 2. GraphQL

Naystack leverages `type-graphql` and `apollo-server` for a type-safe GraphQL experience.

### Server Setup

Initialize your GraphQL server in `app/api/(graphql)/route.ts`:

```typescript
import { initGraphQLServer } from "naystack/graphql";
import { getContext } from "@/app/api/(auth)/email";
import { UserResolvers } from "./User/graphql";

export const { GET, POST } = await initGraphQLServer({
  getContext,
  resolvers: [UserResolvers],
});
```

### Server Component Query

Call your GraphQL API from server components or actions:

```typescript
// gql/server.ts
import { getGraphQLQuery } from "naystack/graphql/server";

export const query = getGraphQLQuery({
  uri: process.env.NEXT_PUBLIC_BACKEND_BASE_URL!,
});

// Usage in Page
const data = await query(MyQueryDocument, { variables });
```

### Client Setup (Apollo)

For client-side GraphQL with Apollo:

```typescript
// gql/client.ts
import { getApolloWrapper } from "naystack/graphql/client";

export const ApolloWrapper = getApolloWrapper("/api");
```

### Frontend Usage

```typescript
import { useQuery, useMutation } from "@apollo/client";

function Profile() {
  const { data } = useQuery(GetCurrentUserDocument);
  // ...
}
```

---

## 3. File Upload

Naystack simplifies AWS S3 file uploads with presigned URLs and client-side helpers.

### Server Setup

```typescript
import { setupFileUpload } from "naystack/file";

export const { PUT, uploadFile, getDownloadURL } = setupFileUpload({
  region: process.env.AWS_REGION!,
  bucket: process.env.AWS_BUCKET!,
  awsKey: process.env.AWS_ACCESS_KEY_ID!,
  awsSecret: process.env.AWS_SECRET_ACCESS_KEY!,
  keys: {
    signing: process.env.SIGNING_KEY!,
    refresh: process.env.REFRESH_KEY!,
  },
  onUpload: async ({ url, type, userId, data }) => {
    // Save info to DB or process after successful upload
    return { success: true };
  },
});
```

### Client Setup & Usage

```typescript
import { getUseFileUpload } from "naystack/file/client";

const useFileUpload = getUseFileUpload("/api/upload");

function UploadButton() {
  const upload = useFileUpload();

  const handleFile = async (file: File) => {
    const res = await upload(file, "profile-picture", { some: "metadata" });
    console.log("Uploaded URL:", res.url);
  };
  // ...
}
```

---

## 4. Other Utilities

### Client Hooks

- `useVisibility(onVisible)`: Triggers a callback when an element enters the viewport.
- `useBreakpoint(query)`: Responsive media query hook.

### SEO

The `setupSEO` utility helps generate optimized Next.js metadata.

```typescript
import { setupSEO } from "naystack/client";

export const getMetadata = setupSEO({
  siteName: "Naystack",
  title: "A powerful stack",
  description: "Built with Next.js",
  themeColor: "#000000",
});
```

### Social APIs

Simplified access to Instagram and Threads APIs.

```typescript
import { getInstagramUser, createThreadsPost } from "naystack/socials";
```

---

## Minimal Environment Variables

```env
SIGNING_KEY=your-jwt-signing-key
REFRESH_KEY=your-jwt-refresh-key
NEXT_PUBLIC_BACKEND_BASE_URL=http://localhost:3000/api
AWS_REGION=us-east-1
AWS_BUCKET=your-bucket-name
AWS_ACCESS_KEY_ID=xxx
AWS_SECRET_ACCESS_KEY=xxx
```

import type { GraphQLScalarType } from "graphql";
import { cookies } from "next/headers";
import { cache } from "react";
import type { ClassType } from "type-graphql";
import {
  Arg,
  Authorized,
  Ctx,
  FieldResolver,
  Mutation,
  Query,
  Resolver,
  Root,
} from "type-graphql";

import { REFRESH_COOKIE_NAME } from "../auth/constants";
import { getUserIdFromRefreshToken } from "../auth/email/token";
import { AuthorizedContext, Context } from "./types";

/** Options for @Query() / @Mutation() return type (e.g. nullable). */
type ReturnOptions = Parameters<typeof Query>[1];
/** Options for @Arg() (e.g. nullable). */
type ArgsOptions = Parameters<typeof Arg>[2];

/** Recursively applies NormalizeNullUndefined to plain object types, leaves primitives/builtins as-is. */
type RecurseNNU<T> = T extends (infer U)[]
  ? RecurseNNU<U>[]
  : T extends Date | Map<unknown, unknown> | Set<unknown> | Function
    ? T
    : T extends object
      ? NormalizeNullUndefined<T>
      : T;

/** Maps nullable keys to optional and normalizes null/undefined, recursively. */
type NormalizeNullUndefined<T> = {
  // Keys that include null → make optional, recurse into value
  [K in keyof T as null extends T[K] ? K : never]?: RecurseNNU<
    Exclude<T[K], null | undefined>
  > | null;
} & {
  // Keys that do not include null → keep as is, but add null if optional, recurse into value
  [K in keyof T as null extends T[K] ? never : K]: undefined extends T[K]
    ? RecurseNNU<Exclude<T[K], undefined>> | null // optional → add null
    : RecurseNNU<T[K]>;
};

/** Adds nullable option to Query/Arg options. */
type NullableOptions<T, X extends boolean> = T & { nullable: X };

/** Resolves a GraphQL type (class, scalar, primitive) to TS type. */
type ParsedGQLType<
  T,
  MergeNullUndefined extends boolean,
> = T extends StringConstructor
  ? string
  : T extends NumberConstructor
    ? number
    : T extends BooleanConstructor
      ? boolean
      : T extends GraphQLScalarType<infer U>
        ? U
        : T extends ClassType<infer U>
          ? MergeNullUndefined extends true
            ? NormalizeNullUndefined<U>
            : U
          : T extends Record<infer K, string | number>
            ? T[K]
            : void;

/** Array-aware ParsedGQLType. */
type ParsedGQLTypeWithArray<T, MergeNullUndefined extends boolean> =
  T extends Array<infer U>
    ? ParsedGQLType<U, MergeNullUndefined>[]
    : ParsedGQLType<T, MergeNullUndefined>;

/** Adds null/undefined when nullable. */
type ParsedGQLTypeWithNullability<
  T,
  IsNullable extends boolean,
  MergeNullUndefined extends boolean,
> = IsNullable extends true
  ? ParsedGQLTypeWithArray<T, MergeNullUndefined> | null | undefined
  : ParsedGQLTypeWithArray<T, MergeNullUndefined>;

/** Allows resolver to return T or Promise<T>. */
type Promisify<T> = T | Promise<T>;

/** Base for query/field definition (output, input, options). */
interface BaseDefinition<
  T,
  U,
  IsAuth extends boolean = false,
  OutputNullable extends boolean = false,
  InputNullable extends boolean = false,
> {
  output: T;
  outputOptions?: NullableOptions<ReturnOptions, OutputNullable>;
  input?: U;
  inputOptions?: NullableOptions<ArgsOptions, InputNullable>;
  authorized?: IsAuth;
}

/**
 * Full query/mutation definition returned by {@link resolver}. Contains the resolver function,
 * plus `.call()` and `.authCall()` for direct server-side invocation.
 *
 * @category GraphQL
 */
export interface QueryDefinition<
  T,
  U,
  IsAuth extends boolean = false,
  OutputNullable extends boolean = false,
  InputNullable extends boolean = false,
  R extends Promisify<
    ParsedGQLTypeWithNullability<T, OutputNullable, true>
  > = Promisify<ParsedGQLTypeWithNullability<T, OutputNullable, true>>,
> extends BaseDefinition<T, U, IsAuth, OutputNullable, InputNullable> {
  fn: (
    ctx: IsAuth extends true ? AuthorizedContext : Context,
    data: ParsedGQLTypeWithNullability<U, InputNullable, false>,
  ) => R;
  /** Calls the resolver server-side. For authorized queries, reads the refresh cookie; for non-authorized, passes null userId. */
  call: (
    data: ParsedGQLTypeWithNullability<U, InputNullable, false>,
  ) => Promise<Awaited<R>>;
  /** Calls the resolver server-side with authentication (always reads the refresh cookie). Use in Server Components. */
  authCall: (
    data: ParsedGQLTypeWithNullability<U, InputNullable, false>,
  ) => Promise<Awaited<R>>;
  mutation?: boolean;
}

/**
 * Defines a type-graphql query or mutation with typed input/output and optional auth.
 * Use with {@link QueryLibrary} to build resolver classes for `setupGraphQL`.
 *
 * Each query definition gets `.call(data)` and `.authCall(data)` methods for direct server-side invocation
 * (e.g. in Server Components or other resolvers). Both are cached via React's `cache()`.
 *
 * @param fn - Resolver function: `(ctx, data) => result`.
 *   - `ctx` is `Context` (or `AuthorizedContext` when `authorized: true`) with `userId`.
 *   - `data` is the typed GraphQL input (or `void` if no input).
 * @param options - Configuration for the query/mutation.
 * @param options.output - The GraphQL return type (type-graphql `@ObjectType` class, `String`, `Boolean`, `Number`, etc.).
 * @param options.input - Optional GraphQL input type (`@InputType` class or scalar) for the `input` argument.
 * @param options.outputOptions - Optional. Set `{ nullable: true }` to allow null returns.
 * @param options.inputOptions - Optional. Set `{ nullable: true }` to allow null input.
 * @param options.authorized - If `true`, the resolver requires an authenticated user. `ctx` is typed as `AuthorizedContext` (non-null `userId`).
 * @param options.mutation - If `true`, registers as a `@Mutation`; otherwise registers as a `@Query`.
 * @returns A `QueryDefinition` with `.call(data)` and `.authCall(data)` for server-side invocation.
 *
 * @example Simple query (no input, nullable output):
 * ```ts
 * import { resolver } from "naystack/graphql";
 *
 * export default resolver(
 *   async (ctx) => {
 *     if (!ctx.userId) return null;
 *     const [user] = await db.select().from(UserTable).where(eq(UserTable.id, ctx.userId));
 *     return user || null;
 *   },
 *   { output: User, outputOptions: { nullable: true } },
 * );
 * ```
 *
 * @example Mutation with input and authorization:
 * ```ts
 * export default resolver(
 *   async (ctx, input: SubmitFeedbackInput) => {
 *     await db.insert(FeedbackTable).values({ userId: ctx.userId, score: input.score, text: input.text });
 *     return true;
 *   },
 *   { output: Boolean, input: SubmitFeedbackInput, authorized: true, mutation: true },
 * );
 * ```
 *
 * @example Server-side invocation in a Server Component:
 * ```ts
 * const user = await getCurrentUser.authCall();   // Reads refresh cookie for auth
 * const planets = await getPlanets.call();         // No auth needed
 * ```
 *
 * @category GraphQL
 */
export function resolver<
  T,
  U,
  IsAuth extends boolean = false,
  OutputNullable extends boolean = false,
  InputNullable extends boolean = false,
  R extends Promisify<
    ParsedGQLTypeWithNullability<T, OutputNullable, true>
  > = Promisify<ParsedGQLTypeWithNullability<T, OutputNullable, true>>,
>(
  fn: (
    ctx: IsAuth extends true ? AuthorizedContext : Context,
    data: ParsedGQLTypeWithNullability<U, InputNullable, false>,
  ) => R,
  options: Omit<
    QueryDefinition<T, U, IsAuth, OutputNullable, InputNullable, R>,
    "fn" | "authCall" | "call"
  >,
): QueryDefinition<T, U, IsAuth, OutputNullable, InputNullable, R> {
  return {
    ...options,
    fn,
    authCall: getAuthCaller<T, U, IsAuth, OutputNullable, InputNullable, R>(fn),
    call: options.authorized
      ? getAuthCaller<T, U, IsAuth, OutputNullable, InputNullable, R>(fn)
      : getCaller<T, U, IsAuth, OutputNullable, InputNullable, R>(fn),
  };
}

/** Reads userId from refresh cookie (server-side). */
const getUserId = async () => {
  const Cookie = await cookies();
  const refresh = Cookie.get(REFRESH_COOKIE_NAME)?.value;
  return refresh ? getUserIdFromRefreshToken(refresh) : null;
};

/** Returns a cached caller that injects authenticated context. */
function getAuthCaller<
  T,
  U,
  IsAuth extends boolean = false,
  OutputNullable extends boolean = false,
  InputNullable extends boolean = false,
  R extends Promisify<
    ParsedGQLTypeWithNullability<T, OutputNullable, true>
  > = Promisify<ParsedGQLTypeWithNullability<T, OutputNullable, true>>,
>(
  fn: (
    ctx: IsAuth extends true ? AuthorizedContext : Context,
    data: ParsedGQLTypeWithNullability<U, InputNullable, false>,
  ) => R,
) {
  return cache(
    async (
      data: ParsedGQLTypeWithNullability<U, InputNullable, false>,
    ): Promise<Awaited<R>> => {
      const ctx = {
        userId: await getUserId(),
        isRefreshID: true,
      } as IsAuth extends true ? AuthorizedContext : Context;
      return await fn(ctx, data);
    },
  );
}

/** Returns a cached caller that injects unauthenticated context (userId null). */
function getCaller<
  T,
  U,
  IsAuth extends boolean = false,
  OutputNullable extends boolean = false,
  InputNullable extends boolean = false,
  R extends Promisify<
    ParsedGQLTypeWithNullability<T, OutputNullable, true>
  > = Promisify<ParsedGQLTypeWithNullability<T, OutputNullable, true>>,
>(
  fn: (
    ctx: IsAuth extends true ? AuthorizedContext : Context,
    data: ParsedGQLTypeWithNullability<U, InputNullable, false>,
  ) => R,
) {
  return cache(
    async (
      data: ParsedGQLTypeWithNullability<U, InputNullable, false>,
    ): Promise<Awaited<R>> => {
      const ctx = {
        userId: null,
        isRefreshID: true,
      } as IsAuth extends true ? AuthorizedContext : Context;
      return await fn(ctx, data);
    },
  );
}

/**
 * Full field resolver definition returned by {@link field}. Contains the resolver function,
 * plus `.call()` and `.authCall()` for direct server-side invocation.
 *
 * @category GraphQL
 */
export interface FieldResolverDefinition<
  T,
  U,
  Root,
  IsAuth extends boolean = false,
  OutputNullable extends boolean = false,
  InputNullable extends boolean = false,
  R extends Promisify<
    ParsedGQLTypeWithNullability<T, OutputNullable, true>
  > = Promisify<ParsedGQLTypeWithNullability<T, OutputNullable, true>>,
> extends BaseDefinition<T, U, IsAuth, OutputNullable, InputNullable> {
  fn: (
    root: Root,
    ctx: IsAuth extends true ? AuthorizedContext : Context,
    data: ParsedGQLTypeWithNullability<U, InputNullable, false>,
  ) => R;
  /** Calls the field resolver server-side. For authorized fields, reads the refresh cookie. */
  call: (
    root: Root,
    data: ParsedGQLTypeWithNullability<U, InputNullable, false>,
  ) => Promise<Awaited<R>>;
  /** Calls the field resolver server-side with authentication (always reads the refresh cookie). */
  authCall: (
    root: Root,
    data: ParsedGQLTypeWithNullability<U, InputNullable, false>,
  ) => Promise<Awaited<R>>;
}

/** Returns a cached field caller that injects authenticated context. */
function getFieldAuthCaller<
  T,
  U,
  Root,
  IsAuth extends boolean = false,
  OutputNullable extends boolean = false,
  InputNullable extends boolean = false,
  R extends Promisify<
    ParsedGQLTypeWithNullability<T, OutputNullable, true>
  > = Promisify<ParsedGQLTypeWithNullability<T, OutputNullable, true>>,
>(
  fn: (
    root: Root,
    ctx: IsAuth extends true ? AuthorizedContext : Context,
    data: ParsedGQLTypeWithNullability<U, InputNullable, false>,
  ) => R,
) {
  return cache(
    async (
      root: Root,
      data: ParsedGQLTypeWithNullability<U, InputNullable, false>,
    ): Promise<Awaited<R>> => {
      const ctx = {
        userId: await getUserId(),
        isRefreshID: true,
      } as IsAuth extends true ? AuthorizedContext : Context;
      return await fn(root, ctx, data);
    },
  );
}

/** Returns a cached field caller that injects unauthenticated context (userId null). */
function getFieldCaller<
  T,
  U,
  Root,
  IsAuth extends boolean = false,
  OutputNullable extends boolean = false,
  InputNullable extends boolean = false,
  R extends Promisify<
    ParsedGQLTypeWithNullability<T, OutputNullable, true>
  > = Promisify<ParsedGQLTypeWithNullability<T, OutputNullable, true>>,
>(
  fn: (
    root: Root,
    ctx: IsAuth extends true ? AuthorizedContext : Context,
    data: ParsedGQLTypeWithNullability<U, InputNullable, false>,
  ) => R,
) {
  return cache(
    async (
      root: Root,
      data: ParsedGQLTypeWithNullability<U, InputNullable, false>,
    ): Promise<Awaited<R>> => {
      const ctx = {
        userId: null,
        isRefreshID: true,
      } as IsAuth extends true ? AuthorizedContext : Context;
      return await fn(root, ctx, data);
    },
  );
}

/**
 * Defines a type-graphql field resolver with typed root, context, and input.
 * Use with {@link FieldLibrary} to attach computed fields to a parent GraphQL type.
 *
 * Like `resolver()`, each field definition gets `.call(root, data)` and `.authCall(root, data)` for server-side invocation.
 *
 * @param fn - Resolver function: `(root, ctx, data) => result`.
 *   - `root` is the parent object (e.g. the `User` row from the database).
 *   - `ctx` is `Context` (or `AuthorizedContext` when `authorized: true`).
 *   - `data` is the optional typed input argument.
 * @param options - Configuration (same as `resolver()` but without `mutation`).
 * @returns A `FieldResolverDefinition` with `.call` and `.authCall` for server-side invocation.
 *
 * @example
 * ```ts
 * import { field } from "naystack/graphql";
 *
 * // Resolve the "seller" field on a Property type
 * const seller = field(
 *   async (property: PropertyDB) => {
 *     if (!property.sellerId) return null;
 *     const [seller] = await db.select().from(ContactTable).where(eq(ContactTable.id, property.sellerId));
 *     return seller || null;
 *   },
 *   { output: ContactGQL, outputOptions: { nullable: true } },
 * );
 * ```
 *
 * @example Inline in a FieldLibrary:
 * ```ts
 * const OrgFields = FieldLibrary<OrgDB>(OrgGQL, {
 *   access: field(
 *     async (root, ctx) => {
 *       if (!ctx.userId) return null;
 *       return checkOrgAccess(ctx.userId, root.id);
 *     },
 *     { output: AccessRole, outputOptions: { nullable: true } },
 *   ),
 * });
 * ```
 *
 * @category GraphQL
 */
export function field<
  T,
  U,
  IsAuth extends boolean,
  Root,
  OutputNullable extends boolean = false,
  InputNullable extends boolean = false,
  R extends Promisify<
    ParsedGQLTypeWithNullability<T, OutputNullable, true>
  > = Promisify<ParsedGQLTypeWithNullability<T, OutputNullable, true>>,
>(
  fn: (
    root: Root,
    ctx: IsAuth extends true ? AuthorizedContext : Context,
    data: ParsedGQLTypeWithNullability<U, InputNullable, false>,
  ) => R,
  options: Omit<
    FieldResolverDefinition<
      T,
      U,
      Root,
      IsAuth,
      OutputNullable,
      InputNullable,
      R
    >,
    "fn" | "authCall" | "call"
  >,
): FieldResolverDefinition<
  T,
  U,
  Root,
  IsAuth,
  OutputNullable,
  InputNullable,
  R
> {
  return {
    ...options,
    fn,
    authCall: getFieldAuthCaller<
      T,
      U,
      Root,
      IsAuth,
      OutputNullable,
      InputNullable,
      R
    >(fn),
    call: (options.authorized
      ? getFieldAuthCaller<
          T,
          U,
          Root,
          IsAuth,
          OutputNullable,
          InputNullable,
          R
        >(fn)
      : getFieldCaller<T, U, Root, IsAuth, OutputNullable, InputNullable, R>(
          fn,
        )) as any,
  };
}

/**
 * Builds a type-graphql `@Resolver` class from a map of query/mutation definitions created with {@link resolver}.
 * Each key in the `queries` object becomes a Query or Mutation field on the GraphQL schema.
 *
 * Pass the returned class in the `resolvers` array of `setupGraphQL`.
 *
 * @param queries - Object mapping GraphQL field names to `QueryDefinition`s (from `resolver()`).
 *   Each key becomes the field name in the schema. Mutations are determined by `{ mutation: true }` in the definition.
 * @returns A `@Resolver` class suitable for `setupGraphQL`.
 *
 * @example
 * ```ts
 * import { QueryLibrary, query } from "naystack/graphql";
 * import getCurrentUser from "./resolvers/get-current-user";
 * import updateUser from "./resolvers/update-user";
 * import onboardUser from "./resolvers/onboard-user";
 *
 * export const UserResolvers = QueryLibrary({
 *   getCurrentUser,  // becomes Query.getCurrentUser
 *   updateUser,      // becomes Mutation.updateUser (if mutation: true)
 *   onboardUser,     // becomes Mutation.onboardUser (if mutation: true)
 * });
 * ```
 *
 * @category GraphQL
 */
export function QueryLibrary<
  T extends Record<string, QueryDefinition<any, any, any, any, any, any>>,
>(queries: T) {
  @Resolver()
  class GeneratedResolver {}

  const hasQuery = Object.values(queries).some((def) => !def.mutation);
  if (!hasQuery) {
    Object.defineProperty(GeneratedResolver.prototype, "_health", {
      value: async function () {
        return true;
      },
      writable: false,
    });
    const descriptor = Object.getOwnPropertyDescriptor(
      GeneratedResolver.prototype,
      "_health",
    )!;
    Query(() => Boolean)(GeneratedResolver.prototype, "_health", descriptor);
  }

  for (const key in queries) {
    const def = queries[key];
    if (!def) continue;

    Object.defineProperty(GeneratedResolver.prototype, key, {
      value: async function (ctx: Context, data?: any) {
        return def.fn(ctx, data);
      },
      writable: false,
    });

    const descriptor = Object.getOwnPropertyDescriptor(
      GeneratedResolver.prototype,
      key,
    )!;

    if (def.mutation) {
      Mutation(() => def.output, def.outputOptions)(
        GeneratedResolver.prototype,
        key,
        descriptor,
      );
    } else {
      Query(() => def.output, def.outputOptions)(
        GeneratedResolver.prototype,
        key,
        descriptor,
      );
    }
    if (def.authorized) {
      Authorized()(GeneratedResolver.prototype, key);
    }
    Ctx()(GeneratedResolver.prototype, key, 0);

    if (def.input) {
      Arg("input", () => def.input || String, def.inputOptions)(
        GeneratedResolver.prototype,
        key,
        1,
      );
    }
  }

  return GeneratedResolver;
}

/**
 * Builds a type-graphql `@Resolver(() => type)` class that resolves computed fields on a parent GraphQL type.
 * Each key in the `queries` object becomes a `@FieldResolver` on that type.
 *
 * Pass the returned class in the `resolvers` array of `setupGraphQL`.
 *
 * @typeParam X - The database/plain type of the parent object (e.g. `UserDB`).
 * @param type - The parent GraphQL type class (e.g. `User`). Must be a `@ObjectType` class.
 * @param queries - Object mapping field names to `FieldResolverDefinition`s (from `field()`).
 * @returns A `@Resolver` class for the given type; pass it in `setupGraphQL`'s resolvers array.
 *
 * @example
 * ```ts
 * import { FieldLibrary, field } from "naystack/graphql";
 * import { User } from "./types";
 * import type { UserDB } from "./db";
 * import organizations from "./resolvers/organizations-field";
 *
 * export const UserFieldResolvers = FieldLibrary<UserDB>(User, {
 *   organizations,   // Resolves User.organizations from the UserDB row
 * });
 * ```
 *
 * @example With inline field definitions:
 * ```ts
 * export const OrgFieldResolvers = FieldLibrary<OrgDB>(OrgGQL, {
 *   access: field(
 *     async (root, ctx) => checkOrgAccess(ctx.userId, root.id),
 *     { output: AccessRole, outputOptions: { nullable: true } },
 *   ),
 * });
 * ```
 *
 * @category GraphQL
 */
export function FieldLibrary<
  X extends object,
  T extends Record<
    string,
    FieldResolverDefinition<any, any, X, any, any, any, any>
  > = Record<string, FieldResolverDefinition<any, any, X, any, any, any, any>>,
>(type: ClassType, queries: T) {
  @Resolver(() => type)
  class GeneratedResolver {}

  for (const key in queries) {
    const def = queries[key];
    if (!def) continue;

    Object.defineProperty(GeneratedResolver.prototype, key, {
      value: async function (root: any, ctx: Context, input?: any) {
        if (root[key]) return root[key];
        return def.fn(root, ctx, input);
      },
      writable: false,
    });

    const descriptor = Object.getOwnPropertyDescriptor(
      GeneratedResolver.prototype,
      key,
    )!;
    if (def.authorized) {
      Authorized()(GeneratedResolver.prototype, key);
    }
    Root()(GeneratedResolver.prototype, key, 0);
    FieldResolver(() => def.output, def.outputOptions)(
      GeneratedResolver.prototype,
      key,
      descriptor,
    );
    Ctx()(GeneratedResolver.prototype, key, 1);

    if (def.input) {
      Arg("input", () => def.input || String, def.inputOptions)(
        GeneratedResolver.prototype,
        key,
        2,
      );
    }
  }

  return GeneratedResolver;
}

/**
 * Infers the TypeScript return type of a query definition's `.call()` method.
 * Use this to type component props that receive query results, ensuring full type safety.
 *
 * @typeParam T - A `QueryDefinition` (the default export from a resolver file created with `resolver()`).
 *
 * @example
 * ```ts
 * import type { QueryResponseType } from "naystack/graphql";
 * import type getCurrentUser from "@/app/api/(graphql)/User/resolvers/get-current-user";
 * import type getDeal from "@/app/api/(graphql)/Deal/queries/get-deal";
 *
 * interface Props {
 *   user: QueryResponseType<typeof getCurrentUser>;
 *   deal: QueryResponseType<typeof getDeal>;
 * }
 * ```
 *
 * @category GraphQL
 */
export type QueryResponseType<
  T extends QueryDefinition<any, any, any, any, any, any>,
> = Awaited<ReturnType<T["call"]>>;

/**
 * Infers the TypeScript return type of a field resolver definition's `.call()` method.
 * Use this to type the resolved field value.
 *
 * @typeParam T - A `FieldResolverDefinition` (from `field()`).
 *
 * @example
 * ```ts
 * import type { FieldResponseType } from "naystack/graphql";
 * import type organizationsField from "./resolvers/organizations-field";
 *
 * type Orgs = FieldResponseType<typeof organizationsField>;
 * ```
 *
 * @category GraphQL
 */
export type FieldResponseType<
  T extends FieldResolverDefinition<any, any, any, any, any, any, any>,
> = Awaited<ReturnType<T["call"]>>;

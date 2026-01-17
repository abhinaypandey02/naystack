import type { GraphQLScalarType } from "graphql";
import { cookies } from "next/headers";
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

type ReturnOptions = Parameters<typeof Query>[1];
type ArgsOptions = Parameters<typeof Arg>[2];

type NormalizeNullUndefined<T> = {
  // Keys that include null → make optional
  [K in keyof T as null extends T[K] ? K : never]?: Exclude<T[K], undefined>;
} & {
  // Keys that do not include null → keep as is, but add null if optional
  [K in keyof T as null extends T[K] ? never : K]: undefined extends T[K]
    ? Exclude<T[K], undefined> | null // optional → add null
    : T[K];
};

type NullableOptions<T, X extends boolean> = T & { nullable: X };

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

type ParsedGQLTypeWithArray<T, MergeNullUndefined extends boolean> =
  T extends Array<infer U>
    ? ParsedGQLType<U, MergeNullUndefined>[]
    : ParsedGQLType<T, MergeNullUndefined>;

type ParsedGQLTypeWithNullability<
  T,
  IsNullable extends boolean,
  MergeNullUndefined extends boolean,
> = IsNullable extends true
  ? ParsedGQLTypeWithArray<T, MergeNullUndefined> | null | undefined
  : ParsedGQLTypeWithArray<T, MergeNullUndefined>;

type Promisify<T> = T | Promise<T>;

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
interface QueryDefinition<
  T,
  U,
  IsAuth extends boolean = false,
  OutputNullable extends boolean = false,
  InputNullable extends boolean = false,
> extends BaseDefinition<T, U, IsAuth, OutputNullable, InputNullable> {
  fn: (
    ctx: IsAuth extends true ? AuthorizedContext : Context,
    data: ParsedGQLTypeWithNullability<U, InputNullable, false>,
  ) => Promisify<ParsedGQLTypeWithNullability<T, OutputNullable, true>>;
  call: (
    data: ParsedGQLTypeWithNullability<U, InputNullable, false>,
  ) => Promisify<ParsedGQLTypeWithNullability<T, OutputNullable, true>>;
  mutation?: boolean;
}

export function query<
  T,
  U,
  IsAuth extends boolean = false,
  OutputNullable extends boolean = false,
  InputNullable extends boolean = false,
>(
  fn: QueryDefinition<T, U, IsAuth, OutputNullable, InputNullable>["fn"],
  options: Omit<
    QueryDefinition<T, U, IsAuth, OutputNullable, InputNullable>,
    "fn" | "call"
  >,
): QueryDefinition<T, U, IsAuth, OutputNullable, InputNullable> {
  return { ...options, fn, call: getCaller(fn, options) };
}

const getUserId = async () => {
  const Cookie = await cookies();
  const refresh = Cookie.get(REFRESH_COOKIE_NAME)?.value;
  return refresh ? getUserIdFromRefreshToken(refresh) : null;
};

function getCaller<
  T,
  U,
  IsAuth extends boolean = false,
  OutputNullable extends boolean = false,
  InputNullable extends boolean = false,
>(
  fn: QueryDefinition<T, U, IsAuth, OutputNullable, InputNullable>["fn"],
  options: Omit<
    QueryDefinition<T, U, IsAuth, OutputNullable, InputNullable>,
    "fn" | "call"
  >,
) {
  const ctx = {
    userId: options.authorized ? getUserId() : null,
    isRefreshID: true,
  } as IsAuth extends true ? AuthorizedContext : Context;
  return (data: ParsedGQLTypeWithNullability<U, InputNullable, false>) =>
    fn(ctx, data);
}

interface FieldResolverDefinition<
  T,
  U,
  Root,
  IsAuth extends boolean = false,
  OutputNullable extends boolean = false,
  InputNullable extends boolean = false,
> extends BaseDefinition<T, U, IsAuth, OutputNullable, InputNullable> {
  fn: (
    root: Root,
    ctx: IsAuth extends true ? AuthorizedContext : Context,
    data: ParsedGQLTypeWithNullability<U, InputNullable, false>,
  ) => Promisify<ParsedGQLTypeWithNullability<T, OutputNullable, true>>;
}

export function field<
  T,
  U,
  IsAuth extends boolean,
  Root,
  OutputNullable extends boolean = false,
  InputNullable extends boolean = false,
>(
  fn: FieldResolverDefinition<
    T,
    U,
    Root,
    IsAuth,
    OutputNullable,
    InputNullable
  >["fn"],
  options: Omit<
    FieldResolverDefinition<T, U, Root, IsAuth, OutputNullable, InputNullable>,
    "fn"
  >,
): FieldResolverDefinition<T, U, Root, IsAuth, OutputNullable, InputNullable> {
  return { ...options, fn };
}

export function QueryLibrary<
  T extends Record<string, QueryDefinition<any, any, any, any, any>>,
>(queries: T) {
  @Resolver()
  class GeneratedResolver {}

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
      Authorized()(GeneratedResolver, key);
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

export function FieldLibrary<
  X extends object,
  T extends Record<
    string,
    FieldResolverDefinition<any, any, X, any, any, any>
  > = Record<string, FieldResolverDefinition<any, any, X, any, any>>,
>(type: ClassType, queries: T) {
  @Resolver(() => type)
  class GeneratedResolver {}

  for (const key in queries) {
    const def = queries[key];
    if (!def) continue;

    Object.defineProperty(GeneratedResolver.prototype, key, {
      value: async function (root: any, ctx: Context, input?: any) {
        return def.fn(root, ctx, input);
      },
      writable: false,
    });

    const descriptor = Object.getOwnPropertyDescriptor(
      GeneratedResolver.prototype,
      key,
    )!;
    if (def.authorized) {
      Authorized()(GeneratedResolver, key);
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

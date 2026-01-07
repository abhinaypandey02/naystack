import type { GraphQLScalarType } from "graphql";
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

import { AuthorizedContext, Context } from "./types";

type ReturnOptions = Parameters<typeof Query>[1];
type ArgsOptions = Parameters<typeof Arg>[2];

type ParsedGQLType<T> = T extends StringConstructor
  ? string
  : T extends NumberConstructor
    ? number
    : T extends BooleanConstructor
      ? boolean
      : T extends ClassType<infer U>
        ? U
        : T extends GraphQLScalarType<infer U>
          ? U
          : T extends Record<infer K, string | number>
            ? T[K]
            : void;

type ParsedGQLTypeWithArray<T> =
  T extends Array<infer U> ? ParsedGQLType<U>[] : ParsedGQLType<T>;

interface BaseDefinition<T, U, IsAuth extends boolean = false> {
  output: T;
  outputOptions?: ReturnOptions;
  input?: U;
  inputOptions?: ArgsOptions;
  authorized?: IsAuth;
}
interface QueryDefinition<T, U, IsAuth extends boolean = false>
  extends BaseDefinition<T, U, IsAuth> {
  fn: (
    ctx: IsAuth extends true ? AuthorizedContext : Context,
    data: ParsedGQLTypeWithArray<U>,
  ) => Promise<ParsedGQLTypeWithArray<T>> | ParsedGQLTypeWithArray<T>;
  mutation?: boolean;
}

interface FieldResolverDefinition<T, U, Root, IsAuth extends boolean = false>
  extends BaseDefinition<T, U, IsAuth> {
  fn: (
    root: Root,
    ctx: IsAuth extends true ? AuthorizedContext : Context,
    data: ParsedGQLTypeWithArray<U>,
  ) => Promise<ParsedGQLTypeWithArray<T>> | ParsedGQLTypeWithArray<T>;
}

export function query<T, U, IsAuth extends boolean = false>(
  fn: QueryDefinition<T, U, IsAuth>["fn"],
  options: Omit<QueryDefinition<T, U, IsAuth>, "fn">,
): QueryDefinition<T, U, IsAuth> {
  return { ...options, fn };
}

export function field<T, U, IsAuth extends boolean, Root>(
  fn: FieldResolverDefinition<T, U, Root, IsAuth>["fn"],
  options: Omit<FieldResolverDefinition<T, U, Root, IsAuth>, "fn">,
): FieldResolverDefinition<T, U, Root, IsAuth> {
  return { ...options, fn };
}

export function QueryLibrary<
  T extends Record<string, QueryDefinition<any, any, any>>,
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
  T extends Record<string, FieldResolverDefinition<any, any, X, any>> = Record<
    string,
    FieldResolverDefinition<any, any, X, any>
  >,
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

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

import { Context } from "./types";

type ReturnOptions = Parameters<typeof Query>[1];
type ArgsOptions = Parameters<typeof Arg>[2];

type Values = object | string | number | boolean;
type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K];
};

type OtherTypes<T> =
  | GraphQLScalarType<T, T>
  | [GraphQLScalarType<T, T>]
  | NumberConstructor
  | [NumberConstructor]
  | StringConstructor
  | [StringConstructor]
  | BooleanConstructor
  | [BooleanConstructor];

interface BaseDefinition<T extends Values, U extends Values> {
  output: T extends object
    ? ClassType<DeepPartial<T>> | [ClassType<DeepPartial<T>>]
    : OtherTypes<T>;
  outputOptions?: ReturnOptions;
  input?: U extends object ? ClassType<U> | [ClassType<U>] : OtherTypes<U>;
  inputOptions?: ArgsOptions;
  authorized?: boolean;
}
interface QueryDefinition<T extends Values, U extends Values>
  extends BaseDefinition<T, U> {
  fn: (ctx: Context, data: U) => Promise<T | T[]> | T | T[];
  mutation?: boolean;
}

interface FieldResolverDefinition<T extends Values, U extends Values, Root>
  extends BaseDefinition<T, U> {
  fn: (root: Root, ctx: Context, data: U) => Promise<T | T[]> | T | T[];
}

export function query<T extends Values, U extends Values>(
  fn: QueryDefinition<T, U>["fn"],
  options: Omit<QueryDefinition<T, U>, "fn">,
): QueryDefinition<T, U> {
  return { ...options, fn };
}

export function field<T extends Values, U extends Values, Root>(
  fn: FieldResolverDefinition<T, U, Root>["fn"],
  options: Omit<FieldResolverDefinition<T, U, Root>, "fn">,
): FieldResolverDefinition<T, U, Root> {
  return { ...options, fn };
}

export function QueryLibrary<
  T extends Record<string, QueryDefinition<any, any>>,
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
  T extends Record<string, FieldResolverDefinition<any, any, X>> = Record<
    string,
    FieldResolverDefinition<any, any, X>
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

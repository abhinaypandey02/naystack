import { NextResponse } from "next/server";

/**
 * Custom error handler for auth routes. Return a NextResponse to send a custom error; otherwise the default response is used.
 *
 * @param error - Object with `status` (HTTP code) and `message` (error text).
 * @returns NextResponse to override the default error, or undefined to use the default.
 *
 * @example
 * ```ts
 * const onError: ErrorHandler = ({ status, message }) => {
 *   if (status === 400) return NextResponse.json({ error: message }, { status: 400 });
 *   return undefined; // Use default handling
 * };
 * ```
 *
 * @category Auth
 */
export type ErrorHandler = (error: {
  status: number;
  message: string;
}) => NextResponse;

/**
 * Shape expected from `getUser` / `createUser` callbacks: at least `id` and optional `password` hash, plus any extra fields.
 *
 * @property id - User id (numeric primary key).
 * @property password - Bcrypt-hashed password, or `null` for OAuth-only users.
 *
 * @category Auth
 */
export type UserOutput = {
  id: number;
  password: string | null;
} & {
  [key: string]: unknown;
};

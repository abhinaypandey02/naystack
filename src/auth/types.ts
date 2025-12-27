import { NextResponse } from "next/server";

export type ErrorHandler = (error: {
  status: number;
  message: string;
}) => NextResponse;

export type UserOutput = {
  id: number;
  password: string | null;
} & {
  [key: string]: unknown;
};

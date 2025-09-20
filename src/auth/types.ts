import { NextResponse } from "next/server";

export type ErrorHandler = (error: {
  status: number;
  message: string;
}) => NextResponse;

export type UserInput = {
  email: string;
  password: string;
} & {
  [key: string]: unknown;
};
export type UserOutput = {
  id: number;
  email: string;
  password: string | null;
} & {
  [key: string]: unknown;
};

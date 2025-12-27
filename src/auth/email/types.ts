import { NextRequest } from "next/server";

import { ErrorHandler, UserInput, UserOutput } from "@/src/auth/types";

export type InitRoutesOptions = {
  getUser: (email: string) => Promise<UserOutput | undefined>;
  createUser: (user: UserInput) => Promise<UserOutput | undefined>;
  onError?: ErrorHandler;
  keys: AuthKeys;
  turnstileKey?: string;
  onSignUp?: (userId: number | null, req: NextRequest) => Promise<void>;
  onLogin?: (userId: number | null, req: NextRequest) => Promise<void>;
  onRefresh?: (userId: number | null, req: NextRequest) => Promise<void>;
  onLogout?: (userId: number | null, req: NextRequest) => Promise<void>;
};

export interface AuthKeys {
  signing: string;
  refresh: string;
}

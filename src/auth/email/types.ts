import { NextRequest } from "next/server";

import { ErrorHandler, UserOutput } from "@/src/auth/types";

export type InitRoutesOptions = {
  getUser: (data: object) => Promise<UserOutput | undefined>;
  createUser: (user: object) => Promise<UserOutput | undefined>;
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

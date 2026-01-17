import { ErrorHandler, UserOutput } from "@/src/auth/types";

export type InitRoutesOptions = {
  getUser: (data: any) => Promise<UserOutput | undefined>;
  createUser: (user: any) => Promise<UserOutput | undefined>;
  onError?: ErrorHandler;
  onSignUp?: (userId: number | null, body: any) => Promise<void>;
  onLogin?: (userId: number | null, body: any) => Promise<void>;
  onRefresh?: (userId: number | null, body: any) => Promise<void>;
  onLogout?: (userId: number | null, body: any) => Promise<void>;
};

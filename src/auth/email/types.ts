import { ErrorHandler, UserInput, UserOutput } from "@/src/auth/types";

export type InitRoutesOptions = {
  getUser: (email: string) => Promise<UserOutput | undefined>;
  createUser: (user: UserInput) => Promise<UserOutput | undefined>;
  onError?: ErrorHandler;
  signingKey: string;
  refreshKey: string;
  turnstileKey?: string;
  onSignUp: (user: UserOutput) => void;
  onLogout?: (body: string) => Promise<void>;
};

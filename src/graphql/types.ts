export interface Context {
  userId: number | null;
  isRefreshID?: boolean;
}
export interface AuthorizedContext {
  userId: number;
  isRefreshID?: boolean;
}

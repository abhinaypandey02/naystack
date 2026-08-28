/**
 * Types for Meta's Graph protocol — the request/response shape Instagram and
 * Threads share. Platforms outside Meta don't use these.
 *
 * @module
 */
/**
 * Query parameters for a Graph API request. Values are stringified and URL-encoded;
 * `undefined` entries are dropped, so optional params can be passed inline.
 *
 * @category Socials
 */
export type GraphParams = Record<string, string | number | boolean | undefined>;

/**
 * Meta Graph API error response shape (Instagram, Threads).
 *
 * @property error - Error details from the API (message, type, code, subcode, trace id).
 *
 * @category Socials
 */
export type GraphError = {
  error?: {
    message: string;
    type: string;
    code: number;
    error_subcode: number;
    fbtrace_id: string;
  };
};

/**
 * Processing status of a media container, before it can be published.
 * Shared vocabulary across Instagram (`status_code`) and Threads (`status`).
 *
 * @category Socials
 */
export type ContainerStatus =
  | "EXPIRED"
  | "ERROR"
  | "FINISHED"
  | "IN_PROGRESS"
  | "PUBLISHED";

/**
 * A container's processing status plus the API's reason when it failed.
 *
 * @category Socials
 */
export type ContainerState = {
  status: ContainerStatus;
  error?: string;
};

import { getFileUploadPutRoute } from "@/src/file/put";
import type { PutOverrides } from "@/src/file/utils";

/**
 * Options for setting up file upload via {@link setupFileUpload}.
 *
 * Every callback receives the same `{ type, userId, data }` context. **`data` is
 * optional** — it is whatever the caller passed as `config.data` to
 * `useFileUpload`, and the client only appends the form field when a value is
 * given, so the route parses it to `undefined` otherwise. Narrow it before use;
 * destructuring it unguarded throws at runtime.
 *
 * @property getKey - Optional. Given `{ type, userId, data }`, returns the S3 object key for the upload. If omitted, a UUID is generated.
 * @property processFile - Optional. Given the uploaded `file` and `{ type, userId, data }`, returns the blob to
 *   store in its place — e.g. re-encoding an image, or stripping metadata. Runs after authentication and before the
 *   S3 write, so only the returned bytes are ever stored. The blob's `type` becomes the object's `Content-Type`,
 *   so change it when the format changes. Return the file unchanged to leave it alone. Throwing fails the upload.
 * @property putOptions - Optional. Given `{ type, userId, data }`, returns fields to set on the S3 put —
 *   `CacheControl`, `ContentDisposition`, `Metadata` and so on. A function rather than a static object so
 *   headers can differ per upload kind. See {@link PutOverrides}.
 * @property onUpload - **Required.** Called after each successful upload with `{ url, type, userId, data }`.
 *   The return value is included in the API response as `onUploadResponse` (e.g. save metadata to your database and return it).
 *
 * @category File
 */
export interface SetupFileUploadOptions {
  getKey?: (data: {
    type: string;
    userId: number;
    data?: object;
  }) => Promise<string>;
  processFile?: (
    file: File,
    data: {
      type: string;
      userId: number;
      data?: object;
    },
  ) => Promise<Blob>;
  putOptions?: (data: {
    type: string;
    userId: number;
    data?: object;
  }) => PutOverrides;
  onUpload: (data: {
    url: string | null;
    type: string;
    userId: number;
    data?: object;
  }) => Promise<object>;
}

/**
 * Configures file upload for S3. Returns a `PUT` route handler (for the client to upload files) and server-side helpers.
 *
 * Mount the `PUT` handler on your file upload API route (e.g. `app/api/(rest)/file/route.ts`).
 * The client can then use `useFileUpload()` from `naystack/file/client` to upload files with the auth token.
 *
 * AWS credentials are read from env vars: `S3_ACCESS_KEY_ID`, `S3_ACCESS_KEY_SECRET`, `S3_REGION`, `S3_BUCKET`.
 *
 * @param options - Configuration. See {@link SetupFileUploadOptions}.
 * @returns Object with:
 *   - `PUT` — Next.js route handler for file uploads (auth required, multipart form).
 *   - `uploadFile(keys, { url?, blob? })` — Server-side: upload a file from URL or Blob to S3.
 *   - `deleteFile(url)` — Server-side: delete a file by its S3 URL.
 *   - `getUploadURL(keys)` — Server-side: get a presigned PUT URL (5-minute expiry).
 *   - `getDownloadURL(keys)` — Get the public download URL for a key.
 *
 * @example
 * ```ts
 * // app/api/(rest)/file/route.ts
 * import { setupFileUpload } from "naystack/file";
 *
 * export const { PUT } = setupFileUpload({
 *   onUpload: async ({ url, type, userId, data }) => {
 *     if (type === "DealDocument" && url) {
 *       // `data` is absent unless the client sent one — check before reading it.
 *       const payload = data as { dealId?: number; fileName?: string } | undefined;
 *       if (!payload?.dealId) return {};
 *       const [row] = await db.insert(DocumentsTable).values({
 *         dealId: payload.dealId, fileURL: url, fileName: payload.fileName,
 *       }).returning();
 *       return row ?? {};
 *     }
 *     return {};
 *   },
 *   // Optional: customize the S3 key (defaults to UUID)
 *   getKey: async ({ type, userId }) => `${type}/${userId}/${crypto.randomUUID()}`,
 * });
 * ```
 *
 * @category File
 */
export function setupFileUpload(options: SetupFileUploadOptions) {
  return {
    PUT: getFileUploadPutRoute(options),
  };
}

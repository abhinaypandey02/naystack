/**
 * File module: S3 upload setup, route handler, and server-side helpers.
 *
 * @example
 * ```ts
 * import { setupFileUpload } from "naystack/file";
 * ```
 *
 * @module
 */
export { setupFileUpload } from "./setup";
export { deleteFile, getDownloadURL, getUploadURL, uploadFile } from "./utils";

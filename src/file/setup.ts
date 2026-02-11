import { getFileUploadPutRoute } from "@/src/file/put";
import {
  deleteFile,
  getDownloadURL,
  getS3Client,
  getUploadURL,
  uploadFile,
} from "@/src/file/utils";

export interface SetupFileUploadOptions {
  getKey?: (data: {
    type: string;
    userId: number;
    data: object;
  }) => Promise<string>;
  onUpload: (data: {
    url: string | null;
    type: string;
    userId: number;
    data: object;
  }) => Promise<object>;
}

/**
 * Configures file upload: returns PUT route handler and server-side helpers (uploadFile, deleteFile, getUploadURL, getDownloadURL).
 * @param options - getKey and onUpload callbacks
 * @returns Object with PUT handler and utility functions
 */
export function setupFileUpload(options: SetupFileUploadOptions) {
  const client = getS3Client();
  return {
    PUT: getFileUploadPutRoute(options, client),
    uploadFile: uploadFile(client),
    deleteFile: deleteFile(client),
    getUploadURL: getUploadURL(client),
    getDownloadURL,
  };
}

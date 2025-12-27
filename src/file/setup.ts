import { getFileUploadPutRoute } from "@/src/file/put";
import {
  deleteFile,
  getDownloadURL,
  getS3Client,
  getUploadURL,
  uploadFile,
} from "@/src/file/utils";

import { AuthKeys } from "../auth/email/types";

export interface SetupFileUploadOptions {
  keys: AuthKeys;
  region: string;
  bucket: string;
  awsSecret: string;
  awsKey: string;
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
export function setupFileUpload(options: SetupFileUploadOptions) {
  const client = getS3Client(options);
  return {
    PUT: getFileUploadPutRoute(options, client),
    uploadFile: uploadFile(client, options),
    deleteFile: deleteFile(client, options),
    getUploadURL: getUploadURL(client, options.bucket),
    getDownloadURL: getDownloadURL(options),
  };
}

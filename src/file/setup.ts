import { getFileUploadPutRoute } from "@/src/file/put";
import {
  deleteImage,
  getFileURL,
  getS3Client,
  getUploadFileURL,
  uploadFile,
  uploadImage,
} from "@/src/file/utils";

export interface SetupFileUploadOptions {
  refreshKey: string;
  signingKey: string;
  region: string;
  bucket: string;
  awsSecret: string;
  awsKey: string;
  processFile: (data: {
    url: string | null;
    type: string;
    userId: number;
    data: object;
  }) => Promise<{ deleteURL?: string; response?: object }>;
}
export function setupFileUpload(options: SetupFileUploadOptions) {
  const client = getS3Client(options);
  return {
    PUT: getFileUploadPutRoute(options, client),
    getUploadFileURL: getUploadFileURL(client, options.bucket),
    uploadImage: uploadImage(client, options),
    deleteImage: deleteImage(client, options),
    getFileURL: getFileURL(options),
    uploadFile: uploadFile(client, options.bucket),
  };
}

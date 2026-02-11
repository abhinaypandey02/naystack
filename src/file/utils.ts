import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import { EnvVariable, getEnv } from "@/src/env";

/**
 * Creates an S3 client using env credentials (AWS_ACCESS_KEY_ID, AWS_ACCESS_KEY_SECRET, AWS_REGION).
 * @returns S3Client instance
 */
export const getS3Client = () =>
  new S3Client({
    region: getEnv(EnvVariable.AWS_REGION),
    credentials: {
      accessKeyId: getEnv(EnvVariable.AWS_ACCESS_KEY_ID),
      secretAccessKey: getEnv(EnvVariable.AWS_ACCESS_KEY_SECRET),
    },
  });

const URL_PREFIX = `https://${getEnv(EnvVariable.AWS_BUCKET)}.s3.${getEnv(
  EnvVariable.AWS_REGION,
)}.amazonaws.com/`;

function getKey(keys: string | string[]) {
  return typeof keys === "string" ? keys : keys.join("/");
}

/**
 * Returns a function that generates a presigned PUT URL for uploading to the given key(s).
 * @param client - S3 client
 * @returns (keys) => presigned URL (5min expiry)
 */
export const getUploadURL = (client: S3Client) => (keys: string | string[]) => {
  const command = new PutObjectCommand({
    Bucket: getEnv(EnvVariable.AWS_BUCKET),
    Key: getKey(keys),
    ACL: "public-read",
  });
  return getSignedUrl(client, command, { expiresIn: 300 });
};

/**
 * Builds the public download URL for one or more keys in the configured bucket.
 * @param keys - Key or key path (array joined by /)
 * @returns Full HTTPS URL
 */
export const getDownloadURL = (keys: string | string[]) => {
  return `${URL_PREFIX}${getKey(keys)}`;
};

/**
 * Returns a function that uploads a file (by URL or Blob) to the given key(s).
 * @param client - S3 client
 * @returns Async (keys, { url?, blob? }) => download URL or null
 */
export const uploadFile =
  (client: S3Client) =>
  async (
    keys: string | string[],
    {
      url,
      blob,
    }: {
      blob?: Blob;
      url?: string;
    },
  ) => {
    if (!blob && !url) return null;
    const fileBlob = blob || (await fetch(url!).then((file) => file.blob()));
    if (fileBlob) {
      const key = getKey(keys);
      await uploadBlob(client)(fileBlob, key);
      return getDownloadURL(key);
    }
    return null;
  };

/**
 * Returns a function that deletes an object by its full S3 URL.
 * @param client - S3 client
 * @returns Async (url) => true if deleted, false otherwise
 */
export const deleteFile = (client: S3Client) => async (url: string) => {
  const key = url.split(URL_PREFIX)[1];
  if (key) {
    try {
      await client.send(
        new DeleteObjectCommand({
          Bucket: getEnv(EnvVariable.AWS_BUCKET),
          Key: key,
        }),
      );
      return true;
    } catch (e) {
      console.error("ERROR", url, e);
    }
  }
  return false;
};

/**
 * Returns a function that uploads a Blob/File to S3 at the given key.
 * @param client - S3 client
 * @returns Async (file, key) => PutObjectCommand result
 */
export const uploadBlob =
  (client: S3Client) => async (file: File | Blob, key: string) => {
    const fileBuffer = await file.arrayBuffer();
    return client.send(
      new PutObjectCommand({
        Bucket: getEnv(EnvVariable.AWS_BUCKET),
        Key: key,
        ACL: "public-read",
        Body: Buffer.from(fileBuffer),
        ContentType: file.type,
        ContentLength: file.size,
      }),
    );
  };

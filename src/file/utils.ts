import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import { EnvVariable, getEnv } from "@/src/env";

/**
 * Creates an S3 client using env credentials (`AWS_ACCESS_KEY_ID`, `AWS_ACCESS_KEY_SECRET`, `AWS_REGION`).
 * @returns Configured `S3Client` instance.
 * @category File
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

/** Normalizes key(s) to a single string (array elements joined by `/`). */
function getKey(keys: string | string[]) {
  return typeof keys === "string" ? keys : keys.join("/");
}

/**
 * Returns a function that generates a presigned PUT URL for uploading to the given S3 key(s).
 * The presigned URL expires after 5 minutes.
 *
 * @param client - S3 client instance.
 * @returns `(keys: string | string[]) => Promise<string>` — the presigned upload URL.
 * @category File
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
 * Builds the public download URL for one or more keys in the configured S3 bucket.
 *
 * @param keys - S3 key or key path segments (array joined by `/`).
 * @returns Full HTTPS URL for the object.
 * @category File
 */
export const getDownloadURL = (keys: string | string[]) => {
  return `${URL_PREFIX}${getKey(keys)}`;
};

/**
 * Returns a function that uploads a file (by URL or Blob) to the given S3 key(s).
 *
 * @param client - S3 client instance.
 * @returns `(keys, { url?, blob? }) => Promise<string | null>` — the download URL on success, or `null` if no input.
 * @category File
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
 * Returns a function that deletes an S3 object by its full URL.
 *
 * @param client - S3 client instance.
 * @returns `(url: string) => Promise<boolean>` — `true` if deleted successfully, `false` otherwise.
 * @category File
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
 *
 * @param client - S3 client instance.
 * @returns `(file: File | Blob, key: string) => Promise<PutObjectCommandOutput>`.
 * @category File
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

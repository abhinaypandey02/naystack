import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import { EnvVariable, getEnv } from "@/src/env";

/**
 * S3 client initialised at module load using `AWS_ACCESS_KEY_ID`, `AWS_ACCESS_KEY_SECRET`, and `AWS_REGION`.
 * @category File
 */
const client = new S3Client({
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
 * Generates a presigned PUT URL for uploading a file to the given S3 key(s).
 * The URL expires after 5 minutes.
 *
 * @param keys - S3 key or key path segments (array joined by `/`).
 * @returns A presigned upload URL.
 * @category File
 */
export const getUploadURL = (keys: string | string[]) => {
  if (!checkClient(client)) return;

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
 * Uploads a file to S3 at the given key(s), either from a Blob or a remote URL.
 *
 * @param keys - S3 key or key path segments (array joined by `/`).
 * @param options.blob - A Blob/File to upload directly.
 * @param options.url - A remote URL to fetch and upload. Ignored if `blob` is provided.
 * @returns The public download URL of the uploaded file, or `null` if neither `blob` nor `url` was provided.
 * @category File
 */
export const uploadFile = async (
  keys: string | string[],
  {
    url,
    blob,
  }: {
    blob?: Blob;
    url?: string;
  },
) => {
  if (!checkClient(client)) return;

  if (!blob && !url) return null;
  const fileBlob = blob || (await fetch(url!).then((file) => file.blob()));
  if (fileBlob) {
    const key = getKey(keys);
    await uploadBlob(fileBlob, key);
    return getDownloadURL(key);
  }
  return null;
};

/**
 * Deletes an S3 object identified by its full public URL.
 *
 * @param url - The full public URL of the S3 object to delete.
 * @returns `true` if the object was deleted successfully, `false` otherwise.
 * @category File
 */
export const deleteFile = async (url: string) => {
  const key = url.split(URL_PREFIX)[1];
  if (!checkClient(client)) return;

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

function checkClient(client: S3Client | undefined): client is S3Client {
  if (!client) throw new Error("Client does not exist");
  return true;
}

/**
 * Uploads a Blob or File to S3 at the given key with public-read ACL.
 *
 * @param file - The Blob or File to upload.
 * @param key - The S3 object key.
 * @returns The `PutObjectCommandOutput` from S3.
 * @category File
 */
export const uploadBlob = async (file: File | Blob, key: string) => {
  if (!checkClient(client)) return;
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

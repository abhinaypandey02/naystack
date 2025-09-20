import { createHash } from "node:crypto";

import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { waitUntil } from "@vercel/functions";

import { SetupFileUploadOptions } from "@/src/file/setup";

export const getS3Client = (options: SetupFileUploadOptions) =>
  new S3Client({
    region: options.region,
    credentials: {
      accessKeyId: options.awsKey,
      secretAccessKey: options.awsSecret,
    },
  });

const getURLPrefix = (options: SetupFileUploadOptions) =>
  `https://${options.bucket}.s3.${options.region}.amazonaws.com/`;

function getHash(keys: string[]) {
  return createHash("sha256").update(keys.join("/")).digest("hex");
}

export const getUploadFileURL =
  (client: S3Client, Bucket: string) =>
  (keys: string[], isPublic?: boolean) => {
    const command = new PutObjectCommand({
      Bucket,
      Key: getHash(keys),
      ACL: isPublic ? "public-read" : undefined,
    });
    return getSignedUrl(client, command, { expiresIn: 300 });
  };
export const getFileURL =
  (options: SetupFileUploadOptions) => (keys: string | string[]) => {
    if (typeof keys === "string") return `${getURLPrefix(options)}${keys}`;
    return `${getURLPrefix(options)}${getHash(keys)}`;
  };

export const uploadImage =
  (client: S3Client, options: SetupFileUploadOptions) =>
  async (url: string, key: string[], blob?: Blob) => {
    const photoBlob = blob || (await fetch(url).then((file) => file.blob()));
    if (photoBlob) {
      waitUntil(uploadFile(client, options.bucket)(photoBlob, getHash(key)));
      return getFileURL(options)(key);
    }
    return null;
  };

export const deleteImage =
  (client: S3Client, options: SetupFileUploadOptions) =>
  async (url: string) => {
    const key = url.split(getURLPrefix(options))[1];
    if (key) {
      try {
        await client.send(
          new DeleteObjectCommand({
            Bucket: options.bucket,
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

export const uploadFile =
  (client: S3Client, Bucket: string) =>
  async (file: File | Blob, key: string) => {
    const fileBuffer = await file.arrayBuffer();
    return client.send(
      new PutObjectCommand({
        Bucket,
        Key: key,
        ACL: "public-read",
        Body: Buffer.from(fileBuffer),
        ContentType: file.type,
        ContentLength: file.size,
      }),
    );
  };

import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

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

function getKey(keys: string | string[]) {
  return typeof keys === "string" ? keys : keys.join("/");
}

export const getUploadURL =
  (client: S3Client, Bucket: string) => (keys: string | string[]) => {
    const command = new PutObjectCommand({
      Bucket,
      Key: getKey(keys),
      ACL: "public-read",
    });
    return getSignedUrl(client, command, { expiresIn: 300 });
  };
export const getDownloadURL =
  (options: SetupFileUploadOptions) => (keys: string | string[]) => {
    return `${getURLPrefix(options)}${getKey(keys)}`;
  };

export const uploadFile =
  (client: S3Client, options: SetupFileUploadOptions) =>
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
      await uploadBlob(client, options.bucket)(fileBlob, key);
      return getDownloadURL(options)(key);
    }
    return null;
  };

export const deleteFile =
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

export const uploadBlob =
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

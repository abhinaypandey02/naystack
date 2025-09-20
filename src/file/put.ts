import { S3Client } from "@aws-sdk/client-s3";
import { waitUntil } from "@vercel/functions";
import { NextRequest, NextResponse } from "next/server";
import { v4 } from "uuid";

import { getUserContext } from "@/src/auth/email/utils";
import { SetupFileUploadOptions } from "@/src/file/setup";
import { deleteImage, getFileURL, uploadFile } from "@/src/file/utils";

export const getFileUploadPutRoute =
  (options: SetupFileUploadOptions, client: S3Client) =>
  async (req: NextRequest) => {
    const ctx = getUserContext(options.refreshKey, options.signingKey, req);
    if (!ctx?.accessUserId)
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    const formData = await req.formData();

    const type = formData.get("type");
    const sync = Boolean(formData.get("sync"));
    const file = formData.get("file") as File | undefined;
    const data = formData.get("data");

    const imageKey = v4();
    const url = file ? getFileURL(options)(imageKey) : null;
    const handleKeyProcessing = async () => {
      if (file) await uploadFile(client, options.bucket)(file, imageKey);
      if (!type || !ctx.accessUserId) return;
      const { deleteURL, response } = await options.processFile({
        url,
        type: type as string,
        userId: ctx.accessUserId,
        data: typeof data === "string" ? JSON.parse(data) : undefined,
      });
      if (deleteURL) await deleteImage(client, options)(deleteURL);
      return response;
    };

    if (!sync) {
      waitUntil(handleKeyProcessing());
      return NextResponse.json({ url });
    } else {
      return NextResponse.json({
        url,
        response: await handleKeyProcessing(),
      });
    }
  };

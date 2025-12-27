import { S3Client } from "@aws-sdk/client-s3";
import { NextRequest, NextResponse } from "next/server";
import { v4 } from "uuid";

import { getContext } from "@/src/auth/email/utils";
import { SetupFileUploadOptions } from "@/src/file/setup";
import { getDownloadURL, uploadBlob } from "@/src/file/utils";

export const getFileUploadPutRoute =
  (options: SetupFileUploadOptions, client: S3Client) =>
  async (req: NextRequest) => {
    const ctx = getContext(options.refreshKey, options.signingKey, req);
    if (!ctx?.userId || ctx.isRefreshID)
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    const formData = await req.formData();

    const file = formData.get("file") as File | undefined;
    if (!file) return NextResponse.json({ error: "no file" }, { status: 400 });

    const data = formData.get("data");

    const inputData = {
      type: formData.get("type") + "",
      userId: ctx.userId,
      data: typeof data === "string" ? JSON.parse(data) : undefined,
    };

    const fileKey = options.getKey ? await options.getKey(inputData) : v4();
    const url = getDownloadURL(options)(fileKey);
    await uploadBlob(client, options.bucket)(file, fileKey);
    const onUploadResponse = await options.onUpload({
      ...inputData,
      url,
    });
    return NextResponse.json({
      url,
      onUploadResponse,
    });
  };

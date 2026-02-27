import { waitUntil } from "@vercel/functions";
import { NextRequest, NextResponse } from "next/server";
import { v4 } from "uuid";

import { getContext } from "@/src/auth/email/utils";
import { SetupFileUploadOptions } from "@/src/file/setup";
import { getDownloadURL, uploadBlob } from "@/src/file/utils";

/**
 * Returns the PUT route handler for file upload.
 *
 * Requires authentication (Bearer token, not refresh cookie).
 * Expects multipart form data with fields: `file` (File), `type` (string), and optional `data` (JSON string).
 *
 * @param options - `SetupFileUploadOptions` (getKey, onUpload).
 * @returns Async Next.js route handler for PUT requests.
 * @category File
 */
export const getFileUploadPutRoute =
  (options: SetupFileUploadOptions) => async (req: NextRequest) => {
    const ctx = getContext(req);
    if (!ctx?.userId || ctx.isRefreshID)
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    const formData = await req.formData();

    const file = formData.get("file") as File | undefined;
    if (!file) return NextResponse.json({ error: "no file" }, { status: 400 });

    const data = formData.get("data");
    const async = formData.get("async");

    const inputData = {
      type: formData.get("type") + "",
      userId: ctx.userId,
      data: typeof data === "string" ? JSON.parse(data) : undefined,
    };

    const fileKey = options.getKey ? await options.getKey(inputData) : v4();
    const url = getDownloadURL(fileKey);

    if (async) waitUntil(uploadBlob(file, fileKey));
    else await uploadBlob(file, fileKey);

    const onUploadResponse = await options.onUpload({
      ...inputData,
      url,
    });
    return NextResponse.json({
      url,
      onUploadResponse,
    });
  };

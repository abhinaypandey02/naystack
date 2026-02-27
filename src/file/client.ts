import { useToken } from "naystack/auth/email/client";

import { EnvVariable, getEnv } from "@/src/env";

/**
 * Returns a function that uploads a file to your file upload endpoint with the current auth token.
 * Must be used inside a tree that provides the token (i.e. inside `AuthWrapper`).
 *
 * The endpoint is read from `NEXT_PUBLIC_FILE_ENDPOINT` env var. The file is sent as multipart form data
 * along with a `type` string and optional JSON `data` for metadata.
 *
 * @returns A function `(file, type, data?) => Promise<FileUploadResponseType | null>`.
 *   - `file` — `File` or `Blob` to upload.
 *   - `type` — String category (e.g. `"avatar"`, `"DealDocument"`); sent as form field `type`.
 *   - `data` — Optional JSON-serializable object for metadata; sent as form field `data`.
 *   Resolves to the JSON response `{ url, onUploadResponse }` or `null`.
 *
 * @example
 * ```tsx
 * import { useFileUpload } from "naystack/file/client";
 *
 * function FileUploader({ dealId }: { dealId: number }) {
 *   const uploadFile = useFileUpload();
 *   const [uploading, setUploading] = useState(false);
 *
 *   const handleUpload = async (file: File) => {
 *     setUploading(true);
 *     try {
 *       const result = await uploadFile(file, "DealDocument", {
 *         dealId,
 *         fileName: file.name,
 *         category: "Contract",
 *       });
 *       if (result?.url) {
 *         console.log("Uploaded:", result.url);
 *         router.refresh();
 *       }
 *     } finally {
 *       setUploading(false);
 *     }
 *   };
 *
 *   return <input type="file" onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])} />;
 * }
 * ```
 *
 * @category File
 */
export const useFileUpload = () => {
  const token = useToken();
  return (
    file: File | Blob,
    type: string,
    config?: { data?: object; async?: boolean },
  ) => {
    const formData = new FormData();
    formData.append("type", type);
    formData.append("file", file);
    if (config?.async) formData.append("async", "true");
    if (config?.data) formData.append("data", JSON.stringify(config.data));
    return fetch(getEnv(EnvVariable.NEXT_PUBLIC_FILE_ENDPOINT), {
      method: "PUT",
      body: formData,
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }).then(
      async (res) => ((await res.json()) as FileUploadResponseType) || null,
    );
  };
};

/**
 * Shape of the JSON response from the file upload PUT endpoint.
 *
 * @property url - The public S3 URL of the uploaded file.
 * @property onUploadResponse - The return value from the `onUpload` callback in `setupFileUpload`.
 *
 * @category File
 */
export interface FileUploadResponseType {
  url?: string;
  data?: object | null;
}

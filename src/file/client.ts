import { useToken } from "naystack/auth/email/client";

import { EnvVariable, getEnv } from "@/src";

export const useFileUpload = () => {
  const token = useToken();
  return (file: File | Blob, type: string, data?: object) => {
    const formData = new FormData();
    formData.append("type", type);
    formData.append("file", file);
    if (data) formData.append("data", JSON.stringify(data));
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

interface FileUploadResponseType {
  url?: string;
  onUploadResponse?: object;
}

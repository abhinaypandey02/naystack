export const getHandleImageUpload =
  (route: string) =>
  ({
    file,
    type,
    token,
    data,
    sync,
  }: {
    file?: File | Blob;
    token: string;
    type: string;
    sync?: boolean;
    data?: object;
  }) => {
    const formData = new FormData();
    formData.append("type", type);
    if (file) formData.append("file", file);
    if (sync) formData.append("sync", sync.toString());
    if (data) formData.append("data", JSON.stringify(data));
    return fetch(route, {
      method: "PUT",
      body: formData,
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }).then(
      async (res) => ((await res.json()) as ImageUploadResponseType) || null,
    );
  };

export interface ImageUploadResponseType {
  url?: string;
  response?: object;
}

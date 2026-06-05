import { apiClient } from '../../../../lib/api-client';

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export async function uploadCategoryImage(file: File): Promise<string> {
  const dataUrl = await readFileAsDataUrl(file);
  const response = await apiClient.post<{ urls: string[] }>(
    '/api/v1/admin/products/upload-images',
    { images: [dataUrl] },
  );

  const url = response.urls?.[0];
  if (!url) {
    throw new Error('Image upload returned no URL');
  }

  return url;
}

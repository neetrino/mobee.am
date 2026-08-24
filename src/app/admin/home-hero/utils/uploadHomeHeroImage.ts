import { apiClient } from '@/lib/api-client';

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Upload a Home Hero image via the shared admin product upload API / R2 pipeline.
 * Replacing an image does not delete the previous R2 object.
 */
export async function uploadHomeHeroImage(file: File): Promise<string> {
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

import { apiClient } from '@/lib/api-client';
import { MAX_ADMIN_IMAGES_PER_REQUEST } from '@/lib/security/image-upload.constants';

const UPLOAD_ENDPOINT = '/api/v1/admin/products/upload-images';

/**
 * Uploads base64 data URLs via the admin image endpoint and returns public URLs in input order.
 */
export async function uploadProductImages(dataUrls: string[]): Promise<string[]> {
  const urls: string[] = [];
  for (let start = 0; start < dataUrls.length; start += MAX_ADMIN_IMAGES_PER_REQUEST) {
    const chunk = dataUrls.slice(start, start + MAX_ADMIN_IMAGES_PER_REQUEST);
    const response = await apiClient.post<{ urls: string[] }>(UPLOAD_ENDPOINT, { images: chunk });
    if (!Array.isArray(response.urls) || response.urls.length !== chunk.length) {
      throw new Error('Image upload returned unexpected URLs');
    }
    urls.push(...response.urls);
  }
  return urls;
}

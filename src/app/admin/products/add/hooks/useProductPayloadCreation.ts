import { apiClient } from '@/lib/api-client';
import { showToast } from '@/components/Toast';
import { invalidateAdminSessionCacheByPrefix } from '@/lib/admin/admin-session-cache';
import type { PartialProductUpdateInput } from '@/lib/schemas/admin-product-update.schema';
import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';
import type { ProductWarrantyYears } from '@/lib/constants/product-warranty';
import { hasPartialUpdateWork } from '../utils/productUpdateDiff';

const ADMIN_PRODUCTS_LIST_CACHE_PREFIX = '/supersudo/products';

function invalidateProductsListCache(): void {
  invalidateAdminSessionCacheByPrefix(ADMIN_PRODUCTS_LIST_CACHE_PREFIX);
}

interface CreateAndSubmitPayloadProps {
  formData: {
    title: string;
    slug: string;
    descriptionHtml: string;
    categoryIds: string[];
    published: boolean;
    featured: boolean;
    warrantyYears: ProductWarrantyYears | null;
    imageUrls: string[];
    featuredImageIndex: number;
    mainProductImage: string;
    labels: Array<{
      id?: string;
      type: string;
      value: string;
      position: string;
      color?: string | null;
    }>;
  };
  finalBrandIds: string[];
  finalPrimaryCategoryId: string;
  variants: Array<{
    price: number;
    compareAtPrice?: number | null;
    stock: number;
    sku: string;
    imageUrl?: string | null;
    published?: boolean;
    options?: Array<{ attributeKey: string; value: string; valueId?: string }>;
  }>;
  attributeIds: string[];
  finalMedia: string[];
  mainImage: string | null;
  isEditMode: boolean;
  productId: string | null;
  creationMessages: string[];
  setLoading: (loading: boolean) => void;
  router: AppRouterInstance;
  partialPayload?: PartialProductUpdateInput;
}

/** Toast duration when post-save `creationMessages` are shown (longer copy). */
const PRODUCT_SAVE_TOAST_WITH_EXTRA_LINES_MS = 5500;

export async function createAndSubmitPayload({
  formData,
  finalBrandIds,
  finalPrimaryCategoryId,
  variants,
  attributeIds,
  finalMedia,
  mainImage,
  isEditMode,
  productId,
  creationMessages,
  setLoading,
  router,
  partialPayload,
}: CreateAndSubmitPayloadProps): Promise<void> {
  const baseMessage = isEditMode
    ? 'Ապրանքը հաջողությամբ թարմացվեց!'
    : 'Ապրանքը հաջողությամբ ստեղծվեց!';
  const extra = creationMessages.length ? `\n\n${creationMessages.join('\n')}` : '';
  const toastDuration = creationMessages.length ? PRODUCT_SAVE_TOAST_WITH_EXTRA_LINES_MS : undefined;

  try {
    if (isEditMode && productId && partialPayload) {
      if (!hasPartialUpdateWork(partialPayload)) {
        showToast(baseMessage, 'success', toastDuration);
        router.push('/supersudo/products');
        return;
      }

      const product = await apiClient.put(`/api/v1/admin/products/${productId}`, partialPayload);
      console.log('✅ [ADMIN] Product partially updated:', product);
      invalidateProductsListCache();
      showToast(`${baseMessage}${extra}`, 'success', toastDuration);
      router.push('/supersudo/products');
      return;
    }

    const payload: Record<string, unknown> = {
      title: formData.title,
      slug: formData.slug,
      descriptionHtml: formData.descriptionHtml || undefined,
      brandId: finalBrandIds.length > 0 ? finalBrandIds[0] : undefined,
      primaryCategoryId: finalPrimaryCategoryId || undefined,
      categoryIds: formData.categoryIds.length > 0 ? formData.categoryIds : undefined,
      published: isEditMode ? formData.published : true,
      featured: formData.featured,
      warrantyYears: formData.warrantyYears,
      locale: 'en',
      variants,
      attributeIds: attributeIds.length > 0 ? attributeIds : undefined,
    };

    if (finalMedia.length > 0) {
      payload.media = finalMedia;
    }

    if (mainImage) {
      payload.mainProductImage = mainImage;
    }

    payload.labels = (formData.labels || [])
      .filter((label) => label.value && label.value.trim() !== '')
      .map((label) => ({
        type: label.type,
        value: label.value.trim(),
        position: label.position,
        color: label.color || null,
      }));

    if (isEditMode && productId) {
      const product = await apiClient.put(`/api/v1/admin/products/${productId}`, payload);
      console.log('✅ [ADMIN] Product updated:', product);
    } else {
      const product = await apiClient.post('/api/v1/admin/products', payload);
      console.log('✅ [ADMIN] Product created:', product);
    }

    invalidateProductsListCache();
    showToast(`${baseMessage}${extra}`, 'success', toastDuration);
    router.push('/supersudo/products');
  } catch (err: unknown) {
    console.error('❌ [ADMIN] Error saving product:', err);

    let errorMessage = isEditMode ? 'Չհաջողվեց թարմացնել ապրանքը' : 'Չհաջողվեց ստեղծել ապրանքը';
    const errorRecord = err as {
      data?: { detail?: string };
      response?: { data?: { detail?: string } };
      message?: string;
    };

    if (errorRecord.data?.detail) {
      errorMessage = errorRecord.data.detail;
    } else if (errorRecord.response?.data?.detail) {
      errorMessage = errorRecord.response.data.detail;
    } else if (errorRecord.message) {
      if (errorRecord.message.includes('<!DOCTYPE') || errorRecord.message.includes('<html')) {
        const mongoErrorMatch = errorRecord.message.match(/MongoServerError[^<]+/);
        errorMessage = mongoErrorMatch
          ? `Տվյալների բազայի սխալ: ${mongoErrorMatch[0]}`
          : 'Տվյալների բազայի սխալ: SKU-ն արդեն օգտագործված է կամ այլ սխալ:';
      } else {
        errorMessage = errorRecord.message;
      }
    }

    console.error(errorMessage);
    throw err;
  } finally {
    setLoading(false);
  }
}

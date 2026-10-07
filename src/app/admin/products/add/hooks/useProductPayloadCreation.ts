import { apiClient } from '@/lib/api-client';
import { showToast } from '@/components/Toast';
import { invalidateAdminSessionCacheByPrefix } from '@/lib/admin/admin-session-cache';
import type { PartialProductUpdateInput } from '@/lib/schemas/admin-product-update.schema';
import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';
import type { ProductWarrantyYears } from '@/lib/constants/product-warranty';
import { hasPartialUpdateWork } from '../utils/productUpdateDiff';
import type { ProductTranslationWrite } from '../utils/productTranslationDrafts';
import type { AdminContentLocale } from '@/lib/admin/admin-content-locale';

const ADMIN_PRODUCTS_LIST_CACHE_PREFIX = '/supersudo/products';
const TRANSLATIONS_SYNC_FAILED_MESSAGE = 'Ապրանքը պահպանվեց, բայց որոշ թարգմանություններ չթարմացվեցին';

/**
 * Writes changed locale translations in parallel (each is an independent row).
 * Returns false when any write failed; the product itself is already saved.
 */
async function syncTranslations(productId: string, writes: ProductTranslationWrite[]): Promise<boolean> {
  if (writes.length === 0) {
    return true;
  }
  const results = await Promise.allSettled(
    writes.map((write) => apiClient.put(`/api/v1/admin/products/${productId}`, write)),
  );
  const failed = results.filter((result) => result.status === 'rejected');
  if (failed.length > 0) {
    console.error('❌ [ADMIN] Translation sync failed:', failed);
  }
  return failed.length === 0;
}

function extractCreatedProductId(product: unknown): string | null {
  if (!product || typeof product !== 'object') {
    return null;
  }
  const record = product as { id?: unknown; data?: { id?: unknown } };
  if (typeof record.id === 'string') {
    return record.id;
  }
  return typeof record.data?.id === 'string' ? record.data.id : null;
}

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
  onExit?: () => void;
  partialPayload?: PartialProductUpdateInput;
  locale: AdminContentLocale;
  translationWrites: ProductTranslationWrite[];
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
  onExit,
  partialPayload,
  locale,
  translationWrites,
}: CreateAndSubmitPayloadProps): Promise<void> {
  const baseMessage = isEditMode
    ? 'Ապրանքը հաջողությամբ թարմացվեց!'
    : 'Ապրանքը հաջողությամբ ստեղծվեց!';
  const extra = creationMessages.length ? `\n\n${creationMessages.join('\n')}` : '';
  const toastDuration = creationMessages.length ? PRODUCT_SAVE_TOAST_WITH_EXTRA_LINES_MS : undefined;

  const finishSave = (translationsSynced: boolean): void => {
    invalidateProductsListCache();
    if (translationsSynced) {
      showToast(`${baseMessage}${extra}`, 'success', toastDuration);
    } else {
      showToast(TRANSLATIONS_SYNC_FAILED_MESSAGE, 'warning');
    }
    if (onExit) {
      onExit();
      return;
    }
    router.push('/supersudo/products');
  };

  try {
    if (isEditMode && productId && partialPayload) {
      const hasProductWork = hasPartialUpdateWork(partialPayload);
      if (!hasProductWork && translationWrites.length === 0) {
        showToast(baseMessage, 'success', toastDuration);
        if (onExit) {
          onExit();
          return;
        }
        router.push('/supersudo/products');
        return;
      }

      if (hasProductWork) {
        const product = await apiClient.put(`/api/v1/admin/products/${productId}`, partialPayload);
        console.log('✅ [ADMIN] Product partially updated:', product);
      }
      finishSave(await syncTranslations(productId, translationWrites));
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
      locale,
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

    let savedProductId = productId;
    if (isEditMode && productId) {
      const product = await apiClient.put(`/api/v1/admin/products/${productId}`, payload);
      console.log('✅ [ADMIN] Product updated:', product);
    } else {
      const product = await apiClient.post('/api/v1/admin/products', payload);
      console.log('✅ [ADMIN] Product created:', product);
      savedProductId = extractCreatedProductId(product);
    }

    const translationsSynced = savedProductId
      ? await syncTranslations(savedProductId, translationWrites)
      : translationWrites.length === 0;
    finishSave(translationsSynced);
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

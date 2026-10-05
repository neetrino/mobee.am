'use client';

import type { ChangeEvent } from 'react';
import { useTranslation } from '../../../../../lib/i18n-client';

interface VariantImagesCellProps {
  variantId: string;
  images: string[];
  imageUploadLoading: boolean;
  inputRef: (el: HTMLInputElement | null) => void;
  onPickFiles: () => void;
  onUpload: (variantId: string, event: ChangeEvent<HTMLInputElement>) => void;
  onRemove: (imageUrl: string) => void;
}

export function VariantImagesCell({
  variantId,
  images,
  imageUploadLoading,
  inputRef,
  onPickFiles,
  onUpload,
  onRemove,
}: VariantImagesCellProps) {
  const { t } = useTranslation();

  return (
    <div className="flex max-w-[220px] flex-wrap items-center gap-2">
      {images.map((imageUrl, index) => (
        <div key={imageUrl} className="relative inline-block">
          <img
            src={imageUrl}
            alt={`Variant image ${index + 1}`}
            className="h-12 w-12 rounded-supersudo border border-gray-300 object-cover"
          />
          <button
            type="button"
            onClick={() => onRemove(imageUrl)}
            className="absolute -right-1 -top-1 rounded-full bg-admin-500 p-0.5 text-white transition-colors hover:bg-admin-600"
            title={t('admin.products.add.removeImage')}
          >
            <svg className="h-2.5 w-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={onPickFiles}
        disabled={imageUploadLoading}
        title={t('admin.products.add.uploadImage')}
        className="flex h-12 w-12 cursor-pointer items-center justify-center rounded-supersudo border border-dashed border-admin-500 text-admin-600 hover:bg-admin-50 focus:outline-none focus:ring-2 focus:ring-admin-400 disabled:cursor-default disabled:opacity-50"
      >
        {imageUploadLoading ? (
          <span className="text-[10px]">{t('admin.products.add.uploading')}</span>
        ) : (
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        )}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={(e) => onUpload(variantId, e)}
        className="hidden"
      />
    </div>
  );
}

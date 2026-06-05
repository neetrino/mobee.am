'use client';

import Image from 'next/image';
import { useRef, useState } from 'react';
import { Button } from '@/app/admin/lib/adminShopUi';
import { useTranslation } from '../../../../lib/i18n-client';
import { showToast } from '../../../../components/Toast';
import { uploadCategoryImage } from '../utils/uploadCategoryImage';

interface CategoryImageFieldProps {
  imageUrl: string | null;
  onChange: (imageUrl: string | null) => void;
}

export function CategoryImageField({ imageUrl, onChange }: CategoryImageFieldProps) {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    if (!file.type.startsWith('image/')) {
      return;
    }

    try {
      setUploading(true);
      const url = await uploadCategoryImage(file);
      onChange(url);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : t('admin.categories.errorUpdating');
      showToast(message, 'error');
    } finally {
      setUploading(false);
      if (event.target) {
        event.target.value = '';
      }
    }
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {t('admin.categories.categoryImage')}
      </label>
      <div className="flex items-center gap-3">
        <div className="relative size-16 overflow-hidden rounded-supersudo border border-gray-200 bg-gray-50">
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt=""
              fill
              sizes="64px"
              className="object-contain"
            />
          ) : (
            <div className="flex size-full items-center justify-center text-xs text-gray-400">
              {t('admin.categories.noImage')}
            </div>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
          >
            {uploading ? t('admin.categories.uploadingImage') : t('admin.categories.uploadImage')}
          </Button>
          {imageUrl ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-red-600 hover:text-red-800"
              onClick={() => onChange(null)}
            >
              {t('admin.categories.removeImage')}
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

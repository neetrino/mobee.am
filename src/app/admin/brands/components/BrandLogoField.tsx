'use client';

import Image from 'next/image';
import { useRef, useState } from 'react';
import { Button } from '@/app/admin/lib/adminShopUi';
import { useTranslation } from '../../../../lib/i18n-client';
import { showToast } from '../../../../components/Toast';
import { uploadBrandLogo } from '../utils/uploadBrandLogo';

type BrandLogoFieldProps = {
  logoUrl: string | null;
  onChange: (logoUrl: string | null) => void;
};

export function BrandLogoField({ logoUrl, onChange }: BrandLogoFieldProps) {
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
      const url = await uploadBrandLogo(file);
      onChange(url);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : t('admin.brands.errorSaving');
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
      <label className="mb-2 block text-sm font-medium text-gray-700">
        {t('admin.brands.logo')}
      </label>
      <div className="flex items-center gap-3">
        <div className="relative size-16 overflow-hidden rounded-supersudo border border-gray-200 bg-gray-50">
          {logoUrl ? (
            <Image
              src={logoUrl}
              alt=""
              fill
              sizes="64px"
              className="object-contain"
            />
          ) : (
            <div className="flex size-full items-center justify-center text-xs text-gray-400">
              {t('admin.brands.noLogo')}
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
            {uploading ? t('admin.brands.uploadingLogo') : t('admin.brands.uploadLogo')}
          </Button>
          {logoUrl ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-red-600 hover:text-red-800"
              onClick={() => onChange(null)}
            >
              {t('admin.brands.removeLogo')}
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

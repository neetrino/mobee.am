'use client';

import { useState, type ChangeEvent } from 'react';
import { Input } from '@shop/ui';
import { useTranslation } from '../../../../../lib/i18n-client';

interface BasicInformationProps {
  productType: 'simple' | 'variable';
  setProductType: (type: 'simple' | 'variable') => void;
  title: string;
  slug: string;
  descriptionHtml: string;
  isEditMode: boolean;
  onTitleChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onSlugChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onDescriptionChange: (e: ChangeEvent<HTMLTextAreaElement>) => void;
}

export function BasicInformation({
  productType,
  setProductType,
  title,
  slug,
  descriptionHtml,
  isEditMode,
  onTitleChange,
  onSlugChange,
  onDescriptionChange,
}: BasicInformationProps) {
  const { t } = useTranslation();
  const [slugSectionOpen, setSlugSectionOpen] = useState(isEditMode);

  const typeButtonClass = (active: boolean) =>
    `flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
      active ? 'bg-admin-500 text-white shadow-sm' : 'text-gray-600 hover:text-gray-900'
    }`;

  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-900 mb-4">{t('admin.products.add.basicInformation')}</h2>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('admin.products.add.title')} *
          </label>
          <Input
            type="text"
            value={title}
            onChange={onTitleChange}
            required
            placeholder={t('admin.products.add.productTitlePlaceholder')}
          />
        </div>

        <div>
          <span className="block text-sm font-medium text-gray-700 mb-1">{t('admin.products.add.productType')} *</span>
          <p className="text-xs text-gray-500 mb-2">{t('admin.products.add.productTypeHintShort')}</p>
          <div className="inline-flex w-full max-w-md rounded-lg border border-gray-200 bg-gray-50 p-0.5">
            <button
              type="button"
              className={typeButtonClass(productType === 'simple')}
              onClick={() => setProductType('simple')}
            >
              {t('admin.products.add.productTypeSimple')}
            </button>
            <button
              type="button"
              className={typeButtonClass(productType === 'variable')}
              onClick={() => setProductType('variable')}
            >
              {t('admin.products.add.productTypeVariable')}
            </button>
          </div>
        </div>

        <details
          className="rounded-lg border border-gray-200 bg-gray-50/80 px-3 py-2"
          open={slugSectionOpen}
          onToggle={(event) => {
            setSlugSectionOpen(event.currentTarget.open);
          }}
        >
          <summary className="cursor-pointer select-none text-sm font-medium text-gray-800">
            {t('admin.products.add.urlSlugSection')}
          </summary>
          <div className="mt-3 pb-1">
            <label className="block text-xs font-medium text-gray-600 mb-1">{t('admin.products.add.slug')} *</label>
            <Input
              type="text"
              value={slug}
              onChange={onSlugChange}
              required
              placeholder={t('admin.products.add.productSlugPlaceholder')}
            />
          </div>
        </details>

        <details className="rounded-lg border border-gray-200 bg-gray-50/80 px-3 py-2">
          <summary className="cursor-pointer select-none text-sm font-medium text-gray-800">
            {t('admin.products.add.descriptionOptionalSection')}
          </summary>
          <div className="mt-3 pb-1">
            <label className="block text-xs font-medium text-gray-600 mb-1">{t('admin.products.add.description')}</label>
            <textarea
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-admin"
              rows={5}
              value={descriptionHtml}
              onChange={onDescriptionChange}
              placeholder={t('admin.products.add.productDescriptionPlaceholder')}
            />
          </div>
        </details>
      </div>
    </div>
  );
}



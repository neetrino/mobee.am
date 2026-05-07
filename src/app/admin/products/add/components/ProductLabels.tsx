'use client';

import { Button, Input } from '@shop/ui';
import { useTranslation } from '../../../../../lib/i18n-client';
import type { ProductLabel } from '../types';

interface ProductLabelsProps {
  labels: ProductLabel[];
  embedded?: boolean;
  onAddLabel: () => void;
  onRemoveLabel: (index: number) => void;
  onUpdateLabel: (index: number, field: keyof ProductLabel, value: ProductLabel[keyof ProductLabel]) => void;
}

export function ProductLabels({
  labels,
  embedded = false,
  onAddLabel,
  onRemoveLabel,
  onUpdateLabel,
}: ProductLabelsProps) {
  const { t } = useTranslation();
  const titleClass = embedded ? 'text-lg font-semibold text-gray-900' : 'text-xl font-semibold text-gray-900';
  const TitleTag = embedded ? 'h3' : 'h2';

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <TitleTag className={titleClass}>{t('admin.products.add.productLabels')}</TitleTag>
        <Button type="button" variant="outline" onClick={onAddLabel}>
          {t('admin.products.add.addLabel')}
        </Button>
      </div>
      {labels.length === 0 ? (
        <div className="text-center py-4 border-2 border-dashed border-gray-300 rounded-lg">
          <p className="text-gray-500 mb-2">{t('admin.products.add.noLabelsAdded')}</p>
          <p className="text-sm text-gray-400">{t('admin.products.add.addLabelsHint')}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {labels.map((label, index) => (
            <div key={index} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  {t('admin.products.add.label').replace('{index}', (index + 1).toString())}
                </h3>
                <Button type="button" variant="ghost" onClick={() => onRemoveLabel(index)} className="text-admin-600 hover:text-admin-800">
                  {t('admin.products.add.remove')}
                </Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Label Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('admin.products.add.type')} *
                  </label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-admin"
                    value={label.type}
                    onChange={(e) => onUpdateLabel(index, 'type', e.target.value as 'text' | 'percentage')}
                    required
                  >
                    <option value="text">{t('admin.products.add.textType')}</option>
                    <option value="percentage">{t('admin.products.add.percentageType')}</option>
                  </select>
                </div>

                {/* Label Value */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('admin.products.add.value')} *
                  </label>
                  <Input
                    type="text"
                    value={label.value}
                    onChange={(e) => onUpdateLabel(index, 'value', e.target.value)}
                    placeholder={
                      label.type === 'percentage' ? t('admin.products.add.percentagePlaceholder') : t('admin.products.add.newProductLabel')
                    }
                    required
                    className="w-full"
                  />
                  {label.type === 'percentage' && (
                    <p className="mt-1 text-xs text-admin-600 font-medium">{t('admin.products.add.percentageAutoUpdateHint')}</p>
                  )}
                </div>

                {/* Label Position */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('admin.products.add.position')} *
                  </label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-admin"
                    value={label.position}
                    onChange={(e) => onUpdateLabel(index, 'position', e.target.value)}
                    required
                  >
                    <option value="top-left">{t('admin.products.add.topLeft')}</option>
                    <option value="top-right">{t('admin.products.add.topRight')}</option>
                    <option value="bottom-left">{t('admin.products.add.bottomLeft')}</option>
                    <option value="bottom-right">{t('admin.products.add.bottomRight')}</option>
                  </select>
                </div>

                {/* Label Color (Optional) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('admin.products.add.colorOptional')}
                  </label>
                  <Input
                    type="text"
                    value={label.color || ''}
                    onChange={(e) => onUpdateLabel(index, 'color', e.target.value || null)}
                    placeholder={t('admin.products.add.colorHexPlaceholder')}
                    className="w-full"
                  />
                  <p className="mt-1 text-xs text-gray-500">{t('admin.products.add.hexColorHint')}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}



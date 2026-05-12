'use client';

import { Button, Input } from '@/app/admin/lib/adminShopUi';
import { useTranslation } from '../../../../lib/i18n-client';
interface GlobalDiscountCardProps {
  globalDiscount: number;
  setGlobalDiscount: (value: number) => void;
  discountLoading: boolean;
  discountSaving: boolean;
  handleDiscountSave: () => void;
}

export function GlobalDiscountCard({
  globalDiscount,
  setGlobalDiscount,
  discountLoading,
  discountSaving,
  handleDiscountSave,
}: GlobalDiscountCardProps) {
  const { t } = useTranslation();

  return (
    <div className="bg-white rounded-supersudo p-4 border border-gray-200">
      <div className="flex items-center gap-2 mb-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-admin-100">
          <svg className="h-5 w-5 text-admin-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{t('admin.quickSettings.globalDiscount')}</h3>
          <p className="text-xs text-gray-500">{t('admin.quickSettings.forAllProducts')}</p>
        </div>
      </div>

      {discountLoading ? (
        <div className="animate-pulse">
          <div className="h-10 bg-gray-200 rounded-supersudo"></div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <Input
              type="number"
              min="0"
              max="100"
              step="0.1"
              value={globalDiscount}
              onChange={(e) => {
                const value = e.target.value;
                setGlobalDiscount(value === '' ? 0 : parseFloat(value) || 0);
              }}
              className="flex-1"
              placeholder="0"
            />
            <span className="text-sm font-medium text-gray-700 w-8">%</span>
            <Button
              variant="admin"
              onClick={handleDiscountSave}
              disabled={discountSaving}
              className="px-6"
            >
              {discountSaving ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>{t('admin.quickSettings.saving')}</span>
                </div>
              ) : (
                t('admin.quickSettings.save')
              )}
            </Button>
          </div>

          {globalDiscount > 0 ? (
            <div className="p-3 bg-green-50 border border-green-200 rounded-supersudo">
              <p className="text-sm text-green-800">
                <strong>{t('admin.quickSettings.active')}</strong> {t('admin.quickSettings.discountApplied').replace('{percent}', globalDiscount.toString())}
              </p>
            </div>
          ) : (
            <div className="p-3 bg-gray-50 border border-gray-200 rounded-supersudo">
              <p className="text-sm text-gray-600">
                {t('admin.quickSettings.noGlobalDiscount')}
              </p>
            </div>
          )}

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setGlobalDiscount(10)}
              className="flex-1"
            >
              10%
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setGlobalDiscount(20)}
              className="flex-1"
            >
              20%
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setGlobalDiscount(30)}
              className="flex-1"
            >
              30%
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setGlobalDiscount(50)}
              className="flex-1"
            >
              50%
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setGlobalDiscount(0)}
              className="px-3"
            >
              {t('admin.quickSettings.cancel')}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}


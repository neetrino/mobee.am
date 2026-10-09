'use client';

import { useTranslation } from '../../../../../lib/i18n-client';

interface VariantMainCellProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export function VariantMainCell({ checked, onChange }: VariantMainCellProps) {
  const { t } = useTranslation();

  return (
    <td className="px-2 py-2 text-center">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        title={t('admin.products.add.mainVariantHint')}
        aria-label={t('admin.products.add.mainVariantHint')}
        className="w-4 h-4 text-admin-600 border-gray-300 rounded-supersudo focus:ring-admin"
      />
    </td>
  );
}

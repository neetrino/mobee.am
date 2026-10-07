'use client';

import { useEffect, useState } from 'react';
import { AdminSideSheet } from '../../../components/AdminSideSheet';
import { Button } from '@/app/admin/lib/adminShopUi';
import { useTranslation } from '../../../../../lib/i18n-client';
import { getColorHex } from '../../../../../lib/colorMap';
import type { Attribute, GeneratedVariant } from '../types';

interface ValueSelectionModalProps {
  openValueModal: { variantId: string; attributeId: string } | null;
  variant: GeneratedVariant | undefined;
  attribute: Attribute | undefined;
  onClose: () => void;
  onVariantUpdate: (updater: (prev: GeneratedVariant[]) => GeneratedVariant[]) => void;
  onAttributeValueIdsUpdate: (updater: (prev: Record<string, string[]>) => Record<string, string[]>) => void;
  selectedAttributeValueIds: Record<string, string[]>;
}

interface ModalSnapshot {
  openValueModal: { variantId: string; attributeId: string };
  variant: GeneratedVariant;
  attribute: Attribute;
}

export function ValueSelectionModal({
  openValueModal,
  variant,
  attribute,
  onClose,
  onVariantUpdate,
  onAttributeValueIdsUpdate,
  selectedAttributeValueIds,
}: ValueSelectionModalProps) {
  const { t } = useTranslation();
  const [snapshot, setSnapshot] = useState<ModalSnapshot | null>(null);
  const isOpen = openValueModal !== null && variant !== undefined && attribute !== undefined;

  useEffect(() => {
    if (openValueModal && variant && attribute) {
      setSnapshot({ openValueModal, variant, attribute });
    }
  }, [openValueModal, variant, attribute]);

  const active =
    openValueModal && variant && attribute
      ? { openValueModal, variant, attribute }
      : snapshot;

  const handleSelectAll = (checked: boolean) => {
    if (!active) {
      return;
    }
    const { variant: activeVariant, attribute: activeAttribute, openValueModal: activeModal } = active;
    const isAutoVariant = activeVariant.id === 'variant-all';

    if (checked) {
      const allValueIds = activeAttribute.values.map((v) => v.id);
      const currentIds = activeVariant.selectedValueIds;
      const newIds = [...new Set([...currentIds, ...allValueIds])];

      onVariantUpdate((prev) => prev.map((v) => (v.id === activeVariant.id ? { ...v, selectedValueIds: newIds } : v)));

      if (isAutoVariant) {
        onAttributeValueIdsUpdate((prev) => ({
          ...prev,
          [activeModal.attributeId]: allValueIds,
        }));
      }
    } else {
      const valueIdsToRemove = activeAttribute.values.map((v) => v.id);
      const newIds = activeVariant.selectedValueIds.filter((id) => !valueIdsToRemove.includes(id));

      onVariantUpdate((prev) => prev.map((v) => (v.id === activeVariant.id ? { ...v, selectedValueIds: newIds } : v)));

      if (isAutoVariant) {
        onAttributeValueIdsUpdate((prev) => ({
          ...prev,
          [activeModal.attributeId]: [],
        }));
      }
    }
  };

  const handleValueToggle = (valueId: string, checked: boolean) => {
    if (!active) {
      return;
    }
    const { variant: activeVariant, openValueModal: activeModal } = active;
    const isAutoVariant = activeVariant.id === 'variant-all';
    const currentIds = activeVariant.selectedValueIds;
    let newIds: string[];

    if (checked) {
      newIds = [...currentIds, valueId];
    } else {
      newIds = currentIds.filter((id) => id !== valueId);
    }

    onVariantUpdate((prev) => {
      const updated = prev.map((v) => (v.id === activeVariant.id ? { ...v, selectedValueIds: newIds } : v));
      console.log('✅ [VARIANT BUILDER] Value selection updated:', {
        variantId: activeVariant.id,
        isAutoVariant,
        valueId,
        action: checked ? 'added' : 'removed',
        newSelectedIds: newIds.length,
        totalVariants: updated.length,
      });
      return updated;
    });

    if (isAutoVariant) {
      const currentAttrIds = selectedAttributeValueIds[activeModal.attributeId] || [];
      let newAttrIds: string[];
      if (checked) {
        newAttrIds = [...currentAttrIds, valueId];
      } else {
        newAttrIds = currentAttrIds.filter((id) => id !== valueId);
      }

      onAttributeValueIdsUpdate((prev) => ({
        ...prev,
        [activeModal.attributeId]: newAttrIds,
      }));
    }
  };

  return (
    <AdminSideSheet
      open={isOpen}
      onClose={onClose}
      title={active ? `${t('admin.products.add.selectValues')} ${active.attribute.name}` : t('admin.products.add.selectValues')}
      closeLabel={t('admin.common.close')}
      desktopWidthClassName="lg:w-[50%]"
      mobileWidthClassName="w-[92%] max-w-lg"
      footer={
        <div className="flex items-center justify-end">
          <Button type="button" variant="outline" onClick={onClose}>
            {t('admin.common.close')}
          </Button>
        </div>
      }
    >
      {active ? (() => {
        const { variant: activeVariant, attribute: activeAttribute } = active;
        const isColor = activeAttribute.key === 'color';
        const selectedValueIds = activeVariant.selectedValueIds.filter((id) => {
          return activeAttribute.values.some((v) => v.id === id);
        });

        return (
            <div>
              {/* "All" option */}
              <label className="mb-3 flex cursor-pointer items-center gap-2 rounded-supersudo border border-gray-200 p-2 hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={activeAttribute.values.length > 0 && selectedValueIds.length === activeAttribute.values.length}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  className="h-4 w-4 rounded-supersudo border-gray-300 text-admin-600 focus:ring-admin"
                />
                <span className="text-sm font-medium text-gray-900">All</span>
              </label>

              <div className="my-3 border-t border-gray-200"></div>

              {/* Individual value checkboxes - grid layout */}
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
                {activeAttribute.values.map((value) => {
                  const isSelected = activeVariant.selectedValueIds.includes(value.id);
                  const valueColorHex =
                    isColor && value.colors && value.colors.length > 0
                      ? value.colors[0]
                      : isColor
                        ? getColorHex(value.label)
                        : null;

                  return (
                    <label
                      key={value.id}
                      className={`flex cursor-pointer flex-col items-center gap-1.5 rounded-supersudo border-2 p-2 transition-all ${
                        isSelected
                          ? 'border-admin-600 bg-admin-50'
                          : 'border-transparent bg-gray-50 hover:border-gray-300 hover:bg-gray-100'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => handleValueToggle(value.id, e.target.checked)}
                        className="h-4 w-4 flex-shrink-0 rounded-supersudo border-gray-300 text-admin-600 focus:ring-admin"
                      />
                      {value.imageUrl ? (
                        <img
                          src={value.imageUrl}
                          alt={value.label}
                          className="h-8 w-8 flex-shrink-0 rounded-supersudo border border-gray-300 object-cover"
                        />
                      ) : isColor && valueColorHex ? (
                        <span
                          className="inline-block h-6 w-6 flex-shrink-0 rounded-full border-2 border-gray-300 shadow-sm"
                          style={{ backgroundColor: valueColorHex }}
                        />
                      ) : null}
                      <span className="text-center text-xs font-medium text-gray-900">{value.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>
        );
      })() : null}
    </AdminSideSheet>
  );
}

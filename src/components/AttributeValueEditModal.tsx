'use client';

import { useState, useRef, ChangeEvent, useEffect } from 'react';
import { AnimatedModalPortal } from '@/components/AnimatedModalPortal';
import { useTranslation } from '../lib/i18n-client';
import { showToast } from './Toast';
import { ColorPaletteSelector } from './ColorPaletteSelector';

interface AttributeValueEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  value: {
    id: string;
    label: string;
    colors?: string[];
    imageUrl?: string | null;
  };
  attributeId: string;
  onSave: (data: {
    label?: string;
    colors?: string[];
    imageUrl?: string | null;
  }) => Promise<void>;
}

export function AttributeValueEditModal({
  isOpen,
  onClose,
  value,
  attributeId: _attributeId,
  onSave,
}: AttributeValueEditModalProps) {
  const { t } = useTranslation();
  const [label, setLabel] = useState(value.label);
  const [colors, setColors] = useState<string[]>(value.colors || []);
  const [imageUrl, setImageUrl] = useState<string | null>(value.imageUrl || null);
  const [saving, setSaving] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Update state when value changes
  useEffect(() => {
    if (isOpen) {
      setLabel(value.label);
      setColors(value.colors || []);
      setImageUrl(value.imageUrl || null);
    }
  }, [value, isOpen]);

  const fileToBase64 = (file: File): Promise<string> =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });


  const handleImageUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    const imageFile = files.find((file) => file.type.startsWith('image/'));
    if (!imageFile) {
      showToast(t('admin.attributes.valueModal.selectImageFile'), 'warning');
      if (event.target) {
        event.target.value = '';
      }
      return;
    }

    try {
      setImageUploading(true);
      const base64 = await fileToBase64(imageFile);
      setImageUrl(base64);
    } catch (error: unknown) {
      console.error('❌ [ADMIN] Error uploading image:', error);
      const message = error instanceof Error ? error.message : t('admin.attributes.valueModal.failedToProcessImage');
      showToast(message, 'error');
    } finally {
      setImageUploading(false);
      if (event.target) {
        event.target.value = '';
      }
    }
  };

  const handleRemoveImage = () => {
    setImageUrl(null);
  };

  const handleSave = async (requestClose: () => void) => {
    try {
      setSaving(true);
      const saveData = {
        label: label.trim() !== value.label ? label.trim() : undefined,
        colors: colors.length > 0 ? colors : undefined,
        imageUrl: imageUrl,
      };
      console.log('💾 [ATTRIBUTE VALUE MODAL] Saving value:', {
        valueId: value.id,
        saveData,
        colorsLength: colors.length,
        colors: colors,
        colorsType: typeof colors,
        colorsIsArray: Array.isArray(colors)
      });
      await onSave(saveData);
      console.log('✅ [ATTRIBUTE VALUE MODAL] Value saved successfully');
      requestClose();
    } catch (error: unknown) {
      console.error('❌ [ADMIN] Error saving value:', error);
      const message = error instanceof Error ? error.message : t('admin.attributes.valueModal.failedToSave');
      showToast(message, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AnimatedModalPortal
      isOpen={isOpen}
      onClose={onClose}
      closeAriaLabel={t('admin.attributes.valueModal.close')}
      blockClose={saving || imageUploading}
      labelledBy="attribute-value-edit-title"
      dialogFrameClassName="fixed left-1/2 top-1/2 z-10 w-full max-w-2xl -translate-x-1/2 -translate-y-1/2 px-4"
      panelClassName="max-h-[90vh] w-full overflow-y-auto rounded-lg bg-white shadow-xl"
    >
      {({ requestClose }) => (
        <>
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-200 p-6">
            <h3 id="attribute-value-edit-title" className="text-xl font-semibold text-gray-900">
              {t('admin.attributes.valueModal.editValue')}
            </h3>
            <button
              type="button"
              onClick={requestClose}
              className="text-gray-400 transition-colors hover:text-admin-600"
              aria-label={t('admin.attributes.valueModal.close')}
            >
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="space-y-6 p-6">
            {/* Label */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                {t('admin.attributes.valueModal.label')}
              </label>
              <input
                type="text"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-gray-900"
                placeholder={t('admin.attributes.valueModal.labelPlaceholder')}
              />
            </div>

            {/* Colors and Image Section - Side by Side */}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {/* Colors Section */}
              <div>
                <label className="mb-3 block text-sm font-medium text-gray-700">
                  {t('admin.attributes.valueModal.colors')}
                </label>
                <ColorPaletteSelector colors={colors} onColorsChange={setColors} />
              </div>

              {/* Image Section */}
              <div>
                <label className="mb-3 block text-sm font-medium text-gray-700">
                  {t('admin.attributes.valueModal.image')}
                </label>
                {imageUrl ? (
                  <div className="space-y-3">
                    <div className="relative inline-block">
                      <img
                        src={imageUrl}
                        alt={t('admin.attributes.valueModal.imagePreview')}
                        className="h-32 w-32 rounded-lg border border-gray-300 object-cover"
                      />
                      <button
                        type="button"
                        onClick={handleRemoveImage}
                        className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-admin-500 text-white transition-colors hover:bg-admin-600"
                        title={t('admin.attributes.valueModal.removeImage')}
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={imageUploading}
                      className="cursor-pointer rounded-lg bg-gray-100 px-4 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-200 disabled:cursor-default disabled:opacity-50"
                    >
                      {imageUploading ? t('admin.attributes.valueModal.uploading') : t('admin.attributes.valueModal.changeImage')}
                    </button>
                  </div>
                ) : (
                  <div>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={imageUploading}
                      className="flex cursor-pointer items-center gap-2 rounded-lg bg-gray-100 px-4 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-200 disabled:cursor-default disabled:opacity-50"
                    >
                      {imageUploading ? (
                        <>
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-600 border-t-transparent" />
                          {t('admin.attributes.valueModal.uploading')}
                        </>
                      ) : (
                        <>
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                          {t('admin.attributes.valueModal.uploadImage')}
                        </>
                      )}
                    </button>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageUpload}
                />
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 border-t border-gray-200 p-6">
            <button
              type="button"
              onClick={requestClose}
              disabled={saving}
              className="cursor-pointer rounded-lg bg-gray-200 px-4 py-2 text-gray-700 transition-colors hover:bg-gray-300 disabled:cursor-default disabled:opacity-50"
            >
              {t('admin.attributes.valueModal.cancel')}
            </button>
            <button
              type="button"
              onClick={() => void handleSave(requestClose)}
              disabled={saving || !label.trim()}
              className="flex cursor-pointer items-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-white transition-colors hover:bg-gray-800 disabled:cursor-default disabled:opacity-50"
            >
              {saving ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  {t('admin.attributes.valueModal.saving')}
                </>
              ) : (
                t('admin.attributes.valueModal.save')
              )}
            </button>
          </div>
        </>
      )}
    </AnimatedModalPortal>
  );
}

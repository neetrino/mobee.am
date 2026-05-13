'use client';

import { useTranslation } from '../../../lib/i18n-client';
import { ColorPaletteSelector } from '../../../components/ColorPaletteSelector';
import { type AttributeValue } from './useAttributes';

interface ValueEditFormProps {
  attributeId: string;
  value: AttributeValue;
  editingLabel: string;
  editingColors: string[];
  editingImageUrl: string | null;
  savingValue: boolean;
  imageUploading: boolean;
  fileInputRef: React.RefObject<HTMLInputElement>;
  onLabelChange: (label: string) => void;
  onColorsChange: (colors: string[]) => void;
  onImageUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveImage: () => void;
  onSave: () => void;
  onCancel: () => void;
}

export function ValueEditForm({
  attributeId: _attributeId,
  value: _value,
  editingLabel,
  editingColors,
  editingImageUrl,
  savingValue,
  imageUploading,
  fileInputRef,
  onLabelChange,
  onColorsChange,
  onImageUpload,
  onRemoveImage,
  onSave,
  onCancel,
}: ValueEditFormProps) {
  const { t } = useTranslation();

  return (
    <div className="border-t border-gray-200 p-4 bg-gray-50 space-y-4">
      {/* Label */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {t('admin.attributes.valueModal.label')}
        </label>
        <input
          type="text"
          value={editingLabel}
          onChange={(e) => onLabelChange(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-supersudo focus:ring-2 focus:ring-admin focus:border-transparent"
          placeholder={t('admin.attributes.valueModal.labelPlaceholder')}
        />
      </div>

      {/* Colors and Image Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Colors Section */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            {t('admin.attributes.valueModal.colors')}
          </label>
          <ColorPaletteSelector colors={editingColors} onColorsChange={onColorsChange} />
        </div>

        {/* Image Section */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            {t('admin.attributes.valueModal.image')}
          </label>
          {editingImageUrl ? (
            <div className="space-y-3">
              <div className="relative inline-block">
                <img
                  src={editingImageUrl}
                  alt={t('admin.attributes.valueModal.imagePreview')}
                  className="w-32 h-32 object-cover rounded-supersudo border border-gray-300"
                />
                <button
                  type="button"
                  onClick={onRemoveImage}
                  className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-admin-500 text-white transition-colors hover:bg-admin-600"
                  title={t('admin.attributes.valueModal.removeImage')}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={imageUploading}
                className="cursor-pointer rounded-supersudo bg-gray-100 px-4 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-200 disabled:cursor-default disabled:opacity-50"
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
                className="flex cursor-pointer items-center gap-2 rounded-supersudo bg-gray-100 px-4 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-200 disabled:cursor-default disabled:opacity-50"
              >
                {imageUploading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-gray-600 border-t-transparent rounded-full animate-spin" />
                    {t('admin.attributes.valueModal.uploading')}
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
            onChange={onImageUpload}
          />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-200">
        <button
          type="button"
          onClick={onCancel}
          disabled={savingValue}
          className="cursor-pointer rounded-supersudo bg-gray-200 px-4 py-2 text-gray-700 transition-colors hover:bg-gray-300 disabled:cursor-default disabled:opacity-50"
        >
          {t('admin.attributes.valueModal.cancel')}
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={savingValue || !editingLabel.trim()}
          className="flex cursor-pointer items-center gap-2 rounded-supersudo bg-admin px-4 py-2 text-white transition-colors hover:bg-admin-600 disabled:cursor-default disabled:opacity-50"
        >
          {savingValue ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              {t('admin.attributes.valueModal.saving')}
            </>
          ) : (
            t('admin.attributes.valueModal.save')
          )}
        </button>
      </div>
    </div>
  );
}




'use client';

import { useEffect, useState, useCallback, useRef, ChangeEvent } from 'react';
import { apiClient } from '../../../lib/api-client';
import { useTranslation } from '../../../lib/i18n-client';
import { showToast } from '../../../components/Toast';
import { confirmDialog } from '../../../components/ConfirmDialog';
import type { AdminContentLocale } from '@/lib/admin/admin-content-locale';

export interface AttributeValue {
  id: string;
  value: string;
  label: string;
  colors?: string[];
  imageUrl?: string | null;
  /** Distinct non-deleted products that use this value in a variant. */
  productCount?: number;
}

export interface Attribute {
  id: string;
  key: string;
  name: string;
  type: string;
  filterable: boolean;
  /** Distinct non-deleted products that use any value of this attribute. */
  productCount?: number;
  values: AttributeValue[];
}

export function useAttributes(locale: AdminContentLocale) {
  const { t } = useTranslation();
  const [attributes, setAttributes] = useState<Attribute[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingAttribute, setEditingAttribute] = useState<string | null>(null);
  const [editingAttributeName, setEditingAttributeName] = useState('');
  const [savingAttribute, setSavingAttribute] = useState(false);
  const [expandedAttributes, setExpandedAttributes] = useState<Set<string>>(new Set());
  
  // Form states
  const [formData, setFormData] = useState({
    name: '',
  });
  
  const [newValue, setNewValue] = useState('');
  const [addingValueTo, setAddingValueTo] = useState<string | null>(null);
  const [deletingValue, setDeletingValue] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState<{ attributeId: string; value: AttributeValue } | null>(null);
  const [valueError, setValueError] = useState<string | null>(null);
  const [expandedValueId, setExpandedValueId] = useState<string | null>(null);
  
  // Inline edit form states
  const [editingLabel, setEditingLabel] = useState('');
  const [editingColors, setEditingColors] = useState<string[]>([]);
  const [editingImageUrl, setEditingImageUrl] = useState<string | null>(null);
  const [savingValue, setSavingValue] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchAttributes = useCallback(async (options?: { silent?: boolean }) => {
    const silent = options?.silent === true;
    try {
      if (!silent) {
        setLoading(true);
      }
      const response = await apiClient.get<{ data: Attribute[] }>(`/api/v1/admin/attributes?locale=${encodeURIComponent(locale)}`);
      setAttributes(response.data || []);
    } catch (err) {
      console.error('[ADMIN] Error fetching attributes:', err);
      if (!silent) {
        setAttributes([]);
      }
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }, [locale]);

  useEffect(() => {
    fetchAttributes();
  }, [fetchAttributes]);

  const handleCreateAttribute = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      showToast(t('admin.attributes.fillName'), 'warning');
      return;
    }

    // Auto-generate key from name
    const autoKey = formData.name.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

    try {
      console.log('🆕 [ADMIN] Creating attribute:', autoKey);
      await apiClient.post('/api/v1/admin/attributes', {
        name: formData.name.trim(),
        key: autoKey,
        type: 'select',
        filterable: true,
        locale,
      });
      
      console.log('✅ [ADMIN] Attribute created successfully');
      setShowAddForm(false);
      setFormData({ name: '' });
      void fetchAttributes({ silent: true });
      showToast(t('admin.attributes.createdSuccess'), 'success');
    } catch (err: any) {
      console.error('❌ [ADMIN] Error creating attribute:', err);
      const errorMessage = err?.data?.detail || err?.message || 'Failed to create attribute';
      showToast(t('admin.attributes.errorCreating').replace('{message}', errorMessage), 'error');
    }
  };

  const handleDeleteAttribute = async (attributeId: string, attributeName: string) => {
    if (!(await confirmDialog({
      message: t('admin.attributes.deleteConfirm').replace('{name}', attributeName),
      variant: 'danger',
    }))) {
      return;
    }

    try {
      console.log(`🗑️ [ADMIN] Deleting attribute: ${attributeName} (${attributeId})`);
      await apiClient.delete(`/api/v1/admin/attributes/${attributeId}`);
      console.log('✅ [ADMIN] Attribute deleted successfully');
      void fetchAttributes({ silent: true });
      showToast(t('admin.attributes.deletedSuccess'), 'success');
    } catch (err: any) {
      console.error('❌ [ADMIN] Error deleting attribute:', err);
      const errorMessage = err?.data?.detail || err?.message || 'Failed to delete attribute';
      showToast(t('admin.attributes.errorDeleting').replace('{message}', errorMessage), 'error');
    }
  };

  const handleUpdateAttributeName = async (attributeId: string) => {
    const trimmedName = editingAttributeName.trim();
    
    if (!trimmedName) {
      showToast(t('admin.attributes.fillName'), 'warning');
      return;
    }

    try {
      setSavingAttribute(true);
      console.log(`✏️ [ADMIN] Updating attribute name: ${attributeId} -> ${trimmedName}`);
      await apiClient.patch(`/api/v1/admin/attributes/${attributeId}/translations`, {
        name: trimmedName,
        locale,
      });
      console.log('✅ [ADMIN] Attribute name updated successfully');
      setEditingAttribute(null);
      setEditingAttributeName('');
      void fetchAttributes({ silent: true });
      showToast(t('admin.attributes.nameUpdatedSuccess') || 'Attribute name updated successfully', 'success');
    } catch (err: any) {
      console.error('❌ [ADMIN] Error updating attribute name:', err);
      const errorMessage = err?.data?.detail || err?.message || 'Failed to update attribute name';
      showToast(errorMessage, 'error');
    } finally {
      setSavingAttribute(false);
    }
  };

  const toggleAttributeEdit = (attribute: Attribute) => {
    if (editingAttribute === attribute.id) {
      // Close
      setEditingAttribute(null);
      setEditingAttributeName('');
    } else {
      // Open
      setEditingAttribute(attribute.id);
      setEditingAttributeName(attribute.name);
    }
  };

  const handleAddValue = async (attributeId: string) => {
    const trimmedValue = newValue.trim();
    
    if (!trimmedValue) {
      showToast(t('admin.attributes.enterValue'), 'warning');
      setValueError(t('admin.attributes.enterValue'));
      return;
    }

    // Find the attribute
    const attribute = attributes.find((attr) => attr.id === attributeId);
    if (!attribute) {
      showToast(t('admin.attributes.attributeNotFound'), 'error');
      return;
    }

    // Check for duplicates on frontend (case-insensitive, normalized)
    const normalizedNewValue = trimmedValue.toLowerCase().trim();
    const existingValue = attribute.values.find((val) => {
      const normalizedExisting = val.label.toLowerCase().trim();
      return normalizedExisting === normalizedNewValue;
    });

    if (existingValue) {
      const errorMsg = t('admin.attributes.valueAlreadyExists').replace('{value}', trimmedValue);
      showToast(errorMsg, 'error', 5000);
      setValueError(errorMsg);
      return;
    }

    // Clear any previous errors
    setValueError(null);

    try {
      setAddingValueTo(attributeId);
      console.log('➕ [ADMIN] Adding value to attribute:', attributeId, trimmedValue);
      await apiClient.post(`/api/v1/admin/attributes/${attributeId}/values`, {
        label: trimmedValue,
        locale,
      });
      
      console.log('✅ [ADMIN] Value added successfully');
      setNewValue('');
      setValueError(null);
      setAddingValueTo(null);
      showToast(t('admin.attributes.valueAddedSuccess'), 'success');
      void fetchAttributes({ silent: true });
    } catch (err: any) {
      console.error('❌ [ADMIN] Error adding value:', err);
      const errorMessage = err?.data?.detail || err?.message || t('admin.attributes.failedToAddValue');
      
      // Check if it's a duplicate error from backend
      if (errorMessage.includes('already exists') || errorMessage.includes('уже существует')) {
        const duplicateMsg = t('admin.attributes.valueAlreadyExists').replace('{value}', trimmedValue);
        showToast(duplicateMsg, 'error', 5000);
        setValueError(duplicateMsg);
      } else {
        showToast(errorMessage, 'error', 5000);
        setValueError(errorMessage);
      }
      setAddingValueTo(null);
    }
  };

  const handleDeleteValue = async (attributeId: string, valueId: string, valueLabel: string) => {
    if (!(await confirmDialog({
      message: t('admin.attributes.deleteValueConfirm').replace('{label}', valueLabel),
      variant: 'danger',
    }))) {
      return;
    }

    try {
      setDeletingValue(valueId);
      console.log(`🗑️ [ADMIN] Deleting value: ${valueLabel} (${valueId})`);
      await apiClient.delete(`/api/v1/admin/attributes/${attributeId}/values/${valueId}`);
      console.log('✅ [ADMIN] Value deleted successfully');
      void fetchAttributes({ silent: true });
      setDeletingValue(null);
      showToast(t('admin.attributes.valueDeletedSuccess'), 'success');
    } catch (err: any) {
      console.error('❌ [ADMIN] Error deleting value:', err);
      const errorMessage = err?.data?.detail || err?.message || 'Failed to delete value';
      showToast(t('admin.attributes.errorDeletingValue').replace('{message}', errorMessage), 'error');
      setDeletingValue(null);
    }
  };

  const handleUpdateValue = async (data: {
    label?: string;
    colors?: string[];
    imageUrl?: string | null;
  }) => {
    if (!editingValue) return;

    try {
      await apiClient.patch(`/api/v1/admin/attributes/${editingValue.attributeId}/values/${editingValue.value.id}`, {
        ...data,
        locale,
      });

      const valueId = editingValue.value.id;
      const attributeId = editingValue.attributeId;
      const nextLabel = data.label ?? editingValue.value.label;
      const nextColors = data.colors ?? editingValue.value.colors ?? [];
      const nextImageUrl =
        data.imageUrl !== undefined ? data.imageUrl : editingValue.value.imageUrl ?? null;

      // Optimistic local update so the UI closes immediately without a full-page reload spinner.
      setAttributes((prev) =>
        prev.map((attribute) => {
          if (attribute.id !== attributeId) {
            return attribute;
          }
          return {
            ...attribute,
            values: attribute.values.map((value) =>
              value.id === valueId
                ? {
                    ...value,
                    label: nextLabel,
                    colors: nextColors,
                    imageUrl: nextImageUrl,
                  }
                : value,
            ),
          };
        }),
      );

      void fetchAttributes({ silent: true });
      showToast(t('admin.attributes.valueUpdatedSuccess'), 'success');
    } catch (err: any) {
      console.error('❌ [ADMIN] Error updating value:', err);
      const errorMessage = err?.data?.detail || err?.message || 'Failed to update value';
      showToast(t('admin.attributes.errorUpdatingValue')?.replace('{message}', errorMessage) || errorMessage, 'error');
      throw err;
    }
  };

  const toggleValueEdit = (attributeId: string, value: AttributeValue) => {
    if (expandedValueId === value.id) {
      // Close
      setExpandedValueId(null);
      setEditingValue(null);
      setEditingLabel('');
      setEditingColors([]);
      setEditingImageUrl(null);
    } else {
      // Open
      setExpandedValueId(value.id);
      setEditingValue({ attributeId, value });
      setEditingLabel(value.label);
      setEditingColors(value.colors || []);
      setEditingImageUrl(value.imageUrl || null);
    }
  };

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
      setEditingImageUrl(base64);
    } catch (error: any) {
      console.error('❌ [ADMIN] Error uploading image:', error);
      showToast(error?.message || t('admin.attributes.valueModal.failedToProcessImage'), 'error');
    } finally {
      setImageUploading(false);
      if (event.target) {
        event.target.value = '';
      }
    }
  };

  const handleRemoveImage = () => {
    setEditingImageUrl(null);
  };

  const handleSaveInlineValue = async () => {
    if (!editingValue || savingValue) return;

    const trimmedLabel = editingLabel.trim();
    if (!trimmedLabel) {
      showToast(t('admin.attributes.fillName'), 'warning');
      return;
    }

    const previous = editingValue.value;
    const previousColors = previous.colors ?? [];
    const labelChanged = trimmedLabel !== previous.label;
    const colorsChanged =
      previousColors.length !== editingColors.length ||
      previousColors.some((color, index) => color !== editingColors[index]);
    const previousImageUrl = previous.imageUrl ?? null;
    const imageChanged = editingImageUrl !== previousImageUrl;

    if (!labelChanged && !colorsChanged && !imageChanged) {
      setExpandedValueId(null);
      setEditingValue(null);
      setEditingLabel('');
      setEditingColors([]);
      setEditingImageUrl(null);
      return;
    }

    try {
      setSavingValue(true);
      await handleUpdateValue({
        label: labelChanged ? trimmedLabel : undefined,
        colors: colorsChanged ? editingColors : undefined,
        imageUrl: imageChanged ? editingImageUrl : undefined,
      });
      setExpandedValueId(null);
      setEditingValue(null);
      setEditingLabel('');
      setEditingColors([]);
      setEditingImageUrl(null);
    } catch (error: unknown) {
      console.error('❌ [ADMIN] Error saving value:', error);
    } finally {
      setSavingValue(false);
    }
  };

  const toggleExpand = (attributeId: string) => {
    setExpandedAttributes((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(attributeId)) {
        newSet.delete(attributeId);
      } else {
        newSet.add(attributeId);
      }
      return newSet;
    });
  };

  return {
    // State
    attributes,
    loading,
    showAddForm,
    editingAttribute,
    editingAttributeName,
    savingAttribute,
    expandedAttributes,
    formData,
    newValue,
    addingValueTo,
    deletingValue,
    editingValue,
    valueError,
    expandedValueId,
    editingLabel,
    editingColors,
    editingImageUrl,
    savingValue,
    imageUploading,
    fileInputRef,
    // Actions
    setShowAddForm,
    setFormData,
    setNewValue,
    setEditingAttributeName,
    setEditingLabel,
    setEditingColors,
    setEditingImageUrl,
    setValueError,
    handleCreateAttribute,
    handleDeleteAttribute,
    handleUpdateAttributeName,
    toggleAttributeEdit,
    handleAddValue,
    handleDeleteValue,
    toggleValueEdit,
    handleImageUpload,
    handleRemoveImage,
    handleSaveInlineValue,
    toggleExpand,
  };
}




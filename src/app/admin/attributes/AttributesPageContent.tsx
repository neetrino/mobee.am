'use client';

import { useMemo, useState } from 'react';
import { Card, Input, Button } from '@/app/admin/lib/adminShopUi';
import { useTranslation } from '../../../lib/i18n-client';
import { useAttributes } from './useAttributes';
import { ValueEditForm } from './ValueEditForm';

export function AttributesPageContent() {
  const { t } = useTranslation();
  const {
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
    editingValue: _editingValue,
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
    setEditingImageUrl: _setEditingImageUrl,
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
  } = useAttributes();

  const [searchQuery, setSearchQuery] = useState('');

  const filteredAttributes = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) {
      return attributes;
    }
    return attributes.filter((attr) => {
      if (attr.name.toLowerCase().includes(q) || attr.key.toLowerCase().includes(q)) {
        return true;
      }
      return attr.values.some(
        (v) =>
          v.label.toLowerCase().includes(q) || v.value.toLowerCase().includes(q),
      );
    });
  }, [attributes, searchQuery]);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">{t('admin.attributes.title')}</h1>
        <p className="mt-2 text-gray-600">{t('admin.attributes.subtitle')}</p>
      </div>

      <Card className="p-6">
        {loading ? (
          <div className="py-4 text-center">
            <div className="mx-auto mb-2 h-6 w-6 animate-spin rounded-full border-b-2 border-admin"></div>
            <p className="text-sm text-gray-600">{t('admin.attributes.loadingAttributes')}</p>
          </div>
        ) : (
          <>
            <div
              className={`mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4 ${
                attributes.length > 0 ? 'sm:justify-between' : 'sm:justify-end'
              }`}
            >
              {attributes.length > 0 ? (
                <div className="flex min-w-0 flex-1 flex-col gap-2 sm:max-w-md sm:flex-row sm:items-center">
                  <label className="sr-only" htmlFor="admin-attributes-search">
                    {t('admin.attributes.searchLabel')}
                  </label>
                  <Input
                    id="admin-attributes-search"
                    type="search"
                    role="searchbox"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={t('admin.attributes.searchPlaceholder')}
                    className="w-full"
                    autoComplete="off"
                  />
                  {searchQuery.trim().length > 0 ? (
                    <Button type="button" variant="ghost" size="sm" onClick={() => setSearchQuery('')}>
                      {t('admin.attributes.clearSearch')}
                    </Button>
                  ) : null}
                </div>
              ) : null}
              <div className="flex shrink-0 justify-end">
              <Button
                type="button"
                variant={showAddForm ? 'outline' : 'admin'}
                onClick={() => setShowAddForm(!showAddForm)}
                className="flex items-center gap-2"
              >
                <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                {showAddForm ? t('admin.attributes.cancel') : t('admin.attributes.addAttribute')}
              </Button>
              </div>
            </div>

            {showAddForm ? (
              <div className="mb-6 rounded-supersudo border border-dashed border-gray-300 bg-gray-50/50 p-6">
                <h3 className="mb-4 text-lg font-semibold text-gray-900">
                  {t('admin.attributes.createNewAttribute')}
                </h3>
                <form onSubmit={handleCreateAttribute} className="space-y-4">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      {t('admin.attributes.name')} <span className="text-red-500">{t('admin.attributes.required')}</span>
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder={t('admin.attributes.namePlaceholder')}
                      className="w-full rounded-supersudo border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-admin"
                      required
                    />
                    <p className="mt-1 text-xs text-gray-500">{t('admin.attributes.keyAutoGenerated')}</p>
                  </div>

                  <div className="flex flex-wrap gap-3 pt-2">
                    <Button type="submit" variant="admin" size="sm">
                      {t('admin.attributes.createAttribute')}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setShowAddForm(false);
                        setFormData({ name: '' });
                      }}
                    >
                      {t('admin.attributes.cancel')}
                    </Button>
                  </div>
                </form>
              </div>
            ) : null}

            {attributes.length === 0 ? (
              <div className="py-12 text-center">
                <svg
                  className="mx-auto mb-4 h-16 w-16 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                  />
                </svg>
                <h3 className="mb-2 text-lg font-medium text-gray-900">{t('admin.attributes.noAttributes')}</h3>
                <p className="mb-4 text-gray-600">{t('admin.attributes.getStarted')}</p>
                <Button type="button" variant="admin" size="sm" onClick={() => setShowAddForm(true)}>
                  {t('admin.attributes.createAttribute')}
                </Button>
              </div>
            ) : filteredAttributes.length === 0 ? (
              <p className="py-6 text-center text-sm text-gray-500">{t('admin.attributes.noSearchResults')}</p>
            ) : (
              <div className="space-y-4">
            {filteredAttributes.map((attribute) => {
              const isExpanded = expandedAttributes.has(attribute.id);
              return (
                <div
                  key={attribute.id}
                  className="overflow-hidden rounded-supersudo border border-gray-200"
                >
                  {/* Attribute Header */}
                  <div className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-4 flex-1">
                      <button
                        onClick={() => toggleExpand(attribute.id)}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        <svg
                          className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                      <div className="flex-1">
                        {editingAttribute === attribute.id ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={editingAttributeName}
                              onChange={(e) => setEditingAttributeName(e.target.value)}
                              onKeyPress={(e) => {
                                if (e.key === 'Enter' && editingAttributeName.trim()) {
                                  handleUpdateAttributeName(attribute.id);
                                }
                              }}
                              className="px-3 py-2 border border-gray-300 rounded-supersudo focus:ring-2 focus:ring-admin focus:border-transparent text-lg font-semibold"
                              autoFocus
                            />
                            <button
                              onClick={() => handleUpdateAttributeName(attribute.id)}
                              disabled={!editingAttributeName.trim() || savingAttribute}
                              className="flex cursor-pointer items-center gap-2 rounded-supersudo bg-admin px-3 py-2 text-white transition-colors hover:bg-admin-600 disabled:cursor-default disabled:opacity-50"
                            >
                              {savingAttribute ? (
                                <>
                                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                  {t('admin.attributes.saving') || 'Saving...'}
                                </>
                              ) : (
                                <>
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                  </svg>
                                  {t('admin.attributes.save') || 'Save'}
                                </>
                              )}
                            </button>
                            <button
                              onClick={() => toggleAttributeEdit(attribute)}
                              disabled={savingAttribute}
                              className="cursor-pointer rounded-supersudo bg-gray-200 px-3 py-2 text-gray-700 transition-colors hover:bg-gray-300 disabled:cursor-default disabled:opacity-50"
                            >
                              {t('admin.attributes.cancel')}
                            </button>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-center gap-3">
                              <h3 className="text-lg font-semibold text-gray-900">{attribute.name}</h3>
                              <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-supersudo">
                                {attribute.key}
                              </span>
                              {attribute.filterable && (
                                <span className="text-xs px-2 py-1 bg-admin-100 text-admin-700 rounded-supersudo">
                                  {t('admin.attributes.filterable')}
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-500 mt-1">
                              {attribute.values.length === 1 
                                ? t('admin.attributes.values').replace('{count}', attribute.values.length.toString())
                                : t('admin.attributes.valuesPlural').replace('{count}', attribute.values.length.toString())
                              }
                            </p>
                          </>
                        )}
                      </div>
                    </div>
                    {editingAttribute !== attribute.id && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => toggleAttributeEdit(attribute)}
                          className="px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-supersudo transition-colors"
                          title={t('admin.attributes.editAttribute') || 'Edit attribute'}
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDeleteAttribute(attribute.id, attribute.name)}
                          className="px-3 py-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-supersudo transition-colors"
                          title={t('admin.attributes.deleteAttribute')}
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Values Section */}
                  {isExpanded && (
                    <div className="border-t border-gray-200 p-4">
                      {/* Add Value Form */}
                      <div className="mb-4">
                        <div className="flex gap-2">
                          <div className="flex-1">
                            <input
                              type="text"
                              value={newValue}
                              onChange={(e) => {
                                setNewValue(e.target.value);
                                // Clear error when user starts typing
                                if (valueError) {
                                  setValueError(null);
                                }
                              }}
                              onKeyPress={(e) => {
                                if (e.key === 'Enter' && newValue.trim()) {
                                  handleAddValue(attribute.id);
                                }
                              }}
                              placeholder={t('admin.attributes.addNewValue')}
                              className={`
                                w-full px-3 py-2 border rounded-supersudo focus:ring-2 focus:border-transparent transition-colors
                                ${valueError 
                                  ? 'border-red-300 bg-red-50 focus:ring-red-500' 
                                  : 'border-gray-300 focus:ring-admin'
                                }
                              `}
                            />
                            {valueError && (
                              <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                {valueError}
                              </p>
                            )}
                          </div>
                          <button
                            onClick={() => handleAddValue(attribute.id)}
                            disabled={!newValue.trim() || addingValueTo === attribute.id}
                            className="flex cursor-pointer items-center gap-2 rounded-supersudo bg-admin px-4 py-2 text-white transition-colors hover:bg-admin-600 disabled:cursor-default disabled:opacity-50"
                          >
                            {addingValueTo === attribute.id ? (
                              <>
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                {t('admin.attributes.adding')}
                              </>
                            ) : (
                              <>
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                                {t('admin.attributes.add')}
                              </>
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Values List */}
                      {attribute.values.length === 0 ? (
                        <p className="text-sm text-gray-500 py-4 text-center">{t('admin.attributes.noValuesYet')}</p>
                      ) : (
                        <div className="space-y-2">
                          {attribute.values.map((value) => {
                            const isExpanded = expandedValueId === value.id;
                            return (
                              <div
                                key={value.id}
                                className="overflow-hidden rounded-supersudo border border-gray-200 bg-gray-50"
                              >
                                {/* Value Card */}
                                <div className="flex items-center justify-between p-3 transition-colors hover:bg-gray-100">
                                  <div className="flex items-center gap-2 flex-1">
                                    {/* Color swatch or image */}
                                    {value.colors && value.colors.length > 0 ? (
                                      <span
                                        className="inline-block w-5 h-5 rounded-full border border-gray-300 flex-shrink-0"
                                        style={{ backgroundColor: value.colors[0] }}
                                        title={value.colors[0]}
                                      />
                                    ) : value.imageUrl ? (
                                      <img
                                        src={value.imageUrl}
                                        alt={value.label}
                                        className="w-5 h-5 object-cover rounded-supersudo border border-gray-300 flex-shrink-0"
                                      />
                                    ) : null}
                                    <span className="text-sm font-medium text-gray-900">{value.label}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <button
                                      onClick={() => toggleValueEdit(attribute.id, value)}
                                      className="text-gray-600 hover:text-gray-900 transition-colors"
                                      title={t('admin.attributes.configureValue') || 'Configure value'}
                                    >
                                      <svg
                                        className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                      >
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                      </svg>
                                    </button>
                                    <button
                                      onClick={() => handleDeleteValue(attribute.id, value.id, value.label)}
                                      disabled={deletingValue === value.id}
                                      className="cursor-pointer text-admin-600 transition-colors hover:bg-admin-50 hover:text-admin-800 disabled:cursor-default disabled:opacity-50"
                                      title={t('admin.attributes.deleteValue')}
                                    >
                                      {deletingValue === value.id ? (
                                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-admin-600 border-t-transparent" />
                                      ) : (
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                      )}
                                    </button>
                                  </div>
                                </div>

                                {/* Inline Edit Form */}
                                {isExpanded && (
                                  <ValueEditForm
                                    attributeId={attribute.id}
                                    value={value}
                                    editingLabel={editingLabel}
                                    editingColors={editingColors}
                                    editingImageUrl={editingImageUrl}
                                    savingValue={savingValue}
                                    imageUploading={imageUploading}
                                    fileInputRef={fileInputRef}
                                    onLabelChange={setEditingLabel}
                                    onColorsChange={setEditingColors}
                                    onImageUpload={handleImageUpload}
                                    onRemoveImage={handleRemoveImage}
                                    onSave={handleSaveInlineValue}
                                    onCancel={() => toggleValueEdit(attribute.id, value)}
                                  />
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
}


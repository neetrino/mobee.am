'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '../../../lib/auth/AuthContext';
import { Card, Button } from '@/app/admin/lib/adminShopUi';
import { apiClient } from '../../../lib/api-client';
import { useTranslation } from '../../../lib/i18n-client';
import { ADMIN_SECONDARY_OUTLINE_BUTTON_EXTRA_CLASS } from '../admin-secondary-action-button.constants';
import { AdminPageShell } from '../components/AdminPageShell';
import { showToast } from '@/components/Toast';
import { ARMENIA_FALLBACK_DELIVERY_CITIES } from '../../../lib/constants/armenia-delivery-cities.constants';

const SUPPORTED_COUNTRIES = ['Armenia'] as const;

const SELECT_CLASS =
  'w-full px-3 py-2 border border-gray-300 rounded-supersudo bg-white focus:outline-none focus:ring-2 focus:ring-admin appearance-none bg-[length:1.25rem] bg-[right_0.75rem_center] bg-no-repeat pr-10';

const SELECT_CHEVRON_BG =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%236b7280'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E\")";

interface DeliveryLocation {
  id?: string;
  country: string;
  city: string;
  price: number;
}

interface DeliverySettings {
  locations: DeliveryLocation[];
}

export default function DeliveryPage() {
  const { t } = useTranslation();
  const { isLoggedIn, isAdmin, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [locations, setLocations] = useState<DeliveryLocation[]>([]);

  useEffect(() => {
    if (!isLoading) {
      if (!isLoggedIn || !isAdmin) {
        router.push('/supersudo');
        return;
      }
    }
  }, [isLoggedIn, isAdmin, isLoading, router]);

  useEffect(() => {
    if (isLoggedIn && isAdmin) {
      fetchDeliverySettings();
    }
  }, [isLoggedIn, isAdmin]);

  const fetchDeliverySettings = async () => {
    try {
      setLoading(true);
      console.log('[ADMIN] Fetching delivery settings...');
      const data = await apiClient.get<DeliverySettings>('/api/v1/admin/delivery');
      setLocations(data.locations || []);
      console.log('[ADMIN] Delivery settings loaded:', data);
    } catch (err: any) {
      console.error('[ADMIN] Error fetching delivery settings:', err);
      setLocations([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      console.log('[ADMIN] Saving delivery settings...', { locations });
      await apiClient.put('/api/v1/admin/delivery', { locations });
      showToast(t('admin.delivery.savedSuccess'), 'success');
      console.log('[ADMIN] Delivery settings saved');
      await fetchDeliverySettings();
    } catch (err: any) {
      console.error('[ADMIN] Error saving delivery settings:', err);
      const errorMessage = err.response?.data?.detail || err.message || 'Failed to save delivery settings';
      showToast(t('admin.delivery.errorSaving').replace('{message}', errorMessage), 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleAddLocation = () => {
    setLocations([...locations, { country: '', city: '', price: 1000 }]);
  };

  const handleUpdateLocation = (index: number, field: keyof DeliveryLocation, value: string | number) => {
    const updated = [...locations];
    updated[index] = { ...updated[index], [field]: value };
    setLocations(updated);
  };

  const handleDeleteLocation = (index: number) => {
    if (confirm(t('admin.delivery.deleteLocation'))) {
      const updated = locations.filter((_, i) => i !== index);
      setLocations(updated);
    }
  };

  if (isLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-admin mx-auto mb-4"></div>
          <p className="text-gray-600">{t('admin.common.loading')}</p>
        </div>
      </div>
    );
  }

  if (!isLoggedIn || !isAdmin) {
    return null;
  }

  return (
    <AdminPageShell currentPath={pathname || '/supersudo/delivery'} router={router} t={t}>
      <div className="mx-auto w-full max-w-7xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">{t('admin.delivery.title')}</h1>
        </div>

        <Card className="p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">{t('admin.delivery.deliveryPricesByLocation')}</h2>
            <Button
              variant="admin"
              onClick={handleAddLocation}
              disabled={saving}
              style={{ backgroundColor: '#2DB2FF' }}
            >
              {t('admin.delivery.addLocation')}
            </Button>
          </div>

          {locations.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>{t('admin.delivery.noLocations')}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {locations.map((location, index) => (
                <div key={index} className="border border-gray-200 rounded-supersudo p-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{t('admin.delivery.country')}</label>
                      <select
                        value={location.country}
                        onChange={(e) => handleUpdateLocation(index, 'country', e.target.value)}
                        className={SELECT_CLASS}
                        style={{ backgroundImage: SELECT_CHEVRON_BG }}
                        disabled={saving}
                      >
                        <option value="">{t('admin.delivery.selectCountry')}</option>
                        {SUPPORTED_COUNTRIES.map((country) => (
                          <option key={country} value={country}>
                            {country}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{t('admin.delivery.city')}</label>
                      <select
                        value={location.city}
                        onChange={(e) => handleUpdateLocation(index, 'city', e.target.value)}
                        className={SELECT_CLASS}
                        style={{ backgroundImage: SELECT_CHEVRON_BG }}
                        disabled={saving || !location.country}
                      >
                        <option value="">{t('admin.delivery.selectCity')}</option>
                        {ARMENIA_FALLBACK_DELIVERY_CITIES.map((city) => (
                          <option key={city} value={city}>
                            {city}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{t('admin.delivery.price')}</label>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          value={location.price}
                          onChange={(e) => handleUpdateLocation(index, 'price', parseFloat(e.target.value) || 0)}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-supersudo focus:outline-none focus:ring-2 focus:ring-admin"
                          placeholder={t('admin.delivery.pricePlaceholder')}
                          min="0"
                          step="100"
                        />
                        <button
                          onClick={() => handleDeleteLocation(index)}
                          className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-supersudo"
                          disabled={saving}
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <div className="flex gap-4">
          <Button
            variant="admin"
            onClick={handleSave}
            disabled={saving || locations.length === 0}
          >
            {saving ? t('admin.delivery.saving') : t('admin.delivery.saveSettings')}
          </Button>
          <Button
            type="button"
            variant="outline"
            className={ADMIN_SECONDARY_OUTLINE_BUTTON_EXTRA_CLASS}
            onClick={() => router.push('/supersudo')}
            disabled={saving}
          >
            {t('admin.delivery.cancel')}
          </Button>
        </div>
      </div>
    </AdminPageShell>
  );
}

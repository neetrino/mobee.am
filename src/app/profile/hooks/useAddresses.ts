import { useState, type FormEvent } from 'react';
import { apiClient } from '../../../lib/api-client';
import { useTranslation } from '../../../lib/i18n-client';
import type { Address, UserProfile } from '../types';

interface UseAddressesProps {
  profile: UserProfile | null;
  onProfileReload: () => void;
  onError: (error: string) => void;
  onSuccess: (message: string) => void;
}

export function useAddresses({
  profile,
  onProfileReload,
  onError,
  onSuccess,
}: UseAddressesProps) {
  const { t } = useTranslation();
  
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  const [addressForm, setAddressForm] = useState<Address>({
    firstName: '',
    lastName: '',
    company: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    postalCode: '',
    countryCode: 'AM',
    phone: '',
    isDefault: false,
  });
  const [savingAddress, setSavingAddress] = useState(false);

  const handleSaveAddress = async (e: FormEvent) => {
    e.preventDefault();
    setSavingAddress(true);
    onError('');
    onSuccess('');

    try {
      const addressId = editingAddress?.id || editingAddress?._id;
      if (addressId) {
        await apiClient.put(`/api/v1/users/addresses/${addressId}`, addressForm);
        onSuccess(t('profile.addresses.updatedSuccess'));
      } else {
        await apiClient.post('/api/v1/users/addresses', addressForm);
        onSuccess(t('profile.addresses.addedSuccess'));
      }
      
      await onProfileReload();
      setShowAddressForm(false);
      setEditingAddress(null);
      resetAddressForm();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      onError(errorMessage || t('profile.addresses.failedToSave'));
    } finally {
      setSavingAddress(false);
    }
  };

  const handleDeleteAddress = async (addressId: string) => {
    if (!confirm(t('profile.addresses.deleteConfirm'))) {
      return;
    }

    try {
      await apiClient.delete(`/api/v1/users/addresses/${addressId}`);
      onSuccess(t('profile.addresses.deletedSuccess'));
      await onProfileReload();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      onError(errorMessage || t('profile.addresses.failedToDelete'));
    }
  };

  const handleSetDefaultAddress = async (addressId: string) => {
    try {
      await apiClient.patch(`/api/v1/users/addresses/${addressId}/default`);
      onSuccess(t('profile.addresses.defaultUpdatedSuccess'));
      await onProfileReload();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      onError(errorMessage || t('profile.addresses.failedToSetDefault'));
    }
  };

  const handleEditAddress = (address: Address) => {
    setEditingAddress(address);
    setAddressForm({
      firstName: address.firstName || '',
      lastName: address.lastName || '',
      company: address.company || '',
      addressLine1: address.addressLine1 || '',
      addressLine2: address.addressLine2 || '',
      city: address.city || '',
      state: address.state || '',
      postalCode: address.postalCode || '',
      countryCode: address.countryCode || 'AM',
      phone: address.phone || '',
      isDefault: address.isDefault || false,
    });
    setShowAddressForm(true);
  };

  const resetAddressForm = () => {
    setAddressForm({
      firstName: profile?.firstName || '',
      lastName: profile?.lastName || '',
      company: '',
      addressLine1: '',
      addressLine2: '',
      city: '',
      state: '',
      postalCode: '',
      countryCode: 'AM',
      phone: profile?.phone || '',
      isDefault: false,
    });
    setEditingAddress(null);
  };

  return {
    showAddressForm,
    setShowAddressForm,
    editingAddress,
    setEditingAddress,
    addressForm,
    setAddressForm,
    savingAddress,
    handleSaveAddress,
    handleDeleteAddress,
    handleSetDefaultAddress,
    handleEditAddress,
    resetAddressForm,
  };
}


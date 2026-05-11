import { useProfile } from './hooks/useProfile';
import { usePersonalInfo } from './hooks/usePersonalInfo';
import { useAddresses } from './hooks/useAddresses';
import { usePassword } from './hooks/usePassword';
import { useDashboard } from './hooks/useDashboard';
import { useOrders } from './hooks/useOrders';
import { useProfileTabs } from './hooks/useProfileTabs';
import { useProfileDesktopLayout } from './hooks/useProfileDesktopLayout';
import { useCurrency } from './hooks/useCurrency';
import { useTranslation } from '../../lib/i18n-client';

export function useProfilePage() {
  const { t } = useTranslation();
  const isDesktopProfileLayout = useProfileDesktopLayout();

  const {
    profile,
    setProfile,
    loading,
    error,
    success,
    setError,
    setSuccess,
    loadProfile,
    isLoggedIn,
    authLoading,
  } = useProfile();

  const personalInfo = usePersonalInfo({
    profile,
    onProfileUpdate: (updated) => {
      setProfile(updated);
    },
    onError: setError,
    onSuccess: setSuccess,
  });

  const addresses = useAddresses({
    profile,
    onProfileReload: loadProfile,
    onError: setError,
    onSuccess: setSuccess,
  });

  const {
    activeTab,
    handleTabChange: baseHandleTabChange,
    closeProfileSheet,
    profileSheetOpen,
    highlightedTab,
  } = useProfileTabs();

  const tabDataEnabled = profileSheetOpen || isDesktopProfileLayout;

  const handleTabChange = (tab: typeof activeTab) => {
    baseHandleTabChange(tab);
    setError(null);
    setSuccess(null);
    if (tab !== 'addresses') {
      addresses.setShowAddressForm(false);
      addresses.setEditingAddress(null);
    }
  };

  const password = usePassword({
    onError: setError,
    onSuccess: setSuccess,
  });

  const dashboard = useDashboard({
    isLoggedIn,
    authLoading,
    activeTab,
    tabDataEnabled,
    onError: setError,
  });

  const orders = useOrders({
    isLoggedIn,
    authLoading,
    activeTab,
    tabDataEnabled,
    onError: setError,
    onSuccess: setSuccess,
  });

  const { currency } = useCurrency();

  return {
    isLoggedIn,
    authLoading,
    loading,
    error,
    success,
    setError,
    setSuccess,
    profile,
    activeTab,
    handleTabChange,
    closeProfileSheet,
    profileSheetOpen,
    highlightedTab,
    personalInfo: personalInfo.personalInfo,
    setPersonalInfo: personalInfo.setPersonalInfo,
    savingPersonal: personalInfo.savingPersonal,
    handleSavePersonalInfo: personalInfo.handleSavePersonalInfo,
    showAddressForm: addresses.showAddressForm,
    setShowAddressForm: addresses.setShowAddressForm,
    editingAddress: addresses.editingAddress,
    addressForm: addresses.addressForm,
    setAddressForm: addresses.setAddressForm,
    savingAddress: addresses.savingAddress,
    handleSaveAddress: addresses.handleSaveAddress,
    handleDeleteAddress: addresses.handleDeleteAddress,
    handleSetDefaultAddress: addresses.handleSetDefaultAddress,
    handleEditAddress: addresses.handleEditAddress,
    resetAddressForm: addresses.resetAddressForm,
    passwordForm: password.passwordForm,
    setPasswordForm: password.setPasswordForm,
    savingPassword: password.savingPassword,
    handleChangePassword: password.handleChangePassword,
    dashboardData: dashboard.dashboardData,
    dashboardLoading: dashboard.dashboardLoading,
    orders: orders.orders,
    ordersLoading: orders.ordersLoading,
    ordersPage: orders.ordersPage,
    setOrdersPage: orders.setOrdersPage,
    ordersMeta: orders.ordersMeta,
    selectedOrder: orders.selectedOrder,
    setSelectedOrder: orders.setSelectedOrder,
    orderDetailsLoading: orders.orderDetailsLoading,
    orderDetailsError: orders.orderDetailsError,
    isReordering: orders.isReordering,
    handleOrderClick: orders.handleOrderClick,
    handleReOrder: orders.handleReOrder,
    currency,
    t,
  };
}

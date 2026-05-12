'use client';

import { Suspense, startTransition, useMemo } from 'react';
import { useAuth } from '../../lib/auth/AuthContext';
import { useTranslation } from '../../lib/i18n-client';
import { useProfilePage } from './useProfilePage';
import { ProfileHeader } from './ProfileHeader';
import { OrderDetailsModal } from './OrderDetailsModal';
import { ProfileDesktopMain } from './ProfileDesktopMain';
import { ProfileSectionHost } from './ProfileSectionHost';
import type { ProfileTabConfig } from './types';

function ProfilePageContent() {
  const { isLoggedIn, isLoading: authLoading } = useAuth();
  const { t } = useTranslation();

  const {
    loading,
    error,
    success,
    profile,
    activeTab,
    handleTabChange,
    closeProfileSheet,
    profileSheetOpen,
    highlightedTab,
    personalInfo,
    setPersonalInfo,
    savingPersonal,
    handleSavePersonalInfo,
    showAddressForm,
    setShowAddressForm,
    editingAddress,
    addressForm,
    setAddressForm,
    savingAddress,
    handleSaveAddress,
    handleDeleteAddress,
    handleSetDefaultAddress,
    handleEditAddress,
    resetAddressForm,
    passwordForm,
    setPasswordForm,
    savingPassword,
    handleChangePassword,
    dashboardData,
    dashboardLoading,
    orders,
    ordersLoading,
    ordersPage,
    setOrdersPage,
    ordersMeta,
    selectedOrder,
    setSelectedOrder,
    orderDetailsLoading,
    orderDetailsError,
    isReordering,
    handleOrderClick,
    handleReOrder,
    currency,
  } = useProfilePage();

  const tabs: ProfileTabConfig[] = useMemo(
    () => [
      {
        id: 'dashboard',
        label: t('profile.tabs.dashboard'),
        icon: (
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
            />
          </svg>
        ),
      },
      {
        id: 'orders',
        label: t('profile.tabs.orders'),
        icon: (
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
            />
          </svg>
        ),
      },
      {
        id: 'personal',
        label: t('profile.tabs.personal'),
        icon: (
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
            />
          </svg>
        ),
      },
      {
        id: 'addresses',
        label: t('profile.tabs.addresses'),
        icon: (
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
            />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        ),
      },
      {
        id: 'password',
        label: t('profile.tabs.password'),
        icon: (
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
            />
          </svg>
        ),
      },
    ],
    [t],
  );

  const modalTitle = tabs.find((tab) => tab.id === activeTab)?.label ?? '';

  if (authLoading || loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="text-center">
          <p className="text-gray-600">{t('profile.common.loadingProfile')}</p>
        </div>
      </div>
    );
  }

  if (!isLoggedIn) {
    return null;
  }

  const sheetProps = {
    activeTab,
    dashboardData,
    dashboardLoading,
    currency,
    handleTabChange,
    handleOrderClick,
    t,
    personalInfo,
    setPersonalInfo,
    savingPersonal,
    handleSavePersonalInfo,
    profile,
    showAddressForm,
    setShowAddressForm,
    editingAddress,
    addressForm,
    setAddressForm,
    savingAddress,
    handleSaveAddress,
    handleDeleteAddress,
    handleSetDefaultAddress,
    handleEditAddress,
    resetAddressForm,
    orders,
    ordersLoading,
    ordersPage,
    setOrdersPage,
    ordersMeta,
    passwordForm,
    setPasswordForm,
    savingPassword,
    handleChangePassword,
  };

  return (
    <>
      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <div className="flex w-full flex-col gap-4 lg:grid lg:grid-cols-[max-content_minmax(0,1fr)] lg:items-start lg:gap-8">
          <ProfileHeader
            profile={profile}
            tabs={tabs}
            activeTab={activeTab}
            onTabChange={handleTabChange}
            highlightedTab={highlightedTab}
            onOpenTab={handleTabChange}
            t={t}
          />

          <ProfileDesktopMain
            error={error}
            success={success}
            activeTab={activeTab}
            dashboardData={dashboardData}
            dashboardLoading={dashboardLoading}
            currency={currency}
            handleTabChange={handleTabChange}
            handleOrderClick={handleOrderClick}
            t={t}
            personalInfo={personalInfo}
            setPersonalInfo={setPersonalInfo}
            savingPersonal={savingPersonal}
            handleSavePersonalInfo={handleSavePersonalInfo}
            profile={profile}
            showAddressForm={showAddressForm}
            setShowAddressForm={setShowAddressForm}
            editingAddress={editingAddress}
            addressForm={addressForm}
            setAddressForm={setAddressForm}
            savingAddress={savingAddress}
            handleSaveAddress={handleSaveAddress}
            handleDeleteAddress={handleDeleteAddress}
            handleSetDefaultAddress={handleSetDefaultAddress}
            handleEditAddress={handleEditAddress}
            resetAddressForm={resetAddressForm}
            orders={orders}
            ordersLoading={ordersLoading}
            ordersPage={ordersPage}
            setOrdersPage={setOrdersPage}
            ordersMeta={ordersMeta}
            passwordForm={passwordForm}
            setPasswordForm={setPasswordForm}
            savingPassword={savingPassword}
            handleChangePassword={handleChangePassword}
          />

          {/* Mobile — алерты + модалка секций */}
          <div className="flex w-full flex-col gap-4 lg:hidden">
            {error && (
              <div className="rounded-[15px] border border-red-200 bg-red-50 p-4">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}
            {success && (
              <div className="rounded-[15px] border border-green-200 bg-green-50 p-4">
                <p className="text-sm text-green-600">{success}</p>
              </div>
            )}
            <ProfileSectionHost
              profileSheetOpen={profileSheetOpen}
              isDesktopLayout={false}
              modalTitle={modalTitle}
              onCloseSheet={closeProfileSheet}
              closeLabel={t('common.buttons.close')}
              {...sheetProps}
            />
          </div>
        </div>
      </div>

      {selectedOrder && (
        <OrderDetailsModal
          selectedOrder={selectedOrder}
          orderDetailsLoading={orderDetailsLoading}
          orderDetailsError={orderDetailsError}
          isReordering={isReordering}
          currency={currency}
          onClose={() => startTransition(() => setSelectedOrder(null))}
          onReOrder={handleReOrder}
          t={t}
        />
      )}
    </>
  );
}

export default function ProfilePage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="text-center">
            <p className="text-gray-600">Loading profile...</p>
          </div>
        </div>
      }
    >
      <ProfilePageContent />
    </Suspense>
  );
}

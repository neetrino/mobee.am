'use client';

import type { CurrencyCode } from '../../lib/currency';
import type { FormEvent, MouseEvent } from 'react';
import type { Address, DashboardData, OrderListItem, ProfileTab, UserProfile } from './types';
import { ProfileDashboard } from './ProfileDashboard';
import { ProfilePersonalInfo } from './ProfilePersonalInfo';
import { ProfileAddresses } from './ProfileAddresses';
import { ProfileOrders } from './ProfileOrders';
import { ProfilePassword } from './ProfilePassword';

interface ProfileDesktopMainProps {
  error: string | null;
  success: string | null;
  activeTab: ProfileTab;
  dashboardData: DashboardData | null;
  dashboardLoading: boolean;
  currency: CurrencyCode;
  handleTabChange: (tab: ProfileTab) => void;
  handleOrderClick: (orderNumber: string, e: MouseEvent<HTMLAnchorElement>) => void;
  t: (key: string) => string;
  personalInfo: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  };
  setPersonalInfo: (info: ProfileDesktopMainProps['personalInfo']) => void;
  savingPersonal: boolean;
  handleSavePersonalInfo: (e: FormEvent) => void;
  profile: UserProfile | null;
  showAddressForm: boolean;
  setShowAddressForm: (show: boolean) => void;
  editingAddress: Address | null;
  addressForm: Address;
  setAddressForm: (form: Address) => void;
  savingAddress: boolean;
  handleSaveAddress: (e: FormEvent) => void;
  handleDeleteAddress: (id: string) => void;
  handleSetDefaultAddress: (id: string) => void;
  handleEditAddress: (address: Address) => void;
  resetAddressForm: () => void;
  orders: OrderListItem[];
  ordersLoading: boolean;
  ordersPage: number;
  setOrdersPage: (page: number | ((prev: number) => number)) => void;
  ordersMeta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  } | null;
  passwordForm: {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
  };
  setPasswordForm: (form: ProfileDesktopMainProps['passwordForm']) => void;
  savingPassword: boolean;
  handleChangePassword: (e: FormEvent) => void;
}

/** Desktop profile: alerts + active tab panel (commit layout). */
export function ProfileDesktopMain(props: ProfileDesktopMainProps) {
  const { error, success, activeTab, t } = props;

  return (
    <div className="hidden min-w-0 w-full lg:block">
      {error && (
        <div className="mb-6 rounded-[15px] border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}
      {success && (
        <div className="mb-6 rounded-[15px] border border-green-200 bg-green-50 p-4">
          <p className="text-sm text-green-600">{success}</p>
        </div>
      )}

      {activeTab === 'dashboard' && (
        <ProfileDashboard
          dashboardData={props.dashboardData}
          dashboardLoading={props.dashboardLoading}
          currency={props.currency}
          onTabChange={props.handleTabChange}
          onOrderClick={props.handleOrderClick}
          t={t}
        />
      )}
      {activeTab === 'personal' && (
        <ProfilePersonalInfo
          personalInfo={props.personalInfo}
          setPersonalInfo={props.setPersonalInfo}
          savingPersonal={props.savingPersonal}
          onSave={props.handleSavePersonalInfo}
          profile={props.profile}
          t={t}
        />
      )}
      {activeTab === 'addresses' && (
        <ProfileAddresses
          profile={props.profile}
          showAddressForm={props.showAddressForm}
          setShowAddressForm={props.setShowAddressForm}
          editingAddress={props.editingAddress}
          addressForm={props.addressForm}
          setAddressForm={props.setAddressForm}
          savingAddress={props.savingAddress}
          onSave={props.handleSaveAddress}
          onDelete={props.handleDeleteAddress}
          onSetDefault={props.handleSetDefaultAddress}
          onEdit={props.handleEditAddress}
          onResetForm={props.resetAddressForm}
          t={t}
        />
      )}
      {activeTab === 'orders' && (
        <ProfileOrders
          orders={props.orders}
          ordersLoading={props.ordersLoading}
          ordersPage={props.ordersPage}
          setOrdersPage={props.setOrdersPage}
          ordersMeta={props.ordersMeta}
          currency={props.currency}
          onOrderClick={props.handleOrderClick}
          t={t}
        />
      )}
      {activeTab === 'password' && (
        <ProfilePassword
          passwordForm={props.passwordForm}
          setPasswordForm={props.setPasswordForm}
          savingPassword={props.savingPassword}
          onSave={props.handleChangePassword}
          t={t}
        />
      )}
    </div>
  );
}

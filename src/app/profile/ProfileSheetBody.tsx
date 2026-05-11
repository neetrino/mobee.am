'use client';

import type { FormEvent, MouseEvent } from 'react';
import type { CurrencyCode } from '../../lib/currency';
import type { Address, DashboardData, OrderListItem, ProfileTab, UserProfile } from './types';
import { ProfileDashboard } from './ProfileDashboard';
import { ProfileOrders } from './ProfileOrders';
import { ProfilePersonalInfo } from './ProfilePersonalInfo';
import { ProfileAddresses } from './ProfileAddresses';
import { ProfilePassword } from './ProfilePassword';

interface ProfileSheetBodyProps {
  activeTab: ProfileTab;
  dashboardData: DashboardData | null;
  dashboardLoading: boolean;
  currency: CurrencyCode;
  handleTabChange: (tab: ProfileTab) => void;
  handleOrderClick: (order: OrderListItem, e: MouseEvent<HTMLAnchorElement>) => void;
  t: (key: string) => string;
  personalInfo: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  };
  setPersonalInfo: (info: ProfileSheetBodyProps['personalInfo']) => void;
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
  setPasswordForm: (form: ProfileSheetBodyProps['passwordForm']) => void;
  savingPassword: boolean;
  handleChangePassword: (e: FormEvent) => void;
}

export function ProfileSheetBody(props: ProfileSheetBodyProps) {
  const { activeTab, t } = props;

  switch (activeTab) {
    case 'dashboard':
      return (
        <ProfileDashboard
          dashboardData={props.dashboardData}
          dashboardLoading={props.dashboardLoading}
          currency={props.currency}
          onTabChange={props.handleTabChange}
          onOrderClick={props.handleOrderClick}
          t={t}
        />
      );
    case 'orders':
      return (
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
      );
    case 'personal':
      return (
        <ProfilePersonalInfo
          personalInfo={props.personalInfo}
          setPersonalInfo={props.setPersonalInfo}
          savingPersonal={props.savingPersonal}
          onSave={props.handleSavePersonalInfo}
          profile={props.profile}
          t={t}
        />
      );
    case 'addresses':
      return (
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
      );
    case 'password':
      return (
        <ProfilePassword
          passwordForm={props.passwordForm}
          setPasswordForm={props.setPasswordForm}
          savingPassword={props.savingPassword}
          onSave={props.handleChangePassword}
          t={t}
        />
      );
    default:
      return null;
  }
}

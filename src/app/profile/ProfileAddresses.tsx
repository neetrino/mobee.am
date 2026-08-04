import type { FormEvent } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { Button, Input } from '@shop/ui';
import { PROFILE_PILL_BUTTON_CLASS } from './profileUi.constants';
import { ProfileSectionCard } from './ProfileSectionCard';
import type { Address, UserProfile } from './types';

const ADDRESS_ICON_BUTTON_CLASS =
  'inline-flex size-9 shrink-0 items-center justify-center rounded-full text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-admin-400';

const ADDRESS_DELETE_ICON_BUTTON_CLASS =
  'inline-flex size-9 shrink-0 items-center justify-center rounded-full text-red-600 transition-colors hover:bg-red-50 hover:text-red-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400';

interface ProfileAddressesProps {
  profile: UserProfile | null;
  showAddressForm: boolean;
  setShowAddressForm: (show: boolean) => void;
  editingAddress: Address | null;
  addressForm: Address;
  setAddressForm: (address: Address) => void;
  savingAddress: boolean;
  onSave: (e: FormEvent) => void;
  onDelete: (addressId: string) => void;
  onSetDefault: (addressId: string) => void;
  onEdit: (address: Address) => void;
  onResetForm: () => void;
  t: (key: string) => string;
  /** When true, omit outer Card — modal/sheet already provides the frame. */
  embeddedInSheet?: boolean;
}

export function ProfileAddresses({
  profile,
  showAddressForm,
  setShowAddressForm,
  editingAddress,
  addressForm,
  setAddressForm,
  savingAddress,
  onSave,
  onDelete,
  onSetDefault,
  onEdit,
  onResetForm,
  t,
  embeddedInSheet = false,
}: ProfileAddressesProps) {
  return (
    <ProfileSectionCard embeddedInSheet={embeddedInSheet}>
        {!embeddedInSheet || !showAddressForm ? (
          <div className="mb-6 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-2">
            {!embeddedInSheet ? (
              <h2 className="whitespace-nowrap text-xl font-semibold text-gray-900">
                {t('profile.addresses.title')}
              </h2>
            ) : null}
            {!showAddressForm ? (
              <Button
                variant="brand"
                className={`${PROFILE_PILL_BUTTON_CLASS} w-full whitespace-nowrap sm:w-auto`}
                onClick={() => {
                  onResetForm();
                  setShowAddressForm(true);
                }}
              >
                {`+ ${t('profile.addresses.addNew')}`}
              </Button>
            ) : null}
          </div>
        ) : null}

        {/* Address Form */}
        {showAddressForm && (
          <form onSubmit={onSave} className="mb-6 space-y-4 rounded-[15px] bg-gray-50 p-4">
            <h3 className="font-semibold text-gray-900">
              {editingAddress ? t('profile.addresses.form.editTitle') : t('profile.addresses.form.addTitle')}
            </h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Input
                label={t('profile.addresses.form.addressLine1')}
                value={addressForm.addressLine1}
                onChange={(e) => setAddressForm({ ...addressForm, addressLine1: e.target.value })}
                required
              />
              <Input
                label={t('profile.addresses.form.city')}
                value={addressForm.city}
                onChange={(e) => setAddressForm({ ...addressForm, city: e.target.value })}
                required
              />
            </div>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={addressForm.isDefault || false}
                onChange={(e) => setAddressForm({ ...addressForm, isDefault: e.target.checked })}
                className="rounded border-gray-300 text-gray-900 focus:ring-gray-900"
              />
              <span className="ml-2 text-sm text-gray-700">{t('profile.addresses.form.isDefault')}</span>
            </label>
            <div className="flex flex-wrap items-center gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                className={PROFILE_PILL_BUTTON_CLASS}
                disabled={savingAddress}
                onClick={() => {
                  setShowAddressForm(false);
                  onResetForm();
                }}
              >
                {t('profile.addresses.form.cancel')}
              </Button>
              <Button type="submit" variant="brand" className={PROFILE_PILL_BUTTON_CLASS} disabled={savingAddress}>
                {savingAddress
                  ? t('profile.addresses.form.saving')
                  : editingAddress
                    ? t('profile.addresses.form.saveMobile')
                    : t('profile.addresses.form.add')}
              </Button>
            </div>
          </form>
        )}

        {/* Addresses List — default address always first */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {profile?.addresses && profile.addresses.length > 0 ? (
            [...profile.addresses]
              .sort((left, right) => Number(Boolean(right.isDefault)) - Number(Boolean(left.isDefault)))
              .map((address, index) => (
              <div
                key={address.id || address._id || index}
                className="relative h-full rounded-[15px] border border-gray-200 p-4 pr-20 transition-colors hover:border-gray-300"
              >
                <div className="absolute right-2 top-2 flex items-center gap-0.5">
                  <button
                    type="button"
                    className={ADDRESS_ICON_BUTTON_CLASS}
                    onClick={() => onEdit(address)}
                    aria-label={t('profile.addresses.edit')}
                  >
                    <Pencil className="size-4" aria-hidden />
                  </button>
                  <button
                    type="button"
                    className={ADDRESS_DELETE_ICON_BUTTON_CLASS}
                    onClick={() => onDelete((address.id || address._id)!)}
                    aria-label={t('profile.addresses.delete')}
                  >
                    <Trash2 className="size-4" aria-hidden />
                  </button>
                </div>
                <div className="flex flex-col gap-3">
                  <div className="min-w-0">
                    <div className="mb-2 flex items-center gap-2">
                      {address.isDefault && (
                        <span className="rounded bg-blue-100 px-2 py-1 text-xs font-medium text-blue-800">
                          {t('profile.addresses.default')}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-700">{address.addressLine1}</p>
                    <p className="text-sm text-gray-700">{address.city}</p>
                  </div>
                  {!address.isDefault && (
                    <Button
                      variant="outline"
                      size="sm"
                      className={`${PROFILE_PILL_BUTTON_CLASS} w-full min-w-0 max-w-full justify-center !px-3 text-sm whitespace-nowrap sm:w-auto`}
                      onClick={() => onSetDefault((address.id || address._id)!)}
                      aria-label={t('profile.addresses.setDefault')}
                    >
                      <span className="sm:hidden">{t('profile.addresses.setDefaultMobile')}</span>
                      <span className="hidden sm:inline">{t('profile.addresses.setDefault')}</span>
                    </Button>
                  )}
                </div>
              </div>
            ))
          ) : (
            <p className="col-span-full py-8 text-center text-gray-500">{t('profile.addresses.noAddresses')}</p>
          )}
        </div>
    </ProfileSectionCard>
  );
}




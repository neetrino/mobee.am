'use client';

import { Card, Button } from '@shop/ui';
import { useRouter } from 'next/navigation';
import { useTranslation } from '../../../lib/i18n-client';

export function QuickActionsCard() {
  const { t } = useTranslation();
  const router = useRouter();

  return (
    <Card className="p-6 mb-8">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">{t('admin.dashboard.quickActions')}</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Button
          variant="outline"
          onClick={() => router.push('/admin/products/add')}
          className="justify-start h-auto py-4"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <div className="text-left">
              <p className="font-medium text-gray-900">{t('admin.dashboard.addProduct')}</p>
              <p className="text-xs text-gray-500">{t('admin.dashboard.createNewProduct')}</p>
            </div>
          </div>
        </Button>
        <Button
          variant="outline"
          onClick={() => router.push('/admin/orders')}
          className="justify-start h-auto py-4"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <div className="text-left">
              <p className="font-medium text-gray-900">{t('admin.dashboard.manageOrders')}</p>
              <p className="text-xs text-gray-500">{t('admin.dashboard.viewAllOrders')}</p>
            </div>
          </div>
        </Button>
        <Button
          variant="outline"
          onClick={() => router.push('/admin/users')}
          className="justify-start h-auto py-4"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
              <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <div className="text-left">
              <p className="font-medium text-gray-900">{t('admin.dashboard.manageUsers')}</p>
              <p className="text-xs text-gray-500">{t('admin.dashboard.viewAllUsers')}</p>
            </div>
          </div>
        </Button>
        <Button
          variant="outline"
          onClick={() => router.push('/admin/settings')}
          className="justify-start h-auto py-4"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
              <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div className="text-left">
              <p className="font-medium text-gray-900">{t('admin.dashboard.settings')}</p>
              <p className="text-xs text-gray-500">{t('admin.dashboard.configureSystem')}</p>
            </div>
          </div>
        </Button>
      </div>
    </Card>
  );
}


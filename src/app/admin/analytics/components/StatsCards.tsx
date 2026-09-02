'use client';

import { useRouter } from 'next/navigation';
import { useTranslation } from '../../../../lib/i18n-client';
import { formatCurrency } from '../utils';
import type { AnalyticsData } from '../types';
import {
  ADMIN_DASH_CARD_CLASS,
  ADMIN_DASH_CARD_HOVER_CLASS,
  ADMIN_DASH_TONE,
} from '../../dashboard-ui.constants';

interface StatsCardsProps {
  analytics: AnalyticsData;
  totalUsers: number | null;
}

function MetricCell({
  label,
  value,
  tone,
  onClick,
}: {
  label: string;
  value: string;
  tone: keyof typeof ADMIN_DASH_TONE;
  onClick?: () => void;
}) {
  const className = `rounded-[12px] px-3 py-2.5 ring-1 ${ADMIN_DASH_TONE[tone]} ${ADMIN_DASH_CARD_HOVER_CLASS} ${
    onClick ? 'cursor-pointer' : ''
  }`;

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={`${className} w-full text-left`}>
        <p className="text-[11px] font-medium text-gray-500">{label}</p>
        <p className="mt-0.5 break-words text-lg font-bold leading-snug text-gray-900">{value}</p>
      </button>
    );
  }

  return (
    <div className={className}>
      <p className="text-[11px] font-medium text-gray-500">{label}</p>
      <p className="mt-0.5 break-words text-lg font-bold leading-snug text-gray-900">{value}</p>
    </div>
  );
}

export function StatsCards({ analytics, totalUsers }: StatsCardsProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const aov =
    analytics.orders.totalOrders > 0
      ? Math.round((analytics.orders.totalRevenue / analytics.orders.totalOrders) * 100) / 100
      : 0;

  return (
    <div className="mb-3">
      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500">
        {t('admin.analytics.rangeTitle')}
      </h2>
      <div className={`grid grid-cols-2 gap-2 lg:grid-cols-4 ${ADMIN_DASH_CARD_CLASS} p-3`}>
        <MetricCell
          label={t('admin.analytics.totalRevenue')}
          value={formatCurrency(analytics.orders.totalRevenue, analytics.orders.currency)}
          tone="primary"
          onClick={() => router.push('/supersudo/orders?paymentStatus=paid')}
        />
        <MetricCell
          label={t('admin.analytics.totalOrders')}
          value={String(analytics.orders.totalOrders)}
          tone="accent"
          onClick={() => router.push('/supersudo/orders')}
        />
        <MetricCell
          label={t('admin.analytics.aov')}
          value={formatCurrency(aov, analytics.orders.currency)}
          tone="ink"
        />
        <MetricCell
          label={t('admin.analytics.totalUsers')}
          value={totalUsers !== null ? String(totalUsers) : '—'}
          tone="surface"
        />
      </div>
    </div>
  );
}

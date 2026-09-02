'use client';

import Link from 'next/link';
import { useTranslation } from '../../../lib/i18n-client';
import {
  ADMIN_DASH_CARD_CLASS,
  ADMIN_DASH_CARD_HOVER_CLASS,
  ADMIN_DASH_CHIP_ACCENT,
  ADMIN_DASH_CHIP_PRIMARY,
} from '../dashboard-ui.constants';

interface Stats {
  users: { total: number };
  products: { total: number; lowStock: number };
  orders: { total: number; recent: number; pending: number };
  revenue: { total: number; currency: string };
}

interface StatsGridProps {
  stats: Stats | null;
  statsLoading: boolean;
}

function CompactStat({
  href,
  label,
  value,
  loading,
  iconBg,
  iconColor,
  iconPath,
}: {
  href: string;
  label: string;
  value: string;
  loading: boolean;
  iconBg: string;
  iconColor: string;
  iconPath: string;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 px-4 py-3 ${ADMIN_DASH_CARD_CLASS} ${ADMIN_DASH_CARD_HOVER_CLASS}`}
    >
      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${iconBg}`}>
        <svg className={`h-4 w-4 ${iconColor}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={iconPath} />
        </svg>
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-gray-500">{label}</p>
        {loading ? (
          <div className="mt-1 h-6 w-14 animate-pulse rounded bg-gray-200" />
        ) : (
          <p className="text-lg font-bold leading-tight text-gray-900">{value}</p>
        )}
      </div>
    </Link>
  );
}

export function StatsGrid({ stats, statsLoading }: StatsGridProps) {
  const { t } = useTranslation();

  return (
    <div className="mb-3 grid grid-cols-2 gap-3">
      <CompactStat
        href="/supersudo/users"
        label={t('admin.dashboard.totalUsers')}
        value={String(stats?.users.total ?? 0)}
        loading={statsLoading}
        iconBg={ADMIN_DASH_CHIP_PRIMARY.bg}
        iconColor={ADMIN_DASH_CHIP_PRIMARY.fg}
        iconPath="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
      />
      <CompactStat
        href="/supersudo/products"
        label={t('admin.dashboard.totalProducts')}
        value={String(stats?.products.total ?? 0)}
        loading={statsLoading}
        iconBg={ADMIN_DASH_CHIP_ACCENT.bg}
        iconColor={ADMIN_DASH_CHIP_ACCENT.fg}
        iconPath="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
      />
    </div>
  );
}

'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '../../../lib/auth/AuthContext';
import { useTranslation } from '../../../lib/i18n-client';
import { apiClient } from '../../../lib/api-client';
import { AdminPageShell } from '../components/AdminPageShell';

interface InventoryRow {
  id: string;
  sku: string | null;
  productTitle: string;
  stock: number;
  stockReserved: number;
  stockAvailable: number;
}

interface ReconciliationSummary {
  variantsCount: number;
  stockTotal: number;
  stockReservedTotal: number;
  stockAvailableTotal: number;
}

export default function AdminInventoryPage() {
  const { t } = useTranslation();
  const { isLoggedIn, isAdmin, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [items, setItems] = useState<InventoryRow[]>([]);
  const [summary, setSummary] = useState<ReconciliationSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [variantId, setVariantId] = useState('');
  const [quantityDelta, setQuantityDelta] = useState('1');
  const [reason, setReason] = useState('manual-adjustment');
  const [note, setNote] = useState('');

  useEffect(() => {
    if (!isLoading && (!isLoggedIn || !isAdmin)) {
      router.push('/supersudo');
    }
  }, [isLoading, isLoggedIn, isAdmin, router]);

  useEffect(() => {
    if (isLoggedIn && isAdmin) {
      void loadData();
    }
  }, [isLoggedIn, isAdmin]);

  async function loadData() {
    setLoading(true);
    try {
      const [listResponse, reportResponse] = await Promise.all([
        apiClient.get<{ data: InventoryRow[] }>('/api/v1/admin/inventory', {
          params: { page: '1', limit: '25' },
        }),
        apiClient.get<{ summary: ReconciliationSummary }>('/api/v1/admin/inventory', {
          params: { report: 'reconciliation' },
        }),
      ]);
      setItems(listResponse.data || []);
      setSummary(reportResponse.summary || null);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    try {
      await apiClient.post('/api/v1/admin/inventory/adjustments', {
        variantId: variantId.trim(),
        quantityDelta: Number.parseInt(quantityDelta, 10),
        reason,
        note: note.trim() || undefined,
      });
      setNote('');
      await loadData();
    } catch (error) {
      console.error('Inventory adjustment failed', error);
    } finally {
      setSubmitting(false);
    }
  }

  if (isLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600">{t('admin.common.loading')}</div>
      </div>
    );
  }

  if (!isLoggedIn || !isAdmin) {
    return null;
  }

  return (
    <AdminPageShell currentPath={pathname || '/supersudo/inventory'} router={router} t={t}>
      <div className="max-w-7xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">{t('admin.inventory.title')}</h1>
          <p className="text-gray-600 mt-2">{t('admin.inventory.subtitle')}</p>
        </div>
        <div className="space-y-6">
          <section className="bg-white border border-gray-200 rounded-supersudo p-4">
            <h2 className="text-lg font-semibold mb-3">{t('admin.inventory.reconciliation')}</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div><span className="text-gray-500">{t('admin.inventory.variants')}</span><div>{summary?.variantsCount ?? 0}</div></div>
              <div><span className="text-gray-500">{t('admin.inventory.stockTotal')}</span><div>{summary?.stockTotal ?? 0}</div></div>
              <div><span className="text-gray-500">{t('admin.inventory.stockReservedTotal')}</span><div>{summary?.stockReservedTotal ?? 0}</div></div>
              <div><span className="text-gray-500">{t('admin.inventory.stockAvailableTotal')}</span><div>{summary?.stockAvailableTotal ?? 0}</div></div>
            </div>
          </section>

          <section className="bg-white border border-gray-200 rounded-supersudo p-4">
            <h2 className="text-lg font-semibold mb-3">{t('admin.inventory.adjustStock')}</h2>
            <form className="grid grid-cols-1 md:grid-cols-4 gap-3" onSubmit={handleSubmit}>
              <input className="border rounded-supersudo px-3 py-2" placeholder="variantId" value={variantId} onChange={(e) => setVariantId(e.target.value)} required />
              <input className="border rounded-supersudo px-3 py-2" placeholder="quantity delta" value={quantityDelta} onChange={(e) => setQuantityDelta(e.target.value)} required />
              <input className="border rounded-supersudo px-3 py-2" placeholder="reason" value={reason} onChange={(e) => setReason(e.target.value)} required />
              <input className="border rounded-supersudo px-3 py-2" placeholder="note (optional)" value={note} onChange={(e) => setNote(e.target.value)} />
              <button type="submit" disabled={submitting} className="md:col-span-4 bg-admin text-white rounded-supersudo px-4 py-2 disabled:opacity-70">
                {submitting ? t('admin.common.saving') : t('admin.inventory.applyAdjustment')}
              </button>
            </form>
          </section>

          <section className="bg-white border border-gray-200 rounded-supersudo p-4">
            <h2 className="text-lg font-semibold mb-3">{t('admin.inventory.currentStock')}</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left border-b">
                    <th className="py-2">SKU</th>
                    <th className="py-2">{t('admin.inventory.product')}</th>
                    <th className="py-2">{t('admin.inventory.stock')}</th>
                    <th className="py-2">{t('admin.inventory.reserved')}</th>
                    <th className="py-2">{t('admin.inventory.available')}</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id} className="border-b">
                      <td className="py-2">{item.sku || '-'}</td>
                      <td className="py-2">{item.productTitle}</td>
                      <td className="py-2">{item.stock}</td>
                      <td className="py-2">{item.stockReserved}</td>
                      <td className="py-2">{item.stockAvailable}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>
    </AdminPageShell>
  );
}

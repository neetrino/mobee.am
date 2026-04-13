'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../lib/auth/AuthContext';
import { Card, Button } from '@shop/ui';
import { apiClient } from '../../../lib/api-client';
import { useTranslation } from '../../../lib/i18n-client';

interface Message {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  createdAt: string;
}

interface MessagesResponse {
  data: Message[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export default function MessagesPage() {
  const { t } = useTranslation();
  const { isLoggedIn, isAdmin, isLoading } = useAuth();
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState<MessagesResponse['meta'] | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);

  useEffect(() => {
    if (!isLoading) {
      if (!isLoggedIn || !isAdmin) {
        router.push('/admin');
        return;
      }
    }
  }, [isLoggedIn, isAdmin, isLoading, router]);

  const fetchMessages = useCallback(async () => {
    try {
      setLoading(true);
      console.log('📧 [ADMIN] Fetching messages...', { page });
      
      const response = await apiClient.get<MessagesResponse>('/api/v1/admin/messages', {
        params: {
          page: page.toString(),
          limit: '20',
        },
      });

      console.log('✅ [ADMIN] Messages fetched:', response);
      setMessages(response.data || []);
      setMeta(response.meta || null);
    } catch (err) {
      console.error('❌ [ADMIN] Error fetching messages:', err);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    if (isLoggedIn && isAdmin) {
      fetchMessages();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn, isAdmin, page]);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (messages.length === 0) return;
    setSelectedIds((prev) => {
      const allIds = messages.map((m) => m.id);
      const hasAll = allIds.every((id) => prev.has(id));
      return hasAll ? new Set() : new Set(allIds);
    });
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(t('admin.messages.deleteConfirm').replace('{count}', selectedIds.size.toString()))) return;
    setBulkDeleting(true);
    try {
      const ids = Array.from(selectedIds);
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
      const response = await fetch('/api/v1/admin/messages', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ ids }),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || errorData.message || 'Failed to delete messages');
      }
      
      setSelectedIds(new Set());
      await fetchMessages();
      alert(t('admin.messages.deletedSuccess'));
    } catch (err: any) {
      console.error('❌ [ADMIN] Bulk delete messages error:', err);
      alert(t('admin.messages.failedToDelete') + ': ' + (err.message || 'Unknown error'));
    } finally {
      setBulkDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">{t('admin.common.loading')}</p>
        </div>
      </div>
    );
  }

  if (!isLoggedIn || !isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <button
            onClick={() => router.push('/admin')}
            className="text-gray-600 hover:text-gray-900 mb-4 flex items-center"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            {t('admin.messages.backToAdmin')}
          </button>
          <h1 className="text-3xl font-bold text-gray-900">{t('admin.messages.title')}</h1>
        </div>

        {/* Messages Table */}
        <Card className="p-6">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
              <p className="text-gray-600">{t('admin.messages.loadingMessages')}</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-600">{t('admin.messages.noMessages')}</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3">
                        <input
                          type="checkbox"
                          aria-label={t('admin.messages.selectAll')}
                          checked={messages.length > 0 && messages.every(m => selectedIds.has(m.id))}
                          onChange={toggleSelectAll}
                        />
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t('admin.messages.name')}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t('admin.messages.email')}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t('admin.messages.subject')}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t('admin.messages.message')}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t('admin.messages.date')}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {messages.map((message) => (
                      <tr key={message.id} className="hover:bg-gray-50">
                        <td className="px-4 py-4">
                          <input
                            type="checkbox"
                            aria-label={t('admin.messages.selectMessage').replace('{email}', message.email)}
                            checked={selectedIds.has(message.id)}
                            onChange={() => toggleSelect(message.id)}
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {message.name}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{message.email}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900">{message.subject}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900 max-w-md truncate">{message.message}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(message.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {meta && meta.totalPages > 1 && (
                <div className="mt-6 flex items-center justify-between">
                  <div className="text-sm text-gray-700">
                    {t('admin.messages.showingPage').replace('{page}', meta.page.toString()).replace('{totalPages}', meta.totalPages.toString()).replace('{total}', meta.total.toString())}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                    >
                      {t('admin.messages.previous')}
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
                      disabled={page === meta.totalPages}
                    >
                      {t('admin.messages.next')}
                    </Button>
                  </div>
                </div>
              )}
              <div className="mt-4 flex items-center justify-between">
                <div className="text-sm text-gray-700">{t('admin.messages.selectedMessages').replace('{count}', selectedIds.size.toString())}</div>
                <Button
                  variant="outline"
                  onClick={handleBulkDelete}
                  disabled={selectedIds.size === 0 || bulkDeleting}
                >
                  {bulkDeleting ? t('admin.messages.deleting') : t('admin.messages.deleteSelected')}
                </Button>
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}


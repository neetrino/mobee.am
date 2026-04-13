'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { apiClient } from '../lib/api-client';
import { getStoredLanguage } from '../lib/language';
import { useTranslation } from '../lib/i18n-client';

interface TopCategoryItem {
  id: string;
  slug: string;
  title: string;
  productCount: number;
  image: string | null;
}

interface TopCategoriesResponse {
  data: TopCategoryItem[];
}

export function TopCategories() {
  const { t } = useTranslation();
  const router = useRouter();
  const [topCategories, setTopCategories] = useState<TopCategoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTopCategories();
  }, []);

  const fetchTopCategories = async () => {
    try {
      setLoading(true);
      const language = getStoredLanguage();
      const response = await apiClient.get<TopCategoriesResponse>('/api/v1/categories/top', {
        params: { lang: language, limit: '5' },
      });
      setTopCategories(response.data || []);
    } catch (err) {
      console.error('[TopCategories] Error:', err);
      setTopCategories([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <section className="py-12 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-center items-center gap-8 md:gap-12 lg:gap-16 flex-wrap">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex flex-col items-center gap-3 min-w-[120px]">
                <div className="w-24 h-24 rounded-full bg-gray-200 animate-pulse shadow-sm"></div>
                <div className="w-20 h-4 bg-gray-200 rounded animate-pulse"></div>
                <div className="w-16 h-3 bg-gray-200 rounded animate-pulse"></div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (topCategories.length === 0) {
    return null;
  }

  return (
    <section className="py-12 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-center items-center gap-6 md:gap-8 lg:gap-12 xl:gap-16 flex-wrap">
          {topCategories.map((item) => (
            <Link
              key={item.id}
              href={`/products?category=${item.slug}`}
              onClick={(e) => {
                e.preventDefault();
                router.push(`/products?category=${item.slug}`);
              }}
              className="flex flex-col items-center gap-3 group cursor-pointer transition-all duration-300 hover:scale-105 min-w-[120px] outline-none focus:outline-none hover:outline-none focus-visible:outline-none ring-0 focus:ring-0 hover:ring-0"
            >
              <div className="transition-all duration-300 group-hover:shadow-lg group-hover:-translate-y-1 relative outline-none">
                {item.image ? (
                  <div className="w-24 h-24 rounded-full overflow-hidden bg-gray-100 shadow-md transition-all duration-300 flex items-center justify-center outline-none ring-0">
                    <Image
                      src={item.image}
                      alt={item.title}
                      width={96}
                      height={96}
                      className="w-full h-full object-cover scale-110 group-hover:scale-125 transition-transform duration-300 outline-none"
                      unoptimized
                    />
                  </div>
                ) : (
                  <div className="w-24 h-24 rounded-full bg-gray-100 flex items-center justify-center shadow-md transition-all duration-300 outline-none ring-0">
                    <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
                    </svg>
                  </div>
                )}
              </div>
              <span className="text-sm font-semibold text-gray-900 text-center max-w-[140px] group-hover:text-gray-700 transition-colors">
                {item.title}
              </span>
              <span className="text-xs text-gray-500 font-medium">
                {item.productCount} {item.productCount === 1 ? t('common.product.product') : t('common.product.products')}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

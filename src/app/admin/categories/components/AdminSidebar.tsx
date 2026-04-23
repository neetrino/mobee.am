'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { AdminMenuDrawer } from '../../../../components/AdminMenuDrawer';
import { getAdminMenuTABS } from '../../admin-menu.config';

interface AdminSidebarProps {
  t: (key: string) => string;
}

export function AdminSidebar({ t }: AdminSidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const adminTabs = getAdminMenuTABS(t);
  const productSubmenuIds = new Set(['categories', 'brands', 'attributes']);
  const productGroupPaths = ['/admin/products', '/admin/categories', '/admin/brands', '/admin/attributes'];
  const isProductGroupActive = productGroupPaths.some((path) => pathname?.startsWith(path));
  const [isProductsExpanded, setIsProductsExpanded] = useState(isProductGroupActive);

  useEffect(() => {
    if (isProductGroupActive) {
      setIsProductsExpanded(true);
    }
  }, [isProductGroupActive]);

  return (
    <>
      <div className="lg:hidden mb-6">
        <AdminMenuDrawer tabs={adminTabs} currentPath={pathname || '/admin/categories'} />
      </div>
      <aside className="hidden lg:block lg:w-64 flex-shrink-0">
        <nav className="bg-white border border-gray-200 rounded-lg p-2 space-y-1">
          {adminTabs.map((tab) => {
            if (tab.isSubCategory && !isProductsExpanded) {
              return null;
            }

            const isActive = pathname === tab.path || 
              (tab.path === '/admin' && pathname === '/admin') ||
              (tab.path !== '/admin' && pathname?.startsWith(tab.path)) ||
              (tab.id === 'products' && isProductGroupActive);

            if (tab.id === 'products') {
              return (
                <div key={tab.id} className="w-full flex items-center gap-2">
                  <button
                    onClick={() => {
                      router.push(tab.path);
                    }}
                    className={`flex-1 flex items-center gap-3 px-4 py-3 rounded-md text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-admin text-white'
                        : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                    }`}
                  >
                    <span className={`flex-shrink-0 ${isActive ? 'text-white' : 'text-gray-500'}`}>
                      {tab.icon}
                    </span>
                    <span className="text-left">{tab.label}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsProductsExpanded((prev) => !prev)}
                    aria-label={isProductsExpanded ? 'Collapse products menu' : 'Expand products menu'}
                    className={`h-10 w-10 flex items-center justify-center rounded-md transition-all ${
                      isActive ? 'text-white' : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <svg
                      className={`w-4 h-4 transition-transform ${isProductsExpanded ? 'rotate-180' : ''}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                </div>
              );
            }

            if (tab.isSubCategory && !productSubmenuIds.has(tab.id)) {
              return null;
            }

            return (
              <button
                key={tab.id}
                onClick={() => {
                  router.push(tab.path);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-md text-sm font-medium transition-all ${
                  tab.isSubCategory ? 'pl-12' : ''
                } ${
                  isActive
                    ? 'bg-admin text-white'
                    : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                <span className={`flex-shrink-0 ${isActive ? 'text-white' : 'text-gray-500'}`}>
                  {tab.icon}
                </span>
                <span className="text-left">{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </aside>
    </>
  );
}





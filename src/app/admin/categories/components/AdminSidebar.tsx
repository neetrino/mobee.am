'use client';

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

  return (
    <>
      <div className="lg:hidden mb-6">
        <AdminMenuDrawer tabs={adminTabs} currentPath={pathname || '/admin/categories'} />
      </div>
      <aside className="hidden lg:block lg:w-64 flex-shrink-0">
        <nav className="bg-white border border-gray-200 rounded-lg p-2 space-y-1">
          {adminTabs.map((tab) => {
            const isActive = pathname === tab.path || 
              (tab.path === '/admin' && pathname === '/admin') ||
              (tab.path !== '/admin' && pathname?.startsWith(tab.path));
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
                    ? 'bg-gray-900 text-white'
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





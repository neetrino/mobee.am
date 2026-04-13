'use client';

/**
 * Loading state component for CategoryNavigation
 */
export function CategoryNavigationLoading() {
  return (
    <div className="bg-white border-b border-gray-200 py-3 sm:py-4 md:py-6 w-full">
      <div className="max-w-7xl mx-auto px-2 sm:px-4 md:px-6 lg:px-8">
        <div className="flex items-center gap-4 sm:gap-6 overflow-x-auto">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
            <div key={i} className="flex flex-col items-center gap-1 sm:gap-2 min-w-[80px] sm:min-w-[100px]">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gray-200 animate-pulse"></div>
              <div className="w-16 sm:w-20 h-3 sm:h-4 bg-gray-200 rounded animate-pulse"></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}





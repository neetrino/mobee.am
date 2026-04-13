'use client';

interface CarouselDotsProps {
  totalItems: number;
  visibleItems: number;
  currentIndex: number;
  onDotClick: (index: number) => void;
}

/**
 * Dots indicator for carousel
 */
export function CarouselDots({ totalItems, visibleItems, currentIndex, onDotClick }: CarouselDotsProps) {
  const totalPages = Math.ceil(totalItems / visibleItems);

  return (
    <div className="flex justify-center gap-2 mt-6">
      {Array.from({ length: totalPages }).map((_, index) => {
        const startIndex = index * visibleItems;
        const endIndex = Math.min(startIndex + visibleItems, totalItems);
        const isActive = currentIndex >= startIndex && currentIndex < endIndex;
        
        return (
          <button
            key={index}
            onClick={() => onDotClick(startIndex)}
            className={`h-2 rounded-full transition-all duration-300 ${
              isActive
                ? 'bg-gray-900 w-8'
                : 'bg-gray-300 hover:bg-gray-400 w-2'
            }`}
            aria-label={`Go to slide ${index + 1}`}
          />
        );
      })}
    </div>
  );
}





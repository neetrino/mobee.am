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
  const totalPositions = Math.max(1, totalItems - visibleItems + 1);

  return (
    <div className="flex justify-center gap-2 mt-6">
      {Array.from({ length: totalPositions }).map((_, index) => {
        const isActive = currentIndex === index;

        return (
          <button
            key={index}
            onClick={() => onDotClick(index)}
            className={`h-2 rounded-full transition-all duration-300 ${
              isActive
                ? 'bg-[#2db2ff] w-8'
                : 'bg-gray-300 hover:bg-gray-400 w-2'
            }`}
            aria-label={`Go to related product position ${index + 1}`}
          />
        );
      })}
    </div>
  );
}





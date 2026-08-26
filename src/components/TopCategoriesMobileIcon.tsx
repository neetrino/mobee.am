import Image from 'next/image';
import type { CategoryStripSlotKey } from '../lib/categoryStrip';

function mobileCategoryIconClassName(slotKey: CategoryStripSlotKey | null): string {
  if (!slotKey || slotKey === 'computers' || slotKey === 'accessories') {
    return 'object-contain';
  }
  return 'object-cover';
}

export function TopCategoriesMobileIcon({
  imageSrc,
  slotKey,
}: {
  imageSrc: string;
  slotKey: CategoryStripSlotKey | null;
}) {
  if (slotKey === 'watches') {
    return (
      <span className="relative flex size-20 items-center justify-center">
        <span className="relative size-16 flex-none -rotate-[5.85deg]">
          <Image
            src={imageSrc}
            alt=""
            fill
            sizes="128px"
            quality={90}
            className="object-contain"
          />
        </span>
      </span>
    );
  }

  const mirror = slotKey === 'computers';

  return (
    <span className={`relative size-20 ${mirror ? '-scale-x-100' : ''}`}>
      <Image
        src={imageSrc}
        alt=""
        fill
        sizes="80px"
        className={mobileCategoryIconClassName(slotKey)}
      />
    </span>
  );
}

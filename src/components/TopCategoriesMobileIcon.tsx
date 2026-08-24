import Image from 'next/image';
import type { CategoryStripSlotKey } from '../lib/categoryStrip';

function mobileCategoryIconClassName(slotKey: CategoryStripSlotKey): string {
  if (slotKey === 'computers' || slotKey === 'accessories') {
    return 'object-contain';
  }
  return 'object-cover';
}

export function TopCategoriesMobileIcon({
  imageSrc,
  slotKey,
}: {
  imageSrc: string;
  slotKey: CategoryStripSlotKey;
}) {
  if (slotKey === 'watches') {
    return (
      <span className="relative flex size-[65px] items-center justify-center">
        <span className="relative size-[52px] flex-none -rotate-[5.85deg]">
          <Image
            src={imageSrc}
            alt=""
            fill
            sizes="104px"
            quality={90}
            className="object-contain"
          />
        </span>
      </span>
    );
  }

  const mirror = slotKey === 'computers';

  return (
    <span className={`relative size-[65px] ${mirror ? '-scale-x-100' : ''}`}>
      <Image
        src={imageSrc}
        alt=""
        fill
        sizes="65px"
        className={mobileCategoryIconClassName(slotKey)}
      />
    </span>
  );
}

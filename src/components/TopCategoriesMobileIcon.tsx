import Image from 'next/image';

type CategoryStripSlotKey =
  | 'computers'
  | 'phones'
  | 'tablets'
  | 'watches'
  | 'headphones'
  | 'accessories';

export interface TopCategoriesMobileIconSlot {
  key: CategoryStripSlotKey;
  imageSrc: string;
}

function mobileCategoryIconClassName(slot: TopCategoriesMobileIconSlot): string {
  if (slot.key === 'computers' || slot.key === 'accessories') {
    return 'object-contain';
  }
  return 'object-cover';
}

export function TopCategoriesMobileIcon({ slot }: { slot: TopCategoriesMobileIconSlot }) {
  if (slot.key === 'watches') {
    return (
      <span className="flex size-[65px] items-center justify-center">
        <span className="flex-none -rotate-[5.85deg]">
          <Image
            src={slot.imageSrc}
            alt=""
            width={52}
            height={52}
            className="object-cover"
          />
        </span>
      </span>
    );
  }

  const mirror = slot.key === 'computers';

  return (
    <span className={`relative size-[65px] ${mirror ? '-scale-x-100' : ''}`}>
      <Image
        src={slot.imageSrc}
        alt=""
        fill
        sizes="65px"
        className={mobileCategoryIconClassName(slot)}
      />
    </span>
  );
}

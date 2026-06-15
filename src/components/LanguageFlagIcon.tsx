import Image from 'next/image';
import { LANGUAGES, type LanguageCode } from '../lib/language';
import { LANGUAGE_FLAG_ICON_SRC } from '../lib/constants/ui-icons.constants';

const LANGUAGE_FLAG_SIZE_PX = 25;

interface LanguageFlagIconProps {
  code: LanguageCode;
  size?: number;
  className?: string;
}

export function LanguageFlagIcon({ code, size = LANGUAGE_FLAG_SIZE_PX, className = 'rounded' }: LanguageFlagIconProps) {
  return (
    <Image
      src={LANGUAGE_FLAG_ICON_SRC[code]}
      alt={LANGUAGES[code].nativeName}
      width={size}
      height={size}
      className={className}
    />
  );
}

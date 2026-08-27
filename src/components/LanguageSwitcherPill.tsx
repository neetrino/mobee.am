'use client';

import { useSwitchStorefrontLocale } from '../lib/i18n/use-switch-locale';
import { localeSwitchIntentHandlers } from '../lib/i18n/prefetch-alternate-locales';
import type { LanguageCode } from '../lib/language';
import type { AppLocale } from '../lib/i18n/routing';

/**
 * ՀԱՅ / EN / РУС — Figma mobee-new Component 5 (node 178:544): bordered pill, #2db2ff sliding inset.
 */
type PillSegment = 'hy' | 'en' | 'ru';

function segmentForLang(lang: LanguageCode): PillSegment {
  if (lang === 'hy') return 'hy';
  if (lang === 'ru') return 'ru';
  return 'en';
}

function LocalePillButton({
  locale,
  active,
  label,
  className,
  onSwitch,
  onPrefetch,
}: {
  locale: AppLocale;
  active: boolean;
  label: string;
  className: string;
  onSwitch: (next: AppLocale) => void;
  onPrefetch: (next: AppLocale) => void;
}) {
  return (
    <button
      type="button"
      className={`${className} ${active ? 'text-white' : 'text-[#4b5563]'}`}
      {...localeSwitchIntentHandlers(onPrefetch, locale)}
      onClick={() => {
        if (!active) onSwitch(locale);
      }}
    >
      {label}
    </button>
  );
}

export function LanguageSwitcherPill() {
  const { switchLocale, prefetchLocale, displayLocale } = useSwitchStorefrontLocale();

  const seg = segmentForLang(displayLocale);
  const slideTranslate =
    seg === 'hy' ? 'translateX(0%)' : seg === 'en' ? 'translateX(100%)' : 'translateX(200%)';

  /** Matches first-bar phone label and secondary-bar profile label (`font-semibold`). */
  const segmentLabelClass =
    'flex items-center justify-center rounded-[17.1px] text-[13.3px] font-semibold leading-[14.25px]';

  return (
    <div
      className="relative h-[38.95px] w-[140.6px] shrink-0 rounded-[20.9px] border-[1.14px] border-solid border-[#4b5563]"
      role="group"
      aria-label="Language"
    >
      <div
        className="pointer-events-none absolute left-[3.8px] top-[3.8px] bottom-[3.8px] w-[calc((100%-7.6px)/3)] rounded-[17.1px] bg-[#2db2ff] transition-transform duration-200 ease-out"
        style={{ transform: slideTranslate }}
        aria-hidden
      />
      <div className="relative z-10 grid h-full grid-cols-3 items-stretch px-[1.9px]">
        <LocalePillButton
          locale="hy"
          active={seg === 'hy'}
          label="ՀԱՅ"
          className={segmentLabelClass}
          onSwitch={switchLocale}
          onPrefetch={prefetchLocale}
        />
        <LocalePillButton
          locale="en"
          active={seg === 'en'}
          label="EN"
          className={segmentLabelClass}
          onSwitch={switchLocale}
          onPrefetch={prefetchLocale}
        />
        <LocalePillButton
          locale="ru"
          active={seg === 'ru'}
          label="РУС"
          className={segmentLabelClass}
          onSwitch={switchLocale}
          onPrefetch={prefetchLocale}
        />
      </div>
    </div>
  );
}

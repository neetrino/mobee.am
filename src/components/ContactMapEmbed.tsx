'use client';

import { useTranslation } from '../lib/i18n-client';

export function buildGoogleMapsEmbedSrc(addressQuery: string): string {
  const q = encodeURIComponent(addressQuery);
  return `https://www.google.com/maps?q=${q}&z=15&output=embed`;
}

const DEFAULT_SHELL_CLASS =
  'relative block h-[220px] w-full min-w-0 overflow-hidden rounded-[26px] bg-[#f9f9f9]';

type ContactMapEmbedProps = {
  addressText: string;
  shellClassName?: string;
  titlePath?: string;
};

export function ContactMapEmbed({
  addressText,
  shellClassName = DEFAULT_SHELL_CLASS,
  titlePath = 'common.footer.mapEmbedTitle',
}: ContactMapEmbedProps) {
  const { t } = useTranslation();
  const embedSrc = buildGoogleMapsEmbedSrc(addressText);

  return (
    <div className={shellClassName}>
      <iframe
        title={t(titlePath)}
        src={embedSrc}
        className="pointer-events-auto absolute inset-0 h-full w-full border-0"
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        allowFullScreen
        suppressHydrationWarning
      />
    </div>
  );
}

'use client';

import { useCallback, useEffect, useId, useRef, useState, type ReactNode, type RefObject } from 'react';
import { MessageCircle, Phone } from 'lucide-react';
import { useTranslation } from '../lib/i18n-client';
import { phoneDisplayToTelHref, splitContactPhoneDisplay } from '../lib/contactPhoneDisplay';

const FAB_TRIGGER_SIZE_CLASS = 'size-14';
const FAB_ACTION_SIZE_CLASS = 'size-12';

/**
 * Classic sticky corner FAB.
 * Mobile: just above bottom nav. Desktop: bottom-right inset.
 * Outer node is ONLY `fixed` (never combine with `relative` — Tailwind order can drop `fixed`).
 */
const FAB_FIXED_CLASS =
  'fixed right-4 z-50 max-lg:bottom-[calc(96px+env(safe-area-inset-bottom,0px))] lg:bottom-6 lg:right-6';

type FabAction = {
  readonly id: string;
  readonly href: string;
  readonly label: string;
  readonly className: string;
  readonly icon: ReactNode;
};

function buildYandexMapsHref(address: string): string {
  return `https://yandex.com/maps/?text=${encodeURIComponent(address)}`;
}

function InstagramGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="size-6" fill="currentColor" aria-hidden>
      <path d="M12 0C8.74 0 8.333.015 7.053.072 5.775.132 4.905.333 4.14.63c-.789.306-1.459.717-2.126 1.384S.935 3.35.63 4.14C.333 4.905.131 5.775.072 7.053.012 8.333 0 8.74 0 12s.015 3.667.072 4.947c.06 1.277.261 2.148.558 2.913.306.788.717 1.459 1.384 2.126.667.666 1.336 1.079 2.126 1.384.766.296 1.636.499 2.913.558C8.333 23.988 8.74 24 12 24s3.667-.015 4.947-.072c1.277-.06 2.148-.262 2.913-.558.788-.306 1.459-.718 2.126-1.384.666-.667 1.079-1.335 1.384-2.126.296-.765.499-1.636.558-2.913.06-1.28.072-1.687.072-4.947s-.015-3.667-.072-4.947c-.06-1.277-.262-2.149-.558-2.913-.306-.789-.718-1.459-1.384-2.126C21.319 1.347 20.651.935 19.86.63c-.765-.297-1.636-.499-2.913-.558C15.667.012 15.26 0 12 0zm0 2.16c3.203 0 3.585.016 4.85.071 1.17.055 1.805.249 2.227.415.562.217.96.477 1.382.896.419.42.679.819.896 1.381.164.422.36 1.057.413 2.227.057 1.266.07 1.646.07 4.85s-.015 3.585-.074 4.85c-.061 1.17-.256 1.805-.421 2.227-.224.562-.479.96-.899 1.382-.419.419-.824.679-1.38.896-.42.164-1.065.36-2.235.413-1.274.057-1.649.07-4.859.07-3.211 0-3.586-.015-4.859-.074-1.171-.061-1.816-.256-2.236-.421-.569-.224-.96-.479-1.379-.899-.421-.419-.69-.824-.9-1.38-.165-.42-.359-1.065-.42-2.235-.045-1.26-.061-1.649-.061-4.844 0-3.196.016-3.586.061-4.861.061-1.17.255-1.814.42-2.234.21-.57.479-.96.9-1.381.419-.419.81-.689 1.379-.898.42-.166 1.051-.361 2.221-.421 1.275-.045 1.65-.06 4.859-.06l.045.03zm0 3.678c-3.405 0-6.162 2.76-6.162 6.162 0 3.405 2.76 6.162 6.162 6.162 3.405 0 6.162-2.76 6.162-6.162 0-3.405-2.76-6.162-6.162-6.162zM12 16c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4zm7.846-10.405c0 .795-.646 1.44-1.44 1.44-.795 0-1.44-.646-1.44-1.44 0-.794.646-1.439 1.44-1.439.793-.001 1.44.645 1.44 1.439z" />
    </svg>
  );
}

function WhatsAppGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="size-6" fill="currentColor" aria-hidden>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.881 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
    </svg>
  );
}

function YandexMapsGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="size-6" fill="currentColor" aria-hidden>
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5A2.5 2.5 0 1 1 12 6a2.5 2.5 0 0 1 0 5.5z" />
    </svg>
  );
}

function useStickyContactActions(): readonly FabAction[] {
  const { t } = useTranslation();
  const address = t('contact.address');
  const phoneLines = splitContactPhoneDisplay(t('contact.phone'));
  const phoneHref = phoneLines[0] ? phoneDisplayToTelHref(phoneLines[0]) : 'tel:';

  return [
    {
      id: 'maps',
      href: buildYandexMapsHref(address),
      label: t('common.stickyContact.yandexMaps'),
      className: 'bg-[#fc3f1d] text-white',
      icon: <YandexMapsGlyph />,
    },
    {
      id: 'whatsapp',
      href: t('contact.social.whatsapp'),
      label: t('common.stickyContact.whatsapp'),
      className: 'bg-[#25d366] text-white',
      icon: <WhatsAppGlyph />,
    },
    {
      id: 'call',
      href: phoneHref,
      label: t('common.stickyContact.callNow'),
      className: 'bg-[#2db2ff] text-white',
      icon: <Phone className="size-6" strokeWidth={2.25} aria-hidden />,
    },
    {
      id: 'instagram',
      href: t('contact.social.instagram'),
      label: t('common.ariaLabels.instagram'),
      className: 'bg-[linear-gradient(45deg,#f58529,#dd2a7b,#8134af)] text-white',
      icon: <InstagramGlyph />,
    },
  ];
}

const FAB_MENU_BASE_CLASS =
  'absolute bottom-full left-1/2 mb-3 flex origin-bottom -translate-x-1/2 flex-col items-center gap-3 rounded-[999px] bg-white px-2 py-3 shadow-[0_8px_28px_rgba(0,0,0,0.18)] transition-[opacity,transform] duration-200 ease-out motion-reduce:transition-none';

const FAB_MENU_OPEN_CLASS = 'pointer-events-auto translate-y-0 scale-100 opacity-100';

const FAB_MENU_CLOSED_CLASS = 'pointer-events-none translate-y-2 scale-90 opacity-0';

function StickyContactMenu(props: {
  readonly menuId: string;
  readonly actions: readonly FabAction[];
  readonly menuLabel: string;
  readonly isOpen: boolean;
}) {
  const { menuId, actions, menuLabel, isOpen } = props;

  return (
    <div
      id={menuId}
      className={`${FAB_MENU_BASE_CLASS} ${isOpen ? FAB_MENU_OPEN_CLASS : FAB_MENU_CLOSED_CLASS}`}
      role="menu"
      aria-label={menuLabel}
      aria-hidden={!isOpen}
    >
      {actions.map((action) => (
        <a
          key={action.id}
          href={action.href}
          target={action.href.startsWith('http') ? '_blank' : undefined}
          rel={action.href.startsWith('http') ? 'noopener noreferrer' : undefined}
          role="menuitem"
          aria-label={action.label}
          tabIndex={isOpen ? 0 : -1}
          className={`inline-flex ${FAB_ACTION_SIZE_CLASS} items-center justify-center rounded-full transition-transform hover:scale-105 active:scale-95 ${action.className}`}
        >
          {action.icon}
        </a>
      ))}
    </div>
  );
}

function useCloseOnOutside(
  isOpen: boolean,
  rootRef: RefObject<HTMLDivElement | null>,
  onClose: () => void,
) {
  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      const root = rootRef.current;
      if (!root || !(event.target instanceof Node)) {
        return;
      }
      if (!root.contains(event.target)) {
        onClose();
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('touchstart', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('touchstart', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [isOpen, onClose, rootRef]);
}

/**
 * Sticky contact FAB — chat trigger toggles Yandex Maps / WhatsApp / Call / Instagram.
 * Client-only after mount: `contact.*` i18n may resolve only on the client (avoids hydration mismatch).
 */
export function StickyContactFab() {
  const { t } = useTranslation();
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const [isMounted, setIsMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const actions = useStickyContactActions();
  const close = useCallback(() => setIsOpen(false), []);
  const toggleOpen = useCallback(() => setIsOpen((open) => !open), []);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useCloseOnOutside(isOpen, rootRef, close);

  if (!isMounted) {
    return null;
  }

  return (
    <div className={FAB_FIXED_CLASS}>
      <div ref={rootRef} className="relative">
        <StickyContactMenu
          menuId={menuId}
          actions={actions}
          menuLabel={t('common.stickyContact.menuLabel')}
          isOpen={isOpen}
        />

        <button
          type="button"
          onClick={toggleOpen}
          className={`inline-flex ${FAB_TRIGGER_SIZE_CLASS} shrink-0 items-center justify-center rounded-full bg-[#2db2ff] text-white shadow-[0_8px_24px_rgba(45,178,255,0.4)] transition-transform hover:scale-105 active:scale-95`}
          aria-label={
            isOpen ? t('common.stickyContact.closeMenu') : t('common.stickyContact.openMenu')
          }
          aria-expanded={isOpen}
          aria-controls={menuId}
        >
          <MessageCircle className="size-7" strokeWidth={1.75} aria-hidden />
        </button>
      </div>
    </div>
  );
}

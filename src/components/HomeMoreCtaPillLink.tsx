'use client';

import Link from 'next/link';
import { useState, type PointerEvent, type ReactNode } from 'react';

type CtaArrowMotion = 'idle' | 'hoverIn' | 'hoverOut';

function getCtaArrowMotionClass(motion: CtaArrowMotion): string {
  if (motion === 'hoverIn') {
    return 'animate-cta-arrow-nudge-in';
  }
  if (motion === 'hoverOut') {
    return 'animate-cta-arrow-nudge-out';
  }
  return '';
}

function useCtaPillArrowHoverMotion(active: boolean) {
  const [motion, setMotion] = useState<CtaArrowMotion>('idle');
  const [motionKey, setMotionKey] = useState(0);

  function triggerIn() {
    if (!active) {
      return;
    }
    setMotion('hoverIn');
    setMotionKey((key) => key + 1);
  }

  function triggerOut() {
    if (!active) {
      return;
    }
    setMotion('hoverOut');
    setMotionKey((key) => key + 1);
  }

  return { motion, motionKey, triggerIn, triggerOut };
}

export type HomeMoreCtaPillVariant = 'heroDark' | 'cyanPromo';

export function HomeCtaPillArrowIcon({ className }: { readonly className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      <path
        d="M5 12h14M13 6l6 6-6 6"
        stroke="currentColor"
        strokeWidth={2.2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

type HomeMoreCtaPillLinkProps = {
  readonly href: string;
  readonly children: ReactNode;
  readonly variant: HomeMoreCtaPillVariant;
  readonly className?: string;
  readonly labelClassName?: string;
  /** Replaces default arrow inside the trailing circle (circle chrome stays). */
  readonly circleContent?: ReactNode;
  /** Arrow nudge keyframes on hover (see `globals.css` cta-arrow-nudge-*). */
  readonly arrowHoverAnimation?: boolean;
} & Pick<React.ComponentProps<'a'>, 'onPointerEnter' | 'onPointerLeave'>;

/**
 * Shared “Ավելին” / More pill — layout matches desktop hero CTA; colors follow {@link HomeMoreCtaPillVariant}.
 */
export function HomeMoreCtaPillLink({
  href,
  children,
  variant,
  className = '',
  labelClassName = '',
  circleContent,
  arrowHoverAnimation = false,
  onPointerEnter,
  onPointerLeave,
}: HomeMoreCtaPillLinkProps) {
  const animationActive = Boolean(arrowHoverAnimation && circleContent === undefined);
  const { motion, motionKey, triggerIn, triggerOut } = useCtaPillArrowHoverMotion(animationActive);

  const isHero = variant === 'heroDark';
  const linkSurface = isHero ? 'border-[#1e1e1e] bg-[#1e1e1e]' : 'border-[#2db2ff] bg-[#2db2ff]';
  const sweepBg = isHero ? 'bg-[#2db2ff]' : 'bg-[#1e1e1e]';
  const labelClass = isHero
    ? 'text-[#2db2ff] transition-colors duration-500 ease-in-out group-hover:text-[#1e1e1e]'
    : 'text-[#1e1e1e] transition-colors duration-500 ease-in-out group-hover:text-white';
  const circleBg = isHero ? 'bg-[#2db2ff]' : 'bg-[#1e1e1e]';
  const arrowIconClass = `size-5 shrink-0 ${isHero ? 'text-[#1e1e1e]' : 'text-white'}`;
  const defaultArrow = <HomeCtaPillArrowIcon className={arrowIconClass} />;
  const animatedArrow = (
    <span
      key={motionKey}
      className={`inline-flex items-center justify-center ${getCtaArrowMotionClass(motion)}`}
    >
      <HomeCtaPillArrowIcon className={arrowIconClass} />
    </span>
  );

  function handlePointerEnter(e: PointerEvent<HTMLAnchorElement>) {
    onPointerEnter?.(e);
    triggerIn();
  }

  function handlePointerLeave(e: PointerEvent<HTMLAnchorElement>) {
    onPointerLeave?.(e);
    triggerOut();
  }

  const trailingCircleInner = circleContent ?? (arrowHoverAnimation ? animatedArrow : defaultArrow);

  return (
    <Link
      href={href}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
      className={`group relative inline-flex h-12 min-w-[159px] w-[min(100%,159px)] shrink-0 items-center justify-between gap-1.5 overflow-hidden rounded-full border-2 pl-5 pr-1 active:scale-[0.99] sm:w-[159px] ${linkSurface} ${className}`.trim()}
    >
      <span
        className={`pointer-events-none absolute inset-0 origin-[calc(100%-22px)_50%] scale-x-0 ${sweepBg} transition-transform duration-500 ease-in-out group-hover:scale-x-100`}
        aria-hidden
      />
      <span
        className={`relative z-10 flex-1 -translate-x-5 text-right text-[14px] font-medium leading-none ${labelClass} ${labelClassName}`.trim()}
      >
        {children}
      </span>
      <span
        className={`relative z-10 ml-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${circleBg}`}
        aria-hidden
      >
        {trailingCircleInner}
      </span>
    </Link>
  );
}

'use client';

import React, { HTMLAttributes, forwardRef, ReactElement } from 'react';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  /** When true, use admin panel corner radius (`rounded-supersudo` / 15px). */
  adminChrome?: boolean;
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  function Card({ className = '', children, adminChrome = false, ...props }, ref): ReactElement {
    /** Omit default radius when consumer passes any `rounded*` utility (e.g. checkout `rounded-[15px]`). */
    const hasRoundedUtility = /\brounded/.test(className);
    const defaultRoundedClass = hasRoundedUtility
      ? ''
      : adminChrome
        ? 'rounded-supersudo'
        : 'rounded-lg';
    return (
      <div
        ref={ref}
        className={['bg-white', 'border', 'border-gray-200', 'shadow-sm', defaultRoundedClass, className]
          .filter(Boolean)
          .join(' ')}
        {...props}
      >
        {children}
      </div>
    );
  }
);


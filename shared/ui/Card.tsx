'use client';

import React, { HTMLAttributes, forwardRef, ReactElement } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  function Card({ className = '', children, ...props }, ref): ReactElement {
    /** Omit default radius when consumer passes any `rounded*` utility (e.g. checkout `rounded-[15px]`). */
    const hasRoundedUtility = /\brounded/.test(className);
    const defaultRoundedClass = hasRoundedUtility ? '' : 'rounded-lg';
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


'use client';

import React, { InputHTMLAttributes, forwardRef } from 'react';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  /** When true, use admin panel corner radius (`rounded-supersudo` / 15px). */
  adminChrome?: boolean;
  /** Checkout form fields — 15px radius + Mobee blue focus (matches city select). */
  checkoutChrome?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  function Input(
    {
      label,
      error,
      className = '',
      onKeyDown,
      adminChrome = false,
      checkoutChrome = false,
      spellCheck = false,
      autoCorrect = 'off',
      autoCapitalize = 'off',
      ...props
    },
    ref
  ) {
    // Ensure pipe character (|) works in all input fields
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      // Allow pipe character (|) - key code 220 or Shift+Backslash
      if (e.key === '|' || e.keyCode === 220 || (e.shiftKey && e.key === '\\')) {
        // Allow the default behavior for pipe character
        return;
      }
      
      // Call original onKeyDown if provided
      if (onKeyDown) {
        onKeyDown(e);
      }
    };

    const borderAndFocusClasses = error
      ? 'border-red-500 bg-red-50/50 focus:border-red-500 focus:ring-2 focus:ring-red-500/40 focus:outline-none'
      : checkoutChrome
        ? 'border-gray-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-admin-500 focus-visible:ring-offset-2'
        : 'border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent';

    const radiusClass = checkoutChrome
      ? 'rounded-[15px] min-h-[42px]'
      : adminChrome
        ? 'rounded-supersudo'
        : 'rounded-md';

    return (
      <div className="w-full">
        {label && (
          <label
            className={`mb-1 block text-sm font-medium ${error ? 'text-red-700' : 'text-gray-700'}`}
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          aria-invalid={error ? true : undefined}
          spellCheck={spellCheck}
          autoCorrect={autoCorrect}
          autoCapitalize={autoCapitalize}
          className={`w-full border px-4 py-2 disabled:cursor-default disabled:bg-gray-50 ${radiusClass} ${borderAndFocusClasses} ${className}`}
          onKeyDown={handleKeyDown}
          {...props}
        />
        {error ? (
          <p className="mt-1 text-sm font-medium text-red-600" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    );
  }
);


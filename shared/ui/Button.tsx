'use client';

import React, { ButtonHTMLAttributes, forwardRef, ReactElement } from 'react';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'brand' | 'admin';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
  /** When true, use admin panel corner radius (`rounded-supersudo` / 15px). */
  adminChrome?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    { variant = 'primary', size = 'md', className = '', children, adminChrome = false, ...props },
    ref
  ): ReactElement {
    const radiusClass = adminChrome ? 'rounded-supersudo' : 'rounded-md';
    const baseStyles = `font-medium ${radiusClass} transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed`;

    const variantStyles = {
      primary: 'bg-gray-900 text-white hover:bg-gray-800 focus:ring-gray-900',
      secondary: 'bg-white text-gray-900 border border-gray-300 hover:bg-gray-50 focus:ring-gray-500',
      outline: 'bg-transparent text-gray-900 border border-gray-300 hover:bg-gray-50 focus:ring-gray-500',
      ghost: 'bg-transparent text-gray-900 hover:bg-gray-100 focus:ring-gray-500',
      /** Checkout / brand CTA — theme `admin` DEFAULT #2DB2FF */
      brand: adminChrome
        ? '!rounded-supersudo bg-admin-500 text-white shadow-sm hover:bg-admin-600 focus:ring-admin-500'
        : '!rounded-2xl bg-admin-500 text-white shadow-sm hover:bg-admin-600 focus:ring-admin-500',
      /** Admin panel primary actions — #2DB2FF (`admin-500`) */
      admin: 'bg-admin-500 text-white hover:bg-admin-600 focus:ring-admin-500',
    };
    
    const sizeStyles = {
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-4 py-2 text-base',
      lg: 'px-6 py-3 text-lg',
    };
    
    return (
      <button
        ref={ref}
        className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
        {...props}
      >
        {children}
      </button>
    );
  }
);


import type { Config, PluginAPI } from 'tailwindcss/types/config';
import {
  ADMIN_MOBILE_MENU_OFFSET_LEFT_PX,
  ADMIN_MOBILE_MENU_OFFSET_TOP_PX,
} from './src/app/admin/admin-mobile-menu-layout.constants';
import { CHECKOUT_PAGE_VIEWPORT_SIDE_INSET_PX } from './src/app/checkout/constants';
import { LAYOUT_TABLET_IPAD_AIR_LIKE_HTML_CLASS } from './src/lib/tablet-ipad-air-like-layout.constants';
import {
  LAYOUT_DESKTOP_MIN_WIDTH_PX,
  PRODUCT_PDP_TWO_COLUMN_MIN_WIDTH_PX,
  SHOP_LEGACY_DESKTOP_MIN_WIDTH_PX,
  WISHLIST_GRID_FIVE_COLUMNS_MIN_WIDTH_PX,
} from './src/lib/layout-breakpoints.constants';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    'shared/ui/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    screens: {
      sm: '640px',
      md: '768px',
      lg: `${LAYOUT_DESKTOP_MIN_WIDTH_PX}px`,
      /** PDP image column + info — only at true tablet/desktop width (see layout-breakpoints). */
      'product-2col': `${PRODUCT_PDP_TWO_COLUMN_MIN_WIDTH_PX}px`,
      xl: `${SHOP_LEGACY_DESKTOP_MIN_WIDTH_PX}px`,
      '2xl': '1536px',
      /** Wishlist 5-column row — above iPad Pro 12.9″ landscape; sync with layout-breakpoints. */
      'wishlist-five': `${WISHLIST_GRID_FIVE_COLUMNS_MIN_WIDTH_PX}px`,
    },
    extend: {
      spacing: {
        'admin-mobile-menu-top': `${ADMIN_MOBILE_MENU_OFFSET_TOP_PX}px`,
        'admin-mobile-menu-left': `${ADMIN_MOBILE_MENU_OFFSET_LEFT_PX}px`,
        /** `/checkout` — horizontal gutter from viewport at `lg+` (both sides). */
        'checkout-viewport-x': `${CHECKOUT_PAGE_VIEWPORT_SIDE_INSET_PX}px`,
      },
      borderRadius: {
        /** Admin `/supersudo` UI — unified corner radius */
        supersudo: '15px',
      },
      colors: {
        primary: '#000000',
        secondary: '#FFFFFF',
        success: '#10B981',
        warning: '#F59E0B',
        error: '#EF4444',
        info: '#3B82F6',
        /** Admin panel brand accent */
        admin: {
          DEFAULT: '#2DB2FF',
          50: '#EEF9FF',
          100: '#D9F2FF',
          200: '#B3E5FF',
          300: '#7AD1FF',
          400: '#4DC2FF',
          500: '#2DB2FF',
          600: '#1A9FE6',
          700: '#1488CC',
          800: '#0E6BA3',
          900: '#0A4F7A',
        },
      },
      fontFamily: {
        sans: ['system-ui', '-apple-system', 'sans-serif'],
        heading: ['system-ui', '-apple-system', 'sans-serif'],
      },
    },
  },
  plugins: [
    ({ addVariant }: PluginAPI) => {
      addVariant('ipad-air-band', `html.${LAYOUT_TABLET_IPAD_AIR_LIKE_HTML_CLASS} &`);
    },
  ],
};

export default config;


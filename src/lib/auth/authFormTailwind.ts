/**
 * Shared Tailwind fragments for login/register.
 * Brand accent: #2DB2FF (hover uses slightly darker #1FA0E8 for contrast).
 */

/** Register (and shared): mobile tweaks; from `lg` same max width as legacy auth. */
export const AUTH_PAGE_OUTER_CLASS =
  'mx-auto w-full max-w-xl px-3 sm:px-6 lg:max-w-lg lg:px-8 py-12';

/** Tighter card padding only below `sm`; from `sm` up matches original `p-8`. */
export const AUTH_PAGE_CARD_CLASS = 'rounded-[15px] p-5 sm:p-8';

/** Login card: fixed padding and 15px radius (matches pre–register-align layout). */
export const LOGIN_PAGE_CARD_CLASS = 'p-8 rounded-[15px]';

export const AUTH_PAGE_HEADING_CLASS =
  'text-center text-3xl font-bold text-gray-900 mb-3 lg:mb-2';
/** Left-aligned; larger gap under subtitle on small screens only; desktop keeps original `mb-8`. */
export const AUTH_PAGE_SUBHEADING_CLASS =
  'text-left text-gray-600 mb-10 sm:mb-12 lg:mb-8';

export const authFormClasses = {
  link: 'text-[#2DB2FF] hover:underline font-medium hover:text-[#1FA0E8]',
  linkSm: 'text-sm text-[#2DB2FF] hover:underline hover:text-[#1FA0E8]',
  linkInline: 'text-[#2DB2FF] hover:underline hover:text-[#1FA0E8]',
  checkbox:
    'rounded border-gray-300 text-[#2DB2FF] focus:ring-[#2DB2FF] focus:ring-offset-0',
  submitButton:
    'w-full rounded-2xl border-0 !bg-[#2DB2FF] !text-white shadow-sm hover:!bg-[#1FA0E8] focus:!outline-none focus:!ring-2 focus:!ring-[#2DB2FF] focus:!ring-offset-2',
  input: 'rounded-xl focus:!ring-2 focus:!ring-[#2DB2FF] focus:!border-transparent',
  passwordToggle:
    'text-gray-500 hover:text-[#2DB2FF] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2DB2FF] rounded-md',
} as const;

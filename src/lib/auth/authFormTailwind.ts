/**
 * Shared Tailwind fragments for login/register.
 * Brand accent: #2DB2FF (hover uses slightly darker #1FA0E8 for contrast).
 */
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

import type { InstallmentRequestFormErrors } from './InstallmentRequestFormBody';

/** Visual order in the installment modal — first missing field wins. */
const APARIK_ERROR_SCROLL_ORDER: ReadonlyArray<keyof InstallmentRequestFormErrors> = [
  'bankId',
  'documents',
  'firstName',
  'lastName',
  'email',
  'phone',
  'consents',
];

/**
 * Scrolls the first invalid installment-form block into view inside the modal.
 */
export function scrollToFirstAparikFormError(errors: InstallmentRequestFormErrors): void {
  const firstKey = APARIK_ERROR_SCROLL_ORDER.find((key) => Boolean(errors[key]));
  if (!firstKey) {
    return;
  }

  const target = document.querySelector(`[data-aparik-field="${firstKey}"]`);
  if (!(target instanceof HTMLElement)) {
    return;
  }

  target.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

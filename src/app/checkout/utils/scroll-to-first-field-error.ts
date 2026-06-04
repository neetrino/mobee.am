import type { FieldErrors, FieldValues } from 'react-hook-form';

/** Scrolls the first invalid field into view after failed react-hook-form validation. */
export function scrollToFirstFieldError(errors: FieldErrors<FieldValues>): void {
  const firstErrorField = Object.keys(errors)[0];
  if (!firstErrorField) {
    return;
  }

  const errorElement = document.querySelector(`[name="${firstErrorField}"]`);
  errorElement?.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

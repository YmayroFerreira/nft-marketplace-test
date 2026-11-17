/** Moves focus to the first invalid field after a failed submit */
export function focusFirstInvalid(form: HTMLFormElement) {
  // Wait for React to render the aria-invalid attributes
  requestAnimationFrame(() => {
    form.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()
  })
}

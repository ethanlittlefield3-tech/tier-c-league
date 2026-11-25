/**
 * Keeps the page where it belongs on an iPhone.
 *
 * In a Home Screen app, iOS scrolls the whole page up to keep a text field
 * above the keyboard, and can leave it there after the keyboard closes: the
 * app then sits too high until it is dragged back down. So when a text field
 * loses the focus, and nothing else has it, the page goes back to the top.
 * The app's own content scrolls inside #app, so this never moves anything a
 * player scrolled to.
 */
const isTextField = (element: Element | null) =>
  element instanceof HTMLTextAreaElement || (element instanceof HTMLInputElement && element.type !== 'range' && element.type !== 'checkbox');

function backToTop(): void {
  if (window.scrollX !== 0 || window.scrollY !== 0) window.scrollTo(0, 0);
}

export function keepViewportSteady(): void {
  // A reload must not bring back a shifted page.
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  backToTop();

  document.addEventListener('focusout', () => {
    // Moving from one field straight to another keeps the keyboard up, so wait a moment and look again.
    window.setTimeout(() => {
      if (!isTextField(document.activeElement)) backToTop();
    }, 100);
  });

  // The keyboard closing makes the visible area taller again.
  window.visualViewport?.addEventListener('resize', () => {
    if (!isTextField(document.activeElement)) backToTop();
  });
}

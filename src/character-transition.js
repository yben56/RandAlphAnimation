export function transitionCharacter(element) {
  const reducedMotion = element.ownerDocument?.defaultView
    ?.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  if (reducedMotion) return;

  element.style.filter = 'blur(2px)';
  element.style.transform = 'translateY(0.08em) scale(0.98)';
  element.offsetWidth;
  element.style.filter = 'blur(0)';
  element.style.transform = 'translateY(0) scale(1)';
}

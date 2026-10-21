import { runTextAnimation } from './core.js';

/**
 * Animate the Latin letters in an element's text, then restore the original text.
 * @param {Element} element
 * @param {{ groups?: number, stagger?: number, steps?: number, stepInterval?: number, fadeDuration?: number, effect?: 'spark', alphabet?: string }} options
 */
export function animateText(element, options = {}) {
  if (!element || typeof element.textContent !== 'string') {
    throw new TypeError('animateText expects a DOM element with text content.');
  }
  if (element.childNodes && Array.from(element.childNodes).some((node) => node.nodeType !== 3)) {
    throw new TypeError('animateText only supports elements containing plain text.');
  }

  const originalText = element.textContent;
  let characterElements = [];
  let animation;
  let destroyed = false;
  let currentText = originalText;
  let currentOpacities = Array.from(originalText, () => 1);

  const render = (text, opacities) => {
    currentText = text;
    currentOpacities = opacities;
    if (characterElements.length === Array.from(text).length && characterElements.length > 0) {
      Array.from(text).forEach((character, index) => {
        characterElements[index].textContent = character;
        characterElements[index].style.opacity = String(opacities[index]);
      });
      return;
    }
    element.textContent = text;
  };

  const start = () => {
    if (destroyed) {
      throw new Error('Cannot restart a destroyed text animation.');
    }
    animation?.stop();
    characterElements = [];
    element.textContent = originalText;
    const document = element.ownerDocument;
    if (document?.createElement && typeof element.replaceChildren === 'function') {
      characterElements = Array.from(originalText, () => {
        const characterElement = document.createElement('span');
        characterElement.style.transition =
          `opacity ${Number(options.fadeDuration ?? 180)}ms ease`;
        return characterElement;
      });
      element.replaceChildren(...characterElements);
      render(originalText, Array.from(originalText, () => 1));
    }
    animation = runTextAnimation(originalText, options, render);
  };

  const stop = () => {
    animation?.stop();
    animation = undefined;
    characterElements = [];
    element.textContent = originalText;
  };

  const destroy = () => {
    stop();
    destroyed = true;
  };

  start();

  return { start, stop, destroy };
}

export { DEFAULT_OPTIONS } from './core.js';

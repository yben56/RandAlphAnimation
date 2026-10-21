import { createFlipState, runTextAnimation, updateFlipRoller } from './core.js';

/**
 * Animate the Latin letters in an element's text, then restore the original text.
 * @param {Element} element
 * @param {{ groups?: number, stagger?: number, steps?: number, stepInterval?: number, fadeDuration?: number, flipDuration?: number, effect?: 'spark' | 'flip', alphabet?: string }} options
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
  let flipStates = [];
  let animation;
  let destroyed = false;
  let currentText = originalText;
  let currentOpacities = Array.from(originalText, () => 1);

  const render = (text, opacities) => {
    currentText = text;
    currentOpacities = opacities;
    if (characterElements.length === Array.from(text).length && characterElements.length > 0) {
      Array.from(text).forEach((character, index) => {
        if (options.effect === 'flip') {
          updateFlipRoller(
            characterElements[index].track,
            flipStates[index],
            character,
            Number(options.flipDuration ?? 500),
          );
        } else {
          characterElements[index].track.textContent = character;
          characterElements[index].track.style.opacity = String(opacities[index]);
        }
        if (characterElements[index].sizer) {
          characterElements[index].sizer.textContent = character;
        }
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
    flipStates = [];
    element.textContent = originalText;
    const document = element.ownerDocument;
    if (document?.createElement && typeof element.replaceChildren === 'function') {
      characterElements = Array.from(originalText, () => {
        if (options.effect === 'flip') {
          const wrapper = document.createElement('span');
          const sizer = document.createElement('span');
          const track = document.createElement('span');
          wrapper.style.position = 'relative';
          wrapper.style.display = 'inline-grid';
          wrapper.style.height = '1em';
          wrapper.style.lineHeight = '1em';
          wrapper.style.overflow = 'hidden';
          wrapper.style.verticalAlign = 'baseline';
          sizer.style.gridArea = '1 / 1';
          sizer.style.visibility = 'hidden';
          sizer.style.whiteSpace = 'pre';
          track.style.position = 'absolute';
          track.style.top = '0';
          track.style.left = '0';
          track.style.width = '100%';
          track.style.display = 'flex';
          track.style.flexDirection = 'column';
          track.style.lineHeight = '1em';
          track.style.textAlign = 'center';
          track.style.whiteSpace = 'pre';
          wrapper.appendChild(sizer);
          wrapper.appendChild(track);
          return { wrapper, track, sizer };
        }

        const characterElement = document.createElement('span');
        characterElement.style.transition =
          `opacity ${Number(options.fadeDuration ?? 180)}ms ease`;
        return { wrapper: characterElement, track: characterElement, sizer: null };
      });
      const characters = Array.from(originalText);
      if (options.effect === 'flip') {
        flipStates = characters.map((character) =>
          createFlipState(character, options.alphabet),
        );
        characterElements.forEach(({ track }, index) => {
          const state = flipStates[index];
          for (let copy = 0; copy < 5; copy += 1) {
            state.characters.forEach((character) => {
              const cell = document.createElement('span');
              cell.textContent = character;
              cell.style.height = '1em';
              cell.style.lineHeight = '1em';
              cell.style.flex = 'none';
              track.appendChild(cell);
            });
          }
          track.style.transform = `translateY(-${state.position}em)`;
          characterElements[index].sizer.textContent = characters[index];
        });
      }
      element.replaceChildren(...characterElements.map(({ wrapper }) => wrapper));
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

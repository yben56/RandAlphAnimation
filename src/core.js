const DEFAULT_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

export const DEFAULT_OPTIONS = {
  groups: 3,
  stagger: 500,
  steps: 3,
  stepInterval: 60,
  fadeDuration: 180,
  effect: 'spark',
  alphabet: DEFAULT_ALPHABET,
};

function normalizeOptions(options = {}) {
  const groups = Math.max(1, Math.floor(Number(options.groups ?? DEFAULT_OPTIONS.groups)));
  const stagger = Math.max(0, Number(options.stagger ?? DEFAULT_OPTIONS.stagger));
  const steps = Math.max(0, Math.floor(Number(options.steps ?? DEFAULT_OPTIONS.steps)));
  const stepInterval = Math.max(0, Number(options.stepInterval ?? DEFAULT_OPTIONS.stepInterval));
  const fadeDuration = Math.max(0, Number(options.fadeDuration ?? DEFAULT_OPTIONS.fadeDuration));
  const effect = options.effect ?? DEFAULT_OPTIONS.effect;
  const alphabet = Array.from(options.alphabet ?? DEFAULT_OPTIONS.alphabet);

  if (![groups, stagger, steps, stepInterval, fadeDuration]
    .every(Number.isFinite)) {
    throw new TypeError('Animation timing options must be finite numbers.');
  }
  if (effect !== 'spark') {
    throw new TypeError('The effect option must be "spark".');
  }
  if (alphabet.length === 0) {
    throw new TypeError('The alphabet option must contain at least one character.');
  }

  return {
    groups,
    stagger,
    steps,
    stepInterval,
    fadeDuration,
    effect,
    alphabet,
  };
}

function isLatinLetter(character) {
  return /^[a-z]$/i.test(character);
}

function getMatchingAlphabet(character, alphabet) {
  const uppercase = character === character.toUpperCase();
  return alphabet.map((letter) => (uppercase ? letter.toUpperCase() : letter.toLowerCase()));
}

export function runTextAnimation(text, options, onUpdate) {
  const settings = normalizeOptions(options);
  const originalCharacters = Array.from(text);
  const characters = [...originalCharacters];
  const opacities = originalCharacters.map(() => 1);
  const timers = new Set();
  let stopped = false;

  const publish = () => onUpdate(characters.join(''), [...opacities]);
  const schedule = (callback, delay) => {
    const timer = setTimeout(() => {
      timers.delete(timer);
      if (!stopped) callback();
    }, delay);
    timers.add(timer);
  };

  const stop = () => {
    stopped = true;
    for (const timer of timers) clearTimeout(timer);
    timers.clear();
    characters.splice(0, characters.length, ...originalCharacters);
    opacities.fill(1);
    publish();
  };

  const letterIndexes = originalCharacters
    .map((character, index) => (isLatinLetter(character) ? index : -1))
    .filter((index) => index !== -1);

  if (letterIndexes.length > 0 && settings.steps > 0) {
    const groupCount = Math.min(settings.groups, letterIndexes.length);
    const shuffledIndexes = [...letterIndexes];

    for (let index = shuffledIndexes.length - 1; index > 0; index -= 1) {
      const randomIndex = Math.floor(Math.random() * (index + 1));
      [shuffledIndexes[index], shuffledIndexes[randomIndex]] = [
        shuffledIndexes[randomIndex],
        shuffledIndexes[index],
      ];
    }

    const candidatesByIndex = new Map();
    for (const characterIndex of letterIndexes) {
      const originalCharacter = originalCharacters[characterIndex];
      const matchingAlphabet = getMatchingAlphabet(originalCharacter, settings.alphabet);
      const scrambleCandidates = matchingAlphabet
        .filter((letter) => letter !== originalCharacter);
      candidatesByIndex.set(characterIndex, matchingAlphabet);
      if (scrambleCandidates.length > 0) {
        characters[characterIndex] =
          scrambleCandidates[Math.floor(Math.random() * scrambleCandidates.length)];
        opacities[characterIndex] = Math.random() < 0.5 ? 0 : 1;
      }
    }
    publish();

    shuffledIndexes.forEach((characterIndex, shuffledPosition) => {
      const groupIndex = Math.floor((shuffledPosition * groupCount) / shuffledIndexes.length);
      const originalCharacter = originalCharacters[characterIndex];
      const candidates = candidatesByIndex.get(characterIndex);
      let elapsed = groupIndex * settings.stagger;

      for (let step = 2; step <= settings.steps; step += 1) {
        elapsed += settings.stepInterval;
        schedule(() => {
          if (characters[characterIndex] === originalCharacter) return;
          if (candidates.length > 0) {
            characters[characterIndex] = candidates[Math.floor(Math.random() * candidates.length)];
            if (characters[characterIndex] === originalCharacter) {
              opacities[characterIndex] = 1;
              publish();
              return;
            }
            opacities[characterIndex] = Math.random() < 0.5 ? 0 : 1;
          }
          publish();
        }, elapsed);
      }

      elapsed += settings.stepInterval;
      schedule(() => {
        if (characters[characterIndex] === originalCharacter) return;
        characters[characterIndex] = originalCharacter;
        opacities[characterIndex] = 1;
        publish();
      }, elapsed);
    });
  }

  return { stop };
}

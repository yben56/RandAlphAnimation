const DEFAULT_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

export const DEFAULT_OPTIONS = {
  groups: 3,
  stagger: 500,
  steps: 3,
  stepInterval: 60,
  fadeDuration: 180,
  flipDuration: 500,
  effect: 'spark',
  alphabet: DEFAULT_ALPHABET,
};

export function createFlipState(character, alphabet = DEFAULT_ALPHABET) {
  if (!/^[a-z]$/i.test(character)) {
    return {
      characters: [character],
      index: 0,
      position: 2,
      character,
    };
  }

  const lowercase = character !== character.toUpperCase();
  const characters = Array.from(new Set([
    ...Array.from(alphabet, (letter) => lowercase ? letter.toLowerCase() : letter.toUpperCase()),
    character,
  ]));
  const characterIndex = characters.indexOf(character);

  return {
    characters,
    index: characterIndex,
    position: characters.length * 2 + characterIndex,
    character,
  };
}

export function updateFlipRoller(track, state, character, duration) {
  if (character === state.character) return;

  const targetIndex = state.characters.indexOf(character);
  if (targetIndex === -1) return;

  const currentIndex = ((state.position % state.characters.length) + state.characters.length)
    % state.characters.length;
  const forward = (targetIndex - currentIndex + state.characters.length) % state.characters.length;
  const backward = forward - state.characters.length;
  const delta = Math.abs(forward) <= Math.abs(backward) ? forward : backward;
  state.position += delta;
  state.character = character;

  if (
    state.position < state.characters.length ||
    state.position >= state.characters.length * 4
  ) {
    state.position = state.characters.length * 2 + targetIndex;
    track.style.transition = 'none';
    track.style.transform = `translateY(-${state.position}em)`;
    track.offsetHeight;
  }

  track.style.transition = `transform ${duration}ms cubic-bezier(0.2, 0.7, 0.3, 1)`;
  track.style.transform = `translateY(-${state.position}em)`;
}

function normalizeOptions(options = {}) {
  const groups = Math.max(1, Math.floor(Number(options.groups ?? DEFAULT_OPTIONS.groups)));
  const stagger = Math.max(0, Number(options.stagger ?? DEFAULT_OPTIONS.stagger));
  const steps = Math.max(0, Math.floor(Number(options.steps ?? DEFAULT_OPTIONS.steps)));
  const stepInterval = Math.max(0, Number(options.stepInterval ?? DEFAULT_OPTIONS.stepInterval));
  const fadeDuration = Math.max(0, Number(options.fadeDuration ?? DEFAULT_OPTIONS.fadeDuration));
  const flipDuration = Math.max(0, Number(options.flipDuration ?? DEFAULT_OPTIONS.flipDuration));
  const effect = options.effect ?? DEFAULT_OPTIONS.effect;
  const alphabet = Array.from(options.alphabet ?? DEFAULT_OPTIONS.alphabet);

  if (![groups, stagger, steps, stepInterval, fadeDuration, flipDuration]
    .every(Number.isFinite)) {
    throw new TypeError('Animation timing options must be finite numbers.');
  }
  if (!['spark', 'flip'].includes(effect)) {
    throw new TypeError('The effect option must be "spark" or "flip".');
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
    flipDuration,
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
        opacities[characterIndex] =
          settings.effect === 'spark' && Math.random() < 0.5 ? 0 : 1;
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
            opacities[characterIndex] =
              settings.effect === 'spark' && Math.random() < 0.5 ? 0 : 1;
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

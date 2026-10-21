import { defineComponent, h, onBeforeUnmount, onMounted, onUpdated, ref, watch } from 'vue';
import { DEFAULT_OPTIONS, runTextAnimation } from './core.js';
import { transitionCharacter } from './character-transition.js';

export const RandomText = defineComponent({
  name: 'RandomText',
  inheritAttrs: false,
  props: {
    text: { type: String, required: true },
    groups: { type: Number, default: DEFAULT_OPTIONS.groups },
    stagger: { type: Number, default: DEFAULT_OPTIONS.stagger },
    steps: { type: Number, default: DEFAULT_OPTIONS.steps },
    stepInterval: { type: Number, default: DEFAULT_OPTIONS.stepInterval },
    fadeDuration: { type: Number, default: DEFAULT_OPTIONS.fadeDuration },
    effect: { type: String, default: DEFAULT_OPTIONS.effect, validator: (value) => value === 'spark' },
    alphabet: { type: String, default: DEFAULT_OPTIONS.alphabet },
  },
  setup(props, { attrs }) {
    const displayedCharacters = ref(Array.from(props.text));
    const displayedOpacities = ref(Array.from(props.text, () => 1));
    const characterElements = [];
    let previousCharacters = [...displayedCharacters.value];
    let animation;
    let mounted = false;

    const restart = () => {
      animation?.stop();
      displayedCharacters.value = Array.from(props.text);
      displayedOpacities.value = Array.from(props.text, () => 1);
      previousCharacters = [...displayedCharacters.value];
      animation = runTextAnimation(
        props.text,
        {
          groups: props.groups,
          stagger: props.stagger,
          steps: props.steps,
          stepInterval: props.stepInterval,
          fadeDuration: props.fadeDuration,
          effect: props.effect,
          alphabet: props.alphabet,
        },
        (text, opacities) => {
          displayedCharacters.value = Array.from(text);
          displayedOpacities.value = opacities;
        },
      );
    };

    onMounted(() => {
      mounted = true;
      restart();
    });

    onUpdated(() => {
      displayedCharacters.value.forEach((character, index) => {
        if (character !== previousCharacters[index] && characterElements[index]) {
          transitionCharacter(characterElements[index]);
        }
      });
      previousCharacters = [...displayedCharacters.value];
    });

    watch(
      () => [
        props.text,
        props.groups,
        props.stagger,
        props.steps,
        props.stepInterval,
        props.fadeDuration,
        props.effect,
        props.alphabet,
      ],
      () => {
        if (mounted) restart();
      },
    );

    onBeforeUnmount(() => {
      animation?.stop();
      mounted = false;
    });

    return () =>
      h(
        'span',
        { ...attrs, 'aria-label': props.text },
        [
          h(
            'span',
            { 'aria-hidden': 'true' },
            displayedCharacters.value.map((character, index) =>
              h(
                'span',
                {
                  key: index,
                  ref: (element) => {
                    characterElements[index] = element;
                  },
                  style: {
                    opacity: displayedOpacities.value[index] ?? 1,
                    transition: `opacity ${props.fadeDuration}ms ease, ` +
                      `filter ${props.fadeDuration}ms ease, ` +
                      `transform ${props.fadeDuration}ms ease`,
                  },
                },
                character,
              ),
            ),
          ),
        ],
      );
  },
});

export default RandomText;

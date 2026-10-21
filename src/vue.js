import { defineComponent, h, onBeforeUnmount, onMounted, onUpdated, ref, watch } from 'vue';
import {
  createFlipState,
  DEFAULT_OPTIONS,
  runTextAnimation,
  updateFlipRoller,
} from './core.js';

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
    flipDuration: { type: Number, default: DEFAULT_OPTIONS.flipDuration },
    effect: { type: String, default: DEFAULT_OPTIONS.effect, validator: (value) => ['spark', 'flip'].includes(value) },
    alphabet: { type: String, default: DEFAULT_OPTIONS.alphabet },
  },
  setup(props, { attrs }) {
    const displayedCharacters = ref(Array.from(props.text));
    const displayedOpacities = ref(Array.from(props.text, () => 1));
    const rollerTracks = [];
    let flipStates = Array.from(props.text, (character) =>
      createFlipState(character, props.alphabet),
    );
    let previousCharacters = [...displayedCharacters.value];
    let animation;
    let mounted = false;

    const restart = () => {
      animation?.stop();
      displayedCharacters.value = Array.from(props.text);
      displayedOpacities.value = Array.from(props.text, () => 1);
      flipStates = Array.from(props.text, (character) =>
        createFlipState(character, props.alphabet),
      );
      animation = runTextAnimation(
        props.text,
        {
          groups: props.groups,
          stagger: props.stagger,
          steps: props.steps,
          stepInterval: props.stepInterval,
          fadeDuration: props.fadeDuration,
          flipDuration: props.flipDuration,
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

    watch(
      () => [
        props.text,
        props.groups,
        props.stagger,
        props.steps,
        props.stepInterval,
        props.fadeDuration,
        props.flipDuration,
        props.effect,
        props.alphabet,
      ],
      () => {
        if (mounted) restart();
      },
    );

    onUpdated(() => {
      if (props.effect === 'flip') {
        displayedCharacters.value.forEach((character, index) => {
          const track = rollerTracks[index];
          if (character !== previousCharacters[index] && track && flipStates[index]) {
            updateFlipRoller(track, flipStates[index], character, props.flipDuration);
          }
        });
      }
      previousCharacters = [...displayedCharacters.value];
    });

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
              props.effect === 'flip'
                ? h(
                    'span',
                    {
                      key: index,
                      style: {
                        position: 'relative',
                        display: 'inline-grid',
                        height: '1em',
                        lineHeight: '1em',
                        overflow: 'hidden',
                        verticalAlign: 'baseline',
                      },
                    },
                    [
                      h(
                        'span',
                        {
                          style: {
                            gridArea: '1 / 1',
                            visibility: 'hidden',
                            whiteSpace: 'pre',
                          },
                        },
                        character,
                      ),
                      h(
                        'span',
                        {
                          ref: (element) => {
                            rollerTracks[index] = element;
                          },
                          style: {
                            position: 'absolute',
                            top: '0',
                            left: '0',
                            width: '100%',
                            display: 'flex',
                            flexDirection: 'column',
                            lineHeight: '1em',
                            textAlign: 'center',
                            whiteSpace: 'pre',
                            transform: `translateY(-${flipStates[index]?.position ?? 0}em)`,
                          },
                        },
                        Array.from({ length: 5 }, (_, copy) =>
                          flipStates[index]?.characters.map((reelCharacter, characterIndex) =>
                            h(
                              'span',
                              {
                                key: copy * (flipStates[index]?.characters.length ?? 1) + characterIndex,
                                style: {
                                  height: '1em',
                                  lineHeight: '1em',
                                  flex: 'none',
                                  width: '100%',
                                  whiteSpace: 'pre',
                                },
                              },
                              reelCharacter,
                            ),
                          ),
                        ).flat(),
                      ),
                    ],
                  )
                : h(
                    'span',
                    {
                      key: index,
                      style: {
                        opacity: displayedOpacities.value[index] ?? 1,
                        transition: `opacity ${props.fadeDuration}ms ease`,
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

# rand-alph-animation

A lightweight randomized letter animation for regular JavaScript and Vue 3.

At the start, all Latin letters change to random letters at once. The letters
are then randomly shuffled into balanced groups; each group continues changing
for the configured number of steps and resolves back to the original text after
its delay. If a letter randomly reaches its original value early, it stays
there while the remaining letters continue animating. In `spark` mode, letter
opacity changes randomly between `0` and `1` and returns to `1` when a letter
resolves. The original text is restored in randomized groups, not from left to
right. Spaces, punctuation, and non-Latin characters are left unchanged.

Choose the `spark` effect (the default) for randomized opacity changes, or the
`flip` effect for a mechanical-style vertical character reel (Rotary Counter).

## Install

```sh
npm install rand-alph-animation
```

To try the package from this source checkout, open `demo.html` through a local
web server (for example, `http://localhost/.../RandAlphAnimation/demo.html` in
XAMPP). ES modules do not work when the page is opened directly with a `file://`
URL. The Vue demo loads Vue 3 from unpkg and therefore requires an internet
connection.

Vue 3 is an optional peer dependency. Install it in your Vue project to use the
Vue component:

```sh
npm install vue
```

## Regular JavaScript

```js
import { animateText } from 'rand-alph-animation';

const title = document.querySelector('#title');
const animation = animateText(title, {
  groups: 3,
  stagger: 500,
  steps: 3,
  stepInterval: 60,
  effect: 'flip',
});

// When needed, stop and restore, replay, or permanently clean up:
// animation.stop();
// animation.start();
// animation.destroy();
```

```html
<span id="title">Hello World</span>
```

`animateText` starts immediately and returns `start()`, `stop()`, and
`destroy()` controls. `stop()` restores the original text. `destroy()` also
prevents the animation from being started again. Pass an element containing
plain text only; elements with child elements or other node types are rejected
so the animation cannot replace nested DOM content.

## Vue 3

```vue
<script setup>
import { RandomText } from 'rand-alph-animation/vue';
</script>

<template>
  <RandomText
    text="Hello World"
    :groups="3"
    :stagger="500"
    :steps="3"
    :step-interval="60"
    effect="flip"
  />
</template>
```

The component uses Vue rendering rather than changing the host element's
`textContent`. It restarts when its text or animation props change and clears
its timers when unmounted. The animated display is hidden from assistive
technology; the original text remains available as the element's accessible
label.

## Options

| Option | Default | Description |
| --- | ---: | --- |
| `groups` | `3` | Number of groups to start. Letters are randomly shuffled and distributed as evenly as possible across groups. |
| `stagger` | `500` | Delay in milliseconds between group starts. |
| `steps` | `3` | Number of random-letter states (including the initial scramble) before each letter returns to its original value. |
| `stepInterval` | `60` | Delay in milliseconds between random-letter states and before each letter returns to its original value. |
| `fadeDuration` | `180` | CSS opacity transition duration in milliseconds. Opacity is randomized automatically during animation and returns to `1` when each letter resolves. |
| `effect` | `spark` | Character transition style: `spark` for randomized opacity changes or `flip` for the vertically rolling Rotary Counter. |
| `flipDuration` | `500` | Duration in milliseconds of each character reel movement. |
| `alphabet` | `ABCDEFGHIJKLMNOPQRSTUVWXYZ` | Characters used as random replacements. Character case follows the original letter. |

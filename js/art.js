/* =====================================================================
   art.js: the ASCII drawings of every plant and zombie, in color.

   Each drawing has three parts:
     art   the drawing itself (a list of lines)
     ink   a color map of the same shape: one letter per character
           saying which palette color paints it. A space (or a missing
           letter) means the main color `a`.
     pal   the palette: { a: '#hex', b: '#hex', ... }
   For example Sunflower's ink paints its petals yellow (a), the edge of
   its face brown (f), its eyes and smile light (k) and its stem green (g).

   Plants face RIGHT (toward the zombies) and zombies face LEFT, arms out.
   The colors follow the real characters' look; eyes use a light color
   on purpose, because black would vanish on the dark background.

   The drawings are written with art`...` (String.raw), so a backslash
   (\) stays a backslash. A drawing must never END with a backslash (it
   would swallow the closing backtick), so they end with a space. Keep
   the art ASCII-only: other symbols come from different fonts with
   different widths and break the lines up.
   ===================================================================== */

// art`...` turns a drawing into a list of its lines, dropping the empty
// first line that comes from starting the drawing on a new line.
const art = strings => String.raw(strings).split('\n').slice(1);

// Colors many characters share.
const EYE = '#f2efe4';     // light eyes
const STEM = '#3f9b30';    // plant stems and leaves
const ZOMBIE_PAL = {       // a zombie: skin, eyes, hair, coat, white shirt, red tie, pants
  a: '#9db38a', k: EYE, h: '#9a7a52', c: '#7a5434', w: '#e9e4d6', r: '#d0403a', p: '#5e4a34',
};

const DRAWINGS = {
  // ================= PLANTS =================
  peashooter: {
    pal: { a: '#a8e04c', b: '#357f27', g: STEM, k: EYE },
    art: art`
    ___
 ~ /   \___
  (  o  ___)O
   \___/
     |
  \__|__/ `,
    ink: art`

 b
     k

     g
  ggggggg`,
  },
  sunflower: {
    pal: { a: '#ffd21f', f: '#c97a2c', g: STEM, k: EYE },
    art: art`
  \  |  /
 '.\ | /.'
--=(^u^)=--
 .'/ | \'.
     |/
   \_|_/ `,
    ink: art`


   fkkkf

     gg
   ggggg`,
  },
  solarblaze: {
    pal: { a: '#ff6a2a', y: '#ffd21f', f: '#8a2a10', g: STEM, k: EYE },
    art: art`
 ( \ ) / (
 ')\ | /('
~~=(>_<)=~~
 ,(/ | \),
     |/
   \_|_/ `,
    ink: art`
 y   y   y
 y      y
   fkkkf
 y      y
     gg
   ggggg`,
  },
  walnut: {
    pal: { a: '#c8883a', d: '#8b5a2b', k: EYE },
    art: art`
  .----.
 / ,    \
| (o)(o) |
|   --   |
|        |
 \______/ `,
    ink: art`

   d
  kkkkkk
    dd
`,
  },
  potatomine: {
    pal: { a: '#c08a44', s: '#b0b0b0', r: '#ff2a2a', d: '#6b4a2b', k: EYE },
    art: art`
      @
      |
   .--'--.
  ( o   o )
~~~~~~~~~~~~~ `,
    ink: art`
      r
      s

    k   k
ddddddddddddd`,
  },
  chomper: {
    pal: { a: '#9a4cc0', w: '#ffffff', r: '#e0506a', g: STEM, k: EYE },
    art: art`
   _____
  / o   \vVvV
 |       >
  \_____/^^^^
     ||
   \_||_/ `,
    ink: art`

    k    wwww
         r
         wwww
     gg
   gggggg`,
  },
  squash: {
    pal: { a: '#c9d68a', d: '#6f7f34', g: STEM, k: EYE },
    art: art`
    _\_
  .'    '.
 /  \  /  \
|  (o)(o)  |
|   /--\   |
 '-.____.-' `,
    ink: art`
    ggg

    d  d
   kkkkkk
    dddd
`,
  },
  lightningreed: {
    pal: { a: '#8ff4ff', w: '#ffffff', g: STEM, k: '#1e6e9a' },
    art: art`
   .\/.  *
  ( o  )-z
   \  /
    ||
    ||/
  \_||_/ `,
    ink: art`
         w
    k   ww

    gg
    ggg
  gggggg`,
  },
  bonkchoy: {
    pal: { a: '#edefe0', g: '#4e9a2f', k: '#3f7a2a' },
    art: art`
   \\|//
   (\|/)
 @=(>_<)=@
    |  |
    |__| `,
    ink: art`
   ggggg
   ggggg
 gg kkk gg
`,
  },
  garlic: {
    pal: { a: '#f3ebd9', p: '#b48acd', g: '#7cb342', k: '#6a4a8a' },
    art: art`
    ,|,
   /   \
  / | | \
 (  -_-  )
  \_|_|_/ `,
    ink: art`
    ggg

    p p
    kkk
    p p`,
  },

  // ================= ZOMBIES =================
  basic: {
    pal: ZOMBIE_PAL,
    art: art`
    ,,,
   (x_o)
~==/[V]\
   |   |
   /   \ `,
    ink: art`
    hhh
    k k
acccwrwc
   c   c
   p   p`,
  },
  cone: {
    pal: { ...ZOMBIE_PAL, o: '#f07f1e', d: '#ffd9b0' },
    art: art`
    /\
   /__\
   (x_o)
~==/[V]\
   |   |
   /   \ `,
    ink: art`
    oo
   oddo
    k k
acccwrwc
   c   c
   p   p`,
  },
  bucket: {
    pal: { ...ZOMBIE_PAL, m: '#8a9096', g: '#c4c9ce' },
    art: art`
   _____
   |___|
   (x_o)
~==/[V]\
   |   |
   /   \ `,
    ink: art`
   mmmmm
   ggggg
    k k
acccwrwc
   c   c
   p   p`,
  },
  pole: {
    pal: { ...ZOMBIE_PAL, y: '#e8c94a', R: '#d02a30', t: '#d9b44a' },
    art: art`
      ,,,
     (x_o)
----=/[I]\
     |   |
     /   \ `,
    ink: art`
      yyy
      k k
tttt RRwRR
     w   w
`,
  },
  football: {
    pal: { ...ZOMBIE_PAL, R: '#d0222c', g: '#d0d0d0', W: '#ededed' },
    art: art`
   .---.
  (=x_o)
 _[###]_
~==|#9#|
   |___|
   /   \ `,
    ink: art`
   RRRRR
  Rgk kR
 RRRRRRR
aRRRRWRR
   WWWWW
`,
  },
  // Football Zombie once its helmet is gone.
  footballBare: {
    pal: { ...ZOMBIE_PAL, R: '#d0222c', W: '#ededed' },
    art: art`
    ,,,
   (x_o)
 _[###]_
~==|#9#|
   |___|
   /   \ `,
    ink: art`
    hhh
    k k
 RRRRRRR
aRRRRWRR
   WWWWW
`,
  },
  // The rogue Bonk Choy: the same plant, angry red, facing left.
  roguebonk: {
    pal: { a: '#f0d0d0', g: '#c0304a', k: '#ff6f8a' },
    art: art`
   \\|//
   (\|/)
 @=(>_<)=@
   |  |
   |__| `,
    ink: art`
   ggggg
   ggggg
 gg kkk gg
`,
  },
};

// The drawing to use once a zombie's armor is gone.
const BARE = { cone: 'basic', bucket: 'basic', football: 'footballBare' };

// spriteKey(u): which drawing a battle unit uses right now.
function spriteKey(u) {
  if (u.blaze) return 'solarblaze';
  if (BARE[u.id] && u.armorMax > 0 && u.armor <= 0) return BARE[u.id];
  return u.id;
}

// spriteHtml('sunflower'): the drawing as HTML, every character in its
// ink color. Characters next to each other with the same color share one
// <span>, which keeps the HTML small.
function spriteHtml(id) {
  const d = DRAWINGS[id];
  return d.art.map((line, i) => {
    let html = '', run = '', runColor = null;
    for (let j = 0; j < line.length; j++) {
      const color = d.pal[(d.ink[i] || '')[j]] || d.pal.a;
      if (color !== runColor && run) { html += `<span style="color:${runColor}">${esc(run)}</span>`; run = ''; }
      runColor = color;
      run += line[j];
    }
    if (run) html += `<span style="color:${runColor}">${esc(run)}</span>`;
    return html;
  }).join('\n');
}

// The big title letters on the title screen.
const TITLE_ART = [
  ' ___   _   ___ _  ____   __ _   ___ ___  ',
  '| _ ) /_\\ / __| |/ /\\ \\ / //_\\ | _ \\   \\ ',
  '| _ \\/ _ \\ (__| \' <  \\ V // _ \\|   / |) |',
  '|___/_/ \\_\\___|_|\\_\\  |_|/_/ \\_\\_|_\\___/ ',
  ' ___ ___    ___      __ _    ',
  '| _ ) _ \\  /_\\ \\    / /| |   ',
  '| _ \\   / / _ \\ \\/\\/ / | |__ ',
  '|___/_|_\\/_/ \\_\\_/\\_/  |____|',
];

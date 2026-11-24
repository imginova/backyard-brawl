/* =====================================================================
   world.js: the Lawn's map, its battles and what they unlock.

   The map is a list of text rows. Each character is one tile:
     #  fence           "  tall grass      T  tree       ~  pond
     H  your house      %  hedge           :  path       .  short grass
     @  where you start (path)
     1-8  story battles (in order)    B  boss (Football Zombie)
     R  rogue plant (optional)        S  secret battle (optional)
     $  the "suspicious bush": looks like a hedge, but you can walk
        through it (it's drawn a slightly different green)
     ?  a sign (bump into it to read it)
     G  the gate to the next area
   Walls: everything except : . @ $ and beaten battles. A battle you
   haven't beaten blocks the path, so the story goes in order.
   ===================================================================== */

const LAWN_MAP = [
  '########################################',
  '#HHH""""T"""""""""T""""""""~~~~"""T""""#',
  '#HHH""""""""""""""""""""""~~~~~"""R""""#',
  '#.@::::1::::::::2::::::::::3:::::::::::#',
  '#?""T"""""""""""""""""""T""~~""""""""":#',
  '#""""""""T"""""""""""""""""""""""T"""":#',
  '#"::::::6::::::::::5:::::::::::4:::::::#',
  '#":"""""T""""""""""""~~~"""""""""""""""#',
  '#":?"""""""""""""""""""""""""""""""""""#',
  '#"::::7::::::::::8::::::::::::B::::::G"#',
  '#%%%$%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%#',
  '#""".S"""""""""""""""""""""""""""""""""#',
  '########################################',
];

// Which characters you can walk on.
const WALKABLE = ':.@$';

// Signs: where they are ("row,col") and what they say.
const SIGNS = {
  '4,1': 'WELCOME TO THE LAWN. Zombies are coming! Walk into a red number to fight. Press T (or the Team button) to pick your plants and their moves.',
  '8,3': 'The hedge along this path looks thin in one spot...',
};

// ---- Battles -----------------------------------------------------------
// Each battle has a name, waves (each wave is a list of zombie ids) and
// an optional `unlock` (a plant you get the first time you win).
// `optional` battles (the rogue and the secret one) don't block anything.
const BATTLES = {
  '1': { name: 'Front Gate', waves: [['basic'], ['basic', 'basic']] },
  '2': { name: 'Garden Path', waves: [['basic', 'basic'], ['cone', 'basic']], unlock: 'potatomine' },
  '3': { name: 'Flower Beds', waves: [['cone', 'basic', 'basic'], ['cone', 'cone']] },
  '4': { name: 'Pond Side', waves: [['pole', 'basic'], ['cone', 'pole', 'basic']], unlock: 'chomper' },
  '5': { name: 'Tool Shed', waves: [['bucket', 'basic'], ['cone', 'cone', 'pole']] },
  '6': { name: 'Hedge Row', waves: [['bucket', 'cone', 'basic'], ['pole', 'pole', 'basic']], unlock: 'squash' },
  '7': { name: 'Vegetable Patch', waves: [['bucket', 'bucket'], ['cone', 'pole', 'cone', 'basic']] },
  '8': { name: 'Back Fence', waves: [['bucket', 'cone', 'pole', 'basic'], ['bucket', 'bucket', 'pole']], unlock: 'lightningreed' },
  'B': { name: 'Football Zombie', boss: true, waves: [['cone', 'basic', 'pole'], ['football', 'cone', 'bucket']] },
  'R': { name: 'Rogue Bonk Choy', optional: true, rogue: true, waves: [['pole', 'roguebonk', 'pole']], unlock: 'bonkchoy' },
  'S': { name: 'The Stinky Thicket', optional: true, secret: true,
         // 3 waves: with only the first two, a test bot won 100% of the time.
         waves: [['bucket', 'cone', 'cone'], ['bucket', 'bucket', 'pole', 'pole'], ['bucket', 'bucket', 'cone', 'pole']], unlock: 'garlic' },
};

// What the gate says once the boss is beaten.
const GATE_TEXT = 'The Lawn is safe... for now. The next area is coming in a future update!';

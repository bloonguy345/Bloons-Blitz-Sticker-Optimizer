// =====================================================================
// STICKER DATA. Add or edit stickers here: one line per sticker.
//
//   name   Sticker name (must be unique)
//   shape  Rows of the sticker: 'X' = a cell, anything else = empty
//          (box(w, h) makes a full w x h rectangle)
//   base   Base (Common) stat
//   rare   Rare effect
//   epic   Epic effect
//
// Wrap the number that should stack in {braces}. When the exact same sticker
// is placed more than once, those numbers are added together:
// two Rare Wheely Fast give {20} + {20} = "40% Primary Monkey Attack Speed".
// An effect with no {braces} doesn't stack; it is just counted (x2, x3...).
// Rare stickers have the Rare effect, Epic stickers have Rare + Epic.
//
// A sticker whose base stat is 'Effectiveness' is a Glow Up.
// =====================================================================

function box(w, h) { var r = []; for (var i = 0; i < h; i++) r.push(new Array(w + 1).join('X')); return r; }

var STICKERS = [
  { name: 'Retro Flair', shape: box(2, 2), base: 'Collection Range', rare: '{10}% Blop Value', epic: 'Blops deal {1} damage to any Bloon they touch while being collected' },
  { name: 'Pop Pop Pop!', shape: box(3, 2), base: 'Hero Pierce', rare: '{30}% Movement Speed if all monkeys in the team are the same type', epic: '{30}% Team Pierce if all monkeys in the team are Primary' },
  { name: 'Pow Pow Pow!', shape: box(3, 2), base: 'Hero Damage', rare: '{30}% Movement Speed if all monkeys in the team are the same type', epic: '{30}% Team Damage if all monkeys in the team are Military' },
  { name: 'Pew Pew Pew!', shape: box(3, 2), base: 'Hero Attack Speed', rare: '{30}% Movement Speed if all monkeys in the team are the same type', epic: '{30}% Team Attack Speed if all monkeys in the team are Magic' },
  { name: 'Ready to Rumble', shape: box(2, 2), base: 'Hero Knockback', rare: '{5}% chance to stun Bloons for 1s when they are hit with a knockback force of 3 or more from the hero', epic: '+{10}% to stun chance' },
  { name: 'Retro Style', shape: ['XXX', 'XOX'], base: 'Luck', rare: '{20} additional Blops spawn at the beginning of the stage', epic: '{30} additional Blops spawn at the beginning of the stage' },
  { name: "Can't Hide", shape: ['XXX', 'XX'], base: 'Hero Pierce', rare: 'Hero attacks have a {20}% chance to stun Shield Bloons for 1 second', epic: 'Hero attacks have a {20}% chance to pass through shields' },
  { name: 'Green Thumb', shape: ['XXX', 'OXX'], base: 'Hero Attack Speed', rare: '{20}% Hero Crit Chance vs Regrow Bloons', epic: 'Hero has a {20}% chance to prevent Bloons from regrowing for 1,000% seconds on hit' },
  { name: "Ol' Faithful", shape: ['X', 'XX'], base: 'Hero Pierce', rare: '{20}% Primary Monkey Pierce', epic: '{10}% size to glaives with Honed Edges' },
  { name: 'Glitter and Gold', shape: ['XXX', 'OXO'], base: 'Blop Value', rare: '{10}% chance of getting a Primary Monkey when rolling new monkeys', epic: '{10}% to Primary Monkey chance' },
  { name: 'Fist of Furry', shape: box(3, 1), base: 'Hero Damage', rare: '{20}% Primary Monkey Damage', epic: '{10}% Knockback to Boomerangs with Heavy Metal' },
  { name: 'Wheely Fast', shape: ['X', 'XX'], base: 'Hero Attack Speed', rare: '{20}% Primary Monkey Attack Speed', epic: '+{2} Tacks from Even More Tacks' },
  { name: 'Off On An Adventure', shape: box(3, 3), base: 'More Gold', rare: 'Bags and Chests drop {10}% more Gold Coins', epic: 'Bags and Chests drop {20}% more Gold Coins' },
  { name: 'Badge of the Marksman', shape: box(3, 1), base: 'Hero Pierce', rare: '{20}% Military Monkey Pierce', epic: 'Increase Explosion size by {10}% for Direct Hit' },
  { name: 'Ranking Officer', shape: ['XXX', 'OXO'], base: 'Blop Value', rare: '{10}% chance of getting a Military Monkey when rolling new monkeys', epic: '{10}% to Military Monkey chance' },
  { name: 'Badge of Valor', shape: ['X', 'XX'], base: 'Hero Damage', rare: '{20}% Military Monkey Damage', epic: '+{5}% Vulnerability Damage from Anti-Material Rounds' },
  { name: 'Sergeants Stripes', shape: ['X', 'XX'], base: 'Hero Attack Speed', rare: '{20}% Military Monkey Attack Speed', epic: '+{1} shot per burst to Burst Fire' },
  { name: 'A Little Magic', shape: ['X', 'XX'], base: 'Hero Pierce', rare: '{20}% Magic Monkey Pierce', epic: 'Bulky Potions are {10}% larger' },
  { name: 'Magical Moxie', shape: ['XXX', 'OXO'], base: 'Blop Value', rare: '{10}% chance of getting a Magic Monkey when rolling new monkeys', epic: '{10}% to Magic Monkey chance' },
  { name: 'Lightning Bolt', shape: ['X', 'XX'], base: 'Hero Damage', rare: '{20}% Magic Monkey Damage', epic: 'Increase Dark Magic cap by {5}' },
  { name: 'Haste Spell', shape: box(3, 1), base: 'Hero Attack Speed', rare: '{20}% Magic Monkey Attack Speed', epic: 'Increase duration of Stronger Acid by {10}%' },
  { name: 'Feeling Lucky', shape: ['XXXXX', 'X', 'XX'], base: 'Luck', rare: 'Start with {1} Temp HP', epic: 'You can have {1} additional Temp HP at a time' },
  { name: 'Pretty Fly For a Cacti', shape: ['X', 'XX', 'XXX'], base: 'Hero Knockback', rare: 'Hero knocks Bloons back {1}m when Immune', epic: 'Hero deals {10} damage to each Bloon touched when Immune' },
  { name: 'That Prickles', shape: ['X', 'XX', 'XXX'], base: 'Immunity Duration', rare: 'Hero knocks Bloons back {1}m when Immune', epic: 'Hero deals {10} damage to each Bloon touched when Immune' },
  { name: 'Well Warned', shape: ['OXO', 'XXX', 'OXO'], base: 'Hero Crit Chance', rare: 'Hero critical hits have a {1}% chance to Heal 1 once per milestone', epic: '+{0.04} to Heal chance' },
  { name: 'Tough Road Ahead', shape: box(4, 2), base: 'Blop Value', rare: 'Heal {1} HP on level up', epic: 'Heal {1} more HP on level up' },
  { name: 'Retro Pizazz', shape: box(2, 1), base: 'Hero Crit Chance', rare: '{100}% Hero Crit Damage', epic: 'Bloons popped by a Crit from the hero have a {20}% chance to drop x2 Blops' },
  { name: 'Nick of Time', shape: ['OOX', 'XXXX', 'OOX'], base: 'Evasion', rare: 'Deal {3000}% damage to the attacking Bloon after a successful dodge', epic: '{100}% movement speed for 3 seconds on a successful dodge' },
  { name: 'The Friendly Bloon', shape: ['OXXX', 'OXX', 'XXX'], base: 'Blop Value', rare: 'Gain {50}% Blop Value during boss fights', epic: 'Gain {50}% Luck during boss fights' },
  { name: 'Ultimate Showdown', shape: ['OXXO', 'XXXX'], base: 'Hero Damage', rare: '{20}% Hero Boss Damage', epic: 'Hero gains {50}% Attack Speed for 10 seconds when a boss fight starts' },
  { name: 'Glow Up', shape: ['XX'], base: 'Effectiveness', rare: 'Vertically adjacent stickers also get the boost', epic: 'Diagonally adjacent stickers also get the boost' },
  { name: 'The Wise Frog', shape: box(1, 2), base: 'Encounter Duration', rare: 'Encounter takes {20}% less time to activate (minimum 0.5s)', epic: 'Activating an encounter also gives {5000}% Blops' }
];
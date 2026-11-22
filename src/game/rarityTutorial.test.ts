import test from 'node:test';
import assert from 'node:assert/strict';
import {
  TUTORIAL_EXPLAINED_RARITIES,
  getRarityTutorialInfo,
  markRarityTutorialSeen,
  sanitizeSeenRarityTutorials,
  shouldShowRarityFirstTimeTutorial,
} from './rarityTutorial';

test('Común never triggers the per-rarity extra tutorial card', () => {
  assert.equal(shouldShowRarityFirstTimeTutorial('Común', []), false);
  assert.equal(getRarityTutorialInfo('Común', 'es'), null);
  assert.equal(getRarityTutorialInfo('Común', 'en'), null);
});

test('Unseen rarities trigger once and stop repeating after marked seen', () => {
  for (const rarity of TUTORIAL_EXPLAINED_RARITIES) {
    assert.equal(shouldShowRarityFirstTimeTutorial(rarity, []), true);
    const updated = markRarityTutorialSeen([], rarity);
    assert.deepEqual(updated, [rarity]);
    assert.equal(shouldShowRarityFirstTimeTutorial(rarity, updated), false);
    assert.deepEqual(markRarityTutorialSeen(updated, rarity), updated);
  }
});

test('sanitizeSeenRarityTutorials filters invalid entries and deduplicates', () => {
  const cleaned = sanitizeSeenRarityTutorials([
    'Rara',
    'Común',
    'Rara',
    'Invalid',
    123,
    'Secreto Abisal',
  ]);
  assert.deepEqual(cleaned, ['Rara', 'Secreto Abisal']);
});

test('Each rarity explanation reflects exact minigame mechanics and Secreto Abisal lists 3 stages in order', () => {
  const raraEs = getRarityTutorialInfo('Rara', 'es');
  assert.ok(raraEs);
  assert.match(raraEs.summary, /20/);

  const epicaEs = getRarityTutorialInfo('Épica', 'es');
  assert.ok(epicaEs);
  assert.match(epicaEs.summary, /zona verde/i);

  const miticaEs = getRarityTutorialInfo('Mítica', 'es');
  assert.ok(miticaEs);
  assert.match(miticaEs.summary, /más rápido/i);
  assert.match(miticaEs.summary, /zona verde/i);

  const legendariaEs = getRarityTutorialInfo('Legendaria', 'es');
  assert.ok(legendariaEs);
  assert.match(legendariaEs.summary, /gotas que van cayendo/i);

  const secretoEs = getRarityTutorialInfo('Secreto', 'es');
  assert.ok(secretoEs);
  assert.match(secretoEs.summary, /25 gotas/i);

  const abisalEs = getRarityTutorialInfo('Secreto Abisal', 'es');
  assert.ok(abisalEs);
  assert.equal(abisalEs.steps.length, 3);
  assert.equal(abisalEs.steps[0].stepNum, 1);
  assert.match(abisalEs.steps[0].label, /1º.*50/);
  assert.equal(abisalEs.steps[1].stepNum, 2);
  assert.match(abisalEs.steps[1].label, /2º.*Zona verde/i);
  assert.equal(abisalEs.steps[2].stepNum, 3);
  assert.match(abisalEs.steps[2].label, /3º.*20 Gotas/i);
});

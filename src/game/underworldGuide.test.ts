import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getUnderworldGuideContent,
  resolveActiveUnderworldGuide,
} from './underworldGuide';

const baseInput = {
  mode: 'playing' as const,
  world: 'underworld' as const,
  scene: 'dock' as const,
  tutorialStep: 0,
  isTransitioningWorld: false,
  isWalkingScene: false,
  activePanel: 'none',
  marketStallModal: 'none' as const,
  hasPendingCatch: false,
  isMinigameOpen: false,
  seenUnderworldIntro: false,
  seenUnderworldMarketIntro: false,
};

test('resolveActiveUnderworldGuide shows underworld intro only on first visit to Underworld dock', () => {
  assert.equal(resolveActiveUnderworldGuide(baseInput), 'underworld');
  assert.equal(
    resolveActiveUnderworldGuide({ ...baseInput, seenUnderworldIntro: true }),
    null
  );
  assert.equal(
    resolveActiveUnderworldGuide({ ...baseInput, world: 'river' }),
    null
  );
  assert.equal(
    resolveActiveUnderworldGuide({ ...baseInput, isTransitioningWorld: true }),
    null
  );
});

test('resolveActiveUnderworldGuide shows underworld market intro only on first visit to Underworld market', () => {
  assert.equal(
    resolveActiveUnderworldGuide({
      ...baseInput,
      scene: 'market',
      seenUnderworldIntro: true,
    }),
    'underworld_market'
  );
  assert.equal(
    resolveActiveUnderworldGuide({
      ...baseInput,
      scene: 'market',
      seenUnderworldIntro: true,
      seenUnderworldMarketIntro: true,
    }),
    null
  );
  assert.equal(
    resolveActiveUnderworldGuide({
      ...baseInput,
      scene: 'market',
      isWalkingScene: true,
    }),
    null
  );
  assert.equal(
    resolveActiveUnderworldGuide({
      ...baseInput,
      scene: 'market',
      marketStallModal: 'rods',
    }),
    null
  );
});

test('getUnderworldGuideContent returns localized concise explanations for both guides', () => {
  const uwEs = getUnderworldGuideContent('underworld', 'es');
  assert.equal(uwEs.points.length, 3);
  assert.match(uwEs.points[0].title, /lava/i);
  assert.match(uwEs.points[2].title, /mercado/i);

  const uwMarketEs = getUnderworldGuideContent('underworld_market', 'es');
  assert.equal(uwMarketEs.points.length, 3);
  assert.match(uwMarketEs.points[0].title, /vender/i);
  assert.match(uwMarketEs.points[1].detail, /lava/i);
  assert.match(uwMarketEs.points[2].title, /1v1/i);
});

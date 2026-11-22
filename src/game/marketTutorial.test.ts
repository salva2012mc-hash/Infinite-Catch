import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getHighlightedStallForTutorial,
  getMarketTourCardContent,
  getNextMarketTutorialSubStep,
  resolveMarketSubStepOnSceneState,
  shouldCompleteMarketTutorial,
} from './marketTutorial';

test('market tutorial advances through all 3 stalls and then returning', () => {
  assert.equal(getNextMarketTutorialSubStep('go_to_market'), 'sell');
  assert.equal(getNextMarketTutorialSubStep('sell'), 'rods');
  assert.equal(getNextMarketTutorialSubStep('rods'), 'pvp');
  assert.equal(getNextMarketTutorialSubStep('pvp'), 'returning');
  assert.equal(getNextMarketTutorialSubStep('returning'), 'returning');
});

test('arriving in market during tutorial step 4 enters the sell stall explanation', () => {
  assert.equal(
    resolveMarketSubStepOnSceneState(4, 'market', true, 'go_to_market'),
    'go_to_market'
  );
  assert.equal(
    resolveMarketSubStepOnSceneState(4, 'market', false, 'go_to_market'),
    'sell'
  );
  assert.equal(
    resolveMarketSubStepOnSceneState(4, 'market', false, 'rods'),
    'rods'
  );
  assert.equal(
    resolveMarketSubStepOnSceneState(0, 'market', false, 'sell'),
    'go_to_market'
  );
});

test('highlighted stall only activates during tutorial step 4 while stationary in market', () => {
  assert.equal(getHighlightedStallForTutorial(4, 'dock', false, 'sell'), null);
  assert.equal(getHighlightedStallForTutorial(4, 'market', true, 'sell'), null);
  assert.equal(getHighlightedStallForTutorial(4, 'market', false, 'go_to_market'), null);
  assert.equal(getHighlightedStallForTutorial(4, 'market', false, 'sell'), 'sell');
  assert.equal(getHighlightedStallForTutorial(4, 'market', false, 'rods'), 'rods');
  assert.equal(getHighlightedStallForTutorial(4, 'market', false, 'pvp'), 'pvp');
  assert.equal(getHighlightedStallForTutorial(4, 'market', false, 'returning'), null);
  assert.equal(getHighlightedStallForTutorial(5, 'market', false, 'sell'), null);
});

test('completes tutorial step 4 only after walking back to the dock', () => {
  assert.equal(shouldCompleteMarketTutorial(4, 'market', false, 'returning'), false);
  assert.equal(shouldCompleteMarketTutorial(4, 'dock', true, 'returning'), false);
  assert.equal(shouldCompleteMarketTutorial(4, 'dock', false, 'go_to_market'), false);
  assert.equal(shouldCompleteMarketTutorial(4, 'dock', false, 'returning'), true);
  assert.equal(shouldCompleteMarketTutorial(5, 'dock', false, 'returning'), false);
});

test('tour card content provides localized titles and marks pvp as last stall', () => {
  const sellEs = getMarketTourCardContent('sell', 'es');
  assert.equal(sellEs.stepIndex, 1);
  assert.equal(sellEs.isLastStall, false);
  assert.match(sellEs.title, /Vender Pesca/i);

  const rodsEn = getMarketTourCardContent('rods', 'en');
  assert.equal(rodsEn.stepIndex, 2);
  assert.equal(rodsEn.isLastStall, false);
  assert.equal(/coming soon/i.test(rodsEn.description), false);

  const rodsEs = getMarketTourCardContent('rods', 'es');
  assert.equal(/disponible pronto|próximamente/i.test(rodsEs.description), false);

  const pvpEs = getMarketTourCardContent('pvp', 'es');
  assert.equal(pvpEs.stepIndex, 3);
  assert.equal(pvpEs.isLastStall, true);
  assert.match(pvpEs.buttonLabel, /Volver/i);
});

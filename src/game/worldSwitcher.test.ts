import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getWorldOptionCopy,
  getWorldOptionState,
  resolveWorldSwitchAction,
} from './worldSwitcher';

test('getWorldOptionState clearly distinguishes active, available, and locked states', () => {
  assert.equal(getWorldOptionState('river', 'river', false), 'active');
  assert.equal(getWorldOptionState('underworld', 'river', false), 'locked');

  assert.equal(getWorldOptionState('river', 'river', true), 'active');
  assert.equal(getWorldOptionState('underworld', 'river', true), 'available');

  assert.equal(getWorldOptionState('river', 'underworld', true), 'available');
  assert.equal(getWorldOptionState('underworld', 'underworld', true), 'active');
});

test('resolveWorldSwitchAction enforces guards and handles locked vs unlocked clicks', () => {
  assert.equal(
    resolveWorldSwitchAction({
      targetWorld: 'underworld',
      currentWorld: 'river',
      underworldUnlocked: false,
      isWalkingScene: false,
      isTransitioningWorld: false,
      tutorialStep: 0,
    }),
    'open_unlock_modal'
  );

  assert.equal(
    resolveWorldSwitchAction({
      targetWorld: 'underworld',
      currentWorld: 'river',
      underworldUnlocked: true,
      isWalkingScene: false,
      isTransitioningWorld: false,
      tutorialStep: 0,
    }),
    'travel'
  );

  assert.equal(
    resolveWorldSwitchAction({
      targetWorld: 'river',
      currentWorld: 'river',
      underworldUnlocked: true,
      isWalkingScene: false,
      isTransitioningWorld: false,
      tutorialStep: 0,
    }),
    'noop'
  );

  assert.equal(
    resolveWorldSwitchAction({
      targetWorld: 'underworld',
      currentWorld: 'river',
      underworldUnlocked: true,
      isWalkingScene: true,
      isTransitioningWorld: false,
      tutorialStep: 0,
    }),
    'noop'
  );

  assert.equal(
    resolveWorldSwitchAction({
      targetWorld: 'underworld',
      currentWorld: 'river',
      underworldUnlocked: true,
      isWalkingScene: false,
      isTransitioningWorld: true,
      tutorialStep: 0,
    }),
    'noop'
  );

  assert.equal(
    resolveWorldSwitchAction({
      targetWorld: 'underworld',
      currentWorld: 'river',
      underworldUnlocked: true,
      isWalkingScene: false,
      isTransitioningWorld: false,
      tutorialStep: 2,
    }),
    'noop'
  );
});

test('getWorldOptionCopy exposes distinct active, available, and locked labels in ES and EN', () => {
  const lockedEs = getWorldOptionCopy('underworld', 'locked', 'es');
  assert.equal(lockedEs.label, 'Inframundo');
  assert.equal(lockedEs.lockBadge, 'Nv.10');
  assert.equal(lockedEs.statusLabel, 'Bloqueado');
  assert.match(lockedEs.title, /Nivel 10/);

  const availableEn = getWorldOptionCopy('underworld', 'available', 'en');
  assert.equal(availableEn.label, 'Underworld');
  assert.equal(availableEn.lockBadge, '');
  assert.equal(availableEn.statusLabel, 'Available');

  const activeRiverEs = getWorldOptionCopy('river', 'active', 'es');
  assert.equal(activeRiverEs.label, 'Río');
  assert.equal(activeRiverEs.statusLabel, 'Activo');
});

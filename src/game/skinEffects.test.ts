import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SKIN_SUGGESTED_SOUNDS,
  SKIN_VFX_CONFIG,
  SkinEffectsEngine,
  SkinFrameState,
} from './skinEffects';
import { ALL_FISH } from './pokemonData';

function makeState(overrides: Partial<SkinFrameState> = {}): SkinFrameState {
  return {
    skin: 'suit_magma',
    phase: 'IDLE',
    elapsed: 1.0,
    width: 1280,
    height: 720,
    charX: 435,
    charY: 658,
    rodBaseX: 495,
    rodBaseY: 500,
    rodTipX: 740,
    rodTipY: 320,
    holeX: 793,
    holeY: 468,
    projectileX: null,
    projectileY: null,
    quality: 'normal',
    isPaused: false,
    pendingRarity: 'Rara',
    caughtFish: null,
    revealElapsed: 0,
    inBuildup: false,
    lang: 'es',
    ...overrides,
  };
}

test('SKIN_VFX_CONFIG and SKIN_SUGGESTED_SOUNDS define constants and audio descriptions for all 3 skins', () => {
  assert.ok(SKIN_VFX_CONFIG.POOL_PARTICLES_MAX >= 200);
  assert.ok(SKIN_VFX_CONFIG.POOL_RINGS_MAX >= 16);

  assert.ok(SKIN_SUGGESTED_SOUNDS.MAGMA.catchEruption.length > 10);
  assert.ok(SKIN_SUGGESTED_SOUNDS.MILLIONAIRE.bite.toLowerCase().includes('registradora'));
  assert.ok(SKIN_SUGGESTED_SOUNDS.WIZARD.criticalSpell.length > 10);
});

test('SkinEffectsEngine triggers Magma eruption shake and upward launch transform', () => {
  const engine = new SkinEffectsEngine();
  const sampleFish = {
    uid: 'magma-fish-1',
    species: ALL_FISH.find((p) => p.rarity === 'Épica')!,
    sellValue: 180,
    caughtAt: Date.now(),
  };

  engine.update(0.016, makeState({ skin: 'suit_magma', phase: 'IDLE' }));
  engine.update(
    0.016,
    makeState({
      skin: 'suit_magma',
      phase: 'CAUGHT',
      caughtFish: sampleFish,
      revealElapsed: 0.1,
      inBuildup: false,
    })
  );

  // Screen shake activo tras Erupción Volcánica
  const shake = engine.getScreenShake();
  assert.ok(Math.abs(shake.x) <= SKIN_VFX_CONFIG.MAGMA.SHAKE_AMPLITUDE_PX);
  assert.ok(Math.abs(shake.y) <= SKIN_VFX_CONFIG.MAGMA.SHAKE_AMPLITUDE_PX);

  // Al inicio de la revelación, el pez sale disparado desde el hoyo del agua
  const xform = engine.getCatchVisualTransform(
    makeState({
      skin: 'suit_magma',
      phase: 'CAUGHT',
      caughtFish: sampleFish,
      revealElapsed: 0.08,
      inBuildup: false,
    })
  );
  assert.ok(xform.scale < 1);
  assert.ok(xform.offsetX !== 0);
});

test('SkinEffectsEngine keeps caught fish normal for Millionaire and applies spiral/dissolve transform for Wizard', () => {
  const engine = new SkinEffectsEngine();
  const rareFish = {
    uid: 'rare-fish-42',
    species: ALL_FISH.find((p) => p.rarity === 'Rara')!,
    sellValue: 45,
    caughtAt: Date.now(),
  };

  // La Millonaria mantiene el pez capturado con sus colores normales (sin tinte dorado)
  const milXform = engine.getCatchVisualTransform(
    makeState({
      skin: 'suit_millionaire',
      phase: 'CAUGHT',
      caughtFish: rareFish,
      revealElapsed: 0.5,
      inBuildup: false,
    })
  );
  assert.equal(milXform.goldOverlayAlpha, 0);

  // Mago gira el pez dentro de la esfera al emerger del portal y luego lo desintegra
  const wizEmerge = engine.getCatchVisualTransform(
    makeState({
      skin: 'suit_wizard',
      phase: 'CAUGHT',
      caughtFish: rareFish,
      revealElapsed: 0.2,
      inBuildup: false,
    })
  );
  assert.ok(wizEmerge.rotation > 0);

  const wizDissolve = engine.getCatchVisualTransform(
    makeState({
      skin: 'suit_wizard',
      phase: 'CAUGHT',
      caughtFish: rareFish,
      revealElapsed: SKIN_VFX_CONFIG.WIZARD.RECOMPOSE_START_SEC + 0.9,
      inBuildup: false,
    })
  );
  assert.ok(wizDissolve.alpha < 1);
});

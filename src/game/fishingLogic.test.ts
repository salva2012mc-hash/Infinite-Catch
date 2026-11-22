import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createInitialFishingState,
  triggerFishingAction,
  stepFishingState,
  TIMING,
  hasAccountProgress,
  resolveInitialTutorialStep,
} from './fishingLogic';

test('initial state starts in IDLE with 0 fish', () => {
  const state = createInitialFishingState();
  assert.equal(state.phase, 'IDLE');
  assert.equal(state.fishCount, 0);
});

test('triggerFishingAction casts from IDLE and transitions through CASTING -> WAITING -> BITING -> CAUGHT', () => {
  let state = createInitialFishingState();
  const castRes = triggerFishingAction(state, () => 0.5);
  assert.equal(castRes.event, 'cast');
  assert.equal(castRes.next.phase, 'CASTING');
  state = castRes.next;

  // Step past cast duration
  const waitRes = stepFishingState(state, TIMING.CAST_DURATION + 0.01);
  assert.equal(waitRes.next.phase, 'WAITING');
  state = waitRes.next;

  // Step past wait duration
  const biteRes = stepFishingState(state, state.waitDuration + 0.01);
  assert.equal(biteRes.event, 'bite_start');
  assert.equal(biteRes.next.phase, 'BITING');
  state = biteRes.next;

  // Catch the fish!
  const catchRes = triggerFishingAction(state);
  assert.equal(catchRes.event, 'catch');
  assert.equal(catchRes.next.phase, 'CAUGHT');
  assert.equal(catchRes.next.fishCount, 1);
});

test('missing the bite window transitions to MISSED without incrementing fishCount', () => {
  let state = createInitialFishingState();
  state = triggerFishingAction(state, () => 0).next;
  state = stepFishingState(state, TIMING.CAST_DURATION + 0.01).next;
  state = stepFishingState(state, state.waitDuration + 0.01).next;
  assert.equal(state.phase, 'BITING');

  const missRes = stepFishingState(state, TIMING.BITE_WINDOW + 0.01);
  assert.equal(missRes.event, 'bite_missed');
  assert.equal(missRes.next.phase, 'MISSED');
  assert.equal(missRes.next.fishCount, 0);
});

test('pulling early during WAITING returns to IDLE', () => {
  let state = createInitialFishingState();
  state = triggerFishingAction(state, () => 0).next;
  state = stepFishingState(state, TIMING.CAST_DURATION + 0.01).next;
  assert.equal(state.phase, 'WAITING');

  const earlyRes = triggerFishingAction(state);
  assert.equal(earlyRes.event, 'early_pull');
  assert.equal(earlyRes.next.phase, 'IDLE');
  assert.equal(earlyRes.next.fishCount, 0);
});

test('Caña OG reduces fishing wait time so cast + wait takes ~2 seconds', () => {
  const initial = createInitialFishingState();
  const normalMax = triggerFishingAction(initial, () => 1, { hasOgRod: false });
  const ogMax = triggerFishingAction(initial, () => 1, { hasOgRod: true });

  assert.ok(TIMING.CAST_DURATION + normalMax.next.waitDuration > 4.5);
  assert.ok(TIMING.CAST_DURATION + ogMax.next.waitDuration <= 2.01);
  assert.ok(TIMING.CAST_DURATION + ogMax.next.waitDuration >= 1.75);
});

test('tutorial stays active while account has 0 catches and stops forcing once >=1 catch exists', () => {
  // Brand new / freshly reset account with zero catches starts in tutorial
  assert.equal(
    hasAccountProgress({
      fishCount: 0,
      coins: 0,
      totalCoinsEarned: 0,
      playTimeSeconds: 0,
      discoveredFish: {},
      ownedCosmetics: [],
      inventoryLength: 0,
      catchHistoryLength: 0,
    }),
    false
  );
  assert.equal(
    resolveInitialTutorialStep({
      tutorialDoneFlag: false,
      legacyTutorialDoneFlag: false,
      accountProgress: { fishCount: 0, coins: 0, totalCoinsEarned: 0 },
    }),
    1
  );

  // Even with coins, playtime, or stale tutorial flags, 0 catches keeps tutorial active
  assert.equal(
    resolveInitialTutorialStep({
      tutorialDoneFlag: true,
      legacyTutorialDoneFlag: true,
      accountProgress: { fishCount: 0, coins: 250, playTimeSeconds: 180 },
    }),
    1
  );

  // Once the account has at least 1 catch, tutorial is not forced automatically
  assert.equal(
    resolveInitialTutorialStep({
      tutorialDoneFlag: false,
      legacyTutorialDoneFlag: false,
      accountProgress: { fishCount: 1, coins: 0, totalCoinsEarned: 0 },
    }),
    0
  );
  assert.equal(
    resolveInitialTutorialStep({
      tutorialDoneFlag: false,
      legacyTutorialDoneFlag: false,
      accountProgress: { fishCount: 12, coins: 150, totalCoinsEarned: 400 },
    }),
    0
  );
  assert.equal(
    resolveInitialTutorialStep({
      tutorialDoneFlag: false,
      legacyTutorialDoneFlag: false,
      accountProgress: { discoveredFish: { 10: 3 } },
    }),
    0
  );
  assert.equal(
    resolveInitialTutorialStep({
      tutorialDoneFlag: true,
      legacyTutorialDoneFlag: false,
      accountProgress: { fishCount: 1 },
    }),
    0
  );
});

test('Secreto Abisal minigame config sets precision bar to 10s hold and 22s limit (+2s duration)', async () => {
  const { getMinigameConfig } = await import('./FishingMinigame');
  const abisalConfig = getMinigameConfig('Secreto Abisal');
  const epicaConfig = getMinigameConfig('Épica');

  // Precision bar ("la raya"): target hold remains 10s (no extra required hold time)
  assert.equal(abisalConfig.barTargetSeconds, 10);
  assert.equal(epicaConfig.barTargetSeconds, 5);

  // Duration is +2s (22s instead of 20s)
  assert.equal(abisalConfig.barTotalLimit, 22);
  assert.equal(epicaConfig.barTotalLimit, 20);

  // Drops stage: Secreto Abisal has only 1 life (0 misses tolerated, like before)
  assert.equal(abisalConfig.maxMisses, 0);
  assert.equal(abisalConfig.targetDrops, 20);

  // Other rarities (Legendaria) retain miss tolerance
  const legConfig = getMinigameConfig('Legendaria');
  assert.equal(legConfig.maxMisses, 2);
});

test('minigame particle effect intensity scales strictly across fish rarities', async () => {
  const { getMinigameParticleConfig } = await import('./FishingMinigame');
  const order = [
    'Común',
    'Rara',
    'Épica',
    'Mítica',
    'Legendaria',
    'Secreto',
    'Secreto Abisal',
  ] as const;

  const configs = order.map((r) => getMinigameParticleConfig(r));
  for (let i = 1; i < configs.length; i++) {
    const prev = configs[i - 1];
    const curr = configs[i];
    assert.ok(curr.intensity > prev.intensity);
    assert.ok(curr.count > prev.count);
    assert.ok(curr.speed > prev.speed);
    assert.ok(curr.maxAlpha > prev.maxAlpha);
  }
  assert.equal(configs[0].twinkle, false);
  assert.equal(configs[configs.length - 1].twinkle, true);
});

test('wizard upward ray intensity scales strictly across all fish rarities', async () => {
  const { getWizardRayConfig } = await import('./IceFishingCanvas');
  const order = [
    'Común',
    'Rara',
    'Épica',
    'Mítica',
    'Legendaria',
    'Secreto',
    'Secreto Abisal',
  ] as const;

  const configs = order.map((r) => getWizardRayConfig(r));
  for (let i = 1; i < configs.length; i++) {
    const prev = configs[i - 1];
    const curr = configs[i];
    assert.ok(curr.intensity > prev.intensity);
    assert.ok(curr.heightRatio > prev.heightRatio);
    assert.ok(curr.beamWidth > prev.beamWidth);
    assert.ok(curr.boltCount > prev.boltCount);
    assert.ok(curr.sparkCount > prev.sparkCount);
    assert.ok(curr.skyGlowAlpha > prev.skyGlowAlpha);
  }
});

test('stripBackgroundFloodFill preserves silver bellies and dark volcanic bodies of Legendary+ fish', async () => {
  const { stripBackgroundFloodFill } = await import('./RealisticFishThumb');

  // 1. White-background image with a silver-bellied fish (like Salmón / Esturión beluga)
  // and dark edge pixels (like Corazón de Magma)
  const w = 5;
  const h = 5;
  const whiteBgData = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < w * h; i++) {
    whiteBgData[i * 4] = 255;
    whiteBgData[i * 4 + 1] = 255;
    whiteBgData[i * 4 + 2] = 255;
    whiteBgData[i * 4 + 3] = 255;
  }
  // Silver belly pixel adjacent to white background (RGB 225, 228, 232)
  const bellyIdx = (2 * w + 2) * 4;
  whiteBgData[bellyIdx] = 225;
  whiteBgData[bellyIdx + 1] = 228;
  whiteBgData[bellyIdx + 2] = 232;
  whiteBgData[bellyIdx + 3] = 255;

  // Dark magma rock touching top border (RGB 20, 15, 15)
  const topRockIdx = (0 * w + 2) * 4;
  whiteBgData[topRockIdx] = 20;
  whiteBgData[topRockIdx + 1] = 15;
  whiteBgData[topRockIdx + 2] = 15;
  whiteBgData[topRockIdx + 3] = 255;

  stripBackgroundFloodFill(
    { width: w, height: h, data: whiteBgData } as unknown as ImageData,
    18
  );

  // Corner white background is stripped
  assert.equal(whiteBgData[3], 0);
  // Silver belly and dark magma rock remain opaque (not cut off!)
  assert.equal(whiteBgData[bellyIdx + 3], 255);
  assert.equal(whiteBgData[topRockIdx + 3], 255);

  // 2. Black-background image with dark volcanic boar/scroll pixels (RGB 22, 18, 16)
  const blackBgData = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < w * h; i++) {
    blackBgData[i * 4] = 0;
    blackBgData[i * 4 + 1] = 0;
    blackBgData[i * 4 + 2] = 0;
    blackBgData[i * 4 + 3] = 255;
  }
  const boarIdx = (2 * w + 2) * 4;
  blackBgData[boarIdx] = 22;
  blackBgData[boarIdx + 1] = 18;
  blackBgData[boarIdx + 2] = 16;
  blackBgData[boarIdx + 3] = 255;

  stripBackgroundFloodFill(
    { width: w, height: h, data: blackBgData } as unknown as ImageData,
    114
  );

  assert.equal(blackBgData[3], 0);
  assert.equal(blackBgData[boarIdx + 3], 255);
});

test('stripBackgroundFloodFill removes checkerboard backgrounds from all 20 listed fish species', async () => {
  const { stripBackgroundFloodFill, CHECKERBOARD_FISH_IDS } = await import(
    './RealisticFishThumb'
  );

  // The 20 fish species requested by the user:
  const requestedFishIds = [
    1, // La carpa
    2, // El alburno
    21, // El gobio de río
    23, // La bermejuela
    24, // La madrilla
    25, // La sarda
    26, // La pardilla
    7, // La trucha
    8, // El barbo
    9, // El cacho
    10, // Piraña
    27, // Blenio de río
    29, // Colmilleja
    30, // El darso
    31, // Barbo colirrojo
    34, // La saboga
    35, // Lucio-perca
    33, // Sábalo
    36, // Black Bass pequeño
    14, // Boga
  ];

  for (const fishId of requestedFishIds) {
    assert.ok(
      CHECKERBOARD_FISH_IDS.has(fishId),
      `Expected fishId ${fishId} to be in CHECKERBOARD_FISH_IDS`
    );

    const w = 12;
    const h = 12;
    const data = new Uint8ClampedArray(w * h * 4);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = (y * w + x) * 4;
        // Alternating white (255), JPEG transition (222), and gray (194) checkerboard squares
        const isWhite = ((Math.floor(x / 3) + Math.floor(y / 3)) % 2) === 0;
        const isEdge = x % 3 === 2;
        const c = isEdge ? 222 : isWhite ? 255 : 194;
        data[idx] = c;
        data[idx + 1] = c;
        data[idx + 2] = c;
        data[idx + 3] = 255;
      }
    }

    // Center fish scale pixel (golden-brown warm scale RGB 165, 130, 80)
    const fishIdx = (6 * w + 6) * 4;
    data[fishIdx] = 165;
    data[fishIdx + 1] = 130;
    data[fishIdx + 2] = 80;
    data[fishIdx + 3] = 255;

    stripBackgroundFloodFill(
      { width: w, height: h, data } as unknown as ImageData,
      fishId
    );

    // Both white squares, gray squares, and intermediate transition pixels are transparent
    assert.equal(data[0 * 4 + 3], 0, `White square not stripped for fish ${fishId}`);
    assert.equal(data[2 * 4 + 3], 0, `Transition pixel not stripped for fish ${fishId}`);
    assert.equal(data[3 * 4 + 3], 0, `Gray square not stripped for fish ${fishId}`);
    // Fish body remains opaque
    assert.equal(data[fishIdx + 3], 255, `Fish body was stripped for fish ${fishId}`);
  }
});

test('stripBackgroundFloodFill removes 1-2px off-white halos and pre-transparent white rims while keeping silver bellies intact', async () => {
  const { stripBackgroundFloodFill } = await import('./RealisticFishThumb');

  // 1. High-res 64x64 off-white sprite (#ECEAE4) with a 1px compression halo (#DEDBD4)
  // around a colored dorsal fin (95, 75, 45) and an internal silver belly (225, 228, 232)
  const w = 64;
  const h = 64;
  const offWhite = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < w * h; i++) {
    offWhite[i * 4] = 236;
    offWhite[i * 4 + 1] = 234;
    offWhite[i * 4 + 2] = 228;
    offWhite[i * 4 + 3] = 255;
  }

  // Fish block x in [20..44], y in [20..44]:
  // Outer 1px halo ring: pale cream/gray (#E2DFD8 = 226, 223, 216)
  for (let y = 20; y <= 44; y++) {
    for (let x = 20; x <= 44; x++) {
      const idx = (y * w + x) * 4;
      const isOuterHalo = x === 20 || x === 44 || y === 20 || y === 44;
      if (isOuterHalo) {
        offWhite[idx] = 226;
        offWhite[idx + 1] = 223;
        offWhite[idx + 2] = 216;
      } else if (y >= 34 && y <= 40 && x >= 26 && x <= 38) {
        // Interior silver belly
        offWhite[idx] = 225;
        offWhite[idx + 1] = 228;
        offWhite[idx + 2] = 232;
      } else {
        // Colored dorsal/fin body
        offWhite[idx] = 95;
        offWhite[idx + 1] = 75;
        offWhite[idx + 2] = 45;
      }
      offWhite[idx + 3] = 255;
    }
  }

  stripBackgroundFloodFill(
    { width: w, height: h, data: offWhite } as unknown as ImageData,
    20
  );

  // Off-white background is stripped
  assert.equal(offWhite[3], 0);
  // 1px outer pale halo pixel at (32, 20) is either stripped or strongly unmixed away from chalky white
  const haloIdx = (20 * w + 32) * 4;
  assert.ok(
    offWhite[haloIdx + 3] === 0 || offWhite[haloIdx] < 160,
    `Expected outer pale halo to be stripped or decontaminated, got rgba(${offWhite[haloIdx]},${offWhite[haloIdx + 1]},${offWhite[haloIdx + 2]},${offWhite[haloIdx + 3]})`
  );
  // Interior fish body & silver belly remain solid opaque
  const interiorFinIdx = (26 * w + 32) * 4;
  const silverBellyIdx = (37 * w + 32) * 4;
  assert.equal(offWhite[interiorFinIdx + 3], 255);
  assert.equal(offWhite[silverBellyIdx + 3], 255);

  // 2. High-res 64x64 pre-transparent sprite with opaque white matte rim pixels (246, 246, 246)
  const preTrans = new Uint8ClampedArray(w * h * 4);
  for (let y = 20; y <= 44; y++) {
    for (let x = 20; x <= 44; x++) {
      const idx = (y * w + x) * 4;
      const isOuterRim = x === 20 || x === 44 || y === 20 || y === 44;
      if (isOuterRim) {
        preTrans[idx] = 246;
        preTrans[idx + 1] = 246;
        preTrans[idx + 2] = 246;
      } else {
        preTrans[idx] = 75;
        preTrans[idx + 1] = 55;
        preTrans[idx + 2] = 40;
      }
      preTrans[idx + 3] = 255;
    }
  }

  stripBackgroundFloodFill(
    { width: w, height: h, data: preTrans } as unknown as ImageData,
    11
  );

  // Opaque white rim pixel was stripped cleanly
  const rimIdx = (20 * w + 32) * 4;
  assert.equal(preTrans[rimIdx + 3], 0);
  // Fin body interior stayed opaque
  assert.equal(preTrans[(26 * w + 32) * 4 + 3], 255);
});

test('getMinigameTheme provides dark fight card themes and escalating tension across rarities', async () => {
  const { getMinigameTheme } = await import('./FishingMinigame');
  const order = [
    'Común',
    'Rara',
    'Épica',
    'Mítica',
    'Legendaria',
    'Secreto',
    'Secreto Abisal',
  ] as const;

  const themes = order.map((r) => getMinigameTheme(r));
  for (let i = 0; i < themes.length; i++) {
    assert.ok(themes[i].cardBackground.includes('linear-gradient'));
    assert.ok(themes[i].progressGradient.includes('linear-gradient'));
    assert.ok(themes[i].accentColor.startsWith('#'));
    if (i > 0) {
      assert.ok(themes[i].tensionIntensity > themes[i - 1].tensionIntensity);
    }
  }
});

test('getRarityFightProfile scales pull force, surges and strain cleanly across rarities', async () => {
  const { getRarityFightProfile } = await import('./fightPhysics');
  const common = getRarityFightProfile('Común');
  const epic = getRarityFightProfile('Épica');
  const abisal = getRarityFightProfile('Secreto Abisal');

  assert.ok(epic.pullBackSpeed > common.pullBackSpeed);
  assert.ok(abisal.pullBackSpeed > epic.pullBackSpeed);
  assert.ok(abisal.surgeForce > common.surgeForce);
  assert.ok(abisal.thrashFreq > common.thrashFreq);
  assert.ok(abisal.tensionStrainRate > common.tensionStrainRate);
});

test('stepFightBarDynamics handles safe reeling, top over-strain line snap, and slack fish escape', async () => {
  const { stepFightBarDynamics } = await import('./fightPhysics');

  // 1. Safe reeling inside green zone pulls fish closer and keeps tension healthy
  const safeRes = stepFightBarDynamics({
    tension: 0.55,
    distance: 0.6,
    inBox: true,
    holding: true,
    atTopCeiling: false,
    atBottomFloor: false,
    dt: 0.25,
    rarity: 'Rara',
    fishPulling: false,
  });
  assert.equal(safeRes.failed, 'none');
  assert.equal(safeRes.dangerType, 'safe');
  assert.ok(safeRes.distance < 0.6);

  // 2. Sustained over-strain at top ceiling outside green zone snaps the line
  let tension = 0.4;
  let distance = 0.35;
  let snapResult = stepFightBarDynamics({
    tension,
    distance,
    inBox: false,
    holding: true,
    atTopCeiling: true,
    atBottomFloor: false,
    dt: 0.1,
    rarity: 'Legendaria',
    fishPulling: true,
  });
  for (let i = 0; i < 30 && snapResult.failed === 'none'; i++) {
    tension = snapResult.tension;
    distance = snapResult.distance;
    snapResult = stepFightBarDynamics({
      tension,
      distance,
      inBox: false,
      holding: true,
      atTopCeiling: true,
      atBottomFloor: false,
      dt: 0.1,
      rarity: 'Legendaria',
      fishPulling: true,
    });
  }
  assert.equal(snapResult.failed, 'line_snapped');
  assert.equal(snapResult.tension, 1);

  // 3. Sustained slack at bottom floor outside green zone lets fish pull away and escape
  tension = 0.35;
  distance = 0.5;
  let escapeResult = stepFightBarDynamics({
    tension,
    distance,
    inBox: false,
    holding: false,
    atTopCeiling: false,
    atBottomFloor: true,
    dt: 0.2,
    rarity: 'Épica',
    fishPulling: true,
  });
  for (let i = 0; i < 40 && escapeResult.failed === 'none'; i++) {
    tension = escapeResult.tension;
    distance = escapeResult.distance;
    escapeResult = stepFightBarDynamics({
      tension,
      distance,
      inBox: false,
      holding: false,
      atTopCeiling: false,
      atBottomFloor: true,
      dt: 0.2,
      rarity: 'Épica',
      fishPulling: true,
    });
  }
  assert.equal(escapeResult.failed, 'fish_escaped');
  assert.equal(escapeResult.distance, 1);
});

test('getMinigameConfig scales duration and speed fairly based on fish weightFactor', async () => {
  const { getMinigameConfig } = await import('./FishingMinigame');

  const lightCommon = getMinigameConfig('Común', 0);
  const midCommon = getMinigameConfig('Común', 0.5);
  const heavyCommon = getMinigameConfig('Común', 1);

  assert.equal(lightCommon.clickDuration, 10);
  assert.equal(midCommon.clickDuration, 7.5);
  assert.equal(heavyCommon.clickDuration, 5);
  assert.ok(heavyCommon.clickDuration >= 4.5 && heavyCommon.clickDuration < lightCommon.clickDuration);

  const lightEpic = getMinigameConfig('Épica', 0);
  const heavyEpic = getMinigameConfig('Épica', 1);
  assert.ok(heavyEpic.barTotalLimit < lightEpic.barTotalLimit);
  assert.ok(heavyEpic.barTotalLimit >= 15);
  assert.ok(heavyEpic.barSpeedMultiplier > lightEpic.barSpeedMultiplier);
});

test('stepFightClickDynamics connects TENSION snap and ESC distance escape to player actions and weight', async () => {
  const { stepFightClickDynamics, getRarityFightProfile } = await import('./fightPhysics');

  // Heavy specimen increases pull force & strain compared to light specimen
  const lightProf = getRarityFightProfile('Común', 0);
  const heavyProf = getRarityFightProfile('Común', 1);
  assert.ok(heavyProf.pullBackSpeed > lightProf.pullBackSpeed);
  assert.ok(heavyProf.surgeForce > lightProf.surgeForce);

  // 1. Stopping / not pulling lets fish swim into ESC -> fish_escaped
  let tension = 0.3;
  let distance = 0.5;
  let idleRes = stepFightClickDynamics({
    tension,
    distance,
    fishPulling: true,
    didClick: false,
    dt: 0.25,
    rarity: 'Rara',
    weightFactor: 0.9,
  });
  for (let i = 0; i < 40 && idleRes.failed === 'none'; i++) {
    tension = idleRes.tension;
    distance = idleRes.distance;
    idleRes = stepFightClickDynamics({
      tension,
      distance,
      fishPulling: true,
      didClick: false,
      dt: 0.25,
      rarity: 'Rara',
      weightFactor: 0.9,
    });
  }
  assert.equal(idleRes.failed, 'fish_escaped');
  assert.equal(idleRes.distance, 1);

  // 2. Over-clicking furiously straight through a surge snaps the line -> line_snapped
  tension = 0.45;
  distance = 0.45;
  let spamRes = stepFightClickDynamics({
    tension,
    distance,
    fishPulling: true,
    didClick: true,
    dt: 0.05,
    rarity: 'Rara',
    weightFactor: 0.9,
  });
  for (let i = 0; i < 15 && spamRes.failed === 'none'; i++) {
    tension = spamRes.tension;
    distance = spamRes.distance;
    spamRes = stepFightClickDynamics({
      tension,
      distance,
      fishPulling: true,
      didClick: true,
      dt: 0.05,
      rarity: 'Rara',
      weightFactor: 0.9,
    });
  }
  assert.equal(spamRes.failed, 'line_snapped');
  assert.equal(spamRes.tension, 1);
});

test('stepFightClickDynamics allows fast normal & final-second clicking to complete cleanly without unfair line snaps', async () => {
  const { stepFightClickDynamics } = await import('./fightPhysics');

  // 20 fast clicks at ~4 clicks/sec (dt=0.25s between clicks) on heavy Rara fish outside surges
  let tension = 0.34;
  let distance = 0.44;
  for (let i = 0; i < 20; i++) {
    const res = stepFightClickDynamics({
      tension,
      distance,
      fishPulling: false,
      didClick: true,
      dt: 0.25,
      rarity: 'Rara',
      weightFactor: 1,
    });
    assert.equal(res.failed, 'none', `Click ${i + 1} should not unfairly fail`);
    tension = res.tension;
    distance = res.distance;
  }
  assert.ok(tension < 0.76, `Fast steady clicking tension (${tension}) should stay safe`);

  // Rapid final-seconds clicks (8 clicks in 1s during surge with urgentTime=true) do not unfairly snap
  let urgentTension = 0.62;
  let urgentDist = 0.5;
  for (let i = 0; i < 8; i++) {
    const res = stepFightClickDynamics({
      tension: urgentTension,
      distance: urgentDist,
      fishPulling: true,
      didClick: true,
      dt: 0.125,
      rarity: 'Común',
      weightFactor: 1,
      urgentTime: true,
    });
    assert.equal(res.failed, 'none', `Urgent click ${i + 1} should not unfairly snap`);
    urgentTension = res.tension;
    urgentDist = res.distance;
  }
});

test('Secreto Abisal Stage 1 (50 clicks) is winnable across all weights without unfair rod snapping', async () => {
  const { stepFightClickDynamics, getRarityFightProfile } = await import('./fightPhysics');
  const { getMinigameConfig } = await import('./FishingMinigame');

  for (const wf of [0, 0.5, 1]) {
    const cfg = getMinigameConfig('Secreto Abisal', wf);
    const profile = getRarityFightProfile('Secreto Abisal', wf);

    // 1. Steady realistic clicking (~4.5 clicks/sec) even without stopping during red surges
    let tension = 0.26 + wf * 0.08;
    let distance = 0.44;
    let clicks = 0;
    let elapsed = 0;
    let maxTensionSeen = 0;
    const dt = 1 / 60;
    let clickAcc = 0;
    const clicksPerSec = 4.5;

    while (clicks < cfg.targetClicks && elapsed < cfg.clickDuration) {
      elapsed += dt;
      const cyclePos = elapsed % profile.surgeInterval;
      const fishPulling = cyclePos >= profile.surgeInterval - profile.surgeDuration;

      const frameRes = stepFightClickDynamics({
        tension,
        distance,
        fishPulling,
        didClick: false,
        dt,
        rarity: 'Secreto Abisal',
        weightFactor: wf,
        urgentTime: cfg.clickDuration - elapsed <= 3.0,
      });
      assert.equal(
        frameRes.failed,
        'none',
        `Secreto Abisal (wf=${wf}) frame failed unexpectedly at t=${elapsed.toFixed(2)}s (${frameRes.failed})`
      );
      tension = frameRes.tension;
      distance = frameRes.distance;

      clickAcc += dt * clicksPerSec;
      while (clickAcc >= 1 && clicks < cfg.targetClicks) {
        clickAcc -= 1;
        const clickRes = stepFightClickDynamics({
          tension,
          distance,
          fishPulling,
          didClick: true,
          dt: 0,
          rarity: 'Secreto Abisal',
          weightFactor: wf,
          urgentTime: cfg.clickDuration - elapsed <= 3.0,
        });
        assert.equal(
          clickRes.failed,
          'none',
          `Secreto Abisal (wf=${wf}) click ${clicks + 1} unfairly failed (${clickRes.failed})`
        );
        tension = clickRes.tension;
        distance = clickRes.distance;
        maxTensionSeen = Math.max(maxTensionSeen, tension);
        clicks += 1;
      }
    }

    assert.equal(clicks, cfg.targetClicks, `Expected to complete 50 clicks for wf=${wf}`);
    assert.ok(elapsed < cfg.clickDuration, `Expected to finish before timer for wf=${wf}`);
    assert.ok(maxTensionSeen < 0.9, `Peak tension (${maxTensionSeen.toFixed(2)}) should leave safe headroom`);

    // 2. Stopping completely (AFK) still causes the Secreto Abisal to swim away and escape
    let afkTension = 0.34;
    let afkDist = 0.44;
    let afkFailed: string = 'none';
    for (let t = 0; t < 6 && afkFailed === 'none'; t += 0.1) {
      const cyclePos = t % profile.surgeInterval;
      const fishPulling = cyclePos >= profile.surgeInterval - profile.surgeDuration;
      const res = stepFightClickDynamics({
        tension: afkTension,
        distance: afkDist,
        fishPulling,
        didClick: false,
        dt: 0.1,
        rarity: 'Secreto Abisal',
        weightFactor: wf,
      });
      afkTension = res.tension;
      afkDist = res.distance;
      afkFailed = res.failed;
    }
    assert.equal(afkFailed, 'fish_escaped', `AFK on Secreto Abisal (wf=${wf}) must still let fish escape`);
  }
});

test('Secreto Abisal Stage 2 (bar) handles chasing and brief top-ceiling touches without unfair snaps', async () => {
  const { stepFightBarDynamics, getRarityFightProfile } = await import('./fightPhysics');
  const { getMinigameConfig } = await import('./FishingMinigame');

  const cfg = getMinigameConfig('Secreto Abisal', 1);
  const profile = getRarityFightProfile('Secreto Abisal', 1);

  assert.ok(cfg.clickDuration >= 19, 'Heavy Secreto Abisal click duration should give fair headroom');
  assert.ok(cfg.dropsDuration >= 22, 'Heavy Secreto Abisal drops duration should give fair headroom');

  // Chasing the box while holding during surges + brief 0.4s ceiling bump recovers cleanly
  let tension = 0.36;
  let distance = 0.38;
  for (let step = 0; step < 120; step++) {
    const t = step * 0.05;
    const cyclePos = t % profile.surgeInterval;
    const fishPulling = cyclePos >= profile.surgeInterval - profile.surgeDuration;
    const phase = step % 24;
    const inBox = phase < 14;
    const atTopCeiling = phase >= 14 && phase < 18; // 0.2s overshoot at ceiling
    const holding = inBox || atTopCeiling || phase < 21;

    const res = stepFightBarDynamics({
      tension,
      distance,
      inBox,
      holding,
      atTopCeiling,
      atBottomFloor: false,
      dt: 0.05,
      rarity: 'Secreto Abisal',
      fishPulling,
      weightFactor: 1,
    });
    assert.equal(
      res.failed,
      'none',
      `Secreto Abisal bar chase with brief ceiling overshoot should not fail at step ${step} (${res.failed})`
    );
    tension = res.tension;
    distance = res.distance;
  }
  assert.ok(tension < 0.85, `Bar tension (${tension.toFixed(2)}) should stay controllable`);
});

test('Legendaria, Secreto, and Secreto Abisal drops stage uses slightly smaller drops (42px) and longer vertical travel path', async () => {
  const { getMinigameConfig } = await import('./FishingMinigame');

  for (const rarity of ['Legendaria', 'Secreto', 'Secreto Abisal'] as const) {
    const cfg = getMinigameConfig(rarity, 0.5);
    // Slightly smaller than the old 48px (w-12 h-12) drops
    assert.equal(cfg.dropSizePx, 42);
    assert.ok(cfg.dropSizePx < 48 && cfg.dropSizePx >= 38);
    // Longer vertical travel range (-4% to 96% = 100% span, up from 0%..92%) in a taller 288px arena (up from 224px)
    assert.equal(cfg.dropStartY, -4);
    assert.equal(cfg.dropGroundY, 96);
    assert.equal(cfg.dropTravelSpanPct, 100);
    assert.equal(cfg.dropArenaHeightPx, 288);
    assert.ok(cfg.dropTravelSpanPct > 92);
    assert.ok(cfg.dropArenaHeightPx > 224);
  }
});


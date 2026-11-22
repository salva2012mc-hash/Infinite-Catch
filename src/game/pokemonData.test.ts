import test from 'node:test';
import assert from 'node:assert/strict';
import {
  rollPokemonCatch,
  LocalQuickSellMarket,
  RARITIES,
  COSMETICS_CATALOG,
  UNDERWORLD_POKEMON,
  KANTO_SNOW_POKEMON,
  getRarityProbabilitySummary,
  getSpeciesSellValue,
  calculateWeightedSellValue,
  getSpeciesWeightRange,
  rollFishWeightKg,
  getBestFishFromDiscovered,
  ALL_FISH,
  Rarity,
} from './pokemonData';
import { equipCosmeticWithRules } from './CosmeticVisuals';

test('rollPokemonCatch returns a valid Kanto Pokémon with bounded weight and weighted value', () => {
  const caught = rollPokemonCatch(() => 0.1);
  assert.ok(caught.species.name.length > 0);
  assert.equal(typeof caught.weightKg, 'number');
  const range = getSpeciesWeightRange(caught.species);
  assert.ok(caught.weightKg! >= range.minKg && caught.weightKg! <= range.maxKg);
  assert.equal(
    caught.sellValue,
    calculateWeightedSellValue(caught.species, caught.weightKg)
  );
});

test('rollPokemonCatch can roll Secreto Abisal at the extreme end of RNG', () => {
  const caught = rollPokemonCatch(() => 0.999999);
  assert.equal(caught.species.rarity, 'Secreto Abisal');
});

test('rollPokemonCatch in underworld rolls exclusive underworld species with expected odds', () => {
  const caughtCommon = rollPokemonCatch(() => 0.05, 'underworld');
  assert.equal(caughtCommon.species.name, 'Pez Demonio de Fuego');
  assert.equal(caughtCommon.species.rarity, 'Común');
  assert.equal(caughtCommon.species.oneIn, 4);

  const caughtAbisalMid = rollPokemonCatch(() => 0.999999, 'underworld', 1, 0.5);
  assert.equal(caughtAbisalMid.species.name, 'Jabalí de fuego');
  assert.equal(caughtAbisalMid.species.rarity, 'Secreto Abisal');
  assert.equal(caughtAbisalMid.species.oneIn, 58907);
  assert.equal(caughtAbisalMid.sellValue, 16500);

  const caughtAbisalLight = rollPokemonCatch(() => 0.999999, 'underworld', 1, 0);
  const caughtAbisalHeavy = rollPokemonCatch(() => 0.999999, 'underworld', 1, 1);
  assert.ok(caughtAbisalLight.sellValue < caughtAbisalMid.sellValue);
  assert.ok(caughtAbisalHeavy.sellValue > caughtAbisalMid.sellValue);

  const scroll = UNDERWORLD_POKEMON.find((p) => p.id === 113);
  assert.ok(scroll);
  assert.equal(getSpeciesSellValue(scroll), 3920);

  let call = 0;
  const seq = [0.985, 0.1, 0.25, 0.985, 0.1, 0.75];
  const skullRng = () => seq[call++ % seq.length];
  const skullA = rollPokemonCatch(skullRng, 'underworld');
  const skullB = rollPokemonCatch(skullRng, 'underworld');
  assert.equal(skullA.species.id, 103);
  assert.equal(skullB.species.id, 103);
  assert.notEqual(skullA.variantIndex, skullB.variantIndex);
  assert.ok(skullA.variantIndex !== undefined && skullA.variantIndex >= 0 && skullA.variantIndex < 10);
});

test('LocalQuickSellMarket calculates total quick-sell coins accurately', async () => {
  const p1 = rollPokemonCatch(() => 0.1);
  const p2 = rollPokemonCatch(() => 0.6);
  const total = await LocalQuickSellMarket.sellAll([p1, p2]);
  assert.equal(total, p1.sellValue + p2.sellValue);
});

test('COSMETICS_CATALOG includes beard_fisher, colored clothing, and orange Caña OG', () => {
  const beard = COSMETICS_CATALOG.find((c) => c.id === 'beard_fisher');
  assert.ok(beard);
  assert.equal(beard.slot, 'beard');
  assert.ok(beard.price > 0);

  const shirts = COSMETICS_CATALOG.filter((c) => c.id.startsWith('shirt_'));
  const pants = COSMETICS_CATALOG.filter((c) => c.id.startsWith('pants_'));
  assert.ok(shirts.length >= 7);
  assert.ok(pants.length >= 6);

  const carbonRod = COSMETICS_CATALOG.find((c) => c.id === 'rod_carbon');
  const goldRod = COSMETICS_CATALOG.find((c) => c.id === 'rod_gold');
  const ogRod = COSMETICS_CATALOG.find((c) => c.id === 'rod_og');
  assert.equal(carbonRod?.price, 1000);
  assert.equal(goldRod?.price, 5000);
  assert.ok(ogRod);
  assert.equal(ogRod.price, 0);
  assert.match(ogRod.description.toLowerCase(), /naranja/);
});

test('getRarityProbabilitySummary computes probability and description for rarities', () => {
  const commonInfo = getRarityProbabilitySummary('Común', KANTO_SNOW_POKEMON);
  const abisalInfo = getRarityProbabilitySummary('Secreto Abisal', UNDERWORLD_POKEMON);
  assert.match(commonInfo.pctLabel, /%$/);
  assert.ok(commonInfo.description.length > 0);
  assert.ok(abisalInfo.oneInLabel.includes('1 entre'));
  assert.ok(abisalInfo.fullText.includes('Secreto Abisal'));
});

test('rollPokemonCatch with luckMultiplier=2 boosts non-common catches and handles invalid luck safely', () => {
  // At 0.85 RNG roll, normal luck lands in Common/Rare boundary while 2x luck pushes further into rarer tiers
  const normal = rollPokemonCatch(() => 0.85, 'river', 1);
  const boosted = rollPokemonCatch(() => 0.85, 'river', 2);
  assert.equal(normal.species.rarity, 'Común');
  assert.notEqual(boosted.species.rarity, 'Común');

  // Across 100 uniform draws, luck x2 produces strictly more non-common catches than luck x1
  let nonCommonNormal = 0;
  let nonCommonBoosted = 0;
  for (let i = 0; i < 100; i++) {
    const u = (i + 0.5) / 100;
    if (rollPokemonCatch(() => u, 'river', 1).species.rarity !== 'Común') nonCommonNormal++;
    if (rollPokemonCatch(() => u, 'river', 2).species.rarity !== 'Común') nonCommonBoosted++;
  }
  assert.ok(nonCommonBoosted > nonCommonNormal);

  // Invalid / NaN luck safely falls back to 1x instead of breaking rolls
  const nanRoll = rollPokemonCatch(() => 0.999999, 'river', Number.NaN);
  assert.equal(nanRoll.species.rarity, 'Secreto Abisal');
});

test('getBestFishFromDiscovered returns highest-rarity and rarest species', () => {
  assert.equal(getBestFishFromDiscovered({}), null);
  const best1 = getBestFishFromDiscovered({ 1: 12, 11: 2, 18: 1 });
  assert.equal(best1?.id, 18); // Salmón (Legendaria, 1 entre 1575) > Trucha arcoíris (Épica) > Carpa (Común)
  const best2 = getBestFishFromDiscovered({ 18: 3, 20: 1, 50: 1 });
  assert.equal(best2?.id, 50); // Monstruo del lago (Secreto Abisal, 1 entre 150000) > Esturión (137500)
});

test('COSMETICS_CATALOG includes Millionaire (50k), Magma (75k), Wizard (100k) suits and expanded clothes within cloud limit', () => {
  const millionaire = COSMETICS_CATALOG.find((c) => c.id === 'suit_millionaire');
  const magma = COSMETICS_CATALOG.find((c) => c.id === 'suit_magma');
  const wizard = COSMETICS_CATALOG.find((c) => c.id === 'suit_wizard');

  assert.equal(millionaire?.price, 50000);
  assert.equal(millionaire?.slot, 'suit');
  assert.equal(magma?.price, 75000);
  assert.equal(magma?.slot, 'suit');
  assert.equal(wizard?.price, 100000);
  assert.equal(wizard?.slot, 'suit');
  assert.ok(COSMETICS_CATALOG.length <= 50, 'Must remain <= 50 for Firestore rules');
  assert.ok(COSMETICS_CATALOG.length >= 38);
});

test('ALL_FISH sell prices scale monotonically by rarity and odds with a strict 25k max cap', () => {
  const order: Rarity[] = [
    'Común',
    'Rara',
    'Épica',
    'Mítica',
    'Legendaria',
    'Secreto',
    'Secreto Abisal',
  ];

  let prevTierMax = 0;
  for (const rarity of order) {
    const group = ALL_FISH.filter((f) => f.rarity === rarity).sort(
      (a, b) => a.oneIn - b.oneIn
    );
    assert.ok(group.length > 0, `Expected fish in rarity ${rarity}`);
    const minVal = Math.min(...group.map(getSpeciesSellValue));
    assert.ok(
      minVal > prevTierMax,
      `Rarity ${rarity} min (${minVal}) must exceed previous tier max (${prevTierMax})`
    );
    for (let i = 1; i < group.length; i++) {
      const a = group[i - 1];
      const b = group[i];
      if (b.oneIn > a.oneIn) {
        assert.ok(
          getSpeciesSellValue(b) > getSpeciesSellValue(a),
          `${b.name} (1/${b.oneIn}=${getSpeciesSellValue(b)}) should pay more than ${a.name} (1/${a.oneIn}=${getSpeciesSellValue(a)})`
        );
      } else {
        assert.equal(getSpeciesSellValue(b), getSpeciesSellValue(a));
      }
    }
    prevTierMax = Math.max(...group.map(getSpeciesSellValue));
  }

  assert.ok(prevTierMax <= 25000, `Max fish price ${prevTierMax} must not exceed 25000`);
  assert.equal(prevTierMax, 25000);
});

test('equipCosmeticWithRules replaces conflicting clothes with full suits while preserving rods', () => {
  const afterWizard = equipCosmeticWithRules(['shirt_blue', 'hat_red', 'rod_og'], 'suit_wizard');
  assert.deepEqual(afterWizard.sort(), ['rod_og', 'suit_wizard'].sort());

  const afterMagma = equipCosmeticWithRules(afterWizard, 'suit_magma');
  assert.deepEqual(afterMagma.sort(), ['rod_og', 'suit_magma'].sort());

  const afterShirt = equipCosmeticWithRules(afterMagma, 'shirt_cyan');
  assert.deepEqual(afterShirt.sort(), ['rod_og', 'shirt_cyan'].sort());
});

test('ALL_FISH have realistic bounded weight ranges and weight monotonically scales coin sell values', () => {
  for (const species of ALL_FISH) {
    const { minKg, maxKg } = getSpeciesWeightRange(species);
    assert.ok(minKg > 0, `${species.name} minKg must be positive`);
    assert.ok(maxKg > minKg, `${species.name} maxKg must exceed minKg`);
    assert.ok(maxKg <= 350, `${species.name} maxKg (${maxKg}) must stay realistic`);

    const wMin = rollFishWeightKg(species, 0);
    const wMid = rollFishWeightKg(species, 0.5);
    const wMax = rollFishWeightKg(species, 1);

    assert.ok(wMin >= minKg && wMin <= maxKg);
    assert.ok(wMid >= minKg && wMid <= maxKg);
    assert.ok(wMax >= minKg && wMax <= maxKg);
    assert.ok(wMin < wMid && wMid < wMax);

    const vMin = calculateWeightedSellValue(species, wMin);
    const vMid = calculateWeightedSellValue(species, wMid);
    const vMax = calculateWeightedSellValue(species, wMax);
    const baseVal = getSpeciesSellValue(species);

    assert.ok(
      Math.abs(vMid - baseVal) <= Math.max(1, Math.round(baseVal * 0.05)),
      `${species.name} median weight (${wMid}kg -> ${vMid}) should closely match base sell value (${baseVal})`
    );
    assert.ok(vMin <= vMid && vMid <= vMax);
    assert.ok(vMax > vMin, `${species.name} max weight (${vMax}) should pay more than min weight (${vMin})`);
  }
});

test('max fish weight record helpers keep only the heaviest weight per species', async () => {
  const {
    updateMaxFishWeightRecord,
    sanitizeMaxFishWeights,
    mergeMaxFishWeightRecords,
  } = await import('./pokemonData');

  let records: Record<number, number> = {};
  records = updateMaxFishWeightRecord(records, 1, 2.45);
  assert.equal(records[1], 2.45);

  // Lighter catch does not overwrite the record
  const afterLighter = updateMaxFishWeightRecord(records, 1, 1.9);
  assert.equal(afterLighter, records);
  assert.equal(afterLighter[1], 2.45);

  // Heavier catch updates the record
  const afterHeavier = updateMaxFishWeightRecord(afterLighter, 1, 3.824);
  assert.equal(afterHeavier[1], 3.82);

  // Sanitizing & merging preserves highest valid weight per species
  const clean = sanitizeMaxFishWeights({ '1': 2.1, '7': 5.5, bad: -3, '0': 10 });
  assert.deepEqual(clean, { 1: 2.1, 7: 5.5 });

  const merged = mergeMaxFishWeightRecords(clean, afterHeavier);
  assert.deepEqual(merged, { 1: 3.82, 7: 5.5 });
});

test('5x, 7.5x, and 15x luck give literally L times higher probability for valuable non-common tiers and multiply stacked sources', async () => {
  const {
    getEffectiveSpeciesProbabilities,
    calculateCombinedLuckMultiplier,
  } = await import('./pokemonData');

  const baseRiverProbs = getEffectiveSpeciesProbabilities(KANTO_SNOW_POKEMON, 1);
  const luck3RiverProbs = getEffectiveSpeciesProbabilities(KANTO_SNOW_POKEMON, 3);
  const luck5RiverProbs = getEffectiveSpeciesProbabilities(KANTO_SNOW_POKEMON, 5);

  const total1 = Array.from(baseRiverProbs.values()).reduce((a, b) => a + b, 0);
  const total5 = Array.from(luck5RiverProbs.values()).reduce((a, b) => a + b, 0);
  assert.ok(Math.abs(total1 - 1) < 1e-9);
  assert.ok(Math.abs(total5 - 1) < 1e-9);

  // At 3x luck (Korean worm), every single non-common tier including Rara through Secreto Abisal gets exact 3.0x probability
  for (const fish of KANTO_SNOW_POKEMON) {
    const p1 = baseRiverProbs.get(fish.id) ?? 0;
    const p3 = luck3RiverProbs.get(fish.id) ?? 0;
    if (fish.rarity !== 'Común') {
      assert.ok(
        Math.abs(p3 / p1 - 3) < 1e-9,
        `Expected ${fish.name} (${fish.rarity}) at 3x luck to have 3.0x probability, got ${p3 / p1}`
      );
    }
  }

  // At 5x luck, every Épica, Mítica, Legendaria, Secreto, and Secreto Abisal species gets literally 5.0x probability,
  // and Rara expands to fill the remaining non-common budget (~4.41x) while Común drops to 0.
  for (const fish of KANTO_SNOW_POKEMON) {
    const p1 = baseRiverProbs.get(fish.id) ?? 0;
    const p5 = luck5RiverProbs.get(fish.id) ?? 0;
    if (
      fish.rarity === 'Épica' ||
      fish.rarity === 'Mítica' ||
      fish.rarity === 'Legendaria' ||
      fish.rarity === 'Secreto' ||
      fish.rarity === 'Secreto Abisal'
    ) {
      assert.ok(
        Math.abs(p5 / p1 - 5) < 1e-9,
        `Expected ${fish.name} (${fish.rarity}) at 5x luck to have 5.0x probability, got ${p5 / p1}`
      );
    } else if (fish.rarity === 'Rara') {
      assert.ok(p5 / p1 > 4.4, `Expected Rara ${fish.name} to be boosted >4.4x at 5x luck`);
    }
  }

  // Verify Underworld at 5x luck gives exact 5.0x probability for Épica, Mítica, Legendaria, Secreto, Secreto Abisal
  const baseUwProbs = getEffectiveSpeciesProbabilities(UNDERWORLD_POKEMON, 1);
  const luck5UwProbs = getEffectiveSpeciesProbabilities(UNDERWORLD_POKEMON, 5);
  for (const fish of UNDERWORLD_POKEMON) {
    const p1 = baseUwProbs.get(fish.id) ?? 0;
    const p5 = luck5UwProbs.get(fish.id) ?? 0;
    if (
      fish.rarity === 'Épica' ||
      fish.rarity === 'Mítica' ||
      fish.rarity === 'Legendaria' ||
      fish.rarity === 'Secreto' ||
      fish.rarity === 'Secreto Abisal'
    ) {
      assert.ok(
        Math.abs(p5 / p1 - 5) < 1e-9,
        `Expected Underworld ${fish.name} (${fish.rarity}) at 5x luck to have 5.0x probability, got ${p5 / p1}`
      );
    }
  }

  // Verify stacked luck sources multiply: 5x worm * 1.5x golden rod = 7.5x; with 2x timed boost = 15x
  assert.equal(
    calculateCombinedLuckMultiplier({ wormLuck: 5, rodLuck: 1.5 }),
    7.5
  );
  assert.equal(
    calculateCombinedLuckMultiplier({ wormLuck: 5, rodLuck: 1.5, timedLuck: 2 }),
    15
  );

  // At 7.5x and 15x in River, Épica, Mítica, Legendaria, Secreto, Secreto Abisal get exact 7.5x and 15.0x probability
  const luck75RiverProbs = getEffectiveSpeciesProbabilities(KANTO_SNOW_POKEMON, 7.5);
  const luck15RiverProbs = getEffectiveSpeciesProbabilities(KANTO_SNOW_POKEMON, 15);
  for (const fish of KANTO_SNOW_POKEMON) {
    if (
      fish.rarity === 'Épica' ||
      fish.rarity === 'Mítica' ||
      fish.rarity === 'Legendaria' ||
      fish.rarity === 'Secreto' ||
      fish.rarity === 'Secreto Abisal'
    ) {
      const p1 = baseRiverProbs.get(fish.id) ?? 0;
      const p75 = luck75RiverProbs.get(fish.id) ?? 0;
      const p15 = luck15RiverProbs.get(fish.id) ?? 0;
      assert.ok(
        Math.abs(p75 / p1 - 7.5) < 1e-9,
        `Expected ${fish.name} at 7.5x luck to have 7.5x probability, got ${p75 / p1}`
      );
      assert.ok(
        Math.abs(p15 / p1 - 15) < 1e-9,
        `Expected ${fish.name} (${fish.rarity}) at 15x luck to have exact 15.0x probability, got ${p15 / p1}`
      );
    }
  }
});

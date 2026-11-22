import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ALL_FISH,
  KANTO_SNOW_POKEMON,
  calculateWeightedSellValue,
  getSpeciesWeightRange,
} from './pokemonData';
import {
  BASE_XP_BY_RARITY,
  applyXpGain,
  calculateCatchXp,
  getLevelProgressFromTotalXp,
  getTotalXpForLevel,
  getXpRequiredForLevel,
  sanitizeLevelAndXp,
} from './levelSystem';

test('level XP curve starts at 100 XP and increases strictly across levels', () => {
  assert.equal(getXpRequiredForLevel(1), 100);
  let prev = getXpRequiredForLevel(1);
  for (let lvl = 2; lvl <= 50; lvl++) {
    const next = getXpRequiredForLevel(lvl);
    assert.ok(next > prev, `Expected Lv ${lvl} (${next}) > Lv ${lvl - 1} (${prev})`);
    prev = next;
  }
});

test('getLevelProgressFromTotalXp handles level boundaries accurately', () => {
  const start = getLevelProgressFromTotalXp(0);
  assert.equal(start.level, 1);
  assert.equal(start.currentLevelXp, 0);
  assert.equal(start.xpForNextLevel, 100);
  assert.equal(start.progressRatio, 0);

  const justBeforeLv2 = getLevelProgressFromTotalXp(99);
  assert.equal(justBeforeLv2.level, 1);
  assert.equal(justBeforeLv2.currentLevelXp, 99);

  const exactLv2 = getLevelProgressFromTotalXp(100);
  assert.equal(exactLv2.level, 2);
  assert.equal(exactLv2.currentLevelXp, 0);
  assert.equal(exactLv2.xpForNextLevel, getXpRequiredForLevel(2));

  const lv5Total = getTotalXpForLevel(5);
  const atLv5 = getLevelProgressFromTotalXp(lv5Total + 35);
  assert.equal(atLv5.level, 5);
  assert.equal(atLv5.currentLevelXp, 35);
});

test('fish weight increases both coins and XP monotonically across every species', () => {
  for (const species of ALL_FISH) {
    const { minKg, maxKg } = getSpeciesWeightRange(species);
    const midKg = (minKg + maxKg) / 2;

    const minXp = calculateCatchXp(species, minKg);
    const midXp = calculateCatchXp(species, midKg);
    const maxXp = calculateCatchXp(species, maxKg);

    const minCoins = calculateWeightedSellValue(species, minKg);
    const midCoins = calculateWeightedSellValue(species, midKg);
    const maxCoins = calculateWeightedSellValue(species, maxKg);

    assert.ok(
      minXp < midXp && midXp < maxXp,
      `Expected XP to grow with weight for ${species.name}: ${minXp} < ${midXp} < ${maxXp}`
    );
    assert.ok(
      minCoins <= midCoins && midCoins <= maxCoins && minCoins < maxCoins,
      `Expected coins to grow with weight for ${species.name}: ${minCoins}..${midCoins}..${maxCoins}`
    );
  }
});

test('XP scales strictly across fish rarities at median weight', () => {
  const order = [
    'Común',
    'Rara',
    'Épica',
    'Mítica',
    'Legendaria',
    'Secreto',
    'Secreto Abisal',
  ] as const;

  let prevXp = 0;
  for (const rarity of order) {
    const species = KANTO_SNOW_POKEMON.find((p) => p.rarity === rarity);
    assert.ok(species, `Expected at least one species for rarity ${rarity}`);
    const { minKg, maxKg } = getSpeciesWeightRange(species);
    const xp = calculateCatchXp(species, (minKg + maxKg) / 2);
    assert.equal(xp, BASE_XP_BY_RARITY[rarity]);
    assert.ok(xp > prevXp, `Expected ${rarity} XP (${xp}) > previous (${prevXp})`);
    prevXp = xp;
  }
});

test('applyXpGain detects single and multi-level level-ups cleanly', () => {
  // No level-up
  const small = applyXpGain(20, 30);
  assert.equal(small.leveledUp, false);
  assert.equal(small.levelsGained, 0);
  assert.equal(small.newLevel, 1);
  assert.equal(small.progress.currentLevelXp, 50);

  // Single level-up with carryover
  const single = applyXpGain(85, 35);
  assert.equal(single.leveledUp, true);
  assert.equal(single.previousLevel, 1);
  assert.equal(single.newLevel, 2);
  assert.equal(single.levelsGained, 1);
  assert.equal(single.progress.currentLevelXp, 20);

  // Multi-level jump (e.g. catching a heavy Secreto Abisal at Level 1)
  const huge = applyXpGain(0, 1800);
  assert.equal(huge.leveledUp, true);
  assert.ok(huge.newLevel >= 6, `Expected multi-level jump from 1800 XP, got Lv ${huge.newLevel}`);
  assert.equal(huge.levelsGained, huge.newLevel - 1);
  assert.equal(huge.progress.totalXp, 1800);
});

test('sanitizeLevelAndXp handles missing, invalid, and legacy level/xp inputs safely', () => {
  assert.deepEqual(sanitizeLevelAndXp(undefined, undefined, undefined), {
    level: 1,
    xp: 0,
    totalXp: 0,
  });

  assert.deepEqual(sanitizeLevelAndXp(-5, -20, -100), {
    level: 1,
    xp: 0,
    totalXp: 0,
  });

  // Canonical totalXp takes precedence
  const fromTotal = sanitizeLevelAndXp(1, 0, 125);
  assert.equal(fromTotal.level, 2);
  assert.equal(fromTotal.xp, 25);
  assert.equal(fromTotal.totalXp, 125);

  // Fallback to (level, xp) when totalXp is absent
  const fromPair = sanitizeLevelAndXp(3, 40, undefined);
  assert.equal(fromPair.level, 3);
  assert.equal(fromPair.xp, 40);
  assert.equal(fromPair.totalXp, getTotalXpForLevel(3) + 40);
});

test('REWARD_ROAD_MILESTONES covers Levels 1 to 20 in strict progressive order with Level 10 Underworld unlock', async () => {
  const {
    REWARD_ROAD_MAX_LEVEL,
    REWARD_ROAD_MILESTONES,
    getRewardRoadStatus,
    getUnclaimedRewardRoadCount,
    claimLevelReward,
    sanitizeClaimedLevelRewards,
  } = await import('./levelSystem');

  assert.equal(REWARD_ROAD_MAX_LEVEL, 20);
  assert.equal(REWARD_ROAD_MILESTONES.length, 20);
  assert.equal(REWARD_ROAD_MILESTONES[0].level, 1);
  assert.equal(REWARD_ROAD_MILESTONES[19].level, 20);

  let prevCoins = 0;
  for (let i = 0; i < REWARD_ROAD_MILESTONES.length; i++) {
    const m = REWARD_ROAD_MILESTONES[i];
    assert.equal(m.level, i + 1, `Expected milestone index ${i} to be level ${i + 1}`);
    assert.ok(m.coins > prevCoins, `Expected milestone level ${m.level} coins (${m.coins}) > previous (${prevCoins})`);
    prevCoins = m.coins;
    assert.ok(m.titleEs.length > 0 && m.titleEn.length > 0);
  }

  // Level 10 specifically unlocks the Mini Demon / Underworld access
  const lv10 = REWARD_ROAD_MILESTONES.find((m) => m.level === 10);
  assert.ok(lv10);
  assert.equal(lv10.unlocksUnderworld, true);
  assert.equal(lv10.kind, 'underworld_unlock');

  // At level 3 with nothing claimed: levels 1, 2, 3 are claimable; level 4..20 are locked
  let claimed = sanitizeClaimedLevelRewards(undefined);
  assert.equal(getRewardRoadStatus(1, 3, claimed), 'claimable');
  assert.equal(getRewardRoadStatus(3, 3, claimed), 'claimable');
  assert.equal(getRewardRoadStatus(4, 3, claimed), 'locked');
  assert.equal(getRewardRoadStatus(20, 3, claimed), 'locked');
  assert.equal(getUnclaimedRewardRoadCount(3, claimed), 3);

  // Claiming level 1 succeeds and marks it claimed
  const claim1 = claimLevelReward(1, 3, claimed);
  assert.equal(claim1.success, true);
  assert.equal(claim1.entry?.level, 1);
  claimed = claim1.nextClaimed;
  assert.equal(getRewardRoadStatus(1, 3, claimed), 'claimed');
  assert.equal(getUnclaimedRewardRoadCount(3, claimed), 2);

  // Re-claiming level 1 or claiming locked level 4 fails safely
  const duplicateClaim = claimLevelReward(1, 3, claimed);
  assert.equal(duplicateClaim.success, false);
  const lockedClaim = claimLevelReward(4, 3, claimed);
  assert.equal(lockedClaim.success, false);

  // Verify specific worm milestones at Levels 3, 6, 9, 12, 16, 19
  const lv3 = REWARD_ROAD_MILESTONES.find((m) => m.level === 3);
  const lv6 = REWARD_ROAD_MILESTONES.find((m) => m.level === 6);
  const lv9 = REWARD_ROAD_MILESTONES.find((m) => m.level === 9);
  const lv12 = REWARD_ROAD_MILESTONES.find((m) => m.level === 12);
  const lv16 = REWARD_ROAD_MILESTONES.find((m) => m.level === 16);
  const lv19 = REWARD_ROAD_MILESTONES.find((m) => m.level === 19);

  assert.equal(lv3?.baitId, 'worm_harbor');
  assert.equal(lv6?.baitId, 'worm_harbor');
  assert.equal(lv9?.baitId, 'worm_korean');
  assert.equal(lv9?.baitCount, 2);
  assert.equal(lv12?.baitId, 'worm_korean');
  assert.equal(lv16?.baitId, 'worm_luck5');
  assert.equal(lv19?.baitId, 'worm_luck5');
});

test('WORM_BAIT_CATALOG and consumeWormCastCharge apply luck/speed and consume 1-cast and 5-cast worms accurately', async () => {
  const {
    WORM_BAIT_CATALOG,
    consumeWormCastCharge,
    sanitizeBaitInventory,
  } = await import('./levelSystem');

  assert.equal(WORM_BAIT_CATALOG.length, 3);
  const harbor = WORM_BAIT_CATALOG.find((w) => w.id === 'worm_harbor');
  const korean = WORM_BAIT_CATALOG.find((w) => w.id === 'worm_korean');
  const luck5 = WORM_BAIT_CATALOG.find((w) => w.id === 'worm_luck5');

  assert.equal(harbor?.price, 250);
  assert.equal(harbor?.luckMultiplier, 2);
  assert.equal(harbor?.speedMultiplier, 1);
  assert.equal(harbor?.castsPerUnit, 1);

  assert.equal(korean?.price, 500);
  assert.equal(korean?.luckMultiplier, 2);
  assert.equal(korean?.speedMultiplier, 2);
  assert.equal(korean?.castsPerUnit, 5);

  assert.equal(luck5?.price, 1000);
  assert.equal(luck5?.luckMultiplier, 5);
  assert.equal(luck5?.speedMultiplier, 1);
  assert.equal(luck5?.castsPerUnit, 1);

  // 1) Harbor Worm (1 cast per unit): 1 unit -> consumed in 1 cast and auto-unequips when empty
  let inv = sanitizeBaitInventory({ worm_harbor: 1, worm_korean: 1, worm_luck5: 1 });
  const harborCast = consumeWormCastCharge({
    inventory: inv,
    equippedBaitId: 'worm_harbor',
    activeCharges: 0,
  });
  assert.equal(harborCast.appliedBait?.id, 'worm_harbor');
  assert.equal(harborCast.nextInventory.worm_harbor, 0);
  assert.equal(harborCast.nextActiveCharges, 0);
  assert.equal(harborCast.nextEquippedBaitId, null);

  // 2) Korean Worm (5 casts per unit): 1 unit lasts for exactly 5 casts
  inv = harborCast.nextInventory;
  let activeCharges = 0;
  let equipped: 'worm_harbor' | 'worm_korean' | 'worm_luck5' | null = 'worm_korean';
  for (let castIdx = 1; castIdx <= 5; castIdx++) {
    const res = consumeWormCastCharge({
      inventory: inv,
      equippedBaitId: equipped,
      activeCharges,
    });
    assert.equal(res.appliedBait?.id, 'worm_korean');
    assert.equal(res.appliedBait?.luckMultiplier, 2);
    assert.equal(res.appliedBait?.speedMultiplier, 2);
    assert.equal(res.nextInventory.worm_korean, 0);
    assert.equal(res.nextActiveCharges, 5 - castIdx);
    inv = res.nextInventory;
    activeCharges = res.nextActiveCharges;
    equipped = res.nextEquippedBaitId;
  }
  assert.equal(activeCharges, 0);
  assert.equal(equipped, null);
});


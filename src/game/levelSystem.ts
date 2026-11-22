import {
  PokemonSpecies,
  Rarity,
  getSpeciesWeightFactor,
} from './pokemonData';

export const BASE_XP_BY_RARITY: Record<Rarity, number> = {
  Común: 18,
  Rara: 35,
  Épica: 75,
  Mítica: 150,
  Legendaria: 320,
  Secreto: 650,
  'Secreto Abisal': 1500,
};

export const MAX_PLAYER_LEVEL = 10000;
export const MAX_TOTAL_XP = 1_000_000_000;

export interface LevelProgress {
  level: number;
  totalXp: number;
  currentLevelXp: number;
  xpForNextLevel: number;
  progressRatio: number; // 0..1
}

export interface XpGainResult {
  previousLevel: number;
  newLevel: number;
  leveledUp: boolean;
  levelsGained: number;
  xpGained: number;
  progress: LevelProgress;
}

/**
 * XP required to advance from `level` to `level + 1`.
 * Balanced curve rounded to clean multiples of 10:
 * Lv1->2: 100, Lv2->3: 160, Lv3->4: 240, Lv4->5: 330, Lv5->6: 420, Lv10->11: 990...
 */
export function getXpRequiredForLevel(level: number): number {
  const safeLevel = Math.max(1, Math.min(MAX_PLAYER_LEVEL, Math.floor(level) || 1));
  const offset = safeLevel - 1;
  const raw = 100 + offset * 45 + Math.pow(offset, 1.5) * 18;
  return Math.max(100, Math.round(raw / 10) * 10);
}

/**
 * Cumulative total XP required to reach the start of `level` (Level 1 = 0 XP).
 */
export function getTotalXpForLevel(level: number): number {
  const safeLevel = Math.max(1, Math.min(MAX_PLAYER_LEVEL, Math.floor(level) || 1));
  let total = 0;
  for (let l = 1; l < safeLevel; l++) {
    total += getXpRequiredForLevel(l);
  }
  return total;
}

/**
 * Converts cumulative `totalXp` into current level, current XP inside that level,
 * XP needed for the next level, and normalized progress [0..1].
 */
export function getLevelProgressFromTotalXp(totalXp: number): LevelProgress {
  const safeTotalXp = Number.isFinite(totalXp)
    ? Math.max(0, Math.min(MAX_TOTAL_XP, Math.floor(totalXp)))
    : 0;

  let level = 1;
  let remaining = safeTotalXp;
  let needed = getXpRequiredForLevel(level);

  while (remaining >= needed && level < MAX_PLAYER_LEVEL) {
    remaining -= needed;
    level += 1;
    needed = getXpRequiredForLevel(level);
  }

  const progressRatio =
    needed > 0 ? Math.max(0, Math.min(1, remaining / needed)) : 1;

  return {
    level,
    totalXp: safeTotalXp,
    currentLevelXp: remaining,
    xpForNextLevel: needed,
    progressRatio,
  };
}

/**
 * Weight XP multiplier within a species' [minKg, maxKg] range:
 * 0.80x at min weight -> 1.00x at median -> 1.45x at trophy max weight.
 */
export function getWeightXpMultiplier(weightFactor: number): number {
  const wf = Number.isFinite(weightFactor)
    ? Math.max(0, Math.min(1, weightFactor))
    : 0.5;
  return wf <= 0.5 ? 0.8 + wf * 0.4 : 1.0 + (wf - 0.5) * 0.9;
}

/**
 * Calculates XP awarded for catching a fish based on species rarity and weight.
 */
export function calculateCatchXp(
  species: PokemonSpecies,
  weightKg?: number
): number {
  const baseXp = BASE_XP_BY_RARITY[species.rarity] ?? 18;
  const weightFactor = getSpeciesWeightFactor(species, weightKg);
  const multiplier = getWeightXpMultiplier(weightFactor);
  return Math.max(1, Math.round(baseXp * multiplier));
}

/**
 * Applies an XP gain to `currentTotalXp` and reports level-up details.
 */
export function applyXpGain(
  currentTotalXp: number,
  xpGained: number
): XpGainResult {
  const safeGain = Number.isFinite(xpGained) ? Math.max(0, Math.round(xpGained)) : 0;
  const before = getLevelProgressFromTotalXp(currentTotalXp);
  const after = getLevelProgressFromTotalXp(before.totalXp + safeGain);
  const levelsGained = Math.max(0, after.level - before.level);

  return {
    previousLevel: before.level,
    newLevel: after.level,
    leveledUp: levelsGained > 0,
    levelsGained,
    xpGained: safeGain,
    progress: after,
  };
}

/**
 * Sanitizes persisted level / xp / totalXp values from localStorage or Firestore.
 * Uses `totalXp` as canonical truth when present; falls back to `(level, xp)` otherwise.
 */
export function sanitizeLevelAndXp(
  rawLevel?: unknown,
  rawXp?: unknown,
  rawTotalXp?: unknown
): { level: number; xp: number; totalXp: number } {
  if (
    typeof rawTotalXp === 'number' &&
    Number.isFinite(rawTotalXp) &&
    rawTotalXp >= 0
  ) {
    const prog = getLevelProgressFromTotalXp(rawTotalXp);
    return {
      level: prog.level,
      xp: prog.currentLevelXp,
      totalXp: prog.totalXp,
    };
  }

  const parsedLevel =
    typeof rawLevel === 'number' && Number.isFinite(rawLevel) && rawLevel >= 1
      ? Math.min(MAX_PLAYER_LEVEL, Math.floor(rawLevel))
      : 1;
  const parsedXp =
    typeof rawXp === 'number' && Number.isFinite(rawXp) && rawXp >= 0
      ? Math.floor(rawXp)
      : 0;
  const derivedTotal = getTotalXpForLevel(parsedLevel) + parsedXp;
  const prog = getLevelProgressFromTotalXp(derivedTotal);
  return {
    level: prog.level,
    xp: prog.currentLevelXp,
    totalXp: prog.totalXp,
  };
}

export type WormBaitId = 'worm_harbor' | 'worm_korean' | 'worm_luck5';

export interface WormBaitItem {
  id: WormBaitId;
  price: number;
  luckMultiplier: number;
  speedMultiplier: number;
  castsPerUnit: number;
  nameEs: string;
  nameEn: string;
  shortEffectEs: string;
  shortEffectEn: string;
  descriptionEs: string;
  descriptionEn: string;
}

export const WORM_BAIT_CATALOG: readonly WormBaitItem[] = [
  {
    id: 'worm_harbor',
    price: 250,
    luckMultiplier: 2,
    speedMultiplier: 1,
    castsPerUnit: 1,
    nameEs: 'Gusano de Puerto',
    nameEn: 'Harbor Worm',
    shortEffectEs: 'Suerte x2 · 1 tirada',
    shortEffectEn: '2x Luck · 1 cast',
    descriptionEs:
      'Cebo resistente de muelle (250 monedas c/u). Reemplaza la boya en el sedal y otorga 2x de suerte durante 1 tirada/captura.',
    descriptionEn:
      'Tough dockside worm (250 coins each). Replaces the bobber on your line and grants 2x luck for 1 cast/catch.',
  },
  {
    id: 'worm_korean',
    price: 500,
    luckMultiplier: 2,
    speedMultiplier: 2,
    castsPerUnit: 5,
    nameEs: 'Gusano Coreano',
    nameEn: 'Korean Worm',
    shortEffectEs: 'Velocidad x2 + Suerte x2 · 5 tiradas',
    shortEffectEn: '2x Speed + 2x Luck · 5 casts',
    descriptionEs:
      'Gusano anillado de tono dorado natural (500 monedas c/u). Otorga 2x de velocidad y 2x de suerte durante 5 tiradas/capturas.',
    descriptionEn:
      'Natural golden-amber ringed worm (500 coins each). Grants 2x speed and 2x luck for 5 casts/catches.',
  },
  {
    id: 'worm_luck5',
    price: 1000,
    luckMultiplier: 5,
    speedMultiplier: 1,
    castsPerUnit: 1,
    nameEs: 'Gusano de Marea x5',
    nameEn: 'Tide Worm x5',
    shortEffectEs: 'Suerte x5 · 1 tirada',
    shortEffectEn: '5x Luck · 1 cast',
    descriptionEs:
      'Cebo especial luminiscente de alta marea (1.000 monedas c/u). Otorga 5x de suerte durante 1 tirada/captura.',
    descriptionEn:
      'Special high-tide luminescent worm (1,000 coins each). Grants 5x luck for 1 cast/catch.',
  },
] as const;

export type BaitInventory = Record<WormBaitId, number>;

export function createEmptyBaitInventory(): BaitInventory {
  return {
    worm_harbor: 0,
    worm_korean: 0,
    worm_luck5: 0,
  };
}

export function getWormBaitById(id: WormBaitId): WormBaitItem;
export function getWormBaitById(id: string | null | undefined): WormBaitItem | null;
export function getWormBaitById(id: string | null | undefined): WormBaitItem | null {
  if (!id) return null;
  return WORM_BAIT_CATALOG.find((w) => w.id === id) ?? null;
}

export function sanitizeBaitInventory(raw: unknown): BaitInventory {
  const base = createEmptyBaitInventory();
  if (!raw || typeof raw !== 'object') return base;
  const obj = raw as Record<string, unknown>;
  for (const worm of WORM_BAIT_CATALOG) {
    const val = obj[worm.id];
    if (typeof val === 'number' && Number.isFinite(val) && val > 0) {
      base[worm.id] = Math.min(9999, Math.floor(val));
    }
  }
  return base;
}

export function sanitizeEquippedBaitId(raw: unknown): WormBaitId | null {
  if (raw === 'worm_harbor' || raw === 'worm_korean' || raw === 'worm_luck5') {
    return raw;
  }
  return null;
}

/**
 * Consumes 1 cast/catch charge from the currently equipped worm bait.
 * - If `activeCharges > 0`, uses 1 remaining charge from the active worm unit.
 * - If `activeCharges === 0` and `inventory[equippedBaitId] > 0`, consumes 1 worm unit
 *   from inventory, loads `castsPerUnit` charges, and spends 1 charge for this cast.
 */
export function consumeWormCastCharge(params: {
  inventory: BaitInventory;
  equippedBaitId: WormBaitId | null;
  activeCharges: number;
}): {
  nextInventory: BaitInventory;
  nextEquippedBaitId: WormBaitId | null;
  nextActiveCharges: number;
  appliedBait: WormBaitItem | null;
} {
  const { inventory, equippedBaitId, activeCharges } = params;
  const bait = getWormBaitById(equippedBaitId);
  if (!bait || !equippedBaitId) {
    return {
      nextInventory: inventory,
      nextEquippedBaitId: null,
      nextActiveCharges: 0,
      appliedBait: null,
    };
  }

  const safeActive =
    typeof activeCharges === 'number' && Number.isFinite(activeCharges) && activeCharges > 0
      ? Math.floor(activeCharges)
      : 0;

  if (safeActive > 0) {
    const remaining = safeActive - 1;
    const stillHasStock = (inventory[equippedBaitId] ?? 0) > 0;
    return {
      nextInventory: inventory,
      nextEquippedBaitId: remaining > 0 || stillHasStock ? equippedBaitId : null,
      nextActiveCharges: remaining,
      appliedBait: bait,
    };
  }

  const stock = inventory[equippedBaitId] ?? 0;
  if (stock <= 0) {
    return {
      nextInventory: inventory,
      nextEquippedBaitId: null,
      nextActiveCharges: 0,
      appliedBait: null,
    };
  }

  const nextStock = stock - 1;
  const nextInventory: BaitInventory = {
    ...inventory,
    [equippedBaitId]: nextStock,
  };
  const remainingAfterCast = Math.max(0, bait.castsPerUnit - 1);

  return {
    nextInventory,
    nextEquippedBaitId: remainingAfterCast > 0 || nextStock > 0 ? equippedBaitId : null,
    nextActiveCharges: remainingAfterCast,
    appliedBait: bait,
  };
}

export type RewardRoadKind =
  | 'coins'
  | 'luck_boost'
  | 'bait_pack'
  | 'underworld_unlock'
  | 'upgrade_bundle';

export type RewardBadgeType =
  | 'coin_pouch'
  | 'coin_chest'
  | 'coin_vault'
  | 'worm_harbor'
  | 'worm_korean'
  | 'worm_luck5'
  | 'clover_luck'
  | 'demon_portal'
  | 'master_trophy'
  | 'legend_crown';

export type RewardRoadStatus = 'claimed' | 'claimable' | 'locked';

export interface RewardRoadEntry {
  level: number;
  kind: RewardRoadKind;
  badgeType: RewardBadgeType;
  coins: number;
  luckMultiplier?: number;
  luckDurationMs?: number;
  baitId?: WormBaitId;
  baitCount?: number;
  baitLabelEs?: string;
  baitLabelEn?: string;
  unlocksUnderworld?: boolean;
  perkLabelEs?: string;
  perkLabelEn?: string;
  isMajorMilestone?: boolean;
  icon: string;
  titleEs: string;
  titleEn: string;
  descriptionEs: string;
  descriptionEn: string;
}

export const REWARD_ROAD_MAX_LEVEL = 20;

/**
 * Ordered, progressive 20-level Reward Road configuration (Level 1 -> Level 20).
 * - Level 3 & Level 6: Gusano de Puerto (2x luck for 1 cast).
 * - Level 9 & Level 12: Gusano Coreano (2x speed + 2x luck for 5 casts).
 * - Level 10: Mini Demon / Underworld unlock.
 * - Level 16 & Level 19 (+ Level 20 bundle): Gusano Marea x5 (5x luck for 1 cast).
 */
export const REWARD_ROAD_MILESTONES: RewardRoadEntry[] = [
  {
    level: 1,
    kind: 'coins',
    badgeType: 'coin_pouch',
    coins: 50,
    icon: '🪙',
    titleEs: 'Bono Inicial',
    titleEn: 'Starter Bonus',
    descriptionEs: '+50 monedas de bienvenida.',
    descriptionEn: '+50 welcome coins.',
  },
  {
    level: 2,
    kind: 'coins',
    badgeType: 'coin_pouch',
    coins: 100,
    icon: '🪙',
    titleEs: 'Bolsa del Muelle',
    titleEn: 'Dock Pouch',
    descriptionEs: '+100 monedas por tus primeras capturas.',
    descriptionEn: '+100 coins for your first catches.',
  },
  {
    level: 3,
    kind: 'bait_pack',
    badgeType: 'worm_harbor',
    coins: 150,
    baitId: 'worm_harbor',
    baitCount: 2,
    baitLabelEs: 'Gusano de Puerto',
    baitLabelEn: 'Harbor Worm',
    icon: '🪱',
    titleEs: 'Gusano de Puerto',
    titleEn: 'Harbor Worm Pack',
    descriptionEs: '+150 monedas y x2 Gusanos de Puerto (Suerte x2 · 1 tirada).',
    descriptionEn: '+150 coins and x2 Harbor Worms (2x Luck · 1 cast).',
  },
  {
    level: 4,
    kind: 'coins',
    badgeType: 'coin_chest',
    coins: 220,
    icon: '💰',
    titleEs: 'Fondo de Aparejos',
    titleEn: 'Tackle Fund',
    descriptionEs: '+220 monedas para tu equipo.',
    descriptionEn: '+220 coins for your gear.',
  },
  {
    level: 5,
    kind: 'luck_boost',
    badgeType: 'clover_luck',
    coins: 300,
    luckMultiplier: 2,
    luckDurationMs: 120_000,
    isMajorMilestone: true,
    icon: '🍀',
    titleEs: 'Trébol de Suerte Nv. 5',
    titleEn: 'Lv. 5 Luck Clover',
    descriptionEs: '+300 monedas y Suerte x2 (2 min).',
    descriptionEn: '+300 coins and Luck x2 (2 min).',
  },
  {
    level: 6,
    kind: 'bait_pack',
    badgeType: 'worm_harbor',
    coins: 400,
    baitId: 'worm_harbor',
    baitCount: 3,
    baitLabelEs: 'Gusano de Puerto',
    baitLabelEn: 'Harbor Worm',
    icon: '🪱',
    titleEs: 'Reserva de Puerto',
    titleEn: 'Harbor Worm Stash',
    descriptionEs: '+400 monedas y x3 Gusanos de Puerto (Suerte x2 · 1 tirada).',
    descriptionEn: '+400 coins and x3 Harbor Worms (2x Luck · 1 cast).',
  },
  {
    level: 7,
    kind: 'coins',
    badgeType: 'coin_chest',
    coins: 520,
    icon: '💰',
    titleEs: 'Botín de la Corriente',
    titleEn: 'Current Bounty',
    descriptionEs: '+520 monedas de progreso.',
    descriptionEn: '+520 progress coins.',
  },
  {
    level: 8,
    kind: 'luck_boost',
    badgeType: 'clover_luck',
    coins: 650,
    luckMultiplier: 2,
    luckDurationMs: 180_000,
    icon: '🍀',
    titleEs: 'Impulso del Pescador',
    titleEn: 'Angler Surge',
    descriptionEs: '+650 monedas y Suerte x2 (3 min).',
    descriptionEn: '+650 coins and Luck x2 (3 min).',
  },
  {
    level: 9,
    kind: 'bait_pack',
    badgeType: 'worm_korean',
    coins: 800,
    baitId: 'worm_korean',
    baitCount: 2,
    baitLabelEs: 'Gusano Coreano',
    baitLabelEn: 'Korean Worm',
    icon: '🪱',
    titleEs: '2 Gusanos Coreanos',
    titleEn: '2 Korean Worms',
    descriptionEs: '+800 monedas y x2 Gusanos Coreanos (Velocidad x2 + Suerte x2 · 5 tiradas).',
    descriptionEn: '+800 coins and x2 Korean Worms (2x Speed + 2x Luck · 5 casts).',
  },
  {
    level: 10,
    kind: 'underworld_unlock',
    badgeType: 'demon_portal',
    coins: 1000,
    luckMultiplier: 2.5,
    luckDurationMs: 180_000,
    unlocksUnderworld: true,
    isMajorMilestone: true,
    icon: '😈',
    titleEs: 'Mini Demonio · Inframundo',
    titleEn: 'Mini Demon · Underworld',
    descriptionEs: '+1.000 monedas, Suerte x2.5 y desbloqueo del Mini Demonio / Inframundo.',
    descriptionEn: '+1,000 coins, Luck x2.5 and Mini Demon / Underworld unlock.',
  },
  {
    level: 11,
    kind: 'coins',
    badgeType: 'coin_chest',
    coins: 1250,
    icon: '💰',
    titleEs: 'Cofre de Brasa',
    titleEn: 'Ember Chest',
    descriptionEs: '+1.250 monedas para tu aventura.',
    descriptionEn: '+1,250 coins for your journey.',
  },
  {
    level: 12,
    kind: 'bait_pack',
    badgeType: 'worm_korean',
    coins: 1500,
    baitId: 'worm_korean',
    baitCount: 3,
    baitLabelEs: 'Gusano Coreano',
    baitLabelEn: 'Korean Worm',
    icon: '🪱',
    titleEs: 'Lote de Gusano Coreano',
    titleEn: 'Korean Worm Bundle',
    descriptionEs: '+1.500 monedas y x3 Gusanos Coreanos (Velocidad x2 + Suerte x2 · 5 tiradas).',
    descriptionEn: '+1,500 coins and x3 Korean Worms (2x Speed + 2x Luck · 5 casts).',
  },
  {
    level: 13,
    kind: 'coins',
    badgeType: 'coin_vault',
    coins: 1800,
    icon: '💰',
    titleEs: 'Arca del Inframundo',
    titleEn: 'Underworld Vault',
    descriptionEs: '+1.800 monedas de alto nivel.',
    descriptionEn: '+1,800 high-level coins.',
  },
  {
    level: 14,
    kind: 'luck_boost',
    badgeType: 'clover_luck',
    coins: 2150,
    luckMultiplier: 2.5,
    luckDurationMs: 240_000,
    icon: '🍀',
    titleEs: 'Trébol Dorado',
    titleEn: 'Golden Clover',
    descriptionEs: '+2.150 monedas y Suerte x2.5 (4 min).',
    descriptionEn: '+2,150 coins and Luck x2.5 (4 min).',
  },
  {
    level: 15,
    kind: 'upgrade_bundle',
    badgeType: 'master_trophy',
    coins: 2600,
    luckMultiplier: 3,
    luckDurationMs: 240_000,
    baitId: 'worm_korean',
    baitCount: 2,
    baitLabelEs: 'Gusano Coreano',
    baitLabelEn: 'Korean Worm',
    isMajorMilestone: true,
    icon: '🏆',
    titleEs: 'Trofeo Maestro Nv. 15',
    titleEn: 'Lv. 15 Master Trophy',
    descriptionEs: '+2.600 monedas, Suerte x3 (4 min) y x2 Gusanos Coreanos.',
    descriptionEn: '+2,600 coins, Luck x3 (4 min) and x2 Korean Worms.',
  },
  {
    level: 16,
    kind: 'bait_pack',
    badgeType: 'worm_luck5',
    coins: 3100,
    baitId: 'worm_luck5',
    baitCount: 2,
    baitLabelEs: 'Gusano Marea x5',
    baitLabelEn: 'Tide Worm x5',
    icon: '🪱',
    titleEs: 'Gusano Marea x5',
    titleEn: 'Tide Worm x5 Pack',
    descriptionEs: '+3.100 monedas y x2 Gusanos Marea x5 (Suerte x5 · 1 tirada).',
    descriptionEn: '+3,100 coins and x2 Tide Worms x5 (5x Luck · 1 cast).',
  },
  {
    level: 17,
    kind: 'coins',
    badgeType: 'coin_vault',
    coins: 3700,
    icon: '💰',
    titleEs: 'Cámara del Río Profundo',
    titleEn: 'Deep River Treasury',
    descriptionEs: '+3.700 monedas de maestro pescador.',
    descriptionEn: '+3,700 master angler coins.',
  },
  {
    level: 18,
    kind: 'luck_boost',
    badgeType: 'clover_luck',
    coins: 4400,
    luckMultiplier: 3,
    luckDurationMs: 300_000,
    icon: '🍀',
    titleEs: 'Fortuna Abisal',
    titleEn: 'Abyssal Fortune',
    descriptionEs: '+4.400 monedas y Suerte x3 (5 min).',
    descriptionEn: '+4,400 coins and Luck x3 (5 min).',
  },
  {
    level: 19,
    kind: 'bait_pack',
    badgeType: 'worm_luck5',
    coins: 5200,
    baitId: 'worm_luck5',
    baitCount: 3,
    baitLabelEs: 'Gusano Marea x5',
    baitLabelEn: 'Tide Worm x5',
    icon: '🪱',
    titleEs: 'Reserva Marea x5',
    titleEn: 'Tide Worm x5 Reserve',
    descriptionEs: '+5.200 monedas y x3 Gusanos Marea x5 (Suerte x5 · 1 tirada).',
    descriptionEn: '+5,200 coins and x3 Tide Worms x5 (5x Luck · 1 cast).',
  },
  {
    level: 20,
    kind: 'upgrade_bundle',
    badgeType: 'legend_crown',
    coins: 7500,
    luckMultiplier: 4,
    luckDurationMs: 360_000,
    baitId: 'worm_luck5',
    baitCount: 3,
    baitLabelEs: 'Gusano Marea x5',
    baitLabelEn: 'Tide Worm x5',
    isMajorMilestone: true,
    icon: '👑',
    titleEs: 'Corona Leyenda Nivel 20',
    titleEn: 'Level 20 Legend Crown',
    descriptionEs: '+7.500 monedas, Suerte x4 (6 min) y x3 Gusanos Marea x5.',
    descriptionEn: '+7,500 coins, Luck x4 (6 min) and x3 Tide Worms x5.',
  },
];

export function sanitizeClaimedLevelRewards(
  raw: unknown
): Record<number, boolean> {
  if (!raw || typeof raw !== 'object') return {};
  const result: Record<number, boolean> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    const lvl = Number(k);
    if (
      Boolean(v) &&
      Number.isInteger(lvl) &&
      lvl >= 1 &&
      lvl <= MAX_PLAYER_LEVEL
    ) {
      result[lvl] = true;
    }
  }
  return result;
}

export function getRewardRoadStatus(
  milestoneLevel: number,
  playerLevel: number,
  claimedLevelRewards: Record<number, boolean>
): RewardRoadStatus {
  if (claimedLevelRewards[milestoneLevel]) {
    return 'claimed';
  }
  if (playerLevel >= milestoneLevel) {
    return 'claimable';
  }
  return 'locked';
}

export function getUnclaimedRewardRoadCount(
  playerLevel: number,
  claimedLevelRewards: Record<number, boolean>,
  milestones: readonly RewardRoadEntry[] = REWARD_ROAD_MILESTONES
): number {
  let count = 0;
  for (const m of milestones) {
    if (
      getRewardRoadStatus(m.level, playerLevel, claimedLevelRewards) ===
      'claimable'
    ) {
      count += 1;
    }
  }
  return count;
}

export function claimLevelReward(
  milestoneLevel: number,
  playerLevel: number,
  claimedLevelRewards: Record<number, boolean>,
  milestones: readonly RewardRoadEntry[] = REWARD_ROAD_MILESTONES
): {
  success: boolean;
  entry: RewardRoadEntry | null;
  nextClaimed: Record<number, boolean>;
} {
  const entry = milestones.find((m) => m.level === milestoneLevel) ?? null;
  if (!entry) {
    return {
      success: false,
      entry: null,
      nextClaimed: claimedLevelRewards,
    };
  }
  const status = getRewardRoadStatus(
    milestoneLevel,
    playerLevel,
    claimedLevelRewards
  );
  if (status !== 'claimable') {
    return {
      success: false,
      entry: null,
      nextClaimed: claimedLevelRewards,
    };
  }
  return {
    success: true,
    entry,
    nextClaimed: {
      ...claimedLevelRewards,
      [milestoneLevel]: true,
    },
  };
}


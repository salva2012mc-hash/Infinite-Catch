export type FishingPhase = 'IDLE' | 'CASTING' | 'WAITING' | 'BITING' | 'CAUGHT' | 'MISSED';

export interface FishingState {
  phase: FishingPhase;
  fishCount: number;
  phaseTimer: number;
  waitDuration: number;
  biteWindow: number;
}

export const TIMING = {
  CAST_DURATION: 0.68,
  BASE_FISHING_SECONDS: 5.0,
  CARBON_FISHING_SECONDS: 4.0,
  GOLD_FISHING_SECONDS: 3.0,
  OG_FISHING_SECONDS: 2.0,
  MIN_WAIT: 3.6,
  MAX_WAIT: 4.32,
  CARBON_MIN_WAIT: 2.72,
  CARBON_MAX_WAIT: 3.32,
  GOLD_MIN_WAIT: 1.82,
  GOLD_MAX_WAIT: 2.32,
  OG_MIN_WAIT: 1.1,
  OG_MAX_WAIT: 1.32,
  BITE_WINDOW: 1.8,
  RESULT_DURATION: 1.25,
} as const;

export type EquippedRodId = 'default' | 'rod_carbon' | 'rod_gold' | 'rod_og';

export interface RodStats {
  rodId: EquippedRodId;
  baseFishingSeconds: number;
  luckMultiplier: number;
  tensionControlBonus: boolean;
}

export function getEquippedRodStats(equippedCosmetics: string[]): RodStats {
  if (equippedCosmetics.includes('rod_og')) {
    return {
      rodId: 'rod_og',
      baseFishingSeconds: TIMING.OG_FISHING_SECONDS,
      luckMultiplier: 1,
      tensionControlBonus: false,
    };
  }
  if (equippedCosmetics.includes('rod_gold')) {
    return {
      rodId: 'rod_gold',
      baseFishingSeconds: TIMING.GOLD_FISHING_SECONDS,
      luckMultiplier: 1.5,
      tensionControlBonus: true,
    };
  }
  if (equippedCosmetics.includes('rod_carbon')) {
    return {
      rodId: 'rod_carbon',
      baseFishingSeconds: TIMING.CARBON_FISHING_SECONDS,
      luckMultiplier: 1,
      tensionControlBonus: false,
    };
  }
  return {
    rodId: 'default',
    baseFishingSeconds: TIMING.BASE_FISHING_SECONDS,
    luckMultiplier: 1,
    tensionControlBonus: false,
  };
}

export function createInitialFishingState(): FishingState {
  return {
    phase: 'IDLE',
    fishCount: 0,
    phaseTimer: 0,
    waitDuration: 0,
    biteWindow: TIMING.BITE_WINDOW,
  };
}

export interface FishingWaitOptions {
  hasOgRod?: boolean;
  hasGoldRod?: boolean;
  hasCarbonRod?: boolean;
  rodId?: EquippedRodId;
  speedMultiplier?: number;
}

export function randomWaitDuration(
  rng: () => number = Math.random,
  optionsOrHasOgRod: boolean | FishingWaitOptions = false
): number {
  const opts: FishingWaitOptions =
    typeof optionsOrHasOgRod === 'boolean'
      ? { hasOgRod: optionsOrHasOgRod }
      : optionsOrHasOgRod ?? {};

  const rodId: EquippedRodId =
    opts.rodId ??
    (opts.hasOgRod
      ? 'rod_og'
      : opts.hasGoldRod
        ? 'rod_gold'
        : opts.hasCarbonRod
          ? 'rod_carbon'
          : 'default');

  let baseWait: number;
  if (rodId === 'rod_og') {
    baseWait = TIMING.OG_MIN_WAIT + rng() * (TIMING.OG_MAX_WAIT - TIMING.OG_MIN_WAIT);
  } else if (rodId === 'rod_gold') {
    baseWait = TIMING.GOLD_MIN_WAIT + rng() * (TIMING.GOLD_MAX_WAIT - TIMING.GOLD_MIN_WAIT);
  } else if (rodId === 'rod_carbon') {
    baseWait =
      TIMING.CARBON_MIN_WAIT + rng() * (TIMING.CARBON_MAX_WAIT - TIMING.CARBON_MIN_WAIT);
  } else {
    baseWait = TIMING.MIN_WAIT + rng() * (TIMING.MAX_WAIT - TIMING.MIN_WAIT);
  }

  const speedMult =
    typeof opts.speedMultiplier === 'number' &&
    Number.isFinite(opts.speedMultiplier) &&
    opts.speedMultiplier > 1
      ? opts.speedMultiplier
      : 1;

  return Math.max(0.35, baseWait / speedMult);
}

export function triggerFishingAction(
  state: FishingState,
  rng: () => number = Math.random,
  options?: FishingWaitOptions
): { next: FishingState; event: 'cast' | 'catch' | 'early_pull' | 'none' } {
  switch (state.phase) {
    case 'IDLE':
    case 'CAUGHT':
    case 'MISSED':
      return {
        next: {
          ...state,
          phase: 'CASTING',
          phaseTimer: 0,
          waitDuration: randomWaitDuration(rng, options ?? {}),
        },
        event: 'cast',
      };
    case 'BITING':
      return {
        next: {
          ...state,
          phase: 'CAUGHT',
          fishCount: state.fishCount + 1,
          phaseTimer: 0,
        },
        event: 'catch',
      };
    case 'WAITING':
      // Pulling too early scares the fish away and resets to IDLE
      return {
        next: {
          ...state,
          phase: 'IDLE',
          phaseTimer: 0,
        },
        event: 'early_pull',
      };
    case 'CASTING':
    default:
      return { next: state, event: 'none' };
  }
}

export function stepFishingState(
  state: FishingState,
  dt: number
): { next: FishingState; event: 'bite_start' | 'bite_missed' | 'ready' | 'none' } {
  const nextTimer = state.phaseTimer + dt;

  switch (state.phase) {
    case 'CASTING':
      if (nextTimer >= TIMING.CAST_DURATION) {
        return {
          next: { ...state, phase: 'WAITING', phaseTimer: 0 },
          event: 'none',
        };
      }
      return { next: { ...state, phaseTimer: nextTimer }, event: 'none' };

    case 'WAITING':
      if (nextTimer >= state.waitDuration) {
        return {
          next: { ...state, phase: 'BITING', phaseTimer: 0 },
          event: 'bite_start',
        };
      }
      return { next: { ...state, phaseTimer: nextTimer }, event: 'none' };

    case 'BITING':
      if (nextTimer >= state.biteWindow) {
        return {
          next: { ...state, phase: 'MISSED', phaseTimer: 0 },
          event: 'bite_missed',
        };
      }
      return { next: { ...state, phaseTimer: nextTimer }, event: 'none' };

    case 'CAUGHT':
    case 'MISSED':
      if (nextTimer >= TIMING.RESULT_DURATION) {
        return {
          next: { ...state, phase: 'IDLE', phaseTimer: 0 },
          event: 'ready',
        };
      }
      return { next: { ...state, phaseTimer: nextTimer }, event: 'none' };

    case 'IDLE':
    default:
      return { next: state, event: 'none' };
  }
}

export interface AccountProgressSnapshot {
  fishCount?: number;
  totalCoinsEarned?: number;
  coins?: number;
  playTimeSeconds?: number;
  discoveredFish?: Record<number, number>;
  ownedCosmetics?: unknown[];
  inventoryLength?: number;
  catchHistoryLength?: number;
  hasOgTitle?: boolean;
  underworldUnlocked?: boolean;
}

export function getAccountCatchCount(
  snapshot: AccountProgressSnapshot
): number {
  const explicitCatches = Math.max(0, Number(snapshot.fishCount) || 0);
  const discoveredCatches = snapshot.discoveredFish
    ? Object.values(snapshot.discoveredFish).reduce(
        (sum, count) => sum + Math.max(0, Number(count) || 0),
        0
      )
    : 0;
  return Math.max(explicitCatches, discoveredCatches);
}

export function hasAccountProgress(snapshot: AccountProgressSnapshot): boolean {
  if (getAccountCatchCount(snapshot) > 0) return true;
  if ((snapshot.totalCoinsEarned ?? 0) > 0) return true;
  if ((snapshot.coins ?? 0) > 0) return true;
  if ((snapshot.playTimeSeconds ?? 0) >= 60) return true;
  if (snapshot.hasOgTitle || snapshot.underworldUnlocked) return true;
  if ((snapshot.ownedCosmetics?.length ?? 0) > 0) return true;
  if ((snapshot.inventoryLength ?? 0) > 0) return true;
  if ((snapshot.catchHistoryLength ?? 0) > 0) return true;
  return false;
}

export function resolveInitialTutorialStep(options: {
  tutorialDoneFlag: boolean;
  legacyTutorialDoneFlag?: boolean;
  accountProgress: AccountProgressSnapshot;
}): number {
  // Always keep tutorial active until the player / account achieves their first catch.
  if (getAccountCatchCount(options.accountProgress) === 0) {
    return 1;
  }
  if (
    options.tutorialDoneFlag ||
    options.legacyTutorialDoneFlag ||
    hasAccountProgress(options.accountProgress)
  ) {
    return 0;
  }
  return 1;
}


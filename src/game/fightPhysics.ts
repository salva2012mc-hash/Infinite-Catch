import { Rarity } from './pokemonData';

export type FightFailReason = 'none' | 'line_snapped' | 'fish_escaped';

export interface FightTelemetry {
  active: boolean;
  tension: number; // 0..1 (1.0 = risk/snap threshold)
  distance: number; // 0..1 (1.0 = fish escaped away)
  pullPulse: number; // 0..1 visual tug pulse on player pull
  fishPulling: boolean;
  rarity: Rarity;
  weightFactor?: number; // 0..1 normalized within species [minKg, maxKg]
  failReason: FightFailReason;
  failTimestamp: number;
}

export function createInitialFightTelemetry(): FightTelemetry {
  return {
    active: false,
    tension: 0.15,
    distance: 0.35,
    pullPulse: 0,
    fishPulling: false,
    rarity: 'Común',
    weightFactor: 0.5,
    failReason: 'none',
    failTimestamp: 0,
  };
}

function clampWeightFactor(weightFactor?: number): number {
  if (typeof weightFactor !== 'number' || !Number.isFinite(weightFactor)) {
    return 0.5;
  }
  return Math.max(0, Math.min(1, weightFactor));
}

export function getRarityFightProfile(rarity: Rarity, weightFactor = 0.5) {
  const wf = clampWeightFactor(weightFactor);
  // Light specimens = 0.84x force, mid = 1.04x, max-weight trophy = 1.24x
  const wScale = 0.84 + wf * 0.4;
  const strainScale = 0.86 + wf * 0.34;
  const freqScale = 0.94 + wf * 0.14;

  const base = (() => {
    switch (rarity) {
      case 'Común':
        return {
          pullBackSpeed: 0.05,
          surgeInterval: 3.6,
          surgeDuration: 0.7,
          surgeForce: 0.16,
          thrashFreq: 14,
          tensionStrainRate: 0.55,
        };
      case 'Rara':
        return {
          pullBackSpeed: 0.075,
          surgeInterval: 3.2,
          surgeDuration: 0.75,
          surgeForce: 0.22,
          thrashFreq: 17,
          tensionStrainRate: 0.65,
        };
      case 'Épica':
        return {
          pullBackSpeed: 0.1,
          surgeInterval: 2.9,
          surgeDuration: 0.8,
          surgeForce: 0.28,
          thrashFreq: 20,
          tensionStrainRate: 0.72,
        };
      case 'Mítica':
        return {
          pullBackSpeed: 0.12,
          surgeInterval: 2.7,
          surgeDuration: 0.84,
          surgeForce: 0.32,
          thrashFreq: 23,
          tensionStrainRate: 0.78,
        };
      case 'Legendaria':
        return {
          pullBackSpeed: 0.14,
          surgeInterval: 2.55,
          surgeDuration: 0.87,
          surgeForce: 0.36,
          thrashFreq: 26,
          tensionStrainRate: 0.83,
        };
      case 'Secreto':
        return {
          pullBackSpeed: 0.155,
          surgeInterval: 2.45,
          surgeDuration: 0.9,
          surgeForce: 0.4,
          thrashFreq: 29,
          tensionStrainRate: 0.88,
        };
      case 'Secreto Abisal':
        return {
          pullBackSpeed: 0.17,
          surgeInterval: 2.4,
          surgeDuration: 0.92,
          surgeForce: 0.44,
          thrashFreq: 32,
          tensionStrainRate: 0.93,
        };
    }
  })();

  return {
    pullBackSpeed: Number((base.pullBackSpeed * wScale).toFixed(4)),
    surgeInterval: base.surgeInterval,
    surgeDuration: base.surgeDuration,
    surgeForce: Number((base.surgeForce * wScale).toFixed(4)),
    thrashFreq: Number((base.thrashFreq * freqScale).toFixed(2)),
    tensionStrainRate: Number((base.tensionStrainRate * strainScale).toFixed(4)),
  };
}

export function stepFightClickDynamics(params: {
  tension: number;
  distance: number;
  fishPulling: boolean;
  didClick: boolean;
  dt: number;
  rarity: Rarity;
  weightFactor?: number;
  urgentTime?: boolean;
  hasGoldRod?: boolean;
}): {
  tension: number;
  distance: number;
  dangerType: 'safe' | 'snap_risk' | 'escape_risk';
  failed: FightFailReason;
} {
  const wf = clampWeightFactor(params.weightFactor);
  const profile = getRarityFightProfile(params.rarity, wf);
  const goldStrainMult = params.hasGoldRod ? 0.75 : 1;
  const goldPullMult = params.hasGoldRod ? 1.2 : 1;
  const goldEscapeMult = params.hasGoldRod ? 0.8 : 1;
  let nextTension = params.tension;
  let nextDistance = params.distance;

  if (params.dt > 0) {
    // Passive tension relaxes predictably back to healthy baseline; surges add manageable pressure
    // without creating an unwinnable baseline on high rarities like Secreto Abisal.
    const decayRate = (params.fishPulling ? 0.46 : 0.9) * goldPullMult;
    const upperRelax = !params.fishPulling
      ? nextTension > 0.46
        ? (nextTension - 0.46) * 0.9
        : 0
      : nextTension > 0.62
        ? (nextTension - 0.62) * 0.42
        : 0;
    const surgeStrain = params.fishPulling
      ? (0.068 + wf * 0.024) * (0.65 + profile.tensionStrainRate * 0.35) * goldStrainMult
      : 0;
    nextTension +=
      (surgeStrain - decayRate * Math.max(0, nextTension - 0.2) - upperRelax) *
      params.dt;

    // Fish steadily tries to swim away toward ESC when player stalls or stops clicking
    const swimAwaySpeed =
      (profile.pullBackSpeed * 1.05 +
        0.04 +
        (params.fishPulling ? profile.surgeForce * 0.38 : 0)) *
      goldEscapeMult;
    nextDistance += swimAwaySpeed * params.dt;
  }

  if (params.didClick) {
    // Normal clicking raises tension modestly; only extreme sustained mashing through red surges risks snapping.
    // Final-seconds rush softens surge spike so beating the clock never unfairly snaps the rod.
    let clickStrain: number;
    if (params.fishPulling) {
      clickStrain = (0.042 + wf * 0.008) * goldStrainMult;
      if (params.urgentTime) {
        clickStrain *= 0.55;
      }
    } else {
      clickStrain = (0.017 + wf * 0.005) * goldStrainMult;
      if (nextTension >= 0.75) {
        clickStrain *= 0.45;
      }
    }

    const pullRecovery =
      (params.fishPulling ? 0.072 - wf * 0.012 : 0.105 - wf * 0.014) * goldPullMult;
    nextTension += clickStrain;
    if (params.urgentTime && nextTension >= 0.92 && params.tension < 0.92) {
      nextTension = 0.92;
    }
    nextDistance -= Math.max(0.045, pullRecovery);
  }

  nextTension = Math.max(0.08, Math.min(1, nextTension));
  nextDistance = Math.max(0.04, Math.min(1, nextDistance));

  if (nextTension >= 1) {
    return {
      tension: 1,
      distance: nextDistance,
      dangerType: 'snap_risk',
      failed: 'line_snapped',
    };
  }

  if (nextDistance >= 1) {
    return {
      tension: nextTension,
      distance: 1,
      dangerType: 'escape_risk',
      failed: 'fish_escaped',
    };
  }

  const dangerType: 'safe' | 'snap_risk' | 'escape_risk' =
    nextTension >= 0.76
      ? 'snap_risk'
      : nextDistance >= 0.75
        ? 'escape_risk'
        : 'safe';

  return {
    tension: nextTension,
    distance: nextDistance,
    dangerType,
    failed: 'none',
  };
}

export function stepFightBarDynamics(params: {
  tension: number;
  distance: number;
  inBox: boolean;
  holding: boolean;
  atTopCeiling: boolean;
  atBottomFloor: boolean;
  dt: number;
  rarity: Rarity;
  fishPulling: boolean;
  weightFactor?: number;
  hasGoldRod?: boolean;
}): {
  tension: number;
  distance: number;
  dangerType: 'safe' | 'snap_risk' | 'escape_risk';
  failed: FightFailReason;
} {
  const wf = clampWeightFactor(params.weightFactor);
  const profile = getRarityFightProfile(params.rarity, wf);
  const goldStrainMult = params.hasGoldRod ? 0.75 : 1;
  const goldPullMult = params.hasGoldRod ? 1.2 : 1;
  const goldEscapeMult = params.hasGoldRod ? 0.78 : 1;
  let nextTension = params.tension;
  let nextDistance = params.distance;

  if (params.atTopCeiling && params.holding && !params.inBox) {
    // Over-reeling pinned against the top limit strains the rod/line steadily toward snapping (~1.7-2.2s warning)
    nextTension += (0.24 + profile.tensionStrainRate * 0.12) * goldStrainMult * params.dt;
  } else if (params.inBox) {
    // Controlled fight inside the green zone keeps tension healthy & recovers strain smoothly
    const targetSafeTension =
      (params.fishPulling ? 0.44 : 0.28) + wf * 0.05;
    nextTension += (targetSafeTension - nextTension) * Math.min(1, params.dt * 5.2);
    const reelInRate = (0.3 - wf * 0.04 + (params.fishPulling ? -0.04 : 0.04)) * goldPullMult;
    nextDistance -= reelInRate * params.dt;
  } else {
    // Outside green zone: fish pulls away & line reacts without unfairly snapping while chasing the box
    if (params.atBottomFloor && !params.holding) {
      // Completely slack line lets fish swim away faster
      nextTension += (0.14 - nextTension) * Math.min(1, params.dt * 3.6);
      nextDistance += (profile.pullBackSpeed * 0.78 + 0.07) * goldEscapeMult * params.dt;
    } else {
      const surgeBonus = params.fishPulling ? profile.surgeForce * 0.18 : 0;
      const targetTension = params.holding ? 0.54 + wf * 0.06 : 0.28;
      const relaxRate = params.holding ? 2.6 : 4.2;
      const abuseStrain =
        params.holding && params.fishPulling && nextTension < 0.78
          ? (0.04 + wf * 0.03) * goldStrainMult * params.dt
          : 0;
      nextTension +=
        (targetTension - nextTension) * Math.min(1, params.dt * relaxRate) +
        abuseStrain;
      nextDistance += (profile.pullBackSpeed * 0.48 + surgeBonus) * goldEscapeMult * params.dt;
    }
  }

  nextTension = Math.max(0.05, Math.min(1, nextTension));
  nextDistance = Math.max(0.04, Math.min(1, nextDistance));

  if (nextTension >= 1) {
    return {
      tension: 1,
      distance: nextDistance,
      dangerType: 'snap_risk',
      failed: 'line_snapped',
    };
  }

  if (nextDistance >= 1) {
    return {
      tension: nextTension,
      distance: 1,
      dangerType: 'escape_risk',
      failed: 'fish_escaped',
    };
  }

  const dangerType: 'safe' | 'snap_risk' | 'escape_risk' =
    nextTension >= 0.72
      ? 'snap_risk'
      : nextDistance >= 0.75
        ? 'escape_risk'
        : 'safe';

  return {
    tension: nextTension,
    distance: nextDistance,
    dangerType,
    failed: 'none',
  };
}

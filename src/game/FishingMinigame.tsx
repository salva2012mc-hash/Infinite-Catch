import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  CaughtPokemon,
  Rarity,
  RARITIES,
  formatFishWeight,
  getSpeciesWeightFactor,
  getSpeciesWeightRange,
} from './pokemonData';
import { Language, getRarityName } from './i18n';
import {
  FightFailReason,
  FightTelemetry,
  getRarityFightProfile,
  stepFightBarDynamics,
  stepFightClickDynamics,
} from './fightPhysics';
import { sound } from './sound';
import {
  RarityDiagramKind,
  getRarityTutorialInfo,
  shouldShowRarityFirstTimeTutorial,
} from './rarityTutorial';

export interface MinigameParticleConfig {
  count: number;
  intensity: number;
  speed: number;
  maxRadius: number;
  maxAlpha: number;
  glowShadow: string;
  borderColor: string;
  colors: string[];
  twinkle: boolean;
}

export interface MinigameThemeConfig {
  cardBackground: string;
  headerTint: string;
  accentColor: string;
  progressGradient: string;
  buttonGradient: string;
  buttonLipColor: string;
  tensionIntensity: number;
}

export function getMinigameTheme(rarity: Rarity): MinigameThemeConfig {
  switch (rarity) {
    case 'Común':
      return {
        cardBackground: 'linear-gradient(165deg, #0f243d 0%, #0b192e 58%, #071324 100%)',
        headerTint: 'rgba(56, 189, 248, 0.14)',
        accentColor: '#38bdf8',
        progressGradient: 'linear-gradient(90deg, #0284c7 0%, #38bdf8 55%, #7dd3fc 100%)',
        buttonGradient: 'linear-gradient(180deg, #38bdf8 0%, #0284c7 100%)',
        buttonLipColor: '#0369a1',
        tensionIntensity: 0.35,
      };
    case 'Rara':
      return {
        cardBackground: 'linear-gradient(165deg, #0e2a4a 0%, #0a1d36 58%, #071426 100%)',
        headerTint: 'rgba(56, 189, 248, 0.2)',
        accentColor: '#60a5fa',
        progressGradient: 'linear-gradient(90deg, #2563eb 0%, #38bdf8 55%, #bae6fd 100%)',
        buttonGradient: 'linear-gradient(180deg, #60a5fa 0%, #2563eb 100%)',
        buttonLipColor: '#1d4ed8',
        tensionIntensity: 0.48,
      };
    case 'Épica':
      return {
        cardBackground: 'linear-gradient(165deg, #251342 0%, #160e2c 58%, #0c091c 100%)',
        headerTint: 'rgba(168, 85, 247, 0.22)',
        accentColor: '#c084fc',
        progressGradient: 'linear-gradient(90deg, #7e22ce 0%, #a855f7 55%, #e879f9 100%)',
        buttonGradient: 'linear-gradient(180deg, #c084fc 0%, #7e22ce 100%)',
        buttonLipColor: '#581c87',
        tensionIntensity: 0.62,
      };
    case 'Mítica':
      return {
        cardBackground: 'linear-gradient(165deg, #3b1021 0%, #220b18 58%, #140710 100%)',
        headerTint: 'rgba(244, 63, 94, 0.24)',
        accentColor: '#fb7185',
        progressGradient: 'linear-gradient(90deg, #dc2626 0%, #f43f5e 55%, #fda4af 100%)',
        buttonGradient: 'linear-gradient(180deg, #fb7185 0%, #e11d48 100%)',
        buttonLipColor: '#9f1239',
        tensionIntensity: 0.74,
      };
    case 'Legendaria':
      return {
        cardBackground: 'linear-gradient(165deg, #342107 0%, #1e1306 58%, #120b04 100%)',
        headerTint: 'rgba(250, 204, 21, 0.22)',
        accentColor: '#facc15',
        progressGradient: 'linear-gradient(90deg, #d97706 0%, #facc15 55%, #fef08a 100%)',
        buttonGradient: 'linear-gradient(180deg, #facc15 0%, #d97706 100%)',
        buttonLipColor: '#92400e',
        tensionIntensity: 0.85,
      };
    case 'Secreto':
      return {
        cardBackground: 'linear-gradient(165deg, #172337 0%, #0d1524 58%, #070b14 100%)',
        headerTint: 'rgba(148, 163, 184, 0.22)',
        accentColor: '#e2e8f0',
        progressGradient: 'linear-gradient(90deg, #475569 0%, #38bdf8 55%, #f8fafc 100%)',
        buttonGradient: 'linear-gradient(180deg, #64748b 0%, #334155 100%)',
        buttonLipColor: '#1e293b',
        tensionIntensity: 0.92,
      };
    case 'Secreto Abisal':
      return {
        cardBackground: 'linear-gradient(165deg, #062f42 0%, #051c2c 58%, #020e19 100%)',
        headerTint: 'rgba(34, 211, 238, 0.26)',
        accentColor: '#22d3ee',
        progressGradient: 'linear-gradient(90deg, #0891b2 0%, #22d3ee 55%, #cffafe 100%)',
        buttonGradient: 'linear-gradient(180deg, #22d3ee 0%, #0891b2 100%)',
        buttonLipColor: '#155e75',
        tensionIntensity: 1.0,
      };
  }
}

export function getMinigameParticleConfig(rarity: Rarity): MinigameParticleConfig {
  switch (rarity) {
    case 'Común':
      return {
        count: 6,
        intensity: 0.12,
        speed: 14,
        maxRadius: 2.0,
        maxAlpha: 0.24,
        glowShadow: '0 20px 45px rgba(15, 41, 66, 0.25)',
        borderColor: '#cbd5e1',
        colors: ['#94a3b8', '#cbd5e1'],
        twinkle: false,
      };
    case 'Rara':
      return {
        count: 10,
        intensity: 0.24,
        speed: 19,
        maxRadius: 2.4,
        maxAlpha: 0.34,
        glowShadow: '0 20px 48px rgba(3, 105, 161, 0.25)',
        borderColor: '#7dd3fc',
        colors: ['#38bdf8', '#7dd3fc', '#bae6fd'],
        twinkle: false,
      };
    case 'Épica':
      return {
        count: 16,
        intensity: 0.4,
        speed: 26,
        maxRadius: 2.8,
        maxAlpha: 0.45,
        glowShadow: '0 0 26px rgba(168, 85, 247, 0.28), 0 22px 50px rgba(15, 23, 42, 0.35)',
        borderColor: '#c084fc',
        colors: ['#a855f7', '#c084fc', '#e879f9'],
        twinkle: false,
      };
    case 'Mítica':
      return {
        count: 22,
        intensity: 0.56,
        speed: 34,
        maxRadius: 3.1,
        maxAlpha: 0.56,
        glowShadow: '0 0 32px rgba(244, 63, 94, 0.34), 0 24px 52px rgba(15, 23, 42, 0.38)',
        borderColor: '#fda4af',
        colors: ['#f43f5e', '#fb7185', '#fecdd3'],
        twinkle: true,
      };
    case 'Legendaria':
      return {
        count: 30,
        intensity: 0.72,
        speed: 44,
        maxRadius: 3.5,
        maxAlpha: 0.68,
        glowShadow: '0 0 38px rgba(245, 158, 11, 0.42), 0 24px 56px rgba(15, 23, 42, 0.42)',
        borderColor: '#fcd34d',
        colors: ['#f59e0b', '#facc15', '#fef08a'],
        twinkle: true,
      };
    case 'Secreto':
      return {
        count: 38,
        intensity: 0.86,
        speed: 54,
        maxRadius: 3.9,
        maxAlpha: 0.78,
        glowShadow: '0 0 44px rgba(56, 189, 248, 0.42), 0 24px 60px rgba(15, 23, 42, 0.5)',
        borderColor: '#64748b',
        colors: ['#38bdf8', '#94a3b8', '#e2e8f0'],
        twinkle: true,
      };
    case 'Secreto Abisal':
      return {
        count: 48,
        intensity: 1.0,
        speed: 66,
        maxRadius: 4.4,
        maxAlpha: 0.88,
        glowShadow: '0 0 54px rgba(6, 182, 212, 0.55), 0 26px 64px rgba(8, 145, 178, 0.45)',
        borderColor: '#22d3ee',
        colors: ['#06b6d4', '#22d3ee', '#a5f3fc', '#67e8f9'],
        twinkle: true,
      };
  }
}

export function getMinigameConfig(rarity: Rarity, weightFactor = 0.5) {
  const wf = Number.isFinite(weightFactor)
    ? Math.max(0, Math.min(1, weightFactor))
    : 0.5;
  const barTargetSeconds = rarity === 'Secreto Abisal' ? 10 : 5;
  const barTotalLimit =
    rarity === 'Secreto Abisal'
      ? Number((24 - wf * 4).toFixed(1))
      : Number((wf <= 0.5 ? 22 - wf * 4 : 20 - (wf - 0.5) * 9).toFixed(1));
  const maxMisses = rarity === 'Secreto Abisal' ? 0 : 2; // Secreto Abisal: solo 1 vida (0 fallos permitidos)
  const targetClicks =
    rarity === 'Común' ? 10 : rarity === 'Rara' ? 20 : 50; // Abisal = 50
  const clickDuration =
    rarity === 'Común'
      ? Number((10 - wf * 5).toFixed(1)) // 10.0s ligero -> 7.5s medio -> 5.0s pesado
      : rarity === 'Rara'
        ? Number((11.5 - wf * 4.5).toFixed(1)) // 11.5s ligero -> 9.2s medio -> 7.0s pesado
        : Number((23.5 - wf * 4).toFixed(1)); // Abisal: 23.5s -> 19.5s
  const targetDrops =
    rarity === 'Legendaria' ? 21 : rarity === 'Secreto' ? 25 : 20; // Abisal = 20
  const dropsDuration =
    rarity === 'Legendaria'
      ? Number((wf <= 0.5 ? 32 - wf * 4 : 30 - (wf - 0.5) * 9).toFixed(1))
      : rarity === 'Secreto Abisal'
        ? Number((26 - wf * 4).toFixed(1)) // Abisal: 26s -> 22s
        : Number((wf <= 0.5 ? 22 - wf * 4 : 20 - (wf - 0.5) * 5).toFixed(1));
  const barSpeedMultiplier = Number((0.9 + wf * 0.26).toFixed(3));
  const dropSpeedMultiplier = Number((0.9 + wf * 0.22).toFixed(3));
  // Slightly smaller drops (42px vs old 48px) and longer vertical travel path (-4% -> 96% in a taller 288px arena)
  const dropSizePx = 42;
  const dropStartY = -4;
  const dropGroundY = 96;
  const dropTravelSpanPct = dropGroundY - dropStartY; // 100% (up from 92%)
  const dropArenaHeightPx = 288; // h-64 (256px) / sm:h-72 (288px), up from h-56 (224px)
  return {
    barTargetSeconds,
    barTotalLimit,
    maxMisses,
    targetClicks,
    clickDuration,
    targetDrops,
    dropsDuration,
    barSpeedMultiplier,
    dropSpeedMultiplier,
    dropSizePx,
    dropStartY,
    dropGroundY,
    dropTravelSpanPct,
    dropArenaHeightPx,
  };
}

interface FishingMinigameProps {
  caught: CaughtPokemon;
  lang?: Language;
  hasGoldRod?: boolean;
  fightTelemetryRef?: React.MutableRefObject<FightTelemetry>;
  showFirstCatchTutorial?: boolean;
  onCompleteFirstCatchTutorial?: () => void;
  seenRarityTutorials?: readonly Rarity[];
  onDismissRarityTutorial?: (rarity: Rarity) => void;
  onSuccess: (caught: CaughtPokemon) => void;
  onFail: (reason?: FightFailReason) => void;
}

type StageType = 'clicks' | 'bar' | 'drops';

interface DropItem {
  id: number;
  x: number; // percentage 12..88
  y: number; // percentage 0..100
  speed: number;
}

const RarityMechanicVisual: React.FC<{
  diagram: RarityDiagramKind;
  accentColor: string;
}> = ({ diagram, accentColor }) => {
  if (diagram === 'clicks') {
    return (
      <div
        aria-hidden="true"
        className="w-11 h-11 rounded-xl bg-slate-950/85 border border-white/20 flex items-center justify-center shrink-0 shadow-inner"
      >
        <svg viewBox="0 0 40 40" className="w-8 h-8">
          <rect x="6" y="23" width="28" height="10" rx="5" fill={accentColor} opacity="0.9" />
          <path d="M20 7 V19 M15 14 L20 19 L25 14" stroke="#fde047" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </svg>
      </div>
    );
  }
  if (diagram === 'bar' || diagram === 'bar_fast') {
    return (
      <div
        aria-hidden="true"
        className="w-11 h-11 rounded-xl bg-slate-950/85 border border-white/20 flex items-center justify-center shrink-0 shadow-inner"
      >
        <svg viewBox="0 0 40 40" className="w-8 h-8">
          <rect x="14" y="4" width="12" height="32" rx="4" fill="#0f172a" stroke="#64748b" strokeWidth="1.5" />
          <rect x="15.5" y="13" width="9" height="13" rx="2" fill="#10b981" opacity="0.55" stroke="#34d399" strokeWidth="1.2" />
          <rect x="15" y="18" width="10" height="3.2" rx="1.5" fill="#fde047" />
          {diagram === 'bar_fast' && (
            <path d="M31 11 L28 19 H32 L29 28" stroke="#fb7185" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          )}
        </svg>
      </div>
    );
  }
  if (diagram === 'drops' || diagram === 'drops_fast') {
    return (
      <div
        aria-hidden="true"
        className="w-11 h-11 rounded-xl bg-slate-950/85 border border-white/20 flex items-center justify-center shrink-0 shadow-inner"
      >
        <svg viewBox="0 0 40 40" className="w-8 h-8">
          <path d="M14 9 C14 9 9 16 9 19 A5 5 0 0 0 19 19 C19 16 14 9 14 9 Z" fill="#38bdf8" stroke="#e0f2fe" strokeWidth="1.2" />
          <path d="M27 16 C27 16 22 22 22 25 A5 5 0 0 0 32 25 C32 22 27 16 27 16 Z" fill={accentColor} stroke="#ffffff" strokeWidth="1.2" />
          <line x1="6" y1="34" x2="34" y2="34" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </div>
    );
  }
  return (
    <div
      aria-hidden="true"
      className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#083344] to-[#0f172a] border border-[#22d3ee]/60 flex items-center justify-center shrink-0 shadow-inner"
    >
      <svg viewBox="0 0 40 40" className="w-8 h-8">
        <circle cx="10" cy="20" r="5" fill="#38bdf8" />
        <circle cx="20" cy="20" r="5" fill="#22c55e" />
        <circle cx="30" cy="20" r="5" fill="#22d3ee" />
        <text x="10" y="22.5" textAnchor="middle" fontSize="6.5" fontWeight="900" fill="#0f172a">1</text>
        <text x="20" y="22.5" textAnchor="middle" fontSize="6.5" fontWeight="900" fill="#0f172a">2</text>
        <text x="30" y="22.5" textAnchor="middle" fontSize="6.5" fontWeight="900" fill="#0f172a">3</text>
      </svg>
    </div>
  );
};

export const FishingMinigame: React.FC<FishingMinigameProps> = ({
  caught,
  lang = 'en',
  hasGoldRod = false,
  fightTelemetryRef,
  showFirstCatchTutorial = false,
  onCompleteFirstCatchTutorial,
  seenRarityTutorials = [],
  onDismissRarityTutorial,
  onSuccess,
  onFail,
}) => {
  const rarity = caught.species.rarity;
  const weightKg =
    typeof caught.weightKg === 'number' && Number.isFinite(caught.weightKg)
      ? caught.weightKg
      : getSpeciesWeightRange(caught.species).minKg;
  const weightFactor = getSpeciesWeightFactor(caught.species, weightKg);
  const weightLabel = formatFishWeight(weightKg, lang);
  const minigameCfg = getMinigameConfig(rarity, weightFactor);
  const rCfg = RARITIES[rarity];
  const particleCfg = getMinigameParticleConfig(rarity);
  const themeCfg = getMinigameTheme(rarity);
  const fightProfile = getRarityFightProfile(rarity, weightFactor);
  const particleCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const cardMotionRef = useRef<HTMLDivElement | null>(null);
  const recoilTimeoutRef = useRef<number | null>(null);
  const reducedMotionRef = useRef(false);

  // Live fight arena DOM refs (updated at 60fps with ZERO React re-renders)
  const arenaLinePathRef = useRef<SVGPathElement | null>(null);
  const arenaFishMarkerRef = useRef<HTMLDivElement | null>(null);
  const arenaTensionFillRef = useRef<HTMLDivElement | null>(null);
  const arenaStatusBadgeRef = useRef<HTMLSpanElement | null>(null);

  // Shared real-time fight state refs
  const tensionRef = useRef(0.28);
  const distanceRef = useRef(0.44);
  const pullPulseRef = useRef(0);
  const fishPullingRef = useRef(false);
  const lastTugSoundAtRef = useRef(0);
  const failTriggeredRef = useRef(false);
  const failTimeoutRef = useRef<number | null>(null);
  const [failSequence, setFailSequence] = useState<FightFailReason>('none');

  // Guided paused tutorial on the player's very first catch (0 catches)
  const [guideStep, setGuideStep] = useState<number>(() =>
    showFirstCatchTutorial ? 1 : 0
  );
  // First-time per-rarity explanation (Común covered by initial first-catch tutorial)
  const [rarityIntroOpen, setRarityIntroOpen] = useState<boolean>(() =>
    shouldShowRarityFirstTimeTutorial(rarity, seenRarityTutorials)
  );
  const activeRarityTutorial =
    guideStep === 0 && rarityIntroOpen ? getRarityTutorialInfo(rarity, lang) : null;
  const isGuidePaused = guideStep > 0 || activeRarityTutorial !== null;
  const isGuidePausedRef = useRef(isGuidePaused);
  isGuidePausedRef.current = isGuidePaused;

  // Keep latest callbacks in refs so parent 1s timers never restart minigame effects
  const onSuccessRef = useRef(onSuccess);
  const onFailRef = useRef(onFail);
  const onCompleteGuideRef = useRef(onCompleteFirstCatchTutorial);
  const onDismissRarityTutorialRef = useRef(onDismissRarityTutorial);
  onSuccessRef.current = onSuccess;
  onFailRef.current = onFail;
  onCompleteGuideRef.current = onCompleteFirstCatchTutorial;
  onDismissRarityTutorialRef.current = onDismissRarityTutorial;

  useEffect(() => {
    reducedMotionRef.current =
      typeof window !== 'undefined' &&
      Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);

    if (fightTelemetryRef) {
      fightTelemetryRef.current = {
        active: true,
        tension: 0.32,
        distance: 0.42,
        pullPulse: 0,
        fishPulling: false,
        rarity,
        weightFactor,
        failReason: 'none',
        failTimestamp: 0,
      };
    }

    return () => {
      if (recoilTimeoutRef.current !== null) {
        window.clearTimeout(recoilTimeoutRef.current);
      }
      if (failTimeoutRef.current !== null) {
        window.clearTimeout(failTimeoutRef.current);
      }
      if (fightTelemetryRef && !failTriggeredRef.current) {
        fightTelemetryRef.current.active = false;
      }
    };
  }, [fightTelemetryRef, rarity, weightFactor]);

  const syncFightArenaVisuals = useCallback(
    (
      elapsedSec: number,
      tension: number,
      distance: number,
      fishPulling: boolean,
      dangerMode: 'safe' | 'snap_risk' | 'escape_risk'
    ) => {
      // Update shared canvas telemetry ref (0 allocation)
      if (fightTelemetryRef) {
        const ft = fightTelemetryRef.current;
        ft.tension = tension;
        ft.distance = distance;
        ft.pullPulse = pullPulseRef.current;
        ft.fishPulling = fishPulling;
        ft.rarity = rarity;
        ft.weightFactor = weightFactor;
      }

      // Position struggling fish along the 12%..92% fight track
      const fishPct = 14 + Math.max(0, Math.min(1, distance)) * 78;
      const thrashY =
        Math.sin(elapsedSec * fightProfile.thrashFreq) * (1.8 + tension * 3.2);
      const fishTilt =
        Math.cos(elapsedSec * (fightProfile.thrashFreq * 0.85)) *
        (6 + tension * 10);

      if (arenaFishMarkerRef.current) {
        arenaFishMarkerRef.current.style.left = `${fishPct.toFixed(1)}%`;
        arenaFishMarkerRef.current.style.transform = `translate(-50%, calc(-50% + ${thrashY.toFixed(1)}px)) rotate(${fishTilt.toFixed(1)}deg)`;
      }

      // Dynamic wavy/taut SVG line from rod tip (8, 22) to fish position
      if (arenaLinePathRef.current) {
        const endX = (fishPct / 100) * 320;
        const endY = 22 + thrashY;
        const midX = (12 + endX) * 0.5;
        const sagOrVib =
          tension >= 0.65
            ? Math.sin(elapsedSec * 52) * (1.5 + tension * 2.5)
            : (1 - tension) * 7 + Math.sin(elapsedSec * 16) * 2;
        const ctrlY = Math.max(4, Math.min(40, (22 + endY) * 0.5 + sagOrVib));
        arenaLinePathRef.current.setAttribute(
          'd',
          `M 12 22 Q ${midX.toFixed(1)} ${ctrlY.toFixed(1)} ${endX.toFixed(1)} ${endY.toFixed(1)}`
        );
        const lineColor =
          tension >= 0.78
            ? '#ef4444'
            : tension >= 0.56
              ? '#fbbf24'
              : '#bae6fd';
        arenaLinePathRef.current.setAttribute('stroke', lineColor);
        arenaLinePathRef.current.setAttribute(
          'stroke-width',
          (1.8 + tension * 1.4).toFixed(2)
        );
      }

      if (arenaTensionFillRef.current) {
        arenaTensionFillRef.current.style.transform = `scaleX(${Math.max(0.05, Math.min(1, tension)).toFixed(3)})`;
        arenaTensionFillRef.current.style.backgroundColor =
          tension >= 0.78
            ? '#ef4444'
            : tension >= 0.56
              ? '#f59e0b'
              : '#38bdf8';
      }

      if (arenaStatusBadgeRef.current) {
        const badge = arenaStatusBadgeRef.current;
        if (dangerMode === 'snap_risk') {
          badge.textContent =
            lang === 'en' ? 'SNAP RISK! EASE UP!' : '¡PELIGRO! ¡SE ROMPE!';
          badge.style.color = '#fecaca';
          badge.style.backgroundColor = 'rgba(220, 38, 38, 0.45)';
          badge.style.borderColor = '#f87171';
        } else if (dangerMode === 'escape_risk') {
          badge.textContent =
            lang === 'en' ? 'PULLING AWAY!' : '¡SE ESTÁ ALEJANDO!';
          badge.style.color = '#fde68a';
          badge.style.backgroundColor = 'rgba(217, 119, 6, 0.42)';
          badge.style.borderColor = '#fbbf24';
        } else if (fishPulling) {
          badge.textContent =
            lang === 'en' ? 'FISH SURGING!' : '¡EL PEZ TIRA!';
          badge.style.color = '#fed7aa';
          badge.style.backgroundColor = 'rgba(234, 88, 12, 0.35)';
          badge.style.borderColor = '#fb923c';
        } else {
          badge.textContent =
            lang === 'en' ? 'LINE TENSION OK' : 'TENSIÓN ESTABLE';
          badge.style.color = '#bae6fd';
          badge.style.backgroundColor = 'rgba(14, 116, 144, 0.32)';
          badge.style.borderColor = 'rgba(125, 211, 252, 0.4)';
        }
      }
    },
    [fightTelemetryRef, rarity, weightFactor, fightProfile.thrashFreq, lang]
  );

  const triggerFailSequence = useCallback(
    (reason: Exclude<FightFailReason, 'none'>) => {
      if (failTriggeredRef.current) return;
      failTriggeredRef.current = true;
      setFailSequence(reason);

      if (fightTelemetryRef) {
        fightTelemetryRef.current.active = false;
        fightTelemetryRef.current.failReason = reason;
        fightTelemetryRef.current.failTimestamp = performance.now();
        fightTelemetryRef.current.tension = reason === 'line_snapped' ? 1 : tensionRef.current;
        fightTelemetryRef.current.distance = reason === 'fish_escaped' ? 1 : distanceRef.current;
      }

      if (reason === 'line_snapped') {
        sound.playLineSnap();
      } else {
        sound.playMiss();
      }

      if (!reducedMotionRef.current && cardMotionRef.current) {
        cardMotionRef.current.style.transform =
          reason === 'line_snapped'
            ? 'translate3d(-5px, 4px, 0) scale(0.98)'
            : 'translate3d(4px, 0, 0)';
        window.setTimeout(() => {
          if (cardMotionRef.current) {
            cardMotionRef.current.style.transform = 'translate3d(0, 0, 0) scale(1)';
          }
        }, 120);
      }

      failTimeoutRef.current = window.setTimeout(() => {
        onFailRef.current(reason);
      }, 860);
    },
    [fightTelemetryRef]
  );

  const triggerPullRecoil = useCallback(
    (strength = 1) => {
      if (reducedMotionRef.current || !cardMotionRef.current) return;
      const amp = (1.5 + themeCfg.tensionIntensity * 2.1) * strength;
      const dx = (Math.random() - 0.5) * amp * 2;
      const dy = amp * 0.75;
      cardMotionRef.current.style.transform = `translate3d(${dx.toFixed(1)}px, ${dy.toFixed(1)}px, 0) scale(0.992)`;
      if (recoilTimeoutRef.current !== null) {
        window.clearTimeout(recoilTimeoutRef.current);
      }
      recoilTimeoutRef.current = window.setTimeout(() => {
        if (cardMotionRef.current) {
          cardMotionRef.current.style.transform = 'translate3d(0, 0, 0) scale(1)';
        }
        recoilTimeoutRef.current = null;
      }, 75);
    },
    [themeCfg.tensionIntensity]
  );

  // Lightweight zero-allocation ambient particle canvas driven by fish rarity
  useEffect(() => {
    const canvas = particleCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let width = 440;
    let height = 360;

    const syncSize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const rect = parent.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      width = rect.width;
      height = rect.height;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    syncSize();
    const ro =
      typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(() => syncSize())
        : null;
    if (ro && canvas.parentElement) {
      ro.observe(canvas.parentElement);
    }

    const particles = Array.from({ length: particleCfg.count }, (_, idx) => ({
      x: ((idx * 73 + 19) % 100) / 100,
      y: ((idx * 41 + 7) % 100) / 100,
      vx: (((idx % 7) - 3) * 0.015),
      vy: -(0.45 + ((idx % 5) * 0.14)),
      radius: 1.1 + ((idx * 17) % 100) / 100 * (particleCfg.maxRadius - 1.1),
      phase: idx * 0.9,
      color: particleCfg.colors[idx % particleCfg.colors.length],
    }));

    let raf = 0;
    let last = performance.now();
    let elapsed = 0;

    const draw = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      elapsed += dt;

      ctx.clearRect(0, 0, width, height);

      if (particleCfg.intensity >= 0.24) {
        const pulse = 0.78 + 0.22 * Math.sin(elapsed * (2.2 + particleCfg.intensity * 2.5));
        const aura = ctx.createRadialGradient(
          width * 0.5,
          height * 0.16,
          10,
          width * 0.5,
          height * 0.35,
          Math.max(width, height) * 0.76
        );
        aura.addColorStop(0, `${particleCfg.colors[0]}2e`);
        aura.addColorStop(1, 'rgba(7, 19, 36, 0)');
        ctx.globalAlpha = Math.max(0.28, particleCfg.intensity * 0.65) * pulse;
        ctx.fillStyle = aura;
        ctx.fillRect(0, 0, width, height);
      }

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.x += p.vx * dt + Math.sin(elapsed * 1.4 + p.phase) * 0.018 * dt;
        p.y += (p.vy * particleCfg.speed * dt) / Math.max(160, height);

        if (p.y < -0.05) {
          p.y = 1.05;
          p.x = ((i * 37 + elapsed * 13) % 100) / 100;
        }
        if (p.x < -0.05) p.x = 1.05;
        if (p.x > 1.05) p.x = -0.05;

        const px = p.x * width;
        const py = p.y * height;
        const edgeFade = Math.sin(Math.min(1, Math.max(0, p.y)) * Math.PI);
        const twinkleFactor = particleCfg.twinkle
          ? 0.55 + 0.45 * Math.sin(elapsed * 4.5 + p.phase)
          : 0.85;
        const alpha = particleCfg.maxAlpha * Math.max(0.18, edgeFade) * twinkleFactor;

        ctx.globalAlpha = alpha;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(px, py, p.radius, 0, Math.PI * 2);
        ctx.fill();

        if (particleCfg.twinkle && p.radius >= particleCfg.maxRadius * 0.72) {
          const glint = p.radius * 1.9;
          ctx.globalAlpha = alpha * 0.75;
          ctx.beginPath();
          ctx.moveTo(px - glint, py);
          ctx.lineTo(px + glint, py);
          ctx.moveTo(px, py - glint);
          ctx.lineTo(px, py + glint);
          ctx.strokeStyle = p.color;
          ctx.lineWidth = 0.9;
          ctx.stroke();
        }
      }

      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      ro?.disconnect();
    };
  }, [particleCfg]);

  const stages: StageType[] =
    rarity === 'Común' || rarity === 'Rara'
      ? ['clicks']
      : rarity === 'Épica' || rarity === 'Mítica'
        ? ['bar']
        : rarity === 'Legendaria' || rarity === 'Secreto'
          ? ['drops']
          : ['clicks', 'bar', 'drops']; // Secreto Abisal

  const [stageIdx, setStageIdx] = useState(0);
  const currentStage = stages[stageIdx];

  // --- STAGE 1: CLICKS ---
  const targetClicks = minigameCfg.targetClicks;
  const clickDuration = minigameCfg.clickDuration;
  const [clicks, setClicks] = useState(0);
  const [clickTimeLeft, setClickTimeLeft] = useState(clickDuration);
  const clickTimeLeftRef = useRef(clickDuration);
  clickTimeLeftRef.current = clickTimeLeft;
  const clicksCountRef = useRef(0);
  const clicksEndedRef = useRef(false);
  const usedPointerClickRef = useRef(false);

  useEffect(() => {
    if (currentStage !== 'clicks') return;
    clicksCountRef.current = 0;
    clicksEndedRef.current = false;
    tensionRef.current = 0.26 + weightFactor * 0.08;
    distanceRef.current = 0.44;
    pullPulseRef.current = 0;
    fishPullingRef.current = false;
    setClicks(0);
    setClickTimeLeft(clickDuration);
    clickTimeLeftRef.current = clickDuration;

    if (isGuidePaused) {
      syncFightArenaVisuals(0, tensionRef.current, distanceRef.current, false, 'safe');
      return;
    }

    const id = window.setInterval(() => {
      if (failTriggeredRef.current || isGuidePausedRef.current) return;
      setClickTimeLeft((t) => {
        if (t <= 0.1) {
          window.clearInterval(id);
          if (!clicksEndedRef.current) {
            clicksEndedRef.current = true;
            triggerFailSequence('fish_escaped');
          }
          clickTimeLeftRef.current = 0;
          return 0;
        }
        const nextVal = Number((t - 0.1).toFixed(1));
        clickTimeLeftRef.current = nextVal;
        return nextVal;
      });
    }, 100);

    // 60fps live tug-of-war physics for clicks stage (connects TENSION + ESC genuinely)
    let last = performance.now();
    let elapsed = 0;
    let raf = 0;
    const stepArena = (now: number) => {
      if (clicksEndedRef.current || failTriggeredRef.current || isGuidePausedRef.current) return;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      elapsed += dt;

      const cyclePos = elapsed % fightProfile.surgeInterval;
      // Surges occur at the end of each cycle so the fight always begins calmly and predictably
      const fishPulling =
        cyclePos >= fightProfile.surgeInterval - fightProfile.surgeDuration;
      fishPullingRef.current = fishPulling;

      pullPulseRef.current = Math.max(0, pullPulseRef.current - dt * 3.8);

      const clickStep = stepFightClickDynamics({
        tension: tensionRef.current,
        distance: distanceRef.current,
        fishPulling,
        didClick: false,
        dt,
        rarity,
        weightFactor,
        urgentTime: clickTimeLeftRef.current <= 3.0,
        hasGoldRod,
      });

      tensionRef.current = clickStep.tension;
      distanceRef.current = clickStep.distance;

      syncFightArenaVisuals(
        elapsed,
        clickStep.tension,
        clickStep.distance,
        fishPulling,
        clickStep.dangerType
      );

      if (clickStep.failed !== 'none') {
        clicksEndedRef.current = true;
        window.clearInterval(id);
        triggerFailSequence(clickStep.failed);
        return;
      }

      raf = requestAnimationFrame(stepArena);
    };
    raf = requestAnimationFrame(stepArena);

    return () => {
      window.clearInterval(id);
      cancelAnimationFrame(raf);
    };
  }, [
    currentStage,
    isGuidePaused,
    clickDuration,
    targetClicks,
    rarity,
    weightFactor,
    hasGoldRod,
    fightProfile.surgeInterval,
    fightProfile.surgeDuration,
    syncFightArenaVisuals,
    triggerFailSequence,
  ]);

  const handleFastClick = useCallback(() => {
    if (
      isGuidePausedRef.current ||
      clicksEndedRef.current ||
      failTriggeredRef.current ||
      currentStage !== 'clicks'
    ) {
      return;
    }

    const clickStep = stepFightClickDynamics({
      tension: tensionRef.current,
      distance: distanceRef.current,
      fishPulling: fishPullingRef.current,
      didClick: true,
      dt: 0,
      rarity,
      weightFactor,
      urgentTime: clickTimeLeftRef.current <= 3.0,
      hasGoldRod,
    });

    tensionRef.current = clickStep.tension;
    distanceRef.current = clickStep.distance;
    pullPulseRef.current = 1;

    if (clickStep.failed !== 'none') {
      clicksEndedRef.current = true;
      triggerFailSequence(clickStep.failed);
      return;
    }

    const next = clicksCountRef.current + 1;
    clicksCountRef.current = next;
    setClicks(next);

    const now = performance.now();
    if (now - lastTugSoundAtRef.current > 85) {
      lastTugSoundAtRef.current = now;
      sound.playReelTug(tensionRef.current);
    }

    triggerPullRecoil(next / targetClicks > 0.7 || tensionRef.current >= 0.74 ? 1.2 : 1);

    if (next >= targetClicks) {
      clicksEndedRef.current = true;
      if (stageIdx + 1 < stages.length) {
        setStageIdx((s) => s + 1);
      } else {
        if (fightTelemetryRef) fightTelemetryRef.current.active = false;
        onSuccessRef.current(caught);
      }
    }
  }, [
    currentStage,
    targetClicks,
    rarity,
    weightFactor,
    hasGoldRod,
    stageIdx,
    stages.length,
    caught,
    triggerPullRecoil,
    triggerFailSequence,
    fightTelemetryRef,
  ]);

  // --- STAGE 2: PRECISION BAR ---
  const baseBoxSize =
    rarity === 'Épica' ? 32 : rarity === 'Secreto Abisal' ? 24 : 20; // % of bar height
  const boxSize = baseBoxSize + (hasGoldRod ? 3 : 0);
  const barTargetSeconds = minigameCfg.barTargetSeconds;
  const barTotalLimit = minigameCfg.barTotalLimit;
  const holdingRef = useRef(false);
  const indicatorRef = useRef(50);
  const velocityRef = useRef(0);
  const boxTopRef = useRef(50 - boxSize / 2);
  const barBoxElRef = useRef<HTMLDivElement | null>(null);
  const barIndicatorElRef = useRef<HTMLDivElement | null>(null);
  const barTrackElRef = useRef<HTMLDivElement | null>(null);
  const barStatusElRef = useRef<HTMLSpanElement | null>(null);
  const barProgressTextRef = useRef<HTMLElement | null>(null);
  const barProgressFillRef = useRef<HTMLDivElement | null>(null);
  const barTimeTextRef = useRef<HTMLElement | null>(null);
  const barTimeFillRef = useRef<HTMLDivElement | null>(null);
  const barHoldBtnRef = useRef<HTMLButtonElement | null>(null);
  const barCardRef = useRef<HTMLDivElement | null>(null);
  const [barUrgent, setBarUrgent] = useState(false);

  useEffect(() => {
    if (currentStage !== 'bar') return;
    holdingRef.current = false;
    setBarUrgent(false);
    indicatorRef.current = 50;
    velocityRef.current = 0;
    boxTopRef.current = 50 - boxSize / 2;
    tensionRef.current = 0.36;
    distanceRef.current = 0.38;
    pullPulseRef.current = 0;

    if (barBoxElRef.current) {
      barBoxElRef.current.style.top = `${boxTopRef.current.toFixed(2)}%`;
    }
    if (barIndicatorElRef.current) {
      barIndicatorElRef.current.style.top = `calc(50% - 6px)`;
    }
    if (barProgressTextRef.current) {
      barProgressTextRef.current.textContent = `0.0s / ${barTargetSeconds}.0s`;
    }
    if (barProgressFillRef.current) {
      barProgressFillRef.current.style.transform = 'scaleX(0)';
    }
    if (barTimeTextRef.current) {
      barTimeTextRef.current.textContent = `${barTotalLimit}s`;
    }
    if (barTimeFillRef.current) {
      barTimeFillRef.current.style.transform = 'scaleX(1)';
      barTimeFillRef.current.style.backgroundColor = '#38bdf8';
    }

    if (isGuidePaused) {
      fishPullingRef.current = false;
      syncFightArenaVisuals(0, tensionRef.current, distanceRef.current, false, 'safe');
      return;
    }

    let last = performance.now();
    let raf = 0;
    let progress = 0;
    let elapsed = 0;
    let finished = false;
    let lastShownProgress = '';
    let lastShownTime = '';
    let prevInBox: boolean | null = null;
    let prevDangerMode: 'safe' | 'snap_risk' | 'escape_risk' | null = null;
    let prevTimeTier: 'ok' | 'warn' | 'urgent' = 'ok';
    let lastUrgentFlag = false;

    const isSlow = rarity === 'Épica';
    const isMitica = rarity === 'Mítica';
    const upAccel = isSlow ? -125 : isMitica ? -135 : -158;
    const downAccel =
      (isSlow ? 98 : isMitica ? 106 : 114) * (0.94 + weightFactor * 0.12);
    const maxVel = isSlow ? 90 : isMitica ? 96 : 108;
    const boxSpeed =
      (isSlow ? 1.15 : isMitica ? 1.55 : 1.72) * minigameCfg.barSpeedMultiplier;

    const tick = (now: number) => {
      if (finished || failTriggeredRef.current) return;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      elapsed += dt;

      const remaining = Math.max(0, barTotalLimit - elapsed);
      const timeRatio = Math.max(0, Math.min(1, remaining / barTotalLimit));
      const timeLabel = `${remaining.toFixed(1)}s`;
      if (timeLabel !== lastShownTime && barTimeTextRef.current) {
        lastShownTime = timeLabel;
        barTimeTextRef.current.textContent = timeLabel;
      }
      if (barTimeFillRef.current) {
        barTimeFillRef.current.style.transform = `scaleX(${timeRatio.toFixed(4)})`;
        const nextTier: 'ok' | 'warn' | 'urgent' =
          remaining <= 4.5 ? 'urgent' : remaining <= 9 ? 'warn' : 'ok';
        if (nextTier !== prevTimeTier) {
          prevTimeTier = nextTier;
          barTimeFillRef.current.style.backgroundColor =
            nextTier === 'urgent'
              ? '#ef4444'
              : nextTier === 'warn'
                ? '#f59e0b'
                : '#38bdf8';
        }
      }

      if (remaining <= 0) {
        finished = true;
        if (cardMotionRef.current) {
          cardMotionRef.current.style.transform = 'translate3d(0, 0, 0)';
        }
        triggerFailSequence('fish_escaped');
        return;
      }

      const nextBoxTop =
        50 - boxSize / 2 + Math.sin(elapsed * boxSpeed) * (42 - boxSize / 2);
      boxTopRef.current = nextBoxTop;
      if (barBoxElRef.current) {
        barBoxElRef.current.style.top = `${nextBoxTop.toFixed(2)}%`;
      }

      const cyclePos = elapsed % fightProfile.surgeInterval;
      const fishPulling =
        cyclePos >= fightProfile.surgeInterval - fightProfile.surgeDuration;
      fishPullingRef.current = fishPulling;

      const surgeDownDrag =
        (fishPulling ? 9 * (0.55 + weightFactor * 0.55) : 0) *
        (hasGoldRod ? 0.8 : 1);
      const accel = (holdingRef.current ? upAccel : downAccel) + surgeDownDrag;
      velocityRef.current += accel * dt;
      velocityRef.current = Math.max(-maxVel, Math.min(maxVel, velocityRef.current));
      indicatorRef.current += velocityRef.current * dt;

      if (indicatorRef.current < 4) {
        indicatorRef.current = 4;
        velocityRef.current = 0;
      } else if (indicatorRef.current > 96) {
        indicatorRef.current = 96;
        velocityRef.current = 0;
      }

      if (barIndicatorElRef.current) {
        barIndicatorElRef.current.style.top = `calc(${indicatorRef.current.toFixed(2)}% - 6px)`;
      }

      const inBox =
        indicatorRef.current >= boxTopRef.current &&
        indicatorRef.current <= boxTopRef.current + boxSize;

      const atTopCeiling = indicatorRef.current <= 7.5;
      const atBottomFloor = indicatorRef.current >= 92.5;
      const fightStep = stepFightBarDynamics({
        tension: tensionRef.current,
        distance: distanceRef.current,
        inBox,
        holding: holdingRef.current,
        atTopCeiling,
        atBottomFloor,
        dt,
        rarity,
        fishPulling,
        weightFactor,
        hasGoldRod,
      });

      tensionRef.current = fightStep.tension;
      distanceRef.current = fightStep.distance;
      pullPulseRef.current = holdingRef.current && inBox ? 0.65 : 0;

      const urgentNow =
        remaining <= 4.5 || fightStep.dangerType !== 'safe';
      if (urgentNow !== lastUrgentFlag) {
        lastUrgentFlag = urgentNow;
        setBarUrgent(urgentNow);
      }

      syncFightArenaVisuals(
        elapsed,
        fightStep.tension,
        fightStep.distance,
        fishPulling,
        fightStep.dangerType
      );

      if (fightStep.failed !== 'none') {
        finished = true;
        if (cardMotionRef.current) {
          cardMotionRef.current.style.transform = 'translate3d(0, 0, 0)';
        }
        triggerFailSequence(fightStep.failed);
        return;
      }

      if (inBox !== prevInBox || fightStep.dangerType !== prevDangerMode) {
        prevInBox = inBox;
        prevDangerMode = fightStep.dangerType;
        if (barTrackElRef.current) {
          barTrackElRef.current.style.borderColor =
            fightStep.dangerType === 'snap_risk'
              ? '#ef4444'
              : inBox
                ? '#34d399'
                : '#475569';
          barTrackElRef.current.style.boxShadow =
            fightStep.dangerType === 'snap_risk'
              ? '0 0 22px rgba(239, 68, 68, 0.55), inset 0 0 12px rgba(239, 68, 68, 0.25)'
              : inBox
                ? '0 0 20px rgba(16, 185, 129, 0.45), inset 0 0 12px rgba(16, 185, 129, 0.22)'
                : 'inset 0 2px 10px rgba(0, 0, 0, 0.55)';
        }
        if (barBoxElRef.current) {
          barBoxElRef.current.style.backgroundColor = inBox
            ? 'rgba(16, 185, 129, 0.48)'
            : 'rgba(16, 185, 129, 0.24)';
        }
        if (barIndicatorElRef.current) {
          barIndicatorElRef.current.style.backgroundColor =
            fightStep.dangerType === 'snap_risk'
              ? '#ef4444'
              : inBox
                ? '#fef08a'
                : '#f59e0b';
          barIndicatorElRef.current.style.boxShadow =
            fightStep.dangerType === 'snap_risk'
              ? '0 0 14px #ef4444'
              : inBox
                ? '0 0 12px #fef08a, 0 0 4px #ffffff'
                : '0 0 8px rgba(245, 158, 11, 0.75)';
        }
        if (barStatusElRef.current) {
          barStatusElRef.current.textContent =
            fightStep.dangerType === 'snap_risk'
              ? lang === 'en'
                ? 'EASE UP!'
                : '¡SUELTA!'
              : fightStep.dangerType === 'escape_risk'
                ? lang === 'en'
                  ? 'ESCAPING!'
                  : '¡SE ESCAPA!'
                : inBox
                  ? lang === 'en'
                    ? 'REELING IN!'
                    : '¡ENGANCHADO!'
                  : lang === 'en'
                    ? 'KEEP IN ZONE'
                    : 'MANTÉN EN ZONA';
          barStatusElRef.current.style.color =
            fightStep.dangerType === 'snap_risk'
              ? '#fca5a5'
              : fightStep.dangerType === 'escape_risk'
                ? '#fde68a'
                : inBox
                  ? '#6ee7b7'
                  : '#fbbf24';
        }
      }

      // Zero-re-render subtle fight micro-tremble under tension
      if (!reducedMotionRef.current && cardMotionRef.current) {
        const shakeAmp =
          (fightStep.dangerType !== 'safe'
            ? 2.1
            : !inBox
              ? 0.9
              : 0.35) * themeCfg.tensionIntensity;
        const jx = Math.sin(elapsed * 43) * shakeAmp;
        const jy = Math.cos(elapsed * 37) * (shakeAmp * 0.65);
        cardMotionRef.current.style.transform = `translate3d(${jx.toFixed(2)}px, ${jy.toFixed(2)}px, 0)`;
      }

      if (inBox) {
        progress += dt;
        const progLabel = `${progress.toFixed(1)}s / ${barTargetSeconds}.0s`;
        if (progLabel !== lastShownProgress && barProgressTextRef.current) {
          lastShownProgress = progLabel;
          barProgressTextRef.current.textContent = progLabel;
        }
        if (barProgressFillRef.current) {
          const ratio = Math.max(0, Math.min(1, progress / barTargetSeconds));
          barProgressFillRef.current.style.transform = `scaleX(${ratio.toFixed(4)})`;
        }
        if (progress >= barTargetSeconds) {
          finished = true;
          if (cardMotionRef.current) {
            cardMotionRef.current.style.transform = 'translate3d(0, 0, 0)';
          }
          if (stageIdx + 1 < stages.length) {
            setStageIdx((s) => s + 1);
          } else {
            if (fightTelemetryRef) fightTelemetryRef.current.active = false;
            onSuccessRef.current(caught);
          }
          return;
        }
      }

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => {
      finished = true;
      cancelAnimationFrame(raf);
      if (cardMotionRef.current) {
        cardMotionRef.current.style.transform = 'translate3d(0, 0, 0)';
      }
    };
  }, [
    currentStage,
    isGuidePaused,
    boxSize,
    barTargetSeconds,
    barTotalLimit,
    rarity,
    weightFactor,
    minigameCfg.barSpeedMultiplier,
    stageIdx,
    stages.length,
    caught,
    lang,
    themeCfg.tensionIntensity,
    fightProfile.surgeInterval,
    fightProfile.surgeDuration,
    syncFightArenaVisuals,
    triggerFailSequence,
    fightTelemetryRef,
  ]);

  // Keyboard support for Stage 1 (clicks) and Stage 2 (bar)
  useEffect(() => {
    const setHolding = (next: boolean) => {
      holdingRef.current = next;
      if (barHoldBtnRef.current) {
        if (next) {
          barHoldBtnRef.current.setAttribute('data-holding', 'true');
        } else {
          barHoldBtnRef.current.removeAttribute('data-holding');
        }
      }
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (failTriggeredRef.current || isGuidePausedRef.current) return;
      const isActionKey =
        e.code === 'Space' ||
        e.code === 'ArrowUp' ||
        e.code === 'KeyW' ||
        e.code === 'Enter';
      if (!isActionKey) return;

      if (currentStage === 'clicks') {
        e.preventDefault();
        if (!e.repeat) {
          handleFastClick();
        }
      } else if (currentStage === 'bar' && e.code !== 'Enter') {
        e.preventDefault();
        setHolding(true);
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (
        currentStage === 'bar' &&
        (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW')
      ) {
        setHolding(false);
      }
    };

    const onWindowBlur = () => {
      setHolding(false);
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onWindowBlur);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onWindowBlur);
      setHolding(false);
    };
  }, [currentStage, handleFastClick]);

  // --- STAGE 3: FALLING DROPS ---
  const targetDrops = minigameCfg.targetDrops;
  const maxMisses = minigameCfg.maxMisses;
  const dropsDuration = minigameCfg.dropsDuration;
  const dropStartY = minigameCfg.dropStartY;
  const dropGroundY = minigameCfg.dropGroundY;
  const dropSpawnMs =
    rarity === 'Legendaria' ? 520 : rarity === 'Secreto' ? 420 : 540;
  const dropMinSpeed =
    (rarity === 'Legendaria' ? 42 : rarity === 'Secreto' ? 54 : 39) *
    minigameCfg.dropSpeedMultiplier;
  const dropSpeedRange =
    rarity === 'Legendaria' ? 22 : rarity === 'Secreto' ? 24 : 15;

  const [dropsCaught, setDropsCaught] = useState(0);
  const [dropsMissed, setDropsMissed] = useState(0);
  const [dropsTimeLeft, setDropsTimeLeft] = useState(dropsDuration);
  const [drops, setDrops] = useState<DropItem[]>([]);
  const [missFlash, setMissFlash] = useState(false);

  const dropsRef = useRef<DropItem[]>([]);
  const dropElsRef = useRef<Map<number, HTMLButtonElement>>(new Map());
  const nextDropId = useRef(1);
  const dropsCaughtRef = useRef(0);
  const dropsMissedRef = useRef(0);
  const dropsEndedRef = useRef(false);
  const lastMissTimeRef = useRef(0);
  const spawnIntervalRef = useRef<number | null>(null);

  const createTopDrops = (): DropItem[] => [
    {
      id: nextDropId.current++,
      x: 18 + Math.random() * 28,
      y: dropStartY,
      speed: dropMinSpeed + Math.random() * dropSpeedRange,
    },
    {
      id: nextDropId.current++,
      x: 52 + Math.random() * 32,
      y: dropStartY - 10,
      speed: dropMinSpeed + Math.random() * dropSpeedRange,
    },
  ];

  const startSpawnInterval = () => {
    if (spawnIntervalRef.current) {
      window.clearInterval(spawnIntervalRef.current);
    }
    spawnIntervalRef.current = window.setInterval(() => {
      if (dropsEndedRef.current || failTriggeredRef.current) return;
      const spawned: DropItem = {
        id: nextDropId.current++,
        x: 12 + Math.random() * 76,
        y: dropStartY,
        speed: dropMinSpeed + Math.random() * dropSpeedRange,
      };
      dropsRef.current = [...dropsRef.current, spawned];
      setDrops(dropsRef.current);
    }, dropSpawnMs);
  };

  useEffect(() => {
    if (currentStage !== 'drops') return;
    dropsCaughtRef.current = 0;
    dropsMissedRef.current = 0;
    dropsEndedRef.current = false;
    dropsRef.current = [];
    tensionRef.current = 0.42;
    distanceRef.current = 0.52;
    pullPulseRef.current = 0;
    setDropsCaught(0);
    setDropsMissed(0);
    setDropsTimeLeft(dropsDuration);
    setDrops([]);

    if (isGuidePaused) {
      fishPullingRef.current = false;
      syncFightArenaVisuals(0, tensionRef.current, distanceRef.current, false, 'safe');
      return;
    }

    const firstDrop: DropItem = {
      id: nextDropId.current++,
      x: 24 + Math.random() * 52,
      y: 2,
      speed: dropMinSpeed + Math.random() * dropSpeedRange,
    };
    dropsRef.current = [firstDrop];
    setDrops(dropsRef.current);
    startSpawnInterval();

    const timerInterval = window.setInterval(() => {
      if (dropsEndedRef.current || failTriggeredRef.current) return;
      setDropsTimeLeft((t) => {
        if (t <= 0.1) {
          dropsEndedRef.current = true;
          window.clearInterval(timerInterval);
          if (spawnIntervalRef.current) window.clearInterval(spawnIntervalRef.current);
          if (dropsCaughtRef.current >= targetDrops) {
            if (fightTelemetryRef) fightTelemetryRef.current.active = false;
            onSuccessRef.current(caught);
          } else {
            triggerFailSequence('fish_escaped');
          }
          return 0;
        }
        return Number((t - 0.1).toFixed(1));
      });
    }, 100);

    let last = performance.now();
    let elapsed = 0;
    let raf = 0;
    const step = (now: number) => {
      if (dropsEndedRef.current || failTriggeredRef.current) return;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      elapsed += dt;

      const list = dropsRef.current;
      let missedNow = 0;
      let removedAny = false;
      for (let i = 0; i < list.length; i++) {
        const d = list[i];
        d.y += d.speed * dt;
        if (d.y >= dropGroundY) {
          missedNow += 1;
          removedAny = true;
        } else {
          const el = dropElsRef.current.get(d.id);
          if (el) {
            el.style.top = `${d.y.toFixed(2)}%`;
          }
        }
      }

      if (removedAny) {
        const remaining = list.filter((d) => d.y < dropGroundY);
        dropsRef.current = remaining;
        setDrops(remaining);
        if (missedNow > 0 && !dropsEndedRef.current) {
          dropsMissedRef.current += missedNow;
          setDropsMissed(dropsMissedRef.current);
          tensionRef.current = Math.min(0.95, tensionRef.current + 0.25);
          distanceRef.current = Math.min(0.96, distanceRef.current + 0.2);
          if (dropsMissedRef.current > maxMisses) {
            dropsEndedRef.current = true;
            triggerFailSequence('fish_escaped');
            return;
          }
        }
      }

      // Live fight arena feedback during drops stage (connected to tension & ESC)
      const cyclePos = elapsed % fightProfile.surgeInterval;
      const fishPulling =
        cyclePos >= fightProfile.surgeInterval - fightProfile.surgeDuration;
      fishPullingRef.current = fishPulling;
      pullPulseRef.current = Math.max(0, pullPulseRef.current - dt * 3.5);

      const missRatio = dropsMissedRef.current / (maxMisses + 1);
      const targetTension = Math.min(
        0.94,
        0.28 + weightFactor * 0.1 + missRatio * 0.44 + (fishPulling ? 0.16 : 0)
      );
      tensionRef.current += (targetTension - tensionRef.current) * Math.min(1, dt * 3.2);

      // Fish steadily tries to swim away unless drops are caught steadily
      const swimAway =
        (fightProfile.pullBackSpeed * 0.35 + (fishPulling ? 0.045 : 0.015)) * dt;
      distanceRef.current = Math.min(1, distanceRef.current + swimAway);

      if (distanceRef.current >= 1 && !dropsEndedRef.current) {
        dropsEndedRef.current = true;
        triggerFailSequence('fish_escaped');
        return;
      }

      const dangerMode: 'safe' | 'snap_risk' | 'escape_risk' =
        dropsMissedRef.current >= maxMisses || tensionRef.current >= 0.74
          ? 'snap_risk'
          : distanceRef.current >= 0.74
            ? 'escape_risk'
            : 'safe';

      syncFightArenaVisuals(
        elapsed,
        tensionRef.current,
        distanceRef.current,
        fishPulling,
        dangerMode
      );

      raf = requestAnimationFrame(step);
    };

    raf = requestAnimationFrame(step);
    return () => {
      dropsEndedRef.current = true;
      if (spawnIntervalRef.current) window.clearInterval(spawnIntervalRef.current);
      window.clearInterval(timerInterval);
      cancelAnimationFrame(raf);
    };
  }, [
    currentStage,
    isGuidePaused,
    targetDrops,
    maxMisses,
    dropsDuration,
    dropStartY,
    dropGroundY,
    dropSpawnMs,
    dropMinSpeed,
    dropSpeedRange,
    caught,
    fightProfile.surgeInterval,
    fightProfile.surgeDuration,
    syncFightArenaVisuals,
    triggerFailSequence,
    fightTelemetryRef,
  ]);

  const handleCatchDrop = (e: React.PointerEvent, id: number) => {
    e.stopPropagation();
    if (isGuidePausedRef.current || dropsEndedRef.current || failTriggeredRef.current) return;
    triggerPullRecoil(0.65);
    pullPulseRef.current = 0.85;
    distanceRef.current = Math.max(0.06, distanceRef.current - 0.11);
    tensionRef.current = Math.max(0.22, tensionRef.current - 0.04);
    sound.playReelTug(tensionRef.current);

    dropsRef.current = dropsRef.current.filter((d) => d.id !== id);
    dropElsRef.current.delete(id);
    setDrops(dropsRef.current);
    dropsCaughtRef.current += 1;
    setDropsCaught(dropsCaughtRef.current);
    if (dropsCaughtRef.current >= targetDrops) {
      dropsEndedRef.current = true;
      if (fightTelemetryRef) fightTelemetryRef.current.active = false;
      onSuccessRef.current(caught);
    }
  };

  const handleMissClick = (e?: React.PointerEvent) => {
    if (e) {
      e.stopPropagation();
    }
    if (
      isGuidePausedRef.current ||
      dropsEndedRef.current ||
      failTriggeredRef.current ||
      currentStage !== 'drops'
    ) {
      return;
    }
    const now = performance.now();
    if (now - lastMissTimeRef.current < 280) return;
    lastMissTimeRef.current = now;

    dropsMissedRef.current += 1;
    setDropsMissed(dropsMissedRef.current);
    setMissFlash(true);
    setTimeout(() => setMissFlash(false), 350);

    tensionRef.current = Math.min(0.98, tensionRef.current + 0.3);
    distanceRef.current = Math.min(0.95, distanceRef.current + 0.18);

    if (dropsMissedRef.current > maxMisses) {
      dropsEndedRef.current = true;
      triggerFailSequence('line_snapped');
      return;
    }

    startSpawnInterval();
    const fresh = createTopDrops();
    dropsRef.current = fresh;
    dropElsRef.current.clear();
    setDrops(fresh);
  };

  // Urgency state across stages
  const clickProgressRatio = Math.min(1, clicks / targetClicks);
  const clickTimeRatio = Math.max(0, Math.min(1, clickTimeLeft / clickDuration));
  const clickUrgent = currentStage === 'clicks' && clickTimeLeft <= 3.5;
  const clickWarn =
    currentStage === 'clicks' && !clickUrgent && clickTimeLeft <= clickDuration * 0.55;

  const dropsProgressRatio = Math.min(1, dropsCaught / targetDrops);
  const dropsTimeRatio = Math.max(0, Math.min(1, dropsTimeLeft / dropsDuration));
  const dropsUrgent =
    currentStage === 'drops' &&
    (dropsTimeLeft <= 5 || dropsMissed >= maxMisses);

  const isAnyUrgent =
    failSequence !== 'none' ||
    clickUrgent ||
    (currentStage === 'bar' && barUrgent) ||
    dropsUrgent;

  const totalLives = maxMisses + 1;
  const remainingLives = Math.max(0, totalLives - dropsMissed);

  return (
    <div
      className="fixed inset-0 bg-[#051020]/50 backdrop-blur-[2px] flex items-center justify-center p-4 z-40 animate-ui-backdrop select-none"
    >
      <div
        ref={barCardRef}
        data-rarity={rarity}
        style={{
          background: themeCfg.cardBackground,
          borderColor: isAnyUrgent ? '#ef4444' : particleCfg.borderColor,
          boxShadow: isAnyUrgent ? undefined : particleCfg.glowShadow,
        }}
        className={`relative overflow-hidden w-full max-w-md max-h-[92vh] overflow-y-auto rounded-2xl border-2 p-5 text-white animate-ui-modal-in transition-colors duration-200 ${
          isAnyUrgent ? 'animate-fight-urgent' : ''
        }`}
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-28"
          style={{
            background: `radial-gradient(ellipse at 50% 0%, ${
              isAnyUrgent ? 'rgba(239, 68, 68, 0.34)' : themeCfg.headerTint
            } 0%, transparent 72%)`,
          }}
        />
        <canvas
          ref={particleCanvasRef}
          data-testid="minigame-particles"
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 w-full h-full z-0"
        />

        {/* Line Snapped / Fish Escaped Visual Overlay */}
        {failSequence !== 'none' && (
          <div
            data-testid="fight-fail-overlay"
            className="absolute inset-0 z-30 bg-[#080f1e]/88 backdrop-blur-xs flex flex-col items-center justify-center gap-3 p-6 text-center animate-ui-pop"
          >
            {failSequence === 'line_snapped' ? (
              <svg viewBox="0 0 120 60" className="w-28 h-14 overflow-visible" aria-hidden="true">
                <path
                  d="M 8 44 Q 34 14 54 28"
                  fill="none"
                  stroke="#f87171"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                />
                <path
                  d="M 68 32 Q 92 42 112 18"
                  fill="none"
                  stroke="#fca5a5"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeDasharray="4 3"
                />
                <polygon
                  points="60,14 63,24 73,21 65,29 74,36 63,34 60,44 57,34 46,36 55,29 47,21 57,24"
                  fill="#fef08a"
                />
              </svg>
            ) : (
              <svg viewBox="0 0 120 60" className="w-28 h-14 overflow-visible" aria-hidden="true">
                <line x1="12" y1="24" x2="48" y2="24" stroke="#7dd3fc" strokeWidth="2.5" strokeLinecap="round" />
                <line x1="18" y1="36" x2="54" y2="36" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" />
                <path
                  d="M 64 30 C 74 16, 94 16, 104 30 C 94 44, 74 44, 64 30 Z"
                  fill="#38bdf8"
                  stroke="#e0f2fe"
                  strokeWidth="2"
                />
                <polygon points="66,30 54,21 54,39" fill="#0284c7" />
              </svg>
            )}
            <div className="font-display font-extrabold text-2xl tracking-wide text-[#fecaca]">
              {failSequence === 'line_snapped'
                ? lang === 'en'
                  ? 'LINE SNAPPED!'
                  : '¡SEDAL ROTO!'
                : lang === 'en'
                  ? 'FISH ESCAPED!'
                  : '¡EL PEZ SE ESCAPÓ!'}
            </div>
            <p className="text-xs font-semibold text-slate-300 max-w-xs">
              {failSequence === 'line_snapped'
                ? lang === 'en'
                  ? 'Too much tension on the rod! Watch the red danger zone.'
                  : 'Demasiada tensión en la caña. Cuidado con la zona roja.'
                : lang === 'en'
                  ? 'The fish pulled too far away and slipped the hook.'
                  : 'El pez tiró demasiado lejos y se soltó del anzuelo.'}
            </p>
          </div>
        )}

        <div
          ref={cardMotionRef}
          style={{ transition: 'transform 75ms cubic-bezier(0.22, 1, 0.36, 1)' }}
          className="relative z-10 flex flex-col gap-3.5 will-change-transform"
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className="text-xs font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-lg border border-white/25 shadow-sm"
                  style={{ color: rCfg.color, backgroundColor: rCfg.bgColor }}
                >
                  {getRarityName(rarity, lang)}
                </span>
                <span
                  data-testid="minigame-weight-badge"
                  className={`text-xs font-extrabold tabular-nums px-2 py-0.5 rounded-lg border ${
                    weightFactor >= 0.72
                      ? 'bg-amber-500/25 border-amber-300/70 text-amber-100'
                      : 'bg-white/10 border-white/20 text-sky-100'
                  }`}
                >
                  ⚖️ {weightLabel}
                </span>
                {isGuidePaused && (
                  <span
                    data-testid="minigame-paused-pill"
                    className="text-[11px] font-black uppercase tracking-wider px-2 py-0.5 rounded-lg bg-amber-400 text-[#1e1b4b] border border-white shadow"
                  >
                    {guideStep > 0
                      ? lang === 'en'
                        ? `⏸ Paused · ${guideStep}/3`
                        : `⏸ En pausa · ${guideStep}/3`
                      : lang === 'en'
                        ? '⏸ Paused · Rarity Guide'
                        : '⏸ En pausa · Nueva rareza'}
                  </span>
                )}
                {isAnyUrgent && !isGuidePaused && (
                  <span className="text-[11px] font-black uppercase tracking-wider px-2 py-0.5 rounded-lg bg-[#ef4444] text-white border border-[#fca5a5] shadow animate-pulse">
                    {lang === 'en' ? 'HURRY!' : '¡RÁPIDO!'}
                  </span>
                )}
              </div>
              <h2 className="font-display font-extrabold text-xl text-white mt-1.5 drop-shadow-[0_2px_8px_rgba(0,0,0,0.45)]">
                {lang === 'en' ? 'Fish on the line!' : '¡Pez enganchado!'}
              </h2>
            </div>

            {stages.length > 1 && (
              <span className="text-xs font-extrabold text-sky-100 bg-white/10 border border-white/20 px-2.5 py-1 rounded-lg shrink-0 tabular-nums">
                {lang === 'en'
                  ? `Stage ${stageIdx + 1}/${stages.length}`
                  : `Fase ${stageIdx + 1}/${stages.length}`}
              </span>
            )}
          </div>

          {/* LIVE TUG-OF-WAR WATER ARENA & LINE TENSION STRIP (60fps ref-driven, 0 re-renders) */}
          <div
            data-testid="fight-tension-arena"
            className={`rounded-xl bg-[#051124]/85 border px-3 py-2 flex flex-col gap-1.5 shadow-inner transition-all duration-200 ${
              guideStep === 1
                ? 'border-amber-300 ring-2 ring-amber-400 shadow-[0_0_22px_rgba(251,191,36,0.55)]'
                : guideStep === 3
                  ? 'border-sky-300/80 ring-1 ring-sky-400/70'
                  : 'border-white/15'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-300 shrink-0">
                  {lang === 'en' ? 'Tension' : 'Tensión'}
                </span>
                <div className="flex-1 h-2 rounded-full bg-slate-900 border border-white/15 overflow-hidden">
                  <div
                    ref={arenaTensionFillRef}
                    className="h-full w-full origin-left rounded-full transition-colors duration-100"
                    style={{ transform: 'scaleX(0.30)', backgroundColor: '#38bdf8' }}
                  />
                </div>
              </div>
              <span
                ref={arenaStatusBadgeRef}
                className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border shrink-0 transition-colors duration-100"
                style={{
                  color: '#bae6fd',
                  backgroundColor: 'rgba(14, 116, 144, 0.32)',
                  borderColor: 'rgba(125, 211, 252, 0.4)',
                }}
              >
                {lang === 'en' ? 'LINE TENSION OK' : 'TENSIÓN ESTABLE'}
              </span>
            </div>

            {/* Water tug-of-war channel */}
            <div className="relative h-11 rounded-lg bg-gradient-to-r from-[#0a2342] via-[#0c2d52] to-[#3a121e]/75 border border-white/10 overflow-hidden">
              {/* Right danger escape boundary */}
              <div
                className={`pointer-events-none absolute inset-y-0 right-0 w-[14%] bg-gradient-to-l from-red-500/35 to-transparent border-l border-red-400/50 flex items-center justify-end pr-1.5 ${
                  guideStep === 3 ? 'ring-2 ring-inset ring-amber-300/90 bg-red-500/50' : ''
                }`}
              >
                <span className="text-[9px] font-black uppercase text-red-200 tracking-tighter">
                  {lang === 'en' ? 'ESC' : 'FUGA'}
                </span>
              </div>

              {/* Left rod anchor */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute left-1.5 top-1/2 -translate-y-1/2 w-2.5 h-6 rounded-full bg-gradient-to-b from-amber-300 to-amber-600 border border-white/60 shadow"
              />

              {/* Animated SVG fishing line */}
              <svg
                viewBox="0 0 320 44"
                preserveAspectRatio="none"
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 w-full h-full"
              >
                <path
                  ref={arenaLinePathRef}
                  d="M 12 22 Q 80 26 150 22"
                  fill="none"
                  stroke="#bae6fd"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>

              {/* Moving & thrashing fish silhouette */}
              <div
                ref={arenaFishMarkerRef}
                aria-hidden="true"
                style={{
                  left: '48%',
                  top: '50%',
                  transform: 'translate(-50%, -50%)',
                }}
                className="pointer-events-none absolute w-8 h-6 flex items-center justify-center will-change-transform"
              >
                <svg viewBox="0 0 36 24" className="w-full h-full drop-shadow-[0_2px_4px_rgba(0,0,0,0.65)]">
                  <polygon points="9,12 1,5 1,19" fill={themeCfg.accentColor} />
                  <path
                    d="M 8 12 C 13 3, 27 3, 34 12 C 27 21, 13 21, 8 12 Z"
                    fill={themeCfg.accentColor}
                    stroke="#ffffff"
                    strokeWidth="1.5"
                  />
                  <circle cx="27" cy="10" r="1.6" fill="#0f172a" />
                </svg>
              </div>
            </div>
          </div>

          {/* PAUSED FIRST-CATCH GUIDED TUTORIAL CARD */}
          {guideStep > 0 && (
            <div
              data-testid="minigame-tutorial-card"
              onPointerDown={(e) => e.stopPropagation()}
              className="rounded-xl bg-gradient-to-br from-[#172554] via-[#0f172a] to-[#1e1b4b] border-2 border-[#fbbf24] p-3.5 shadow-[0_10px_28px_rgba(251,191,36,0.35)] flex flex-col gap-2.5 animate-ui-pop"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-display font-extrabold text-sm text-[#fde047]">
                  {guideStep === 1
                    ? lang === 'en'
                      ? '1. Line Tension Bar'
                      : '1. Barra de Tensión'
                    : guideStep === 2
                      ? lang === 'en'
                        ? '2. Reel Goal & Controls'
                        : '2. Objetivo y Controles'
                      : lang === 'en'
                        ? '3. Timer & Escape Risk'
                        : '3. Tiempo y Riesgo de Fuga'}
                </span>
                <span className="text-[11px] font-extrabold px-2 py-0.5 rounded-full bg-amber-400/20 border border-amber-300/50 text-amber-200 tabular-nums">
                  {guideStep} / 3
                </span>
              </div>

              <p className="text-xs leading-relaxed text-slate-100">
                {guideStep === 1 ? (
                  lang === 'en' ? (
                    <>
                      The top <strong className="text-sky-300">Tension</strong> bar shows how hard the line is straining. It rises more when the fish surges — avoid hitting the <strong className="text-red-300">red limit</strong> or the line can snap.
                    </>
                  ) : (
                    <>
                      La barra superior de <strong className="text-sky-300">Tensión</strong> indica cuánto aguanta el sedal. Sube más cuando el pez forcejea: evita llegar al <strong className="text-red-300">límite rojo</strong> para que no se rompa.
                    </>
                  )
                ) : guideStep === 2 ? (
                  currentStage === 'clicks' ? (
                    lang === 'en' ? (
                      <>
                        Tap <strong className="text-sky-300">PULL!</strong> (or press <strong className="text-amber-200">Space / Enter</strong>) to reach <strong className="text-white">{targetClicks} pulls</strong> and reel the fish in before time expires.
                      </>
                    ) : (
                      <>
                        Pulsa <strong className="text-sky-300">¡TIRAR!</strong> (o la tecla <strong className="text-amber-200">Espacio / Enter</strong>) hasta completar las <strong className="text-white">{targetClicks} pulsaciones</strong> para sacar al pez.
                      </>
                    )
                  ) : currentStage === 'bar' ? (
                    lang === 'en' ? (
                      <>
                        Hold the button (or <strong className="text-amber-200">Space / ↑</strong>) to keep the marker inside the <strong className="text-emerald-300">green zone</strong> for <strong className="text-white">{barTargetSeconds}s</strong>.
                      </>
                    ) : (
                      <>
                        Mantén pulsado el botón (o <strong className="text-amber-200">Espacio / ↑</strong>) para mantener el marcador en la <strong className="text-emerald-300">zona verde</strong> durante <strong className="text-white">{barTargetSeconds}s</strong>.
                      </>
                    )
                  ) : lang === 'en' ? (
                    <>
                      Tap <strong className="text-white">{targetDrops} falling drops</strong> before they touch the bottom line without tapping outside.
                    </>
                  ) : (
                    <>
                      Pulsa <strong className="text-white">{targetDrops} gotas</strong> antes de que toquen el suelo y sin pulsar fuera.
                    </>
                  )
                ) : lang === 'en' ? (
                  <>
                    Watch the <strong className="text-sky-300">timer</strong> (
                    <strong className="text-white">
                      {currentStage === 'clicks'
                        ? clickDuration
                        : currentStage === 'bar'
                          ? barTotalLimit
                          : dropsDuration}
                      s
                    </strong>
                    ). If you stop reeling or time runs out, the fish pulls back into <strong className="text-red-300">ESC</strong> and escapes!
                  </>
                ) : (
                  <>
                    Vigila el <strong className="text-sky-300">temporizador</strong> (
                    <strong className="text-white">
                      {currentStage === 'clicks'
                        ? clickDuration
                        : currentStage === 'bar'
                          ? barTotalLimit
                          : dropsDuration}
                      s
                    </strong>
                    ). Si te quedas quieto sin actuar o se agota el tiempo, el pez tirará hacia <strong className="text-red-300">FUGA</strong> y se escapará.
                  </>
                )}
              </p>

              <div className="flex items-center justify-end gap-2 pt-0.5">
                {guideStep > 1 && (
                  <button
                    type="button"
                    data-testid="minigame-tutorial-back-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      sound.playClick();
                      setGuideStep((s) => Math.max(1, s - 1));
                    }}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-white/20 text-xs font-bold text-slate-200 cursor-pointer"
                  >
                    {lang === 'en' ? '← Back' : '← Atrás'}
                  </button>
                )}
                {guideStep < 3 ? (
                  <button
                    type="button"
                    data-testid="minigame-tutorial-next-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      sound.playClick();
                      setGuideStep((s) => Math.min(3, s + 1));
                    }}
                    className="px-4 py-1.5 rounded-lg bg-gradient-to-b from-[#facc15] to-[#eab308] hover:brightness-105 text-[#1e1b4b] font-display font-extrabold text-xs shadow cursor-pointer"
                  >
                    {lang === 'en' ? 'Next →' : 'Siguiente →'}
                  </button>
                ) : (
                  <button
                    type="button"
                    data-testid="minigame-tutorial-finish-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      sound.playClick();
                      setGuideStep(0);
                      onCompleteGuideRef.current?.();
                    }}
                    className="px-4 py-1.5 rounded-lg bg-gradient-to-b from-[#22c55e] to-[#16a34a] hover:brightness-105 text-white font-display font-extrabold text-xs shadow border border-[#86efac]/60 cursor-pointer"
                  >
                    {lang === 'en' ? 'Got it! Start reeling' : '¡Entendido! Empezar pesca'}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* PAUSED FIRST-TIME PER-RARITY VISUAL EXPLANATION CARD */}
          {activeRarityTutorial && (
            <div
              data-testid="rarity-tutorial-card"
              data-tutorial-rarity={activeRarityTutorial.rarity}
              onPointerDown={(e) => e.stopPropagation()}
              style={{ borderColor: activeRarityTutorial.accentColor }}
              className="rounded-xl bg-gradient-to-br from-[#0f172a] via-[#172554] to-[#0b1329] border-2 p-3.5 shadow-[0_12px_30px_rgba(2,6,23,0.75)] flex flex-col gap-2.5 animate-ui-pop"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <RarityMechanicVisual diagram={activeRarityTutorial.diagram} accentColor={activeRarityTutorial.accentColor} />
                  <div className="min-w-0">
                    <span
                      className="inline-block text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border border-white/25"
                      style={{
                        color: activeRarityTutorial.accentColor,
                        backgroundColor: activeRarityTutorial.badgeBg,
                      }}
                    >
                      {activeRarityTutorial.mechanicTag}
                    </span>
                    <h3 className="font-display font-extrabold text-sm text-white mt-0.5 leading-snug">
                      {activeRarityTutorial.headline}
                    </h3>
                  </div>
                </div>
              </div>

              <p className="text-xs leading-relaxed text-slate-100">
                {activeRarityTutorial.summary}
              </p>

              <div className="flex flex-col gap-1.5">
                {activeRarityTutorial.steps.map((step, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-2.5 rounded-lg bg-slate-950/65 border border-white/15 px-2.5 py-2"
                  >
                    <span className="w-6 h-6 rounded-md bg-white/10 border border-white/20 flex items-center justify-center text-sm shrink-0">
                      {step.icon}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-display font-extrabold text-white">
                        {step.label}
                      </div>
                      <div className="text-[11px] leading-snug text-slate-300 mt-0.5">
                        {step.detail}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="rounded-lg bg-amber-500/15 border border-amber-300/35 px-2.5 py-1.5 text-[11px] font-semibold text-amber-100 flex items-center gap-1.5">
                <span aria-hidden="true">⚠️</span>
                <span>{activeRarityTutorial.tip}</span>
              </div>

              <div className="flex justify-end pt-0.5">
                <button
                  type="button"
                  data-testid="rarity-tutorial-dismiss-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    sound.playClick();
                    setRarityIntroOpen(false);
                    onDismissRarityTutorialRef.current?.(rarity);
                  }}
                  className="btn-arcade px-4 py-2 rounded-xl bg-gradient-to-b from-[#22c55e] to-[#16a34a] hover:brightness-105 text-white font-display font-extrabold text-xs shadow-lg border border-[#86efac]/70 cursor-pointer"
                >
                  {lang === 'en' ? 'Got it! Start reeling →' : '¡Entendido! Empezar pesca →'}
                </button>
              </div>
            </div>
          )}

          {/* STAGE 1: FAST CLICKS */}
          {currentStage === 'clicks' && (
            <div className="flex flex-col gap-3.5 py-0.5">
              {/* Countdown Time Bar */}
              <div
                className={`flex flex-col gap-1.5 rounded-xl transition-all duration-200 ${
                  guideStep === 3
                    ? 'p-2 -m-2 bg-amber-400/10 ring-2 ring-amber-400 shadow-[0_0_18px_rgba(251,191,36,0.4)]'
                    : ''
                }`}
              >
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-slate-300">
                    {clickProgressRatio >= 0.7
                      ? lang === 'en'
                        ? 'Almost landed!'
                        : '¡Ya casi lo tienes!'
                      : lang === 'en'
                        ? 'Reel fast before it pulls away!'
                        : '¡Tira rápido antes de que se aleje!'}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-md font-display font-extrabold tabular-nums border ${
                      clickUrgent && !isGuidePaused
                        ? 'bg-red-500/25 border-red-400 text-red-200 animate-pulse'
                        : clickWarn && !isGuidePaused
                          ? 'bg-amber-500/20 border-amber-400 text-amber-200'
                          : 'bg-sky-500/20 border-sky-400/50 text-sky-100'
                    }`}
                  >
                    {clickTimeLeft.toFixed(1)}s
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-950/75 border border-white/15 overflow-hidden">
                  <div
                    className="h-full w-full origin-left rounded-full transition-transform duration-100 linear"
                    style={{
                      transform: `scaleX(${clickTimeRatio.toFixed(4)})`,
                      backgroundColor: clickUrgent
                        ? '#ef4444'
                        : clickWarn
                          ? '#f59e0b'
                          : themeCfg.accentColor,
                    }}
                  />
                </div>
              </div>

              {/* Pull Progress Meter + Action Button */}
              <div
                className={`flex flex-col gap-3.5 rounded-xl transition-all duration-200 ${
                  guideStep === 2
                    ? 'p-2.5 -m-2.5 bg-amber-400/10 ring-2 ring-amber-400 shadow-[0_0_20px_rgba(251,191,36,0.45)]'
                    : ''
                }`}
              >
                <div className="rounded-xl bg-slate-950/60 border border-white/15 p-3 flex flex-col gap-2">
                  <div className="flex items-baseline justify-between">
                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-300">
                      {lang === 'en' ? 'Pull Power' : 'Fuerza de Tirón'}
                    </span>
                    <div className="font-display font-extrabold text-2xl tabular-nums flex items-baseline gap-1">
                      <span style={{ color: themeCfg.accentColor }}>{clicks}</span>
                      <span className="text-sm text-slate-400">/ {targetClicks}</span>
                    </div>
                  </div>
                  <div className="relative w-full h-4 rounded-full bg-slate-900 border border-white/15 overflow-hidden shadow-inner">
                    <div
                      className="h-full w-full origin-left rounded-full transition-transform duration-100 ease-out"
                      style={{
                        transform: `scaleX(${clickProgressRatio.toFixed(4)})`,
                        background: themeCfg.progressGradient,
                        boxShadow: `0 0 14px ${themeCfg.accentColor}90`,
                      }}
                    />
                    <div className="pointer-events-none absolute inset-0 flex justify-evenly">
                      <span className="w-px h-full bg-white/15" />
                      <span className="w-px h-full bg-white/15" />
                      <span className="w-px h-full bg-white/15" />
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={isGuidePaused}
                  onPointerDown={(e) => {
                    e.preventDefault();
                    usedPointerClickRef.current = true;
                    handleFastClick();
                  }}
                  onClick={() => {
                    if (usedPointerClickRef.current) {
                      usedPointerClickRef.current = false;
                      return;
                    }
                    handleFastClick();
                  }}
                  style={{
                    background: themeCfg.buttonGradient,
                    borderBottomColor: themeCfg.buttonLipColor,
                    boxShadow: `0 10px 24px -4px ${themeCfg.accentColor}66`,
                  }}
                  className="btn-arcade btn-shine w-full py-4 rounded-2xl border-2 border-white/40 border-b-[5px] text-white font-display font-extrabold text-xl tracking-wide cursor-pointer disabled:opacity-65 disabled:cursor-not-allowed active:translate-y-0.5 active:border-b-2"
                >
                  {lang === 'en' ? 'PULL!' : '¡TIRAR!'}
                </button>
              </div>
              <p className="text-[11px] font-semibold text-slate-300/80 text-center -mt-1.5">
                {lang === 'en'
                  ? 'Reel steadily · If the fish surges in red, pause briefly'
                  : 'Tira con buen ritmo · Si el pez forcejea en rojo, frena un instante'}
              </p>
            </div>
          )}

          {/* STAGE 2: PRECISION BAR */}
          {currentStage === 'bar' && (
            <div className="flex flex-col items-center gap-3">
              <div
                className={`w-full flex flex-col gap-2 rounded-xl transition-all duration-200 ${
                  guideStep === 3
                    ? 'p-2 -m-2 bg-amber-400/10 ring-2 ring-amber-400 shadow-[0_0_18px_rgba(251,191,36,0.4)]'
                    : ''
                }`}
              >
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-slate-200">
                    {lang === 'en' ? 'Reel Progress: ' : 'Progreso: '}
                    <strong ref={barProgressTextRef} className="text-emerald-300 tabular-nums">
                      0.0s / {barTargetSeconds}.0s
                    </strong>
                  </span>
                  <span
                    ref={barStatusElRef}
                    className="text-[11px] font-extrabold uppercase tracking-wider text-amber-300"
                  >
                    {lang === 'en' ? 'KEEP IN ZONE' : 'MANTÉN EN ZONA'}
                  </span>
                  <span className="text-slate-200">
                    <strong
                      ref={barTimeTextRef}
                      className={`tabular-nums ${
                        barUrgent && !isGuidePaused ? 'text-red-300 animate-pulse' : 'text-sky-200'
                      }`}
                    >
                      {barTotalLimit}s
                    </strong>
                  </span>
                </div>

                {/* Progress + Remaining Time Dual Bars */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="h-2.5 rounded-full bg-slate-950/75 border border-white/15 overflow-hidden">
                    <div
                      ref={barProgressFillRef}
                      className="h-full w-full origin-left rounded-full bg-gradient-to-r from-emerald-500 to-emerald-300"
                      style={{ transform: 'scaleX(0)' }}
                    />
                  </div>
                  <div className="h-2.5 rounded-full bg-slate-950/75 border border-white/15 overflow-hidden">
                    <div
                      ref={barTimeFillRef}
                      className="h-full w-full origin-left rounded-full"
                      style={{ transform: 'scaleX(1)', backgroundColor: '#38bdf8' }}
                    />
                  </div>
                </div>
              </div>

              <div
                ref={barTrackElRef}
                className={`relative w-16 h-52 rounded-2xl bg-[#091224] border-2 border-[#475569] overflow-hidden transition-colors duration-150 ${
                  guideStep === 2 ? 'ring-2 ring-amber-400 shadow-[0_0_20px_rgba(251,191,36,0.45)]' : ''
                }`}
                style={{ boxShadow: 'inset 0 2px 10px rgba(0, 0, 0, 0.55)' }}
              >
                {/* Top danger over-strain cap */}
                <div className="pointer-events-none absolute top-0 inset-x-0 h-[7%] bg-red-500/35 border-b border-red-400/50" />
                <div
                  ref={barBoxElRef}
                  className="absolute left-0 right-0 bg-[#10b981]/30 border-y-2 border-[#34d399] transition-colors duration-100"
                  style={{
                    top: `${50 - boxSize / 2}%`,
                    height: `${boxSize}%`,
                    willChange: 'top',
                  }}
                />
                <div
                  ref={barIndicatorElRef}
                  className="absolute left-1 right-1 h-3 rounded-full bg-[#facc15] shadow-[0_0_8px_#facc15]"
                  style={{ top: 'calc(50% - 6px)', willChange: 'top' }}
                />
              </div>

              <button
                ref={barHoldBtnRef}
                type="button"
                disabled={isGuidePaused}
                onPointerDown={(e) => {
                  if (isGuidePausedRef.current) return;
                  e.preventDefault();
                  holdingRef.current = true;
                  e.currentTarget.setAttribute('data-holding', 'true');
                }}
                onPointerUp={(e) => {
                  holdingRef.current = false;
                  e.currentTarget.removeAttribute('data-holding');
                }}
                onPointerCancel={(e) => {
                  holdingRef.current = false;
                  e.currentTarget.removeAttribute('data-holding');
                }}
                onPointerLeave={(e) => {
                  holdingRef.current = false;
                  e.currentTarget.removeAttribute('data-holding');
                }}
                className={`btn-arcade w-full py-3.5 rounded-2xl bg-gradient-to-b from-[#10b981] to-[#059669] border-2 border-[#6ee7b7]/50 border-b-[5px] border-b-[#047857] data-[holding=true]:scale-[0.97] data-[holding=true]:brightness-110 data-[holding=true]:border-b-2 text-white font-display font-extrabold text-lg shadow-lg cursor-pointer disabled:opacity-65 disabled:cursor-not-allowed select-none ${
                  guideStep === 2 ? 'ring-2 ring-amber-400' : ''
                }`}
              >
                {lang === 'en' ? 'HOLD TO REEL' : 'MANTENER PULSADO'}
              </button>
              <p className="text-[11px] font-semibold text-slate-300/80 text-center -mt-1.5">
                {lang === 'en'
                  ? 'Stay in green · Over-holding at top snaps the line!'
                  : 'Mantén en verde · Pasarse arriba rompe el sedal'}
              </p>
            </div>
          )}

          {/* STAGE 3: FALLING DROPS */}
          {currentStage === 'drops' && (
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-slate-200">
                    {lang === 'en' ? 'Caught: ' : 'Atrapadas: '}
                    <strong className="text-sky-300 tabular-nums">
                      {dropsCaught}/{targetDrops}
                    </strong>
                  </span>
                  <div
                    className="flex items-center gap-1"
                    aria-label={
                      lang === 'en'
                        ? `Lives: ${remainingLives} of ${totalLives}`
                        : `Vidas: ${remainingLives} de ${totalLives}`
                    }
                  >
                    {Array.from({ length: totalLives }).map((_, i) => {
                      const alive = i < remainingLives;
                      return (
                        <span
                          key={i}
                          className={`w-3 h-3 rounded-full border transition-all duration-150 ${
                            alive
                              ? remainingLives === 1
                                ? 'bg-red-400 border-red-200 shadow-[0_0_8px_#f87171] animate-pulse'
                                : 'bg-sky-400 border-white/80 shadow-[0_0_6px_rgba(56,189,248,0.8)]'
                              : 'bg-slate-800 border-slate-600 opacity-45'
                          }`}
                        />
                      );
                    })}
                  </div>
                  <span
                    className={`tabular-nums font-extrabold ${
                      dropsTimeLeft <= 5 ? 'text-red-300 animate-pulse' : 'text-slate-100'
                    }`}
                  >
                    {dropsTimeLeft.toFixed(1)}s
                  </span>
                </div>

                {/* Progress + Time Bars */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="h-2 rounded-full bg-slate-950/75 border border-white/15 overflow-hidden">
                    <div
                      className="h-full w-full origin-left rounded-full transition-transform duration-150 ease-out"
                      style={{
                        transform: `scaleX(${dropsProgressRatio.toFixed(4)})`,
                        background: themeCfg.progressGradient,
                      }}
                    />
                  </div>
                  <div className="h-2 rounded-full bg-slate-950/75 border border-white/15 overflow-hidden">
                    <div
                      className="h-full w-full origin-left rounded-full transition-transform duration-100 linear"
                      style={{
                        transform: `scaleX(${dropsTimeRatio.toFixed(4)})`,
                        backgroundColor: dropsTimeLeft <= 5 ? '#ef4444' : '#38bdf8',
                      }}
                    />
                  </div>
                </div>
              </div>

              <div
                data-testid="minigame-drops-arena"
                onPointerDown={handleMissClick}
                className={`relative w-full h-64 sm:h-72 rounded-2xl bg-gradient-to-b from-[#081224] to-[#132b4a] border-2 transition-all duration-200 overflow-hidden cursor-crosshair select-none ${
                  missFlash
                    ? 'border-red-500 shadow-[0_0_24px_rgba(239,68,68,0.7)] ring-2 ring-red-400'
                    : dropsUrgent
                      ? 'border-red-400/80'
                      : 'border-white/20'
                }`}
              >
                {missFlash && (
                  <div className="absolute inset-0 bg-red-500/20 backdrop-blur-[1px] flex items-center justify-center pointer-events-none z-10 animate-pulse">
                    <div className="bg-red-950/90 border border-red-500 text-red-200 px-3 py-1.5 rounded-xl text-xs font-black shadow-lg uppercase tracking-wider">
                      {lang === 'en'
                        ? 'Tapped outside! Drops reset'
                        : '¡Tocado fuera! Gotas reiniciadas'}
                    </div>
                  </div>
                )}
                {/* Línea de suelo (recorrido ampliado hasta el 96%) */}
                <div
                  data-testid="minigame-drops-ground-line"
                  className="absolute left-0 right-0 bottom-[4%] h-0.5 bg-[#ef4444]/85 pointer-events-none"
                />
                {drops.map((d) => (
                  <button
                    key={d.id}
                    data-testid="minigame-drop-btn"
                    ref={(el) => {
                      if (el) dropElsRef.current.set(d.id, el);
                      else dropElsRef.current.delete(d.id);
                    }}
                    type="button"
                    onPointerDown={(e) => handleCatchDrop(e, d.id)}
                    style={{ left: `${d.x}%`, top: `${d.y}%`, willChange: 'top' }}
                    className="btn-arcade absolute -translate-x-1/2 -translate-y-1/2 w-[42px] h-[42px] rounded-full bg-gradient-to-b from-[#38bdf8] to-[#0284c7] border-2 border-white shadow-[0_0_12px_rgba(56,189,248,0.8)] cursor-pointer active:scale-90 flex items-center justify-center text-white text-sm font-bold"
                  >
                    💧
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

import type { Language } from './i18n';

export const UNDERWORLD_INTRO_SEEN_KEY = 'infinite_catch_underworld_intro_seen_v1';
export const UNDERWORLD_MARKET_INTRO_SEEN_KEY =
  'infinite_catch_underworld_market_intro_seen_v1';

export type UnderworldGuideKind = 'underworld' | 'underworld_market';

export interface UnderworldGuidePoint {
  icon: string;
  title: string;
  detail: string;
}

export interface UnderworldGuideContent {
  kind: UnderworldGuideKind;
  badge: string;
  headline: string;
  summary: string;
  points: UnderworldGuidePoint[];
  buttonLabel: string;
}

export function loadUnderworldGuideSeen(kind: UnderworldGuideKind): boolean {
  const key =
    kind === 'underworld'
      ? UNDERWORLD_INTRO_SEEN_KEY
      : UNDERWORLD_MARKET_INTRO_SEEN_KEY;
  try {
    return localStorage.getItem(key) === '1';
  } catch {
    return false;
  }
}

export function saveUnderworldGuideSeen(
  kind: UnderworldGuideKind,
  seen: boolean
): void {
  const key =
    kind === 'underworld'
      ? UNDERWORLD_INTRO_SEEN_KEY
      : UNDERWORLD_MARKET_INTRO_SEEN_KEY;
  try {
    if (seen) {
      localStorage.setItem(key, '1');
    } else {
      localStorage.removeItem(key);
    }
  } catch {
    // ignore storage errors
  }
}

export function clearUnderworldGuidesFromStorage(): void {
  try {
    localStorage.removeItem(UNDERWORLD_INTRO_SEEN_KEY);
    localStorage.removeItem(UNDERWORLD_MARKET_INTRO_SEEN_KEY);
  } catch {
    // ignore storage errors
  }
}

export interface UnderworldGuideTriggerInput {
  mode: 'title' | 'menu' | 'playing' | 'paused';
  world: 'river' | 'underworld';
  scene: 'dock' | 'market';
  tutorialStep: number;
  isTransitioningWorld: boolean;
  isWalkingScene: boolean;
  activePanel: string;
  marketStallModal: 'none' | 'rods' | 'pvp';
  hasPendingCatch: boolean;
  isMinigameOpen: boolean;
  seenUnderworldIntro: boolean;
  seenUnderworldMarketIntro: boolean;
}

export function resolveActiveUnderworldGuide(
  input: UnderworldGuideTriggerInput
): UnderworldGuideKind | null {
  if (input.mode !== 'playing') return null;
  if (input.world !== 'underworld') return null;
  if (input.tutorialStep !== 0) return null;
  if (input.isTransitioningWorld || input.isWalkingScene) return null;
  if (input.activePanel !== 'none' || input.marketStallModal !== 'none') {
    return null;
  }
  if (input.hasPendingCatch || input.isMinigameOpen) return null;

  if (input.scene === 'dock' && !input.seenUnderworldIntro) {
    return 'underworld';
  }
  if (input.scene === 'market' && !input.seenUnderworldMarketIntro) {
    return 'underworld_market';
  }
  return null;
}

export function getUnderworldGuideContent(
  kind: UnderworldGuideKind,
  lang: Language = 'es'
): UnderworldGuideContent {
  if (kind === 'underworld') {
    return {
      kind,
      badge: lang === 'en' ? 'New World · Underworld' : 'Nuevo Mundo · Inframundo',
      headline:
        lang === 'en'
          ? 'Welcome to the Underworld!'
          : '¡Bienvenido al Inframundo!',
      summary:
        lang === 'en'
          ? 'You crossed into the volcanic lava abyss. Here is what changes in this realm:'
          : 'Has entrado en la zona volcánica de lava. Esto es lo que cambia aquí:',
      points: [
        {
          icon: '🔥',
          title:
            lang === 'en'
              ? 'Exclusive Lava Fish & Higher Value'
              : 'Peces exclusivos de lava y más valor',
          detail:
            lang === 'en'
              ? 'Catch unique Underworld species worth far more coins, but with tougher tension fights.'
              : 'Captura especies únicas del Inframundo con mayor recompensa, aunque oponen más resistencia.',
        },
        {
          icon: '⚡',
          title:
            lang === 'en'
              ? 'More Demanding Environment'
              : 'Ambiente volcánico más exigente',
          detail:
            lang === 'en'
              ? 'Watch the tension bar closely and combine your best rods, worms, and luck boosts.'
              : 'Controla bien la tensión al recoger y aprovecha tus mejores cañas, cebos y suerte.',
        },
        {
          icon: '🌋',
          title:
            lang === 'en'
              ? 'Own Underworld Market'
              : 'Mercado propio del Inframundo',
          detail:
            lang === 'en'
              ? 'Use the Market button anytime to visit the volcanic stalls and sell your catches.'
              : 'Pulsa el botón Mercado cuando quieras para visitar su zona propia y vender tus capturas.',
        },
      ],
      buttonLabel: lang === 'en' ? 'Got it · Let’s fish!' : '¡Entendido, a pescar!',
    };
  }

  return {
    kind,
    badge:
      lang === 'en'
        ? 'First Visit · Underworld Market'
        : 'Primera Visita · Mercado del Inframundo',
    headline:
      lang === 'en'
        ? 'Underworld Market Stalls'
        : 'Puestos del Mercado del Inframundo',
    summary:
      lang === 'en'
        ? 'Tap any stall behind the volcanic rock path to interact:'
        : 'Pulsa sobre los puestos de este mercado volcánico para usarlos:',
    points: [
      {
        icon: '🪙',
        title:
          lang === 'en'
            ? 'Left · Sell Catch'
            : 'Izquierda · Vender Pesca',
        detail:
          lang === 'en'
            ? 'Sell your exclusive Underworld catches directly at the volcanic booth.'
            : 'Vende tus capturas exclusivas del Inframundo directamente con la vendedora.',
      },
      {
        icon: '🎣',
        title:
          lang === 'en'
            ? 'Center · Rods & Baits (Lava)'
            : 'Centro · Cañas y Cebos de Lava',
        detail:
          lang === 'en'
            ? 'Sections are already prepared for upcoming exclusive lava rods and baits.'
            : 'Secciones preparadas para las próximas cañas y cebos exclusivos de lava.',
      },
      {
        icon: '⚔️',
        title:
          lang === 'en'
            ? 'Right · 1v1 Zone (Coming Soon)'
            : 'Derecha · Zona 1v1 (Pendiente)',
        detail:
          lang === 'en'
            ? 'The 1v1 duel arch is currently inactive and will open in a future update.'
            : 'El arco de duelos 1v1 está inactivo por ahora y se abrirá más adelante.',
      },
    ],
    buttonLabel: lang === 'en' ? 'Explore Market' : 'Explorar Mercado',
  };
}

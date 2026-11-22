import type { Language } from './i18n';

export type MarketStallId = 'sell' | 'rods' | 'pvp';

export type MarketTutorialSubStep =
  | 'go_to_market'
  | 'sell'
  | 'rods'
  | 'pvp'
  | 'returning';

export interface MarketTourCardContent {
  stepIndex: 1 | 2 | 3;
  totalSteps: 3;
  stallId: MarketStallId;
  accentColor: string;
  icon: string;
  title: string;
  description: string;
  buttonLabel: string;
  isLastStall: boolean;
}

export function getNextMarketTutorialSubStep(
  current: MarketTutorialSubStep
): MarketTutorialSubStep {
  switch (current) {
    case 'go_to_market':
      return 'sell';
    case 'sell':
      return 'rods';
    case 'rods':
      return 'pvp';
    case 'pvp':
      return 'returning';
    case 'returning':
    default:
      return 'returning';
  }
}

export function isMarketTourStallStep(
  subStep: MarketTutorialSubStep
): subStep is MarketStallId {
  return subStep === 'sell' || subStep === 'rods' || subStep === 'pvp';
}

export function getHighlightedStallForTutorial(
  tutorialStep: number,
  scene: 'dock' | 'market',
  isWalking: boolean,
  subStep: MarketTutorialSubStep
): MarketStallId | null {
  if (tutorialStep !== 4 || scene !== 'market' || isWalking) {
    return null;
  }
  return isMarketTourStallStep(subStep) ? subStep : null;
}

export function resolveMarketSubStepOnSceneState(
  tutorialStep: number,
  scene: 'dock' | 'market',
  isWalking: boolean,
  currentSubStep: MarketTutorialSubStep
): MarketTutorialSubStep {
  if (tutorialStep !== 4) {
    return 'go_to_market';
  }
  if (scene === 'market' && !isWalking && currentSubStep === 'go_to_market') {
    return 'sell';
  }
  return currentSubStep;
}

export function shouldCompleteMarketTutorial(
  tutorialStep: number,
  scene: 'dock' | 'market',
  isWalking: boolean,
  subStep: MarketTutorialSubStep
): boolean {
  return (
    tutorialStep === 4 &&
    scene === 'dock' &&
    !isWalking &&
    subStep === 'returning'
  );
}

export function getMarketTourCardContent(
  stallId: MarketStallId,
  lang: Language
): MarketTourCardContent {
  if (stallId === 'sell') {
    return {
      stepIndex: 1,
      totalSteps: 3,
      stallId: 'sell',
      accentColor: '#facc15',
      icon: '💰',
      title:
        lang === 'en'
          ? 'Sell Catch & Shop'
          : 'Vender Pesca y Tienda',
      description:
        lang === 'en'
          ? 'Sell the fish you catch for coins, expand your backpack, and buy exclusive suits and outfits for your angler.'
          : 'Aquí vendes los peces que atrapas para ganar monedas, amplías tu mochila y compras trajes y ropa para tu pescador.',
      buttonLabel: lang === 'en' ? 'Next Stall →' : 'Siguiente tienda →',
      isLastStall: false,
    };
  }
  if (stallId === 'rods') {
    return {
      stepIndex: 2,
      totalSteps: 3,
      stallId: 'rods',
      accentColor: '#38bdf8',
      icon: '🎣',
      title:
        lang === 'en'
          ? 'Rods & Baits Stall'
          : 'Tienda de Cañas y Cebos',
      description:
        lang === 'en'
          ? 'Here you can buy faster fishing rods (Carbon, Gold & OG) and special worms that replace your bobber with luck and speed boosts.'
          : 'Aquí compras cañas más rápidas (Carbono, Oro y OG) y gusanos especiales que reemplazan la boya con mejoras de suerte y velocidad.',
      buttonLabel: lang === 'en' ? 'Next Stall →' : 'Siguiente tienda →',
      isLastStall: false,
    };
  }
  return {
    stepIndex: 3,
    totalSteps: 3,
    stallId: 'pvp',
    accentColor: '#f97316',
    icon: '⚔️',
    title: lang === 'en' ? '1v1 Zone' : 'Zona 1v1',
    description:
      lang === 'en'
        ? 'Challenge other anglers to 1v1 fishing duels inside this tent to prove who is the best (coming soon).'
        : 'En esta carpa podrás retar a otros pescadores en duelos 1 contra 1 para demostrar quién pesca mejor (disponible pronto).',
    buttonLabel:
      lang === 'en' ? 'Got it! Back to Dock →' : '¡Entendido! Volver al río →',
    isLastStall: true,
  };
}

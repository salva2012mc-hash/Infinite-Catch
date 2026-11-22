import type { Language } from './i18n';
import type { Rarity } from './pokemonData';

export const RARITY_TUTORIAL_STORAGE_KEY = 'infinite_catch_seen_rarity_tutorials';

export const TUTORIAL_EXPLAINED_RARITIES: readonly Rarity[] = [
  'Rara',
  'Épica',
  'Mítica',
  'Legendaria',
  'Secreto',
  'Secreto Abisal',
] as const;

export type RarityDiagramKind = 'clicks' | 'bar' | 'bar_fast' | 'drops' | 'drops_fast' | 'abisal';

export interface RarityTutorialStep {
  stepNum?: number;
  icon: string;
  label: string;
  detail: string;
}

export interface RarityTutorialInfo {
  rarity: Rarity;
  diagram: RarityDiagramKind;
  accentColor: string;
  badgeBg: string;
  mechanicTag: string;
  headline: string;
  summary: string;
  steps: RarityTutorialStep[];
  tip: string;
}

const VALID_TUTORIAL_RARITY_SET = new Set<string>(TUTORIAL_EXPLAINED_RARITIES);

export function sanitizeSeenRarityTutorials(raw: unknown): Rarity[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<Rarity>();
  for (const entry of raw) {
    if (typeof entry === 'string' && VALID_TUTORIAL_RARITY_SET.has(entry)) {
      seen.add(entry as Rarity);
    }
  }
  return Array.from(seen);
}

export function loadSeenRarityTutorialsFromStorage(): Rarity[] {
  try {
    const raw = localStorage.getItem(RARITY_TUTORIAL_STORAGE_KEY);
    if (!raw) return [];
    return sanitizeSeenRarityTutorials(JSON.parse(raw));
  } catch {
    return [];
  }
}

export function saveSeenRarityTutorialsToStorage(rarities: readonly Rarity[]): void {
  try {
    localStorage.setItem(
      RARITY_TUTORIAL_STORAGE_KEY,
      JSON.stringify(sanitizeSeenRarityTutorials(rarities))
    );
  } catch {
    // ignore storage errors
  }
}

export function shouldShowRarityFirstTimeTutorial(
  rarity: Rarity,
  seenRarities: readonly Rarity[]
): boolean {
  if (rarity === 'Común') return false;
  if (!VALID_TUTORIAL_RARITY_SET.has(rarity)) return false;
  return !seenRarities.includes(rarity);
}

export function markRarityTutorialSeen(
  seenRarities: readonly Rarity[],
  rarity: Rarity
): Rarity[] {
  if (!VALID_TUTORIAL_RARITY_SET.has(rarity)) {
    return sanitizeSeenRarityTutorials(seenRarities);
  }
  if (seenRarities.includes(rarity)) {
    return sanitizeSeenRarityTutorials(seenRarities);
  }
  return [...sanitizeSeenRarityTutorials(seenRarities), rarity];
}

export function getRarityTutorialInfo(
  rarity: Rarity,
  lang: Language = 'es'
): RarityTutorialInfo | null {
  switch (rarity) {
    case 'Común':
      return null;

    case 'Rara':
      return {
        rarity,
        diagram: 'clicks',
        accentColor: '#38bdf8',
        badgeBg: 'rgba(14, 116, 144, 0.35)',
        mechanicTag: lang === 'en' ? '20 Fast Pulls' : '20 Pulsaciones',
        headline:
          lang === 'en'
            ? 'First Rare Fish! · Fast Taps'
            : '¡Primer Pez Raro! · Pulsaciones rápidas',
        summary:
          lang === 'en'
            ? 'Rare fish resist harder: tap fast to complete 20 pulls before time runs out.'
            : 'Los peces raros tiran con más fuerza: pulsa rápido hasta llegar a 20 pulsaciones antes de que se agote el tiempo.',
        steps: [
          {
            icon: '👆',
            label: lang === 'en' ? 'Reach 20 pulls' : 'Completa 20 pulsaciones',
            detail:
              lang === 'en'
                ? 'Tap PULL! (or press Space / Enter) 20 times cleanly.'
                : 'Pulsa ¡TIRAR! (o Espacio / Enter) 20 veces seguidas.',
          },
        ],
        tip:
          lang === 'en'
            ? 'Watch the top Tension bar: if the fish surges in red, pause for an instant.'
            : 'Vigila la barra de Tensión arriba: si sube al rojo al forcejear, frena un instante.',
      };

    case 'Épica':
      return {
        rarity,
        diagram: 'bar',
        accentColor: '#c084fc',
        badgeBg: 'rgba(126, 34, 206, 0.35)',
        mechanicTag: lang === 'en' ? 'Green Zone · 5s' : 'Zona Verde · 5s',
        headline:
          lang === 'en'
            ? 'First Epic Fish! · Precision Hold'
            : '¡Primer Pez Épico! · Zona verde',
        summary:
          lang === 'en'
            ? 'Hold and release to keep the yellow marker inside the moving green zone for 5 seconds.'
            : 'Mantén pulsado y suelta para mantener el marcador amarillo dentro de la zona verde durante 5 segundos.',
        steps: [
          {
            icon: '🟢',
            label: lang === 'en' ? 'Hold to rise, release to drop' : 'Mantén para subir, suelta para bajar',
            detail:
              lang === 'en'
                ? 'Press and hold the button (or Space / ↑) to keep the bar inside green.'
                : 'Mantén pulsado el botón (o Espacio / ↑) para seguir la franja verde.',
          },
        ],
        tip:
          lang === 'en'
            ? 'Do not pin the marker against the top red limit or the line will snap!'
            : '¡No choques con el límite rojo superior o romperás el sedal!',
      };

    case 'Mítica':
      return {
        rarity,
        diagram: 'bar_fast',
        accentColor: '#fb7185',
        badgeBg: 'rgba(190, 18, 60, 0.35)',
        mechanicTag: lang === 'en' ? 'Fast Green Zone!' : '¡Zona Verde Más Rápida!',
        headline:
          lang === 'en'
            ? 'First Mythic Fish! · Faster Zone'
            : '¡Primer Pez Mítico! · Va más rápido',
        summary:
          lang === 'en'
            ? 'Same hold-in-green mechanic as Epic, but the green zone is narrower and moves noticeably faster!'
            : 'Misma mecánica que Épica (mantener en la zona verde 5s), ¡pero la zona es más estrecha y va más rápido!',
        steps: [
          {
            icon: '⚡',
            label: lang === 'en' ? 'Quick pulses, tighter control' : 'Toques cortos y más reflejos',
            detail:
              lang === 'en'
                ? 'Anticipate rapid direction changes and use short holds to stay centered.'
                : 'Anticípate a los cambios de dirección con pulsaciones cortas y precisas.',
          },
        ],
        tip:
          lang === 'en'
            ? 'Same green zone rule, faster speed — stay calm and track its rhythm.'
            : 'Es igual que la Épica pero más rápida: sigue su ritmo sin sobrepasarte arriba.',
      };

    case 'Legendaria':
      return {
        rarity,
        diagram: 'drops',
        accentColor: '#fbbf24',
        badgeBg: 'rgba(180, 83, 9, 0.38)',
        mechanicTag: lang === 'en' ? '21 Falling Drops' : '21 Gotas Cayendo',
        headline:
          lang === 'en'
            ? 'First Legendary Fish! · Catch the Drops'
            : '¡Primer Pez Legendario! · Atrapa las gotas',
        summary:
          lang === 'en'
            ? 'Tap each falling water drop directly before it hits the bottom line.'
            : 'Pulsa directamente las gotas que van cayendo antes de que toquen el suelo.',
        steps: [
          {
            icon: '💧',
            label: lang === 'en' ? 'Catch 21 drops accurately' : 'Atrapa 21 gotas sin fallar fuera',
            detail:
              lang === 'en'
                ? 'Tapping outside or letting more than 2 drops fall resets or loses the fight.'
                : 'Si pulsas fuera o dejas caer más de 2 gotas, pierdes vidas y se reinician.',
          },
        ],
        tip:
          lang === 'en'
            ? 'Aim right on the blue drops — accuracy beats rushing!'
            : 'Apunta bien al centro de cada gota: la precisión vale más que la prisa.',
      };

    case 'Secreto':
      return {
        rarity,
        diagram: 'drops_fast',
        accentColor: '#94a3b8',
        badgeBg: 'rgba(51, 65, 85, 0.55)',
        mechanicTag: lang === 'en' ? '25 Rapid Drops' : '25 Gotas Rápidas',
        headline:
          lang === 'en'
            ? 'First Secret Fish! · Rapid Drops'
            : '¡Primer Pez Secreto! · Lluvia rápida',
        summary:
          lang === 'en'
            ? 'Catch 25 falling drops — they spawn and drop faster than Legendary!'
            : 'Atrapa 25 gotas que van cayendo mucho más rápido que en Legendaria.',
        steps: [
          {
            icon: '🌊',
            label: lang === 'en' ? '25 drops · Max 2 misses' : '25 gotas · Máximo 2 fallos',
            detail:
              lang === 'en'
                ? 'Tap every drop before it reaches the red floor line without tapping empty water.'
                : 'Pulsa cada gota antes de la línea roja inferior y evita pulsar en el fondo vacío.',
          },
        ],
        tip:
          lang === 'en'
            ? 'Keep your finger/cursor ready near the middle to react in both directions.'
            : 'Mantén el dedo o cursor centrado para reaccionar rápido a ambos lados.',
      };

    case 'Secreto Abisal':
      return {
        rarity,
        diagram: 'abisal',
        accentColor: '#22d3ee',
        badgeBg: 'rgba(8, 145, 178, 0.38)',
        mechanicTag: lang === 'en' ? '3 Sequential Stages' : '3 Fases en Orden',
        headline:
          lang === 'en'
            ? 'First Abyssal Secret! · 3-Stage Battle'
            : '¡Primer Secreto Abisal! · Batalla en 3 fases',
        summary:
          lang === 'en'
            ? 'You must overcome 3 challenges in strict order without failing:'
            : 'Para atrapar un Secreto Abisal debes superar estas 3 fases seguidas en orden:',
        steps: [
          {
            stepNum: 1,
            icon: '👆',
            label: lang === 'en' ? '1st · 50 Fast Pulls' : '1º · 50 Pulsaciones rápidas',
            detail:
              lang === 'en'
                ? 'Tap PULL! 50 times before time expires while managing line tension.'
                : 'Completa 50 pulsaciones rápidas sin romper el sedal por tensión.',
          },
          {
            stepNum: 2,
            icon: '🟢',
            label: lang === 'en' ? '2nd · 10s Green Zone' : '2º · Zona verde (10s)',
            detail:
              lang === 'en'
                ? 'Hold the marker inside the fast-moving green zone for 10 full seconds.'
                : 'Mantén el marcador en la zona verde rápida durante 10 segundos.',
          },
          {
            stepNum: 3,
            icon: '💧',
            label: lang === 'en' ? '3rd · 20 Drops (0 misses!)' : '3º · 20 Gotas (¡0 fallos!)',
            detail:
              lang === 'en'
                ? 'Catch 20 falling drops with only 1 life — missing even once loses the fish!'
                : 'Atrapa 20 gotas cayendo con 1 sola vida: ¡no puedes fallar ni una!',
          },
        ],
        tip:
          lang === 'en'
            ? 'Stage 3 gives zero margin for error — stay sharp until the final drop!'
            : 'En la fase 3 no hay margen de error: ¡concentración máxima hasta la última gota!',
      };
  }
}

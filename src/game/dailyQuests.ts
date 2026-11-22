import { Language, formatNumber } from './i18n';
import { PokemonSpecies, Rarity } from './pokemonData';

export const DAILY_QUESTS_STORAGE_KEY = 'infinite_catch_daily_quests_v1';
export const HARD_QUEST_LUCK_MULTIPLIER = 2;
export const HARD_QUEST_LUCK_DURATION_MS = 3 * 60 * 1000; // 3 minutes

export type DailyQuestDifficulty = 'easy' | 'medium' | 'hard';

export type DailyQuestMetric =
  | 'catch_common'
  | 'catch_any'
  | 'catch_rare_plus'
  | 'catch_epic_plus'
  | 'earn_coins'
  | 'play_seconds';

export interface DailyQuestItem {
  id: string;
  difficulty: DailyQuestDifficulty;
  metric: DailyQuestMetric;
  titleEn: string;
  titleEs: string;
  descEn: string;
  descEs: string;
  target: number;
  progress: number;
  rewardCoins: number;
  rewardLuckMultiplier?: number;
  rewardLuckDurationMs?: number;
  claimed: boolean;
}

export interface DailyQuestsState {
  dateKey: string;
  quests: DailyQuestItem[];
}

const RARE_OR_HIGHER: ReadonlySet<Rarity> = new Set<Rarity>([
  'Rara',
  'Épica',
  'Mítica',
  'Legendaria',
  'Secreto',
  'Secreto Abisal',
]);

const EPIC_OR_HIGHER: ReadonlySet<Rarity> = new Set<Rarity>([
  'Épica',
  'Mítica',
  'Legendaria',
  'Secreto',
  'Secreto Abisal',
]);

type QuestTemplate = Omit<DailyQuestItem, 'progress' | 'claimed'>;

const EASY_QUEST_POOL: QuestTemplate[] = [
  {
    id: 'easy_common_5',
    difficulty: 'easy',
    metric: 'catch_common',
    titleEn: 'Daily Warm-Up',
    titleEs: 'Calentamiento Diario',
    descEn: 'Catch 5 Common fish',
    descEs: 'Captura 5 peces Comunes',
    target: 5,
    rewardCoins: 400,
  },
  {
    id: 'easy_any_10',
    difficulty: 'easy',
    metric: 'catch_any',
    titleEn: 'Ice Pier Regular',
    titleEs: 'Habitual del Muelle',
    descEn: 'Catch 10 fish of any rarity',
    descEs: 'Captura 10 peces de cualquier rareza',
    target: 10,
    rewardCoins: 450,
  },
  {
    id: 'easy_common_8',
    difficulty: 'easy',
    metric: 'catch_common',
    titleEn: 'Steady Line',
    titleEs: 'Caña Firme',
    descEn: 'Catch 8 Common fish',
    descEs: 'Captura 8 peces Comunes',
    target: 8,
    rewardCoins: 550,
  },
];

const MEDIUM_QUEST_POOL: QuestTemplate[] = [
  {
    id: 'med_rare_plus_4',
    difficulty: 'medium',
    metric: 'catch_rare_plus',
    titleEn: 'Rare Hunter',
    titleEs: 'Cazador de Raros',
    descEn: 'Catch 4 Rare or rarer fish',
    descEs: 'Captura 4 peces Raros o más raros',
    target: 4,
    rewardCoins: 1250,
  },
  {
    id: 'med_earn_1000',
    difficulty: 'medium',
    metric: 'earn_coins',
    titleEn: 'Market Profit',
    titleEs: 'Ganancia del Mercado',
    descEn: 'Earn 1,000 coins selling fish',
    descEs: 'Gana 1,000 monedas vendiendo peces',
    target: 1000,
    rewardCoins: 1400,
  },
  {
    id: 'med_any_22',
    difficulty: 'medium',
    metric: 'catch_any',
    titleEn: 'Full Bucket',
    titleEs: 'Cubo Lleno',
    descEn: 'Catch 22 fish today',
    descEs: 'Captura 22 peces hoy',
    target: 22,
    rewardCoins: 1500,
  },
];

const HARD_QUEST_POOL: QuestTemplate[] = [
  {
    id: 'hard_epic_15',
    difficulty: 'hard',
    metric: 'catch_epic_plus',
    titleEn: 'Master Angler Challenge',
    titleEs: 'Desafío Maestro',
    descEn: 'Catch 15 Epic or rarer fish',
    descEs: 'Captura 15 peces Épicos o más raros',
    target: 15,
    rewardCoins: 3500,
    rewardLuckMultiplier: HARD_QUEST_LUCK_MULTIPLIER,
    rewardLuckDurationMs: HARD_QUEST_LUCK_DURATION_MS,
  },
  {
    id: 'hard_play_30m',
    difficulty: 'hard',
    metric: 'play_seconds',
    titleEn: 'Ice Endurance',
    titleEs: 'Resistencia en el Hielo',
    descEn: 'Play actively for 30 minutes',
    descEs: 'Juega activamente durante 30 minutos seguidos',
    target: 30 * 60,
    rewardCoins: 3000,
    rewardLuckMultiplier: HARD_QUEST_LUCK_MULTIPLIER,
    rewardLuckDurationMs: HARD_QUEST_LUCK_DURATION_MS,
  },
  {
    id: 'hard_any_50',
    difficulty: 'hard',
    metric: 'catch_any',
    titleEn: 'Frenzy Expedition',
    titleEs: 'Expedición Frenética',
    descEn: 'Catch 50 fish in a single day',
    descEs: 'Captura 50 peces en un solo día',
    target: 50,
    rewardCoins: 3200,
    rewardLuckMultiplier: HARD_QUEST_LUCK_MULTIPLIER,
    rewardLuckDurationMs: HARD_QUEST_LUCK_DURATION_MS,
  },
];

export function getDailyDateKey(nowMs: number = Date.now()): string {
  const d = new Date(nowMs);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function getMsUntilNextDailyReset(nowMs: number = Date.now()): number {
  const d = new Date(nowMs);
  const nextMidnight = new Date(
    d.getFullYear(),
    d.getMonth(),
    d.getDate() + 1,
    0,
    0,
    0,
    0
  ).getTime();
  return Math.max(0, nextMidnight - nowMs);
}

function getDayIndexFromKey(dateKey: string): number {
  const parts = dateKey.split('-').map((n) => parseInt(n, 10));
  if (parts.length !== 3 || parts.some((n) => !Number.isFinite(n))) {
    return 0;
  }
  const [year, month, day] = parts;
  const epochDay = Math.floor(Date.UTC(year, month - 1, day) / 86_400_000);
  const anchorDay = Math.floor(Date.UTC(2026, 10, 17) / 86_400_000);
  return Math.abs(epochDay - anchorDay);
}

export function createDailyQuestsForDate(dateKey: string): DailyQuestsState {
  const idx = getDayIndexFromKey(dateKey);
  const easy = EASY_QUEST_POOL[idx % EASY_QUEST_POOL.length];
  const medium = MEDIUM_QUEST_POOL[idx % MEDIUM_QUEST_POOL.length];
  const hard = HARD_QUEST_POOL[idx % HARD_QUEST_POOL.length];
  return {
    dateKey,
    quests: [
      { ...easy, progress: 0, claimed: false },
      { ...medium, progress: 0, claimed: false },
      { ...hard, progress: 0, claimed: false },
    ],
  };
}

export function ensureDailyQuestsCurrent(
  state: DailyQuestsState,
  nowMs: number = Date.now()
): DailyQuestsState {
  const todayKey = getDailyDateKey(nowMs);
  if (!state || state.dateKey !== todayKey || !Array.isArray(state.quests) || state.quests.length === 0) {
    return createDailyQuestsForDate(todayKey);
  }
  return state;
}

export function applyCatchToDailyQuests(
  state: DailyQuestsState,
  species: Pick<PokemonSpecies, 'rarity'>,
  nowMs: number = Date.now()
): DailyQuestsState {
  const current = ensureDailyQuestsCurrent(state, nowMs);
  let changed = current !== state;

  const quests = current.quests.map((q) => {
    if (q.claimed || q.progress >= q.target) return q;
    let delta = 0;
    if (q.metric === 'catch_any') {
      delta = 1;
    } else if (q.metric === 'catch_common' && species.rarity === 'Común') {
      delta = 1;
    } else if (q.metric === 'catch_rare_plus' && RARE_OR_HIGHER.has(species.rarity)) {
      delta = 1;
    } else if (q.metric === 'catch_epic_plus' && EPIC_OR_HIGHER.has(species.rarity)) {
      delta = 1;
    }
    if (delta <= 0) return q;
    changed = true;
    return {
      ...q,
      progress: Math.min(q.target, q.progress + delta),
    };
  });

  return changed ? { ...current, quests } : current;
}

export function applyCoinsToDailyQuests(
  state: DailyQuestsState,
  earnedCoins: number,
  nowMs: number = Date.now()
): DailyQuestsState {
  const current = ensureDailyQuestsCurrent(state, nowMs);
  const safeCoins = Number.isFinite(earnedCoins) ? Math.max(0, Math.floor(earnedCoins)) : 0;
  if (safeCoins <= 0) return current;

  let changed = current !== state;
  const quests = current.quests.map((q) => {
    if (q.claimed || q.metric !== 'earn_coins' || q.progress >= q.target) return q;
    changed = true;
    return {
      ...q,
      progress: Math.min(q.target, q.progress + safeCoins),
    };
  });

  return changed ? { ...current, quests } : current;
}

export function applyPlayTimeToDailyQuests(
  state: DailyQuestsState,
  deltaSeconds: number,
  nowMs: number = Date.now()
): DailyQuestsState {
  const current = ensureDailyQuestsCurrent(state, nowMs);
  const safeDelta = Number.isFinite(deltaSeconds) ? Math.max(0, Math.floor(deltaSeconds)) : 0;
  if (safeDelta <= 0) return current;

  let changed = current !== state;
  const quests = current.quests.map((q) => {
    if (q.claimed || q.metric !== 'play_seconds' || q.progress >= q.target) return q;
    changed = true;
    return {
      ...q,
      progress: Math.min(q.target, q.progress + safeDelta),
    };
  });

  return changed ? { ...current, quests } : current;
}

export function claimDailyQuestReward(
  state: DailyQuestsState,
  questId: string,
  nowMs: number = Date.now()
): { nextState: DailyQuestsState; claimedQuest: DailyQuestItem | null } {
  const current = ensureDailyQuestsCurrent(state, nowMs);
  const targetQuest = current.quests.find((q) => q.id === questId);
  if (!targetQuest || targetQuest.claimed || targetQuest.progress < targetQuest.target) {
    return { nextState: current, claimedQuest: null };
  }

  const nextState: DailyQuestsState = {
    ...current,
    quests: current.quests.map((q) =>
      q.id === questId ? { ...q, claimed: true } : q
    ),
  };

  return {
    nextState,
    claimedQuest: { ...targetQuest, claimed: true },
  };
}

export function formatQuestProgressLabel(quest: DailyQuestItem, lang: Language = 'es'): string {
  if (quest.metric === 'play_seconds') {
    const curMin = Math.floor(quest.progress / 60);
    const curSec = quest.progress % 60;
    const tgtMin = Math.floor(quest.target / 60);
    return `${curMin}:${String(curSec).padStart(2, '0')} / ${tgtMin}:00`;
  }
  return `${formatNumber(quest.progress, lang)} / ${formatNumber(quest.target, lang)}`;
}

export function loadDailyQuestsState(nowMs: number = Date.now()): DailyQuestsState {
  const todayKey = getDailyDateKey(nowMs);
  try {
    const raw = localStorage.getItem(DAILY_QUESTS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<DailyQuestsState>;
      if (parsed && parsed.dateKey === todayKey && Array.isArray(parsed.quests) && parsed.quests.length > 0) {
        const fresh = createDailyQuestsForDate(todayKey);
        const sanitizedQuests = fresh.quests.map((tmpl) => {
          const match = parsed.quests?.find((p) => p && p.id === tmpl.id);
          if (!match) return tmpl;
          const progress = Number.isFinite(match.progress)
            ? Math.min(tmpl.target, Math.max(0, Math.floor(Number(match.progress))))
            : 0;
          return {
            ...tmpl,
            progress,
            claimed: Boolean(match.claimed),
          };
        });
        return { dateKey: todayKey, quests: sanitizedQuests };
      }
    }
  } catch {
    // ignore storage errors
  }
  return createDailyQuestsForDate(todayKey);
}

export function saveDailyQuestsState(state: DailyQuestsState): void {
  try {
    localStorage.setItem(DAILY_QUESTS_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore storage errors
  }
}

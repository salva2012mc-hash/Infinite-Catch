import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FishingMinigame } from './game/FishingMinigame';
import {
  Volume2,
  VolumeX,
  Pause,
  Trash2,
  AlertTriangle,
  Store,
  Shirt,
  X,
  BookOpen,
  Trophy,
  Clock,
  Music,
  Medal,
  Lock,
  ChevronDown,
  ChevronUp,
  Users,
  Fish,
  Info,
  Star,
  Crown,
  Heart,
  Sparkles,
  ArrowUp,
  ArrowDown,
  Search,
  User as UserIcon,
  Terminal,
  Globe,
  Monitor,
  Sun,
  ScrollText,
  CheckCircle2,
  Flame,
} from 'lucide-react';
import { WorldSwitcher, WorldTravelOverlay } from './components/WorldSwitcher';
import {
  createInitialFishingState,
  FishingPhase,
  FishingState,
  getAccountCatchCount,
  getEquippedRodStats,
  resolveInitialTutorialStep,
  triggerFishingAction,
} from './game/fishingLogic';
import {
  FightFailReason,
  FightTelemetry,
  createInitialFightTelemetry,
} from './game/fightPhysics';
import {
  GameMode,
  GraphicsQuality,
  IceFishingCanvas,
} from './game/IceFishingCanvas';
import {
  MarketTutorialSubStep,
  getHighlightedStallForTutorial,
  getMarketTourCardContent,
  getNextMarketTutorialSubStep,
  isMarketTourStallStep,
  resolveMarketSubStepOnSceneState,
  shouldCompleteMarketTutorial,
} from './game/marketTutorial';
import {
  BaitInventory,
  REWARD_ROAD_MILESTONES,
  RewardBadgeType,
  WORM_BAIT_CATALOG,
  WormBaitId,
  WormBaitItem,
  applyXpGain,
  calculateCatchXp,
  claimLevelReward,
  consumeWormCastCharge,
  createEmptyBaitInventory,
  getLevelProgressFromTotalXp,
  getRewardRoadStatus,
  getUnclaimedRewardRoadCount,
  getWormBaitById,
  getXpRequiredForLevel,
  sanitizeBaitInventory,
  sanitizeClaimedLevelRewards,
  sanitizeEquippedBaitId,
  sanitizeLevelAndXp,
} from './game/levelSystem';
import {
  CUSTOM_FISH_IMAGES,
  RealisticFishThumb,
} from './game/RealisticFishThumb';
import {
  Language,
  t,
  getFishName,
  getRarityName,
  getRarityFilterLabel,
  getCosmeticName,
  getCosmeticDescription,
  formatNumber,
} from './game/i18n';
import {
  AnglerSkinPreview,
  CoinIcon,
  CosmeticItemDrawing,
  equipCosmeticWithRules,
  getCosmeticCategory,
  getCosmeticEquipGroup,
  PANTS_COLORS,
  SHIRT_COLORS,
  SkinStudioModal,
  SUIT_IDS,
} from './game/CosmeticVisuals';
import {
  CaughtPokemon,
  COSMETICS_CATALOG,
  calculateCombinedLuckMultiplier,
  calculateWeightedSellValue,
  formatFishWeight,
  getBestFishFromDiscovered,
  getRarityProbabilitySummary,
  getSpeciesOddsLabel,
  getSpeciesSellValue,
  isUnderworldSpecies,
  KANTO_SNOW_POKEMON,
  UNDERWORLD_POKEMON,
  ALL_FISH,
  LocalQuickSellMarket,
  mergeMaxFishWeightRecords,
  PokemonSpecies,
  RARITIES,
  Rarity,
  rollFishWeightKg,
  rollPokemonCatch,
  sanitizeMaxFishWeights,
  updateMaxFishWeightRecord,
} from './game/pokemonData';
import {
  deriveDeterministicFriendStats,
  sanitizeEquippedCosmetics,
  sanitizePlayerNameWithFallback,
  validatePlayerName,
} from './game/friendsLogic';
import { sound } from './game/sound';
import {
  parseAdminCommand,
  formatLuckTimeRemaining,
  AdminLuckResult,
} from './game/adminCommands';
import { formatOgOfferRemaining, isOgOfferActive } from './game/ogOffer';
import {
  RARITY_TUTORIAL_STORAGE_KEY,
  loadSeenRarityTutorialsFromStorage,
  markRarityTutorialSeen,
  sanitizeSeenRarityTutorials,
  saveSeenRarityTutorialsToStorage,
} from './game/rarityTutorial';
import {
  UnderworldGuideKind,
  clearUnderworldGuidesFromStorage,
  getUnderworldGuideContent,
  loadUnderworldGuideSeen,
  resolveActiveUnderworldGuide,
  saveUnderworldGuideSeen,
} from './game/underworldGuide';
import { onAuthStateChanged, User } from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  limit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import {
  auth,
  db,
  handleFirestoreError,
  OperationType,
  signInWithGoogle,
  signOutFromGoogle,
} from './firebase';

import {
  DailyQuestsState,
  applyCatchToDailyQuests,
  applyCoinsToDailyQuests,
  applyPlayTimeToDailyQuests,
  claimDailyQuestReward,
  createDailyQuestsForDate,
  ensureDailyQuestsCurrent,
  formatQuestProgressLabel,
  getDailyDateKey,
  getMsUntilNextDailyReset,
  loadDailyQuestsState,
  saveDailyQuestsState,
} from './game/dailyQuests';

type ActivePanel = 'none' | 'market' | 'locker' | 'index' | 'leaderboard' | 'friends' | 'profile' | 'quests' | 'rewards';
type LeaderboardTab = 'time' | 'money' | 'catches';
type DeleteProgressStep = 'none' | 'warn1' | 'warn2' | 'minigame';

const SAVE_KEY = 'infinite_catch_save_v2';
const BACKUP_SAVE_KEY = 'infinite_catch_backup_v1';
const TUTORIAL_STORAGE_KEY = 'infinite_catch_tutorial_v2_done';
const MINIGAME_TUTORIAL_STORAGE_KEY = 'infinite_catch_minigame_tutorial_done';
const ADMIN_EMAIL = 'salva2012mc@gmail.com';

const DELETE_LEGENDARY_CHALLENGE: CaughtPokemon = {
  uid: 'delete-progress-legendary',
  species:
    KANTO_SNOW_POKEMON.find((p) => p.rarity === 'Legendaria') ??
    KANTO_SNOW_POKEMON[0],
  sellValue: 0,
  caughtAt: 0,
};

interface CloudLeaderboardEntry {
  ownerUid: string;
  username: string;
  avatar: string;
  catches: number;
  money: number;
  timeSeconds: number;
  isAdmin: boolean;
  hasOgTitle: boolean;
  bestFishId?: number;
  discoveredCount?: number;
  masteredCount?: number;
  underworldUnlocked?: boolean;
  equippedCosmetics?: string[];
}

interface FriendEntry {
  ownerUid?: string;
  username: string;
  avatar: string;
  catches: number;
  money: number;
  timeSeconds: number;
  isFavorite?: boolean;
  bestFishId?: number;
  discoveredCount?: number;
  masteredCount?: number;
  underworldUnlocked?: boolean;
  equippedCosmetics?: string[];
}

interface InspectedPlayerProfile {
  source: 'leaderboard' | 'friends' | 'profile';
  ownerUid?: string;
  username: string;
  avatar: string;
  catches: number;
  money: number;
  timeSeconds: number;
  isAdmin?: boolean;
  hasOgTitle?: boolean;
  isMe?: boolean;
  isFavorite?: boolean;
  rank?: number;
  bestFishId?: number;
  discoveredCount?: number;
  masteredCount?: number;
  underworldUnlocked?: boolean;
  equippedCosmetics?: string[];
}

interface CatchHistoryEntry {
  uid: string;
  fishId: number;
  fishName: string;
  rarity: Rarity;
  weightKg?: number;
  caughtAt: number;
  variantIndex?: number;
}

function toCatchHistoryEntry(caught: CaughtPokemon): CatchHistoryEntry {
  const entry: CatchHistoryEntry = {
    uid: caught.uid,
    fishId: caught.species.id,
    fishName: caught.species.name,
    rarity: caught.species.rarity,
    caughtAt: Number(caught.caughtAt) || Date.now(),
  };
  if (typeof caught.weightKg === 'number' && Number.isFinite(caught.weightKg) && caught.weightKg > 0) {
    entry.weightKg = caught.weightKg;
  }
  if (typeof caught.variantIndex === 'number') {
    entry.variantIndex = caught.variantIndex;
  }
  return entry;
}

function sanitizeCatchHistory(raw: unknown): CatchHistoryEntry[] {
  if (!Array.isArray(raw)) return [];
  const result: CatchHistoryEntry[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const obj = item as Record<string, unknown>;
    const fishId = Number(obj.fishId);
    const matched = ALL_FISH.find((f) => f.id === fishId);
    const fishName =
      typeof obj.fishName === 'string' && obj.fishName.trim()
        ? obj.fishName.trim().slice(0, 64)
        : matched?.name;
    const rarityRaw = obj.rarity;
    const rarity: Rarity =
      typeof rarityRaw === 'string' && rarityRaw in RARITIES
        ? (rarityRaw as Rarity)
        : matched?.rarity ?? 'Común';
    if (!Number.isFinite(fishId) || !fishName) continue;
    const entry: CatchHistoryEntry = {
      uid:
        typeof obj.uid === 'string' && obj.uid
          ? obj.uid.slice(0, 80)
          : `hist-${fishId}-${result.length}`,
      fishId,
      fishName,
      rarity,
      caughtAt: Number(obj.caughtAt) || Date.now(),
    };
    if (typeof obj.weightKg === 'number' && Number.isFinite(obj.weightKg) && obj.weightKg > 0) {
      entry.weightKg = obj.weightKg;
    }
    if (typeof obj.variantIndex === 'number') {
      entry.variantIndex = obj.variantIndex;
    }
    result.push(entry);
    if (result.length >= 10) break;
  }
  return result;
}

function formatCatchDateTime(ts: number, lang: Language = 'en'): string {
  if (!ts || !Number.isFinite(ts)) return '—';
  const locale = lang === 'en' ? 'en-US' : 'es-ES';
  try {
    return new Intl.DateTimeFormat(locale, {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(new Date(ts));
  } catch {
    return new Date(ts).toLocaleString(locale);
  }
}

interface SaveData {
  coins: number;
  fishCount: number;
  totalCoinsEarned: number;
  playTimeSeconds: number;
  level?: number;
  xp?: number;
  totalXp?: number;
  discoveredFish: Record<number, number>;
  maxFishWeights?: Record<number, number>;
  ownedCosmetics: string[];
  equippedCosmetics: string[];
  googleSignedIn: boolean;
  username: string;
  avatar: string;
  friends: FriendEntry[];
  backpackCapacity: number;
  lastUsernameChangeAt?: number;
  hasOgTitle?: boolean;
  claimedIndexRewards?: Record<number, boolean>;
  claimedLevelRewards?: Record<number, boolean>;
  baitInventory?: BaitInventory;
  equippedBaitId?: WormBaitId | null;
  activeBaitCharges?: number;
  underworldUnlocked?: boolean;
  catchHistory?: CatchHistoryEntry[];
  seenRarityTutorials?: Rarity[];
  seenUnderworldIntro?: boolean;
  seenUnderworldMarketIntro?: boolean;
}

const LUCK_BOOST_DURATION_MS = 90_000;
const OG_CLAIMS_KEY = 'infinite_catch_og_claims_v1';

function loadOgClaims(): number {
  try {
    const raw = localStorage.getItem(OG_CLAIMS_KEY);
    return raw ? Math.max(0, Number(raw) || 0) : 0;
  } catch {
    return 0;
  }
}

const REGISTERED_ACCOUNTS_KEY = 'infinite_catch_accounts_v1';

const DEFAULT_REGISTERED_ACCOUNTS: Record<string, FriendEntry> = {};

function loadAccountRegistry(): Record<string, FriendEntry> {
  try {
    const raw = localStorage.getItem(REGISTERED_ACCOUNTS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Record<string, FriendEntry>;
      return { ...DEFAULT_REGISTERED_ACCOUNTS, ...parsed };
    }
  } catch {
    // ignore storage errors
  }
  return { ...DEFAULT_REGISTERED_ACCOUNTS };
}

function saveAccountRegistry(registry: Record<string, FriendEntry>) {
  try {
    localStorage.setItem(REGISTERED_ACCOUNTS_KEY, JSON.stringify(registry));
  } catch {
    // ignore storage errors
  }
}

function formatLongTime(secs: number): string {
  const safeSecs = Math.max(0, Math.floor(secs));
  const h = Math.floor(safeSecs / 3600);
  const m = Math.floor((safeSecs % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  const s = safeSecs % 60;
  return `${m}m ${s}s`;
}

const FORBIDDEN_WORDS = [
  'puta', 'putas', 'puto', 'putos', 'putita', 'puton', 'putoncio', 'putero',
  'mierda', 'mierdas', 'mierdon', 'caca',
  'polla', 'pollas', 'pollon', 'cipote', 'nabo', 'verga', 'vergas', 'vergon', 'pito', 'pija', 'rabo',
  'cono', 'coño', 'coños', 'chocho', 'coñazo',
  'cabron', 'cabrona', 'cabrones', 'cabronas', 'cabronazo', 'gilipollas', 'subnormal', 'retrasado', 'imbecil',
  'maricon', 'maricones', 'marica', 'maricas', 'mariconazo', 'bujarra',
  'chupala', 'mamada', 'mamarla', 'follar', 'folla', 'follada', 'follador',
  'capullo', 'capullos', 'hdp', 'hijoputa', 'hijadeputa', 'hijo de puta', 'malparido', 'malparida', 'gonorrea',
  'culiao', 'culiaos', 'conchetumadre', 'pendejo', 'pendeja', 'pendejos', 'zorra', 'zorras', 'zorron',
  'fuck', 'fucking', 'fucker', 'shit', 'shitty', 'bitch', 'bitches', 'cunt', 'dick', 'cock', 'pussy',
  'asshole', 'bastard', 'nigger', 'nigga', 'faggot', 'whore', 'slut', 'nazi', 'hitler'
];

function normalizeForProfanity(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[@4]/g, 'a')
    .replace(/[$5]/g, 's')
    .replace(/[0]/g, 'o')
    .replace(/[1!|]/g, 'i')
    .replace(/[3]/g, 'e');
}

export function validateFriendUsername(
  rawName: string,
  lang: Language = 'en'
): {
  valid: boolean;
  cleanName: string;
  error?: string;
} {
  const cleanName = rawName.trim();
  if (cleanName.length < 2 || cleanName.length > 20) {
    return {
      valid: false,
      cleanName,
      error:
        lang === 'en'
          ? 'Name must be between 2 and 20 characters.'
          : 'El nombre debe tener entre 2 y 20 caracteres.',
    };
  }

  // Standard names: letters, numbers, spaces, hyphens, underscores, and dots
  if (!/^[a-zA-Z0-9áéíóúÁÉÍÓÚñÑüÜ _.-]+$/.test(cleanName)) {
    return {
      valid: false,
      cleanName,
      error:
        lang === 'en'
          ? 'Name contains unsupported characters. Use standard letters and numbers.'
          : 'El nombre contiene caracteres no permitidos. Usa letras y números normales.',
    };
  }

  // Must include at least one letter
  if (!/[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ]/.test(cleanName)) {
    return {
      valid: false,
      cleanName,
      error:
        lang === 'en'
          ? 'Name must contain at least one letter.'
          : 'El nombre debe contener al menos una letra.',
    };
  }

  const normalized = normalizeForProfanity(cleanName);
  const words = normalized.split(/[\s_.-]+/);

  for (const bad of FORBIDDEN_WORDS) {
    if (words.some((w) => w === bad)) {
      return {
        valid: false,
        cleanName,
        error:
          lang === 'en'
            ? 'Inappropriate or offensive words are not allowed.'
            : 'No se permiten palabras malsonantes ni inapropiadas.',
      };
    }
    if (bad.length >= 4 && normalized.includes(bad)) {
      return {
        valid: false,
        cleanName,
        error:
          lang === 'en'
            ? 'Inappropriate or offensive words are not allowed.'
            : 'No se permiten palabras malsonantes ni inapropiadas.',
      };
    }
  }

  return { valid: true, cleanName };
}

function getOrGenerateFriendEntry(
  rawName: string,
  leaderboardEntries: CloudLeaderboardEntry[]
): FriendEntry {
  const clean = rawName.trim();
  const key = clean.toLowerCase();

  // 1. Check live online leaderboard
  const online = leaderboardEntries.find(
    (e) => e.username.trim().toLowerCase() === key
  );
  if (online) {
    return {
      ownerUid: online.ownerUid,
      username: online.username,
      avatar: online.avatar,
      catches: online.catches,
      money: online.money,
      timeSeconds: online.timeSeconds,
      bestFishId: online.bestFishId,
      discoveredCount: online.discoveredCount,
      masteredCount: online.masteredCount,
      underworldUnlocked: online.underworldUnlocked,
      equippedCosmetics: online.equippedCosmetics ?? [],
    };
  }

  // 2. Check local account registry
  const registry = loadAccountRegistry();
  if (registry[key]) {
    const existing = registry[key];
    if (
      existing.bestFishId === undefined ||
      existing.equippedCosmetics === undefined
    ) {
      const derived = deriveDeterministicFriendStats(
        existing.username,
        existing.catches
      );
      return {
        ...existing,
        ...derived,
        equippedCosmetics:
          existing.equippedCosmetics ?? derived.equippedCosmetics,
      };
    }
    return existing;
  }

  // 3. Generate deterministic stats based on name hash
  let hash = 0;
  for (let i = 0; i < clean.length; i++) {
    hash = (hash << 5) - hash + clean.charCodeAt(i);
    hash |= 0;
  }
  const abs = Math.abs(hash);
  const avatars = ['🎣', '🐟', '🦈', '🌊', '🚣', '🐠', '🐳', '🌟', '🏆', '⚓', '🦦', '🐧'];
  const avatar = avatars[abs % avatars.length];
  const catches = 35 + (abs % 420);
  const money = 950 + ((abs * 47) % 68000);
  const timeSeconds = 2400 + ((abs * 83) % 48000);
  const extra = deriveDeterministicFriendStats(clean, catches);

  const newEntry: FriendEntry = {
    username: clean,
    avatar,
    catches,
    money,
    timeSeconds,
    ...extra,
  };

  registry[key] = newEntry;
  saveAccountRegistry(registry);
  return newEntry;
}

function calculateBestFriendScore(f: FriendEntry): number {
  const favWeight = f.isFavorite ? 100_000_000 : 0;
  return favWeight + (f.money || 0) + (f.catches || 0) * 60 + (f.timeSeconds || 0);
}

function hasUnderworldFishRecords(
  discovered?: Record<number, number>,
  history?: CatchHistoryEntry[],
  inv?: CaughtPokemon[]
): boolean {
  if (
    discovered &&
    Object.entries(discovered).some(([id, count]) => Number(id) >= 101 && Number(count) > 0)
  ) {
    return true;
  }
  if (history && history.some((entry) => Number(entry.fishId) >= 101)) {
    return true;
  }
  if (inv && inv.some((item) => Number(item?.species?.id) >= 101)) {
    return true;
  }
  return false;
}

function extractWeightsFromHistory(
  history?: CatchHistoryEntry[],
  inv?: CaughtPokemon[]
): Record<number, number> {
  let acc: Record<number, number> = {};
  if (history) {
    for (const h of history) {
      acc = updateMaxFishWeightRecord(acc, h.fishId, h.weightKg);
    }
  }
  if (inv) {
    for (const item of inv) {
      if (item?.species?.id) {
        acc = updateMaxFishWeightRecord(acc, item.species.id, item.weightKg);
      }
    }
  }
  return acc;
}

function loadSaveData(): SaveData {
  let flagUnlocked = false;
  try {
    flagUnlocked = localStorage.getItem('ice_fishing_underworld_unlocked') === '1';
  } catch {
    // ignore storage errors
  }
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<SaveData>;
      const discovered = parsed.discoveredFish ?? {};
      const history = sanitizeCatchHistory(parsed.catchHistory);
      const maxWeights = mergeMaxFishWeightRecords(
        sanitizeMaxFishWeights(parsed.maxFishWeights),
        extractWeightsFromHistory(history)
      );
      const safeName = sanitizePlayerNameWithFallback(
        parsed.username,
        'male',
        'en'
      );
      const safeLevelXp = sanitizeLevelAndXp(
        parsed.level,
        parsed.xp,
        parsed.totalXp
      );
      return {
        coins: parsed.coins ?? 0,
        fishCount: parsed.fishCount ?? 0,
        totalCoinsEarned: parsed.totalCoinsEarned ?? 0,
        playTimeSeconds: parsed.playTimeSeconds ?? 0,
        level: safeLevelXp.level,
        xp: safeLevelXp.xp,
        totalXp: safeLevelXp.totalXp,
        discoveredFish: discovered,
        maxFishWeights: maxWeights,
        ownedCosmetics: parsed.ownedCosmetics ?? [],
        equippedCosmetics: parsed.equippedCosmetics ?? [],
        googleSignedIn: parsed.googleSignedIn ?? false,
        username: safeName,
        avatar: parsed.avatar ?? '🐟',
        friends: (parsed.friends ?? []).filter(
          (f) => Boolean(loadAccountRegistry()[f.username.toLowerCase()])
        ),
        backpackCapacity: parsed.backpackCapacity ?? 10,
        lastUsernameChangeAt: parsed.lastUsernameChangeAt ?? 0,
        hasOgTitle: parsed.hasOgTitle ?? false,
        claimedIndexRewards: parsed.claimedIndexRewards ?? {},
        claimedLevelRewards: sanitizeClaimedLevelRewards(
          parsed.claimedLevelRewards
        ),
        baitInventory: sanitizeBaitInventory(parsed.baitInventory),
        equippedBaitId: sanitizeEquippedBaitId(parsed.equippedBaitId),
        activeBaitCharges:
          typeof parsed.activeBaitCharges === 'number' &&
          Number.isFinite(parsed.activeBaitCharges)
            ? Math.max(0, Math.min(99, Math.floor(parsed.activeBaitCharges)))
            : 0,
        underworldUnlocked:
          Boolean(parsed.underworldUnlocked) ||
          hasUnderworldFishRecords(discovered, history),
        catchHistory: history,
        seenRarityTutorials: sanitizeSeenRarityTutorials(
          parsed.seenRarityTutorials ?? loadSeenRarityTutorialsFromStorage()
        ),
        seenUnderworldIntro:
          Boolean(parsed.seenUnderworldIntro) ||
          loadUnderworldGuideSeen('underworld'),
        seenUnderworldMarketIntro:
          Boolean(parsed.seenUnderworldMarketIntro) ||
          loadUnderworldGuideSeen('underworld_market'),
      };
    }
  } catch {
    // ignore storage errors
  }
  return {
    coins: 0,
    fishCount: 0,
    totalCoinsEarned: 0,
    playTimeSeconds: 0,
    level: 1,
    xp: 0,
    totalXp: 0,
    discoveredFish: {},
    maxFishWeights: {},
    ownedCosmetics: [],
    equippedCosmetics: [],
    googleSignedIn: false,
    username: 'Angler',
    avatar: '🐟',
    friends: [],
    backpackCapacity: 10,
    lastUsernameChangeAt: 0,
    hasOgTitle: false,
    claimedIndexRewards: {},
    claimedLevelRewards: {},
    baitInventory: createEmptyBaitInventory(),
    equippedBaitId: null,
    activeBaitCharges: 0,
    underworldUnlocked: false,
    catchHistory: [],
    seenRarityTutorials: loadSeenRarityTutorialsFromStorage(),
    seenUnderworldIntro: loadUnderworldGuideSeen('underworld'),
    seenUnderworldMarketIntro: loadUnderworldGuideSeen('underworld_market'),
  };
}

function getBackpackUpgradeInfo(capacity: number): {
  maxed: boolean;
  step: number;
  cost: number;
} {
  if (capacity >= 100) {
    return { maxed: true, step: 0, cost: 0 };
  }
  if (capacity < 50) {
    return {
      maxed: false,
      step: 1,
      cost: 100 + (capacity - 10) * 10,
    };
  }
  return {
    maxed: false,
    step: 2,
    cost: 500 + Math.floor((capacity - 50) / 2) * 20,
  };
}

function WormBaitIllustrationSvg({
  baitId,
  size = 48,
}: {
  baitId: WormBaitId;
  size?: number;
}) {
  if (baitId === 'worm_harbor') {
    return (
      <div
        style={{ width: size, height: size }}
        className="rounded-xl bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#0c4a6e] border border-[#38bdf8]/45 p-1 flex items-center justify-center shrink-0 shadow-inner"
      >
        <svg viewBox="0 0 48 48" className="w-full h-full">
          {/* Harbor water ripples */}
          <ellipse cx="24" cy="40" rx="14" ry="3" fill="#38bdf8" opacity="0.28" />
          {/* Steel hook */}
          <path
            d="M25 6 V22 C25 27 19 27 19 22"
            stroke="#cbd5e1"
            strokeWidth="2.2"
            fill="none"
            strokeLinecap="round"
          />
          <circle cx="25" cy="5.5" r="1.8" fill="none" stroke="#e2e8f0" strokeWidth="1.6" />
          {/* Harbor coral-red segmented worm */}
          <path
            d="M14 33 C11 27, 17 20, 24 22 C31 24, 36 19, 34 13"
            stroke="#991b1b"
            strokeWidth="8.5"
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M14 33 C11 27, 17 20, 24 22 C31 24, 36 19, 34 13"
            stroke="#fb7185"
            strokeWidth="6"
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M14 33 C11 27, 17 20, 24 22 C31 24, 36 19, 34 13"
            stroke="#fecdd3"
            strokeWidth="2"
            strokeDasharray="1.8 4.2"
            strokeLinecap="round"
            fill="none"
          />
          {/* 2x Luck clover spark */}
          <circle cx="37" cy="33" r="6.5" fill="#166534" stroke="#4ade80" strokeWidth="1.3" />
          <text
            x="37"
            y="35.5"
            textAnchor="middle"
            fontSize="7.2"
            fontWeight="900"
            fill="#dcfce7"
          >
            2x
          </text>
        </svg>
      </div>
    );
  }

  if (baitId === 'worm_korean') {
    return (
      <div
        style={{ width: size, height: size }}
        className="rounded-xl bg-gradient-to-br from-[#1c1917] via-[#292524] to-[#451a03] border border-[#f59e0b]/55 p-1 flex items-center justify-center shrink-0 shadow-inner"
      >
        <svg viewBox="0 0 48 48" className="w-full h-full">
          {/* Speed breeze lines */}
          <path
            d="M7 16 H15 M6 23 H13 M9 30 H16"
            stroke="#fde047"
            strokeWidth="1.8"
            strokeLinecap="round"
            opacity="0.7"
          />
          {/* Hook */}
          <path
            d="M26 6 V20 C26 25 20 25 20 20"
            stroke="#e2e8f0"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
          />
          {/* Coherent natural golden-amber Korean worm */}
          <path
            d="M15 35 C13 27, 19 20, 25 21 C32 22, 37 17, 35 11"
            stroke="#92400e"
            strokeWidth="9"
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M15 35 C13 27, 19 20, 25 21 C32 22, 37 17, 35 11"
            stroke="#f59e0b"
            strokeWidth="6.4"
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M15 35 C13 27, 19 20, 25 21 C32 22, 37 17, 35 11"
            stroke="#fef08a"
            strokeWidth="2.4"
            strokeDasharray="2 3.8"
            strokeLinecap="round"
            fill="none"
          />
          {/* Natural lateral bristles of Korean ragworm */}
          <circle cx="19" cy="26" r="1" fill="#fde047" />
          <circle cx="25" cy="21" r="1" fill="#fde047" />
          <circle cx="31" cy="18" r="1" fill="#fde047" />
          {/* 5 casts badge */}
          <rect
            x="29"
            y="28"
            width="15"
            height="12"
            rx="4"
            fill="#78350f"
            stroke="#fbbf24"
            strokeWidth="1.3"
          />
          <text
            x="36.5"
            y="36.5"
            textAnchor="middle"
            fontSize="7"
            fontWeight="900"
            fill="#fef08a"
          >
            x5
          </text>
        </svg>
      </div>
    );
  }

  // worm_luck5 (Gusano Marea x5)
  return (
    <div
      style={{ width: size, height: size }}
      className="rounded-xl bg-gradient-to-br from-[#042f2e] via-[#0f172a] to-[#1e1b4b] border border-[#2dd4bf]/60 p-1 flex items-center justify-center shrink-0 shadow-inner"
    >
      <svg viewBox="0 0 48 48" className="w-full h-full">
        {/* Tide aura */}
        <circle cx="24" cy="24" r="15" fill="#14b8a6" opacity="0.16" />
        {/* Hook */}
        <path
          d="M25 6 V20 C25 25 19 25 19 20"
          stroke="#fef08a"
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
        />
        {/* High-luck tide worm body */}
        <path
          d="M13 34 C11 26, 18 19, 25 21 C32 23, 38 17, 35 10"
          stroke="#0f766e"
          strokeWidth="9"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M13 34 C11 26, 18 19, 25 21 C32 23, 38 17, 35 10"
          stroke="#2dd4bf"
          strokeWidth="6.2"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M13 34 C11 26, 18 19, 25 21 C32 23, 38 17, 35 10"
          stroke="#fde047"
          strokeWidth="2.4"
          strokeDasharray="2.2 3.8"
          strokeLinecap="round"
          fill="none"
        />
        {/* 5x Luck Star Crest */}
        <circle cx="36" cy="33" r="7.5" fill="#065f46" stroke="#fde047" strokeWidth="1.4" />
        <text
          x="36"
          y="35.8"
          textAnchor="middle"
          fontSize="7.4"
          fontWeight="900"
          fill="#fde047"
        >
          5x
        </text>
      </svg>
    </div>
  );
}

function RewardRoadBadgeSvg({ badgeType }: { badgeType: RewardBadgeType }) {
  switch (badgeType) {
    case 'worm_harbor':
    case 'worm_korean':
    case 'worm_luck5':
      return <WormBaitIllustrationSvg baitId={badgeType} size={36} />;
    case 'coin_pouch':
      return (
        <svg viewBox="0 0 36 36" className="w-7 h-7">
          <path
            d="M13 10 L23 10 L20 14 L16 14 Z"
            fill="#b45309"
            stroke="#78350f"
            strokeWidth="1.2"
          />
          <path
            d="M10 23 C10 16, 14 14, 18 14 C22 14, 26 16, 26 23 C26 28, 23 30, 18 30 C13 30, 10 28, 10 23 Z"
            fill="#f59e0b"
            stroke="#92400e"
            strokeWidth="1.6"
          />
          <circle cx="18" cy="22" r="4.5" fill="#fde047" stroke="#b45309" strokeWidth="1.2" />
          <text x="18" y="24.5" textAnchor="middle" fontSize="7" fontWeight="900" fill="#78350f">
            $
          </text>
        </svg>
      );
    case 'coin_chest':
      return (
        <svg viewBox="0 0 36 36" className="w-7 h-7">
          <rect
            x="6"
            y="14"
            width="24"
            height="15"
            rx="3"
            fill="#b45309"
            stroke="#451a03"
            strokeWidth="1.6"
          />
          <path
            d="M6 17 H30"
            stroke="#fde047"
            strokeWidth="2.2"
          />
          <circle cx="14" cy="13" r="3" fill="#fde047" stroke="#92400e" strokeWidth="1" />
          <circle cx="19" cy="12" r="3.2" fill="#facc15" stroke="#92400e" strokeWidth="1" />
          <circle cx="23" cy="13.5" r="2.8" fill="#fde047" stroke="#92400e" strokeWidth="1" />
          <rect x="16" y="16" width="4" height="5" rx="1" fill="#fde047" stroke="#78350f" strokeWidth="1" />
        </svg>
      );
    case 'coin_vault':
      return (
        <svg viewBox="0 0 36 36" className="w-7 h-7">
          <rect
            x="6"
            y="7"
            width="24"
            height="22"
            rx="4"
            fill="#312e81"
            stroke="#fbbf24"
            strokeWidth="1.8"
          />
          <circle cx="18" cy="18" r="6.5" fill="#fde047" stroke="#b45309" strokeWidth="1.5" />
          <path d="M18 13 V23 M13 18 H23" stroke="#92400e" strokeWidth="1.6" strokeLinecap="round" />
          <circle cx="18" cy="18" r="2.2" fill="#78350f" />
        </svg>
      );
    case 'clover_luck':
      return (
        <svg viewBox="0 0 36 36" className="w-7 h-7">
          <circle cx="14.5" cy="14" r="5" fill="#22c55e" stroke="#14532d" strokeWidth="1.3" />
          <circle cx="21.5" cy="14" r="5" fill="#22c55e" stroke="#14532d" strokeWidth="1.3" />
          <circle cx="14.5" cy="21" r="5" fill="#16a34a" stroke="#14532d" strokeWidth="1.3" />
          <circle cx="21.5" cy="21" r="5" fill="#16a34a" stroke="#14532d" strokeWidth="1.3" />
          <circle cx="18" cy="17.5" r="2.5" fill="#fde047" />
          <path d="M18 23 Q18 28 15 30" stroke="#15803d" strokeWidth="2.2" strokeLinecap="round" fill="none" />
        </svg>
      );
    case 'demon_portal':
      return (
        <svg viewBox="0 0 36 36" className="w-7 h-7">
          <circle cx="18" cy="19" r="11" fill="#7f1d1d" stroke="#ef4444" strokeWidth="1.6" />
          <path d="M9 13 C7 8, 11 6, 13 11" fill="#fde047" stroke="#991b1b" strokeWidth="1.2" />
          <path d="M27 13 C29 8, 25 6, 23 11" fill="#fde047" stroke="#991b1b" strokeWidth="1.2" />
          <circle cx="14.5" cy="18" r="2" fill="#fde047" />
          <circle cx="21.5" cy="18" r="2" fill="#fde047" />
          <path d="M13 24 Q18 27 23 24" stroke="#fde047" strokeWidth="1.8" strokeLinecap="round" fill="none" />
        </svg>
      );
    case 'master_trophy':
      return (
        <svg viewBox="0 0 36 36" className="w-7 h-7">
          <path
            d="M11 8 H25 V16 C25 20.5 22 23 18 23 C14 23 11 20.5 11 16 Z"
            fill="#fbbf24"
            stroke="#92400e"
            strokeWidth="1.5"
          />
          <path d="M11 10 H7 C7 15 9 17 11 17 M25 10 H29 C29 15 27 17 25 17" stroke="#d97706" strokeWidth="1.6" fill="none" />
          <rect x="16" y="23" width="4" height="5" fill="#d97706" />
          <rect x="12" y="27" width="12" height="3" rx="1.2" fill="#92400e" />
          <circle cx="18" cy="15" r="2.5" fill="#38bdf8" stroke="#0369a1" strokeWidth="1" />
        </svg>
      );
    case 'legend_crown':
      return (
        <svg viewBox="0 0 36 36" className="w-7 h-7">
          <path
            d="M6 25 L8 12 L14 18 L18 9 L22 18 L28 12 L30 25 Z"
            fill="#fde047"
            stroke="#b45309"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          <rect x="6" y="25" width="24" height="3.5" rx="1.5" fill="#d97706" stroke="#78350f" strokeWidth="1.2" />
          <circle cx="18" cy="19" r="2.2" fill="#ef4444" />
          <circle cx="12" cy="21" r="1.6" fill="#38bdf8" />
          <circle cx="24" cy="21" r="1.6" fill="#38bdf8" />
        </svg>
      );
  }
}

function PermadeathSkullAvatar({ size = 24 }: { size?: number }) {
  return (
    <span
      style={{ width: size, height: size }}
      className="inline-flex items-center justify-center rounded-lg bg-gradient-to-b from-[#991b1b] to-[#450a0a] border border-[#ef4444] shadow-[0_0_10px_rgba(220,38,38,0.85)] shrink-0 overflow-hidden"
    >
      <svg
        width={Math.round(size * 0.78)}
        height={Math.round(size * 0.78)}
        viewBox="0 0 16 16"
        shapeRendering="crispEdges"
      >
        {/* Cráneo blanco pixelado */}
        <rect x="3" y="2" width="10" height="2" fill="#f8fafc" />
        <rect x="2" y="4" width="12" height="6" fill="#f8fafc" />
        <rect x="3" y="10" width="10" height="2" fill="#e2e8f0" />
        {/* Mandíbula y dientes */}
        <rect x="4" y="12" width="2" height="2" fill="#f8fafc" />
        <rect x="7" y="12" width="2" height="2" fill="#f8fafc" />
        <rect x="10" y="12" width="2" height="2" fill="#f8fafc" />
        {/* Cuencas de ojos */}
        <rect x="4" y="5" width="3" height="3" fill="#0f172a" />
        <rect x="9" y="5" width="3" height="3" fill="#0f172a" />
        {/* Pupilas rojas Permadeath */}
        <rect x="5" y="6" width="1" height="1" fill="#ef4444" />
        <rect x="10" y="6" width="1" height="1" fill="#ef4444" />
        {/* Nariz */}
        <rect x="7" y="9" width="2" height="2" fill="#0f172a" />
      </svg>
    </span>
  );
}

const MASTERY_AVATAR_PREFIX = 'fish_mastery_';
const REAL_FISH_AVATARS = ALL_FISH.filter((f) => Boolean(CUSTOM_FISH_IMAGES[f.id]));

function getMasteryAvatarFrameStyle(): string {
  return 'from-[#fef08a] via-[#eab308] to-[#b45309] border-[#fde047] shadow-[0_0_10px_rgba(250,204,21,0.8)]';
}

function MasteryFishAvatar({
  species,
  size = 24,
}: {
  species: PokemonSpecies;
  size?: number;
}) {
  const frameCls = getMasteryAvatarFrameStyle();
  const hasRealImg = Boolean(CUSTOM_FISH_IMAGES[species.id]);
  return (
    <span
      style={{ width: size, height: size }}
      className={`relative inline-flex items-center justify-center rounded-lg bg-gradient-to-br border shrink-0 overflow-hidden ${frameCls}`}
    >
      <span className="absolute inset-0 bg-[radial-gradient(circle_at_30%_25%,rgba(255,255,255,0.48),transparent_65%)] pointer-events-none" />
      {hasRealImg ? (
        <RealisticFishThumb
          fishId={species.id}
          alt={species.name}
          square
          className="relative w-[88%] h-[88%] object-contain drop-shadow-[0_1px_2px_rgba(69,26,3,0.75)]"
        />
      ) : (
        <span
          className="relative w-3/5 h-3/5 rounded-full border border-white/80"
          style={{ backgroundColor: species.spriteColor }}
        />
      )}
    </span>
  );
}

function renderAvatar(av: string, size = 24) {
  if (av === 'permadeath_admin') {
    return <PermadeathSkullAvatar size={size} />;
  }
  if (av.startsWith(MASTERY_AVATAR_PREFIX)) {
    const fishId = Number(av.slice(MASTERY_AVATAR_PREFIX.length));
    const species = ALL_FISH.find((f) => f.id === fishId);
    if (species) {
      return <MasteryFishAvatar species={species} size={size} />;
    }
  }
  return <span className="leading-none">{av}</span>;
}

export default function App() {
  const initialSave = useRef<SaveData>(loadSaveData()).current;

  const [mode, setMode] = useState<GameMode>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('autostart') === '1') return 'playing';
    }
    return 'title';
  });

  const [lang, setLang] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem('infinite_catch_lang');
      if (saved === 'en' || saved === 'es') return saved;
    } catch {}
    return 'en';
  });

  const setLanguage = useCallback((next: Language) => {
    sound.playClick();
    setLang(next);
    try {
      localStorage.setItem('infinite_catch_lang', next);
    } catch {}
  }, []);

  const [graphicsQuality, setGraphicsQuality] = useState<GraphicsQuality>(() => {
    try {
      const saved = localStorage.getItem('infinite_catch_graphics');
      if (saved === 'low' || saved === 'normal' || saved === 'rtx') return saved;
    } catch {}
    return 'normal';
  });

  const setGraphics = useCallback((next: GraphicsQuality) => {
    sound.playClick();
    setGraphicsQuality(next);
    try {
      localStorage.setItem('infinite_catch_graphics', next);
    } catch {}
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const fishingStateRef = useRef<FishingState>({
    ...createInitialFishingState(),
    fishCount: initialSave.fishCount,
  });

  const [phase, setPhase] = useState<FishingPhase>('IDLE');
  const [fishCount, setFishCount] = useState<number>(initialSave.fishCount);
  const [coins, setCoins] = useState<number>(initialSave.coins);
  const [totalCoinsEarned, setTotalCoinsEarned] = useState<number>(
    initialSave.totalCoinsEarned
  );
  const [playTimeSeconds, setPlayTimeSeconds] = useState<number>(
    initialSave.playTimeSeconds
  );
  const [totalXp, setTotalXp] = useState<number>(
    () => sanitizeLevelAndXp(initialSave.level, initialSave.xp, initialSave.totalXp).totalXp
  );
  const totalXpRef = useRef<number>(totalXp);
  totalXpRef.current = totalXp;
  const levelProgress = useMemo(
    () => getLevelProgressFromTotalXp(totalXp),
    [totalXp]
  );
  const [lastXpGain, setLastXpGain] = useState<{ amount: number; key: number } | null>(
    null
  );
  const xpGainTimerRef = useRef<number | null>(null);
  const [levelUpAlert, setLevelUpAlert] = useState<{
    newLevel: number;
    levelsGained: number;
    nextTargetXp: number;
    key: number;
  } | null>(null);
  const levelUpTimerRef = useRef<number | null>(null);
  const [levelUpGlowActive, setLevelUpGlowActive] = useState<boolean>(false);
  const levelUpGlowTimerRef = useRef<number | null>(null);
  const [seenRarityTutorials, setSeenRarityTutorials] = useState<Rarity[]>(() =>
    sanitizeSeenRarityTutorials(
      initialSave.seenRarityTutorials ?? loadSeenRarityTutorialsFromStorage()
    )
  );
  const [seenUnderworldIntro, setSeenUnderworldIntro] = useState<boolean>(
    () =>
      Boolean(initialSave.seenUnderworldIntro) ||
      loadUnderworldGuideSeen('underworld')
  );
  const [seenUnderworldMarketIntro, setSeenUnderworldMarketIntro] =
    useState<boolean>(
      () =>
        Boolean(initialSave.seenUnderworldMarketIntro) ||
        loadUnderworldGuideSeen('underworld_market')
    );
  const [discoveredFish, setDiscoveredFish] = useState<Record<number, number>>(
    initialSave.discoveredFish
  );
  const [maxFishWeights, setMaxFishWeights] = useState<Record<number, number>>(
    initialSave.maxFishWeights ?? {}
  );
  const [inventory, setInventory] = useState<CaughtPokemon[]>([]);
  const [catchHistory, setCatchHistory] = useState<CatchHistoryEntry[]>(
    initialSave.catchHistory ?? []
  );
  const [lastCaught, setLastCaught] = useState<CaughtPokemon | null>(null);
  const [pendingCatch, setPendingCatch] = useState<CaughtPokemon | null>(null);
  const [activeMinigame, setActiveMinigame] = useState<CaughtPokemon | null>(null);
  const [ownedCosmetics, setOwnedCosmetics] = useState<string[]>(
    initialSave.ownedCosmetics
  );
  const [equippedCosmetics, setEquippedCosmetics] = useState<string[]>(
    initialSave.equippedCosmetics
  );
  const [googleSignedIn, setGoogleSignedIn] = useState<boolean>(
    initialSave.googleSignedIn
  );
  const [username, setUsername] = useState<string>(initialSave.username);
  const [usernameDraft, setUsernameDraft] = useState<string>(initialSave.username);
  const [usernameError, setUsernameError] = useState<string>('');
  const [usernameSaved, setUsernameSaved] = useState<boolean>(false);
  const [avatar, setAvatar] = useState<string>(initialSave.avatar);
  const [friends, setFriends] = useState<FriendEntry[]>(initialSave.friends);
  const [backpackCapacity, setBackpackCapacity] = useState<number>(
    initialSave.backpackCapacity
  );
  const [lastUsernameChangeAt, setLastUsernameChangeAt] = useState<number>(
    initialSave.lastUsernameChangeAt ?? 0
  );
  const [adminSelectedFishId, setAdminSelectedFishId] = useState<number>(
    KANTO_SNOW_POKEMON[0].id
  );
  const [previewCosmeticId, setPreviewCosmeticId] = useState<string | null>(null);
  const [skinStudioTab, setSkinStudioTab] = useState<'wardrobe' | 'shop'>('wardrobe');
  const [hasOgTitle, setHasOgTitle] = useState<boolean>(
    initialSave.hasOgTitle ?? false
  );
  const [ogClaims, setOgClaims] = useState<number>(() => loadOgClaims());
  const [ogClaimLoading, setOgClaimLoading] = useState<boolean>(false);
  const [ogClaimError, setOgClaimError] = useState<string>('');
  const [ogOfferNowMs, setOgOfferNowMs] = useState<number>(() => Date.now());
  const ogOfferActive = isOgOfferActive(ogOfferNowMs);
  const [tutorialStep, setTutorialStep] = useState<number>(() => {
    const localProgress = {
      fishCount: initialSave.fishCount,
      totalCoinsEarned: initialSave.totalCoinsEarned,
      coins: initialSave.coins,
      playTimeSeconds: initialSave.playTimeSeconds,
      discoveredFish: initialSave.discoveredFish,
      ownedCosmetics: initialSave.ownedCosmetics,
      catchHistoryLength: initialSave.catchHistory?.length,
      hasOgTitle: initialSave.hasOgTitle,
      underworldUnlocked: initialSave.underworldUnlocked,
    };
    try {
      const doneNew = Boolean(localStorage.getItem(TUTORIAL_STORAGE_KEY));
      const doneLegacy = Boolean(
        localStorage.getItem('infinite_catch_tutorial_done')
      );
      const step = resolveInitialTutorialStep({
        tutorialDoneFlag: doneNew,
        legacyTutorialDoneFlag: doneLegacy,
        accountProgress: localProgress,
      });
      if (step === 0 && !doneNew) {
        localStorage.setItem(TUTORIAL_STORAGE_KEY, '1');
      }
      return step;
    } catch {
      return resolveInitialTutorialStep({
        tutorialDoneFlag: false,
        accountProgress: localProgress,
      });
    }
  });
  const [minigameTutorialDone, setMinigameTutorialDone] = useState<boolean>(() => {
    if (
      getAccountCatchCount({
        fishCount: initialSave.fishCount,
        discoveredFish: initialSave.discoveredFish,
      }) > 0
    ) {
      return true;
    }
    try {
      return Boolean(localStorage.getItem(MINIGAME_TUTORIAL_STORAGE_KEY));
    } catch {
      return false;
    }
  });
  const dismissTutorial = useCallback(() => {
    sound.playClick();
    if (getAccountCatchCount({ fishCount, discoveredFish }) === 0) {
      setTutorialStep(1);
      setActivePanel('none');
      return;
    }
    setTutorialStep(0);
    setActivePanel('none');
    try {
      localStorage.setItem(TUTORIAL_STORAGE_KEY, '1');
    } catch {}
  }, [fishCount, discoveredFish]);
  const [marketClothingFilter, setMarketClothingFilter] = useState<
    'all' | 'suits' | 'shirts' | 'pants' | 'head'
  >('all');
  const [claimedIndexRewards, setClaimedIndexRewards] = useState<
    Record<number, boolean>
  >(initialSave.claimedIndexRewards ?? {});
  const [claimedLevelRewards, setClaimedLevelRewards] = useState<
    Record<number, boolean>
  >(() => sanitizeClaimedLevelRewards(initialSave.claimedLevelRewards));
  const [rewardRoadBanner, setRewardRoadBanner] = useState<string>('');
  const [baitInventory, setBaitInventory] = useState<BaitInventory>(() =>
    sanitizeBaitInventory(initialSave.baitInventory)
  );
  const baitInventoryRef = useRef<BaitInventory>(baitInventory);
  baitInventoryRef.current = baitInventory;
  const [equippedBaitId, setEquippedBaitId] = useState<WormBaitId | null>(() =>
    sanitizeEquippedBaitId(initialSave.equippedBaitId)
  );
  const equippedBaitIdRef = useRef<WormBaitId | null>(equippedBaitId);
  equippedBaitIdRef.current = equippedBaitId;
  const [activeBaitCharges, setActiveBaitCharges] = useState<number>(() =>
    Math.max(0, Math.floor(initialSave.activeBaitCharges ?? 0))
  );
  const activeBaitChargesRef = useRef<number>(activeBaitCharges);
  activeBaitChargesRef.current = activeBaitCharges;
  const [lastCastWorm, setLastCastWorm] = useState<WormBaitItem | null>(null);
  const lastCastWormRef = useRef<WormBaitItem | null>(null);
  lastCastWormRef.current = lastCastWorm;
  const [rodsShopNotice, setRodsShopNotice] = useState<string>('');
  const [newFishAlert, setNewFishAlert] = useState<PokemonSpecies | null>(null);
  const newFishTimerRef = useRef<number | null>(null);
  const newFishDelayRef = useRef<number | null>(null);
  const [masteryAlert, setMasteryAlert] = useState<PokemonSpecies | null>(null);
  const masteryTimerRef = useRef<number | null>(null);
  const [customLuckMultiplier, setCustomLuckMultiplier] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('infinite_catch_custom_luck_mult');
      if (saved) {
        const val = parseFloat(saved);
        if (Number.isFinite(val) && val >= 1) return val;
      }
    } catch {
      // fallback
    }
    return 2;
  });
  const [luckBoostUntil, setLuckBoostUntil] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('infinite_catch_luck_boost_until');
      if (saved) {
        const val = parseInt(saved, 10);
        if (Number.isFinite(val) && val > Date.now()) return val;
      }
    } catch {
      // fallback
    }
    return 0;
  });
  const [luckNowMs, setLuckNowMs] = useState<number>(() => Date.now());
  const customLuckMultiplierRef = useRef<number>(customLuckMultiplier);
  const luckBoostUntilRef = useRef<number>(luckBoostUntil);
  useEffect(() => {
    customLuckMultiplierRef.current = customLuckMultiplier;
    luckBoostUntilRef.current = luckBoostUntil;
  }, [customLuckMultiplier, luckBoostUntil]);
  const [dailyQuests, setDailyQuests] = useState<DailyQuestsState>(() =>
    loadDailyQuestsState()
  );
  const dailyQuestsRef = useRef<DailyQuestsState>(dailyQuests);
  const [questClaimBanner, setQuestClaimBanner] = useState<string>('');
  const [luckChestMilestone, setLuckChestMilestone] = useState<number | null>(null);
  const luckChestTriggeredRef = useRef<number>(
    Math.floor(initialSave.fishCount / 100) * 100
  );
  const [failedMinigameCatch, setFailedMinigameCatch] =
    useState<CaughtPokemon | null>(null);
  const [failedMinigameReason, setFailedMinigameReason] =
    useState<FightFailReason>('none');
  const fightTelemetryRef = useRef<FightTelemetry>(
    createInitialFightTelemetry()
  );
  const [minigameReviveCost, setMinigameReviveCost] = useState<number>(10);
  const [minigameKey, setMinigameKey] = useState<number>(0);
  const [deleteStep, setDeleteStep] = useState<DeleteProgressStep>('none');
  const [deleteMinigameKey, setDeleteMinigameKey] = useState<number>(0);
  const [deleteMinigameFailed, setDeleteMinigameFailed] = useState<boolean>(false);
  const [adminCoinsInput, setAdminCoinsInput] = useState<string>(() =>
    String(initialSave.coins)
  );
  const [adminCatchesInput, setAdminCatchesInput] = useState<string>(() =>
    String(initialSave.fishCount)
  );
  const [adminTotalMoneyInput, setAdminTotalMoneyInput] = useState<string>(() =>
    String(initialSave.totalCoinsEarned)
  );
  const [adminMinutesInput, setAdminMinutesInput] = useState<string>(() =>
    String(Math.floor(initialSave.playTimeSeconds / 60))
  );
  const [adminRestoreSaved, setAdminRestoreSaved] = useState<boolean>(false);
  const [adminRestoreMsg, setAdminRestoreMsg] = useState<string>('');
  const [adminMasteryFishId, setAdminMasteryFishId] = useState<number>(
    REAL_FISH_AVATARS[0]?.id ?? ALL_FISH[0].id
  );
  const [showMasteryAvatars, setShowMasteryAvatars] = useState<boolean>(false);
  const [showAdminTools, setShowAdminTools] = useState<boolean>(false);
  const [adminSectionTab, setAdminSectionTab] = useState<'invocar' | 'restaurar' | 'indice' | 'suerte'>('restaurar');
  const [showAdminCommandModal, setShowAdminCommandModal] = useState<boolean>(false);
  const [adminCommandInput, setAdminCommandInput] = useState<string>('/luck 50 1h');
  const [adminCommandFeedback, setAdminCommandFeedback] = useState<{
    type: 'success' | 'error' | 'info';
    text: string;
  } | null>(null);
  const [adminLuckMultField, setAdminLuckMultField] = useState<string>('50');
  const [adminLuckDurationField, setAdminLuckDurationField] = useState<string>('1h');
  const [friendInput, setFriendInput] = useState<string>('');
  const [friendError, setFriendError] = useState<string>('');
  const [friendsSortTab, setFriendsSortTab] = useState<'best' | 'money' | 'catches'>('best');
  const [activePanel, setActivePanel] = useState<ActivePanel>('none');
  const [inspectedProfile, setInspectedProfile] = useState<InspectedPlayerProfile | null>(null);
  const [leaderboardTab, setLeaderboardTab] = useState<LeaderboardTab>('catches');
  const leaderboardScrollRef = useRef<HTMLDivElement | null>(null);
  const myLeaderboardRowRef = useRef<HTMLButtonElement | null>(null);
  const [muted, setMuted] = useState<boolean>(false);
  const [musicMuted, setMusicMuted] = useState<boolean>(() => sound.musicMuted);
  const [world, setWorld] = useState<'river' | 'underworld'>('river');
  const [scene, setScene] = useState<'dock' | 'market'>('dock');
  const [walkRequest, setWalkRequest] = useState<{ id: number; target: 'market' | 'dock' } | null>(null);
  const [isWalkingScene, setIsWalkingScene] = useState<boolean>(false);
  const [marketTutorialSubStep, setMarketTutorialSubStep] =
    useState<MarketTutorialSubStep>('go_to_market');
  const [marketStallModal, setMarketStallModal] = useState<'none' | 'rods' | 'pvp'>('none');
  const [marketSectionTab, setMarketSectionTab] = useState<'all' | 'sell' | 'suits' | 'clothing'>('all');
  const [rodsStallTab, setRodsStallTab] = useState<'rods' | 'baits'>('rods');
  const [underworldUnlocked, setUnderworldUnlocked] = useState<boolean>(() => {
    try {
      if (localStorage.getItem('ice_fishing_underworld_unlocked') === '1') {
        return true;
      }
    } catch {
      // ignore storage errors
    }
    return (
      Boolean(initialSave.underworldUnlocked) ||
      hasUnderworldFishRecords(initialSave.discoveredFish, initialSave.catchHistory)
    );
  });
  const underworldUnlockedRef = useRef<boolean>(underworldUnlocked);
  underworldUnlockedRef.current = underworldUnlocked;
  const [showDevilModal, setShowDevilModal] = useState<boolean>(false);
  const [isTransitioningWorld, setIsTransitioningWorld] = useState<boolean>(false);
  const [transitioningWorldName, setTransitioningWorldName] = useState<'river' | 'underworld' | null>(null);
  const [indexTab, setIndexTab] = useState<'river' | 'underworld'>('river');
  const [indexRarityFilter, setIndexRarityFilter] = useState<'Todas' | Rarity>('Todas');
  const [indexSearch, setIndexSearch] = useState<string>('');
  const [indexStatusFilter, setIndexStatusFilter] = useState<'all' | 'discovered' | 'missing'>('all');
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string>('');
  const [leaderboardEntries, setLeaderboardEntries] = useState<
    CloudLeaderboardEntry[]
  >([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState<boolean>(false);
  const cloudDocExistsRef = useRef<boolean>(false);
  const leaderboardDocExistsRef = useRef<boolean>(false);
  const cloudHydratedUidRef = useRef<string | null>(null);
  const adminPanelRef = useRef<HTMLDivElement | null>(null);
  const activePanelRef = useRef<ActivePanel>(activePanel);
  activePanelRef.current = activePanel;
  const playTimeSecondsRef = useRef<number>(playTimeSeconds);
  const setPlayTimeExact = useCallback((seconds: number) => {
    const clean = Math.max(0, Math.round(seconds));
    playTimeSecondsRef.current = clean;
    setPlayTimeSeconds(clean);
  }, []);

  const triggerMasteryCelebration = useCallback((species: PokemonSpecies) => {
    sound.playCelebration();
    if (masteryTimerRef.current !== null) {
      window.clearTimeout(masteryTimerRef.current);
    }
    setMasteryAlert(species);
    masteryTimerRef.current = window.setTimeout(() => {
      setMasteryAlert(null);
      masteryTimerRef.current = null;
    }, 4200);
  }, []);

  const isCurrentUserAdmin = Boolean(
    firebaseUser &&
      firebaseUser.emailVerified &&
      firebaseUser.email?.toLowerCase() === ADMIN_EMAIL
  );

  useEffect(() => {
    if (!isCurrentUserAdmin && avatar === 'permadeath_admin') {
      setAvatar('🐟');
    }
  }, [isCurrentUserAdmin, avatar]);

  useEffect(() => {
    if (!avatar.startsWith(MASTERY_AVATAR_PREFIX)) return;
    if (firebaseUser && cloudHydratedUidRef.current !== firebaseUser.uid) return;
    const fishId = Number(avatar.slice(MASTERY_AVATAR_PREFIX.length));
    if (!Number.isFinite(fishId) || (discoveredFish[fishId] ?? 0) < 50) {
      setAvatar('🐟');
    }
  }, [avatar, discoveredFish, firebaseUser]);

  const adminCoinsRef = useRef<number>(coins);
  adminCoinsRef.current = coins;
  const adminCatchesRef = useRef<number>(fishCount);
  adminCatchesRef.current = fishCount;
  const adminTotalCoinsRef = useRef<number>(totalCoinsEarned);
  adminTotalCoinsRef.current = totalCoinsEarned;

  useEffect(() => {
    if (activePanel === 'profile' && isCurrentUserAdmin) {
      setAdminCoinsInput(String(adminCoinsRef.current));
      setAdminCatchesInput(String(adminCatchesRef.current));
      setAdminTotalMoneyInput(String(adminTotalCoinsRef.current));
      setAdminMinutesInput(String(Math.floor(playTimeSecondsRef.current / 60)));
      setAdminRestoreSaved(false);
      setAdminRestoreMsg('');
    }
  }, [activePanel, isCurrentUserAdmin]);

  const buildCloudPayload = useCallback(
    (uid: string, includeCreatedAt: boolean, allowAdminAvatar: boolean) => {
      const cleanDiscovered: Record<string, number> = {};
      for (const [k, v] of Object.entries(discoveredFish)) {
        if (typeof v === 'number' && v >= 0) {
          cleanDiscovered[String(k)] = v;
        }
      }
      const cleanMaxWeights: Record<string, number> = {};
      for (const [k, v] of Object.entries(maxFishWeights)) {
        if (typeof v === 'number' && Number.isFinite(v) && v > 0) {
          cleanMaxWeights[String(k)] = Number(v.toFixed(2));
        }
      }
      const cleanClaimed: Record<string, boolean> = {};
      for (const [k, v] of Object.entries(claimedIndexRewards)) {
        if (v) {
          cleanClaimed[String(k)] = true;
        }
      }
      const cleanClaimedLevels: Record<string, boolean> = {};
      for (const [k, v] of Object.entries(claimedLevelRewards)) {
        const lvl = Number(k);
        if (v && Number.isInteger(lvl) && lvl >= 1 && lvl <= 500) {
          cleanClaimedLevels[String(lvl)] = true;
        }
      }
      const cleanInventory = inventory.slice(0, 100).map((item) => {
        const entry: Record<string, unknown> = {
          uid: String(item.uid),
          species: {
            id: item.species.id,
            name: item.species.name,
            rarity: item.species.rarity,
            oneIn: item.species.oneIn,
            baseValue: item.species.baseValue,
            spriteColor: item.species.spriteColor,
            accentColor: item.species.accentColor,
          },
          sellValue: Number(item.sellValue) || 0,
          caughtAt: Number(item.caughtAt) || Date.now(),
        };
        if (typeof item.weightKg === 'number' && Number.isFinite(item.weightKg) && item.weightKg > 0) {
          entry.weightKg = item.weightKg;
        }
        if (typeof item.variantIndex === 'number') {
          entry.variantIndex = item.variantIndex;
        }
        return entry;
      });
      const cleanCatchHistory = catchHistory.slice(0, 10).map((item) => {
        const entry: Record<string, unknown> = {
          uid: String(item.uid).slice(0, 80),
          fishId: Number(item.fishId) || 0,
          fishName: String(item.fishName).slice(0, 64),
          rarity: String(item.rarity),
          caughtAt: Number(item.caughtAt) || Date.now(),
        };
        if (typeof item.weightKg === 'number' && Number.isFinite(item.weightKg) && item.weightKg > 0) {
          entry.weightKg = item.weightKg;
        }
        if (typeof item.variantIndex === 'number') {
          entry.variantIndex = item.variantIndex;
        }
        return entry;
      });
      const safeUsername = sanitizePlayerNameWithFallback(
        username,
        'male',
        lang
      ).slice(0, 32);
      const rawAvatar = (avatar || '🐟').trim().slice(0, 32) || '🐟';
      const safeAvatar =
        rawAvatar === 'permadeath_admin' && !allowAdminAvatar ? '🐟' : rawAvatar;
      const safeCap = Math.min(100, Math.max(10, Math.round(backpackCapacity)));
      const cloudLevelProgress = getLevelProgressFromTotalXp(totalXp);

      const payload: Record<string, unknown> = {
        ownerUid: uid,
        coins: Number.isFinite(coins) ? Math.max(0, Math.round(coins)) : 0,
        fishCount: Number.isFinite(fishCount) ? Math.max(0, Math.round(fishCount)) : 0,
        totalCoinsEarned: Number.isFinite(totalCoinsEarned) ? Math.max(0, Math.round(totalCoinsEarned)) : 0,
        playTimeSeconds: Number.isFinite(playTimeSecondsRef.current)
          ? Math.max(0, Math.round(playTimeSecondsRef.current))
          : 0,
        level: cloudLevelProgress.level,
        xp: cloudLevelProgress.currentLevelXp,
        totalXp: cloudLevelProgress.totalXp,
        discoveredFish: cleanDiscovered,
        maxFishWeights: cleanMaxWeights,
        ownedCosmetics: ownedCosmetics.slice(0, 50).map(String),
        equippedCosmetics: equippedCosmetics.slice(0, 50).map(String),
        username: safeUsername,
        avatar: safeAvatar,
        backpackCapacity: safeCap,
        lastUsernameChangeAt: Number.isFinite(Number(lastUsernameChangeAt))
          ? Math.max(0, Number(lastUsernameChangeAt))
          : 0,
        hasOgTitle: Boolean(hasOgTitle),
        claimedIndexRewards: cleanClaimed,
        claimedLevelRewards: cleanClaimedLevels,
        underworldUnlocked: Boolean(underworldUnlocked),
        inventory: cleanInventory,
        catchHistory: cleanCatchHistory,
        seenRarityTutorials: sanitizeSeenRarityTutorials(seenRarityTutorials),
        seenUnderworldIntro: Boolean(seenUnderworldIntro),
        seenUnderworldMarketIntro: Boolean(seenUnderworldMarketIntro),
        updatedAt: serverTimestamp(),
      };
      if (includeCreatedAt) {
        payload.createdAt = serverTimestamp();
      }
      return payload;
    },
    [
      coins,
      fishCount,
      totalCoinsEarned,
      totalXp,
      discoveredFish,
      maxFishWeights,
      ownedCosmetics,
      equippedCosmetics,
      username,
      avatar,
      lang,
      backpackCapacity,
      lastUsernameChangeAt,
      hasOgTitle,
      claimedIndexRewards,
      claimedLevelRewards,
      underworldUnlocked,
      inventory,
      catchHistory,
      seenRarityTutorials,
      seenUnderworldIntro,
      seenUnderworldMarketIntro,
    ]
  );

  const buildLeaderboardPayload = useCallback(
    (uid: string, includeCreatedAt: boolean, allowAdmin: boolean) => {
      const safeUsername =
        (username || 'Angler').trim().slice(0, 32) || 'Angler';
      const rawAvatar = (avatar || '🐟').trim().slice(0, 32) || '🐟';
      const safeAvatar =
        rawAvatar === 'permadeath_admin' && !allowAdmin ? '🐟' : rawAvatar;
      const bestFish = getBestFishFromDiscovered(discoveredFish);
      const discoveredCount = ALL_FISH.filter(
        (f) => (discoveredFish[f.id] ?? 0) > 0
      ).length;
      const masteredCount = ALL_FISH.filter(
        (f) => (discoveredFish[f.id] ?? 0) >= 50
      ).length;
      const payload: Record<string, unknown> = {
        ownerUid: uid,
        username: safeUsername,
        avatar: safeAvatar,
        catches: Math.max(0, Math.round(fishCount)),
        money: Math.max(0, Math.round(totalCoinsEarned)),
        timeSeconds: Math.max(0, Math.round(playTimeSecondsRef.current)),
        isAdmin: Boolean(allowAdmin),
        hasOgTitle: Boolean(hasOgTitle),
        bestFishId: bestFish ? bestFish.id : 0,
        discoveredCount,
        masteredCount,
        underworldUnlocked: Boolean(underworldUnlocked),
        equippedCosmetics: sanitizeEquippedCosmetics(equippedCosmetics),
        updatedAt: serverTimestamp(),
      };
      if (includeCreatedAt) {
        payload.createdAt = serverTimestamp();
      }
      return payload;
    },
    [
      username,
      avatar,
      fishCount,
      totalCoinsEarned,
      hasOgTitle,
      discoveredFish,
      underworldUnlocked,
      equippedCosmetics,
    ]
  );

  const buildCloudPayloadRef = useRef(buildCloudPayload);
  buildCloudPayloadRef.current = buildCloudPayload;
  const buildLeaderboardPayloadRef = useRef(buildLeaderboardPayload);
  buildLeaderboardPayloadRef.current = buildLeaderboardPayload;

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setFirebaseUser(null);
        setGoogleSignedIn(false);
        cloudDocExistsRef.current = false;
        leaderboardDocExistsRef.current = false;
        cloudHydratedUidRef.current = null;
        return;
      }

      setFirebaseUser(user);
      setGoogleSignedIn(true);
      setAuthError('');

      const userIsAdmin = Boolean(
        user.emailVerified && user.email?.toLowerCase() === ADMIN_EMAIL
      );

      const savePath = `playerSaves/${user.uid}`;
      const saveRef = doc(db, 'playerSaves', user.uid);
      const lbPath = `leaderboard/${user.uid}`;
      const lbRef = doc(db, 'leaderboard', user.uid);

      let cloudSaveSynced = false;
      let syncedUsername =
        (username || 'Angler').trim().slice(0, 32) || 'Angler';
      let syncedAvatar = avatar || '🐟';
      let syncedCatches = fishCount;
      let syncedMoney = totalCoinsEarned;
      let syncedTime = playTimeSecondsRef.current;
      let syncedHasOg = hasOgTitle;

      let syncedBestFishId = getBestFishFromDiscovered(discoveredFish)?.id ?? 0;
      let syncedDiscoveredCount = ALL_FISH.filter(
        (f) => (discoveredFish[f.id] ?? 0) > 0
      ).length;
      let syncedMasteredCount = ALL_FISH.filter(
        (f) => (discoveredFish[f.id] ?? 0) >= 50
      ).length;
      let syncedUnderworld = Boolean(underworldUnlockedRef.current);
      let syncedEquippedCosmetics = sanitizeEquippedCosmetics(equippedCosmetics);

      try {
        const snap = await getDoc(saveRef);

        if (snap.exists()) {
          const data = snap.data();
          cloudDocExistsRef.current = true;
          if (typeof data.coins === 'number') setCoins(data.coins);
          if (typeof data.fishCount === 'number') {
            setFishCount(data.fishCount);
            syncedCatches = data.fishCount;
            luckChestTriggeredRef.current = Math.floor(data.fishCount / 100) * 100;
            fishingStateRef.current = {
              ...fishingStateRef.current,
              fishCount: data.fishCount,
            };
          }
          if (typeof data.totalCoinsEarned === 'number') {
            setTotalCoinsEarned(data.totalCoinsEarned);
            syncedMoney = data.totalCoinsEarned;
          }
          if (typeof data.playTimeSeconds === 'number') {
            setPlayTimeExact(data.playTimeSeconds);
            syncedTime = data.playTimeSeconds;
          }
          if (
            typeof data.totalXp === 'number' ||
            typeof data.level === 'number' ||
            typeof data.xp === 'number'
          ) {
            const cloudLevel = sanitizeLevelAndXp(
              data.level,
              data.xp,
              data.totalXp
            );
            totalXpRef.current = cloudLevel.totalXp;
            setTotalXp(cloudLevel.totalXp);
          }
          let parsedDiscovered: Record<number, number> | undefined;
          if (data.discoveredFish && typeof data.discoveredFish === 'object') {
            parsedDiscovered = {};
            for (const [k, v] of Object.entries(
              data.discoveredFish as Record<string, unknown>
            )) {
              if (typeof v === 'number') parsedDiscovered[Number(k)] = v;
            }
            setDiscoveredFish(parsedDiscovered);
            syncedBestFishId = getBestFishFromDiscovered(parsedDiscovered)?.id ?? 0;
            syncedDiscoveredCount = ALL_FISH.filter(
              (f) => (parsedDiscovered?.[f.id] ?? 0) > 0
            ).length;
            syncedMasteredCount = ALL_FISH.filter(
              (f) => (parsedDiscovered?.[f.id] ?? 0) >= 50
            ).length;
          }
          if (Array.isArray(data.ownedCosmetics)) {
            setOwnedCosmetics(data.ownedCosmetics.map(String));
          }
          if (Array.isArray(data.equippedCosmetics)) {
            const loadedEquipped = sanitizeEquippedCosmetics(
              data.equippedCosmetics
            );
            setEquippedCosmetics(loadedEquipped);
            syncedEquippedCosmetics = loadedEquipped;
          }
          if (typeof data.username === 'string' && data.username.trim()) {
            const cleanCloudName = sanitizePlayerNameWithFallback(
              data.username,
              'male',
              lang
            );
            setUsername(cleanCloudName);
            setUsernameDraft(cleanCloudName);
            syncedUsername = cleanCloudName.slice(0, 32) || 'Angler';
          }
          if (typeof data.avatar === 'string' && data.avatar.trim()) {
            const safeLoadedAvatar =
              data.avatar === 'permadeath_admin' && !userIsAdmin
                ? '🐟'
                : data.avatar;
            setAvatar(safeLoadedAvatar);
            syncedAvatar = safeLoadedAvatar;
          }
          if (typeof data.backpackCapacity === 'number') {
            setBackpackCapacity(data.backpackCapacity);
          }
          if (typeof data.lastUsernameChangeAt === 'number') {
            setLastUsernameChangeAt(data.lastUsernameChangeAt);
          }
          if (typeof data.hasOgTitle === 'boolean') {
            setHasOgTitle(data.hasOgTitle);
            syncedHasOg = data.hasOgTitle;
          }
          if (
            data.claimedIndexRewards &&
            typeof data.claimedIndexRewards === 'object'
          ) {
            const parsedClaimed: Record<number, boolean> = {};
            for (const [k, v] of Object.entries(
              data.claimedIndexRewards as Record<string, unknown>
            )) {
              if (v) parsedClaimed[Number(k)] = true;
            }
            setClaimedIndexRewards(parsedClaimed);
          }
          if (
            data.claimedLevelRewards &&
            typeof data.claimedLevelRewards === 'object'
          ) {
            setClaimedLevelRewards(
              sanitizeClaimedLevelRewards(data.claimedLevelRewards)
            );
          }
          const parsedInventory = Array.isArray(data.inventory)
            ? (data.inventory as CaughtPokemon[])
            : undefined;
          if (parsedInventory) {
            setInventory(parsedInventory);
          }
          let parsedHistory: CatchHistoryEntry[] | undefined;
          if (Array.isArray(data.catchHistory)) {
            parsedHistory = sanitizeCatchHistory(data.catchHistory);
            setCatchHistory(parsedHistory);
          } else if (parsedInventory && parsedInventory.length > 0) {
            parsedHistory = parsedInventory.slice(0, 10).map(toCatchHistoryEntry);
            setCatchHistory(parsedHistory);
          }

          if (Array.isArray(data.seenRarityTutorials)) {
            const cloudSeenRarities = sanitizeSeenRarityTutorials(
              data.seenRarityTutorials
            );
            setSeenRarityTutorials((prev) => {
              const merged = sanitizeSeenRarityTutorials([
                ...prev,
                ...cloudSeenRarities,
              ]);
              saveSeenRarityTutorialsToStorage(merged);
              return merged;
            });
          }

          if (data.seenUnderworldIntro) {
            saveUnderworldGuideSeen('underworld', true);
            setSeenUnderworldIntro(true);
          }
          if (data.seenUnderworldMarketIntro) {
            saveUnderworldGuideSeen('underworld_market', true);
            setSeenUnderworldMarketIntro(true);
          }

          const cloudWeights = mergeMaxFishWeightRecords(
            sanitizeMaxFishWeights(data.maxFishWeights),
            extractWeightsFromHistory(parsedHistory, parsedInventory)
          );
          setMaxFishWeights(cloudWeights);

          let localFlagUnlocked = false;
          try {
            localFlagUnlocked =
              localStorage.getItem('ice_fishing_underworld_unlocked') === '1';
          } catch {
            // ignore storage errors
          }
          const cloudUnderworld = Boolean(data.underworldUnlocked);
          let resolvedUnderworld =
            cloudUnderworld ||
            underworldUnlockedRef.current ||
            localFlagUnlocked ||
            Boolean(initialSave.underworldUnlocked) ||
            hasUnderworldFishRecords(parsedDiscovered, parsedHistory, parsedInventory);

          if (
            user.email?.toLowerCase() === 'push0to70k@gmail.com' &&
            !hasUnderworldFishRecords(parsedDiscovered, parsedHistory, parsedInventory)
          ) {
            resolvedUnderworld = false;
          }

          underworldUnlockedRef.current = resolvedUnderworld;
          syncedUnderworld = resolvedUnderworld;
          setUnderworldUnlocked(resolvedUnderworld);
          try {
            localStorage.setItem(
              'ice_fishing_underworld_unlocked',
              resolvedUnderworld ? '1' : '0'
            );
          } catch {
            // ignore storage errors
          }
          if (resolvedUnderworld && !cloudUnderworld) {
            updateDoc(saveRef, {
              underworldUnlocked: true,
              updatedAt: serverTimestamp(),
            }).catch((err) => {
              const msg = err instanceof Error ? err.message : String(err);
              if (
                msg.toLowerCase().includes('permission') ||
                msg.toLowerCase().includes('insufficient')
              ) {
                handleFirestoreError(err, OperationType.UPDATE, savePath);
              }
            });
          } else if (!resolvedUnderworld && cloudUnderworld && user.email?.toLowerCase() === 'push0to70k@gmail.com') {
            updateDoc(saveRef, {
              underworldUnlocked: false,
              updatedAt: serverTimestamp(),
            }).catch(() => {});
          }
          cloudHydratedUidRef.current = user.uid;

          let doneNew = false;
          let doneLegacy = false;
          try {
            doneNew = Boolean(localStorage.getItem(TUTORIAL_STORAGE_KEY));
            doneLegacy = Boolean(localStorage.getItem('infinite_catch_tutorial_done'));
          } catch {
            // ignore
          }
          const cloudTutorialStep = resolveInitialTutorialStep({
            tutorialDoneFlag: doneNew,
            legacyTutorialDoneFlag: doneLegacy,
            accountProgress: {
              fishCount: typeof data.fishCount === 'number' ? data.fishCount : 0,
              totalCoinsEarned:
                typeof data.totalCoinsEarned === 'number'
                  ? data.totalCoinsEarned
                  : 0,
              coins: typeof data.coins === 'number' ? data.coins : 0,
              playTimeSeconds:
                typeof data.playTimeSeconds === 'number'
                  ? data.playTimeSeconds
                  : 0,
              discoveredFish: parsedDiscovered,
              ownedCosmetics: Array.isArray(data.ownedCosmetics)
                ? data.ownedCosmetics.map(String)
                : undefined,
              inventoryLength: parsedInventory?.length ?? 0,
              catchHistoryLength: parsedHistory?.length ?? 0,
              hasOgTitle: Boolean(data.hasOgTitle),
              underworldUnlocked: resolvedUnderworld,
            },
          });
          setTutorialStep(cloudTutorialStep);
          if (cloudTutorialStep === 0) {
            setMinigameTutorialDone(true);
            try {
              localStorage.setItem(TUTORIAL_STORAGE_KEY, '1');
              localStorage.setItem(MINIGAME_TUTORIAL_STORAGE_KEY, '1');
            } catch {
              // ignore
            }
          } else {
            try {
              localStorage.removeItem('infinite_catch_tutorial_done');
              localStorage.removeItem(TUTORIAL_STORAGE_KEY);
            } catch {
              // ignore
            }
          }
        } else {
          cloudDocExistsRef.current = false;
          syncedUnderworld = false;
          setUnderworldUnlocked(false);
          try {
            localStorage.setItem('ice_fishing_underworld_unlocked', '0');
          } catch {
            // ignore
          }
          const initialPayload = buildCloudPayloadRef.current(
            user.uid,
            true,
            userIsAdmin
          );
          initialPayload.underworldUnlocked = false;
          if (
            (initialPayload.username === 'Pescador' ||
              initialPayload.username === 'Angler') &&
            user.displayName?.trim()
          ) {
            const googleName = sanitizePlayerNameWithFallback(
              user.displayName,
              'male',
              lang
            );
            initialPayload.username = googleName;
            setUsername(googleName);
            setUsernameDraft(googleName);
            syncedUsername = googleName;
          }
          syncedAvatar = String(initialPayload.avatar || '🐟');
          await setDoc(saveRef, initialPayload);
          cloudDocExistsRef.current = true;
          cloudHydratedUidRef.current = user.uid;

          let doneNew = false;
          let doneLegacy = false;
          try {
            doneNew = Boolean(localStorage.getItem(TUTORIAL_STORAGE_KEY));
            doneLegacy = Boolean(localStorage.getItem('infinite_catch_tutorial_done'));
          } catch {
            // ignore
          }
          const initialTutorialStep = resolveInitialTutorialStep({
            tutorialDoneFlag: doneNew,
            legacyTutorialDoneFlag: doneLegacy,
            accountProgress: {
              fishCount: Number(initialPayload.fishCount) || 0,
              totalCoinsEarned: Number(initialPayload.totalCoinsEarned) || 0,
              coins: Number(initialPayload.coins) || 0,
              playTimeSeconds: Number(initialPayload.playTimeSeconds) || 0,
              discoveredFish:
                (initialPayload.discoveredFish as Record<number, number>) ?? {},
              ownedCosmetics: Array.isArray(initialPayload.ownedCosmetics)
                ? initialPayload.ownedCosmetics
                : [],
              inventoryLength: Array.isArray(initialPayload.inventory)
                ? initialPayload.inventory.length
                : 0,
              catchHistoryLength: Array.isArray(initialPayload.catchHistory)
                ? initialPayload.catchHistory.length
                : 0,
              hasOgTitle: Boolean(initialPayload.hasOgTitle),
            },
          });
          setTutorialStep(initialTutorialStep);
          if (initialTutorialStep === 0) {
            try {
              localStorage.setItem(TUTORIAL_STORAGE_KEY, '1');
            } catch {
              // ignore
            }
          } else {
            try {
              localStorage.removeItem('infinite_catch_tutorial_done');
              localStorage.removeItem(TUTORIAL_STORAGE_KEY);
            } catch {
              // ignore
            }
          }
        }
        cloudSaveSynced = true;
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        if (
          msg.toLowerCase().includes('permission') ||
          msg.toLowerCase().includes('insufficient')
        ) {
          handleFirestoreError(error, OperationType.GET, savePath);
        }
        console.error('Error sincronizando con la nube:', error);
      }

      if (!cloudSaveSynced) {
        return;
      }

      // Ensure public leaderboard entry exists and reflects current Google account
      if (syncedAvatar === 'permadeath_admin' && !userIsAdmin) {
        syncedAvatar = '🐟';
      }
      try {
        const lbSnap = await getDoc(lbRef);
        if (lbSnap.exists()) {
          leaderboardDocExistsRef.current = true;
          await updateDoc(lbRef, {
            username: syncedUsername,
            avatar: syncedAvatar,
            catches: Math.max(0, Math.round(Number(syncedCatches) || 0)),
            money: Math.max(0, Math.round(Number(syncedMoney) || 0)),
            timeSeconds: Math.max(0, Math.round(Number(syncedTime) || 0)),
            isAdmin: userIsAdmin,
            hasOgTitle: Boolean(syncedHasOg),
            bestFishId: syncedBestFishId,
            discoveredCount: syncedDiscoveredCount,
            masteredCount: syncedMasteredCount,
            underworldUnlocked: syncedUnderworld,
            equippedCosmetics: syncedEquippedCosmetics,
            updatedAt: serverTimestamp(),
          });
        } else {
          leaderboardDocExistsRef.current = false;
          await setDoc(lbRef, {
            ownerUid: user.uid,
            username: syncedUsername,
            avatar: syncedAvatar,
            catches: Math.max(0, Math.round(Number(syncedCatches) || 0)),
            money: Math.max(0, Math.round(Number(syncedMoney) || 0)),
            timeSeconds: Math.max(0, Math.round(Number(syncedTime) || 0)),
            isAdmin: userIsAdmin,
            hasOgTitle: Boolean(syncedHasOg),
            bestFishId: syncedBestFishId,
            discoveredCount: syncedDiscoveredCount,
            masteredCount: syncedMasteredCount,
            underworldUnlocked: syncedUnderworld,
            equippedCosmetics: syncedEquippedCosmetics,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
          leaderboardDocExistsRef.current = true;
        }
      } catch (lbError) {
        const lbMsg =
          lbError instanceof Error ? lbError.message : String(lbError);
        if (
          lbMsg.toLowerCase().includes('permission') ||
          lbMsg.toLowerCase().includes('insufficient')
        ) {
          handleFirestoreError(lbError, OperationType.WRITE, lbPath);
        }
        console.error('Error sincronizando clasificación:', lbError);
      }
    });

    return () => unsubscribe();
  }, []);

  // Debounced cloud auto-save whenever player progress changes
  useEffect(() => {
    if (!firebaseUser || cloudHydratedUidRef.current !== firebaseUser.uid) {
      return;
    }
    const uid = firebaseUser.uid;
    const allowAdmin = Boolean(
      firebaseUser.emailVerified &&
        firebaseUser.email?.toLowerCase() === ADMIN_EMAIL
    );
    const timeoutId = window.setTimeout(async () => {
      const savePath = `playerSaves/${uid}`;
      const saveRef = doc(db, 'playerSaves', uid);
      try {
        if (cloudDocExistsRef.current) {
          const payload = buildCloudPayload(uid, false, allowAdmin);
          delete payload.ownerUid;
          await updateDoc(saveRef, payload);
        } else {
          const payload = buildCloudPayload(uid, true, allowAdmin);
          await setDoc(saveRef, payload);
          cloudDocExistsRef.current = true;
        }
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        if (
          msg.toLowerCase().includes('permission') ||
          msg.toLowerCase().includes('insufficient')
        ) {
          handleFirestoreError(
            error,
            cloudDocExistsRef.current
              ? OperationType.UPDATE
              : OperationType.CREATE,
            savePath
          );
        }
        console.error('Error guardando en la nube:', error);
      }

      const lbPath = `leaderboard/${uid}`;
      const lbRef = doc(db, 'leaderboard', uid);
      try {
        if (leaderboardDocExistsRef.current) {
          const lbPayload = buildLeaderboardPayload(uid, false, allowAdmin);
          delete lbPayload.ownerUid;
          await updateDoc(lbRef, lbPayload);
        } else {
          const lbPayload = buildLeaderboardPayload(uid, true, allowAdmin);
          await setDoc(lbRef, lbPayload);
          leaderboardDocExistsRef.current = true;
        }
      } catch (lbError) {
        const lbMsg =
          lbError instanceof Error ? lbError.message : String(lbError);
        if (
          lbMsg.toLowerCase().includes('permission') ||
          lbMsg.toLowerCase().includes('insufficient')
        ) {
          handleFirestoreError(
            lbError,
            leaderboardDocExistsRef.current
              ? OperationType.UPDATE
              : OperationType.CREATE,
            lbPath
          );
        }
        console.error('Error actualizando clasificación:', lbError);
      }
    }, 1200);

    return () => window.clearTimeout(timeoutId);
  }, [firebaseUser, buildCloudPayload, buildLeaderboardPayload]);

  // Live Top-50 Google-authenticated leaderboard listener (active in Leaderboard & Friends)
  useEffect(() => {
    if (
      mode !== 'playing' ||
      (activePanel !== 'leaderboard' && activePanel !== 'friends')
    ) {
      return;
    }

    if (firebaseUser && cloudHydratedUidRef.current === firebaseUser.uid) {
      const uid = firebaseUser.uid;
      const allowAdmin = Boolean(
        firebaseUser.emailVerified &&
          firebaseUser.email?.toLowerCase() === ADMIN_EMAIL
      );
      const lbRef = doc(db, 'leaderboard', uid);
      const lbPath = `leaderboard/${uid}`;
      if (leaderboardDocExistsRef.current) {
        const lbPayload = buildLeaderboardPayloadRef.current(
          uid,
          false,
          allowAdmin
        );
        delete lbPayload.ownerUid;
        updateDoc(lbRef, lbPayload).catch((err) => {
          const msg = err instanceof Error ? err.message : String(err);
          if (
            msg.toLowerCase().includes('permission') ||
            msg.toLowerCase().includes('insufficient')
          ) {
            handleFirestoreError(err, OperationType.UPDATE, lbPath);
          }
        });
      }
    }

    setLeaderboardLoading(true);
    const orderField =
      activePanel === 'leaderboard'
        ? leaderboardTab === 'time'
          ? 'timeSeconds'
          : leaderboardTab === 'money'
            ? 'money'
            : 'catches'
        : 'catches';
    const lbQuery = query(
      collection(db, 'leaderboard'),
      where(orderField, '>=', 0),
      orderBy(orderField, 'desc'),
      limit(50)
    );
    const unsubscribe = onSnapshot(
      lbQuery,
      (snapshot) => {
        const rows: CloudLeaderboardEntry[] = snapshot.docs.map((d) => {
          const data = d.data();
          return {
            ownerUid: String(data.ownerUid || d.id),
            username: String(data.username || 'Angler'),
            avatar: String(data.avatar || '🐟'),
            catches: Number(data.catches) || 0,
            money: Number(data.money) || 0,
            timeSeconds: Number(data.timeSeconds) || 0,
            isAdmin: Boolean(data.isAdmin),
            hasOgTitle: Boolean(data.hasOgTitle),
            bestFishId:
              typeof data.bestFishId === 'number' ? data.bestFishId : undefined,
            discoveredCount:
              typeof data.discoveredCount === 'number'
                ? data.discoveredCount
                : undefined,
            masteredCount:
              typeof data.masteredCount === 'number'
                ? data.masteredCount
                : undefined,
            underworldUnlocked:
              typeof data.underworldUnlocked === 'boolean'
                ? data.underworldUnlocked
                : undefined,
            equippedCosmetics: Array.isArray(data.equippedCosmetics)
              ? sanitizeEquippedCosmetics(data.equippedCosmetics)
              : undefined,
          };
        });
        setLeaderboardEntries(rows);
        setLeaderboardLoading(false);
      },
      (error) => {
        setLeaderboardLoading(false);
        const msg = error instanceof Error ? error.message : String(error);
        if (
          msg.toLowerCase().includes('permission') ||
          msg.toLowerCase().includes('insufficient')
        ) {
          handleFirestoreError(error, OperationType.LIST, 'leaderboard');
        }
        console.error('Error cargando clasificación:', error);
      }
    );

    return () => unsubscribe();
  }, [mode, activePanel, leaderboardTab, firebaseUser]);

  // Global live listener for unlimited 5-day orange OG rod claims
  useEffect(() => {
    const ogRef = doc(db, 'globalEvents', 'ogRod');
    const unsubscribe = onSnapshot(
      ogRef,
      (snapshot) => {
        const count = snapshot.exists()
          ? Math.max(0, Number(snapshot.data().claimedCount) || 0)
          : 0;
        setOgClaims(count);
        try {
          localStorage.setItem(OG_CLAIMS_KEY, String(count));
        } catch {
          // ignore storage errors
        }
      },
      (error) => {
        const msg = error instanceof Error ? error.message : String(error);
        if (
          msg.toLowerCase().includes('permission') ||
          msg.toLowerCase().includes('insufficient')
        ) {
          handleFirestoreError(error, OperationType.GET, 'globalEvents/ogRod');
        }
      }
    );
    return () => unsubscribe();
  }, []);

  // Also restore verified OG claim receipt if user signed in
  useEffect(() => {
    if (!firebaseUser) return;
    let active = true;
    const claimRef = doc(db, 'globalEvents', 'ogRod', 'claims', firebaseUser.uid);
    getDoc(claimRef)
      .then((snap) => {
        if (!active || !snap.exists()) return;
        setHasOgTitle(true);
        setOwnedCosmetics((prev) => (prev.includes('rod_og') ? prev : [...prev, 'rod_og']));
      })
      .catch((error) => {
        const msg = error instanceof Error ? error.message : String(error);
        if (
          msg.toLowerCase().includes('permission') ||
          msg.toLowerCase().includes('insufficient')
        ) {
          handleFirestoreError(
            error,
            OperationType.GET,
            `globalEvents/ogRod/claims/${firebaseUser.uid}`
          );
        }
      });
    return () => {
      active = false;
    };
  }, [firebaseUser]);

  // Keep the 5-day OG rod offer countdown updated and hide the offer once expired
  useEffect(() => {
    const now = Date.now();
    setOgOfferNowMs(now);
    if (!isOgOfferActive(now)) return;
    const intervalMs =
      activePanel === 'market' || marketStallModal === 'rods' ? 1000 : 30_000;
    const timer = window.setInterval(() => {
      const tick = Date.now();
      setOgOfferNowMs(tick);
      if (!isOgOfferActive(tick)) {
        window.clearInterval(timer);
      }
    }, intervalMs);
    return () => window.clearInterval(timer);
  }, [activePanel, marketStallModal, ogOfferActive]);

  const handleGoogleSignIn = useCallback(async () => {
    sound.playClick();
    setAuthError('');
    setAuthLoading(true);
    try {
      await signInWithGoogle();
    } catch (error) {
      const code =
        typeof error === 'object' && error !== null && 'code' in error
          ? String((error as { code?: string }).code)
          : '';
      if (code === 'auth/popup-closed-by-user') {
        setAuthError(
          lang === 'en'
            ? 'The Google window was closed before completing sign-in.'
            : 'Se cerró la ventana de Google antes de completar el acceso.'
        );
      } else if (code === 'auth/popup-blocked') {
        setAuthError(
          lang === 'en'
            ? 'Your browser blocked the Google popup window. Please allow popups to continue.'
            : 'Tu navegador bloqueó la ventana emergente de Google. Permítela para continuar.'
        );
      } else {
        setAuthError(
          lang === 'en'
            ? 'Could not sign in with Google. Please try again.'
            : 'No se pudo iniciar sesión con Google. Inténtalo de nuevo.'
        );
      }
    } finally {
      setAuthLoading(false);
    }
  }, [lang]);

  const handleClaimOgRod = useCallback(async () => {
    const claimAttemptNow = Date.now();
    setOgOfferNowMs(claimAttemptNow);
    if (!isOgOfferActive(claimAttemptNow)) {
      setOgClaimError(
        lang === 'en'
          ? 'The 5-day OG Rod offer has ended.'
          : 'La oferta de 5 días de la Caña OG ha finalizado.'
      );
      return;
    }
    if (hasOgTitle || ogClaimLoading) return;
    setOgClaimError('');

    if (!firebaseUser) {
      const nextCount = ogClaims + 1;
      setOgClaims(nextCount);
      try {
        localStorage.setItem(OG_CLAIMS_KEY, String(nextCount));
      } catch {
        // ignore storage errors
      }
      setHasOgTitle(true);
      setOwnedCosmetics((prev) =>
        prev.includes('rod_og') ? prev : [...prev, 'rod_og']
      );
      setEquippedCosmetics((prev) => [
        ...prev.filter((id) => getCosmeticEquipGroup(id) !== 'rod'),
        'rod_og',
      ]);
      sound.playCelebration();
      return;
    }

    setOgClaimLoading(true);
    const ogRef = doc(db, 'globalEvents', 'ogRod');
    const claimRef = doc(db, 'globalEvents', 'ogRod', 'claims', firebaseUser.uid);
    try {
      const result = await runTransaction(db, async (tx) => {
        const [ogSnap, claimSnap] = await Promise.all([
          tx.get(ogRef),
          tx.get(claimRef),
        ]);
        const currentCount = ogSnap.exists()
          ? Math.max(0, Number(ogSnap.data().claimedCount) || 0)
          : 0;
        if (claimSnap.exists()) {
          return { status: 'already_claimed' as const, count: currentCount };
        }
        const nextCount = currentCount + 1;
        tx.set(claimRef, {
          ownerUid: firebaseUser.uid,
          claimedAt: serverTimestamp(),
        });
        if (!ogSnap.exists()) {
          tx.set(ogRef, {
            claimedCount: 1,
            maxClaims: 0,
            updatedAt: serverTimestamp(),
          });
        } else {
          tx.update(ogRef, {
            claimedCount: nextCount,
            updatedAt: serverTimestamp(),
          });
        }
        return { status: 'claimed' as const, count: nextCount };
      });

      setOgClaims(result.count);
      try {
        localStorage.setItem(OG_CLAIMS_KEY, String(result.count));
      } catch {
        // ignore storage errors
      }

      setHasOgTitle(true);
      setOwnedCosmetics((prev) =>
        prev.includes('rod_og') ? prev : [...prev, 'rod_og']
      );
      setEquippedCosmetics((prev) => [
        ...prev.filter((id) => getCosmeticEquipGroup(id) !== 'rod'),
        'rod_og',
      ]);
      sound.playCelebration();
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      if (
        msg.toLowerCase().includes('permission') ||
        msg.toLowerCase().includes('insufficient')
      ) {
        handleFirestoreError(error, OperationType.WRITE, 'globalEvents/ogRod');
      }
      // Fallback to local claim during active 5-day window if offline
      setHasOgTitle(true);
      setOwnedCosmetics((prev) =>
        prev.includes('rod_og') ? prev : [...prev, 'rod_og']
      );
      setEquippedCosmetics((prev) => [
        ...prev.filter((id) => getCosmeticEquipGroup(id) !== 'rod'),
        'rod_og',
      ]);
      sound.playCelebration();
    } finally {
      setOgClaimLoading(false);
    }
  }, [hasOgTitle, ogClaimLoading, firebaseUser, ogClaims]);

  const handleGoogleSignOut = useCallback(async () => {
    sound.playClick();
    setAuthError('');
    setAuthLoading(true);
    try {
      await signOutFromGoogle();
    } catch {
      setAuthError(
        lang === 'en'
          ? 'Could not sign out from Google.'
          : 'No se pudo cerrar la sesión de Google.'
      );
    } finally {
      setAuthLoading(false);
    }
  }, [lang]);

  const travelToWorld = useCallback((targetWorld: 'river' | 'underworld') => {
    setIsTransitioningWorld(true);
    setTransitioningWorldName(targetWorld);
    setPendingCatch(null);
    setActivePanel('none');
    setMarketStallModal('none');
    sound.playTravel();
    setTimeout(() => {
      setWorld(targetWorld);
      setScene('dock');
      setIndexTab(targetWorld);
    }, 450);
    setTimeout(() => {
      setIsTransitioningWorld(false);
      setTransitioningWorldName(null);
    }, 950);
  }, []);

  const flushLocalSaveRef = useRef<() => void>(() => {});
  flushLocalSaveRef.current = () => {
    try {
      const lp = getLevelProgressFromTotalXp(totalXpRef.current);
      const data: SaveData = {
        coins,
        fishCount,
        totalCoinsEarned,
        playTimeSeconds: Math.max(0, Math.round(playTimeSecondsRef.current)),
        level: lp.level,
        xp: lp.currentLevelXp,
        totalXp: lp.totalXp,
        discoveredFish,
        maxFishWeights,
        ownedCosmetics,
        equippedCosmetics,
        googleSignedIn,
        username,
        avatar,
        friends,
        backpackCapacity,
        lastUsernameChangeAt,
        hasOgTitle,
        claimedIndexRewards,
        claimedLevelRewards,
        baitInventory,
        equippedBaitId,
        activeBaitCharges,
        underworldUnlocked,
        catchHistory,
        seenRarityTutorials: sanitizeSeenRarityTutorials(seenRarityTutorials),
        seenUnderworldIntro,
        seenUnderworldMarketIntro,
      };
      localStorage.setItem(SAVE_KEY, JSON.stringify(data));
      saveSeenRarityTutorialsToStorage(seenRarityTutorials);
      saveUnderworldGuideSeen('underworld', seenUnderworldIntro);
      saveUnderworldGuideSeen('underworld_market', seenUnderworldMarketIntro);
      localStorage.setItem(
        'ice_fishing_underworld_unlocked',
        underworldUnlocked ? '1' : '0'
      );
    } catch {
      // ignore storage errors
    }
  };

  // Persist progress automatically on meaningful state changes (playtime flushed periodically / on pause / unload)
  useEffect(() => {
    flushLocalSaveRef.current();
  }, [
    coins,
    fishCount,
    totalCoinsEarned,
    totalXp,
    discoveredFish,
    maxFishWeights,
    ownedCosmetics,
    equippedCosmetics,
    googleSignedIn,
    username,
    avatar,
    friends,
    backpackCapacity,
    lastUsernameChangeAt,
    hasOgTitle,
    claimedIndexRewards,
    claimedLevelRewards,
    baitInventory,
    equippedBaitId,
    activeBaitCharges,
    underworldUnlocked,
    catchHistory,
    seenRarityTutorials,
    seenUnderworldIntro,
    seenUnderworldMarketIntro,
  ]);

  useEffect(() => {
    const handleVisibilityOrUnload = () => {
      if (document.visibilityState === 'hidden') {
        flushLocalSaveRef.current();
        saveDailyQuestsState(dailyQuestsRef.current);
      }
    };
    const handleBeforeUnload = () => {
      flushLocalSaveRef.current();
      saveDailyQuestsState(dailyQuestsRef.current);
    };
    document.addEventListener('visibilitychange', handleVisibilityOrUnload);
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityOrUnload);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  // Sync playtime/quests state immediately when viewing stats/quests or leaving active play
  useEffect(() => {
    const needsFreshTimer =
      mode !== 'playing' ||
      activePanel === 'profile' ||
      activePanel === 'quests' ||
      activePanel === 'leaderboard' ||
      activePanel === 'friends';
    if (!needsFreshTimer) return;
    setPlayTimeSeconds((prev) =>
      prev === playTimeSecondsRef.current ? prev : playTimeSecondsRef.current
    );
    setDailyQuests(dailyQuestsRef.current);
    if (mode !== 'playing') {
      flushLocalSaveRef.current();
    }
  }, [mode, activePanel]);

  // Active play time counter + daily playtime quest progress (ref-accumulated to avoid 1Hz full-App re-renders)
  useEffect(() => {
    if (mode !== 'playing') return;
    let tickCount = 0;
    const timer = window.setInterval(() => {
      playTimeSecondsRef.current += 1;
      tickCount += 1;
      const prevQ = dailyQuestsRef.current;
      const nextQ = applyPlayTimeToDailyQuests(prevQ, 1);
      dailyQuestsRef.current = nextQ;
      const justCompleted = nextQ.quests.some(
        (q, idx) =>
          q.metric === 'play_seconds' &&
          q.progress >= q.target &&
          (prevQ.quests[idx]?.progress ?? 0) < q.target
      );
      const viewingTimerUi =
        activePanelRef.current === 'profile' ||
        activePanelRef.current === 'quests' ||
        activePanelRef.current === 'leaderboard' ||
        activePanelRef.current === 'friends';
      if (
        viewingTimerUi ||
        tickCount % 15 === 0 ||
        justCompleted ||
        nextQ.dateKey !== prevQ.dateKey
      ) {
        setPlayTimeSeconds(playTimeSecondsRef.current);
        setDailyQuests(nextQ);
        saveDailyQuestsState(nextQ);
        if (tickCount % 15 === 0) {
          flushLocalSaveRef.current();
        }
      }
    }, 1000);
    return () => window.clearInterval(timer);
  }, [mode]);

  useEffect(() => {
    document.body.dataset.state = mode;
  }, [mode]);

  const startGame = useCallback(() => {
    sound.playClick();
    if (!sound.muted && !sound.musicMuted) {
      sound.startBackgroundMusic();
    }
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    setMode('playing');
  }, []);

  useEffect(() => {
    if (luckBoostUntil <= Date.now()) {
      setLuckNowMs(Date.now());
      return;
    }
    setLuckNowMs(Date.now());
    const timer = window.setInterval(() => {
      const now = Date.now();
      setLuckNowMs(now);
      if (now >= luckBoostUntil) {
        window.clearInterval(timer);
        luckBoostUntilRef.current = 0;
        setLuckBoostUntil(0);
        try {
          localStorage.removeItem('infinite_catch_luck_boost_until');
        } catch {
          // ignore
        }
      }
    }, 1000);
    return () => window.clearInterval(timer);
  }, [luckBoostUntil]);

  const luckSecondsLeft = Math.max(
    0,
    Math.ceil((luckBoostUntil - luckNowMs) / 1000)
  );
  const activeLuckMultiplier = luckSecondsLeft > 0
    ? Number.isFinite(customLuckMultiplier)
      ? Math.max(1, customLuckMultiplier)
      : 1
    : 1;

  const getLiveLuckMultiplier = useCallback((): number => {
    if (luckBoostUntilRef.current > Date.now()) {
      const m = customLuckMultiplierRef.current;
      return Number.isFinite(m) ? Math.max(1, m) : 1;
    }
    return 1;
  }, []);

  const getCombinedCastLuckMultiplier = useCallback(
    (wormOverride?: WormBaitItem | null): number => {
      const timedLuck = getLiveLuckMultiplier();
      const rodLuck = getEquippedRodStats(equippedCosmetics).luckMultiplier;
      const activeWorm =
        wormOverride !== undefined
          ? wormOverride
          : lastCastWormRef.current ??
            (equippedBaitIdRef.current &&
            ((baitInventoryRef.current[equippedBaitIdRef.current] ?? 0) > 0 ||
              activeBaitChargesRef.current > 0)
              ? getWormBaitById(equippedBaitIdRef.current)
              : null);
      return calculateCombinedLuckMultiplier({
        timedLuck,
        rodLuck,
        wormLuck: activeWorm?.luckMultiplier ?? 1,
      });
    },
    [getLiveLuckMultiplier, equippedCosmetics]
  );

  const equippedRodLuckForHud =
    getEquippedRodStats(equippedCosmetics).luckMultiplier;
  const equippedWormForHud =
    equippedBaitId &&
    ((baitInventory[equippedBaitId] ?? 0) > 0 || activeBaitCharges > 0)
      ? getWormBaitById(equippedBaitId)
      : null;
  const totalEffectiveHudLuck = calculateCombinedLuckMultiplier({
    timedLuck: activeLuckMultiplier,
    rodLuck: equippedRodLuckForHud,
    wormLuck: equippedWormForHud?.luckMultiplier ?? 1,
  });

  const grantLuckBoost = useCallback((multiplier: number, durationMs: number) => {
    const now = Date.now();
    const safeMult = Number.isFinite(multiplier)
      ? Math.max(1, Math.round(multiplier * 100) / 100)
      : 2;
    const safeDuration = Number.isFinite(durationMs) ? Math.max(0, durationMs) : 0;
    if (safeDuration <= 0) return;

    const isActive = luckBoostUntilRef.current > now;
    const base = isActive ? luckBoostUntilRef.current : now;
    const nextEnd = base + safeDuration;
    const currentMult = Number.isFinite(customLuckMultiplierRef.current)
      ? Math.max(1, customLuckMultiplierRef.current)
      : 1;
    const nextMult = isActive
      ? Math.min(1000, Math.round(currentMult * safeMult * 100) / 100)
      : safeMult;

    luckBoostUntilRef.current = nextEnd;
    customLuckMultiplierRef.current = nextMult;
    setLuckNowMs(now);
    setLuckBoostUntil(nextEnd);
    setCustomLuckMultiplier(nextMult);
    try {
      localStorage.setItem('infinite_catch_custom_luck_mult', String(nextMult));
      localStorage.setItem('infinite_catch_luck_boost_until', String(nextEnd));
    } catch {
      // ignore
    }
    sound.playCelebration();
  }, []);

  const applyAdminLuck = useCallback(
    (multiplier: number, durationMs: number) => {
      const now = Date.now();
      const safeMult = Number.isFinite(multiplier)
        ? Math.max(1, Math.round(multiplier * 10) / 10)
        : 2;
      const safeDuration = Number.isFinite(durationMs) ? Math.max(0, durationMs) : 0;
      const targetEnd = now + safeDuration;
      luckBoostUntilRef.current = targetEnd;
      customLuckMultiplierRef.current = safeMult;
      setCustomLuckMultiplier(safeMult);
      setLuckBoostUntil(targetEnd);
      setLuckNowMs(now);
      try {
        localStorage.setItem('infinite_catch_custom_luck_mult', String(safeMult));
        localStorage.setItem('infinite_catch_luck_boost_until', String(targetEnd));
      } catch {
        // ignore
      }
      sound.playCelebration();
    },
    []
  );

  const resetAdminLuck = useCallback(() => {
    luckBoostUntilRef.current = 0;
    customLuckMultiplierRef.current = 2;
    setLuckBoostUntil(0);
    setCustomLuckMultiplier(2);
    setLuckNowMs(Date.now());
    try {
      localStorage.removeItem('infinite_catch_luck_boost_until');
      localStorage.setItem('infinite_catch_custom_luck_mult', '2');
    } catch {
      // ignore
    }
    sound.playClick();
  }, []);

  const executeAdminLuckCommand = useCallback(
    (rawCommand: string): AdminLuckResult => {
      if (!isCurrentUserAdmin) {
        return {
          success: false,
          message:
            lang === 'en'
              ? 'You do not have administrator permissions to run this command.'
              : 'No tienes permisos de administrador para ejecutar este comando.',
        };
      }
      const result = parseAdminCommand(rawCommand, lang);
      if (!result.success) {
        return result;
      }
      if (result.isReset) {
        resetAdminLuck();
        return result;
      }
      if (result.multiplier && result.durationMs !== undefined) {
        applyAdminLuck(result.multiplier, result.durationMs);
      }
      return result;
    },
    [isCurrentUserAdmin, applyAdminLuck, resetAdminLuck, lang]
  );

  const maybeTriggerLuckChest = useCallback((nextFishCount: number) => {
    if (nextFishCount <= 0) return;
    const milestone = Math.floor(nextFishCount / 100) * 100;
    if (milestone >= 100 && milestone > luckChestTriggeredRef.current) {
      luckChestTriggeredRef.current = milestone;
      setLuckChestMilestone(milestone);
      sound.playCelebration();
    }
  }, []);

  const handleOpenLuckChest = useCallback(() => {
    grantLuckBoost(2, LUCK_BOOST_DURATION_MS);
    setLuckChestMilestone(null);
  }, [grantLuckBoost]);

  const recordDailyQuestCatch = useCallback((species: PokemonSpecies) => {
    const next = applyCatchToDailyQuests(dailyQuestsRef.current, species);
    if (next !== dailyQuestsRef.current) {
      dailyQuestsRef.current = next;
      saveDailyQuestsState(next);
      setDailyQuests(next);
    }
  }, []);

  const recordDailyQuestCoins = useCallback((earnedCoins: number) => {
    if (earnedCoins <= 0) return;
    const next = applyCoinsToDailyQuests(dailyQuestsRef.current, earnedCoins);
    if (next !== dailyQuestsRef.current) {
      dailyQuestsRef.current = next;
      saveDailyQuestsState(next);
      setDailyQuests(next);
    }
  }, []);

  const handleClaimDailyQuest = useCallback(
    (questId: string) => {
      const { nextState, claimedQuest } = claimDailyQuestReward(
        dailyQuestsRef.current,
        questId
      );
      if (!claimedQuest) return;
      dailyQuestsRef.current = nextState;
      setDailyQuests(nextState);
      saveDailyQuestsState(nextState);

      if (claimedQuest.rewardCoins > 0) {
        setCoins((c) => c + claimedQuest.rewardCoins);
        setTotalCoinsEarned((t) => t + claimedQuest.rewardCoins);
      }

      if (
        claimedQuest.rewardLuckDurationMs &&
        claimedQuest.rewardLuckDurationMs > 0 &&
        claimedQuest.rewardLuckMultiplier &&
        claimedQuest.rewardLuckMultiplier > 1
      ) {
        grantLuckBoost(
          claimedQuest.rewardLuckMultiplier,
          claimedQuest.rewardLuckDurationMs
        );
      } else {
        sound.playCelebration();
      }

      const coinPart =
        claimedQuest.rewardCoins > 0
          ? `+${formatNumber(claimedQuest.rewardCoins, lang)} ${lang === 'en' ? 'coins' : 'monedas'}`
          : '';
      const luckPart =
        claimedQuest.rewardLuckDurationMs && claimedQuest.rewardLuckMultiplier
          ? `🍀 ${lang === 'en' ? 'Luck' : 'Suerte'} x${claimedQuest.rewardLuckMultiplier} (${Math.round(claimedQuest.rewardLuckDurationMs / 60_000)}m)`
          : '';
      const combined = [coinPart, luckPart].filter(Boolean).join(' · ');
      setQuestClaimBanner(
        lang === 'en' ? `Reward claimed: ${combined}!` : `¡Recompensa reclamada: ${combined}!`
      );
    },
    [grantLuckBoost, lang]
  );

  const unclaimedLevelRewardsCount = useMemo(
    () => getUnclaimedRewardRoadCount(levelProgress.level, claimedLevelRewards),
    [levelProgress.level, claimedLevelRewards]
  );

  const handleClaimLevelReward = useCallback(
    (milestoneLevel: number) => {
      const result = claimLevelReward(
        milestoneLevel,
        levelProgress.level,
        claimedLevelRewards
      );
      if (!result.success || !result.entry) return;

      const entry = result.entry;
      setClaimedLevelRewards(result.nextClaimed);

      if (entry.coins > 0) {
        setCoins((c) => c + entry.coins);
        setTotalCoinsEarned((tot) => tot + entry.coins);
        recordDailyQuestCoins(entry.coins);
      }

      if (entry.baitId && entry.baitCount && entry.baitCount > 0) {
        const addedBaitId = entry.baitId;
        const addedCount = entry.baitCount;
        setBaitInventory((prev) => {
          const next = {
            ...prev,
            [addedBaitId]: (prev[addedBaitId] ?? 0) + addedCount,
          };
          baitInventoryRef.current = next;
          return next;
        });
        if (!equippedBaitIdRef.current) {
          equippedBaitIdRef.current = addedBaitId;
          setEquippedBaitId(addedBaitId);
        }
      }

      if (entry.unlocksUnderworld) {
        underworldUnlockedRef.current = true;
        setUnderworldUnlocked(true);
        try {
          localStorage.setItem('ice_fishing_underworld_unlocked', '1');
        } catch {
          // ignore storage errors
        }
      }

      if (
        entry.luckMultiplier &&
        entry.luckMultiplier > 1 &&
        entry.luckDurationMs &&
        entry.luckDurationMs > 0
      ) {
        grantLuckBoost(entry.luckMultiplier, entry.luckDurationMs);
      } else {
        sound.playCelebration();
      }

      const parts: string[] = [];
      if (entry.coins > 0) {
        parts.push(
          `+${formatNumber(entry.coins, lang)} ${lang === 'en' ? 'coins' : 'monedas'}`
        );
      }
      if (entry.luckMultiplier && entry.luckDurationMs) {
        parts.push(
          `🍀 ${lang === 'en' ? 'Luck' : 'Suerte'} x${entry.luckMultiplier} (${Math.round(
            entry.luckDurationMs / 60_000
          )}m)`
        );
      }
      if (entry.baitId && entry.baitCount) {
        const bLabel =
          (lang === 'en' ? entry.baitLabelEn : entry.baitLabelEs) ||
          (lang === 'en' ? 'Bait' : 'Cebo');
        parts.push(`🪱 x${entry.baitCount} ${bLabel}`);
      }
      if (entry.unlocksUnderworld) {
        parts.push(
          lang === 'en'
            ? '😈 Mini Demon & Underworld unlocked'
            : '😈 Mini Demonio e Inframundo desbloqueados'
        );
      }
      if (entry.perkLabelEs || entry.perkLabelEn) {
        parts.push(
          (lang === 'en' ? entry.perkLabelEn : entry.perkLabelEs) ?? ''
        );
      }
      const summary = parts.filter(Boolean).join(' · ');
      setRewardRoadBanner(
        lang === 'en'
          ? `Level ${entry.level} claimed: ${summary}!`
          : `¡Nivel ${entry.level} reclamado: ${summary}!`
      );
    },
    [
      levelProgress.level,
      claimedLevelRewards,
      recordDailyQuestCoins,
      grantLuckBoost,
      lang,
    ]
  );

  const handleClaimAllLevelRewards = useCallback(() => {
    let workingClaimed = { ...claimedLevelRewards };
    let totalCoinsAdded = 0;
    let maxLuckMult = 0;
    let totalLuckMs = 0;
    let claimedCount = 0;
    let unlockedUw = false;
    const addedWorms: Partial<Record<WormBaitId, number>> = {};
    let firstAddedWorm: WormBaitId | null = null;

    for (const milestone of REWARD_ROAD_MILESTONES) {
      const res = claimLevelReward(
        milestone.level,
        levelProgress.level,
        workingClaimed
      );
      if (res.success && res.entry) {
        workingClaimed = res.nextClaimed;
        claimedCount += 1;
        totalCoinsAdded += res.entry.coins;
        if (res.entry.baitId && res.entry.baitCount && res.entry.baitCount > 0) {
          addedWorms[res.entry.baitId] =
            (addedWorms[res.entry.baitId] ?? 0) + res.entry.baitCount;
          if (!firstAddedWorm) {
            firstAddedWorm = res.entry.baitId;
          }
        }
        if (res.entry.unlocksUnderworld) {
          unlockedUw = true;
        }
        if (
          res.entry.luckMultiplier &&
          res.entry.luckMultiplier > 1 &&
          res.entry.luckDurationMs &&
          res.entry.luckDurationMs > 0
        ) {
          maxLuckMult = Math.max(maxLuckMult, res.entry.luckMultiplier);
          totalLuckMs += res.entry.luckDurationMs;
        }
      }
    }

    if (claimedCount === 0) return;
    setClaimedLevelRewards(workingClaimed);

    if (totalCoinsAdded > 0) {
      setCoins((c) => c + totalCoinsAdded);
      setTotalCoinsEarned((tot) => tot + totalCoinsAdded);
      recordDailyQuestCoins(totalCoinsAdded);
    }

    if (Object.keys(addedWorms).length > 0) {
      setBaitInventory((prev) => {
        const next: BaitInventory = {
          worm_harbor: prev.worm_harbor + (addedWorms.worm_harbor ?? 0),
          worm_korean: prev.worm_korean + (addedWorms.worm_korean ?? 0),
          worm_luck5: prev.worm_luck5 + (addedWorms.worm_luck5 ?? 0),
        };
        baitInventoryRef.current = next;
        return next;
      });
      if (!equippedBaitIdRef.current && firstAddedWorm) {
        equippedBaitIdRef.current = firstAddedWorm;
        setEquippedBaitId(firstAddedWorm);
      }
    }

    if (unlockedUw) {
      underworldUnlockedRef.current = true;
      setUnderworldUnlocked(true);
      try {
        localStorage.setItem('ice_fishing_underworld_unlocked', '1');
      } catch {
        // ignore storage errors
      }
    }

    if (maxLuckMult > 1 && totalLuckMs > 0) {
      grantLuckBoost(maxLuckMult, totalLuckMs);
    } else {
      sound.playCelebration();
    }

    setRewardRoadBanner(
      lang === 'en'
        ? `Claimed ${claimedCount} rewards (+${formatNumber(totalCoinsAdded, lang)} coins${unlockedUw ? ' · 😈 Underworld unlocked' : ''})!`
        : `¡Reclamadas ${claimedCount} recompensas (+${formatNumber(totalCoinsAdded, lang)} monedas${unlockedUw ? ' · 😈 Inframundo desbloqueado' : ''})!`
    );
  }, [
    claimedLevelRewards,
    levelProgress.level,
    recordDailyQuestCoins,
    grantLuckBoost,
    lang,
  ]);

  const awardCatchXp = useCallback(
    (caught: CaughtPokemon, suppressLevelUpSound = false) => {
      const xpEarned = calculateCatchXp(caught.species, caught.weightKg);
      const result = applyXpGain(totalXpRef.current, xpEarned);
      totalXpRef.current = result.progress.totalXp;
      setTotalXp(result.progress.totalXp);

      if (xpGainTimerRef.current !== null) {
        window.clearTimeout(xpGainTimerRef.current);
      }
      const nowKey = Date.now();
      setLastXpGain({ amount: xpEarned, key: nowKey });
      xpGainTimerRef.current = window.setTimeout(() => {
        setLastXpGain(null);
        xpGainTimerRef.current = null;
      }, 2400);

      if (result.leveledUp) {
        if (!suppressLevelUpSound) {
          sound.playCelebration();
        }
        if (levelUpTimerRef.current !== null) {
          window.clearTimeout(levelUpTimerRef.current);
        }
        if (levelUpGlowTimerRef.current !== null) {
          window.clearTimeout(levelUpGlowTimerRef.current);
        }
        setLevelUpAlert({
          newLevel: result.newLevel,
          levelsGained: result.levelsGained,
          nextTargetXp: result.progress.xpForNextLevel,
          key: nowKey,
        });
        setLevelUpGlowActive(true);
        levelUpTimerRef.current = window.setTimeout(() => {
          setLevelUpAlert(null);
          levelUpTimerRef.current = null;
        }, 4800);
        levelUpGlowTimerRef.current = window.setTimeout(() => {
          setLevelUpGlowActive(false);
          levelUpGlowTimerRef.current = null;
        }, 12000);
      }

      return xpEarned;
    },
    []
  );

  useEffect(() => {
    return () => {
      if (xpGainTimerRef.current !== null) {
        window.clearTimeout(xpGainTimerRef.current);
      }
      if (levelUpTimerRef.current !== null) {
        window.clearTimeout(levelUpTimerRef.current);
      }
      if (levelUpGlowTimerRef.current !== null) {
        window.clearTimeout(levelUpGlowTimerRef.current);
      }
    };
  }, []);

  const executeDeleteProgress = useCallback(() => {
    try {
      const lp = getLevelProgressFromTotalXp(totalXpRef.current);
      const backup: SaveData = {
        coins,
        fishCount,
        totalCoinsEarned,
        playTimeSeconds: playTimeSecondsRef.current,
        level: lp.level,
        xp: lp.currentLevelXp,
        totalXp: lp.totalXp,
        discoveredFish,
        maxFishWeights,
        ownedCosmetics,
        equippedCosmetics,
        googleSignedIn,
        username,
        avatar,
        friends,
        backpackCapacity,
        lastUsernameChangeAt,
        hasOgTitle,
        claimedIndexRewards,
        claimedLevelRewards,
        baitInventory,
        equippedBaitId,
        activeBaitCharges,
        underworldUnlocked,
        catchHistory,
        seenRarityTutorials,
      };
      localStorage.setItem(BACKUP_SAVE_KEY, JSON.stringify(backup));
      localStorage.setItem('ice_fishing_underworld_unlocked', '0');
      localStorage.removeItem('infinite_catch_tutorial_done');
      localStorage.removeItem(TUTORIAL_STORAGE_KEY);
      localStorage.removeItem(MINIGAME_TUTORIAL_STORAGE_KEY);
      localStorage.removeItem(RARITY_TUTORIAL_STORAGE_KEY);
      clearUnderworldGuidesFromStorage();
      localStorage.removeItem('infinite_catch_luck_boost_until');
      localStorage.removeItem('infinite_catch_custom_luck_mult');
    } catch {
      // ignore storage errors
    }
    if (xpGainTimerRef.current !== null) {
      window.clearTimeout(xpGainTimerRef.current);
      xpGainTimerRef.current = null;
    }
    if (levelUpTimerRef.current !== null) {
      window.clearTimeout(levelUpTimerRef.current);
      levelUpTimerRef.current = null;
    }
    if (levelUpGlowTimerRef.current !== null) {
      window.clearTimeout(levelUpGlowTimerRef.current);
      levelUpGlowTimerRef.current = null;
    }
    totalXpRef.current = 0;
    setTotalXp(0);
    setLastXpGain(null);
    setLevelUpAlert(null);
    setLevelUpGlowActive(false);
    setSeenRarityTutorials([]);
    setSeenUnderworldIntro(false);
    setSeenUnderworldMarketIntro(false);
    setTutorialStep(1);
    setMinigameTutorialDone(false);
    fishingStateRef.current = createInitialFishingState();
    setPhase('IDLE');
    setFishCount(0);
    setCoins(0);
    setTotalCoinsEarned(0);
    setPlayTimeExact(0);
    setDiscoveredFish({});
    setMaxFishWeights({});
    setInventory([]);
    setCatchHistory([]);
    setOwnedCosmetics([]);
    setEquippedCosmetics([]);
    setClaimedIndexRewards({});
    setClaimedLevelRewards({});
    const emptyBaits = createEmptyBaitInventory();
    baitInventoryRef.current = emptyBaits;
    setBaitInventory(emptyBaits);
    equippedBaitIdRef.current = null;
    setEquippedBaitId(null);
    activeBaitChargesRef.current = 0;
    setActiveBaitCharges(0);
    lastCastWormRef.current = null;
    setLastCastWorm(null);
    setRewardRoadBanner('');
    setBackpackCapacity(10);
    setUnderworldUnlocked(false);
    setWorld('river');
    if (avatar.startsWith(MASTERY_AVATAR_PREFIX)) {
      setAvatar('🐟');
    }
    setLastCaught(null);
    setPendingCatch(null);
    luckBoostUntilRef.current = 0;
    customLuckMultiplierRef.current = 2;
    setLuckBoostUntil(0);
    setCustomLuckMultiplier(2);
    setLuckChestMilestone(null);
    luckChestTriggeredRef.current = 0;
    const freshQuests = createDailyQuestsForDate(getDailyDateKey());
    dailyQuestsRef.current = freshQuests;
    setDailyQuests(freshQuests);
    saveDailyQuestsState(freshQuests);
    setQuestClaimBanner('');
    setActivePanel('none');
    setDeleteStep('none');
    setDeleteMinigameFailed(false);
    setMode('playing');
  }, [
    coins,
    fishCount,
    totalCoinsEarned,
    discoveredFish,
    maxFishWeights,
    ownedCosmetics,
    equippedCosmetics,
    googleSignedIn,
    username,
    avatar,
    friends,
    backpackCapacity,
    lastUsernameChangeAt,
    hasOgTitle,
    claimedIndexRewards,
    claimedLevelRewards,
    baitInventory,
    equippedBaitId,
    activeBaitCharges,
    underworldUnlocked,
    catchHistory,
    seenRarityTutorials,
  ]);

  const handleCatchPokemon = useCallback(() => {
    const caught =
      pendingCatch ??
      rollPokemonCatch(Math.random, world, getCombinedCastLuckMultiplier());
    setLastCaught(caught);
    setPendingCatch(null);
    setInventory((prev) => [caught, ...prev]);
    setCatchHistory((prev) => [toCatchHistoryEntry(caught), ...prev].slice(0, 10));
    setDiscoveredFish((prev) => ({
      ...prev,
      [caught.species.id]: (prev[caught.species.id] ?? 0) + 1,
    }));
    setMaxFishWeights((prev) =>
      updateMaxFishWeightRecord(prev, caught.species.id, caught.weightKg)
    );
    awardCatchXp(caught);
    setMinigameTutorialDone(true);
    try {
      localStorage.setItem(MINIGAME_TUTORIAL_STORAGE_KEY, '1');
    } catch {}
    recordDailyQuestCatch(caught.species);
    maybeTriggerLuckChest(fishingStateRef.current.fishCount);
    if (tutorialStep === 2) {
      setTutorialStep(3);
    }
  }, [
    pendingCatch,
    world,
    getCombinedCastLuckMultiplier,
    awardCatchXp,
    recordDailyQuestCatch,
    maybeTriggerLuckChest,
    tutorialStep,
  ]);

  const handlePhaseChange = useCallback(
    (nextPhase: FishingPhase, nextCount: number) => {
      setPhase(nextPhase);
      setFishCount(nextCount);
      if (nextPhase === 'BITING') {
        setPendingCatch(
          (prev) =>
            prev ??
            rollPokemonCatch(Math.random, world, getCombinedCastLuckMultiplier())
        );
      } else if (nextPhase === 'MISSED' || nextPhase === 'IDLE') {
        setPendingCatch(null);
        if (nextCount === 0) {
          setTutorialStep((prev) => (prev === 2 ? 1 : prev));
        }
      }
    },
    [world, getCombinedCastLuckMultiplier]
  );

  useEffect(() => {
    if (shouldCompleteMarketTutorial(tutorialStep, scene, isWalkingScene, marketTutorialSubStep)) {
      setMarketTutorialSubStep('go_to_market');
      setTutorialStep(5);
      return;
    }
    const nextSub = resolveMarketSubStepOnSceneState(
      tutorialStep,
      scene,
      isWalkingScene,
      marketTutorialSubStep
    );
    if (nextSub !== marketTutorialSubStep) {
      setMarketTutorialSubStep(nextSub);
    }
  }, [tutorialStep, scene, isWalkingScene, marketTutorialSubStep]);

  const tutorialHighlightedStall = getHighlightedStallForTutorial(
    tutorialStep,
    scene,
    isWalkingScene,
    marketTutorialSubStep
  );

  const handleAdvanceMarketTour = useCallback(() => {
    sound.playClick();
    if (marketTutorialSubStep === 'pvp') {
      setMarketTutorialSubStep('returning');
      setActivePanel('none');
      setMarketStallModal('none');
      setWalkRequest({ id: Date.now(), target: 'dock' });
      return;
    }
    setMarketTutorialSubStep((prev) => getNextMarketTutorialSubStep(prev));
  }, [marketTutorialSubStep]);

  const closeActivePanel = useCallback(() => {
    sound.playClick();
    setInspectedProfile(null);
    if (
      activePanel === 'locker' ||
      activePanel === 'leaderboard' ||
      activePanel === 'friends'
    ) {
      setActivePanel('profile');
      return;
    }
    if (tutorialStep === 3 && activePanel === 'index') {
      setMarketTutorialSubStep('go_to_market');
      setTutorialStep(4);
    }
    setActivePanel('none');
  }, [tutorialStep, activePanel]);

  const handleBuyWormBait = useCallback(
    (baitId: WormBaitId, quantity = 1) => {
      const bait = getWormBaitById(baitId);
      const safeQty = Math.max(1, Math.min(99, Math.floor(quantity)));
      const totalCost = bait.price * safeQty;
      if (coins < totalCost) return;
      sound.playClick();
      setCoins((c) => c - totalCost);
      setBaitInventory((prev) => {
        const next: BaitInventory = {
          ...prev,
          [baitId]: (prev[baitId] ?? 0) + safeQty,
        };
        baitInventoryRef.current = next;
        return next;
      });
      if (!equippedBaitIdRef.current) {
        equippedBaitIdRef.current = baitId;
        setEquippedBaitId(baitId);
      }
      setRodsShopNotice(
        lang === 'en'
          ? `Bought +${safeQty} ${bait.nameEn}!`
          : `¡Comprado +${safeQty} ${bait.nameEs}!`
      );
    },
    [coins, lang]
  );

  const handleToggleEquipWormBait = useCallback(
    (baitId: WormBaitId) => {
      sound.playClick();
      if (equippedBaitIdRef.current === baitId) {
        equippedBaitIdRef.current = null;
        setEquippedBaitId(null);
        return;
      }
      const ownedCount = baitInventoryRef.current[baitId] ?? 0;
      if (ownedCount <= 0 && activeBaitChargesRef.current <= 0) return;
      // Switching to a different worm resets active multi-cast charges of the previous worm
      if (equippedBaitIdRef.current !== baitId) {
        activeBaitChargesRef.current = 0;
        setActiveBaitCharges(0);
      }
      equippedBaitIdRef.current = baitId;
      setEquippedBaitId(baitId);
      const bait = getWormBaitById(baitId);
      setRodsShopNotice(
        lang === 'en'
          ? `Equipped ${bait.nameEn}`
          : `Equipado: ${bait.nameEs}`
      );
    },
    [lang]
  );

  const handleAction = useCallback(() => {
    if (
      mode !== 'playing' ||
      activePanel !== 'none' ||
      activeMinigame !== null ||
      failedMinigameCatch !== null ||
      luckChestMilestone !== null
    ) {
      return;
    }
    if (!sound.muted && !sound.musicMuted && !sound.isMusicPlaying()) {
      sound.startBackgroundMusic();
    }
    if (tutorialStep >= 3) {
      return;
    }
    if (
      fishingStateRef.current.phase === 'IDLE' &&
      inventory.length >= backpackCapacity
    ) {
      setActivePanel('market');
      return;
    }
    const rodStats = getEquippedRodStats(equippedCosmetics);
    if (fishingStateRef.current.phase === 'BITING') {
      sound.playClick();
      setLastCaught(null);
      setFailedMinigameReason('none');
      fightTelemetryRef.current = createInitialFightTelemetry();
      const currentTotalLuck = getCombinedCastLuckMultiplier(
        lastCastWormRef.current
      );
      const rolled =
        pendingCatch ?? rollPokemonCatch(Math.random, world, currentTotalLuck);
      setActiveMinigame(rolled);
      return;
    }

    const canCastNow =
      fishingStateRef.current.phase === 'IDLE' ||
      fishingStateRef.current.phase === 'CAUGHT' ||
      fishingStateRef.current.phase === 'MISSED';

    const wormCast = canCastNow
      ? consumeWormCastCharge({
          inventory: baitInventoryRef.current,
          equippedBaitId: equippedBaitIdRef.current,
          activeCharges: activeBaitChargesRef.current,
        })
      : null;

    const { next, event } = triggerFishingAction(
      fishingStateRef.current,
      Math.random,
      {
        rodId: rodStats.rodId,
        speedMultiplier: wormCast?.appliedBait?.speedMultiplier ?? 1,
      }
    );
    fishingStateRef.current = next;
    setPhase(next.phase);
    setFishCount(next.fishCount);

    if (event === 'cast') {
      if (wormCast) {
        baitInventoryRef.current = wormCast.nextInventory;
        setBaitInventory(wormCast.nextInventory);
        equippedBaitIdRef.current = wormCast.nextEquippedBaitId;
        setEquippedBaitId(wormCast.nextEquippedBaitId);
        activeBaitChargesRef.current = wormCast.nextActiveCharges;
        setActiveBaitCharges(wormCast.nextActiveCharges);
        lastCastWormRef.current = wormCast.appliedBait;
        setLastCastWorm(wormCast.appliedBait);
      } else {
        lastCastWormRef.current = null;
        setLastCastWorm(null);
      }
      const castLuck = getCombinedCastLuckMultiplier(
        wormCast?.appliedBait ?? null
      );
      fightTelemetryRef.current = createInitialFightTelemetry();
      setFailedMinigameReason('none');
      setLastCaught(null);
      setPendingCatch(rollPokemonCatch(Math.random, world, castLuck));
      sound.playCast();
      if (tutorialStep === 1) {
        setTutorialStep(2);
      }
    } else if (event === 'early_pull') {
      sound.playMiss();
      setPendingCatch(null);
      if (next.fishCount === 0) {
        setTutorialStep((prev) => (prev === 2 ? 1 : prev));
      }
    }
  }, [
    mode,
    activePanel,
    activeMinigame,
    failedMinigameCatch,
    luckChestMilestone,
    tutorialStep,
    world,
    backpackCapacity,
    equippedCosmetics,
    inventory.length,
    pendingCatch,
    getCombinedCastLuckMultiplier,
  ]);

  const toggleMute = useCallback((e?: React.MouseEvent<HTMLButtonElement>) => {
    e?.currentTarget.blur();
    setMuted((prev) => {
      const next = !prev;
      sound.muted = next;
      if (next) {
        sound.stopBackgroundMusic();
      } else if (!sound.musicMuted) {
        sound.startBackgroundMusic();
      }
      return next;
    });
  }, []);

  const toggleMusicMute = useCallback((e?: React.MouseEvent<HTMLButtonElement>) => {
    e?.currentTarget.blur();
    setMusicMuted((prev) => {
      const next = !prev;
      sound.setMusicMuted(next);
      return next;
    });
  }, []);

  const handleQuickSellAll = async () => {
    if (inventory.length === 0) return;
    sound.playClick();
    const earned = await LocalQuickSellMarket.sellAll(inventory);
    setCoins((c) => c + earned);
    setTotalCoinsEarned((t) => t + earned);
    recordDailyQuestCoins(earned);
    setInventory([]);
  };

  const handleSellOne = async (uid: string) => {
    const target = inventory.find((p) => p.uid === uid);
    if (!target) return;
    const earned = await LocalQuickSellMarket.sellOne(target);
    setCoins((c) => c + earned);
    setTotalCoinsEarned((t) => t + earned);
    recordDailyQuestCoins(earned);
    setInventory((prev) => prev.filter((p) => p.uid !== uid));
  };

  const handleBuyOrToggleCosmetic = (id: string, price: number) => {
    if (ownedCosmetics.includes(id)) {
      setEquippedCosmetics((prev) =>
        prev.includes(id)
          ? prev.filter((x) => x !== id)
          : equipCosmeticWithRules(prev, id)
      );
      return;
    }
    if (coins >= price) {
      setCoins((c) => c - price);
      setOwnedCosmetics((prev) => (prev.includes(id) ? prev : [...prev, id]));
      setEquippedCosmetics((prev) => equipCosmeticWithRules(prev, id));
    }
  };

  const dismissUnderworldGuide = useCallback((kind: UnderworldGuideKind) => {
    sound.playClick();
    saveUnderworldGuideSeen(kind, true);
    if (kind === 'underworld') {
      setSeenUnderworldIntro(true);
    } else {
      setSeenUnderworldMarketIntro(true);
    }
  }, []);

  const activeUnderworldGuide = resolveActiveUnderworldGuide({
    mode,
    world,
    scene,
    tutorialStep,
    isTransitioningWorld,
    isWalkingScene,
    activePanel,
    marketStallModal,
    hasPendingCatch: Boolean(pendingCatch),
    isMinigameOpen: Boolean(activeMinigame || failedMinigameCatch),
    seenUnderworldIntro,
    seenUnderworldMarketIntro,
  });

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;

      if (mode === 'title') {
        if (e.code === 'Space' || e.code === 'Enter') {
          e.preventDefault();
          startGame();
        }
        return;
      }

      if (showAdminCommandModal) {
        if (e.code === 'Escape') {
          e.preventDefault();
          setShowAdminCommandModal(false);
          return;
        }
      }

      if (
        isCurrentUserAdmin &&
        (e.key === '/' || e.code === 'F2') &&
        !showAdminCommandModal
      ) {
        const targetTag = (e.target as HTMLElement)?.tagName?.toLowerCase();
        if (targetTag !== 'input' && targetTag !== 'textarea') {
          e.preventDefault();
          sound.playClick();
          setShowAdminCommandModal(true);
          return;
        }
      }

      if (e.code === 'Escape') {
        e.preventDefault();
        if (activeUnderworldGuide) {
          dismissUnderworldGuide(activeUnderworldGuide);
          return;
        }
        if (inspectedProfile) {
          sound.playClick();
          setInspectedProfile(null);
          return;
        }
        if (deleteStep === 'warn1' || deleteStep === 'warn2') {
          setDeleteStep('none');
          return;
        }
        if (deleteStep === 'minigame') {
          return;
        }
        if (activePanel !== 'none') {
          closeActivePanel();
        } else {
          setMode((m) => (m === 'playing' ? 'paused' : 'playing'));
        }
        return;
      }

      if (e.code === 'KeyP' && activePanel === 'none' && deleteStep === 'none') {
        e.preventDefault();
        setMode((m) => (m === 'playing' ? 'paused' : 'playing'));
        return;
      }

      if (e.code === 'KeyM') {
        e.preventDefault();
        toggleMute();
        return;
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    mode,
    activePanel,
    deleteStep,
    inspectedProfile,
    startGame,
    toggleMute,
    closeActivePanel,
    showAdminCommandModal,
    isCurrentUserAdmin,
    activeUnderworldGuide,
    dismissUnderworldGuide,
  ]);

  const hasWizardWand = equippedCosmetics.includes('suit_wizard');

  const actionLabel = (() => {
    switch (phase) {
      case 'IDLE':
        return hasWizardWand ? t('castWithWand', lang) : t('castHook', lang);
      case 'CASTING':
        return hasWizardWand
          ? lang === 'en'
            ? 'Conjuring...'
            : 'Conjurando...'
          : t('casting', lang);
      case 'WAITING':
        return hasWizardWand ? t('canalizing', lang) : t('waiting', lang);
      case 'BITING':
        if (pendingCatch?.species.rarity === 'Secreto') {
          return t('bitingMystery', lang);
        }
        if (pendingCatch?.species.rarity === 'Secreto Abisal') {
          return t('bitingAbyss', lang);
        }
        return hasWizardWand ? t('attractMagic', lang) : t('pullNow', lang);
      case 'CAUGHT':
        return lastCaught
          ? `${getFishName(lastCaught.species.id, lang)} (${getRarityName(lastCaught.species.rarity, lang)}${
              typeof lastCaught.weightKg === 'number' && lastCaught.weightKg > 0
                ? ` · ${formatFishWeight(lastCaught.weightKg, lang)}`
                : ''
            }${lastXpGain ? ` · +${lastXpGain.amount} XP` : ''})!`
          : t('caught', lang);
      case 'MISSED':
        return t('escaped', lang);
    }
  })();

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}m ${s.toString().padStart(2, '0')}s`;
  };

  const rarityOrder: Rarity[] = [
    'Común',
    'Rara',
    'Épica',
    'Mítica',
    'Legendaria',
    'Secreto',
    'Secreto Abisal',
  ];

  const activeCanvasWormId: WormBaitId | null =
    (phase === 'CASTING' || phase === 'WAITING' || phase === 'BITING') && lastCastWorm
      ? lastCastWorm.id
      : equippedBaitId && ((baitInventory[equippedBaitId] ?? 0) > 0 || activeBaitCharges > 0)
        ? equippedBaitId
        : null;

  return (
    <main className="relative w-screen h-screen overflow-hidden">
      <IceFishingCanvas
        mode={mode}
        world={world}
        lang={lang}
        fishingStateRef={fishingStateRef}
        equippedCosmetics={equippedCosmetics}
        lastCaught={lastCaught}
        pendingCatch={pendingCatch}
        onPhaseChange={handlePhaseChange}
        onCatchPokemon={handleCatchPokemon}
        tutorialStep={tutorialStep}
        isMinigameOpen={Boolean(activeMinigame || failedMinigameCatch)}
        graphicsQuality={graphicsQuality}
        fightTelemetryRef={fightTelemetryRef}
        scene={scene}
        onSceneChange={setScene}
        walkRequest={walkRequest}
        onWalkStateChange={setIsWalkingScene}
        tutorialHighlightedStall={tutorialHighlightedStall}
        activeWormId={activeCanvasWormId}
        onOpenMarketStall={(stall) => {
          if (tutorialStep === 4) return;
          if (stall === 'pvp' && world === 'underworld') return;
          sound.playClick();
          if (stall === 'sell') {
            setMarketSectionTab(world === 'underworld' ? 'sell' : 'all');
            setActivePanel('market');
          } else if (stall === 'rods') {
            setRodsStallTab('rods');
            setMarketStallModal('rods');
          } else if (stall === 'pvp') {
            setMarketStallModal('pvp');
          }
        }}
      />

      {/* Interactive Market Stall Guided Tour (Step 4 inside Market scene) */}
      {mode === 'playing' &&
        tutorialStep === 4 &&
        scene === 'market' &&
        !isWalkingScene &&
        activePanel === 'none' &&
        isMarketTourStallStep(marketTutorialSubStep) &&
        (() => {
          const card = getMarketTourCardContent(marketTutorialSubStep, lang);
          return (
            <div
              data-testid="tutorial-market-tour-card"
              className="fixed bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 z-40 w-[94%] max-w-xl rounded-2xl bg-gradient-to-r from-[#0f172a]/96 via-[#1e293b]/96 to-[#0f172a]/96 border-2 shadow-[0_14px_38px_rgba(2,6,23,0.72)] px-4 sm:px-5 py-3.5 text-white animate-ui-pop pointer-events-auto"
              style={{ borderColor: card.accentColor }}
            >
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0 border"
                    style={{
                      backgroundColor: `${card.accentColor}22`,
                      borderColor: `${card.accentColor}88`,
                    }}
                  >
                    {card.icon}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border"
                        style={{
                          color: card.accentColor,
                          borderColor: `${card.accentColor}66`,
                          backgroundColor: `${card.accentColor}1a`,
                        }}
                      >
                        {lang === 'en'
                          ? `Market Tour ${card.stepIndex}/${card.totalSteps}`
                          : `Tienda ${card.stepIndex} de ${card.totalSteps}`}
                      </span>
                      <h4
                        className="font-display font-extrabold text-sm sm:text-base"
                        style={{ color: card.accentColor }}
                      >
                        {card.title}
                      </h4>
                    </div>
                    <p className="text-xs sm:text-[13px] text-slate-200 mt-1 leading-snug">
                      {card.description}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  data-testid="market-tour-next-btn"
                  onClick={handleAdvanceMarketTour}
                  className="btn-arcade btn-shine shrink-0 px-4 py-2.5 rounded-xl font-display font-extrabold text-xs sm:text-sm border-2 cursor-pointer whitespace-nowrap transition-transform active:scale-95"
                  style={
                    card.isLastStall
                      ? {
                          background: 'linear-gradient(to bottom, #22c55e, #16a34a)',
                          borderColor: '#bbf7d0',
                          color: '#ffffff',
                        }
                      : {
                          background: 'linear-gradient(to bottom, #fde047, #f59e0b)',
                          borderColor: '#fef9c3',
                          color: '#1e1b4b',
                        }
                  }
                >
                  {card.buttonLabel}
                </button>
              </div>
            </div>
          );
        })()}

      {/* Interactive Tutorial Onboarding Banner (5 Mandatory Interactive Steps) */}
      {mode === 'playing' &&
        tutorialStep > 0 &&
        !isWalkingScene &&
        !(tutorialStep === 4 && scene === 'market') &&
        activePanel === 'none' &&
        !activeMinigame &&
        !failedMinigameCatch &&
        luckChestMilestone === null && (
          <div
            data-testid="tutorial-banner"
            className={`fixed left-1/2 -translate-x-1/2 z-40 bg-gradient-to-r from-[#0f172a]/95 via-[#1e293b]/95 to-[#0f172a]/95 border-2 border-[#fbbf24] shadow-[0_12px_35px_rgba(245,158,11,0.48)] px-3.5 sm:px-5 py-2.5 sm:py-3 rounded-2xl flex items-center gap-2.5 sm:gap-3.5 text-white max-w-lg w-[92%] pointer-events-none animate-ui-pop ${
              tutorialStep <= 2 ? 'top-20 sm:top-[4.5rem]' : 'bottom-20 sm:bottom-24 lg:bottom-28'
            }`}
          >
            <div className="relative shrink-0">
              <span className="text-2xl sm:text-3xl block animate-bounce">
                {tutorialStep === 1
                  ? '🎣'
                  : tutorialStep === 2
                    ? '🐟'
                    : tutorialStep === 3
                      ? '📖'
                      : tutorialStep === 4
                        ? '🏪'
                        : '🧭'}
              </span>
              <Sparkles className="w-4 h-4 text-[#fde047] absolute -top-1.5 -right-2 animate-tutorial-sparkle" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <h4 className="font-display font-extrabold text-sm text-[#fde047] flex items-center gap-1.5">
                  <span>
                    {tutorialStep === 1
                      ? t('tutorialStep1', lang)
                      : tutorialStep === 2
                        ? phase === 'BITING'
                          ? t('bitingRiver', lang)
                          : t('tutorialStep2', lang)
                        : tutorialStep === 3
                          ? t('tutorialStep3', lang)
                          : tutorialStep === 4
                            ? t('tutorialStep4', lang)
                            : t('tutorialStep5', lang)}
                  </span>
                </h4>
                <span className="text-[10px] bg-[#f59e0b]/30 border border-[#fbbf24]/50 px-2 py-0.5 rounded-full font-extrabold text-[#fef08a] shrink-0">
                  {lang === 'en' ? `Step ${tutorialStep} of 5` : `Paso ${tutorialStep} de 5`}
                </span>
              </div>
              <p className="text-xs text-slate-200 mt-0.5 leading-snug">
                {tutorialStep === 1
                  ? t('tutorialDesc1', lang)
                  : tutorialStep === 2
                    ? phase === 'BITING'
                      ? t('tutorialDesc2', lang)
                      : lang === 'en'
                        ? 'Wait at the river until «!» appears and tap the hook button to reel in.'
                        : 'Espera en el río a que aparezca «¡!» y pulsa el botón del anzuelo para recoger.'
                    : tutorialStep === 3
                      ? t('tutorialDesc3', lang)
                      : tutorialStep === 4
                        ? t('tutorialDesc4', lang)
                        : t('tutorialDesc5', lang)}
              </p>
            </div>
            <Sparkles className="w-5 h-5 text-[#facc15] shrink-0 animate-tutorial-sparkle" />
          </div>
        )}

      {/* TITLE SCREEN (Infinite Catch Cover Art) */}
      {mode === 'title' && (
        <div className="fixed inset-0 z-10 flex flex-col items-center justify-end pb-3 sm:pb-8 pt-14 sm:pt-16 px-4 sm:px-6 bg-[#071426] overflow-hidden">
          <img
            src="./assets/aistudio/Pesca_infinita_en_el_hielo_44c07a7f.webp"
            alt="Infinite Catch"
            referrerPolicy="no-referrer"
            className="absolute inset-0 w-full h-full object-cover object-[center_28%] select-none pointer-events-none"
          />
          {/* Subtle top & bottom gradient scrims for crisp UI contrast without hiding the cover logo or jumping fish */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-[#040e21]/50 to-transparent"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 bottom-0 h-[44%] min-h-[250px] bg-gradient-to-t from-[#040e21]/92 via-[#071836]/68 to-transparent"
          />

          <div
            data-testid="title-language-switcher"
            role="group"
            aria-label={lang === 'en' ? 'Select language' : 'Seleccionar idioma'}
            className="absolute top-3 right-3 sm:top-4 sm:right-4 z-20 inline-flex items-center gap-1 p-1 rounded-2xl bg-[#0b1f3a]/85 backdrop-blur-md border border-white/25 shadow-[0_8px_24px_rgba(4,14,33,0.5)]"
          >
            <span className="pl-2 pr-1 text-[#7dd3fc] flex items-center" aria-hidden="true">
              <Globe className="w-4 h-4" />
            </span>
            <button
              type="button"
              data-testid="title-lang-en"
              onClick={() => setLanguage('en')}
              aria-pressed={lang === 'en'}
              className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl font-display font-extrabold text-xs tracking-wide transition-all cursor-pointer ${
                lang === 'en'
                  ? 'bg-gradient-to-b from-[#38bdf8] to-[#0284c7] text-white shadow-sm ring-1 ring-white/50'
                  : 'text-slate-200 hover:text-white hover:bg-white/10'
              }`}
            >
              EN
            </button>
            <button
              type="button"
              data-testid="title-lang-es"
              onClick={() => setLanguage('es')}
              aria-pressed={lang === 'es'}
              className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl font-display font-extrabold text-xs tracking-wide transition-all cursor-pointer ${
                lang === 'es'
                  ? 'bg-gradient-to-b from-[#38bdf8] to-[#0284c7] text-white shadow-sm ring-1 ring-white/50'
                  : 'text-slate-200 hover:text-white hover:bg-white/10'
              }`}
            >
              ES
            </button>
          </div>

          <div className="relative z-10 w-full max-w-md flex flex-col items-center gap-2 sm:gap-3">
            <button
              type="button"
              data-start="true"
              onClick={startGame}
              className="btn-arcade btn-shine px-10 sm:px-16 py-3 sm:py-4 rounded-2xl bg-gradient-to-b from-[#fbbf24] via-[#f59e0b] to-[#d97706] hover:from-[#fcd34d] hover:to-[#b45309] text-[#1e1b4b] font-display font-extrabold text-lg sm:text-2xl tracking-wider shadow-[0_10px_28px_rgba(245,158,11,0.55),inset_0_2px_0_rgba(255,255,255,0.65)] border-2 border-[#fef08a] border-b-[5px] border-b-[#92400e] active:border-b-2 cursor-pointer"
            >
              {t('play', lang)}
            </button>

            <div className="w-full flex flex-col items-center gap-2">
              {firebaseUser ? (
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <div
                    data-testid="google-login-btn"
                    className="px-3.5 py-2 rounded-xl bg-[#0b1f3a]/85 backdrop-blur-md text-white font-semibold text-xs sm:text-sm shadow-lg border border-white/25 flex items-center gap-2 max-w-full"
                  >
                    <span className="w-2.5 h-2.5 rounded-full bg-[#22c55e] ring-2 ring-[#22c55e]/30 shrink-0" />
                    <span className="truncate max-w-[210px] sm:max-w-[260px]">
                      {firebaseUser.email ||
                        firebaseUser.displayName ||
                        (lang === 'en' ? 'Google Account' : 'Cuenta Google')}{' '}
                      · {t('cloudActive', lang)}
                    </span>
                  </div>
                  <button
                    type="button"
                    disabled={authLoading}
                    onClick={handleGoogleSignOut}
                    className="btn-arcade px-3.5 py-2 rounded-xl bg-white/95 hover:bg-white text-[#b91c1c] font-bold text-xs shadow-md border border-[#fecaca] cursor-pointer shrink-0"
                  >
                    {t('signOut', lang)}
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  data-testid="google-login-btn"
                  disabled={authLoading}
                  onClick={handleGoogleSignIn}
                  className="btn-arcade px-5 py-2 rounded-xl bg-white/95 hover:bg-white text-[#0f172a] font-semibold text-xs sm:text-sm shadow-[0_6px_18px_rgba(4,14,33,0.45)] border border-white/80 flex items-center gap-2.5 cursor-pointer disabled:opacity-70"
                >
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                    <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z" />
                    <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24Z" />
                    <path fill="#FBBC05" d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14Z" />
                    <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96Z" />
                  </svg>
                  <span>
                    {authLoading
                      ? t('connectingGoogle', lang)
                      : t('loginGoogle', lang)}
                  </span>
                </button>
              )}
              {authError && (
                <p className="text-xs font-bold text-[#fecaca] bg-[#7f1d1d]/95 px-3 py-1.5 rounded-lg border border-[#ef4444] text-center shadow-md">
                  {authError}
                </p>
              )}
            </div>

            <p className="mt-0.5 px-3.5 py-1 rounded-full bg-[#040e21]/55 backdrop-blur-xs border border-white/15 text-xs sm:text-sm font-semibold text-sky-50/95 tracking-wide text-center leading-snug shadow-sm">
              {t('pressHookToFish', lang)}
            </p>
          </div>
        </div>
      )}

      {/* PLAYING HUD */}
      {mode === 'playing' && (
        <div className="fixed inset-0 pointer-events-none flex flex-col justify-between p-1.5 sm:p-2.5 lg:p-3.5 pl-[max(0.375rem,env(safe-area-inset-left))] pr-[max(0.375rem,env(safe-area-inset-right))] pt-[max(0.375rem,env(safe-area-inset-top))] pb-[max(0.375rem,env(safe-area-inset-bottom))]">
          {/* Top Bar: Compact Left Counters & Right Navigation */}
          <div className="flex items-start justify-between gap-1.5 sm:gap-2 flex-wrap xl:flex-nowrap w-full">
             {/* Left Counters: Catches, Coins, Backpack, Level/XP (plus active Boosts) */}
            <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap min-w-0 max-w-full">
              <div
                data-testid="fish-counter"
                title={t('captures', lang)}
                className="h-7 sm:h-8 lg:h-9 flex items-center gap-1 sm:gap-1.5 px-1.5 sm:px-2 lg:px-2.5 rounded-lg lg:rounded-xl bg-gradient-to-b from-white to-[#f1f5f9] border border-[#cbd5e1] shadow-[0_3px_8px_rgba(15,41,66,0.16)] whitespace-nowrap shrink-0"
              >
                <span className="lg:hidden text-[11px] leading-none" aria-hidden="true">
                  🐟
                </span>
                <span className="hidden lg:inline text-[10px] font-bold uppercase tracking-wider text-[#475569]">
                  {t('captures', lang)}
                </span>
                <span className="text-[11px] sm:text-xs lg:text-sm font-display font-extrabold text-[#0f2942] tabular-nums">
                  {fishCount}
                </span>
              </div>

              <div
                data-testid="coins-counter"
                className="h-7 sm:h-8 lg:h-9 flex items-center gap-1 px-1.5 sm:px-2 lg:px-2.5 rounded-lg lg:rounded-xl bg-gradient-to-b from-[#fefce8] to-[#fef3c7] border border-[#fcd34d] shadow-[0_3px_8px_rgba(217,119,6,0.18)] whitespace-nowrap shrink-0"
              >
                <CoinIcon size={13} />
                <span className="text-[11px] sm:text-xs lg:text-sm font-display font-extrabold text-[#92400e] tabular-nums">
                  {coins}
                </span>
              </div>

              <div
                data-testid="backpack-counter"
                title={t('backpack', lang)}
                className={`h-7 sm:h-8 lg:h-9 flex items-center gap-1 px-1.5 sm:px-2 lg:px-2.5 rounded-lg lg:rounded-xl border shadow-[0_3px_8px_rgba(15,41,66,0.16)] whitespace-nowrap shrink-0 ${
                  inventory.length >= backpackCapacity
                    ? 'bg-gradient-to-b from-[#fef2f2] to-[#fee2e2] border-[#ef4444]'
                    : 'bg-gradient-to-b from-white to-[#f1f5f9] border-[#cbd5e1]'
                }`}
              >
                <span className="lg:hidden text-[11px] leading-none" aria-hidden="true">
                  🎒
                </span>
                <span className="hidden lg:inline text-[10px] font-bold uppercase tracking-wider text-[#475569]">
                  {t('backpack', lang)}
                </span>
                <span
                  className={`text-[11px] sm:text-xs lg:text-sm font-display font-extrabold tabular-nums ${
                    inventory.length >= backpackCapacity
                      ? 'text-[#dc2626]'
                      : 'text-[#0f2942]'
                  }`}
                >
                  {inventory.length}/{backpackCapacity}
                </span>
              </div>

              {/* Exterior Level & XP Crest Button — Click/Tap opens Reward Road */}
              <div className="relative shrink-0">
                {levelUpGlowActive && (
                  <>
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute -inset-1.5 rounded-2xl bg-gradient-to-r from-[#fef08a] via-[#f59e0b] to-[#fde047] opacity-85 blur-md animate-pulse"
                    />
                    <div
                      data-testid="level-xp-square-burst"
                      className="pointer-events-none absolute left-1/2 -translate-x-1/2 top-full mt-1 z-30 px-2 py-0.5 rounded-md bg-gradient-to-r from-[#fef08a] via-[#facc15] to-[#f59e0b] border border-white text-[#451a03] font-display font-extrabold text-[8px] sm:text-[9px] uppercase tracking-wider shadow-[0_4px_14px_rgba(250,204,21,0.9)] whitespace-nowrap flex items-center gap-1 animate-levelup-burst-badge"
                    >
                      <Sparkles className="w-2.5 h-2.5 text-[#78350f] shrink-0" />
                      <span>
                        {lang === 'en'
                          ? `LEVEL ${levelProgress.level} UP!`
                          : `¡SUBIDA NV. ${levelProgress.level}!`}
                      </span>
                      <Sparkles className="w-2.5 h-2.5 text-[#78350f] shrink-0" />
                    </div>
                  </>
                )}

                <button
                  type="button"
                  data-testid="level-xp-hud"
                  data-levelup-glow={levelUpGlowActive ? 'true' : 'false'}
                  onClick={() => {
                    sound.playClick();
                    setRewardRoadBanner('');
                    setLevelUpAlert(null);
                    setActivePanel((p) => (p === 'rewards' ? 'none' : 'rewards'));
                  }}
                  title={
                    lang === 'en'
                      ? `Level ${levelProgress.level} · ${formatNumber(levelProgress.currentLevelXp, lang)}/${formatNumber(levelProgress.xpForNextLevel, lang)} XP — Click to open Reward Road`
                      : `Nivel ${levelProgress.level} · ${formatNumber(levelProgress.currentLevelXp, lang)}/${formatNumber(levelProgress.xpForNextLevel, lang)} XP — Pulsa para abrir el Camino de Recompensas`
                  }
                  className={`group relative overflow-hidden pointer-events-auto h-7 sm:h-8 lg:h-9 flex items-center gap-1 sm:gap-1.5 pl-1 pr-1.5 sm:pr-2 lg:pr-2.5 rounded-lg lg:rounded-xl border whitespace-nowrap transition-all ${
                    levelUpGlowActive
                      ? 'cursor-pointer bg-gradient-to-r from-[#fef08a] via-[#facc15] to-[#f59e0b] hover:brightness-105 active:scale-95 border-2 border-white ring-2 sm:ring-4 ring-[#fde047] text-[#1e1b4b] animate-levelup-gold-glow'
                      : activePanel === 'rewards'
                        ? 'cursor-pointer bg-gradient-to-r from-[#312e81] via-[#4338ca] to-[#312e81] border-[#fde047] text-white shadow-[0_0_14px_rgba(250,204,21,0.45)] scale-[1.02]'
                        : 'cursor-pointer bg-gradient-to-r from-[#1e1b4b]/95 via-[#312e81]/95 to-[#1e1b4b]/95 hover:from-[#312e81] hover:to-[#3730a3] active:scale-95 border-[#818cf8] text-white shadow-[0_3px_10px_rgba(49,46,129,0.35)]'
                  }`}
                >
                  {levelUpGlowActive && (
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-y-0 left-0 w-12 bg-gradient-to-r from-transparent via-white/95 to-transparent animate-levelup-shimmer"
                    />
                  )}
                  {/* Level Medallion Crest */}
                  <span
                    data-testid="player-level-badge"
                    className={`relative z-10 h-5 sm:h-6 px-1 sm:px-1.5 rounded-md border inline-flex items-center gap-0.5 text-[10px] sm:text-[11px] lg:text-xs font-display font-extrabold tabular-nums shrink-0 ${
                      levelUpGlowActive
                        ? 'bg-gradient-to-b from-[#78350f] via-[#451a03] to-[#1e1b4b] border-[#fef9c3] text-[#fde047] shadow-[0_0_10px_rgba(254,240,138,0.85)]'
                        : 'bg-gradient-to-b from-[#fde047] via-[#f59e0b] to-[#d97706] border-[#fef9c3] text-[#1e1b4b] shadow-[inset_0_1px_0_rgba(255,255,255,0.65)]'
                    }`}
                  >
                    <Star
                      className={`w-2.5 h-2.5 sm:w-3 sm:h-3 shrink-0 ${
                        levelUpGlowActive
                          ? 'text-[#fde047] fill-[#fde047] animate-spin'
                          : 'text-[#78350f] fill-[#78350f]'
                      }`}
                    />
                    <span>
                      {lang === 'en' ? `LV ${levelProgress.level}` : `NV ${levelProgress.level}`}
                    </span>
                  </span>

                  {/* Glowing XP Progress Bar & Counter */}
                  <div className="relative z-10 flex flex-col gap-0.5 min-w-[42px] sm:min-w-[54px] lg:min-w-[68px] text-left">
                    <div
                      className={`w-full h-1.5 rounded-full border p-[1px] overflow-hidden shadow-inner ${
                        levelUpGlowActive
                          ? 'bg-[#451a03]/65 border-[#fef9c3]'
                          : 'bg-[#090d16]/85 border-white/20'
                      }`}
                    >
                      <div
                        data-testid="level-xp-bar-fill"
                        className={`h-full w-full origin-left rounded-full transition-transform duration-300 ease-out ${
                          levelUpGlowActive
                            ? 'bg-gradient-to-r from-[#ffffff] via-[#fef08a] to-[#fde047]'
                            : 'bg-gradient-to-r from-[#38bdf8] via-[#818cf8] to-[#fde047]'
                        }`}
                        style={{
                          transform: `scaleX(${levelProgress.progressRatio.toFixed(4)})`,
                        }}
                      />
                    </div>
                    <div className="flex items-center justify-between gap-1">
                      <span
                        data-testid="level-xp-text"
                        className={`text-[8px] sm:text-[9px] lg:text-[10px] leading-none font-extrabold tabular-nums ${
                          levelUpGlowActive ? 'text-[#451a03]' : 'text-[#e0e7ff]'
                        }`}
                      >
                        {formatNumber(levelProgress.currentLevelXp, lang)}/
                        {formatNumber(levelProgress.xpForNextLevel, lang)}
                        <span className="hidden sm:inline"> XP</span>
                      </span>
                      <Trophy
                        className={`w-2.5 h-2.5 shrink-0 group-hover:scale-110 transition-transform ${
                          levelUpGlowActive ? 'text-[#78350f]' : 'text-[#fde047] opacity-90'
                        }`}
                      />
                    </div>
                  </div>

                  {unclaimedLevelRewardsCount > 0 && (
                    <span
                      data-testid="level-reward-unclaimed-badge"
                      className="relative z-10 ml-0.5 px-1 py-0.5 rounded bg-gradient-to-b from-[#4ade80] to-[#16a34a] border border-[#bbf7d0] text-[#052e16] font-display font-extrabold text-[8px] sm:text-[9px] leading-none tabular-nums shadow-sm animate-pulse"
                    >
                      !{unclaimedLevelRewardsCount}
                    </span>
                  )}
                </button>

                {lastXpGain && !levelUpGlowActive && (
                  <div
                    key={lastXpGain.key}
                    data-testid="xp-gain-toast"
                    className="pointer-events-none absolute left-1 top-full mt-1 z-30 px-2 py-0.5 rounded-lg bg-[#312e81]/95 border border-[#fde047] text-[#fef08a] font-display font-extrabold text-[9px] sm:text-[10px] tabular-nums shadow-md whitespace-nowrap animate-ui-pop"
                  >
                    +{formatNumber(lastXpGain.amount, lang)} XP
                  </div>
                )}
              </div>

              {(luckSecondsLeft > 0 || totalEffectiveHudLuck > 1) && (
                <button
                  type="button"
                  data-testid="luck-boost-badge"
                  data-total-luck={totalEffectiveHudLuck}
                  onClick={() => {
                    if (isCurrentUserAdmin) {
                      sound.playClick();
                      setShowAdminCommandModal(true);
                    }
                  }}
                  title={
                    isCurrentUserAdmin
                      ? lang === 'en'
                        ? `🍀 Total Luck x${totalEffectiveHudLuck} active. Click to open Admin console.`
                        : `🍀 Suerte Total x${totalEffectiveHudLuck} activa. Haz clic para abrir consola de Admin.`
                      : lang === 'en'
                        ? `🍀 Total Luck x${totalEffectiveHudLuck} active (all luck sources multiplied)`
                        : `🍀 Suerte Total x${totalEffectiveHudLuck} activa (todas las fuentes multiplicadas)`
                  }
                  className={`pointer-events-auto h-7 sm:h-8 lg:h-9 flex items-center gap-1 px-1.5 sm:px-2 rounded-lg lg:rounded-xl bg-gradient-to-b from-[#dcfce7] to-[#bbf7d0] border border-[#22c55e] shadow-[0_3px_8px_rgba(34,197,94,0.22)] whitespace-nowrap text-left shrink-0 ${
                    isCurrentUserAdmin
                      ? 'cursor-pointer hover:brightness-105 active:scale-95 transition-transform'
                      : 'cursor-default'
                  }`}
                >
                  <span className="text-[11px] sm:text-xs leading-none">🍀</span>
                  <span className="text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider text-[#166534] tabular-nums">
                    x{totalEffectiveHudLuck}
                  </span>
                  {luckSecondsLeft > 0 && (
                    <span className="text-[10px] sm:text-xs font-display font-extrabold text-[#14532d] tabular-nums">
                      {formatLuckTimeRemaining(luckSecondsLeft)}
                    </span>
                  )}
                </button>
              )}

              {/* Active Equipped Worm Bait HUD Badge */}
              {equippedBaitId &&
                ((baitInventory[equippedBaitId] ?? 0) > 0 || activeBaitCharges > 0) &&
                (() => {
                  const activeWorm = getWormBaitById(equippedBaitId);
                  const totalUnits = baitInventory[equippedBaitId] ?? 0;
                  const remainingCasts =
                    activeBaitCharges > 0
                      ? activeBaitCharges
                      : totalUnits * activeWorm.castsPerUnit;
                  return (
                    <button
                      type="button"
                      data-testid="active-worm-hud-badge"
                      onClick={() => {
                        sound.playClick();
                        setRodsStallTab('baits');
                        setMarketStallModal('rods');
                      }}
                      title={
                        lang === 'en'
                          ? `${activeWorm.nameEn} equipped (${remainingCasts} casts left)`
                          : `${activeWorm.nameEs} equipado (${remainingCasts} tiradas restantes)`
                      }
                      className="pointer-events-auto h-7 sm:h-8 lg:h-9 flex items-center gap-1 px-1.5 sm:px-2 rounded-lg lg:rounded-xl bg-gradient-to-b from-[#fef3c7] to-[#fde68a] border border-[#f59e0b] shadow-[0_3px_8px_rgba(245,158,11,0.2)] whitespace-nowrap cursor-pointer hover:brightness-105 active:scale-95 transition-transform shrink-0 max-w-[118px] sm:max-w-[144px] lg:max-w-none"
                    >
                      <WormBaitIllustrationSvg baitId={equippedBaitId} size={18} />
                      <div className="flex flex-col text-left leading-none gap-0.5 min-w-0">
                        <span className="text-[8px] sm:text-[9px] font-display font-extrabold text-[#78350f] truncate">
                          {lang === 'en' ? activeWorm.nameEn : activeWorm.nameEs}
                        </span>
                        <span className="text-[8px] font-extrabold text-[#b45309] tabular-nums">
                          {activeWorm.luckMultiplier}x · {remainingCasts}{' '}
                          {lang === 'en' ? 'casts' : 'tir.'}
                        </span>
                      </div>
                    </button>
                  );
                })()}
            </div>

            {/* Right Controls: Map Button & Modal, Navigation & Pause (Audio inside Pause) */}
            <div className="flex items-center justify-end gap-1 sm:gap-1.5 gap-y-1.5 pointer-events-auto flex-wrap lg:flex-nowrap ml-auto max-w-full relative z-20">
              <WorldSwitcher
                world={world}
                underworldUnlocked={underworldUnlocked}
                isWalkingScene={isWalkingScene}
                isTransitioningWorld={isTransitioningWorld}
                tutorialStep={tutorialStep}
                lang={lang}
                playerLevel={levelProgress.level}
                playerCoins={coins}
                onTravelToWorld={travelToWorld}
                onPlayClick={() => sound.playClick()}
                onOpenUnlockModal={() => {
                  sound.playClick();
                  setShowDevilModal(true);
                }}
              />

              <div className="relative shrink-0">
                <button
                  type="button"
                  data-testid="open-index-btn"
                  disabled={tutorialStep > 0 && tutorialStep !== 3}
                  title={
                    world === 'underworld'
                      ? lang === 'en'
                        ? 'Underworld Fishing Index'
                        : 'Índice del Inframundo'
                      : lang === 'en'
                        ? 'Fishing Index'
                        : 'Índice de Pesca'
                  }
                  onClick={(e) => {
                    e.currentTarget.blur();
                    if (tutorialStep > 0 && tutorialStep !== 3) return;
                    sound.playClick();
                    setIndexTab(world);
                    setActivePanel((p) => (p === 'index' ? 'none' : 'index'));
                  }}
                  className={`btn-arcade btn-shine h-7 sm:h-8 lg:h-9 px-1.5 sm:px-2 lg:px-2.5 flex items-center gap-1 rounded-lg lg:rounded-xl font-display font-extrabold text-[10px] sm:text-[11px] lg:text-xs border border-white shadow-[0_3px_10px_rgba(15,41,66,0.25)] text-white whitespace-nowrap shrink-0 ${
                    world === 'underworld'
                      ? 'bg-gradient-to-b from-[#f87171] via-[#dc2626] to-[#991b1b]'
                      : 'bg-gradient-to-b from-[#34d399] via-[#10b981] to-[#059669]'
                  } ${
                    tutorialStep === 3 && activePanel === 'none'
                      ? 'animate-tutorial-glow ring-4 ring-yellow-300/90 cursor-pointer'
                      : tutorialStep > 0 && tutorialStep !== 3
                        ? 'opacity-50 cursor-not-allowed'
                        : 'cursor-pointer'
                  }`}
                >
                  <BookOpen className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
                  <span>{t('index', lang)}</span>
                </button>
                {tutorialStep === 3 && activePanel === 'none' && (
                  <div className="pointer-events-none absolute top-full left-1/2 -translate-x-1/2 mt-2 flex flex-col items-center z-50 animate-tutorial-arrow-up">
                    <div className="flex items-center gap-1 text-[#fde047] drop-shadow-[0_2px_6px_rgba(0,0,0,0.85)]">
                      <Sparkles className="w-3.5 h-3.5 animate-tutorial-sparkle" />
                      <ArrowUp className="w-6 h-6 stroke-[3]" />
                      <Sparkles className="w-3.5 h-3.5 animate-tutorial-sparkle" />
                    </div>
                    <span className="mt-0.5 px-2.5 py-1 rounded-lg bg-gradient-to-r from-[#fef08a] to-[#facc15] text-[#1e1b4b] font-display font-extrabold text-[11px] border border-white shadow-lg whitespace-nowrap">
                      {t('openIndexPrompt', lang)}
                    </span>
                  </div>
                )}
              </div>

              <div className="relative shrink-0">
                <button
                  type="button"
                  data-testid="open-market-btn"
                  disabled={
                    (tutorialStep > 0 && tutorialStep !== 4) ||
                    isWalkingScene ||
                    (tutorialStep === 4 &&
                      scene === 'market' &&
                      marketTutorialSubStep !== 'pvp' &&
                      marketTutorialSubStep !== 'returning')
                  }
                  onClick={(e) => {
                    e.currentTarget.blur();
                    if ((tutorialStep > 0 && tutorialStep !== 4) || isWalkingScene) return;
                    if (
                      tutorialStep === 4 &&
                      scene === 'market' &&
                      marketTutorialSubStep !== 'pvp' &&
                      marketTutorialSubStep !== 'returning'
                    ) {
                      return;
                    }
                    sound.playClick();
                    setActivePanel('none');
                    setMarketStallModal('none');
                    if (scene === 'dock') {
                      if (tutorialStep === 4) {
                        setMarketTutorialSubStep('go_to_market');
                      }
                      setWalkRequest({ id: Date.now(), target: 'market' });
                    } else {
                      if (tutorialStep === 4) {
                        setMarketTutorialSubStep('returning');
                      }
                      setWalkRequest({ id: Date.now(), target: 'dock' });
                    }
                  }}
                  className={`btn-arcade btn-shine h-7 sm:h-8 lg:h-9 px-1.5 sm:px-2 lg:px-2.5 flex items-center gap-1 rounded-lg lg:rounded-xl ${
                    scene === 'market'
                      ? 'bg-gradient-to-b from-[#f59e0b] via-[#d97706] to-[#b45309] text-[#1e1b4b] border-[#fef08a] shadow-[0_3px_10px_rgba(245,158,11,0.42)]'
                      : 'bg-gradient-to-b from-[#38bdf8] via-[#0284c7] to-[#0369a1] text-white border-white shadow-[0_3px_10px_rgba(2,132,199,0.38)]'
                  } font-display font-extrabold text-[10px] sm:text-[11px] lg:text-xs border whitespace-nowrap shrink-0 ${
                    tutorialStep === 4 &&
                    activePanel === 'none' &&
                    !isWalkingScene &&
                    (scene === 'dock' || marketTutorialSubStep === 'pvp')
                      ? 'animate-tutorial-glow ring-4 ring-yellow-300/90 cursor-pointer'
                      : (tutorialStep > 0 && tutorialStep !== 4) ||
                          isWalkingScene ||
                          (tutorialStep === 4 &&
                            scene === 'market' &&
                            marketTutorialSubStep !== 'pvp' &&
                            marketTutorialSubStep !== 'returning')
                        ? 'opacity-60 cursor-not-allowed'
                        : 'cursor-pointer'
                  }`}
                >
                  <Store className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
                  <span>
                    {isWalkingScene
                      ? lang === 'en'
                        ? 'Walking...'
                        : 'Andando...'
                      : scene === 'market'
                        ? world === 'underworld'
                          ? lang === 'en'
                            ? 'Fish →'
                            : 'Pescar →'
                          : lang === 'en'
                            ? 'Dock →'
                            : 'Muelle →'
                        : `${t('market', lang)} (${inventory.length})`}
                  </span>
                </button>
                {tutorialStep === 4 &&
                  scene === 'dock' &&
                  !isWalkingScene &&
                  activePanel === 'none' && (
                    <div className="pointer-events-none absolute top-full left-1/2 -translate-x-1/2 mt-2 flex flex-col items-center z-50 animate-tutorial-arrow-up">
                      <div className="flex items-center gap-1 text-[#fde047] drop-shadow-[0_2px_6px_rgba(0,0,0,0.85)]">
                        <Sparkles className="w-3.5 h-3.5 animate-tutorial-sparkle" />
                        <ArrowUp className="w-6 h-6 stroke-[3]" />
                        <Sparkles className="w-3.5 h-3.5 animate-tutorial-sparkle" />
                      </div>
                      <span className="mt-0.5 px-2.5 py-1 rounded-lg bg-gradient-to-r from-[#fef08a] to-[#facc15] text-[#1e1b4b] font-display font-extrabold text-[11px] border border-white shadow-lg whitespace-nowrap">
                        {t('openMarketPrompt', lang)}
                      </span>
                    </div>
                  )}
              </div>

              {(() => {
                const currentDaily = ensureDailyQuestsCurrent(dailyQuests);
                const claimableCount = currentDaily.quests.filter(
                  (q) => q.progress >= q.target && !q.claimed
                ).length;
                return (
                  <div className="relative shrink-0">
                    <button
                      type="button"
                      data-testid="open-profile-btn"
                      disabled={tutorialStep > 0 && tutorialStep !== 5}
                      onClick={(e) => {
                        e.currentTarget.blur();
                        if (tutorialStep > 0 && tutorialStep !== 5) return;
                        sound.playClick();
                        setActivePanel((p) => (p === 'profile' ? 'none' : 'profile'));
                      }}
                      className={`btn-arcade btn-shine relative h-7 sm:h-8 lg:h-9 px-1.5 sm:px-2 lg:px-2.5 flex items-center gap-1 rounded-lg lg:rounded-xl bg-gradient-to-b from-[#64748b] via-[#475569] to-[#334155] text-white font-display font-extrabold text-[10px] sm:text-[11px] lg:text-xs border border-white shadow-[0_3px_10px_rgba(30,41,59,0.38)] whitespace-nowrap shrink-0 ${
                        tutorialStep === 5 && activePanel === 'none'
                          ? 'animate-tutorial-glow ring-4 ring-yellow-300/90 cursor-pointer'
                          : tutorialStep > 0 && tutorialStep !== 5
                            ? 'opacity-50 cursor-not-allowed'
                            : 'cursor-pointer'
                      }`}
                    >
                      <span className="text-xs sm:text-sm leading-none flex items-center">
                        {renderAvatar(avatar, 15)}
                      </span>
                      <span>{t('menu', lang)}</span>
                      {claimableCount > 0 && tutorialStep === 0 && (
                        <span
                          data-testid="menu-quests-claimable-badge"
                          className="ml-0.5 px-1 py-0.5 rounded bg-[#dc2626] text-white text-[8px] sm:text-[9px] font-black leading-none border border-white animate-pulse"
                        >
                          {claimableCount}
                        </span>
                      )}
                    </button>
                    {tutorialStep === 5 && activePanel === 'none' && (
                      <div className="pointer-events-none absolute top-full right-0 mt-2 flex flex-col items-end z-50 animate-tutorial-arrow-up">
                        <div className="flex items-center gap-1 pr-3 text-[#fde047] drop-shadow-[0_2px_6px_rgba(0,0,0,0.85)]">
                          <Sparkles className="w-3.5 h-3.5 animate-tutorial-sparkle" />
                          <ArrowUp className="w-6 h-6 stroke-[3]" />
                          <Sparkles className="w-3.5 h-3.5 animate-tutorial-sparkle" />
                        </div>
                        <span className="mt-0.5 px-2.5 py-1 rounded-lg bg-gradient-to-r from-[#fef08a] to-[#facc15] text-[#1e1b4b] font-display font-extrabold text-[11px] border border-white shadow-lg whitespace-nowrap">
                          {t('openMenuPrompt', lang)}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })()}

              <button
                type="button"
                data-testid="pause-btn"
                tabIndex={-1}
                onClick={(e) => {
                  e.currentTarget.blur();
                  sound.playClick();
                  setMode('paused');
                }}
                aria-label={lang === 'en' ? 'Pause and audio settings' : 'Pausa y audio'}
                title={lang === 'en' ? 'Pause · Music & Sound' : 'Pausa · Música y Sonido'}
                className="btn-arcade w-7 h-7 sm:w-8 sm:h-8 lg:w-9 lg:h-9 flex items-center justify-center rounded-lg lg:rounded-xl bg-gradient-to-b from-white to-[#e2e8f0] hover:to-[#cbd5e1] border border-[#cbd5e1] text-[#1e3a5f] shadow-md cursor-pointer shrink-0"
              >
                <Pause className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
              </button>
            </div>
          </div>

          {/* Bottom Action Button (only on the Dock while not walking) */}
          {scene === 'dock' && !isWalkingScene ? (
          <div className="flex flex-col items-center gap-1.5 sm:gap-2 mb-1 sm:mb-2">
            <div className="relative flex flex-col items-center">
              {((tutorialStep === 1 && phase === 'IDLE') ||
                (tutorialStep === 2 &&
                  (phase === 'BITING' || phase === 'IDLE' || phase === 'MISSED'))) &&
                activePanel === 'none' &&
                !activeMinigame &&
                !failedMinigameCatch && (
                  <div className="pointer-events-none absolute bottom-full mb-2 sm:mb-3 flex flex-col items-center z-40 animate-tutorial-arrow-down">
                    <span className="px-3 sm:px-3.5 py-1 sm:py-1.5 rounded-xl bg-gradient-to-r from-[#fef08a] to-[#facc15] text-[#1e1b4b] font-display font-extrabold text-[11px] sm:text-sm border-2 border-white shadow-[0_6px_20px_rgba(250,204,21,0.85)] whitespace-nowrap flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#b45309] animate-tutorial-sparkle" />
                      <span>
                        {tutorialStep === 1
                          ? t('tapToCastPrompt', lang)
                          : phase === 'BITING'
                            ? t('tapToReelPrompt', lang)
                            : t('tapToCastAgainPrompt', lang)}
                      </span>
                      <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#b45309] animate-tutorial-sparkle" />
                    </span>
                    <ArrowDown className="w-6 h-6 sm:w-7 sm:h-7 text-[#fde047] stroke-[3] mt-1 drop-shadow-[0_2px_6px_rgba(0,0,0,0.85)]" />
                  </div>
                )}

              <button
                type="button"
                data-testid="fish-action-btn"
                onClick={(e) => {
                  e.currentTarget.blur();
                  handleAction();
                }}
                disabled={phase === 'CASTING' || tutorialStep >= 3}
                className={`btn-arcade btn-shine pointer-events-auto inline-flex items-center justify-center gap-2 sm:gap-2.5 px-5 py-2.5 sm:px-7 sm:py-3 lg:px-8 lg:py-4 rounded-xl sm:rounded-2xl font-display font-extrabold text-sm sm:text-base lg:text-lg tracking-wide border-2 border-b-[4px] sm:border-b-[5px] active:border-b-2 whitespace-nowrap ${
                  tutorialStep >= 3 || phase === 'CASTING'
                    ? 'opacity-45 cursor-not-allowed'
                    : 'cursor-pointer'
                } ${
                  phase === 'BITING'
                    ? 'animate-pulse ring-4 ring-yellow-300/80 shadow-[0_0_32px_rgba(253,224,71,0.85)]'
                    : ''
                } ${
                  ((tutorialStep === 1 && phase === 'IDLE') ||
                    (tutorialStep === 2 &&
                      (phase === 'BITING' || phase === 'IDLE' || phase === 'MISSED'))) &&
                  activePanel === 'none'
                    ? 'animate-tutorial-glow ring-4 ring-yellow-300/90'
                    : ''
                } ${
                  phase === 'BITING'
                    ? pendingCatch?.species.rarity === 'Épica'
                      ? 'bg-gradient-to-b from-[#c084fc] to-[#7e22ce] border-[#f3e8ff] text-white shadow-[0_0_24px_rgba(168,85,247,0.75)] scale-105'
                      : pendingCatch?.species.rarity === 'Mítica'
                        ? 'bg-gradient-to-b from-[#f87171] to-[#dc2626] border-[#fee2e2] text-white shadow-[0_0_24px_rgba(239,68,68,0.75)] scale-105'
                        : pendingCatch?.species.rarity === 'Legendaria'
                          ? 'bg-gradient-to-b from-[#fde047] to-[#ca8a04] border-[#fef9c3] text-[#1e1b4b] shadow-[0_0_26px_rgba(234,179,8,0.85)] scale-105'
                          : pendingCatch?.species.rarity === 'Secreto'
                            ? 'bg-gradient-to-b from-[#334155] to-[#0f172a] border-[#94a3b8] text-white shadow-[0_0_24px_rgba(15,23,42,0.85)] scale-105'
                            : pendingCatch?.species.rarity === 'Secreto Abisal'
                              ? 'bg-gradient-to-b from-[#67e8f9] to-[#0891b2] border-[#cffafe] text-[#083344] shadow-[0_0_28px_rgba(34,211,238,0.9)] scale-105'
                              : 'bg-gradient-to-b from-[#fbbf24] to-[#d97706] border-[#fef08a] text-[#1e1b4b] shadow-[0_0_24px_rgba(245,158,11,0.7)] scale-105'
                    : phase === 'CAUGHT'
                      ? 'bg-gradient-to-b from-[#38bdf8] to-[#0284c7] border-[#bae6fd] text-white shadow-[0_6px_20px_rgba(2,132,199,0.5)]'
                      : phase === 'MISSED'
                        ? 'bg-gradient-to-b from-[#94a3b8] to-[#64748b] border-[#cbd5e1] text-white shadow-md'
                        : 'bg-gradient-to-b from-[#2563eb] to-[#1e3a8a] hover:from-[#3b82f6] hover:to-[#1e40af] border-[#93c5fd] text-white shadow-[0_6px_20px_rgba(37,99,235,0.45)]'
                }`}
              >
                {hasWizardWand ? (
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    aria-hidden="true"
                    className={`w-6 h-6 shrink-0 ${
                      phase === 'BITING' ? 'animate-bounce' : ''
                    }`}
                  >
                    <line
                      x1="4"
                      y1="20"
                      x2="15"
                      y2="9"
                      stroke="currentColor"
                      strokeWidth="2.4"
                      strokeLinecap="round"
                    />
                    <path
                      d="M17.5 3L18.6 5.6L21.2 6.7L18.6 7.8L17.5 10.4L16.4 7.8L13.8 6.7L16.4 5.6L17.5 3Z"
                      fill="#fde047"
                      stroke="currentColor"
                      strokeWidth="1.2"
                      strokeLinejoin="round"
                    />
                    <circle cx="11" cy="5" r="1.2" fill="#fde047" />
                    <circle cx="20" cy="13" r="1.2" fill="#fde047" />
                  </svg>
                ) : (
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    aria-hidden="true"
                    className={`w-6 h-6 shrink-0 ${
                      phase === 'BITING' ? 'animate-bounce' : ''
                    }`}
                  >
                    <circle cx="14" cy="4.5" r="2" stroke="currentColor" strokeWidth="2.2" />
                    <path
                      d="M14 6.5V14.5C14 17.5376 11.5376 20 8.5 20C5.46243 20 3 17.5376 3 14.5V13L5.8 14.8"
                      stroke="currentColor"
                      strokeWidth="2.4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
                <span>{actionLabel}</span>
              </button>
            </div>
          </div>
          ) : (
            <div className="mb-2" />
          )}
        </div>
      )}

      {/* LEVEL UP CELEBRATION BANNER (Large, Golden, Unmistakable) */}
      {mode === 'playing' && levelUpAlert && !activeMinigame && (
        <div
          key={`level-up-${levelUpAlert.key}`}
          className="fixed left-1/2 -translate-x-1/2 top-20 sm:top-16 z-40 pointer-events-none px-3 w-full max-w-[92vw] sm:max-w-md flex justify-center"
        >
          <button
            type="button"
            data-testid="level-up-banner"
            onClick={() => {
              sound.playClick();
              setLevelUpAlert(null);
              setRewardRoadBanner('');
              setActivePanel('rewards');
            }}
            className="pointer-events-auto relative overflow-hidden w-full max-w-[380px] rounded-2xl bg-gradient-to-br from-[#1e1b4b]/98 via-[#312e81]/98 to-[#451a03]/98 border-2 border-[#fde047] px-4 py-3 text-left text-white shadow-[0_16px_44px_rgba(15,23,42,0.72),0_0_36px_rgba(250,204,21,0.58)] flex items-center gap-3.5 cursor-pointer animate-ui-pop hover:brightness-105 transition-transform active:scale-98"
          >
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-transparent via-[#fef08a]/30 to-transparent animate-levelup-shimmer"
            />
            <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-b from-[#fef9c3] via-[#facc15] to-[#d97706] border-2 border-white shadow-[0_4px_16px_rgba(250,204,21,0.75)] flex flex-col items-center justify-center shrink-0 text-[#451a03]">
              <span className="text-[9px] font-black uppercase tracking-wider leading-none">
                {lang === 'en' ? 'LEVEL' : 'NIVEL'}
              </span>
              <span className="font-display font-extrabold text-2xl leading-none tabular-nums mt-0.5">
                {levelUpAlert.newLevel}
              </span>
            </div>
            <div className="flex-1 min-w-0 flex flex-col gap-0.5">
              <div className="flex items-center gap-1.5 flex-wrap">
                <Sparkles className="w-4 h-4 text-[#fde047] shrink-0 animate-tutorial-sparkle" />
                <span className="font-display font-extrabold text-sm sm:text-base tracking-wide text-[#fde047] uppercase">
                  {lang === 'en' ? 'LEVEL UP!' : '¡SUBIDA DE NIVEL!'}
                </span>
                {levelUpAlert.levelsGained > 1 && (
                  <span className="px-1.5 py-0.5 rounded-md bg-[#fbbf24] text-[#1e1b4b] font-display font-black text-[10px]">
                    +{levelUpAlert.levelsGained}
                  </span>
                )}
              </div>
              <div className="font-display font-extrabold text-base sm:text-lg text-white leading-tight">
                {lang === 'en'
                  ? `Reached Level ${levelUpAlert.newLevel}!`
                  : `¡Has alcanzado el Nivel ${levelUpAlert.newLevel}!`}
              </div>
              <div className="flex items-center justify-between gap-2 flex-wrap pt-0.5">
                <span className="text-[11px] font-bold text-[#e0e7ff] tabular-nums">
                  {lang === 'en'
                    ? `Next goal: ${formatNumber(levelUpAlert.nextTargetXp, lang)} XP`
                    : `Siguiente meta: ${formatNumber(levelUpAlert.nextTargetXp, lang)} XP`}
                </span>
                {unclaimedLevelRewardsCount > 0 && (
                  <span className="px-2 py-0.5 rounded-md bg-gradient-to-b from-[#4ade80] to-[#16a34a] border border-[#bbf7d0] text-[#052e16] font-display font-extrabold text-[10px]">
                    {lang === 'en' ? '🎁 Rewards Ready!' : '🎁 ¡Recompensa lista!'}
                  </span>
                )}
              </div>
            </div>
          </button>
        </div>
      )}

      {/* NEW FISH ALERT */}
      {mode === 'playing' && newFishAlert && (
        <div
          data-testid="new-fish-alert"
          style={{
            borderColor: RARITIES[newFishAlert.rarity].color,
            boxShadow: `0 8px 24px rgba(2, 6, 23, 0.45), 0 0 22px ${RARITIES[newFishAlert.rarity].color}66`,
          }}
          className={`fixed left-1/2 -translate-x-1/2 z-40 pointer-events-none px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-2xl bg-gradient-to-r from-[#0f172a]/95 via-[#1e293b]/95 to-[#0f172a]/95 border-2 text-white font-display font-extrabold text-xs sm:text-sm max-w-[92vw] truncate animate-ui-pop flex items-center gap-2 ${
            tutorialStep >= 3 && activePanel === 'none'
              ? 'bottom-36 sm:bottom-44'
              : 'bottom-20 sm:bottom-24 lg:bottom-28'
          }`}
        >
          <span
            className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider border border-white/25"
            style={{
              color: RARITIES[newFishAlert.rarity].color,
              backgroundColor: RARITIES[newFishAlert.rarity].bgColor,
            }}
          >
            {getRarityName(newFishAlert.rarity, lang)}
          </span>
          <span className="text-[#fef08a]">
            {lang === 'en'
              ? `✨ New fish: ${getFishName(newFishAlert.id, lang)}! ✨`
              : `✨ ¡Nuevo pez: ${getFishName(newFishAlert.id, lang)}! ✨`}
          </span>
        </div>
      )}

      {/* GOLD MEDAL CENTER CELEBRATION — SPECIES MASTERY (50 CATCHES) */}
      {mode === 'playing' && masteryAlert && (
        <div
          key={`mastery-medal-${masteryAlert.id}`}
          data-testid="mastery-unlock-alert"
          className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center p-4"
        >
          <div className="animate-mastery-pop relative flex flex-col items-center text-center">
            <div className="relative flex items-center justify-center w-44 h-44">
              <div
                className="absolute inset-0 rounded-full opacity-80 blur-xl"
                style={{
                  background:
                    'radial-gradient(circle, rgba(254,240,138,0.85) 0%, rgba(234,179,8,0.45) 45%, rgba(234,179,8,0) 75%)',
                }}
              />
              <svg
                viewBox="0 0 200 200"
                className="animate-mastery-rays absolute inset-0 w-full h-full opacity-85"
                aria-hidden="true"
              >
                {Array.from({ length: 12 }).map((_, i) => (
                  <polygon
                    key={i}
                    points="100,100 91,8 109,8"
                    fill="url(#masteryRayGrad)"
                    transform={`rotate(${i * 30} 100 100)`}
                  />
                ))}
                <defs>
                  <linearGradient id="masteryRayGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#fef08a" stopOpacity="0" />
                    <stop offset="55%" stopColor="#facc15" stopOpacity="0.55" />
                    <stop offset="100%" stopColor="#fef9c3" stopOpacity="0.9" />
                  </linearGradient>
                </defs>
              </svg>

              <div className="absolute top-2 flex gap-1 z-10">
                <span className="w-5 h-7 rounded-t-sm bg-gradient-to-b from-[#dc2626] to-[#991b1b] border border-[#fca5a5]/70 shadow-md -rotate-6" />
                <span className="w-5 h-7 rounded-t-sm bg-gradient-to-b from-[#ef4444] to-[#7f1d1d] border border-[#fca5a5]/70 shadow-md rotate-6" />
              </div>

              <div className="relative z-20 mt-4 w-28 h-28 rounded-full bg-gradient-to-br from-[#fef9c3] via-[#facc15] to-[#b45309] p-1.5 shadow-[0_12px_36px_rgba(202,138,4,0.85),0_0_24px_rgba(254,240,138,0.9)] border-2 border-[#fef9c3]">
                <div className="relative w-full h-full rounded-full bg-gradient-to-b from-[#fde047] via-[#eab308] to-[#a16207] border-2 border-[#fef08a]/80 flex flex-col items-center justify-center overflow-hidden shadow-inner">
                  <span
                    aria-hidden="true"
                    className="animate-mastery-shimmer absolute inset-y-0 w-10 bg-gradient-to-r from-transparent via-white/80 to-transparent pointer-events-none"
                  />
                  <Medal className="w-12 h-12 text-[#713f12] fill-[#fef08a] drop-shadow-[0_2px_2px_rgba(255,255,255,0.65)]" />
                  <span className="font-display font-extrabold text-[11px] tracking-wider uppercase text-[#451a03] mt-0.5 tabular-nums">
                    50 / 50
                  </span>
                </div>
              </div>
            </div>

            <div className="-mt-1 px-6 py-3 rounded-2xl bg-[#1e1b4b]/95 border-2 border-[#facc15] shadow-[0_14px_34px_rgba(15,23,42,0.7)] flex flex-col items-center gap-1 max-w-xs">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#fde047]">
                {lang === 'en'
                  ? 'Species Mastery Unlocked'
                  : 'Maestría de Especie Desbloqueada'}
              </span>
              <div className="flex items-center gap-2">
                {CUSTOM_FISH_IMAGES[masteryAlert.id] && (
                  <RealisticFishThumb
                    fishId={masteryAlert.id}
                    alt={getFishName(masteryAlert.id, lang)}
                    className="w-11 h-7 object-contain shrink-0 drop-shadow"
                  />
                )}
                <span className="font-display font-extrabold text-lg text-white">
                  {getFishName(masteryAlert.id, lang)}
                </span>
              </div>
              <span className="text-xs font-semibold text-[#fef3c7]">
                {CUSTOM_FISH_IMAGES[masteryAlert.id]
                  ? lang === 'en'
                    ? 'Gold medal and profile avatar unlocked'
                    : 'Medalla de oro y fondo de perfil obtenidos'
                  : lang === 'en'
                    ? 'Gold medal added to your fishing index'
                    : 'Medalla de oro añadida al índice de pesca'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* RARITY MINIGAME MODAL */}
      {mode === 'playing' && activeMinigame && (
        <FishingMinigame
          key={minigameKey}
          caught={activeMinigame}
          lang={lang}
          hasGoldRod={equippedCosmetics.includes('rod_gold')}
          fightTelemetryRef={fightTelemetryRef}
          showFirstCatchTutorial={
            getAccountCatchCount({ fishCount, discoveredFish }) === 0 &&
            !minigameTutorialDone
          }
          onCompleteFirstCatchTutorial={() => {
            setMinigameTutorialDone(true);
            try {
              localStorage.setItem(MINIGAME_TUTORIAL_STORAGE_KEY, '1');
            } catch {}
          }}
          seenRarityTutorials={seenRarityTutorials}
          onDismissRarityTutorial={(seenRarity) => {
            setSeenRarityTutorials((prev) => {
              const next = markRarityTutorialSeen(prev, seenRarity);
              saveSeenRarityTutorialsToStorage(next);
              return next;
            });
          }}
          onSuccess={(wonCatch) => {
            const prevCount = discoveredFish[wonCatch.species.id] ?? 0;
            const isNew = prevCount === 0;
            const unlockedMasteryNow = prevCount === 49;
            const isHighRarityCatch =
              wonCatch.species.rarity === 'Legendaria' ||
              wonCatch.species.rarity === 'Secreto' ||
              wonCatch.species.rarity === 'Secreto Abisal';
            if (unlockedMasteryNow) {
              triggerMasteryCelebration(wonCatch.species);
            } else if (!isHighRarityCatch) {
              sound.playCatch(world);
            }
            if (newFishDelayRef.current !== null) {
              window.clearTimeout(newFishDelayRef.current);
              newFishDelayRef.current = null;
            }
            if (newFishTimerRef.current !== null) {
              window.clearTimeout(newFishTimerRef.current);
              newFishTimerRef.current = null;
            }
            if (isNew) {
              const showAlert = () => {
                setNewFishAlert(wonCatch.species);
                newFishTimerRef.current = window.setTimeout(() => {
                  setNewFishAlert(null);
                  newFishTimerRef.current = null;
                }, 2400);
              };
              if (isHighRarityCatch) {
                setNewFishAlert(null);
                newFishDelayRef.current = window.setTimeout(showAlert, 5000);
              } else {
                showAlert();
              }
            }
            const nextFishCount = fishingStateRef.current.fishCount + 1;
            fishingStateRef.current = {
              ...fishingStateRef.current,
              phase: 'CAUGHT',
              phaseTimer: 0,
              fishCount: nextFishCount,
            };
            setPhase('CAUGHT');
            setFishCount(nextFishCount);
            setLastCaught(wonCatch);
            setPendingCatch(null);
            setActiveMinigame(null);
            setFailedMinigameCatch(null);
            setFailedMinigameReason('none');
            fightTelemetryRef.current = createInitialFightTelemetry();
            setMinigameReviveCost(10);
            setInventory((prev) => [wonCatch, ...prev]);
            setCatchHistory((prev) =>
              [toCatchHistoryEntry(wonCatch), ...prev].slice(0, 10)
            );
            setDiscoveredFish((prev) => ({
              ...prev,
              [wonCatch.species.id]: (prev[wonCatch.species.id] ?? 0) + 1,
            }));
            setMaxFishWeights((prev) =>
              updateMaxFishWeightRecord(prev, wonCatch.species.id, wonCatch.weightKg)
            );
            awardCatchXp(wonCatch, unlockedMasteryNow);
            setMinigameTutorialDone(true);
            try {
              localStorage.setItem(MINIGAME_TUTORIAL_STORAGE_KEY, '1');
            } catch {}
            recordDailyQuestCatch(wonCatch.species);
            maybeTriggerLuckChest(nextFishCount);
            if (tutorialStep === 2) {
              setTutorialStep(3);
            }
          }}
          onFail={(reason = 'fish_escaped') => {
            setFailedMinigameReason(reason);
            setFailedMinigameCatch(activeMinigame);
            setActiveMinigame(null);
          }}
        />
      )}

      {/* LUCK CHEST x2 (Every 100 catches) */}
      {mode === 'playing' &&
        luckChestMilestone !== null &&
        !activeMinigame &&
        !failedMinigameCatch && (
          <div className="fixed inset-0 bg-[#0f2942]/60 backdrop-blur-[2px] flex items-center justify-center p-4 z-30 animate-ui-backdrop">
            <div
              data-testid="luck-chest-modal"
              className="w-full max-w-sm rounded-2xl bg-gradient-to-b from-[#fffbeb] via-[#fef3c7] to-[#fde68a] border-2 border-[#f59e0b] p-6 shadow-[0_18px_45px_rgba(217,119,6,0.45)] flex flex-col items-center text-center gap-3.5 animate-ui-modal-in"
            >
              <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-[#fef9c3] to-[#f59e0b]/25 border-2 border-[#fbbf24] p-2.5 flex items-center justify-center shadow-inner">
                <svg viewBox="0 0 80 80" className="w-full h-full drop-shadow">
                  <path
                    d="M12 34 C12 20 22 14 40 14 C58 14 68 20 68 34 Z"
                    fill="#b45309"
                    stroke="#78350f"
                    strokeWidth="3"
                  />
                  <rect
                    x="12"
                    y="34"
                    width="56"
                    height="32"
                    rx="6"
                    fill="#92400e"
                    stroke="#78350f"
                    strokeWidth="3"
                  />
                  <rect x="20" y="15" width="7" height="51" fill="#facc15" stroke="#a16207" strokeWidth="1.5" />
                  <rect x="53" y="15" width="7" height="51" fill="#facc15" stroke="#a16207" strokeWidth="1.5" />
                  <rect x="11" y="31" width="58" height="7" rx="2" fill="#fde047" stroke="#a16207" strokeWidth="1.5" />
                  <rect x="34" y="29" width="12" height="14" rx="3" fill="#fef08a" stroke="#854d0e" strokeWidth="2" />
                  <circle cx="40" cy="36" r="2.2" fill="#78350f" />
                </svg>
              </div>
              <span className="px-3 py-0.5 rounded-full bg-[#16a34a] text-white text-[11px] font-extrabold uppercase tracking-wider shadow-sm">
                {lang === 'en'
                  ? `${luckChestMilestone} catches reached!`
                  : `¡${luckChestMilestone} pescas alcanzadas!`}
              </span>
              <h2 className="font-display font-extrabold text-2xl text-[#78350f]">
                {t('luckChestTitle', lang)}
              </h2>
              <p className="text-sm font-semibold text-[#92400e]">
                {t('luckChestDesc', lang)}
              </p>
              <button
                type="button"
                data-testid="open-luck-chest-btn"
                onClick={handleOpenLuckChest}
                className="btn-arcade btn-shine w-full py-3 rounded-xl bg-gradient-to-b from-[#22c55e] to-[#15803d] text-white font-display font-extrabold text-base shadow-lg border border-[#86efac] border-b-4 border-b-[#14532d] active:border-b cursor-pointer"
              >
                {t('openChest', lang)}
              </button>
            </div>
          </div>
        )}

      {/* REVIVE MINIGAME MODAL */}
      {mode === 'playing' && failedMinigameCatch && (
        <div className="fixed inset-0 bg-[#0f2942]/70 backdrop-blur-sm flex items-center justify-center p-4 z-40 animate-ui-backdrop">
          <div className="w-full max-w-sm rounded-2xl bg-[#f8fafc] border-2 border-[#cbd5e1] p-5 shadow-2xl flex flex-col gap-4 text-center animate-ui-modal-in">
            <h2 className="font-display font-extrabold text-xl text-[#dc2626]">
              {failedMinigameReason === 'line_snapped'
                ? lang === 'en'
                  ? 'Line snapped!'
                  : '¡Se rompió el sedal!'
                : t('reviveTitle', lang)}
            </h2>
            <p className="text-sm text-[#475569]">
              {failedMinigameReason === 'line_snapped'
                ? lang === 'en'
                  ? 'The tension exceeded your rod limit. Do you want to revive and fight this fish again?'
                  : 'La tensión superó el límite de la caña. ¿Quieres revivir y volver a pelear con este pez?'
                : t('reviveDesc', lang)}
            </p>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                disabled={coins < minigameReviveCost}
                onClick={() => {
                  if (coins < minigameReviveCost) return;
                  setCoins((c) => c - minigameReviveCost);
                  setMinigameReviveCost((cost) => cost * 2);
                  fightTelemetryRef.current = createInitialFightTelemetry();
                  setFailedMinigameReason('none');
                  setMinigameKey((k) => k + 1);
                  setActiveMinigame(failedMinigameCatch);
                  setFailedMinigameCatch(null);
                }}
                className="btn-arcade btn-shine w-full py-3 rounded-xl bg-gradient-to-b from-[#10b981] to-[#059669] disabled:opacity-45 text-white font-display font-extrabold text-sm shadow-md border-b-4 border-b-[#047857] active:border-b cursor-pointer"
              >
                {t('reviveForCoins', lang)} {minigameReviveCost} {t('coins', lang).toLowerCase()}
              </button>
              <button
                type="button"
                onClick={() => {
                  fishingStateRef.current = {
                    ...fishingStateRef.current,
                    phase: 'MISSED',
                    phaseTimer: 0,
                  };
                  fightTelemetryRef.current = createInitialFightTelemetry();
                  setFailedMinigameReason('none');
                  setPhase('MISSED');
                  setLastCaught(null);
                  setFailedMinigameCatch(null);
                  setPendingCatch(null);
                  setMinigameReviveCost(10);
                }}
                className="btn-arcade w-full py-2.5 rounded-xl bg-[#e2e8f0] hover:bg-[#cbd5e1] text-[#334155] font-bold text-sm cursor-pointer"
              >
                {t('giveUp', lang)}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* LANDSCAPE ROTATION PROMPT ON MOBILE/TABLET */}
      <div className="hidden portrait:flex lg:portrait:hidden fixed inset-0 z-50 bg-[#0f2942] text-white flex-col items-center justify-center p-6 text-center gap-4">
        <div className="text-5xl animate-bounce">📱↻</div>
        <h2 className="font-display font-extrabold text-2xl">
          {t('rotateDevice', lang)}
        </h2>
        <p className="text-sm text-[#bae6fd] max-w-xs">
          {t('rotateDeviceDesc', lang)}
        </p>
      </div>

      {/* MENU & PROFILE MODAL */}
      {mode === 'playing' && activePanel === 'profile' && (
        <div className="fixed inset-0 bg-[#0f2942]/55 backdrop-blur-[2px] flex items-center justify-center p-3 sm:p-4 z-30 animate-ui-backdrop">
          <div className="w-full max-w-md sm:max-w-lg max-h-[88vh] rounded-2xl bg-[#f8fafc] border-2 border-[#cbd5e1] shadow-2xl flex flex-col overflow-hidden animate-ui-modal-in">
            {/* Fixed header */}
            <div className="shrink-0 flex items-center justify-between gap-2 px-5 pt-4 pb-3 border-b border-[#e2e8f0] bg-[#f8fafc]">
              <div className="flex items-center gap-2 min-w-0">
                <h2 className="font-display font-extrabold text-xl text-[#0f2942] truncate">
                  {lang === 'en' ? 'Menu & Profile' : 'Menú y Perfil'}
                </h2>
                {isCurrentUserAdmin && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowAdminTools(true);
                      window.setTimeout(() => {
                        adminPanelRef.current?.scrollIntoView({
                          behavior: 'smooth',
                          block: 'start',
                        });
                      }, 40);
                    }}
                    title={lang === 'en' ? 'Jump to Admin Panel' : 'Bajar al Panel de Admin'}
                    className="px-2 py-0.5 rounded-md bg-gradient-to-r from-[#7f1d1d] to-[#450a0a] hover:brightness-110 border border-[#dc2626] text-[#fecaca] text-[10px] font-extrabold uppercase tracking-wider shrink-0 cursor-pointer"
                  >
                    💀 ADMIN ↓
                  </button>
                )}
                {hasOgTitle && (
                  <span className="px-2 py-0.5 rounded-md bg-gradient-to-r from-[#f97316] to-[#ea580c] border border-[#fdba74] text-white text-[10px] font-extrabold uppercase tracking-wider shrink-0">
                    OG
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={closeActivePanel}
                aria-label={lang === 'en' ? 'Close menu' : 'Cerrar menú'}
                className="p-1.5 rounded-lg hover:bg-[#e2e8f0] text-[#475569] cursor-pointer shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable body */}
            <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-5 pt-4 flex flex-col gap-4">
              {tutorialStep === 5 && (
                <div
                  data-testid="tutorial-menu-card"
                  className="shrink-0 rounded-2xl bg-gradient-to-r from-[#0f172a] via-[#1e293b] to-[#0f172a] border-2 border-[#fbbf24] p-4 text-white shadow-[0_8px_24px_rgba(245,158,11,0.35)] flex flex-col gap-2.5 animate-tutorial-glow"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-display font-extrabold text-sm text-[#fde047] flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-[#facc15] animate-tutorial-sparkle" />
                      {lang === 'en'
                        ? 'Step 5 of 5 · How the Menu Works'
                        : 'Paso 5 de 5 · Así funciona el Menú'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-200 leading-relaxed">
                    {lang === 'en' ? (
                      <>
                        In <strong className="text-white">Skin / Shop</strong> customize outfits and rods; in <strong className="text-white">Leaderboard</strong> and <strong className="text-white">Friends</strong> compete with fellow anglers; and with the <strong className="text-[#fde047]">Luck Chest</strong> earn Luck x2 every 100 catches.
                      </>
                    ) : (
                      <>
                        En <strong className="text-white">Skin / Tienda</strong> personalizas ropa y cañas; en <strong className="text-white">Clasificación</strong> y <strong className="text-white">Amigos</strong> compites con otros pescadores; y con el <strong className="text-[#fde047]">Cofre de Suerte</strong> ganas Suerte x2 cada 100 capturas.
                      </>
                    )}
                  </p>
                  <button
                    type="button"
                    data-testid="complete-tutorial-btn"
                    onClick={dismissTutorial}
                    className="btn-arcade btn-shine w-full py-2.5 px-4 rounded-xl bg-gradient-to-b from-[#22c55e] to-[#16a34a] text-white font-display font-extrabold text-sm border-2 border-[#bbf7d0] shadow-lg flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4 animate-tutorial-sparkle" />
                    <span>
                      {lang === 'en'
                        ? 'Got it! Complete Tutorial'
                        : '¡Entendido! Completar Tutorial'}
                    </span>
                    <Sparkles className="w-4 h-4 animate-tutorial-sparkle" />
                  </button>
                </div>
              )}

              {/* Quick actions */}
              <div className="shrink-0 grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  type="button"
                  data-testid="open-locker-btn"
                  onClick={() => {
                    setSkinStudioTab('wardrobe');
                    setActivePanel('locker');
                  }}
                  className="btn-arcade btn-shine py-2.5 px-2 rounded-xl bg-gradient-to-b from-[#a855f7] to-[#7e22ce] text-white font-display font-bold text-[11px] sm:text-xs shadow-sm cursor-pointer flex flex-col items-center justify-center gap-1 text-center leading-tight"
                >
                  <Shirt className="w-4 h-4 shrink-0" />
                  <span>{lang === 'en' ? 'Skin / Shop' : 'Skin / Tienda'}</span>
                </button>
                {(() => {
                  const currentDaily = ensureDailyQuestsCurrent(dailyQuests);
                  const claimableCount = currentDaily.quests.filter(
                    (q) => q.progress >= q.target && !q.claimed
                  ).length;
                  return (
                    <button
                      type="button"
                      data-testid="open-quests-btn"
                      onClick={() => {
                        sound.playClick();
                        setQuestClaimBanner('');
                        const synced = ensureDailyQuestsCurrent(dailyQuestsRef.current);
                        dailyQuestsRef.current = synced;
                        saveDailyQuestsState(synced);
                        setDailyQuests(synced);
                        setActivePanel('quests');
                      }}
                      className="btn-arcade btn-shine relative py-2.5 px-2 rounded-xl bg-gradient-to-b from-[#fbbf24] via-[#f59e0b] to-[#d97706] text-[#1e1b4b] font-display font-extrabold text-[11px] sm:text-xs shadow-sm cursor-pointer flex flex-col items-center justify-center gap-1 text-center leading-tight"
                    >
                      <ScrollText className="w-4 h-4 shrink-0" />
                      <span>{lang === 'en' ? 'Quests' : 'Misiones'}</span>
                      {claimableCount > 0 && (
                        <span
                          data-testid="quests-claimable-badge"
                          className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded-md bg-[#dc2626] text-white text-[10px] font-black leading-none border border-white animate-pulse"
                        >
                          {claimableCount}
                        </span>
                      )}
                    </button>
                  );
                })()}
                <button
                  type="button"
                  data-testid="open-leaderboard-btn"
                  onClick={() => setActivePanel('leaderboard')}
                  className="btn-arcade btn-shine py-2.5 px-2 rounded-xl bg-gradient-to-b from-[#f59e0b] to-[#d97706] text-white font-display font-bold text-[11px] sm:text-xs shadow-sm cursor-pointer flex flex-col items-center justify-center gap-1 text-center leading-tight"
                >
                  <Trophy className="w-4 h-4 shrink-0" />
                  <span>{lang === 'en' ? 'Leaderboard' : 'Clasificación'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActivePanel('friends')}
                  className="btn-arcade btn-shine py-2.5 px-2 rounded-xl bg-gradient-to-b from-[#64748b] to-[#475569] text-white font-display font-bold text-[11px] sm:text-xs shadow-sm cursor-pointer flex flex-col items-center justify-center gap-1 text-center leading-tight"
                >
                  <Users className="w-4 h-4 shrink-0" />
                  <span>
                    {lang === 'en' ? `Friends (${friends.length})` : `Amigos (${friends.length})`}
                  </span>
                </button>
              </div>

              {/* Upgraded Language Switcher inside Menu */}
              <div
                data-testid="menu-language-card"
                className="shrink-0 rounded-xl bg-white border border-[#e2e8f0] p-3 shadow-sm flex flex-col gap-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-[#e0f2fe] border border-[#bae6fd] text-[#0284c7] flex items-center justify-center shrink-0">
                      <Globe className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-extrabold uppercase tracking-wider text-[#0f2942]">
                        {lang === 'en' ? 'Language' : 'Idioma'}
                      </div>
                      <div className="text-[11px] font-medium text-[#64748b] truncate">
                        {lang === 'en'
                          ? 'Choose your interface language'
                          : 'Elige el idioma de la interfaz'}
                      </div>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-md bg-[#f1f5f9] border border-[#cbd5e1] text-[10px] font-extrabold uppercase tracking-wider text-[#0f2942] shrink-0">
                    {lang.toUpperCase()}
                  </span>
                </div>

                <div
                  role="group"
                  aria-label={lang === 'en' ? 'Game language' : 'Idioma del juego'}
                  className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-[#f1f5f9] border border-[#e2e8f0]"
                >
                  <button
                    type="button"
                    data-testid="lang-btn-en"
                    aria-pressed={lang === 'en'}
                    onClick={() => setLanguage('en')}
                    className={`py-2 px-3 rounded-lg font-display font-extrabold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      lang === 'en'
                        ? 'bg-gradient-to-b from-[#0284c7] to-[#0369a1] text-white shadow-sm'
                        : 'text-[#475569] hover:text-[#0f2942] hover:bg-white/70'
                    }`}
                  >
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-black/15">
                      EN
                    </span>
                    <span>English</span>
                  </button>
                  <button
                    type="button"
                    data-testid="lang-btn-es"
                    aria-pressed={lang === 'es'}
                    onClick={() => setLanguage('es')}
                    className={`py-2 px-3 rounded-lg font-display font-extrabold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      lang === 'es'
                        ? 'bg-gradient-to-b from-[#0284c7] to-[#0369a1] text-white shadow-sm'
                        : 'text-[#475569] hover:text-[#0f2942] hover:bg-white/70'
                    }`}
                  >
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-black/15">
                      ES
                    </span>
                    <span>Español</span>
                  </button>
                </div>
              </div>

              {/* Graphics Quality Selector (RTX Ultra -> Normal -> Low) */}
              <div
                data-testid="menu-graphics-card"
                className="shrink-0 rounded-xl bg-white border border-[#e2e8f0] p-3 shadow-sm flex flex-col gap-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div
                      className={`w-7 h-7 rounded-lg border flex items-center justify-center shrink-0 ${
                        graphicsQuality === 'rtx'
                          ? 'bg-[#fef3c7] border-[#fcd34d] text-[#d97706]'
                          : 'bg-[#e0f2fe] border-[#bae6fd] text-[#0284c7]'
                      }`}
                    >
                      {graphicsQuality === 'rtx' ? (
                        <Sun className="w-4 h-4" />
                      ) : (
                        <Monitor className="w-4 h-4" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-extrabold uppercase tracking-wider text-[#0f2942]">
                        {lang === 'en' ? 'Graphics Quality' : 'Calidad de Gráficos'}
                      </div>
                      <div className="text-[11px] font-medium text-[#64748b] truncate">
                        {graphicsQuality === 'rtx'
                          ? lang === 'en'
                            ? 'RTX Shadows, reflections & god-rays'
                            : 'Sombras RTX, reflejos y rayos de luz'
                          : graphicsQuality === 'normal'
                            ? lang === 'en'
                              ? 'Balanced smooth graphics (Default)'
                              : 'Gráficos equilibrados fluidos (Por defecto)'
                            : lang === 'en'
                              ? 'Maximum FPS · Ultra light mode'
                              : 'Máximos FPS · Modo ultra ligero'}
                      </div>
                    </div>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-md border text-[10px] font-extrabold uppercase tracking-wider shrink-0 ${
                      graphicsQuality === 'rtx'
                        ? 'bg-[#0f172a] border-[#facc15] text-[#fde047]'
                        : 'bg-[#f1f5f9] border-[#cbd5e1] text-[#0f2942]'
                    }`}
                  >
                    {graphicsQuality === 'rtx'
                      ? 'RTX'
                      : graphicsQuality === 'normal'
                        ? 'NORMAL'
                        : lang === 'en'
                          ? 'LOW'
                          : 'BAJO'}
                  </span>
                </div>

                <div
                  role="group"
                  aria-label={lang === 'en' ? 'Graphics quality' : 'Calidad gráfica'}
                  className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-[#f1f5f9] border border-[#e2e8f0]"
                >
                  <button
                    type="button"
                    data-testid="gfx-btn-rtx"
                    aria-pressed={graphicsQuality === 'rtx'}
                    onClick={() => setGraphics('rtx')}
                    className={`py-2 px-2 rounded-lg font-display font-extrabold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      graphicsQuality === 'rtx'
                        ? 'bg-gradient-to-b from-[#0f172a] to-[#1e293b] text-[#fde047] shadow-sm ring-1 ring-[#facc15]'
                        : 'text-[#475569] hover:text-[#0f2942] hover:bg-white/70'
                    }`}
                  >
                    <Sun className="w-3.5 h-3.5 shrink-0" />
                    <span>RTX Ultra</span>
                  </button>
                  <button
                    type="button"
                    data-testid="gfx-btn-normal"
                    aria-pressed={graphicsQuality === 'normal'}
                    onClick={() => setGraphics('normal')}
                    className={`py-2 px-2 rounded-lg font-display font-extrabold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      graphicsQuality === 'normal'
                        ? 'bg-gradient-to-b from-[#0284c7] to-[#0369a1] text-white shadow-sm'
                        : 'text-[#475569] hover:text-[#0f2942] hover:bg-white/70'
                    }`}
                  >
                    <span>Normal</span>
                  </button>
                  <button
                    type="button"
                    data-testid="gfx-btn-low"
                    aria-pressed={graphicsQuality === 'low'}
                    onClick={() => setGraphics('low')}
                    className={`py-2 px-2 rounded-lg font-display font-extrabold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      graphicsQuality === 'low'
                        ? 'bg-gradient-to-b from-[#475569] to-[#334155] text-white shadow-sm'
                        : 'text-[#475569] hover:text-[#0f2942] hover:bg-white/70'
                    }`}
                  >
                    <span>{lang === 'en' ? 'Low' : 'Bajo'}</span>
                  </button>
                </div>
              </div>

              {/* Skin Preview & Public Profile */}
              {(() => {
                const activeSuitItem = COSMETICS_CATALOG.find(
                  (c) =>
                    getCosmeticCategory(c.id) === 'suits' &&
                    equippedCosmetics.includes(c.id)
                );
                const equippedList = COSMETICS_CATALOG.filter((c) =>
                  equippedCosmetics.includes(c.id)
                );
                return (
                  <div
                    data-testid="menu-skin-preview-card"
                    className="shrink-0 rounded-xl bg-white border border-[#e2e8f0] p-3 shadow-sm flex items-center gap-3"
                  >
                    <div
                      className={`w-20 h-24 rounded-xl border flex items-center justify-center shrink-0 overflow-hidden ${
                        activeSuitItem?.id === 'suit_magma'
                          ? 'bg-gradient-to-b from-[#450a0a] to-[#1c1917] border-[#f97316]'
                          : activeSuitItem?.id === 'suit_wizard'
                            ? 'bg-gradient-to-b from-[#1e1b4b] to-[#312e81] border-[#a855f7]'
                            : activeSuitItem?.id === 'suit_millionaire'
                              ? 'bg-gradient-to-b from-[#0f172a] to-[#422006] border-[#facc15]'
                              : 'bg-gradient-to-b from-[#e0f2fe] to-[#bae6fd] border-[#7dd3fc]'
                      }`}
                    >
                      <AnglerSkinPreview
                        cosmetics={equippedCosmetics}
                        world={world}
                        size="md"
                      />
                    </div>
                    <div className="flex-1 min-w-0 flex flex-col gap-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#64748b]">
                          {lang === 'en' ? 'Your Equipped Skin' : 'Tu Skin Equipada'}
                        </span>
                        <span className="text-[10px] font-bold text-[#0284c7] tabular-nums">
                          {equippedList.length}{' '}
                          {lang === 'en'
                            ? equippedList.length === 1
                              ? 'item'
                              : 'items'
                            : equippedList.length === 1
                              ? 'pieza'
                              : 'piezas'}
                        </span>
                      </div>
                      <div className="font-display font-extrabold text-sm text-[#0f2942] truncate">
                        {activeSuitItem
                          ? getCosmeticName(activeSuitItem.id, lang, activeSuitItem.name)
                          : equippedList.length > 0
                            ? lang === 'en'
                              ? 'Custom Skin'
                              : 'Skin Personalizada'
                            : lang === 'en'
                              ? 'Classic Look'
                              : 'Aspecto Clásico'}
                      </div>
                      <p className="text-[11px] text-[#64748b] truncate">
                        {equippedList.length > 0
                          ? equippedList
                              .map((i) => getCosmeticName(i.id, lang, i.name))
                              .join(' · ')
                          : lang === 'en'
                            ? 'Classic angler with no accessories'
                            : 'Pescador clásico sin accesorios'}
                      </p>
                      <div className="flex items-center gap-1.5 pt-0.5">
                        <button
                          type="button"
                          onClick={() => {
                            sound.playClick();
                            setSkinStudioTab('wardrobe');
                            setActivePanel('locker');
                          }}
                          className="px-2.5 py-1 rounded-lg bg-[#7e22ce] hover:bg-[#6b21a8] text-white text-[11px] font-bold cursor-pointer transition-colors"
                        >
                          {lang === 'en' ? 'Edit Skin' : 'Editar Skin'}
                        </button>
                        <button
                          type="button"
                          data-testid="open-my-public-profile-btn"
                          onClick={() => {
                            sound.playClick();
                            const myBest =
                              getBestFishFromDiscovered(discoveredFish);
                            setInspectedProfile({
                              source: 'profile',
                              ownerUid: firebaseUser?.uid,
                              username,
                              avatar,
                              catches: fishCount,
                              money: totalCoinsEarned,
                              timeSeconds: playTimeSeconds,
                              isAdmin: isCurrentUserAdmin,
                              hasOgTitle,
                              isMe: true,
                              bestFishId: myBest?.id ?? 0,
                              discoveredCount: ALL_FISH.filter(
                                (f) => (discoveredFish[f.id] ?? 0) > 0
                              ).length,
                              masteredCount: ALL_FISH.filter(
                                (f) => (discoveredFish[f.id] ?? 0) >= 50
                              ).length,
                              underworldUnlocked,
                              equippedCosmetics: [...equippedCosmetics],
                            });
                          }}
                          className="px-2.5 py-1 rounded-lg bg-[#e0f2fe] hover:bg-[#bae6fd] text-[#0369a1] text-[11px] font-bold cursor-pointer transition-colors"
                        >
                          {lang === 'en' ? 'View profile' : 'Ver mi perfil'}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Luck Chest Progress Counter (Every 100 catches) */}
              <div
                data-testid="menu-luck-chest-counter"
                className="shrink-0 rounded-xl bg-gradient-to-r from-[#fffbeb] to-[#fef3c7] border border-[#fbbf24] p-3 shadow-sm flex flex-col gap-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5 text-xs font-extrabold text-[#78350f]">
                    <span className="text-base leading-none">🧰</span>
                    <span>{t('luckChestTitle', lang)}</span>
                  </span>
                  {luckSecondsLeft > 0 ? (
                    <span className="px-2 py-0.5 rounded-md bg-[#16a34a] text-white text-[11px] font-extrabold tabular-nums">
                      🍀 {t('luckBoost', lang)} x{activeLuckMultiplier} · {formatLuckTimeRemaining(luckSecondsLeft)}
                    </span>
                  ) : (
                    <span className="text-xs font-extrabold text-[#92400e] tabular-nums">
                      {fishCount % 100}/100 {lang === 'en' ? 'catches' : 'pescas'}
                    </span>
                  )}
                </div>
                <div className="w-full h-2 rounded-full bg-[#fde68a] overflow-hidden border border-[#f59e0b]/40">
                  <div
                    className="h-full bg-gradient-to-r from-[#f59e0b] to-[#16a34a] transition-all duration-300"
                    style={{ width: `${Math.min(100, fishCount % 100)}%` }}
                  />
                </div>
                <p className="text-[11px] font-semibold text-[#92400e]">
                  {luckSecondsLeft > 0
                    ? lang === 'en'
                      ? `Luck x${activeLuckMultiplier} boost active! Next chest in ${100 - (fishCount % 100)} catches.`
                      : `¡Potenciador de Suerte x${activeLuckMultiplier} activo! Próximo cofre en ${100 - (fishCount % 100)} pescas.`
                    : lang === 'en'
                      ? `${100 - (fishCount % 100)} catches left until your next chest (Luck x2 for 1:30 min).`
                      : `Faltan ${100 - (fishCount % 100)} pescas para tu próximo cofre (Suerte x2 durante 1:30 min).`}
                </p>
              </div>

              {/* Profile Block: Username & Avatars */}
              <div className="shrink-0 flex flex-col gap-3 p-3.5 rounded-xl bg-white border border-[#e2e8f0] shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-[#e0f2fe] border border-[#7dd3fc] flex items-center justify-center text-2xl shrink-0 overflow-hidden">
                  {renderAvatar(avatar, 44)}
                </div>
                <div className="flex-1 min-w-0">
                  <label className="text-[11px] font-bold uppercase tracking-wide text-[#64748b]">
                    {lang === 'en' ? 'Username (every 24h)' : 'Nombre de usuario (cada 24h)'}
                  </label>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      const now = Date.now();
                      const isAdmin = isCurrentUserAdmin;
                      const dayMs = 24 * 60 * 60 * 1000;
                      if (
                        !isAdmin &&
                        lastUsernameChangeAt > 0 &&
                        now - lastUsernameChangeAt < dayMs
                      ) {
                        const remH = Math.ceil(
                          (dayMs - (now - lastUsernameChangeAt)) / (60 * 60 * 1000)
                        );
                        setUsernameError(
                          lang === 'en'
                            ? `You can only change your name once every 24h (~${remH}h left).`
                            : `Solo puedes cambiar tu nombre cada 24h (faltan ~${remH}h).`
                        );
                        setUsernameSaved(false);
                        return;
                      }
                      const validation = validatePlayerName(usernameDraft, lang);
                      if (!validation.valid) {
                        setUsernameError(
                          validation.error ??
                            (lang === 'en'
                              ? 'Invalid or inappropriate name.'
                              : 'Nombre no válido o inapropiado.')
                        );
                        setUsernameSaved(false);
                        return;
                      }
                      const candidate = validation.cleanName;
                      const registry = loadAccountRegistry();
                      const key = candidate.toLowerCase();
                      const currentKey = username.toLowerCase();
                      if (key !== currentKey && registry[key]) {
                        setUsernameError(
                          lang === 'en'
                            ? 'That name is already taken. Pick another or add a number.'
                            : 'Ese nombre ya está en uso. Elige otro o añade un número.'
                        );
                        setUsernameSaved(false);
                        return;
                      }
                      if (currentKey !== key) {
                        delete registry[currentKey];
                      }
                      registry[key] = {
                        username: candidate,
                        avatar,
                        catches: fishCount,
                        money: totalCoinsEarned,
                        timeSeconds: playTimeSeconds,
                        equippedCosmetics:
                          sanitizeEquippedCosmetics(equippedCosmetics),
                      };
                      saveAccountRegistry(registry);
                      setUsername(candidate);
                      setUsernameDraft(candidate);
                      setLastUsernameChangeAt(now);
                      setUsernameError('');
                      setUsernameSaved(true);
                    }}
                    className="flex items-center gap-1.5 mt-0.5"
                  >
                    <input
                      type="text"
                      value={usernameDraft}
                      maxLength={16}
                      onChange={(e) => {
                        setUsernameDraft(e.target.value);
                        setUsernameError('');
                        setUsernameSaved(false);
                      }}
                      className="flex-1 min-w-0 text-base font-bold text-[#0f2942] bg-transparent border-b border-[#cbd5e1] focus:border-[#0284c7] outline-none"
                    />
                    <button
                      type="submit"
                      className="px-2.5 py-1 rounded-lg bg-[#0284c7] hover:bg-[#0369a1] text-white text-xs font-bold cursor-pointer shrink-0"
                    >
                      {lang === 'en' ? 'Save' : 'Guardar'}
                    </button>
                  </form>
                  {usernameError && (
                    <p className="text-[11px] font-semibold text-[#dc2626] mt-1">
                      {usernameError}
                    </p>
                  )}
                  {usernameSaved && !usernameError && (
                    <p className="text-[11px] font-semibold text-[#059669] mt-1">
                      {lang === 'en'
                        ? 'Username saved successfully.'
                        : 'Nombre guardado correctamente.'}
                    </p>
                  )}
                </div>
              </div>

              {/* Standard Icons */}
              <div className="pt-2.5 border-t border-[#f1f5f9] flex flex-col gap-2">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#64748b]">
                  {lang === 'en' ? 'Profile Icon' : 'Icono de perfil'}
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {isCurrentUserAdmin && (
                    <button
                      type="button"
                      onClick={() => {
                        if (!isCurrentUserAdmin) return;
                        setAvatar('permadeath_admin');
                      }}
                      title={lang === 'en' ? 'Admin Exclusive Icon' : 'Icono exclusivo Admin'}
                      className={`w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer transition-transform hover:scale-110 ${
                        avatar === 'permadeath_admin'
                          ? 'ring-2 ring-[#ef4444]'
                          : ''
                      }`}
                    >
                      <PermadeathSkullAvatar size={28} />
                    </button>
                  )}
                  {[
                    '🐟',
                    '🐠',
                    '🐡',
                    '🦈',
                    '🐙',
                    '🎣',
                    '👑',
                    '🏆',
                    '⚓',
                    '🔱',
                    '⭐',
                  ].map((icon) => (
                    <button
                      key={icon}
                      type="button"
                      onClick={() => setAvatar(icon)}
                      className={`w-8 h-8 rounded-lg flex items-center justify-center text-lg cursor-pointer transition-transform hover:scale-110 ${
                        avatar === icon
                          ? 'bg-[#bae6fd] border-2 border-[#0284c7]'
                          : 'bg-[#f8fafc] border border-[#e2e8f0]'
                      }`}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>

              {/* Collapsible Section: Mastery Icons */}
              {(() => {
                const unlockedMasteryAvatars = REAL_FISH_AVATARS.filter(
                  (f) => (discoveredFish[f.id] ?? 0) >= 50
                ).length;
                return (
                  <div className="pt-2 border-t border-[#f1f5f9] flex flex-col gap-2">
                    <button
                      type="button"
                      data-testid="toggle-mastery-avatars-btn"
                      aria-expanded={showMasteryAvatars}
                      onClick={() => setShowMasteryAvatars((prev) => !prev)}
                      className="w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg bg-[#f8fafc] hover:bg-[#f1f5f9] border border-[#e2e8f0] text-left transition-colors cursor-pointer"
                    >
                      <span className="flex items-center gap-1.5 text-xs font-bold text-[#0f2942]">
                        <Medal className="w-3.5 h-3.5 text-[#ca8a04] fill-[#fde047] shrink-0" />
                        <span>{lang === 'en' ? 'Mastery Icons' : 'Iconos de Maestría'}</span>
                        <span className="text-[11px] font-semibold text-[#64748b] tabular-nums">
                          · {unlockedMasteryAvatars}/{REAL_FISH_AVATARS.length}
                        </span>
                      </span>
                      <span className="flex items-center gap-1 text-[11px] font-bold text-[#0284c7] shrink-0">
                        <span>
                          {showMasteryAvatars
                            ? lang === 'en'
                              ? 'Hide'
                              : 'Ocultar'
                            : lang === 'en'
                              ? 'Show'
                              : 'Mostrar'}
                        </span>
                        {showMasteryAvatars ? (
                          <ChevronUp className="w-3.5 h-3.5" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5" />
                        )}
                      </span>
                    </button>

                    {showMasteryAvatars && (
                      <div
                        data-testid="mastery-avatars-panel"
                        className="flex flex-col gap-2 pt-0.5"
                      >
                        <p className="text-[11px] text-[#64748b]">
                          {lang === 'en'
                            ? 'Unlocked by reaching 50 catches of that species in the index.'
                            : 'Se desbloquean al conseguir 50 capturas de la especie en el índice.'}
                        </p>
                        <div className="grid grid-cols-6 gap-2 max-h-36 overflow-y-auto p-1 bg-[#f8fafc] rounded-lg border border-[#e2e8f0]">
                          {REAL_FISH_AVATARS.map((species) => {
                            const count = discoveredFish[species.id] ?? 0;
                            const mastered = count >= 50;
                            const avatarKey = `${MASTERY_AVATAR_PREFIX}${species.id}`;
                            const isSelected = avatar === avatarKey;
                            const localizedName = getFishName(species.id, lang);
                            return (
                              <button
                                key={avatarKey}
                                type="button"
                                data-testid={`mastery-avatar-${species.id}`}
                                disabled={!mastered}
                                onClick={() => {
                                  if (!mastered) return;
                                  setAvatar(avatarKey);
                                }}
                                title={
                                  mastered
                                    ? lang === 'en'
                                      ? `${localizedName} · Mastery unlocked (${count} catches)`
                                      : `${localizedName} · Maestría desbloqueada (${count} capturas)`
                                    : lang === 'en'
                                      ? `${localizedName} · Locked (${count}/50)`
                                      : `${localizedName} · Bloqueado (${count}/50)`
                                }
                                className={`relative w-10 h-10 rounded-lg flex items-center justify-center transition-transform ${
                                  mastered
                                    ? `cursor-pointer hover:scale-105 ${
                                        isSelected
                                          ? 'ring-2 ring-[#eab308] ring-offset-1'
                                          : ''
                                      }`
                                    : 'opacity-45 grayscale cursor-not-allowed'
                                }`}
                              >
                                <MasteryFishAvatar species={species} size={36} />
                                {!mastered && (
                                  <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-[#0f172a] border border-[#64748b] flex items-center justify-center">
                                    <Lock className="w-2.5 h-2.5 text-[#f8fafc]" />
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>

            {/* Catch History (Last 10 fish with date & time) */}
            <div
              data-testid="catch-history-section"
              className="shrink-0 rounded-xl bg-white border border-[#e2e8f0] p-3.5 shadow-sm flex flex-col gap-2.5"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-[#0f2942]">
                  <Clock className="w-3.5 h-3.5 text-[#0284c7] shrink-0" />
                  <span>{lang === 'en' ? 'Catch History' : 'Historial de capturas'}</span>
                </span>
                <span className="text-[11px] font-bold text-[#64748b] tabular-nums">
                  {Math.min(catchHistory.length, 10)}/10
                </span>
              </div>

              {catchHistory.length === 0 ? (
                <p className="text-xs text-[#64748b] py-2 text-center bg-[#f8fafc] rounded-lg border border-dashed border-[#cbd5e1]">
                  {lang === 'en'
                    ? 'No catches recorded yet. Cast your line to start your history!'
                    : 'Aún no hay capturas registradas. ¡Lanza la caña para empezar tu historial!'}
                </p>
              ) : (
                <div className="flex flex-col gap-1.5 max-h-52 overflow-y-auto pr-0.5">
                  {catchHistory.slice(0, 10).map((entry, idx) => {
                    const speciesObj = ALL_FISH.find((f) => f.id === entry.fishId);
                    const rarityStyle = RARITIES[entry.rarity] ?? RARITIES['Común'];
                    const hasRealThumb = Boolean(CUSTOM_FISH_IMAGES[entry.fishId]);
                    const localizedFishName = getFishName(entry.fishId, lang);
                    return (
                      <div
                        key={`${entry.uid}-${idx}`}
                        data-testid={`catch-history-item-${idx}`}
                        className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg bg-[#f8fafc] border border-[#e2e8f0]"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          {hasRealThumb ? (
                            <div
                              className={`w-11 h-7 rounded-lg p-0.5 flex items-center justify-center shrink-0 border ${
                                isUnderworldSpecies(entry.fishId)
                                  ? 'bg-gradient-to-br from-[#2b0909] via-[#450a0a] to-[#170404] border-[#ef4444]/40'
                                  : 'bg-gradient-to-br from-[#132f4c] via-[#1b4965] to-[#0b1f33] border-[#38bdf8]/35'
                              }`}
                            >
                              <RealisticFishThumb
                                fishId={entry.fishId}
                                alt={localizedFishName}
                                variantIndex={entry.variantIndex}
                                className="w-full h-full object-contain drop-shadow-[0_2px_3px_rgba(0,0,0,0.45)]"
                              />
                            </div>
                          ) : (
                            <span
                              className="w-4 h-4 rounded-full border border-[#0f172a] shrink-0"
                              style={{
                                backgroundColor: speciesObj?.spriteColor ?? '#38bdf8',
                              }}
                            />
                          )}
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-[#0f2942] truncate">
                              {localizedFishName}
                            </div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span
                                className="inline-block text-[10px] font-bold px-1.5 py-0 rounded"
                                style={{
                                  backgroundColor: rarityStyle.bgColor,
                                  color: rarityStyle.color,
                                }}
                              >
                                {getRarityName(entry.rarity, lang)}
                              </span>
                              {typeof entry.weightKg === 'number' && entry.weightKg > 0 && (
                                <span className="text-[10px] font-bold text-[#475569] tabular-nums">
                                  · {formatFishWeight(entry.weightKg, lang)}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <span className="text-[11px] font-semibold text-[#475569] tabular-nums shrink-0 text-right">
                          {formatCatchDateTime(entry.caughtAt, lang)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Total Stats Summary */}
            <div
              data-testid="profile-total-stats"
              className="shrink-0 rounded-xl bg-white border border-[#e2e8f0] p-3.5 shadow-sm flex flex-col gap-2.5"
            >
              <div className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-[#0f2942]">
                <Trophy className="w-3.5 h-3.5 text-[#f59e0b] shrink-0" />
                <span>{lang === 'en' ? 'Total Stats' : 'Estadísticas totales'}</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-lg bg-[#f0f9ff] border border-[#bae6fd] p-2.5 flex flex-col items-center text-center gap-0.5">
                  <Fish className="w-4 h-4 text-[#0284c7]" />
                  <span className="font-display font-extrabold text-sm text-[#0f2942] tabular-nums">
                    {formatNumber(fishCount, lang)}
                  </span>
                  <span className="text-[10px] font-bold text-[#475569] leading-tight">
                    {lang === 'en' ? 'Fish caught' : 'Peces atrapados'}
                  </span>
                </div>
                <div className="rounded-lg bg-[#fefce8] border border-[#fde047] p-2.5 flex flex-col items-center text-center gap-0.5">
                  <CoinIcon size={17} />
                  <span className="font-display font-extrabold text-sm text-[#0f2942] tabular-nums">
                    {formatNumber(totalCoinsEarned, lang)}
                  </span>
                  <span className="text-[10px] font-bold text-[#475569] leading-tight">
                    {lang === 'en' ? 'Coins earned' : 'Monedas ganadas'}
                  </span>
                </div>
                <div className="rounded-lg bg-[#f8fafc] border border-[#cbd5e1] p-2.5 flex flex-col items-center text-center gap-0.5">
                  <Clock className="w-4 h-4 text-[#475569]" />
                  <span className="font-display font-extrabold text-sm text-[#0f2942] tabular-nums">
                    {playTimeSeconds >= 3600
                      ? `${Math.floor(playTimeSeconds / 3600)}h ${Math.floor((playTimeSeconds % 3600) / 60)}m`
                      : formatTime(playTimeSeconds)}
                  </span>
                  <span className="text-[10px] font-bold text-[#475569] leading-tight">
                    {lang === 'en' ? 'Playtime' : 'Tiempo de juego'}
                  </span>
                </div>
              </div>
            </div>

            {/* Google Account */}
            <div className="shrink-0 rounded-xl bg-white border border-[#e2e8f0] p-3 flex items-center justify-between gap-2 shadow-sm">
              <div className="min-w-0">
                <div className="text-[10px] font-extrabold uppercase tracking-wider text-[#64748b]">
                  {lang === 'en'
                    ? 'Google Account · Cloud Save'
                    : 'Cuenta de Google · Guardado en la nube'}
                </div>
                <div className="text-xs font-bold text-[#0f2942] truncate mt-0.5">
                  {firebaseUser
                    ? firebaseUser.email ||
                      firebaseUser.displayName ||
                      (lang === 'en' ? 'Connected' : 'Conectado')
                    : lang === 'en'
                      ? 'Not signed in (local only)'
                      : 'Sin iniciar sesión (solo local)'}
                </div>
              </div>
              {firebaseUser ? (
                <button
                  type="button"
                  disabled={authLoading}
                  onClick={handleGoogleSignOut}
                  className="px-3 py-1.5 rounded-lg bg-[#fee2e2] hover:bg-[#fecaca] text-[#b91c1c] text-xs font-bold cursor-pointer shrink-0"
                >
                  {t('signOut', lang)}
                </button>
              ) : (
                <button
                  type="button"
                  disabled={authLoading}
                  onClick={handleGoogleSignIn}
                  className="px-3 py-1.5 rounded-lg bg-[#0284c7] hover:bg-[#0369a1] text-white text-xs font-bold cursor-pointer shrink-0"
                >
                  {authLoading
                    ? lang === 'en'
                      ? 'Connecting...'
                      : 'Conectando...'
                    : lang === 'en'
                      ? 'Connect Google'
                      : 'Conectar Google'}
                </button>
              )}
            </div>

            {/* Panel de Admin organizado y plegable (exclusivo salva2012mc@gmail.com) */}
            {isCurrentUserAdmin && (
              <div
                ref={adminPanelRef}
                className="shrink-0 rounded-xl bg-[#450a0a]/95 border border-[#dc2626] shadow-[0_0_12px_rgba(185,28,28,0.35)]"
              >
                <div className="flex items-center justify-between gap-2 px-3.5 py-2.5">
                  <button
                    type="button"
                    data-testid="toggle-admin-tools-btn"
                    aria-expanded={showAdminTools}
                    onClick={() => {
                      const next = !showAdminTools;
                      setShowAdminTools(next);
                      if (next) {
                        window.setTimeout(() => {
                          adminPanelRef.current?.scrollIntoView({
                            behavior: 'smooth',
                            block: 'start',
                          });
                        }, 40);
                      }
                    }}
                    className="flex-1 flex items-center justify-between gap-2 hover:opacity-90 transition-opacity cursor-pointer text-left"
                  >
                    <span className="text-xs font-extrabold uppercase tracking-wider text-[#fecaca]">
                      {lang === 'en' ? '💀 Admin & Luck Panel' : '💀 Panel de Admin y Suerte'}
                    </span>
                    <span className="flex items-center gap-1 text-[11px] font-bold text-[#fde047]">
                      <span>
                        {showAdminTools
                          ? lang === 'en'
                            ? 'Hide'
                            : 'Ocultar'
                          : lang === 'en'
                            ? 'Open'
                            : 'Abrir'}
                      </span>
                      {showAdminTools ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </span>
                  </button>
                  <button
                    type="button"
                    data-testid="open-admin-command-btn"
                    onClick={() => {
                      sound.playClick();
                      setShowAdminCommandModal(true);
                    }}
                    title={
                      lang === 'en'
                        ? 'Open Luck Command Console (/luck)'
                        : 'Abrir Consola de Comando de Suerte (/suerte)'
                    }
                    className="px-2.5 py-1 rounded-lg bg-[#2a0606] hover:bg-[#450a0a] border border-[#f87171] text-[#fde047] font-mono text-[11px] font-black flex items-center gap-1 cursor-pointer shrink-0 shadow-sm"
                  >
                    <Terminal className="w-3.5 h-3.5 text-[#fde047]" />
                    <span>/cmd</span>
                  </button>
                </div>

                {showAdminTools && (
                  <div className="px-3 pb-3 pt-1 flex flex-col gap-3 border-t border-[#dc2626]/40">
                    {/* Sub-tabs */}
                    <div className="grid grid-cols-4 gap-1 p-1 rounded-lg bg-[#2a0606]">
                      <button
                        type="button"
                        onClick={() => setAdminSectionTab('restaurar')}
                        className={`py-1.5 px-1.5 rounded-md text-[11px] font-extrabold transition-colors cursor-pointer text-center ${
                          adminSectionTab === 'restaurar'
                            ? 'bg-[#ca8a04] text-[#1e1b4b]'
                            : 'text-[#fecaca] hover:bg-[#450a0a]'
                        }`}
                      >
                        {lang === 'en' ? 'Stats' : 'Estadísticas'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setAdminSectionTab('indice')}
                        className={`py-1.5 px-1.5 rounded-md text-[11px] font-extrabold transition-colors cursor-pointer text-center ${
                          adminSectionTab === 'indice'
                            ? 'bg-[#ca8a04] text-[#1e1b4b]'
                            : 'text-[#fecaca] hover:bg-[#450a0a]'
                        }`}
                      >
                        {t('index', lang)}
                      </button>
                      <button
                        type="button"
                        onClick={() => setAdminSectionTab('invocar')}
                        className={`py-1.5 px-1.5 rounded-md text-[11px] font-extrabold transition-colors cursor-pointer text-center ${
                          adminSectionTab === 'invocar'
                            ? 'bg-[#ca8a04] text-[#1e1b4b]'
                            : 'text-[#fecaca] hover:bg-[#450a0a]'
                        }`}
                      >
                        {lang === 'en' ? 'Summon' : 'Invocar'}
                      </button>
                      <button
                        type="button"
                        data-testid="admin-tab-suerte"
                        onClick={() => setAdminSectionTab('suerte')}
                        className={`py-1.5 px-1.5 rounded-md text-[11px] font-extrabold transition-colors cursor-pointer text-center flex items-center justify-center gap-1 ${
                          adminSectionTab === 'suerte'
                            ? 'bg-[#ca8a04] text-[#1e1b4b]'
                            : 'text-[#fecaca] hover:bg-[#450a0a]'
                        }`}
                      >
                        <span>⚡</span>
                        <span>{t('luckBoost', lang)}</span>
                      </button>
                    </div>

                    {adminSectionTab === 'restaurar' && (
                      <div className="flex flex-col gap-2">
                        <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                          <label className="flex flex-col gap-0.5 text-[#fecaca]">
                            <span>{t('coins', lang)}</span>
                            <input
                              type="number"
                              min={0}
                              value={adminCoinsInput}
                              onChange={(e) => {
                                setAdminCoinsInput(e.target.value);
                                setAdminRestoreSaved(false);
                              }}
                              className="px-2 py-1 rounded bg-[#2a0606] border border-[#f87171]/50 text-white font-bold outline-none"
                            />
                          </label>
                          <label className="flex flex-col gap-0.5 text-[#fecaca]">
                            <span>{t('captures', lang)}</span>
                            <input
                              type="number"
                              min={0}
                              value={adminCatchesInput}
                              onChange={(e) => {
                                setAdminCatchesInput(e.target.value);
                                setAdminRestoreSaved(false);
                              }}
                              className="px-2 py-1 rounded bg-[#2a0606] border border-[#f87171]/50 text-white font-bold outline-none"
                            />
                          </label>
                          <label className="flex flex-col gap-0.5 text-[#fecaca]">
                            <span>{lang === 'en' ? 'Total coins earned' : 'Dinero total ganado'}</span>
                            <input
                              type="number"
                              min={0}
                              value={adminTotalMoneyInput}
                              onChange={(e) => {
                                setAdminTotalMoneyInput(e.target.value);
                                setAdminRestoreSaved(false);
                              }}
                              className="px-2 py-1 rounded bg-[#2a0606] border border-[#f87171]/50 text-white font-bold outline-none"
                            />
                          </label>
                          <label className="flex flex-col gap-0.5 text-[#fecaca]">
                            <span>{lang === 'en' ? 'Time (minutes)' : 'Tiempo (minutos)'}</span>
                            <input
                              type="number"
                              min={0}
                              value={adminMinutesInput}
                              onChange={(e) => {
                                setAdminMinutesInput(e.target.value);
                                setAdminRestoreSaved(false);
                              }}
                              className="px-2 py-1 rounded bg-[#2a0606] border border-[#f87171]/50 text-white font-bold outline-none"
                            />
                          </label>
                        </div>
                        <label className="flex items-center gap-2 text-xs text-[#fecaca] font-semibold cursor-pointer">
                          <input
                            type="checkbox"
                            checked={underworldUnlocked}
                            onChange={(e) => {
                              if (!isCurrentUserAdmin) return;
                              const checked = e.target.checked;
                              setUnderworldUnlocked(checked);
                              try {
                                localStorage.setItem(
                                  'ice_fishing_underworld_unlocked',
                                  checked ? '1' : '0'
                                );
                              } catch {
                                // ignore
                              }
                            }}
                          />
                          <span>
                            {lang === 'en' ? 'Underworld unlocked' : 'Inframundo desbloqueado'}
                          </span>
                        </label>
                        <div className="flex flex-wrap gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              if (!isCurrentUserAdmin) return;
                              const nextCoins = Math.max(0, Math.round(Number(adminCoinsInput) || 0));
                              const nextCatches = Math.max(0, Math.round(Number(adminCatchesInput) || 0));
                              const nextTotalMoney = Math.max(
                                0,
                                Math.round(Number(adminTotalMoneyInput) || 0)
                              );
                              const nextSeconds =
                                Math.max(0, Math.round(Number(adminMinutesInput) || 0)) * 60;
                              setCoins(nextCoins);
                              setFishCount(nextCatches);
                              luckChestTriggeredRef.current =
                                Math.floor(nextCatches / 100) * 100;
                              fishingStateRef.current = {
                                ...fishingStateRef.current,
                                fishCount: nextCatches,
                              };
                              setTotalCoinsEarned(nextTotalMoney);
                              setPlayTimeExact(nextSeconds);
                              setAdminRestoreMsg(
                                lang === 'en'
                                  ? '✓ Stats restored and saved to the cloud.'
                                  : '✓ Estadísticas restauradas y guardadas en la nube.'
                              );
                              setAdminRestoreSaved(true);
                              sound.playCelebration();
                            }}
                            className="flex-1 py-1.5 px-2.5 rounded-lg bg-[#ca8a04] hover:bg-[#eab308] text-[#1e1b4b] text-xs font-extrabold cursor-pointer"
                          >
                            {lang === 'en' ? 'Apply stats' : 'Aplicar estadísticas'}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (!isCurrentUserAdmin) return;
                              try {
                                const raw = localStorage.getItem(BACKUP_SAVE_KEY);
                                if (!raw) return;
                                const b = JSON.parse(raw) as Partial<SaveData>;
                                if (typeof b.coins === 'number') {
                                  setCoins(b.coins);
                                  setAdminCoinsInput(String(b.coins));
                                }
                                if (typeof b.fishCount === 'number') {
                                  setFishCount(b.fishCount);
                                  fishingStateRef.current = {
                                    ...fishingStateRef.current,
                                    fishCount: b.fishCount,
                                  };
                                  setAdminCatchesInput(String(b.fishCount));
                                }
                                if (typeof b.totalCoinsEarned === 'number') {
                                  setTotalCoinsEarned(b.totalCoinsEarned);
                                  setAdminTotalMoneyInput(String(b.totalCoinsEarned));
                                }
                                if (typeof b.playTimeSeconds === 'number') {
                                  setPlayTimeExact(b.playTimeSeconds);
                                  setAdminMinutesInput(String(Math.floor(b.playTimeSeconds / 60)));
                                }
                                if (
                                  typeof b.totalXp === 'number' ||
                                  typeof b.level === 'number' ||
                                  typeof b.xp === 'number'
                                ) {
                                  const restoredLvl = sanitizeLevelAndXp(
                                    b.level,
                                    b.xp,
                                    b.totalXp
                                  );
                                  totalXpRef.current = restoredLvl.totalXp;
                                  setTotalXp(restoredLvl.totalXp);
                                }
                                if (b.discoveredFish) setDiscoveredFish(b.discoveredFish);
                                if (b.maxFishWeights) {
                                  setMaxFishWeights(
                                    sanitizeMaxFishWeights(b.maxFishWeights)
                                  );
                                }
                                if (b.ownedCosmetics) setOwnedCosmetics(b.ownedCosmetics);
                                if (b.equippedCosmetics) setEquippedCosmetics(b.equippedCosmetics);
                                if (typeof b.backpackCapacity === 'number') {
                                  setBackpackCapacity(b.backpackCapacity);
                                }
                                if (b.claimedIndexRewards) {
                                  setClaimedIndexRewards(b.claimedIndexRewards);
                                }
                                if (b.claimedLevelRewards) {
                                  setClaimedLevelRewards(
                                    sanitizeClaimedLevelRewards(
                                      b.claimedLevelRewards
                                    )
                                  );
                                }
                                if (Array.isArray(b.catchHistory)) {
                                  setCatchHistory(sanitizeCatchHistory(b.catchHistory));
                                }
                                if (typeof b.underworldUnlocked === 'boolean') {
                                  setUnderworldUnlocked(b.underworldUnlocked);
                                  localStorage.setItem(
                                    'ice_fishing_underworld_unlocked',
                                    b.underworldUnlocked ? '1' : '0'
                                  );
                                }
                                const restoredTutorialStep = resolveInitialTutorialStep({
                                  tutorialDoneFlag: false,
                                  accountProgress: {
                                    fishCount: b.fishCount,
                                    totalCoinsEarned: b.totalCoinsEarned,
                                    coins: b.coins,
                                    playTimeSeconds: b.playTimeSeconds,
                                    discoveredFish: b.discoveredFish,
                                    ownedCosmetics: b.ownedCosmetics,
                                    catchHistoryLength: b.catchHistory?.length,
                                    hasOgTitle: b.hasOgTitle,
                                    underworldUnlocked: b.underworldUnlocked,
                                  },
                                });
                                setTutorialStep(restoredTutorialStep);
                                if (restoredTutorialStep === 0) {
                                  setMinigameTutorialDone(true);
                                  localStorage.setItem(TUTORIAL_STORAGE_KEY, '1');
                                  localStorage.setItem(MINIGAME_TUTORIAL_STORAGE_KEY, '1');
                                } else {
                                  setMinigameTutorialDone(false);
                                  localStorage.removeItem(TUTORIAL_STORAGE_KEY);
                                  localStorage.removeItem('infinite_catch_tutorial_done');
                                  localStorage.removeItem(MINIGAME_TUTORIAL_STORAGE_KEY);
                                }
                                setAdminRestoreMsg(
                                  lang === 'en'
                                    ? '✓ Full backup restored and saved to the cloud.'
                                    : '✓ Respaldo completo restaurado y guardado en la nube.'
                                );
                                setAdminRestoreSaved(true);
                                sound.playCelebration();
                              } catch {
                                // ignore
                              }
                            }}
                            className="py-1.5 px-2.5 rounded-lg bg-[#7f1d1d] hover:bg-[#991b1b] border border-[#fca5a5]/40 text-[#fecaca] text-xs font-bold cursor-pointer"
                          >
                            {lang === 'en' ? 'Load backup' : 'Cargar respaldo'}
                          </button>
                        </div>
                      </div>
                    )}

                    {adminSectionTab === 'indice' && (
                      <div className="flex flex-col gap-2">
                        <div className="grid grid-cols-2 gap-1.5">
                          <button
                            type="button"
                            data-testid="admin-recover-full-index"
                            onClick={() => {
                              if (!isCurrentUserAdmin) return;
                              setDiscoveredFish((prev) => {
                                const next: Record<number, number> = { ...prev };
                                for (const fish of ALL_FISH) {
                                  next[fish.id] = Math.max(1, next[fish.id] ?? 0);
                                }
                                return next;
                              });
                              setAdminRestoreMsg(
                                lang === 'en'
                                  ? '✓ Full index recovered and saved to the cloud.'
                                  : '✓ Todo el índice recuperado y guardado en la nube.'
                              );
                              setAdminRestoreSaved(true);
                              sound.playCelebration();
                            }}
                            className="py-1.5 px-2 rounded-lg bg-[#0369a1] hover:bg-[#0284c7] text-white text-[11px] font-extrabold cursor-pointer"
                          >
                            {lang === 'en' ? 'Unlock full index' : 'Recuperar todo el índice'}
                          </button>
                          <button
                            type="button"
                            data-testid="admin-mastery-all-fish"
                            onClick={() => {
                              if (!isCurrentUserAdmin) return;
                              setDiscoveredFish((prev) => {
                                const next: Record<number, number> = { ...prev };
                                for (const fish of ALL_FISH) {
                                  next[fish.id] = Math.max(50, next[fish.id] ?? 0);
                                }
                                return next;
                              });
                              setAdminRestoreMsg(
                                lang === 'en'
                                  ? '✓ Mastery (50+) applied to entire index.'
                                  : '✓ Maestría (50+) aplicada a todo el índice.'
                              );
                              setAdminRestoreSaved(true);
                              sound.playCelebration();
                            }}
                            className="py-1.5 px-2 rounded-lg bg-[#a16207] hover:bg-[#ca8a04] text-[#fef9c3] text-[11px] font-extrabold cursor-pointer"
                          >
                            {lang === 'en' ? 'Mastery on all (50+)' : 'Maestría en todos (50+)'}
                          </button>
                        </div>

                        <div className="flex gap-1.5 items-center">
                          <select
                            value={adminMasteryFishId}
                            onChange={(e) => setAdminMasteryFishId(Number(e.target.value))}
                            className="flex-1 min-w-0 px-2 py-1.5 rounded-lg bg-[#2a0606] border border-[#f87171]/50 text-[#fecaca] text-xs font-bold outline-none"
                          >
                            {ALL_FISH.map((p) => {
                              const cnt = discoveredFish[p.id] ?? 0;
                              return (
                                <option key={p.id} value={p.id}>
                                  {p.id >= 101 ? '🔥' : '🐟'} {getFishName(p.id, lang)} ({cnt}/50
                                  {cnt >= 50 ? ' ★' : ''})
                                </option>
                              );
                            })}
                          </select>
                          <button
                            type="button"
                            data-testid="admin-give-fish-mastery"
                            onClick={() => {
                              if (!isCurrentUserAdmin) return;
                              const target = ALL_FISH.find((f) => f.id === adminMasteryFishId);
                              const prevCount = discoveredFish[adminMasteryFishId] ?? 0;
                              setDiscoveredFish((prev) => ({
                                ...prev,
                                [adminMasteryFishId]: Math.max(50, prev[adminMasteryFishId] ?? 0),
                              }));
                              const targetName = target
                                ? getFishName(target.id, lang)
                                : lang === 'en'
                                  ? 'fish'
                                  : 'pez';
                              setAdminRestoreMsg(
                                lang === 'en'
                                  ? `✓ Mastery (50+) granted to ${targetName}.`
                                  : `✓ Maestría (50+) aplicada a ${targetName}.`
                              );
                              setAdminRestoreSaved(true);
                              if (target && prevCount < 50) {
                                triggerMasteryCelebration(target);
                              } else {
                                sound.playCelebration();
                              }
                            }}
                            className="px-2.5 py-1.5 rounded-lg bg-[#eab308] hover:bg-[#facc15] text-[#451a03] text-[11px] font-extrabold cursor-pointer shrink-0"
                          >
                            {lang === 'en' ? 'Grant Mastery (50+)' : 'Dar Maestría (50+)'}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (!isCurrentUserAdmin) return;
                              const target = ALL_FISH.find((f) => f.id === adminMasteryFishId);
                              setDiscoveredFish((prev) => ({
                                ...prev,
                                [adminMasteryFishId]: Math.max(1, prev[adminMasteryFishId] ?? 0),
                              }));
                              const targetName = target
                                ? getFishName(target.id, lang)
                                : lang === 'en'
                                  ? 'fish'
                                  : 'pez';
                              setAdminRestoreMsg(
                                lang === 'en'
                                  ? `✓ Discovered in index: ${targetName}.`
                                  : `✓ Descubierto en el índice: ${targetName}.`
                              );
                              setAdminRestoreSaved(true);
                              sound.playCelebration();
                            }}
                            className="px-2 py-1.5 rounded-lg bg-[#7f1d1d] hover:bg-[#991b1b] border border-[#f87171]/40 text-[#fecaca] text-[11px] font-bold cursor-pointer shrink-0"
                          >
                            1+
                          </button>
                        </div>
                      </div>
                    )}

                    {adminSectionTab === 'invocar' && (
                      <div className="flex flex-col gap-2">
                        <div className="text-[10px] font-extrabold uppercase tracking-wider text-[#fca5a5]">
                          {lang === 'en' ? 'Test Minigames' : 'Probar Minijuegos'}
                        </div>
                        <div className="grid grid-cols-2 gap-1.5">
                          {rarityOrder.map((rarity) => (
                            <button
                              key={rarity}
                              type="button"
                              onClick={() => {
                                if (!isCurrentUserAdmin) return;
                                const currentPool =
                                  world === 'underworld'
                                    ? UNDERWORLD_POKEMON
                                    : KANTO_SNOW_POKEMON;
                                const pool = currentPool.filter((p) => p.rarity === rarity);
                                const species =
                                  pool[Math.floor(Math.random() * pool.length)] ??
                                  currentPool[0];
                                const rolledW = rollFishWeightKg(species);
                                const testCatch: CaughtPokemon = {
                                  uid: `admin-${Date.now()}-${Math.random()}`,
                                  species,
                                  sellValue: calculateWeightedSellValue(species, rolledW),
                                  weightKg: rolledW,
                                  caughtAt: Date.now(),
                                  variantIndex:
                                    species.id === 103
                                      ? Math.floor(Math.random() * 10)
                                      : undefined,
                                };
                                setActivePanel('none');
                                setActiveMinigame(testCatch);
                              }}
                              className="px-2 py-1.5 rounded-lg bg-[#7f1d1d] hover:bg-[#991b1b] border border-[#ef4444]/60 text-[#fecaca] text-[11px] font-bold cursor-pointer truncate"
                            >
                              {lang === 'en' ? 'Summon' : 'Invocar'} {getRarityName(rarity, lang)}
                            </button>
                          ))}
                        </div>
                        <div className="text-[10px] font-extrabold uppercase tracking-wider text-[#fca5a5] mt-1">
                          {lang === 'en' ? 'Test Animation' : 'Probar Animación'}
                        </div>
                        <div className="grid grid-cols-2 gap-1.5">
                          {rarityOrder.map((rarity) => (
                            <button
                              key={`anim-${rarity}`}
                              type="button"
                              onClick={() => {
                                if (!isCurrentUserAdmin) return;
                                const currentPool =
                                  world === 'underworld'
                                    ? UNDERWORLD_POKEMON
                                    : KANTO_SNOW_POKEMON;
                                const pool = currentPool.filter((p) => p.rarity === rarity);
                                const species =
                                  pool[Math.floor(Math.random() * pool.length)] ??
                                  currentPool[0];
                                const rolledW = rollFishWeightKg(species);
                                const testCatch: CaughtPokemon = {
                                  uid: `admin-anim-${Date.now()}-${Math.random()}`,
                                  species,
                                  sellValue: calculateWeightedSellValue(species, rolledW),
                                  weightKg: rolledW,
                                  caughtAt: Date.now(),
                                  variantIndex:
                                    species.id === 103
                                      ? Math.floor(Math.random() * 10)
                                      : undefined,
                                };
                                fishingStateRef.current = {
                                  ...fishingStateRef.current,
                                  phase: 'CAUGHT',
                                  phaseTimer: 0,
                                };
                                setPhase('CAUGHT');
                                setLastCaught(testCatch);
                                setActivePanel('none');
                              }}
                              className="px-2 py-1.5 rounded-lg bg-[#2a0606] hover:bg-[#7f1d1d] border border-[#f87171]/50 text-[#fecaca] text-[11px] font-bold cursor-pointer truncate"
                            >
                              {lang === 'en' ? 'Anim' : 'Animación'} {getRarityName(rarity, lang)}
                            </button>
                          ))}
                        </div>
                        <div className="text-[10px] font-extrabold uppercase tracking-wider text-[#fca5a5] mt-1">
                          {lang === 'en' ? 'Summon Specific Fish' : 'Invocar Pez Específico'}
                        </div>
                        <div className="flex gap-1.5">
                          <select
                            value={adminSelectedFishId}
                            onChange={(e) => setAdminSelectedFishId(Number(e.target.value))}
                            className="flex-1 min-w-0 px-2 py-1.5 rounded-lg bg-[#2a0606] border border-[#f87171]/50 text-[#fecaca] text-xs font-bold outline-none"
                          >
                            {ALL_FISH.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.id >= 101 ? '🔥 ' : '🐟 '} {getFishName(p.id, lang)} ({getRarityName(p.rarity, lang)})
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            onClick={() => {
                              if (!isCurrentUserAdmin) return;
                              const species =
                                ALL_FISH.find((p) => p.id === adminSelectedFishId) ??
                                ALL_FISH[0];
                              const rolledW = rollFishWeightKg(species);
                              const testCatch: CaughtPokemon = {
                                uid: `admin-fish-${Date.now()}-${Math.random()}`,
                                species,
                                sellValue: calculateWeightedSellValue(species, rolledW),
                                weightKg: rolledW,
                                caughtAt: Date.now(),
                                variantIndex:
                                  species.id === 103
                                    ? Math.floor(Math.random() * 10)
                                    : undefined,
                              };
                              const nextCount = fishingStateRef.current.fishCount + 1;
                              fishingStateRef.current = {
                                ...fishingStateRef.current,
                                phase: 'CAUGHT',
                                phaseTimer: 0,
                                fishCount: nextCount,
                              };
                              setPhase('CAUGHT');
                              setFishCount(nextCount);
                              setLastCaught(testCatch);
                              setInventory((prev) => [testCatch, ...prev]);
                              setCatchHistory((prev) =>
                                [toCatchHistoryEntry(testCatch), ...prev].slice(0, 10)
                              );
                              setDiscoveredFish((prev) => ({
                                ...prev,
                                [species.id]: (prev[species.id] ?? 0) + 1,
                              }));
                              setActivePanel('none');
                            }}
                            className="px-3 py-1.5 rounded-lg bg-[#991b1b] hover:bg-[#b91c1c] border border-[#ef4444] text-white text-xs font-bold cursor-pointer shrink-0"
                          >
                            {lang === 'en' ? 'Summon' : 'Invocar'}
                          </button>
                        </div>
                      </div>
                    )}

                    {adminSectionTab === 'suerte' && (
                      <div className="flex flex-col gap-2.5">
                        {/* Current Luck Status */}
                        <div className="p-2.5 rounded-lg bg-[#2a0606] border border-[#f87171]/40 flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xl">🍀</span>
                            <div>
                              <div className="text-[11px] font-bold uppercase tracking-wider text-[#fecaca]">
                                {lang === 'en' ? 'Luck Status' : 'Estado de Suerte'}
                              </div>
                              <div className="text-xs font-display font-extrabold text-[#fde047]">
                                {luckSecondsLeft > 0
                                  ? lang === 'en'
                                    ? `Active: Luck x${activeLuckMultiplier}`
                                    : `Activo: Suerte x${activeLuckMultiplier}`
                                  : lang === 'en'
                                    ? 'Inactive: Normal Luck (x1)'
                                    : 'Inactivo: Suerte Normal (x1)'}
                              </div>
                            </div>
                          </div>
                          {luckSecondsLeft > 0 ? (
                            <div className="text-right">
                              <span className="px-2 py-0.5 rounded bg-[#15803d] text-white text-[11px] font-mono font-bold">
                                {formatLuckTimeRemaining(luckSecondsLeft)}
                              </span>
                            </div>
                          ) : (
                            <span className="text-[11px] font-bold text-[#fca5a5]">
                              {lang === 'en' ? 'No boost' : 'Sin boost'}
                            </span>
                          )}
                        </div>

                        {/* Inputs: Multiplier & Duration */}
                        <div className="grid grid-cols-2 gap-2 text-[11px]">
                          <label className="flex flex-col gap-0.5 text-[#fecaca]">
                            <span>
                              {lang === 'en'
                                ? 'Multiplier (e.g. 10, 50, 100)'
                                : 'Multiplicador (ej: 10, 50, 100)'}
                            </span>
                            <div className="flex items-center bg-[#2a0606] border border-[#f87171]/50 rounded overflow-hidden">
                              <span className="pl-2 pr-1 text-[#fde047] font-bold">x</span>
                              <input
                                type="number"
                                min={1}
                                max={100000}
                                step={1}
                                value={adminLuckMultField}
                                onChange={(e) => setAdminLuckMultField(e.target.value)}
                                className="w-full px-1 py-1 bg-transparent text-white font-bold outline-none"
                              />
                            </div>
                          </label>

                          <label className="flex flex-col gap-0.5 text-[#fecaca]">
                            <span>
                              {lang === 'en'
                                ? 'Duration (e.g. 30m, 1h, 24h, max)'
                                : 'Duración (ej: 30m, 1h, 24h, max)'}
                            </span>
                            <input
                              type="text"
                              value={adminLuckDurationField}
                              onChange={(e) => setAdminLuckDurationField(e.target.value)}
                              placeholder="1h / 30m / max"
                              className="px-2 py-1 rounded bg-[#2a0606] border border-[#f87171]/50 text-white font-bold outline-none"
                            />
                          </label>
                        </div>

                        {/* Quick Presets */}
                        <div className="flex flex-col gap-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-[#fca5a5]">
                            {lang === 'en' ? 'Quick Luck Presets:' : 'Atajos Rápidos de Suerte:'}
                          </span>
                          <div className="grid grid-cols-5 gap-1">
                            {[
                              { label: 'x5 · 15m', mult: 5, dur: '15m' },
                              { label: 'x10 · 30m', mult: 10, dur: '30m' },
                              { label: 'x50 · 1h', mult: 50, dur: '1h' },
                              { label: 'x100 · 24h', mult: 100, dur: '24h' },
                              { label: 'x1000 · Max', mult: 1000, dur: 'max' },
                            ].map((preset) => (
                              <button
                                key={preset.label}
                                type="button"
                                onClick={() => {
                                  if (!isCurrentUserAdmin) return;
                                  setAdminLuckMultField(String(preset.mult));
                                  setAdminLuckDurationField(preset.dur);
                                  const cmd = `/${lang === 'en' ? 'luck' : 'suerte'} ${preset.mult} ${preset.dur}`;
                                  const res = executeAdminLuckCommand(cmd);
                                  setAdminRestoreSaved(true);
                                  setAdminRestoreMsg(res.message);
                                }}
                                className="py-1 px-1 rounded bg-[#3b0a0a] hover:bg-[#5c0d0d] border border-[#ef4444]/60 text-[10px] font-bold text-[#fef08a] cursor-pointer text-center whitespace-nowrap"
                              >
                                {preset.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => {
                              if (!isCurrentUserAdmin) return;
                              const cmd = `/${lang === 'en' ? 'luck' : 'suerte'} ${adminLuckMultField} ${adminLuckDurationField}`;
                              const res = executeAdminLuckCommand(cmd);
                              setAdminRestoreSaved(true);
                              setAdminRestoreMsg(res.message);
                            }}
                            className="flex-1 py-1.5 px-3 rounded-lg bg-[#b91c1c] hover:bg-[#dc2626] border border-[#f87171] text-white text-xs font-extrabold cursor-pointer text-center"
                          >
                            {lang === 'en'
                              ? '⚡ Activate Custom Luck'
                              : '⚡ Activar Suerte Personalizada'}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (!isCurrentUserAdmin) return;
                              const res = executeAdminLuckCommand('/luck reset');
                              setAdminRestoreSaved(true);
                              setAdminRestoreMsg(res.message);
                            }}
                            className="py-1.5 px-3 rounded-lg bg-[#3b0a0a] hover:bg-[#5c0d0d] border border-[#ef4444]/60 text-[#fca5a5] text-xs font-bold cursor-pointer"
                          >
                            {lang === 'en' ? 'Disable' : 'Desactivar'}
                          </button>
                        </div>

                        {/* Direct console command */}
                        <div className="pt-2 border-t border-[#dc2626]/30 flex flex-col gap-1.5">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-[#fca5a5] flex items-center justify-between">
                            <span>{lang === 'en' ? 'Console command' : 'Comando de consola'}</span>
                            <span className="text-[#fde047] lowercase font-mono">
                              {lang === 'en' ? '/ or F2 key' : 'tecla / o F2'}
                            </span>
                          </span>
                          <div className="flex items-center gap-1.5">
                            <input
                              type="text"
                              value={adminCommandInput}
                              onChange={(e) => setAdminCommandInput(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  const res = executeAdminLuckCommand(adminCommandInput);
                                  setAdminRestoreSaved(true);
                                  setAdminRestoreMsg(res.message);
                                }
                              }}
                              placeholder={
                                lang === 'en'
                                  ? '/luck <multiplier> <time>'
                                  : '/suerte <multiplicador> <tiempo>'
                              }
                              className="flex-1 px-2.5 py-1.5 rounded-lg bg-[#1a0505] border border-[#ef4444]/50 text-white font-mono text-xs outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const res = executeAdminLuckCommand(adminCommandInput);
                                setAdminRestoreSaved(true);
                                setAdminRestoreMsg(res.message);
                              }}
                              className="px-3 py-1.5 rounded-lg bg-[#ca8a04] hover:bg-[#eab308] text-[#1e1b4b] text-xs font-extrabold cursor-pointer shrink-0"
                            >
                              {lang === 'en' ? 'Run' : 'Ejecutar'}
                            </button>
                          </div>
                          <button
                            type="button"
                            onClick={() => setShowAdminCommandModal(true)}
                            className="w-full py-1 text-center text-[11px] font-bold text-[#fde047] hover:underline cursor-pointer flex items-center justify-center gap-1.5"
                          >
                            <Terminal className="w-3.5 h-3.5" />
                            <span>
                              {lang === 'en'
                                ? 'Open Floating Command Console'
                                : 'Abrir Consola Flotante de Comandos'}
                            </span>
                          </button>
                        </div>
                      </div>
                    )}

                    {adminRestoreSaved && (
                      <span className="text-[11px] font-bold text-[#fde047]">
                        {adminRestoreMsg ||
                          (lang === 'en'
                            ? '✓ Changes applied and saved to the cloud.'
                            : '✓ Cambios aplicados y guardados en la nube.')}
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}
            </div>
          </div>
        </div>
      )}

      {/* DAILY QUESTS MODAL */}
      {mode === 'playing' && activePanel === 'quests' && (() => {
        const currentDaily = ensureDailyQuestsCurrent(dailyQuests);
        const completedCount = currentDaily.quests.filter((q) => q.claimed).length;
        const resetMs = getMsUntilNextDailyReset();
        const resetHours = Math.floor(resetMs / 3_600_000);
        const resetMins = Math.floor((resetMs % 3_600_000) / 60_000);

        return (
          <div className="fixed inset-0 bg-[#0f2942]/65 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 z-30 animate-ui-backdrop">
            <div
              data-testid="daily-quests-modal"
              className="w-full max-w-lg max-h-[90vh] rounded-2xl bg-[#f8fafc] border-2 border-[#f59e0b] shadow-2xl flex flex-col overflow-hidden animate-ui-modal-in"
            >
              <div className="px-5 py-4 bg-gradient-to-r from-[#0f172a] via-[#1e293b] to-[#0f172a] text-white flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#fbbf24] to-[#d97706] text-[#1e1b4b] flex items-center justify-center shadow-md shrink-0">
                    <ScrollText className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="font-display font-extrabold text-lg sm:text-xl leading-tight">
                      {lang === 'en' ? 'Daily Quests' : 'Misiones Diarias'}
                    </h2>
                    <p className="text-[11px] font-semibold text-[#cbd5e1] flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-[#fbbf24] shrink-0" />
                      <span>
                        {lang === 'en'
                          ? `Resets in ${resetHours}h ${String(resetMins).padStart(2, '0')}m`
                          : `Se reinician en ${resetHours}h ${String(resetMins).padStart(2, '0')}m`}
                      </span>
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="px-2.5 py-1 rounded-lg bg-white/10 border border-white/20 text-xs font-extrabold text-[#fde047] tabular-nums">
                    {completedCount}/{currentDaily.quests.length}
                  </span>
                  <button
                    type="button"
                    onClick={closeActivePanel}
                    aria-label={lang === 'en' ? 'Close' : 'Cerrar'}
                    className="w-9 h-9 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="p-4 sm:p-5 flex-1 overflow-y-auto flex flex-col gap-3">
                {questClaimBanner && (
                  <div
                    data-testid="quest-claim-banner"
                    className="rounded-xl bg-gradient-to-r from-[#dcfce7] to-[#bbf7d0] border border-[#22c55e] px-3.5 py-2.5 text-xs font-extrabold text-[#166534] flex items-center gap-2 shadow-sm"
                  >
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-[#16a34a]" />
                    <span>{questClaimBanner}</span>
                  </div>
                )}

                {currentDaily.quests.map((q) => {
                  const pct = Math.min(100, Math.round((q.progress / Math.max(1, q.target)) * 100));
                  const isReady = q.progress >= q.target && !q.claimed;
                  const isHard = q.difficulty === 'hard';

                  return (
                    <div
                      key={q.id}
                      data-testid={`daily-quest-${q.id}`}
                      className={`rounded-2xl border-2 p-4 flex flex-col gap-3 transition-all ${
                        q.claimed
                          ? 'bg-[#f1f5f9] border-[#cbd5e1] opacity-75'
                          : isHard
                            ? 'bg-gradient-to-br from-[#fffbeb] via-[#fef3c7]/60 to-[#fff7ed] border-[#f59e0b] shadow-md'
                            : 'bg-white border-[#e2e8f0] shadow-sm'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex flex-col gap-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span
                              className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider inline-flex items-center gap-1 ${
                                isHard
                                  ? 'bg-gradient-to-r from-[#dc2626] to-[#ea580c] text-white'
                                  : q.difficulty === 'medium'
                                    ? 'bg-[#e0f2fe] text-[#0369a1]'
                                    : 'bg-[#dcfce7] text-[#15803d]'
                              }`}
                            >
                              {isHard && <Flame className="w-3 h-3" />}
                              {isHard
                                ? lang === 'en'
                                  ? 'Hard Challenge'
                                  : 'Misión Difícil'
                                : q.difficulty === 'medium'
                                  ? lang === 'en'
                                    ? 'Medium'
                                    : 'Media'
                                  : lang === 'en'
                                    ? 'Daily'
                                    : 'Diaria'}
                            </span>
                            <span className="font-display font-extrabold text-sm text-[#0f2942]">
                              {lang === 'en' ? q.titleEn : q.titleEs}
                            </span>
                          </div>
                          <p className="text-xs font-semibold text-[#475569]">
                            {lang === 'en' ? q.descEn : q.descEs}
                          </p>
                        </div>

                        <button
                          type="button"
                          data-testid={`claim-quest-${q.id}`}
                          disabled={!isReady}
                          onClick={() => handleClaimDailyQuest(q.id)}
                          className={`px-3.5 py-2 rounded-xl font-display font-extrabold text-xs shrink-0 transition-all ${
                            q.claimed
                              ? 'bg-[#e2e8f0] text-[#64748b] cursor-default'
                              : isReady
                                ? 'bg-gradient-to-b from-[#22c55e] to-[#16a34a] hover:brightness-110 text-white shadow-md active:scale-95 cursor-pointer ring-2 ring-[#86efac]'
                                : 'bg-[#e2e8f0] text-[#94a3b8] cursor-not-allowed'
                          }`}
                        >
                          {q.claimed
                            ? lang === 'en'
                              ? 'Claimed'
                              : 'Reclamada'
                            : isReady
                              ? lang === 'en'
                                ? 'Claim'
                                : 'Reclamar'
                              : lang === 'en'
                                ? 'In Progress'
                                : 'En curso'}
                        </button>
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center justify-between text-[11px] font-bold">
                          <span className="text-[#475569] tabular-nums">
                            {formatQuestProgressLabel(q, lang)}
                          </span>
                          <span className="text-[#0f2942] tabular-nums">{pct}%</span>
                        </div>
                        <div className="w-full h-2.5 rounded-full bg-[#e2e8f0] overflow-hidden">
                          <div
                            className={`h-full transition-all duration-300 ${
                              q.claimed
                                ? 'bg-[#94a3b8]'
                                : isHard
                                  ? 'bg-gradient-to-r from-[#f59e0b] to-[#ea580c]'
                                  : 'bg-gradient-to-r from-[#38bdf8] to-[#0284c7]'
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap pt-0.5">
                        <span className="text-[11px] font-bold text-[#64748b]">
                          {lang === 'en' ? 'Reward:' : 'Recompensa:'}
                        </span>
                        {q.rewardCoins > 0 && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-[#fef9c3] border border-[#fde047] text-[11px] font-extrabold text-[#92400e] tabular-nums">
                            <CoinIcon size={14} />
                            +{formatNumber(q.rewardCoins, lang)}
                          </span>
                        )}
                        {q.rewardLuckDurationMs && q.rewardLuckMultiplier && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-[#dcfce7] border border-[#4ade80] text-[11px] font-extrabold text-[#166534]">
                            🍀 {lang === 'en' ? 'Luck' : 'Suerte'} x{q.rewardLuckMultiplier} (
                            {Math.round(q.rewardLuckDurationMs / 60_000)}m)
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })()}

      {/* REWARD ROAD MODAL (CAMINO DE RECOMPENSAS NIVEL 1 A 20) */}
      {mode === 'playing' && activePanel === 'rewards' && (() => {
        const claimedTotal = REWARD_ROAD_MILESTONES.filter(
          (m) => Boolean(claimedLevelRewards[m.level])
        ).length;
        const unlockedTotal = REWARD_ROAD_MILESTONES.filter(
          (m) => levelProgress.level >= m.level
        ).length;
        const levelPct = Math.min(
          100,
          Math.max(0, Math.round(levelProgress.progressRatio * 100))
        );

        return (
          <div
            onClick={closeActivePanel}
            className="fixed inset-0 bg-[#0f2942]/65 backdrop-blur-sm flex items-center justify-center p-2.5 sm:p-5 z-30 animate-ui-backdrop"
          >
            <div
              data-testid="reward-road-modal"
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-xl max-h-[88vh] rounded-2xl bg-[#f8fafc] border-2 border-[#6366f1] shadow-2xl flex flex-col overflow-hidden animate-ui-modal-in"
            >
              {/* Modal Header */}
              <div className="px-4 sm:px-5 py-3 bg-gradient-to-r from-[#1e1b4b] via-[#312e81] to-[#1e1b4b] text-white flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#818cf8] to-[#4f46e5] text-white flex items-center justify-center shadow-md shrink-0 border border-white/25">
                    <Trophy className="w-5 h-5 text-[#fde047]" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="font-display font-extrabold text-base sm:text-lg leading-tight truncate">
                      {lang === 'en'
                        ? 'Reward Road · Levels 1–20'
                        : 'Camino de Recompensas · Niveles 1–20'}
                    </h2>
                    <p className="text-[11px] font-semibold text-[#c7d2fe] truncate">
                      {lang === 'en'
                        ? 'Lv. 10 unlocks Mini Demon & Underworld · Lv. 20 Legend Crown'
                        : 'Nv. 10 desbloquea Mini Demonio e Inframundo · Nv. 20 Corona Leyenda'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="px-2.5 py-1 rounded-lg bg-white/10 border border-white/20 text-xs font-extrabold text-[#fde047] tabular-nums">
                    {claimedTotal}/{REWARD_ROAD_MILESTONES.length}
                  </span>
                  <button
                    type="button"
                    data-testid="close-reward-road-btn"
                    onClick={closeActivePanel}
                    aria-label={lang === 'en' ? 'Close' : 'Cerrar'}
                    className="w-9 h-9 rounded-lg bg-white/10 hover:bg-white/20 active:scale-95 flex items-center justify-center text-white cursor-pointer transition-transform"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Current Player Level & XP Summary Bar */}
              <div className="px-4 sm:px-5 py-2.5 bg-gradient-to-b from-[#eef2ff] to-[#e0e7ff] border-b border-[#c7d2fe] flex flex-col gap-1.5">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-[#312e81] text-white font-display font-extrabold text-xs sm:text-sm tabular-nums shadow-sm">
                      <Star className="w-3.5 h-3.5 text-[#fde047] fill-[#fde047]" />
                      {lang === 'en'
                        ? `LV ${levelProgress.level}`
                        : `NV ${levelProgress.level}`}
                    </span>
                    <span className="text-xs font-extrabold text-[#3730a3] tabular-nums">
                      {formatNumber(levelProgress.currentLevelXp, lang)} /{' '}
                      {formatNumber(levelProgress.xpForNextLevel, lang)} XP ({levelPct}%)
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-[#4338ca] tabular-nums">
                      {lang === 'en'
                        ? `${unlockedTotal}/20 unlocked`
                        : `${unlockedTotal}/20 desbloqueados`}
                    </span>
                    {unclaimedLevelRewardsCount > 0 && (
                      <button
                        type="button"
                        data-testid="claim-all-level-rewards-btn"
                        onClick={handleClaimAllLevelRewards}
                        className="px-3 py-1 rounded-lg bg-[#16a34a] hover:bg-[#15803d] active:scale-95 text-white font-display font-extrabold text-xs cursor-pointer shadow-sm transition-transform"
                      >
                        {lang === 'en'
                          ? `Claim All (${unclaimedLevelRewardsCount})`
                          : `Reclamar todo (${unclaimedLevelRewardsCount})`}
                      </button>
                    )}
                  </div>
                </div>

                <div className="w-full h-2 rounded-full bg-[#c7d2fe] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#6366f1] via-[#4f46e5] to-[#3730a3] transition-all duration-300"
                    style={{ width: `${levelPct}%` }}
                  />
                </div>
              </div>

              {rewardRoadBanner && (
                <div
                  data-testid="reward-road-claim-banner"
                  className="mx-4 mt-2.5 px-3 py-1.5 rounded-xl bg-[#dcfce7] border border-[#22c55e] text-[#14532d] text-xs font-extrabold flex items-center justify-between gap-2"
                >
                  <span className="truncate">{rewardRoadBanner}</span>
                  <button
                    type="button"
                    onClick={() => setRewardRoadBanner('')}
                    className="text-[#166534] hover:underline text-[11px] cursor-pointer shrink-0"
                  >
                    OK
                  </button>
                </div>
              )}

              {/* Ordered 20-Level Milestones List (Visual, low-text, mobile/desktop friendly) */}
              <div
                data-testid="reward-road-list"
                className="p-3.5 sm:p-4 overflow-y-auto flex flex-col gap-2.5"
              >
                {REWARD_ROAD_MILESTONES.map((milestone, idx) => {
                  const status = getRewardRoadStatus(
                    milestone.level,
                    levelProgress.level,
                    claimedLevelRewards
                  );
                  const isCurrentLevel = milestone.level === levelProgress.level;
                  const isNextTarget = milestone.level === levelProgress.level + 1;
                  const xpNeededForThis = getXpRequiredForLevel(milestone.level);
                  const isLast = idx === REWARD_ROAD_MILESTONES.length - 1;
                  const isUnderworldMilestone = Boolean(milestone.unlocksUnderworld);
                  const isMajor = Boolean(milestone.isMajorMilestone);

                  return (
                    <div
                      key={milestone.level}
                      data-testid={`reward-road-item-${milestone.level}`}
                      data-status={status}
                      className="relative flex items-stretch gap-2.5"
                    >
                      {/* Left Road Node & Connector Line */}
                      <div className="flex flex-col items-center shrink-0 w-10">
                        <div
                          className={`w-9 h-9 rounded-xl flex flex-col items-center justify-center font-display font-extrabold text-xs tabular-nums border-2 shadow-sm ${
                            status === 'claimed'
                              ? 'bg-gradient-to-br from-[#dcfce7] to-[#bbf7d0] border-[#22c55e] text-[#15803d]'
                              : status === 'claimable'
                                ? 'bg-gradient-to-br from-[#fde047] via-[#f59e0b] to-[#d97706] border-[#fef08a] text-[#1e1b4b] shadow-[0_0_12px_rgba(245,158,11,0.45)]'
                                : isUnderworldMilestone
                                  ? 'bg-gradient-to-br from-[#7f1d1d] to-[#450a0a] border-[#ef4444] text-[#fecaca]'
                                  : isMajor
                                    ? 'bg-gradient-to-br from-[#e0e7ff] to-[#c7d2fe] border-[#6366f1] text-[#312e81]'
                                    : 'bg-[#e2e8f0] border-[#cbd5e1] text-[#64748b]'
                          }`}
                        >
                          <span className="text-[8px] uppercase leading-none opacity-80">
                            {lang === 'en' ? 'LV' : 'NV'}
                          </span>
                          <span className="text-xs leading-tight">
                            {milestone.level}
                          </span>
                        </div>
                        {!isLast && (
                          <div
                            className={`w-1 flex-1 my-0.5 rounded-full ${
                              levelProgress.level > milestone.level
                                ? 'bg-gradient-to-b from-[#6366f1] to-[#4f46e5]'
                                : 'bg-[#cbd5e1]'
                            }`}
                          />
                        )}
                      </div>

                      {/* Compact Visual Milestone Card */}
                      <div
                        className={`flex-1 min-w-0 px-3 py-2.5 rounded-xl border-2 transition-all flex items-center justify-between gap-2.5 ${
                          status === 'claimed'
                            ? 'bg-gradient-to-r from-[#f0fdf4] to-[#dcfce7]/50 border-[#86efac]'
                            : status === 'claimable'
                              ? 'bg-gradient-to-r from-[#fffbeb] via-[#fef3c7]/70 to-[#fffbeb] border-[#f59e0b] shadow-md'
                              : isUnderworldMilestone
                                ? 'bg-gradient-to-r from-[#fff1f2] to-[#ffe4e6] border-[#f87171]'
                                : isMajor || isCurrentLevel || isNextTarget
                                  ? 'bg-gradient-to-r from-[#eef2ff]/70 to-white border-[#818cf8] shadow-sm'
                                  : 'bg-white/90 border-[#cbd5e1]'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            data-testid={`reward-badge-${milestone.level}`}
                            data-badge-type={milestone.badgeType}
                            className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border-2 shadow-inner ${
                              status === 'claimed'
                                ? 'bg-[#dcfce7] border-[#4ade80]'
                                : status === 'claimable'
                                  ? 'bg-gradient-to-br from-[#fef9c3] to-[#fde68a] border-[#f59e0b]'
                                  : isUnderworldMilestone
                                    ? 'bg-[#fee2e2] border-[#f87171]'
                                    : isMajor
                                      ? 'bg-[#e0e7ff] border-[#818cf8]'
                                      : 'bg-[#f1f5f9] border-[#cbd5e1]'
                            }`}
                          >
                            <RewardRoadBadgeSvg badgeType={milestone.badgeType} />
                          </div>

                          <div className="min-w-0 flex flex-col gap-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <h3 className="font-display font-extrabold text-xs sm:text-sm text-[#0f2942] leading-tight truncate">
                                {lang === 'en' ? milestone.titleEn : milestone.titleEs}
                              </h3>
                              {isCurrentLevel && (
                                <span className="px-1.5 py-0.5 rounded bg-[#e0e7ff] border border-[#818cf8] text-[#312e81] font-extrabold text-[9px] uppercase">
                                  {lang === 'en' ? 'Current' : 'Actual'}
                                </span>
                              )}
                              <span className="text-[10px] font-bold text-[#64748b] tabular-nums">
                                · {formatNumber(xpNeededForThis, lang)} XP
                              </span>
                            </div>

                            {/* Visual Reward Chips */}
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {milestone.coins > 0 && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#fef9c3] border border-[#fde047] text-[11px] font-extrabold text-[#92400e] tabular-nums">
                                  <CoinIcon size={12} />
                                  +{formatNumber(milestone.coins, lang)}
                                </span>
                              )}
                              {milestone.luckMultiplier && milestone.luckDurationMs && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#dcfce7] border border-[#4ade80] text-[11px] font-extrabold text-[#166534]">
                                  🍀 x{milestone.luckMultiplier} (
                                  {Math.round(milestone.luckDurationMs / 60_000)}m)
                                </span>
                              )}
                              {milestone.baitId && milestone.baitCount && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#e0e7ff] border border-[#818cf8] text-[11px] font-extrabold text-[#312e81]">
                                  🪱 x{milestone.baitCount}{' '}
                                  {lang === 'en'
                                    ? milestone.baitLabelEn || 'Bait'
                                    : milestone.baitLabelEs || 'Cebo'}
                                </span>
                              )}
                              {milestone.unlocksUnderworld && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#450a0a] border border-[#ef4444] text-[11px] font-extrabold text-[#fde047]">
                                  😈{' '}
                                  {lang === 'en'
                                    ? 'Mini Demon · Underworld'
                                    : 'Mini Demonio · Inframundo'}
                                </span>
                              )}
                              {(milestone.perkLabelEs || milestone.perkLabelEn) && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#fae8ff] border border-[#d946ef] text-[11px] font-extrabold text-[#701a75]">
                                  {lang === 'en'
                                    ? milestone.perkLabelEn
                                    : milestone.perkLabelEs}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Claim / Status Action */}
                        <div className="shrink-0">
                          {status === 'claimed' ? (
                            <span
                              data-testid={`reward-claimed-badge-${milestone.level}`}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#dcfce7] border border-[#4ade80] text-[#15803d] text-xs font-extrabold"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">
                                {lang === 'en' ? 'Claimed' : 'Reclamado'}
                              </span>
                            </span>
                          ) : status === 'claimable' ? (
                            <button
                              type="button"
                              data-testid={`claim-level-reward-${milestone.level}`}
                              onClick={() => handleClaimLevelReward(milestone.level)}
                              className="px-3.5 py-1.5 rounded-xl bg-gradient-to-b from-[#22c55e] to-[#16a34a] hover:from-[#16a34a] hover:to-[#15803d] active:scale-95 text-white font-display font-extrabold text-xs cursor-pointer shadow-md transition-transform"
                            >
                              {lang === 'en' ? 'Claim' : 'Reclamar'}
                            </button>
                          ) : (
                            <span
                              data-testid={`reward-locked-badge-${milestone.level}`}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#f1f5f9] border border-[#cbd5e1] text-[#64748b] text-xs font-bold tabular-nums"
                            >
                              <Lock className="w-3.5 h-3.5" />
                              {lang === 'en'
                                ? `LV ${milestone.level}`
                                : `NV ${milestone.level}`}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })()}

      {/* ÍNDICE DE PESCA MODAL (Diseño limpio, amplio y organizado) */}
      {mode === 'playing' && activePanel === 'index' && (() => {
        const MASTERY_TARGET = 50;
        const isUw = indexTab === 'underworld';
        const currentPool = isUw ? UNDERWORLD_POKEMON : KANTO_SNOW_POKEMON;
        const discoveredCount = currentPool.filter(
          (p) => (discoveredFish[p.id] ?? 0) > 0
        ).length;
        const masteredCount = currentPool.filter(
          (p) => (discoveredFish[p.id] ?? 0) >= MASTERY_TARGET
        ).length;
        const collectionPct = Math.round(
          (discoveredCount / Math.max(1, currentPool.length)) * 100
        );
        const unclaimedFish = currentPool.filter(
          (p) => (discoveredFish[p.id] ?? 0) > 0 && !claimedIndexRewards[p.id]
        );
        const unclaimedCoins = unclaimedFish.length * 50;

        const availableRarities = rarityOrder.filter((r) =>
          currentPool.some((p) => p.rarity === r)
        );
        const activeRarityFilter =
          indexRarityFilter === 'Todas' ||
          availableRarities.includes(indexRarityFilter)
            ? indexRarityFilter
            : 'Todas';
        const visibleRarities =
          activeRarityFilter === 'Todas'
            ? availableRarities
            : [activeRarityFilter];

        const searchNorm = indexSearch.trim().toLowerCase();
        const matchesFilters = (fish: PokemonSpecies) => {
          const count = discoveredFish[fish.id] ?? 0;
          const unlocked = count > 0;
          if (indexStatusFilter === 'discovered' && !unlocked) return false;
          if (indexStatusFilter === 'missing' && unlocked) return false;
          if (searchNorm) {
            if (!unlocked) return false;
            return (
              getFishName(fish.id, lang).toLowerCase().includes(searchNorm) ||
              fish.name.toLowerCase().includes(searchNorm)
            );
          }
          return true;
        };

        const totalShown = visibleRarities.reduce(
          (sum, rarity) =>
            sum +
            currentPool.filter((p) => p.rarity === rarity && matchesFilters(p)).length,
          0
        );

        return (
          <div className="fixed inset-0 bg-[#0f2942]/65 backdrop-blur-[2px] flex items-center justify-center p-3 sm:p-5 z-20 animate-ui-backdrop">
            <div
              className={`w-full max-w-5xl rounded-2xl shadow-2xl flex flex-col max-h-[88vh] overflow-hidden animate-ui-modal-in ${
                isUw
                  ? 'bg-[#140606] border border-[#ef4444]/40 text-[#fef2f2]'
                  : 'bg-[#f8fafc] border border-[#cbd5e1] text-[#0f2942]'
              }`}
            >
              {/* Cabecera limpia y barra de progreso */}
              <div
                className={`shrink-0 px-5 sm:px-6 pt-5 pb-4 border-b ${
                  isUw ? 'border-[#ef4444]/20 bg-[#1a0808]' : 'border-[#e2e8f0] bg-white'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2.5">
                      <h2
                        className={`font-display font-extrabold text-xl sm:text-2xl tracking-tight ${
                          isUw ? 'text-[#fef2f2]' : 'text-[#0f2942]'
                        }`}
                      >
                        {isUw
                          ? lang === 'en'
                            ? 'Fishing Index · Underworld'
                            : 'Índice de Pesca · Inframundo'
                          : lang === 'en'
                            ? 'Fishing Index · Normal River'
                            : 'Índice de Pesca · Río Normal'}
                      </h2>
                    </div>
                    <div
                      data-testid="index-mastery-summary"
                      className={`mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs sm:text-sm tabular-nums ${
                        isUw ? 'text-[#fca5a5]' : 'text-[#64748b]'
                      }`}
                    >
                      <span>
                        <strong className={isUw ? 'text-white' : 'text-[#0f2942]'}>
                          {discoveredCount}/{currentPool.length}
                        </strong>{' '}
                        {lang === 'en'
                          ? `species discovered (${collectionPct}%)`
                          : `especies descubiertas (${collectionPct}%)`}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="inline-flex items-center gap-1">
                        <Medal className="w-3.5 h-3.5 text-[#ca8a04] fill-[#facc15] shrink-0" />
                        <strong className={isUw ? 'text-[#fde68a]' : 'text-[#854d0e]'}>
                          {masteredCount}/{currentPool.length}
                        </strong>{' '}
                        {lang === 'en' ? 'masteries (50+)' : 'maestrías (50+)'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 flex-wrap sm:flex-nowrap shrink-0">
                    {unclaimedCoins > 0 && (
                      <button
                        type="button"
                        data-testid="claim-all-index-btn"
                        onClick={() => {
                          sound.playCelebration();
                          setCoins((c) => c + unclaimedCoins);
                          setTotalCoinsEarned((t) => t + unclaimedCoins);
                          setClaimedIndexRewards((prev) => {
                            const next = { ...prev };
                            for (const fish of unclaimedFish) {
                              next[fish.id] = true;
                            }
                            return next;
                          });
                        }}
                        className="px-3.5 py-2 rounded-xl bg-gradient-to-b from-[#facc15] to-[#eab308] hover:brightness-105 active:scale-[0.98] text-[#451a03] font-display font-extrabold text-xs shadow-sm transition-all cursor-pointer whitespace-nowrap"
                      >
                        {lang === 'en'
                          ? `Claim all (+${formatNumber(unclaimedCoins, lang)} coins)`
                          : `Reclamar todo (+${formatNumber(unclaimedCoins, lang)} monedas)`}
                      </button>
                    )}

                    {tutorialStep === 3 && (
                      <span className="hidden md:inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-gradient-to-r from-[#fef08a] to-[#facc15] text-[#1e1b4b] font-display font-extrabold text-[11px] border border-white shadow-md whitespace-nowrap animate-bounce">
                        <Sparkles className="w-3.5 h-3.5 text-[#b45309] animate-tutorial-sparkle" />
                        {lang === 'en'
                          ? 'Press ✕ to go to Market ➔'
                          : 'Pulsa ✕ para ir al Mercado ➔'}
                      </span>
                    )}

                    <button
                      type="button"
                      data-testid="close-index-btn"
                      onClick={closeActivePanel}
                      aria-label={lang === 'en' ? 'Close index' : 'Cerrar índice'}
                      className={`p-2 rounded-xl transition-colors cursor-pointer ${
                        tutorialStep === 3
                          ? 'bg-[#fef08a] text-[#92400e] ring-2 ring-[#f59e0b] animate-tutorial-glow'
                          : isUw
                            ? 'hover:bg-[#3f1414] text-[#fca5a5]'
                            : 'hover:bg-[#f1f5f9] text-[#475569]'
                      }`}
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Barra de progreso general de la colección */}
                <div
                  className={`mt-3 h-2 w-full rounded-full overflow-hidden ${
                    isUw ? 'bg-[#351010]' : 'bg-[#e2e8f0]'
                  }`}
                >
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      isUw
                        ? 'bg-gradient-to-r from-[#f97316] to-[#ef4444]'
                        : 'bg-gradient-to-r from-[#10b981] to-[#0284c7]'
                    }`}
                    style={{ width: `${collectionPct}%` }}
                  />
                </div>

                {tutorialStep === 3 && (
                  <div
                    data-testid="tutorial-index-card"
                    className="mt-3 rounded-xl bg-gradient-to-r from-[#0f172a] via-[#1e293b] to-[#0f172a] border-2 border-[#fbbf24] px-4 py-3 text-white shadow-[0_8px_22px_rgba(245,158,11,0.35)] flex items-start gap-3 animate-tutorial-glow"
                  >
                    <Sparkles className="w-5 h-5 text-[#facc15] shrink-0 mt-0.5 animate-tutorial-sparkle" />
                    <div className="text-xs leading-relaxed">
                      <div className="font-display font-extrabold text-[#fde047] mb-0.5">
                        {lang === 'en'
                          ? 'Step 3 of 5 · Fishing Index Guide'
                          : 'Paso 3 de 5 · Guía del Índice de Pesca'}
                      </div>
                      <p className="text-slate-200">
                        {lang === 'en' ? (
                          <>
                            Here you can see every species in the river, their rarity, and drop odds (<strong className="text-white">1 in X</strong>). Claim <strong className="text-[#fde047]">+50 coins</strong> for each new species and reach 50 catches for its Mastery Medal. Press <strong className="text-[#fde047]">✕</strong> above to continue.
                          </>
                        ) : (
                          <>
                            Aquí ves todas las especies del río, su rareza y probabilidad (<strong className="text-white">1 entre X</strong>). Reclama <strong className="text-[#fde047]">+50 monedas</strong> por cada especie nueva y consigue 50 capturas para su Medalla de Maestría. Pulsa <strong className="text-[#fde047]">✕</strong> arriba para continuar.
                          </>
                        )}
                      </p>
                    </div>
                  </div>
                )}

                {/* Barra de controles: Mundos + Estado + Buscador */}
                <div className="mt-3.5 flex flex-wrap items-center justify-between gap-2.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <div
                      className={`inline-flex p-1 rounded-xl ${
                        isUw ? 'bg-[#2b0d0d]' : 'bg-[#f1f5f9]'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => setIndexTab('river')}
                        className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                          !isUw
                            ? 'bg-white text-[#0f2942] shadow-xs'
                            : 'text-[#fca5a5] hover:text-white'
                        }`}
                      >
                        🌲 {t('riverNormal', lang)} ({KANTO_SNOW_POKEMON.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setIndexTab('underworld')}
                        className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                          isUw
                            ? 'bg-[#dc2626] text-white shadow-xs'
                            : 'text-[#991b1b] hover:bg-[#fee2e2]/70'
                        }`}
                      >
                        🔥 {t('underworld', lang)} ({UNDERWORLD_POKEMON.length})
                      </button>
                    </div>

                    <div
                      className={`inline-flex p-1 rounded-xl ${
                        isUw ? 'bg-[#2b0d0d]' : 'bg-[#f1f5f9]'
                      }`}
                    >
                      {(
                        [
                          { id: 'all', label: lang === 'en' ? 'All' : 'Todos' },
                          { id: 'discovered', label: lang === 'en' ? 'Discovered' : 'Descubiertos' },
                          { id: 'missing', label: lang === 'en' ? 'Missing' : 'Faltantes' },
                        ] as const
                      ).map((st) => (
                        <button
                          key={st.id}
                          type="button"
                          onClick={() => setIndexStatusFilter(st.id)}
                          className={`px-2.5 py-1.5 rounded-lg font-bold text-xs transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                            indexStatusFilter === st.id
                              ? isUw
                                ? 'bg-[#7f1d1d] text-white shadow-xs'
                                : 'bg-white text-[#0f2942] shadow-xs'
                              : isUw
                                ? 'text-[#fca5a5]/80 hover:text-white'
                                : 'text-[#64748b] hover:text-[#0f2942]'
                          }`}
                        >
                          {st.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Buscador limpio */}
                  <div className="relative w-full sm:w-56">
                    <Search
                      className={`w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none ${
                        isUw ? 'text-[#fca5a5]/70' : 'text-[#94a3b8]'
                      }`}
                    />
                    <input
                      type="text"
                      value={indexSearch}
                      onChange={(e) => setIndexSearch(e.target.value)}
                      placeholder={lang === 'en' ? 'Search species...' : 'Buscar especie...'}
                      aria-label={lang === 'en' ? 'Search species in index' : 'Buscar especie en el índice'}
                      className={`w-full pl-9 pr-8 py-1.5 rounded-xl text-xs font-medium border outline-none transition-colors ${
                        isUw
                          ? 'bg-[#240a0a] border-[#7f1d1d] text-white placeholder:text-[#fca5a5]/50 focus:border-[#ef4444]'
                          : 'bg-[#f8fafc] border-[#cbd5e1] text-[#0f2942] placeholder:text-[#94a3b8] focus:border-[#0284c7] focus:bg-white'
                      }`}
                    />
                    {indexSearch && (
                      <button
                        type="button"
                        onClick={() => setIndexSearch('')}
                        aria-label={lang === 'en' ? 'Clear search' : 'Limpiar búsqueda'}
                        className={`absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded cursor-pointer ${
                          isUw
                            ? 'text-[#fca5a5] hover:text-white'
                            : 'text-[#64748b] hover:text-[#0f2942]'
                        }`}
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Pestañas de rareza */}
                <div
                  role="tablist"
                  aria-label={lang === 'en' ? 'Filter fish by rarity' : 'Filtrar peces por rareza'}
                  data-testid="index-rarity-filter"
                  className="mt-2.5 flex items-center gap-1.5 overflow-x-auto pb-0.5"
                >
                  <button
                    type="button"
                    role="tab"
                    aria-selected={activeRarityFilter === 'Todas'}
                    data-testid="filter-rarity-all"
                    onClick={() => setIndexRarityFilter('Todas')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                      activeRarityFilter === 'Todas'
                        ? isUw
                          ? 'bg-[#ef4444] text-white shadow-xs'
                          : 'bg-[#0f2942] text-white shadow-xs'
                        : isUw
                          ? 'bg-[#2b0d0d] text-[#fca5a5] hover:bg-[#3f1414]'
                          : 'bg-[#f1f5f9] text-[#475569] hover:bg-[#e2e8f0]'
                    }`}
                  >
                    {lang === 'en' ? 'All' : 'Todas'} ({currentPool.length})
                  </button>
                  {availableRarities.map((rarity) => {
                    const countInRarity = currentPool.filter(
                      (p) => p.rarity === rarity
                    ).length;
                    const isActive = activeRarityFilter === rarity;
                    const rCfg = RARITIES[rarity];
                    const probInfo = getRarityProbabilitySummary(rarity, currentPool, lang);
                    return (
                      <button
                        key={rarity}
                        type="button"
                        role="tab"
                        aria-selected={isActive}
                        title={probInfo.fullText}
                        data-testid={`filter-rarity-${rarity}`}
                        onClick={() => setIndexRarityFilter(rarity)}
                        style={
                          isActive
                            ? isUw
                              ? undefined
                              : { backgroundColor: rCfg.color, color: '#ffffff' }
                            : undefined
                        }
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                          isActive
                            ? isUw
                              ? 'bg-[#ef4444] text-white shadow-xs'
                              : 'shadow-xs'
                            : isUw
                              ? 'bg-[#2b0d0d] text-[#fca5a5] hover:bg-[#3f1414]'
                              : 'bg-[#f1f5f9] text-[#475569] hover:bg-[#e2e8f0]'
                        }`}
                      >
                        {getRarityFilterLabel(rarity, lang)} ({countInRarity})
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Contenido desplazable de especies */}
              <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-5 sm:p-6 flex flex-col gap-6">
                {totalShown === 0 ? (
                  <div className="py-12 flex flex-col items-center justify-center text-center gap-3">
                    <Fish
                      className={`w-10 h-10 ${
                        isUw ? 'text-[#fca5a5]/50' : 'text-[#94a3b8]'
                      }`}
                    />
                    <p
                      className={`text-sm font-semibold ${
                        isUw ? 'text-[#fca5a5]' : 'text-[#475569]'
                      }`}
                    >
                      {lang === 'en'
                        ? 'No species match the current filters.'
                        : 'No se encontraron especies con los filtros actuales.'}
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setIndexSearch('');
                        setIndexStatusFilter('all');
                        setIndexRarityFilter('Todas');
                      }}
                      className={`px-4 py-2 rounded-xl text-xs font-bold cursor-pointer transition-colors ${
                        isUw
                          ? 'bg-[#7f1d1d] hover:bg-[#991b1b] text-white'
                          : 'bg-[#0f2942] hover:bg-[#1e3a5f] text-white'
                      }`}
                    >
                      {lang === 'en' ? 'Show all species' : 'Mostrar todas las especies'}
                    </button>
                  </div>
                ) : (
                  visibleRarities.map((rarity) => {
                    const allInRarity = currentPool.filter((p) => p.rarity === rarity);
                    const list = allInRarity.filter(matchesFilters);
                    if (list.length === 0) return null;
                    const discoveredInRarity = allInRarity.filter(
                      (p) => (discoveredFish[p.id] ?? 0) > 0
                    ).length;
                    const rCfg = RARITIES[rarity];
                    const probInfo = getRarityProbabilitySummary(rarity, currentPool, lang);

                    return (
                      <section key={rarity} className="flex flex-col gap-3">
                        <div
                          className={`flex items-center justify-between gap-3 pb-2 border-b ${
                            isUw ? 'border-[#ef4444]/20' : 'border-[#e2e8f0]'
                          }`}
                        >
                          <div className="relative group flex items-center gap-2">
                            <div
                              tabIndex={0}
                              title={probInfo.fullText}
                              data-testid={`rarity-badge-${rarity}`}
                              className="inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-lg cursor-help outline-none focus-visible:ring-2 focus-visible:ring-[#38bdf8]"
                              style={{
                                color: isUw ? '#ffffff' : rCfg.color,
                                backgroundColor: isUw ? '#7f1d1d' : rCfg.bgColor,
                              }}
                            >
                              <span>{getRarityName(rarity, lang)}</span>
                              <Info className="w-3.5 h-3.5 opacity-75" />
                            </div>
                            <span
                              className={`text-xs font-medium hidden sm:inline ${
                                isUw ? 'text-[#fca5a5]/75' : 'text-[#64748b]'
                              }`}
                            >
                              {probInfo.pctLabel} · {probInfo.oneInLabel}
                            </span>
                            <div
                              role="tooltip"
                              data-testid={`rarity-tooltip-${rarity}`}
                              className={`pointer-events-none opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-150 absolute left-0 top-full mt-1.5 sm:left-full sm:top-1/2 sm:-translate-y-1/2 sm:ml-2.5 sm:mt-0 z-30 w-64 max-w-[calc(100vw-3rem)] rounded-xl px-3 py-2 text-[11px] leading-snug shadow-lg border ${
                                isUw
                                  ? 'bg-[#1a0505] border-[#ef4444]/70 text-[#fef2f2]'
                                  : 'bg-[#0f2942] border-[#38bdf8]/40 text-white'
                              }`}
                            >
                              <div className="font-extrabold flex items-center justify-between gap-2 mb-0.5">
                                <span>
                                  {lang === 'en' ? 'Odds:' : 'Probabilidad:'} {probInfo.pctLabel}
                                </span>
                                <span className="opacity-80 font-bold tabular-nums">
                                  {probInfo.oneInLabel}
                                </span>
                              </div>
                              <p className="opacity-90 font-medium">{probInfo.description}</p>
                            </div>
                          </div>

                          <span
                            className={`text-xs font-semibold tabular-nums ${
                              isUw ? 'text-[#fca5a5]' : 'text-[#64748b]'
                            }`}
                          >
                            {discoveredInRarity}/{allInRarity.length}{' '}
                            {lang === 'en' ? 'discovered' : 'descubiertos'}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                          {list.map((fish) => {
                            const count = discoveredFish[fish.id] ?? 0;
                            const unlocked = count > 0;
                            const mastered = count >= MASTERY_TARGET;
                            const masteryPct = Math.min(
                              100,
                              Math.round((count / MASTERY_TARGET) * 100)
                            );
                            const value = getSpeciesSellValue(fish);
                            const hasUnclaimed = unlocked && !claimedIndexRewards[fish.id];

                            return (
                              <div
                                key={fish.id}
                                data-testid={`index-fish-${fish.id}`}
                                className={`p-3.5 rounded-xl border flex items-center gap-3.5 transition-colors ${
                                  mastered
                                    ? isUw
                                      ? 'bg-[#2a1209] border-[#eab308] text-[#fef2f2]'
                                      : 'bg-gradient-to-br from-[#fefce8] to-white border-[#eab308] text-[#0f2942] shadow-xs'
                                    : isUw
                                      ? unlocked
                                        ? 'bg-[#220a0a] border-[#7f1d1d] text-[#fef2f2]'
                                        : 'bg-[#1a0707] border-[#450a0a] text-[#fca5a5]/70'
                                      : unlocked
                                        ? 'bg-white border-[#e2e8f0] text-[#0f2942] shadow-xs'
                                        : 'bg-[#f1f5f9]/85 border-[#e2e8f0] text-[#64748b]'
                                }`}
                              >
                                {/* Contenedor de espécimen cohesivo con su bioma */}
                                <div
                                  className={`relative w-20 h-14 rounded-xl flex items-center justify-center shrink-0 overflow-hidden p-1.5 ${
                                    isUw
                                      ? unlocked
                                        ? 'bg-gradient-to-br from-[#2b0909] via-[#450a0a] to-[#170404] border border-[#ef4444]/45 shadow-inner'
                                        : 'bg-[#140505] border border-[#450a0a]/60'
                                      : unlocked
                                        ? 'bg-gradient-to-br from-[#132f4c] via-[#1b4965] to-[#0b1f33] border border-[#38bdf8]/35 shadow-inner'
                                        : 'bg-[#e2e8f0]/75 border border-[#cbd5e1]/70'
                                  }`}
                                >
                                  {unlocked && (
                                    <div
                                      aria-hidden="true"
                                      className="pointer-events-none absolute inset-0"
                                      style={{
                                        background: isUw
                                          ? 'radial-gradient(circle at 50% 45%, rgba(249,115,22,0.22), transparent 72%)'
                                          : 'radial-gradient(circle at 50% 45%, rgba(125,211,252,0.24), transparent 72%)',
                                      }}
                                    />
                                  )}
                                  {unlocked && CUSTOM_FISH_IMAGES[fish.id] ? (
                                    <RealisticFishThumb
                                      fishId={fish.id}
                                      alt={getFishName(fish.id, lang)}
                                      className="relative z-10 w-full h-full object-contain drop-shadow-[0_4px_6px_rgba(0,0,0,0.48)]"
                                    />
                                  ) : unlocked ? (
                                    <Fish
                                      className="relative z-10 w-7 h-7 drop-shadow"
                                      style={{ color: fish.spriteColor }}
                                    />
                                  ) : (
                                    <Fish
                                      className={`w-7 h-7 opacity-30 ${
                                        isUw ? 'text-[#fca5a5]' : 'text-[#475569]'
                                      }`}
                                    />
                                  )}
                                </div>

                                {/* Datos de la especie */}
                                <div className="min-w-0 flex-1 flex flex-col gap-1">
                                  <div className="flex items-center justify-between gap-1.5">
                                    <h3
                                      className={`font-display font-bold text-sm truncate ${
                                        unlocked
                                          ? isUw
                                            ? 'text-white'
                                            : 'text-[#0f2942]'
                                          : isUw
                                            ? 'text-[#fca5a5]/60'
                                            : 'text-[#64748b]'
                                      }`}
                                    >
                                      {unlocked ? getFishName(fish.id, lang) : (lang === 'en' ? 'Unknown Species' : 'Especie desconocida')}
                                    </h3>
                                    {mastered && (
                                      <span
                                        data-testid={`mastery-medal-${fish.id}`}
                                        title={
                                          lang === 'en'
                                            ? 'Gold Medal · Species Mastery (50+ catches)'
                                            : 'Medalla de Oro · Maestría de Especie (50+ capturas)'
                                        }
                                        className="inline-flex items-center gap-0.5 text-[11px] font-extrabold text-[#ca8a04] shrink-0"
                                      >
                                        <Medal className="w-3.5 h-3.5 text-[#ca8a04] fill-[#fde047]" />
                                        <span>50+</span>
                                      </span>
                                    )}
                                  </div>

                                  {(() => {
                                    const bestWeight = maxFishWeights[fish.id] ?? 0;
                                    const bestWeightText =
                                      bestWeight > 0
                                        ? `${lang === 'en' ? 'Best' : 'Récord'}: ${formatFishWeight(bestWeight, lang)} · `
                                        : '';
                                    return (
                                      <div
                                        className={`text-xs tabular-nums truncate ${
                                          isUw ? 'text-[#fca5a5]/85' : 'text-[#64748b]'
                                        }`}
                                      >
                                        {unlocked
                                          ? `x${count} · ${bestWeightText}~${formatNumber(value, lang)} ${lang === 'en' ? 'coins' : 'monedas'} · ${getSpeciesOddsLabel(fish, lang)}`
                                          : `${lang === 'en' ? 'Undiscovered' : 'Sin descubrir'} · ${getSpeciesOddsLabel(fish, lang)}`}
                                      </div>
                                    );
                                  })()}

                                  {hasUnclaimed ? (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        sound.playCelebration();
                                        setCoins((c) => c + 50);
                                        setTotalCoinsEarned((t) => t + 50);
                                        setClaimedIndexRewards((prev) => ({
                                          ...prev,
                                          [fish.id]: true,
                                        }));
                                      }}
                                      className={`mt-0.5 w-full py-1 px-2.5 rounded-lg text-[11px] font-extrabold cursor-pointer transition-transform active:scale-95 ${
                                        isUw
                                          ? 'bg-gradient-to-b from-[#ef4444] to-[#991b1b] hover:brightness-110 text-white'
                                          : 'bg-gradient-to-b from-[#facc15] to-[#eab308] hover:brightness-105 text-[#451a03]'
                                      }`}
                                    >
                                      {lang === 'en' ? 'Claim +50 coins' : 'Reclamar +50 monedas'}
                                    </button>
                                  ) : unlocked && !mastered ? (
                                    <div className="mt-0.5 flex items-center gap-2">
                                      <div
                                        className={`flex-1 h-1.5 rounded-full overflow-hidden ${
                                          isUw ? 'bg-[#450a0a]' : 'bg-[#e2e8f0]'
                                        }`}
                                      >
                                        <div
                                          className="h-full rounded-full bg-gradient-to-r from-[#facc15] to-[#eab308] transition-all duration-300"
                                          style={{ width: `${masteryPct}%` }}
                                        />
                                      </div>
                                      <span
                                        className={`text-[11px] font-bold tabular-nums shrink-0 ${
                                          isUw ? 'text-[#fde68a]' : 'text-[#92400e]'
                                        }`}
                                      >
                                        {count}/50
                                      </span>
                                    </div>
                                  ) : mastered ? (
                                    <div
                                      className={`mt-0.5 text-[11px] font-bold ${
                                        isUw ? 'text-[#fde047]' : 'text-[#a16207]'
                                      }`}
                                    >
                                      {lang === 'en' ? 'Gold mastery completed' : 'Maestría oro completada'}
                                    </div>
                                  ) : null}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </section>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* CLASIFICACIÓN (LEADERBOARD) MODAL */}
      {mode === 'playing' && activePanel === 'leaderboard' && (() => {
        const sortedEntries = [...leaderboardEntries]
          .sort((a, b) =>
            leaderboardTab === 'time'
              ? b.timeSeconds - a.timeSeconds
              : leaderboardTab === 'money'
                ? b.money - a.money
                : b.catches - a.catches
          )
          .slice(0, 50);

        const formatMetric = (entry: CloudLeaderboardEntry) =>
          leaderboardTab === 'time'
            ? formatTime(entry.timeSeconds)
            : leaderboardTab === 'money'
              ? `${formatNumber(entry.money, lang)} ${lang === 'en' ? 'coins' : 'monedas'}`
              : `${formatNumber(entry.catches, lang)} ${lang === 'en' ? 'fish' : 'peces'}`;

        const metricColumnTitle =
          leaderboardTab === 'time'
            ? lang === 'en'
              ? 'Time'
              : 'Tiempo'
            : leaderboardTab === 'money'
              ? lang === 'en'
                ? 'Coins'
                : 'Monedas'
              : lang === 'en'
                ? 'Catches'
                : 'Capturas';

        const myIndex = firebaseUser
          ? sortedEntries.findIndex((e) => e.ownerUid === firebaseUser.uid)
          : -1;
        const myEntry = myIndex >= 0 ? sortedEntries[myIndex] : null;

        const podiumMeta = [
          {
            rank: 2,
            idx: 1,
            label: lang === 'en' ? '2nd Silver' : '2.º Plata',
            cardCls:
              'bg-gradient-to-b from-[#f8fafc] to-[#e2e8f0] border-[#94a3b8] min-h-[116px]',
            badgeCls: 'bg-[#64748b] text-white',
            trophyCls: 'text-[#64748b] fill-[#cbd5e1]',
            valueCls: 'text-[#334155]',
          },
          {
            rank: 1,
            idx: 0,
            label: lang === 'en' ? '1st Gold' : '1.º Oro',
            cardCls:
              'bg-gradient-to-b from-[#fef9c3] via-[#fef08a]/70 to-[#fde047]/60 border-[#eab308] min-h-[132px] shadow-[0_6px_18px_rgba(234,179,8,0.28)]',
            badgeCls: 'bg-[#ca8a04] text-white',
            trophyCls: 'text-[#b45309] fill-[#facc15]',
            valueCls: 'text-[#854d0e]',
          },
          {
            rank: 3,
            idx: 2,
            label: lang === 'en' ? '3rd Bronze' : '3.º Bronce',
            cardCls:
              'bg-gradient-to-b from-[#fff7ed] to-[#fed7aa]/70 border-[#d97706] min-h-[108px]',
            badgeCls: 'bg-[#b45309] text-white',
            trophyCls: 'text-[#9a3412] fill-[#fb923c]',
            valueCls: 'text-[#9a3412]',
          },
        ];

        const openLeaderboardProfile = (
          entry: CloudLeaderboardEntry,
          rank: number
        ) => {
          sound.playClick();
          const isMe = firebaseUser?.uid === entry.ownerUid;
          const liveBestId = isMe
            ? (getBestFishFromDiscovered(discoveredFish)?.id ??
              entry.bestFishId ??
              0)
            : entry.bestFishId;
          const liveDiscovered = isMe
            ? ALL_FISH.filter((f) => (discoveredFish[f.id] ?? 0) > 0).length
            : entry.discoveredCount;
          const liveMastered = isMe
            ? ALL_FISH.filter((f) => (discoveredFish[f.id] ?? 0) >= 50).length
            : entry.masteredCount;
          const liveUnderworld = isMe
            ? Boolean(underworldUnlocked)
            : entry.underworldUnlocked;
          const liveCosmetics = isMe
            ? sanitizeEquippedCosmetics(equippedCosmetics)
            : sanitizeEquippedCosmetics(entry.equippedCosmetics);

          setInspectedProfile({
            source: 'leaderboard',
            ownerUid: entry.ownerUid,
            username: entry.username,
            avatar: entry.avatar,
            catches: entry.catches,
            money: entry.money,
            timeSeconds: entry.timeSeconds,
            isAdmin: entry.isAdmin,
            hasOgTitle: entry.hasOgTitle,
            isMe,
            rank,
            bestFishId: liveBestId,
            discoveredCount: liveDiscovered,
            masteredCount: liveMastered,
            underworldUnlocked: liveUnderworld,
            equippedCosmetics: liveCosmetics,
          });
        };

        return (
          <div className="fixed inset-0 bg-[#0f2942]/55 flex items-center justify-center p-3 sm:p-4 z-20 backdrop-blur-xs animate-ui-backdrop">
            <div className="w-full max-w-2xl h-[88vh] max-h-[88vh] rounded-2xl bg-[#f8fafc] border-2 border-[#cbd5e1] shadow-2xl flex flex-col overflow-hidden animate-ui-modal-in">
              {/* CABECERA FIJA Y PESTAÑAS */}
              <div className="shrink-0 px-4 sm:px-5 pt-4 pb-3 bg-white border-b border-[#e2e8f0] flex flex-col gap-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-[#fef3c7] border border-[#fde68a] text-[#b45309] flex items-center justify-center shrink-0">
                      <Trophy className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <h2 className="font-display font-extrabold text-lg sm:text-xl text-[#0f2942] leading-tight">
                        {lang === 'en' ? 'Global Leaderboard' : 'Clasificación Global'}
                      </h2>
                      <p className="text-[11px] font-semibold text-[#64748b] truncate">
                        {lang === 'en'
                          ? 'Top 50 best anglers · Tap anyone to view their profile'
                          : 'Top 50 mejores pescadores · Pulsa en cualquiera para ver su perfil'}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={closeActivePanel}
                    aria-label={lang === 'en' ? 'Back to menu' : 'Volver al menú'}
                    className="p-2 rounded-xl hover:bg-[#e2e8f0] text-[#475569] cursor-pointer transition-colors shrink-0"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-[#e2e8f0]">
                  <button
                    type="button"
                    onClick={() => {
                      setLeaderboardTab('time');
                      leaderboardScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className={`py-2 px-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                      leaderboardTab === 'time'
                        ? 'bg-white text-[#0f2942] shadow-sm'
                        : 'text-[#475569] hover:text-[#0f2942]'
                    }`}
                  >
                    <Clock className="w-3.5 h-3.5" />
                    {lang === 'en' ? 'Time' : 'Tiempo'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setLeaderboardTab('money');
                      leaderboardScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className={`py-2 px-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                      leaderboardTab === 'money'
                        ? 'bg-white text-[#0f2942] shadow-sm'
                        : 'text-[#475569] hover:text-[#0f2942]'
                    }`}
                  >
                    <CoinIcon size={14} />
                    {lang === 'en' ? 'Coins' : 'Dinero'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setLeaderboardTab('catches');
                      leaderboardScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className={`py-2 px-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                      leaderboardTab === 'catches'
                        ? 'bg-white text-[#0f2942] shadow-sm'
                        : 'text-[#475569] hover:text-[#0f2942]'
                    }`}
                  >
                    <Trophy className="w-3.5 h-3.5" />
                    {lang === 'en' ? 'Catches' : 'Capturas'}
                  </button>
                </div>

                {!firebaseUser ? (
                  <div className="rounded-xl bg-[#eff6ff] border border-[#bfdbfe] px-3 py-2 flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold text-[#1e3a8a]">
                      {lang === 'en'
                        ? 'Only the Top 50 players signed in with Google appear.'
                        : 'Solo aparecen los 50 mejores jugadores con Google.'}
                    </p>
                    <button
                      type="button"
                      disabled={authLoading}
                      onClick={handleGoogleSignIn}
                      className="px-3 py-1.5 rounded-lg bg-[#0284c7] hover:bg-[#0369a1] text-white text-xs font-bold cursor-pointer shrink-0"
                    >
                      {authLoading
                        ? lang === 'en'
                          ? 'Connecting...'
                          : 'Conectando...'
                        : lang === 'en'
                          ? 'Connect Google'
                          : 'Conectar Google'}
                    </button>
                  </div>
                ) : myEntry ? (
                  <div className="rounded-xl bg-gradient-to-r from-[#fefce8] to-[#fffbeb] border border-[#fcd34d] px-3 py-2 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="px-2 py-0.5 rounded-md bg-[#f59e0b] text-white text-xs font-extrabold tabular-nums shrink-0">
                        #{myIndex + 1}
                      </span>
                      <span className="text-xs font-bold text-[#78350f] truncate">
                        {lang === 'en' ? 'Your rank:' : 'Tu puesto:'} {formatMetric(myEntry)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() =>
                          myLeaderboardRowRef.current?.scrollIntoView({
                            behavior: 'smooth',
                            block: 'center',
                          })
                        }
                        className="px-2.5 py-1 rounded-lg bg-white hover:bg-[#fef3c7] border border-[#f59e0b]/60 text-[#92400e] text-[11px] font-bold cursor-pointer transition-colors"
                      >
                        {lang === 'en' ? 'Go to my rank' : 'Ir a mi puesto'}
                      </button>
                      <button
                        type="button"
                        onClick={() => openLeaderboardProfile(myEntry, myIndex + 1)}
                        className="px-2.5 py-1 rounded-lg bg-[#0284c7] hover:bg-[#0369a1] text-white text-[11px] font-bold cursor-pointer transition-colors"
                      >
                        {lang === 'en' ? 'My profile' : 'Mi perfil'}
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>

              {/* CONTENEDOR ÚNICO DESPLAZABLE (FÁCIL DE BAJAR POR TODA LA TABLA) */}
              <div
                ref={leaderboardScrollRef}
                data-testid="leaderboard-scroll-container"
                className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 sm:px-5 py-4 space-y-4 scroll-smooth [scrollbar-width:thin] [scrollbar-color:#94a3b8_#e2e8f0] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-[#e2e8f0]/70 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[#94a3b8] [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-[#64748b]"
              >
                {leaderboardLoading && sortedEntries.length === 0 ? (
                  <p className="text-center text-sm text-[#64748b] py-12">
                    {lang === 'en'
                      ? 'Loading Top 50 Google players...'
                      : 'Cargando Top 50 de jugadores con Google...'}
                  </p>
                ) : sortedEntries.length === 0 ? (
                  <p className="text-center text-sm text-[#64748b] py-12">
                    {lang === 'en'
                      ? 'No Google players are on the leaderboard yet. Sign in with Google to be the first!'
                      : 'Todavía no hay jugadores con Google registrados en la clasificación. ¡Inicia sesión con Google para ser el primero!'}
                  </p>
                ) : (
                  <>
                    {/* SECCIÓN 1: TOP 3 PODIO */}
                    <section
                      data-testid="leaderboard-top3"
                      className="rounded-xl bg-gradient-to-b from-[#eff6ff] to-white border border-[#cbd5e1] p-3"
                    >
                      <div className="flex items-center justify-between mb-2.5">
                        <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#334155]">
                          {lang === 'en' ? 'Top 3 Podium' : 'Podio Top 3'}
                        </span>
                        <span className="text-[11px] font-semibold text-[#64748b]">
                          {metricColumnTitle}
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 items-end">
                        {podiumMeta.map((slot) => {
                          const leader = sortedEntries[slot.idx];
                          if (!leader) return <div key={slot.rank} />;
                          const isMe = firebaseUser?.uid === leader.ownerUid;
                          const leaderSkin = isMe
                            ? sanitizeEquippedCosmetics(equippedCosmetics)
                            : sanitizeEquippedCosmetics(leader.equippedCosmetics);
                          return (
                            <button
                              key={slot.rank}
                              type="button"
                              data-testid={`top3-rank-${slot.rank}`}
                              title={
                                lang === 'en'
                                  ? `View ${leader.username}'s skin, profile & best fish`
                                  : `Ver skin, perfil y mejor pez de ${leader.username}`
                              }
                              onClick={() => openLeaderboardProfile(leader, slot.rank)}
                              className={`rounded-xl border-2 p-2.5 flex flex-col items-center justify-between text-center gap-1 transition-all duration-150 hover:-translate-y-0.5 active:scale-[0.98] cursor-pointer ${slot.cardCls}`}
                            >
                              <div className="flex items-center gap-1">
                                <Trophy
                                  className={`${slot.rank === 1 ? 'w-5 h-5' : 'w-4 h-4'} ${slot.trophyCls}`}
                                />
                                <span
                                  className={`px-1.5 py-0.5 rounded text-[10px] font-extrabold leading-none ${slot.badgeCls}`}
                                >
                                  #{slot.rank}
                                </span>
                              </div>
                              <div className="flex items-center justify-center gap-1.5">
                                {renderAvatar(leader.avatar, slot.rank === 1 ? 26 : 22)}
                                <div className="rounded-lg bg-white/75 border border-black/10 px-0.5 flex items-center justify-center">
                                  <AnglerSkinPreview
                                    cosmetics={leaderSkin}
                                    world="river"
                                    size="sm"
                                  />
                                </div>
                              </div>
                              <div className="w-full min-w-0">
                                <div className="font-extrabold text-xs text-[#0f2942] truncate">
                                  {leader.username}
                                  {isMe ? (lang === 'en' ? ' (You)' : ' (Tú)') : ''}
                                </div>
                                <div
                                  className={`font-display font-extrabold text-[11px] tabular-nums truncate ${slot.valueCls}`}
                                >
                                  {formatMetric(leader)}
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </section>

                    {/* SECCIÓN 2: TABLA COMPLETA ORGANIZADA (#1 – #50) */}
                    <section className="rounded-xl border border-[#cbd5e1] bg-white overflow-hidden shadow-xs">
                      <div className="sticky top-0 z-10 grid grid-cols-[42px_minmax(0,1fr)_auto] items-center gap-2 px-3 py-2 bg-[#f1f5f9] border-b border-[#cbd5e1] text-[10px] font-extrabold uppercase tracking-wider text-[#475569]">
                        <span className="text-center">{lang === 'en' ? 'Rank' : 'Puesto'}</span>
                        <span>{lang === 'en' ? 'Angler & best fish' : 'Pescador y mejor pez'}</span>
                        <span className="text-right pr-1">{metricColumnTitle}</span>
                      </div>

                      <div className="divide-y divide-[#e2e8f0]">
                        {sortedEntries.map((entry, idx) => {
                          const isMe = firebaseUser?.uid === entry.ownerUid;
                          const entryBestId = isMe
                            ? (getBestFishFromDiscovered(discoveredFish)?.id ??
                              entry.bestFishId)
                            : entry.bestFishId;
                          const bestSpecies =
                            entryBestId && entryBestId > 0
                              ? ALL_FISH.find((f) => f.id === entryBestId)
                              : undefined;
                          const rankBadge =
                            idx === 0 ? (
                              <span
                                title={lang === 'en' ? '1st Gold' : '1.º Oro'}
                                className="w-7 h-7 rounded-lg bg-[#fef08a] border border-[#eab308] flex items-center justify-center mx-auto"
                              >
                                <Trophy className="w-3.5 h-3.5 text-[#b45309] fill-[#facc15]" />
                              </span>
                            ) : idx === 1 ? (
                              <span
                                title={lang === 'en' ? '2nd Silver' : '2.º Plata'}
                                className="w-7 h-7 rounded-lg bg-[#e2e8f0] border border-[#94a3b8] flex items-center justify-center mx-auto"
                              >
                                <Trophy className="w-3.5 h-3.5 text-[#475569] fill-[#cbd5e1]" />
                              </span>
                            ) : idx === 2 ? (
                              <span
                                title={lang === 'en' ? '3rd Bronze' : '3.º Bronce'}
                                className="w-7 h-7 rounded-lg bg-[#fed7aa] border border-[#d97706] flex items-center justify-center mx-auto"
                              >
                                <Trophy className="w-3.5 h-3.5 text-[#9a3412] fill-[#fb923c]" />
                              </span>
                            ) : (
                              <span className="w-7 h-7 rounded-lg bg-[#f1f5f9] border border-[#cbd5e1] text-[11px] font-extrabold text-[#475569] flex items-center justify-center mx-auto tabular-nums">
                                #{idx + 1}
                              </span>
                            );

                          return (
                            <button
                              key={entry.ownerUid}
                              ref={isMe ? myLeaderboardRowRef : undefined}
                              type="button"
                              data-testid={`leaderboard-entry-${entry.ownerUid}`}
                              onClick={() => openLeaderboardProfile(entry, idx + 1)}
                              className={`w-full text-left px-3 py-2.5 grid grid-cols-[42px_minmax(0,1fr)_auto] items-center gap-2 transition-colors hover:bg-[#f0f9ff] active:bg-[#e0f2fe] cursor-pointer ${
                                isMe
                                  ? 'bg-[#fefce8] hover:bg-[#fef9c3]/80'
                                  : idx === 0
                                    ? 'bg-[#fffbeb]/70'
                                    : idx === 1
                                      ? 'bg-[#f8fafc]/80'
                                      : idx === 2
                                        ? 'bg-[#fff7ed]/60'
                                        : 'bg-white'
                              }`}
                            >
                              <div>{rankBadge}</div>

                              <div className="flex items-center gap-2 min-w-0">
                                <div className="shrink-0">
                                  {renderAvatar(entry.avatar, 24)}
                                </div>
                                <div
                                  title={lang === 'en' ? 'Equipped skin' : 'Skin equipada'}
                                  className="shrink-0 w-9 h-10 rounded-lg bg-[#f0f9ff] border border-[#cbd5e1] flex items-center justify-center overflow-hidden"
                                >
                                  <AnglerSkinPreview
                                    cosmetics={
                                      isMe
                                        ? sanitizeEquippedCosmetics(equippedCosmetics)
                                        : sanitizeEquippedCosmetics(entry.equippedCosmetics)
                                    }
                                    world="river"
                                    size="sm"
                                  />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-1.5 min-w-0">
                                    <span className="font-bold text-sm text-[#0f2942] truncate">
                                      {entry.username}
                                      {isMe ? (lang === 'en' ? ' (You)' : ' (Tú)') : ''}
                                    </span>
                                    {entry.isAdmin && (
                                      <span className="px-1.5 py-0.5 rounded bg-gradient-to-r from-[#7f1d1d] to-[#450a0a] border border-[#dc2626] text-[#fecaca] text-[9px] font-extrabold uppercase tracking-wider shrink-0 shadow-[0_0_8px_rgba(185,28,28,0.75)]">
                                        💀 ADMIN
                                      </span>
                                    )}
                                    {entry.hasOgTitle && (
                                      <span className="px-1.5 py-0.5 rounded bg-gradient-to-r from-[#f97316] to-[#ea580c] border border-[#fdba74] text-white text-[9px] font-extrabold uppercase tracking-wider shrink-0">
                                        OG
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-[11px] font-medium text-[#64748b] truncate">
                                    {bestSpecies
                                      ? `${lang === 'en' ? 'Best fish:' : 'Mejor pez:'} ${getFishName(bestSpecies.id, lang)} (${getRarityName(bestSpecies.rarity, lang)})`
                                      : lang === 'en'
                                        ? 'No best fish recorded'
                                        : 'Sin mejor pez registrado'}
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                <span className="font-display font-extrabold text-xs sm:text-sm text-[#0284c7] tabular-nums">
                                  {formatMetric(entry)}
                                </span>
                                <UserIcon className="w-4 h-4 text-[#94a3b8]" />
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </section>
                  </>
                )}
              </div>

              {/* PIE FIJO CON NAVEGACIÓN RÁPIDA ARRIBA */}
              <div className="shrink-0 px-4 sm:px-5 py-2.5 bg-white border-t border-[#e2e8f0] flex items-center justify-between gap-2">
                <span className="text-[11px] font-semibold text-[#64748b]">
                  {lang === 'en'
                    ? `Showing ${sortedEntries.length} of 50 players`
                    : `Mostrando ${sortedEntries.length} de 50 jugadores`}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    leaderboardScrollRef.current?.scrollTo({
                      top: 0,
                      behavior: 'smooth',
                    })
                  }
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#f1f5f9] hover:bg-[#e2e8f0] border border-[#cbd5e1] text-xs font-bold text-[#334155] cursor-pointer transition-colors"
                >
                  <ArrowUp className="w-3.5 h-3.5" />
                  {lang === 'en' ? 'Back to top' : 'Subir arriba'}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* AÑADIR AMIGOS & RANKING DE MEJOR AMIGO MODAL */}
      {mode === 'playing' && activePanel === 'friends' && (
        <div className="fixed inset-0 bg-[#0f2942]/55 flex items-center justify-center p-3 sm:p-4 z-20 backdrop-blur-xs animate-ui-backdrop">
          <div className="w-full max-w-lg rounded-2xl bg-[#f8fafc] border-2 border-[#cbd5e1] p-4 sm:p-5 shadow-2xl flex flex-col gap-3.5 max-h-[90vh] overflow-hidden animate-ui-modal-in">
            {/* CABECERA */}
            <div className="flex items-center justify-between pb-2 border-b border-[#e2e8f0]">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#e0f2fe] text-[#0284c7] flex items-center justify-center shadow-xs">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-display font-black text-lg text-[#0f2942] leading-tight">
                    {lang === 'en' ? 'My Friends & Ranking' : 'Mis Amigos & Ranking'}
                  </h2>
                  <p className="text-xs text-[#64748b]">
                    {lang === 'en'
                      ? 'Add friends, open their profile to view their best fish and stats'
                      : 'Añade amigos, abre su perfil para ver su mejor pez y estadísticas'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeActivePanel}
                aria-label={lang === 'en' ? 'Back to menu' : 'Volver al menú'}
                className="p-1.5 rounded-lg hover:bg-[#e2e8f0] text-[#475569] cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* FORMULARIO PARA AÑADIR AMIGOS */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const validation = validateFriendUsername(friendInput, lang);
                if (!validation.valid) {
                  setFriendError(
                    validation.error ||
                      (lang === 'en' ? 'Invalid friend username.' : 'Nombre de amigo no válido.')
                  );
                  return;
                }
                const cleanName = validation.cleanName;
                const key = cleanName.toLowerCase();
                if (key === username.toLowerCase()) {
                  setFriendError(
                    lang === 'en'
                      ? 'You cannot add yourself as a friend.'
                      : 'No puedes añadirte a ti mismo como amigo.'
                  );
                  return;
                }
                if (friends.some((f) => f.username.toLowerCase() === key)) {
                  setFriendError(
                    lang === 'en'
                      ? 'That user is already on your friends list.'
                      : 'Ese usuario ya está en tu lista de amigos.'
                  );
                  return;
                }
                const newFriend = getOrGenerateFriendEntry(cleanName, leaderboardEntries);
                setFriends((prev) => [...prev, newFriend]);
                setFriendInput('');
                setFriendError('');
                sound.playCelebration();
              }}
              className="flex flex-col gap-1.5"
            >
              <div className="flex gap-2">
                <input
                  type="text"
                  value={friendInput}
                  onChange={(e) => {
                    setFriendInput(e.target.value);
                    if (friendError) setFriendError('');
                  }}
                  placeholder={
                    lang === 'en'
                      ? 'Friend username (e.g. Alex, Angler77)...'
                      : 'Nombre de tu amigo (ej: Carlos, Pescador77)...'
                  }
                  className="flex-1 px-3.5 py-2.5 rounded-xl border border-[#cbd5e1] bg-white text-sm text-[#0f2942] outline-none focus:border-[#0284c7] focus:ring-2 focus:ring-[#0284c7]/20 shadow-xs"
                />
                <button
                  type="submit"
                  className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#0284c7] to-[#0369a1] hover:from-[#0369a1] hover:to-[#075985] text-white text-sm font-extrabold shadow-sm cursor-pointer shrink-0 transition-all flex items-center gap-1.5"
                >
                  <Users className="w-4 h-4" />
                  <span>{lang === 'en' ? 'Add' : 'Añadir'}</span>
                </button>
              </div>
              {friendError && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#fee2e2] border border-[#fecaca] text-[#dc2626] text-xs font-semibold">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <span>{friendError}</span>
                </div>
              )}
            </form>

            {/* BARRA DE ORDENACIÓN / PESTAÑAS */}
            <div className="flex items-center justify-between gap-2 pt-1 border-t border-[#e2e8f0]">
              <div className="flex gap-1 bg-[#e2e8f0]/80 p-0.5 rounded-xl text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setFriendsSortTab('best')}
                  className={`px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
                    friendsSortTab === 'best'
                      ? 'bg-white text-[#0f2942] shadow-xs'
                      : 'text-[#64748b] hover:text-[#0f2942]'
                  }`}
                >
                  <Trophy className="w-3.5 h-3.5 text-[#eab308]" />
                  <span>{lang === 'en' ? 'Best Friend' : 'Mejor Amigo'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFriendsSortTab('money')}
                  className={`px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
                    friendsSortTab === 'money'
                      ? 'bg-white text-[#0f2942] shadow-xs'
                      : 'text-[#64748b] hover:text-[#0f2942]'
                  }`}
                >
                  <CoinIcon size={13} />
                  <span>{lang === 'en' ? 'Coins' : 'Monedas'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFriendsSortTab('catches')}
                  className={`px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
                    friendsSortTab === 'catches'
                      ? 'bg-white text-[#0f2942] shadow-xs'
                      : 'text-[#64748b] hover:text-[#0f2942]'
                  }`}
                >
                  <Fish className="w-3.5 h-3.5 text-[#0284c7]" />
                  <span>{lang === 'en' ? 'Fish' : 'Peces'}</span>
                </button>
              </div>
              <span className="text-xs font-bold text-[#64748b]">
                {friends.length}{' '}
                {friends.length === 1
                  ? lang === 'en'
                    ? 'friend'
                    : 'amigo'
                  : lang === 'en'
                    ? 'friends'
                    : 'amigos'}
              </span>
            </div>

            {/* CUERPO: LISTA DE AMIGOS Y ESTADÍSTICAS */}
            {(() => {
              // Hidratar con estadísticas en vivo de la clasificación si existen, o derivación determinista si es amigo local
              const hydratedFriends = friends.map((f) => {
                const live = leaderboardEntries.find(
                  (e) =>
                    (f.ownerUid && e.ownerUid === f.ownerUid) ||
                    e.username.trim().toLowerCase() === f.username.trim().toLowerCase()
                );
                if (live) {
                  return {
                    ...f,
                    ownerUid: live.ownerUid,
                    isAdmin: live.isAdmin,
                    hasOgTitle: live.hasOgTitle,
                    avatar: live.avatar || f.avatar,
                    catches: live.catches,
                    money: live.money,
                    timeSeconds: live.timeSeconds,
                    bestFishId: live.bestFishId,
                    discoveredCount: live.discoveredCount,
                    masteredCount: live.masteredCount,
                    underworldUnlocked: live.underworldUnlocked,
                    equippedCosmetics:
                      live.equippedCosmetics ?? f.equippedCosmetics ?? [],
                  };
                }
                const derived =
                  f.bestFishId === undefined ||
                  f.discoveredCount === undefined ||
                  (!f.ownerUid && f.equippedCosmetics === undefined)
                    ? deriveDeterministicFriendStats(f.username, f.catches)
                    : null;
                return {
                  ...f,
                  ownerUid: f.ownerUid,
                  isAdmin: false,
                  hasOgTitle: false,
                  bestFishId: f.bestFishId ?? derived?.bestFishId,
                  discoveredCount: f.discoveredCount ?? derived?.discoveredCount,
                  masteredCount: f.masteredCount ?? derived?.masteredCount,
                  underworldUnlocked:
                    f.underworldUnlocked ?? derived?.underworldUnlocked,
                  equippedCosmetics:
                    f.equippedCosmetics ?? derived?.equippedCosmetics ?? [],
                };
              });

              const sortedFriends = [...hydratedFriends].sort((a, b) => {
                if (friendsSortTab === 'money') {
                  return (b.money || 0) - (a.money || 0);
                }
                if (friendsSortTab === 'catches') {
                  return (b.catches || 0) - (a.catches || 0);
                }
                return calculateBestFriendScore(b) - calculateBestFriendScore(a);
              });

              const openFriendProfile = (
                friend: (typeof sortedFriends)[number],
                rank: number
              ) => {
                sound.playClick();
                setInspectedProfile({
                  source: 'friends',
                  ownerUid: friend.ownerUid,
                  username: friend.username,
                  avatar: friend.avatar,
                  catches: friend.catches,
                  money: friend.money,
                  timeSeconds: friend.timeSeconds,
                  isAdmin: friend.isAdmin,
                  hasOgTitle: friend.hasOgTitle,
                  isFavorite: friend.isFavorite,
                  rank,
                  bestFishId: friend.bestFishId,
                  discoveredCount: friend.discoveredCount,
                  masteredCount: friend.masteredCount,
                  underworldUnlocked: friend.underworldUnlocked,
                  equippedCosmetics: sanitizeEquippedCosmetics(
                    friend.equippedCosmetics
                  ),
                });

                // Si es una cuenta de Google fuera del Top 50, refrescar su skin y estadísticas en vivo
                if (
                  friend.ownerUid &&
                  !leaderboardEntries.some((e) => e.ownerUid === friend.ownerUid)
                ) {
                  getDoc(doc(db, 'leaderboard', friend.ownerUid))
                    .then((snap) => {
                      if (!snap.exists()) return;
                      const data = snap.data();
                      const liveCosmetics = Array.isArray(data.equippedCosmetics)
                        ? sanitizeEquippedCosmetics(data.equippedCosmetics)
                        : [];
                      setInspectedProfile((curr) =>
                        curr && curr.ownerUid === friend.ownerUid
                          ? {
                              ...curr,
                              username: String(data.username || curr.username),
                              avatar: String(data.avatar || curr.avatar),
                              catches: Number(data.catches) || curr.catches,
                              money: Number(data.money) || curr.money,
                              timeSeconds:
                                Number(data.timeSeconds) || curr.timeSeconds,
                              isAdmin: Boolean(data.isAdmin),
                              hasOgTitle: Boolean(data.hasOgTitle),
                              bestFishId:
                                typeof data.bestFishId === 'number'
                                  ? data.bestFishId
                                  : curr.bestFishId,
                              discoveredCount:
                                typeof data.discoveredCount === 'number'
                                  ? data.discoveredCount
                                  : curr.discoveredCount,
                              masteredCount:
                                typeof data.masteredCount === 'number'
                                  ? data.masteredCount
                                  : curr.masteredCount,
                              underworldUnlocked:
                                typeof data.underworldUnlocked === 'boolean'
                                  ? data.underworldUnlocked
                                  : curr.underworldUnlocked,
                              equippedCosmetics: liveCosmetics,
                            }
                          : curr
                      );
                    })
                    .catch((error) => {
                      const msg = error instanceof Error ? error.message : String(error);
                      if (
                        msg.toLowerCase().includes('permission') ||
                        msg.toLowerCase().includes('insufficient')
                      ) {
                        handleFirestoreError(
                          error,
                          OperationType.GET,
                          `leaderboard/${friend.ownerUid}`
                        );
                      }
                    });
                }
              };

              const topBest = sortedFriends[0];

              if (sortedFriends.length === 0) {
                return (
                  <div className="py-8 px-4 rounded-xl border-2 border-dashed border-[#cbd5e1] flex flex-col items-center justify-center text-center gap-2 bg-white/50">
                    <Users className="w-9 h-9 text-[#94a3b8]" />
                    <p className="text-sm font-extrabold text-[#334155]">
                      {lang === 'en' ? 'No friends added yet' : 'Aún no tienes amigos añadidos'}
                    </p>
                    <p className="text-xs text-[#64748b] max-w-sm">
                      {lang === 'en'
                        ? 'Enter your friends’ usernames above to add them, check their best catch and stats, and see who ranks as your Best Friend.'
                        : 'Escribe el nombre de tus amigos en el campo de arriba para agregarlos a tu lista, ver su mejor pez y estadísticas, y saber quién es tu mejor amigo.'}
                    </p>
                  </div>
                );
              }

              return (
                <div className="flex flex-col gap-2.5 overflow-hidden">
                  {/* SPOTLIGHT: 1.º MEJOR AMIGO */}
                  {topBest && friendsSortTab === 'best' && (
                    <button
                      type="button"
                      data-testid="best-friend-spotlight"
                      onClick={() => openFriendProfile(topBest, 1)}
                      className="w-full text-left rounded-xl bg-gradient-to-r from-[#fefce8] via-[#fffbeb] to-[#fef3c7] border-2 border-[#f59e0b] p-3 shadow-xs flex items-center justify-between gap-2.5 shrink-0 hover:brightness-[0.99] active:scale-[0.99] transition-all cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-10 h-11 rounded-xl bg-white/85 border border-[#fbbf24] flex items-center justify-center shrink-0 overflow-hidden shadow-xs">
                          <AnglerSkinPreview
                            cosmetics={sanitizeEquippedCosmetics(
                              topBest.equippedCosmetics
                            )}
                            world="river"
                            size="sm"
                          />
                        </div>
                        <div className="min-w-0">
                          <span className="text-[10px] font-black uppercase tracking-wider text-[#b45309] bg-[#fef08a] px-2 py-0.5 rounded-full border border-[#fde047]">
                            {lang === 'en'
                              ? '👑 Best Friend · View skin & profile'
                              : '👑 Mejor Amigo · Ver skin y perfil'}
                          </span>
                          <div className="font-display font-extrabold text-sm text-[#0f2942] truncate flex items-center gap-1.5 mt-0.5">
                            {renderAvatar(topBest.avatar, 20)}
                            <span>{topBest.username}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end shrink-0 text-right">
                        <div className="flex items-center gap-1 font-display font-black text-sm text-[#b45309] tabular-nums">
                          <CoinIcon size={14} />
                          <span>{formatNumber(topBest.money, lang)}</span>
                        </div>
                        <div className="text-[11px] font-bold text-[#64748b] tabular-nums">
                          {formatNumber(topBest.catches, lang)}{' '}
                          {lang === 'en' ? 'fish' : 'peces'} · {formatLongTime(topBest.timeSeconds)}
                        </div>
                      </div>
                    </button>
                  )}

                  {/* LISTA COMPLETA DE AMIGOS ORDENADA */}
                  <div className="flex flex-col gap-2 max-h-56 overflow-y-auto pr-1">
                    {sortedFriends.map((f, i) => {
                      const isRank1 = i === 0;
                      const isRank2 = i === 1;
                      const isRank3 = i === 2;
                      const bestSpecies =
                        f.bestFishId && f.bestFishId > 0
                          ? ALL_FISH.find((fish) => fish.id === f.bestFishId)
                          : undefined;

                      const rankBadge = isRank1 ? (
                        <span
                          title={lang === 'en' ? '1st Best Friend' : '1.º Mejor Amigo'}
                          className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#fef08a] to-[#fde047] border border-[#eab308] text-[#854d0e] text-xs font-black flex items-center justify-center shrink-0 shadow-xs"
                        >
                          👑 1
                        </span>
                      ) : isRank2 ? (
                        <span
                          title={lang === 'en' ? '2nd Place' : '2.º Puesto'}
                          className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#f1f5f9] to-[#e2e8f0] border border-[#94a3b8] text-[#334155] text-xs font-black flex items-center justify-center shrink-0"
                        >
                          🥈 2
                        </span>
                      ) : isRank3 ? (
                        <span
                          title={lang === 'en' ? '3rd Place' : '3.º Puesto'}
                          className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#ffedd5] to-[#fed7aa] border border-[#f97316] text-[#9a3412] text-xs font-black flex items-center justify-center shrink-0"
                        >
                          🥉 3
                        </span>
                      ) : (
                        <span className="w-7 h-7 rounded-lg bg-[#f8fafc] border border-[#cbd5e1] text-[11px] font-bold text-[#64748b] flex items-center justify-center shrink-0 tabular-nums">
                          #{i + 1}
                        </span>
                      );

                      return (
                        <div
                          key={`${f.username}-${i}`}
                          className={`p-2.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 transition-all ${
                            isRank1
                              ? 'bg-gradient-to-r from-[#fefce8] to-white border-[#facc15] shadow-xs'
                              : isRank2
                                ? 'bg-gradient-to-r from-[#f8fafc] to-white border-[#cbd5e1]'
                                : isRank3
                                  ? 'bg-gradient-to-r from-[#fff7ed] to-white border-[#fdba74]'
                                  : 'bg-white border-[#e2e8f0] hover:border-[#cbd5e1]'
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => openFriendProfile(f, i + 1)}
                            title={
                              lang === 'en'
                                ? `View ${f.username}'s skin and profile`
                                : `Ver skin y perfil de ${f.username}`
                            }
                            className="flex items-center gap-2 min-w-0 text-left cursor-pointer group"
                          >
                            {rankBadge}
                            {renderAvatar(f.avatar, 22)}
                            <div className="shrink-0 w-9 h-10 rounded-lg bg-[#f0f9ff] border border-[#cbd5e1] flex items-center justify-center overflow-hidden">
                              <AnglerSkinPreview
                                cosmetics={sanitizeEquippedCosmetics(
                                  f.equippedCosmetics
                                )}
                                world="river"
                                size="sm"
                              />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="font-extrabold text-sm text-[#0f2942] group-hover:text-[#0284c7] transition-colors truncate">
                                  {f.username}
                                </span>
                                {f.isFavorite && (
                                  <span
                                    title={
                                      lang === 'en'
                                        ? 'Pinned Favorite Best Friend'
                                        : 'Mejor Amigo Favorito fijado'
                                    }
                                    className="px-1.5 py-0.2 rounded bg-[#fef08a] border border-[#fde047] text-[#854d0e] text-[9px] font-black uppercase shrink-0"
                                  >
                                    {lang === 'en' ? '⭐ Favorite' : '⭐ Favorito'}
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] font-medium text-[#64748b] truncate">
                                {bestSpecies
                                  ? `${lang === 'en' ? 'Best:' : 'Mejor:'} ${getFishName(bestSpecies.id, lang)}`
                                  : lang === 'en'
                                    ? 'View skin, profile & stats'
                                    : 'Ver skin, perfil y estadísticas'}
                              </div>
                            </div>
                          </button>

                          {/* ESTADÍSTICAS DEL AMIGO Y ACCIONES */}
                          <div className="flex flex-wrap items-center justify-between sm:justify-end gap-2 shrink-0">
                            <div className="flex items-center gap-1.5 text-xs font-bold tabular-nums">
                              <span
                                title={lang === 'en' ? 'Coins earned' : 'Monedas ganadas'}
                                className="flex items-center gap-1 text-[#b45309] bg-[#fef3c7] px-2 py-0.5 rounded-md border border-[#fde68a]"
                              >
                                <CoinIcon size={12} />
                                <span>{formatNumber(f.money, lang)}</span>
                              </span>
                              <span
                                title={lang === 'en' ? 'Fish caught' : 'Peces pescados'}
                                className="flex items-center gap-1 text-[#0369a1] bg-[#e0f2fe] px-2 py-0.5 rounded-md border border-[#bae6fd]"
                              >
                                <Fish className="w-3 h-3 text-[#0284c7]" />
                                <span>{formatNumber(f.catches, lang)}</span>
                              </span>
                            </div>

                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                data-testid={`friend-profile-btn-${i}`}
                                title={
                                  lang === 'en'
                                    ? 'View profile, best catch & stats'
                                    : 'Ver perfil, mejor pez y estadísticas'
                                }
                                onClick={() => openFriendProfile(f, i + 1)}
                                className="px-2 py-1 rounded-lg bg-[#e0f2fe] hover:bg-[#bae6fd] text-[#0369a1] text-xs font-bold cursor-pointer transition-colors flex items-center gap-1"
                              >
                                <UserIcon className="w-3.5 h-3.5" />
                                <span>{lang === 'en' ? 'Profile' : 'Perfil'}</span>
                              </button>
                              <button
                                type="button"
                                title={
                                  f.isFavorite
                                    ? lang === 'en'
                                      ? 'Remove from favorites'
                                      : 'Quitar de favoritos'
                                    : lang === 'en'
                                      ? 'Mark as Favorite Best Friend'
                                      : 'Marcar como Mejor Amigo Favorito'
                                }
                                onClick={() => {
                                  setFriends((prev) =>
                                    prev.map((item) =>
                                      item.username.toLowerCase() === f.username.toLowerCase()
                                        ? { ...item, isFavorite: !item.isFavorite }
                                        : item
                                    )
                                  );
                                  if (!f.isFavorite) sound.playCelebration();
                                }}
                                className={`p-1.5 rounded-lg border text-xs cursor-pointer transition-colors ${
                                  f.isFavorite
                                    ? 'bg-[#fef08a] border-[#eab308] text-[#854d0e]'
                                    : 'bg-white border-[#cbd5e1] text-[#94a3b8] hover:text-[#f59e0b] hover:border-[#f59e0b]'
                                }`}
                              >
                                <Star
                                  className={`w-3.5 h-3.5 ${
                                    f.isFavorite ? 'fill-[#facc15] text-[#ca8a04]' : ''
                                  }`}
                                />
                              </button>
                              <button
                                type="button"
                                title={lang === 'en' ? 'Remove friend' : 'Eliminar amigo'}
                                onClick={() =>
                                  setFriends((prev) =>
                                    prev.filter(
                                      (item) =>
                                        item.username.toLowerCase() !== f.username.toLowerCase()
                                    )
                                  )
                                }
                                className="px-2 py-1 rounded-lg bg-[#fee2e2] hover:bg-[#fecaca] text-[#dc2626] text-xs font-bold cursor-pointer transition-colors"
                              >
                                {lang === 'en' ? 'Remove' : 'Eliminar'}
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* PERFIL PÚBLICO DE JUGADOR (CLASIFICACIÓN & AMIGOS) */}
      {mode === 'playing' && inspectedProfile && (() => {
        const bestSpecies =
          inspectedProfile.bestFishId && inspectedProfile.bestFishId > 0
            ? ALL_FISH.find((f) => f.id === inspectedProfile.bestFishId)
            : undefined;
        const bestRarityStyle = bestSpecies
          ? RARITIES[bestSpecies.rarity]
          : undefined;
        const hasRealThumb = bestSpecies
          ? Boolean(CUSTOM_FISH_IMAGES[bestSpecies.id])
          : false;
        const collectionPct =
          typeof inspectedProfile.discoveredCount === 'number'
            ? Math.min(
                100,
                Math.round(
                  (inspectedProfile.discoveredCount /
                    Math.max(1, ALL_FISH.length)) *
                    100
                )
              )
            : null;
        const alreadyFriend = friends.some(
          (f) =>
            f.username.trim().toLowerCase() ===
            inspectedProfile.username.trim().toLowerCase()
        );
        const canAddFriend =
          inspectedProfile.source === 'leaderboard' &&
          !inspectedProfile.isMe &&
          inspectedProfile.username.trim().toLowerCase() !==
            username.trim().toLowerCase();

        const profileCosmetics = inspectedProfile.isMe
          ? sanitizeEquippedCosmetics(equippedCosmetics)
          : sanitizeEquippedCosmetics(inspectedProfile.equippedCosmetics);
        const profileSuit = COSMETICS_CATALOG.find(
          (c) =>
            getCosmeticCategory(c.id) === 'suits' &&
            profileCosmetics.includes(c.id)
        );
        const profileCosmeticItems = COSMETICS_CATALOG.filter((c) =>
          profileCosmetics.includes(c.id)
        );

        return (
          <div
            data-testid="player-profile-modal"
            onClick={() => {
              sound.playClick();
              setInspectedProfile(null);
            }}
            className="fixed inset-0 bg-[#0f2942]/65 backdrop-blur-[2px] flex items-center justify-center p-4 z-30 animate-ui-backdrop"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-2xl bg-[#f8fafc] border border-[#cbd5e1] shadow-2xl overflow-hidden flex flex-col animate-ui-modal-in"
            >
              {/* Cabecera del jugador */}
              <div className="px-5 pt-5 pb-4 bg-white border-b border-[#e2e8f0] flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-14 h-14 rounded-2xl bg-[#e0f2fe] border border-[#bae6fd] flex items-center justify-center text-3xl shrink-0 overflow-hidden shadow-xs">
                    {renderAvatar(inspectedProfile.avatar, 48)}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h3 className="font-display font-extrabold text-lg text-[#0f2942] truncate">
                        {inspectedProfile.username}
                        {inspectedProfile.isMe ? (lang === 'en' ? ' (You)' : ' (Tú)') : ''}
                      </h3>
                      {inspectedProfile.isAdmin && (
                        <span className="px-1.5 py-0.5 rounded bg-gradient-to-r from-[#7f1d1d] to-[#450a0a] border border-[#dc2626] text-[#fecaca] text-[9px] font-extrabold uppercase tracking-wider shrink-0">
                          💀 ADMIN
                        </span>
                      )}
                      {inspectedProfile.hasOgTitle && (
                        <span className="px-1.5 py-0.5 rounded bg-gradient-to-r from-[#f97316] to-[#ea580c] border border-[#fdba74] text-white text-[9px] font-extrabold uppercase tracking-wider shrink-0">
                          OG
                        </span>
                      )}
                      {inspectedProfile.isFavorite && (
                        <span className="px-1.5 py-0.5 rounded bg-[#fef08a] border border-[#fde047] text-[#854d0e] text-[9px] font-black uppercase shrink-0">
                          {lang === 'en' ? '⭐ Favorite' : '⭐ Favorito'}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[#64748b] mt-0.5">
                      {inspectedProfile.source === 'leaderboard'
                        ? lang === 'en'
                          ? `Rank #${inspectedProfile.rank ?? '—'} · Google Player`
                          : `Puesto #${inspectedProfile.rank ?? '—'} · Jugador con Google`
                        : inspectedProfile.source === 'profile'
                          ? lang === 'en'
                            ? 'Your public profile'
                            : 'Tu perfil público'
                          : inspectedProfile.ownerUid
                            ? lang === 'en'
                              ? `Rank #${inspectedProfile.rank ?? '—'} in friends · Google Account`
                              : `Puesto #${inspectedProfile.rank ?? '—'} en amigos · Cuenta Google`
                            : lang === 'en'
                              ? `Rank #${inspectedProfile.rank ?? '—'} in friends · Local Angler`
                              : `Puesto #${inspectedProfile.rank ?? '—'} en amigos · Pescador local`}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  data-testid="close-player-profile-btn"
                  aria-label={lang === 'en' ? 'Close player profile' : 'Cerrar perfil de jugador'}
                  onClick={() => {
                    sound.playClick();
                    setInspectedProfile(null);
                  }}
                  className="p-1.5 rounded-lg hover:bg-[#f1f5f9] text-[#475569] cursor-pointer shrink-0 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Cuerpo: Skin Equipada + Mejor Pez + Estadísticas */}
              <div className="p-5 flex flex-col gap-4 max-h-[75vh] overflow-y-auto">
                {/* Skin puesta o creada del jugador */}
                <div
                  data-testid="player-profile-skin"
                  className="flex flex-col gap-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-extrabold uppercase tracking-wider text-[#475569]">
                      {lang === 'en' ? 'Angler Skin' : 'Skin del Pescador'}
                    </span>
                    <span className="text-[11px] font-bold text-[#0284c7]">
                      {profileSuit
                        ? getCosmeticName(profileSuit.id, lang, profileSuit.name)
                        : profileCosmeticItems.length > 0
                          ? lang === 'en'
                            ? `Custom (${profileCosmeticItems.length})`
                            : `Personalizada (${profileCosmeticItems.length})`
                          : lang === 'en'
                            ? 'Classic Look'
                            : 'Aspecto Clásico'}
                    </span>
                  </div>
                  <div className="p-3.5 rounded-xl bg-white border border-[#e2e8f0] shadow-xs flex items-center gap-3.5">
                    <div
                      className={`w-28 h-32 rounded-xl border-2 flex items-center justify-center shrink-0 overflow-hidden shadow-inner ${
                        profileSuit?.id === 'suit_magma'
                          ? 'bg-gradient-to-b from-[#450a0a] via-[#7c2d12] to-[#1c1917] border-[#f97316]'
                          : profileSuit?.id === 'suit_wizard'
                            ? 'bg-gradient-to-b from-[#1e1b4b] via-[#312e81] to-[#4c1d95] border-[#a855f7]'
                            : profileSuit?.id === 'suit_millionaire'
                              ? 'bg-gradient-to-b from-[#0f172a] via-[#1e293b] to-[#422006] border-[#facc15]'
                              : 'bg-gradient-to-b from-[#e0f2fe] to-[#bae6fd] border-[#7dd3fc]'
                      }`}
                    >
                      <AnglerSkinPreview
                        cosmetics={profileCosmetics}
                        world="river"
                        size="lg"
                      />
                    </div>
                    <div className="min-w-0 flex-1 flex flex-col gap-2">
                      {profileCosmeticItems.length === 0 ? (
                        <p className="text-xs text-[#64748b] leading-relaxed">
                          {lang === 'en'
                            ? 'Wearing the classic angler outfit with no special gear or rods equipped.'
                            : 'Lleva el atuendo clásico de pescador sin prendas ni cañas especiales equipadas.'}
                        </p>
                      ) : (
                        <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-0.5">
                          {profileCosmeticItems.map((item) => (
                            <div
                              key={item.id}
                              className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-[#f8fafc] border border-[#e2e8f0]"
                            >
                              <CosmeticItemDrawing
                                itemId={item.id}
                                size={22}
                              />
                              <span className="text-[11px] font-bold text-[#0f2942] leading-tight">
                                {getCosmeticName(item.id, lang, item.name)}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                      {inspectedProfile.isMe && (
                        <button
                          type="button"
                          onClick={() => {
                            sound.playClick();
                            setInspectedProfile(null);
                            setSkinStudioTab('wardrobe');
                            setActivePanel('locker');
                          }}
                          className="self-start px-2.5 py-1 rounded-lg bg-[#7e22ce] hover:bg-[#6b21a8] text-white text-[11px] font-bold cursor-pointer transition-colors"
                        >
                          {lang === 'en' ? 'Edit in Locker' : 'Editar en Taquilla'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Foco principal: Mejor Pez */}
                <div data-testid="player-profile-best-fish" className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold uppercase tracking-wider text-[#475569]">
                      {lang === 'en' ? 'Best Fish Caught' : 'Mejor Pez Capturado'}
                    </span>
                    {bestSpecies && bestRarityStyle && (
                      <span
                        className="text-[11px] font-extrabold uppercase tracking-wide px-2 py-0.5 rounded-md"
                        style={{
                          backgroundColor: bestRarityStyle.bgColor,
                          color: bestRarityStyle.color,
                        }}
                      >
                        {getRarityName(bestSpecies.rarity, lang)}
                      </span>
                    )}
                  </div>

                  {bestSpecies ? (
                    <div className="p-3.5 rounded-xl bg-white border border-[#e2e8f0] shadow-xs flex items-center gap-3.5">
                      <div
                        className={`relative w-24 h-16 rounded-xl border p-1.5 flex items-center justify-center shrink-0 overflow-hidden shadow-inner ${
                          isUnderworldSpecies(bestSpecies.id)
                            ? 'bg-gradient-to-br from-[#2b0909] via-[#450a0a] to-[#170404] border-[#ef4444]/45'
                            : 'bg-gradient-to-br from-[#132f4c] via-[#1b4965] to-[#0b1f33] border-[#38bdf8]/40'
                        }`}
                      >
                        <div
                          aria-hidden="true"
                          className="pointer-events-none absolute inset-0"
                          style={{
                            background: isUnderworldSpecies(bestSpecies.id)
                              ? 'radial-gradient(circle at 50% 45%, rgba(249,115,22,0.22), transparent 72%)'
                              : 'radial-gradient(circle at 50% 45%, rgba(125,211,252,0.24), transparent 72%)',
                          }}
                        />
                        {hasRealThumb ? (
                          <RealisticFishThumb
                            fishId={bestSpecies.id}
                            alt={getFishName(bestSpecies.id, lang)}
                            className="relative z-10 w-full h-full object-contain drop-shadow-[0_4px_6px_rgba(0,0,0,0.48)]"
                          />
                        ) : (
                          <Fish
                            className="relative z-10 w-9 h-9 drop-shadow"
                            style={{ color: bestSpecies.spriteColor }}
                          />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-display font-extrabold text-base text-[#0f2942] truncate">
                          {getFishName(bestSpecies.id, lang)}
                        </div>
                        <div className="mt-1 text-xs text-[#64748b] tabular-nums">
                          {getSpeciesOddsLabel(bestSpecies, lang)}
                          <span aria-hidden="true"> · </span>
                          {formatNumber(getSpeciesSellValue(bestSpecies), lang)}{' '}
                          {lang === 'en' ? 'coins' : 'monedas'}
                          <span aria-hidden="true"> · </span>
                          {isUnderworldSpecies(bestSpecies.id)
                            ? t('underworld', lang)
                            : t('riverNormal', lang)}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 rounded-xl bg-white border border-dashed border-[#cbd5e1] flex items-center gap-3 text-[#64748b]">
                      <Fish className="w-7 h-7 text-[#94a3b8] shrink-0" />
                      <p className="text-xs font-medium leading-relaxed">
                        {inspectedProfile.catches === 0
                          ? lang === 'en'
                            ? 'This angler hasn’t caught their first fish yet.'
                            : 'Este pescador todavía no ha capturado su primer pez.'
                          : lang === 'en'
                            ? 'This player hasn’t synced their best catch from their latest session yet.'
                            : 'Este jugador aún no ha sincronizado su mejor pez desde su última partida.'}
                      </p>
                    </div>
                  )}
                </div>

                {/* Cuadrícula de Estadísticas */}
                <div className="flex flex-col gap-2">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-[#475569]">
                    {lang === 'en' ? 'Angler Stats' : 'Estadísticas del Pescador'}
                  </span>
                  <div
                    data-testid="player-profile-stats"
                    className="grid grid-cols-2 sm:grid-cols-3 gap-2.5"
                  >
                    <div className="p-3 rounded-xl bg-white border border-[#e2e8f0]">
                      <div className="text-[11px] font-semibold text-[#64748b]">
                        {t('captures', lang)}
                      </div>
                      <div className="mt-0.5 font-display font-extrabold text-base text-[#0f2942] tabular-nums">
                        {formatNumber(inspectedProfile.catches, lang)}
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-white border border-[#e2e8f0]">
                      <div className="text-[11px] font-semibold text-[#64748b]">
                        {lang === 'en' ? 'Total coins' : 'Dinero total'}
                      </div>
                      <div className="mt-0.5 font-display font-extrabold text-base text-[#b45309] tabular-nums flex items-center gap-1">
                        <CoinIcon size={14} />
                        <span className="truncate">
                          {formatNumber(inspectedProfile.money, lang)}
                        </span>
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-white border border-[#e2e8f0]">
                      <div className="text-[11px] font-semibold text-[#64748b]">
                        {lang === 'en' ? 'Time played' : 'Tiempo jugado'}
                      </div>
                      <div className="mt-0.5 font-display font-extrabold text-base text-[#0f2942] tabular-nums">
                        {formatLongTime(inspectedProfile.timeSeconds)}
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-white border border-[#e2e8f0]">
                      <div className="text-[11px] font-semibold text-[#64748b]">
                        {t('index', lang)}
                      </div>
                      <div className="mt-0.5 font-display font-extrabold text-base text-[#0284c7] tabular-nums">
                        {typeof inspectedProfile.discoveredCount === 'number'
                          ? `${inspectedProfile.discoveredCount}/${ALL_FISH.length}`
                          : '—'}
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-white border border-[#e2e8f0]">
                      <div className="text-[11px] font-semibold text-[#64748b]">
                        {lang === 'en' ? 'Masteries (50+)' : 'Maestrías (50+)'}
                      </div>
                      <div className="mt-0.5 font-display font-extrabold text-base text-[#ca8a04] tabular-nums flex items-center gap-1">
                        <Medal className="w-3.5 h-3.5 text-[#ca8a04] fill-[#fde047] shrink-0" />
                        <span>
                          {typeof inspectedProfile.masteredCount === 'number'
                            ? inspectedProfile.masteredCount
                            : '—'}
                        </span>
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-white border border-[#e2e8f0]">
                      <div className="text-[11px] font-semibold text-[#64748b]">
                        {t('underworld', lang)}
                      </div>
                      <div
                        className={`mt-0.5 font-display font-extrabold text-sm ${
                          inspectedProfile.underworldUnlocked === true
                            ? 'text-[#dc2626]'
                            : inspectedProfile.underworldUnlocked === false
                              ? 'text-[#64748b]'
                              : 'text-[#94a3b8]'
                        }`}
                      >
                        {inspectedProfile.underworldUnlocked === true
                          ? lang === 'en'
                            ? 'Unlocked'
                            : 'Desbloqueado'
                          : inspectedProfile.underworldUnlocked === false
                            ? lang === 'en'
                              ? 'Locked'
                              : 'Bloqueado'
                            : '—'}
                      </div>
                    </div>
                  </div>

                  {collectionPct !== null && (
                    <div className="mt-1 flex flex-col gap-1">
                      <div className="flex items-center justify-between text-[11px] font-semibold text-[#64748b] tabular-nums">
                        <span>
                          {lang === 'en' ? 'Total index progress' : 'Progreso total del índice'}
                        </span>
                        <span>{collectionPct}%</span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-[#e2e8f0] overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-[#10b981] to-[#0284c7] transition-all duration-300"
                          style={{ width: `${collectionPct}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Pie de modal: Añadir amigo / Cerrar */}
              <div className="px-5 py-3.5 bg-white border-t border-[#e2e8f0] flex items-center justify-between gap-2">
                {canAddFriend ? (
                  alreadyFriend ? (
                    <span className="text-xs font-bold text-[#059669]">
                      {lang === 'en'
                        ? '✓ Already on your friends list'
                        : '✓ Ya está en tu lista de amigos'}
                    </span>
                  ) : (
                    <button
                      type="button"
                      data-testid="profile-add-friend-btn"
                      onClick={() => {
                        sound.playCelebration();
                        setFriends((prev) => {
                          if (
                            prev.some(
                              (f) =>
                                f.username.trim().toLowerCase() ===
                                inspectedProfile.username.trim().toLowerCase()
                            )
                          ) {
                            return prev;
                          }
                          return [
                            ...prev,
                            {
                              ownerUid: inspectedProfile.ownerUid,
                              username: inspectedProfile.username,
                              avatar: inspectedProfile.avatar,
                              catches: inspectedProfile.catches,
                              money: inspectedProfile.money,
                              timeSeconds: inspectedProfile.timeSeconds,
                              bestFishId: inspectedProfile.bestFishId,
                              discoveredCount: inspectedProfile.discoveredCount,
                              masteredCount: inspectedProfile.masteredCount,
                              underworldUnlocked: inspectedProfile.underworldUnlocked,
                              equippedCosmetics:
                                inspectedProfile.equippedCosmetics ?? [],
                            },
                          ];
                        });
                      }}
                      className="px-3.5 py-2 rounded-xl bg-[#0284c7] hover:bg-[#0369a1] text-white text-xs font-extrabold cursor-pointer transition-colors flex items-center gap-1.5"
                    >
                      <Users className="w-3.5 h-3.5" />
                      <span>{lang === 'en' ? 'Add friend' : 'Añadir a amigos'}</span>
                    </button>
                  )
                ) : (
                  <span />
                )}
                <button
                  type="button"
                  onClick={() => {
                    sound.playClick();
                    setInspectedProfile(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-[#e2e8f0] hover:bg-[#cbd5e1] text-[#0f2942] text-xs font-bold cursor-pointer transition-colors"
                >
                  {lang === 'en' ? 'Close' : 'Cerrar'}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* MARKET MODAL (Venta Rápida, Mochila, Trajes Especiales, Caña OG & Ropa) */}
      {mode === 'playing' && activePanel === 'market' && (
        <div className="fixed inset-0 bg-[#0f2942]/45 flex items-center justify-center p-3 sm:p-4 z-20 animate-ui-backdrop">
          <div className="w-full max-w-2xl rounded-2xl bg-[#f8fafc] border border-[#cbd5e1] shadow-xl flex flex-col max-h-[88vh] overflow-hidden animate-ui-modal-in">
            <div className="shrink-0 flex items-center justify-between px-5 pt-4 pb-3 border-b border-[#e2e8f0] bg-white">
              <div className="flex items-center gap-3 min-w-0">
                <h2 className="font-display font-bold text-xl text-[#0f2942]">
                  {world === 'underworld'
                    ? lang === 'en'
                      ? 'Underworld Fishing Market'
                      : 'Mercado del Inframundo'
                    : lang === 'en'
                      ? 'Fishing Market'
                      : 'Mercado de Pesca'}
                </h2>
                <span className="px-2.5 py-1 rounded-lg bg-[#fef3c7] border border-[#fcd34d] text-[#92400e] text-xs font-extrabold tabular-nums inline-flex items-center gap-1">
                  <CoinIcon size={13} />
                  <span>{formatNumber(coins, lang)}</span>
                </span>
              </div>
              <div className="relative flex items-center gap-2">
                <button
                  type="button"
                  data-testid="close-market-btn"
                  title={lang === 'en' ? 'Close market' : 'Cerrar mercado'}
                  onClick={closeActivePanel}
                  aria-label={lang === 'en' ? 'Close market' : 'Cerrar mercado'}
                  className="p-1.5 rounded-lg hover:bg-[#e2e8f0] text-[#475569] cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Organized Market Sections Navigation Bar */}
            <div
              data-testid="market-sections-nav"
              className="shrink-0 px-5 py-2.5 bg-[#f1f5f9] border-b border-[#e2e8f0] flex items-center gap-1.5 overflow-x-auto"
            >
              {(
                [
                  {
                    id: 'all',
                    label: lang === 'en' ? 'All Sections' : 'Todo el Mercado',
                  },
                  {
                    id: 'sell',
                    label:
                      lang === 'en'
                        ? `Sell Catch (${inventory.length})`
                        : `Vender Pesca (${inventory.length})`,
                  },
                  {
                    id: 'suits',
                    label: lang === 'en' ? 'Exclusive Suits' : 'Trajes Exclusivos',
                  },
                  {
                    id: 'clothing',
                    label: lang === 'en' ? 'Clothing & Style' : 'Ropa y Estilo',
                  },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  data-testid={`market-section-tab-${tab.id}`}
                  onClick={() => {
                    sound.playClick();
                    setMarketSectionTab(tab.id);
                  }}
                  className={`px-3 py-1.5 rounded-xl font-display font-extrabold text-xs whitespace-nowrap transition-all cursor-pointer ${
                    marketSectionTab === tab.id
                      ? 'bg-[#0f2942] text-[#fde047] shadow-sm'
                      : 'bg-white text-[#475569] hover:bg-[#e2e8f0] border border-[#cbd5e1]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-5 pt-4 flex flex-col gap-4">
              {(marketSectionTab === 'all' || marketSectionTab === 'sell') && (
              <>
              {world === 'underworld' && (() => {
                const underworldCatches = inventory.filter((p) => p.species.id >= 200);
                const underworldValue = underworldCatches.reduce((s, p) => s + p.sellValue, 0);
                return (
                  <div
                    data-testid="underworld-vendor-banner"
                    className="shrink-0 rounded-xl bg-gradient-to-r from-[#280806] via-[#450a0a] to-[#280806] border-2 border-[#f97316] p-3.5 text-white shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-12 h-12 rounded-xl bg-[#1c0605] border border-[#fb923c] flex items-center justify-center shrink-0 overflow-hidden shadow-inner">
                        <svg viewBox="0 0 64 64" className="w-11 h-11">
                          {/* Female Stickman Vendor Portrait */}
                          <ellipse cx="32" cy="27" rx="14" ry="15" fill="#431910" />
                          <path d="M40 22 Q52 27 49 44 Q43 44 41 33 Z" fill="#431910" />
                          <ellipse cx="42" cy="23.5" rx="3" ry="2" fill="#ef4444" />
                          <circle cx="42" cy="23.5" r="1" fill="#fde047" />
                          <rect x="19" y="40" width="26" height="22" rx="6" fill="#d4b499" />
                          <path d="M21 42 L27 42 L32 49 L37 42 L43 42 L45 62 L19 62 Z" fill="#7f1d1d" stroke="#f59e0b" strokeWidth="1.3" />
                          <circle cx="32" cy="52" r="1.3" fill="#fbbf24" />
                          <rect x="28.5" y="35" width="7" height="6.5" rx="2" fill="#cfa070" />
                          <circle cx="21" cy="28" r="1.4" fill="#facc15" />
                          <circle cx="43" cy="28" r="1.4" fill="#facc15" />
                          <circle cx="32" cy="26" r="11" fill="#ecc090" stroke="#782a12" strokeWidth="1" />
                          <path d="M21 24 A11 11 0 0 1 43 24 Q39 18 35 20 Q32 16 29 19 Q24 20 21 24 Z" fill="#542114" />
                          <ellipse cx="28" cy="25.5" rx="1.4" ry="2" fill="#1c120c" />
                          <ellipse cx="36" cy="25.5" rx="1.4" ry="2" fill="#1c120c" />
                          <circle cx="27.6" cy="24.8" r="0.55" fill="#fffbeb" />
                          <circle cx="35.6" cy="24.8" r="0.55" fill="#fffbeb" />
                          <path d="M26.6 24.2 L25.2 23 M27.3 23.8 L26.2 22.4 M37.4 24.2 L38.8 23 M36.7 23.8 L37.8 22.4" stroke="#26140c" strokeWidth="1" strokeLinecap="round" />
                          <ellipse cx="25.2" cy="28.5" rx="2.1" ry="1.1" fill="rgba(248,113,113,0.36)" />
                          <ellipse cx="38.8" cy="28.5" rx="2.1" ry="1.1" fill="rgba(248,113,113,0.36)" />
                          <path d="M28.8 29.2 Q32 32.2 35.2 29.2" fill="none" stroke="#3b1d12" strokeWidth="1.4" strokeLinecap="round" />
                        </svg>
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-2 py-0.5 rounded-md bg-[#f97316]/25 border border-[#fb923c] text-[#fde047] font-display font-black text-[10px] uppercase tracking-wider">
                            {lang === 'en' ? 'Underworld Stall · Sell Catch' : 'Puesto Vender Pesca · Inframundo'}
                          </span>
                        </div>
                        <p className="text-xs text-amber-100/95 mt-1 leading-snug">
                          {lang === 'en'
                            ? 'Sell your exclusive Underworld magma catches directly at the volcanic counter.'
                            : 'Vende tus capturas exclusivas del Inframundo directamente en el mostrador volcánico.'}
                        </p>
                      </div>
                    </div>
                    {underworldCatches.length > 0 && (
                      <button
                        type="button"
                        data-testid="sell-underworld-catches-btn"
                        onClick={() => {
                          sound.playClick();
                          setCoins((c) => c + underworldValue);
                          setTotalCoinsEarned((t) => t + underworldValue);
                          recordDailyQuestCoins(underworldValue);
                          setInventory((prev) => prev.filter((p) => p.species.id < 200));
                        }}
                        className="px-3.5 py-2 rounded-xl bg-gradient-to-b from-[#fde047] to-[#f59e0b] hover:brightness-105 text-[#1e1b4b] font-display font-extrabold text-xs whitespace-nowrap shrink-0 cursor-pointer shadow-md"
                      >
                        {lang === 'en'
                          ? `Sell Underworld (${underworldCatches.length}) · +${formatNumber(underworldValue, lang)}`
                          : `Vender Inframundo (${underworldCatches.length}) · +${formatNumber(underworldValue, lang)}`}
                      </button>
                    )}
                  </div>
                );
              })()}
              <div className="shrink-0 flex flex-wrap items-center justify-between gap-2 bg-[#e2e8f0]/60 px-4 py-2.5 rounded-xl">
                <span className="text-sm text-[#475569]">
                  {lang === 'en' ? 'In backpack:' : 'En mochila:'}{' '}
                  <strong className="text-[#0f2942] tabular-nums">
                    {inventory.length}/{backpackCapacity}
                  </strong>
                </span>
                <div className="relative">
                  <button
                    type="button"
                    data-testid="quick-sell-btn"
                    disabled={inventory.length === 0}
                    onClick={handleQuickSellAll}
                    className="px-3.5 py-1.5 rounded-lg bg-[#d97706] hover:bg-[#b45309] disabled:opacity-40 text-white text-sm font-bold transition-colors cursor-pointer"
                  >
                    {lang === 'en' ? 'Quick Sell (+' : 'Venta Rápida (+'}
                    {formatNumber(
                      inventory.reduce((s, p) => s + p.sellValue, 0),
                      lang
                    )}{' '}
                    {lang === 'en' ? 'coins)' : 'monedas)'}
                  </button>
                </div>
              </div>

              {(() => {
                const upg = getBackpackUpgradeInfo(backpackCapacity);
                return (
                  <div className="shrink-0 flex items-center justify-between gap-3 bg-[#e0f2fe]/70 border border-[#7dd3fc] px-3.5 py-2.5 rounded-xl">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-11 h-11 rounded-lg bg-white border border-[#bae6fd] p-1 flex items-center justify-center shrink-0">
                        <svg viewBox="0 0 48 48" className="w-full h-full">
                          <path d="M17 13 Q24 6 31 13" stroke="#0369a1" strokeWidth="3.5" fill="none" strokeLinecap="round" />
                          <rect x="11" y="13" width="26" height="28" rx="7" fill="#0284c7" stroke="#0c4a6e" strokeWidth="2.2" />
                          <path d="M11 21 L37 21" stroke="#38bdf8" strokeWidth="2.5" />
                          <rect x="16" y="26" width="16" height="10" rx="3" fill="#0369a1" stroke="#0c4a6e" strokeWidth="1.5" />
                          <circle cx="24" cy="21" r="2.2" fill="#facc15" />
                        </svg>
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs font-extrabold uppercase tracking-wider text-[#0369a1]">
                          {lang === 'en' ? 'Upgrade Backpack' : 'Mejorar Mochila'}
                        </span>
                        <span className="text-xs text-[#475569]">
                          {upg.maxed
                            ? lang === 'en'
                              ? 'Max capacity reached (100/100)'
                              : 'Capacidad máxima alcanzada (100/100)'
                            : lang === 'en'
                              ? `Expand +${upg.step} slot${upg.step > 1 ? 's' : ''} (${backpackCapacity} → ${backpackCapacity + upg.step})`
                              : `Ampliar +${upg.step} espacio${upg.step > 1 ? 's' : ''} (${backpackCapacity} → ${backpackCapacity + upg.step})`}
                        </span>
                      </div>
                    </div>
                    {!upg.maxed && (
                      <button
                        type="button"
                        disabled={coins < upg.cost}
                        onClick={() => {
                          if (coins >= upg.cost) {
                            setCoins((c) => c - upg.cost);
                            setBackpackCapacity((cap) =>
                              Math.min(100, cap + upg.step)
                            );
                          }
                        }}
                        className="px-3 py-1.5 rounded-lg bg-[#0284c7] hover:bg-[#0369a1] disabled:opacity-40 text-white text-xs font-bold transition-colors cursor-pointer shrink-0 tabular-nums"
                      >
                        {formatNumber(upg.cost, lang)} {lang === 'en' ? 'coins' : 'monedas'}
                      </button>
                    )}
                  </div>
                );
              })()}
              </>
              )}

              {/* TRAJES COMPLETOS YA MONTADOS (MILLONARIO 50K · MAGMA 75K · MAGO 100K) */}
              {(marketSectionTab === 'all' || marketSectionTab === 'suits') && (
              <div
                data-testid="market-suits-section"
                className="shrink-0 flex flex-col gap-2.5 p-3.5 rounded-xl bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#0f172a] border border-[#334155] text-white"
              >
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <span className="font-display font-extrabold text-xs uppercase tracking-wider text-[#fde047]">
                      {lang === 'en'
                        ? 'Exclusive Full Suits'
                        : 'Trajes Completos Exclusivos'}
                    </span>
                    <p className="text-[11px] text-slate-300">
                      {lang === 'en'
                        ? 'Complete custom outfits with unique dock animations'
                        : 'Conjuntos ya montados con diseño propio y efectos en el muelle'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSkinStudioTab('shop');
                      setActivePanel('locker');
                    }}
                    className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-[11px] font-bold text-[#bae6fd] cursor-pointer shrink-0"
                  >
                    {lang === 'en' ? 'Open Locker' : 'Abrir Taquilla'}
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-2">
                  {COSMETICS_CATALOG.filter((item) =>
                    (SUIT_IDS as readonly string[]).includes(item.id)
                  ).map((item) => {
                    const owned = ownedCosmetics.includes(item.id);
                    const equipped = equippedCosmetics.includes(item.id);
                    const canAfford = coins >= item.price;
                    return (
                      <div
                        key={item.id}
                        data-testid={`market-suit-${item.id}`}
                        className={`flex items-center justify-between gap-3 p-2.5 rounded-xl border ${
                          equipped
                            ? 'border-[#38bdf8] bg-white/12'
                            : 'border-white/15 bg-white/5'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <CosmeticItemDrawing itemId={item.id} size={52} />
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-display font-extrabold text-sm text-white">
                                {getCosmeticName(item.id, lang, item.name)}
                              </span>
                              {item.id === 'suit_wizard' && (
                                <span className="text-[10px] font-bold text-[#c4b5fd]">
                                  {lang === 'en'
                                    ? '· Fish with magic wand'
                                    : '· Pesca con varita mágica'}
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-300 line-clamp-2 mt-0.5">
                              {getCosmeticDescription(item.id, lang, item.description)}
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-1.5 shrink-0">
                          {!owned && (
                            <button
                              type="button"
                              onClick={() => {
                                setPreviewCosmeticId(item.id);
                                setSkinStudioTab('shop');
                                setActivePanel('locker');
                              }}
                              className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-[10px] font-bold text-slate-200 cursor-pointer"
                            >
                              {lang === 'en' ? 'Preview' : 'Probar'}
                            </button>
                          )}
                          <button
                            type="button"
                            disabled={!owned && !canAfford}
                            onClick={() => handleBuyOrToggleCosmetic(item.id, item.price)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-extrabold whitespace-nowrap cursor-pointer tabular-nums ${
                              equipped
                                ? 'bg-[#0284c7] hover:bg-[#0369a1] text-white'
                                : owned
                                  ? 'bg-[#7e22ce] hover:bg-[#6b21a8] text-white'
                                  : canAfford
                                    ? 'bg-[#f59e0b] hover:bg-[#d97706] text-[#1e1b4b]'
                                    : 'bg-white/10 text-slate-400 cursor-not-allowed'
                            }`}
                          >
                            {equipped ? (
                              lang === 'en' ? (
                                'Equipped (Unequip)'
                              ) : (
                                'Puesto (Quitar)'
                              )
                            ) : owned ? (
                              lang === 'en' ? (
                                'Equip'
                              ) : (
                                'Equipar'
                              )
                            ) : (
                              <span className="inline-flex items-center gap-1">
                                <CoinIcon size={12} />
                                <span>{formatNumber(item.price, lang)}</span>
                              </span>
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              )}

              {/* Ropas, Trajes, Sombreros y Accesorios */}
              {(marketSectionTab === 'all' || marketSectionTab === 'clothing') && (
              <div className="shrink-0 flex flex-col gap-2.5 p-3.5 rounded-xl bg-white border border-[#e2e8f0]">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-1.5">
                    <Shirt className="w-4 h-4 text-[#0284c7]" />
                    <span className="font-display font-extrabold text-xs uppercase tracking-wider text-[#0f2942]">
                      {lang === 'en' ? 'Clothing & Style Catalog' : 'Catálogo de Ropa y Estilo'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 flex-wrap">
                    {(
                      [
                        { id: 'all', label: lang === 'en' ? 'All' : 'Todo' },
                        { id: 'suits', label: lang === 'en' ? 'Suits' : 'Trajes' },
                        { id: 'shirts', label: lang === 'en' ? 'Shirts' : 'Camisetas' },
                        { id: 'pants', label: lang === 'en' ? 'Pants' : 'Pantalones' },
                        { id: 'head', label: lang === 'en' ? 'Head' : 'Cabeza' },
                      ] as const
                    ).map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => setMarketClothingFilter(f.id)}
                        className={`px-2.5 py-1 rounded-md text-[11px] font-bold cursor-pointer transition-colors ${
                          marketClothingFilter === f.id
                            ? 'bg-[#0f2942] text-white'
                            : 'bg-[#f1f5f9] text-[#475569] hover:bg-[#e2e8f0]'
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {COSMETICS_CATALOG.filter((item) => {
                    if (item.id === 'rod_og') return false;
                    const cat = getCosmeticCategory(item.id);
                    const isSuit = cat === 'suits';
                    const isTop =
                      item.id in SHIRT_COLORS ||
                      item.id === 'coat_polar' ||
                      item.id === 'coat_hoodie' ||
                      item.id === 'coat_jacket_crimson';
                    const isPants = item.id in PANTS_COLORS;
                    const isHead = cat === 'head';
                    const isBoots =
                      item.id === 'boots_tall' || item.id === 'height_tall';

                    if (marketClothingFilter === 'suits') return isSuit;
                    if (marketClothingFilter === 'shirts') return isTop;
                    if (marketClothingFilter === 'pants') return isPants;
                    if (marketClothingFilter === 'head') return isHead;
                    return isSuit || isTop || isPants || isHead || isBoots;
                  }).map((item) => {
                    const owned = ownedCosmetics.includes(item.id);
                    const equipped = equippedCosmetics.includes(item.id);
                    const canAfford = coins >= item.price;
                    return (
                      <div
                        key={item.id}
                        className={`flex items-center justify-between gap-2.5 p-2.5 rounded-xl border ${
                          equipped
                            ? 'border-[#0284c7] bg-[#f0f9ff]'
                            : 'border-[#e2e8f0] bg-[#f8fafc]'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <CosmeticItemDrawing itemId={item.id} size={44} />
                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-bold text-[#0f2942] truncate">
                              {getCosmeticName(item.id, lang, item.name)}
                            </div>
                            <div className="text-[10px] text-[#64748b] truncate flex items-center gap-1 tabular-nums">
                              {equipped ? (
                                lang === 'en' ? (
                                  'Equipped'
                                ) : (
                                  'Puesto'
                                )
                              ) : owned ? (
                                lang === 'en' ? (
                                  'In your locker'
                                ) : (
                                  'En tu taquilla'
                                )
                              ) : (
                                <>
                                  <CoinIcon size={11} />
                                  <span>{formatNumber(item.price, lang)}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        <button
                          type="button"
                          disabled={!owned && !canAfford}
                          onClick={() => handleBuyOrToggleCosmetic(item.id, item.price)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap shrink-0 cursor-pointer tabular-nums ${
                            equipped
                              ? 'bg-[#0284c7] hover:bg-[#0369a1] text-white'
                              : owned
                                ? 'bg-[#7e22ce] hover:bg-[#6b21a8] text-white'
                                : canAfford
                                  ? 'bg-[#1e3a5f] hover:bg-[#162d4a] text-white'
                                  : 'bg-[#e2e8f0] text-[#94a3b8] cursor-not-allowed'
                          }`}
                        >
                          {equipped ? (
                            lang === 'en' ? (
                              'Unequip'
                            ) : (
                              'Quitar'
                            )
                          ) : owned ? (
                            lang === 'en' ? (
                              'Equip'
                            ) : (
                              'Equipar'
                            )
                          ) : (
                            <span className="inline-flex items-center gap-1">
                              <CoinIcon size={12} />
                              <span>{formatNumber(item.price, lang)}</span>
                            </span>
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
              )}

              {/* Peces en mochila */}
              {(marketSectionTab === 'all' || marketSectionTab === 'sell') && (
              <div className="flex flex-col gap-2">
                {inventory.length === 0 ? (
                  <p className="text-center text-sm text-[#64748b] py-5">
                    {lang === 'en'
                      ? 'Your backpack is empty. Cast your line!'
                      : 'No tienes peces en tu mochila. ¡Lanza el anzuelo!'}
                  </p>
                ) : (
                  inventory.map((item) => {
                    const r = RARITIES[item.species.rarity];
                    return (
                      <div
                        key={item.uid}
                        className="flex items-center justify-between gap-3 p-3 rounded-xl bg-white border border-[#e2e8f0]"
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          {CUSTOM_FISH_IMAGES[item.species.id] ? (
                            <div
                              className={`w-14 h-9 rounded-lg p-1 flex items-center justify-center shrink-0 border ${
                                isUnderworldSpecies(item.species.id)
                                  ? 'bg-gradient-to-br from-[#2b0909] via-[#450a0a] to-[#170404] border-[#ef4444]/40'
                                  : 'bg-gradient-to-br from-[#132f4c] via-[#1b4965] to-[#0b1f33] border-[#38bdf8]/35'
                              }`}
                            >
                              <RealisticFishThumb
                                fishId={item.species.id}
                                alt={getFishName(item.species.id, lang)}
                                variantIndex={item.variantIndex}
                                className="w-full h-full object-contain drop-shadow-[0_2px_4px_rgba(0,0,0,0.45)]"
                              />
                            </div>
                          ) : (
                            <span
                              className="w-4 h-4 rounded-full border border-[#0f172a] shrink-0"
                              style={{ backgroundColor: item.species.spriteColor }}
                            />
                          )}
                          <div className="min-w-0">
                            <div className="font-bold text-sm text-[#0f2942] truncate">
                              {getFishName(item.species.id, lang)}
                            </div>
                            <div className="text-xs font-medium flex items-center gap-1.5 flex-wrap" style={{ color: r.color }}>
                              <span>{getRarityName(item.species.rarity, lang)}</span>
                              {typeof item.weightKg === 'number' && item.weightKg > 0 && (
                                <span className="text-[#475569] font-semibold tabular-nums">
                                  · {formatFishWeight(item.weightKg, lang)}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleSellOne(item.uid)}
                          className="px-3 py-1.5 rounded-lg bg-[#f1f5f9] hover:bg-[#e2e8f0] text-[#0f2942] text-xs font-bold tabular-nums cursor-pointer shrink-0 whitespace-nowrap"
                        >
                          {lang === 'en' ? 'Sell' : 'Vender'} +{formatNumber(item.sellValue, lang)}
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* LOCKER / TAQUILLA & TIENDA DE SKINS MODAL */}
      {mode === 'playing' && activePanel === 'locker' && (
        <SkinStudioModal
          coins={coins}
          username={username}
          world={world}
          lang={lang}
          catalog={COSMETICS_CATALOG}
          ownedCosmetics={ownedCosmetics}
          equippedCosmetics={equippedCosmetics}
          initialTab={skinStudioTab}
          previewCosmeticId={previewCosmeticId}
          onSetPreviewCosmeticId={setPreviewCosmeticId}
          onBuyOrToggle={handleBuyOrToggleCosmetic}
          onResetAll={() => setEquippedCosmetics([])}
          onClose={closeActivePanel}
        />
      )}

      {/* PAUSED MODAL */}
      {mode === 'paused' && deleteStep === 'none' && (
        <div className="fixed inset-0 bg-[#0f2942]/45 flex items-center justify-center p-6 z-20 animate-ui-backdrop">
          <div className="w-full max-w-sm rounded-2xl bg-[#f8fafc] border border-[#cbd5e1] p-6 shadow-xl flex flex-col items-center text-center gap-5 animate-ui-modal-in">
            <h2 className="font-display font-bold text-2xl text-[#0f2942]">
              {t('pausedTitle', lang)}
            </h2>

            <div className="w-full py-3 px-4 rounded-xl bg-[#e2e8f0]/60 flex items-center justify-between">
              <span className="text-sm font-medium text-[#475569]">
                {lang === 'en' ? 'Fish caught' : 'Peces atrapados'}
              </span>
              <span className="font-display font-bold text-xl text-[#0f2942] tabular-nums">
                {formatNumber(fishCount, lang)}
              </span>
            </div>

            <div className="w-full flex flex-col gap-2">
              <div className="text-[11px] font-bold uppercase tracking-wider text-[#64748b] text-left">
                {lang === 'en' ? 'Sound & Music' : 'Música y sonidos'}
              </div>
              <div className="w-full grid grid-cols-2 gap-2">
                <button
                  type="button"
                  data-testid="pause-music-btn"
                  aria-pressed={!(musicMuted || muted)}
                  onClick={toggleMusicMute}
                  className={`py-2.5 px-3 rounded-xl font-display font-bold text-xs border flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                    musicMuted || muted
                      ? 'bg-[#f1f5f9] border-[#cbd5e1] text-[#64748b] hover:bg-[#e2e8f0]'
                      : 'bg-[#e0f2fe] border-[#38bdf8] text-[#0369a1] hover:brightness-98'
                  }`}
                >
                  <Music className="w-4 h-4 shrink-0" />
                  <span>
                    {musicMuted || muted
                      ? lang === 'en'
                        ? 'Music: Off'
                        : 'Música: Off'
                      : lang === 'en'
                        ? 'Music: On'
                        : 'Música: On'}
                  </span>
                </button>
                <button
                  type="button"
                  data-testid="pause-sound-btn"
                  aria-pressed={!muted}
                  onClick={toggleMute}
                  className={`py-2.5 px-3 rounded-xl font-display font-bold text-xs border flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                    muted
                      ? 'bg-[#f1f5f9] border-[#cbd5e1] text-[#64748b] hover:bg-[#e2e8f0]'
                      : 'bg-[#dcfce7] border-[#4ade80] text-[#166534] hover:brightness-98'
                  }`}
                >
                  {muted ? (
                    <VolumeX className="w-4 h-4 shrink-0" />
                  ) : (
                    <Volume2 className="w-4 h-4 shrink-0" />
                  )}
                  <span>
                    {muted
                      ? lang === 'en'
                        ? 'Sounds: Off'
                        : 'Sonidos: Off'
                      : lang === 'en'
                        ? 'Sounds: On'
                        : 'Sonidos: On'}
                  </span>
                </button>
              </div>
            </div>

            <div className="w-full flex flex-col gap-2.5">
              <button
                type="button"
                onClick={() => setMode('playing')}
                className="w-full py-3 rounded-xl bg-[#1e3a5f] hover:bg-[#162d4a] text-white font-display font-bold transition-colors cursor-pointer"
              >
                {t('continue', lang)}
              </button>
              <button
                type="button"
                data-testid="delete-progress-btn"
                onClick={() => setDeleteStep('warn1')}
                className="w-full py-2.5 rounded-xl bg-[#fee2e2] hover:bg-[#fecaca] border border-[#fca5a5] text-[#b91c1c] font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                {t('deleteProgress', lang)}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ELIMINAR PROGRESO — PASO 1: PRIMERA ADVERTENCIA */}
      {deleteStep === 'warn1' && (
        <div className="fixed inset-0 bg-[#0f2942]/65 backdrop-blur-sm flex items-center justify-center p-6 z-40 animate-ui-backdrop">
          <div className="w-full max-w-sm rounded-2xl bg-[#f8fafc] border-2 border-[#f59e0b] p-6 shadow-2xl flex flex-col items-center text-center gap-4 animate-ui-modal-in">
            <div className="w-12 h-12 rounded-full bg-[#fef3c7] border border-[#f59e0b] flex items-center justify-center text-[#b45309]">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h2 className="font-display font-extrabold text-xl text-[#0f2942]">
              {t('warning', lang)}
            </h2>
            <p className="text-sm text-[#475569]">
              {t('deleteConfirmWarning', lang)}
            </p>
            <div className="w-full flex flex-col gap-2 mt-1">
              <button
                type="button"
                data-testid="delete-warn1-confirm"
                onClick={() => setDeleteStep('warn2')}
                className="w-full py-2.5 rounded-xl bg-[#f59e0b] hover:bg-[#d97706] text-white font-display font-bold text-sm cursor-pointer"
              >
                {t('yesContinue', lang)}
              </button>
              <button
                type="button"
                onClick={() => setDeleteStep('none')}
                className="w-full py-2.5 rounded-xl bg-[#e2e8f0] hover:bg-[#cbd5e1] text-[#1e3a5f] font-bold text-sm cursor-pointer"
              >
                {t('cancel', lang)}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ELIMINAR PROGRESO — PASO 2: ADVERTENCIA DE LA ADVERTENCIA */}
      {deleteStep === 'warn2' && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-6 z-40 animate-ui-backdrop">
          <div className="w-full max-w-sm rounded-2xl bg-[#1a0b0b] border-2 border-[#ef4444] p-6 shadow-2xl flex flex-col items-center text-center gap-4 text-white animate-ui-modal-in">
            <div className="w-12 h-12 rounded-full bg-[#7f1d1d] border border-[#ef4444] flex items-center justify-center text-[#fecaca]">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h2 className="font-display font-extrabold text-xl text-[#fca5a5]">
              {t('warningOfWarning', lang)}
            </h2>
            <p className="text-sm text-[#fecaca]">
              {t('deleteWarningText', lang)}
            </p>
            <div className="w-full flex flex-col gap-2 mt-1">
              <button
                type="button"
                data-testid="delete-warn2-confirm"
                onClick={() => {
                  setDeleteMinigameFailed(false);
                  setDeleteMinigameKey((k) => k + 1);
                  setDeleteStep('minigame');
                }}
                className="w-full py-2.5 rounded-xl bg-gradient-to-b from-[#ef4444] to-[#991b1b] hover:brightness-110 text-white font-display font-extrabold text-sm cursor-pointer"
              >
                {t('startLegendaryMinigame', lang)}
              </button>
              <button
                type="button"
                onClick={() => setDeleteStep('none')}
                className="w-full py-2.5 rounded-xl bg-[#2d1a1a] hover:bg-[#3f2323] text-[#fecaca] font-bold text-sm cursor-pointer"
              >
                {t('cancelAndKeep', lang)}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ELIMINAR PROGRESO — PASO 3: MINIJUEGO LEGENDARIO (REPETIBLE INFINITO) */}
      {deleteStep === 'minigame' && !deleteMinigameFailed && (
        <>
          <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-xl bg-[#991b1b] border-2 border-[#fca5a5] text-white font-display font-extrabold text-xs sm:text-sm shadow-lg text-center">
            {lang === 'en'
              ? '⚠️ Final test: beat the Legendary minigame to delete your progress'
              : '⚠️ Prueba final: supera la pesca Legendaria para eliminar tu progreso'}
          </div>
          <FishingMinigame
            key={`delete-legendary-${deleteMinigameKey}`}
            caught={DELETE_LEGENDARY_CHALLENGE}
            lang={lang}
            onSuccess={() => {
              sound.playMiss();
              executeDeleteProgress();
            }}
            onFail={() => {
              sound.playMiss();
              setDeleteMinigameFailed(true);
            }}
          />
        </>
      )}

      {/* ELIMINAR PROGRESO — REINTENTO INFINITO SI FALLA */}
      {deleteStep === 'minigame' && deleteMinigameFailed && (
        <div className="fixed inset-0 bg-[#0f2942]/75 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-sm rounded-2xl bg-[#f8fafc] border-2 border-[#ef4444] p-5 shadow-2xl flex flex-col gap-4 text-center">
            <h2 className="font-display font-extrabold text-xl text-[#dc2626]">
              {t('legendaryEscaped', lang)}
            </h2>
            <p className="text-sm text-[#475569]">
              {t('legendaryRetryText', lang)}
            </p>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                data-testid="delete-retry-minigame"
                onClick={() => {
                  setDeleteMinigameFailed(false);
                  setDeleteMinigameKey((k) => k + 1);
                }}
                className="w-full py-3 rounded-xl bg-gradient-to-b from-[#ef4444] to-[#991b1b] hover:brightness-110 text-white font-display font-extrabold text-sm shadow-md cursor-pointer"
              >
                {t('repeatLegendaryMinigame', lang)}
              </button>
              <button
                type="button"
                onClick={() => {
                  setDeleteMinigameFailed(false);
                  setDeleteStep('none');
                }}
                className="w-full py-2.5 rounded-xl bg-[#e2e8f0] hover:bg-[#cbd5e1] text-[#334155] font-bold text-sm cursor-pointer"
              >
                {t('cancelDeletion', lang)}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* DEVIL NPC ON DOCK (Appears at Level 10+ or 20,000+ coins while Underworld is locked) */}
      {mode === 'playing' &&
        world === 'river' &&
        scene === 'dock' &&
        (levelProgress.level >= 10 || coins >= 20000) &&
        !underworldUnlocked && (
        <button
          type="button"
          onClick={() => setShowDevilModal(true)}
          className="fixed left-[4%] sm:left-[12%] lg:left-[15%] bottom-[13%] sm:bottom-[11%] z-20 flex flex-col items-center group cursor-pointer focus:outline-none scale-90 sm:scale-95 lg:scale-100 origin-bottom-left"
          aria-label={lang === 'en' ? 'Speak with the Devil' : 'Hablar con el Diablo'}
        >
          <div className="mb-1.5 px-3 py-1 rounded-xl bg-gradient-to-b from-[#fefce8] to-[#fde68a] border-2 border-[#7f1d1d] shadow-[0_6px_14px_rgba(0,0,0,0.45)] text-[11px] sm:text-xs font-extrabold text-[#7f1d1d] whitespace-nowrap animate-bounce">
            {lang === 'en' ? 'Are you ready?' : '¿Estás dispuesto?'}
          </div>
          <svg
            width="64"
            height="92"
            viewBox="0 0 64 92"
            className="drop-shadow-[0_8px_12px_rgba(15,10,8,0.55)] group-hover:scale-105 transition-transform"
          >
            <defs>
              <linearGradient id="devilCapeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#b91c1c" />
                <stop offset="65%" stopColor="#dc2626" />
                <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.88" />
              </linearGradient>
              <linearGradient id="devilFaceGrad" x1="0%" y1="0%" x2="100%" y2="20%">
                <stop offset="0%" stopColor="#dc2626" />
                <stop offset="70%" stopColor="#ef4444" />
                <stop offset="100%" stopColor="#fb923c" />
              </linearGradient>
            </defs>
            {/* Grounded dock shadow */}
            <ellipse cx="32" cy="88" rx="20" ry="4.5" fill="rgba(10,8,12,0.52)" />
            {/* Tail */}
            <path d="M44 68 Q58 62 56 48" stroke="#991b1b" strokeWidth="4" fill="none" strokeLinecap="round" />
            <polygon points="56,43 51,51 61,51" fill="#dc2626" />
            {/* Legs & Boots */}
            <rect x="21" y="64" width="8" height="22" rx="3" fill="#450a0a" />
            <rect x="35" y="64" width="8" height="22" rx="3" fill="#450a0a" />
            {/* Torso / Cape with sunset rim gradient */}
            <rect x="16" y="36" width="32" height="32" rx="8" fill="url(#devilCapeGrad)" stroke="#450a0a" strokeWidth="2" />
            {/* Horns */}
            <path d="M18 16 Q12 4 22 10" fill="#fde047" stroke="#854d0e" strokeWidth="1.5" />
            <path d="M46 16 Q52 4 42 10" fill="#fde047" stroke="#854d0e" strokeWidth="1.5" />
            {/* Head */}
            <circle cx="32" cy="24" r="14" fill="url(#devilFaceGrad)" stroke="#450a0a" strokeWidth="2" />
            {/* Eyes */}
            <ellipse cx="27" cy="22" rx="3" ry="3.5" fill="#fef08a" />
            <ellipse cx="37" cy="22" rx="3" ry="3.5" fill="#fef08a" />
            <circle cx="27" cy="22" r="1.4" fill="#0f172a" />
            <circle cx="37" cy="22" r="1.4" fill="#0f172a" />
            {/* Eyebrows */}
            <path d="M22 17 L30 19" stroke="#450a0a" strokeWidth="2" strokeLinecap="round" />
            <path d="M42 17 L34 19" stroke="#450a0a" strokeWidth="2" strokeLinecap="round" />
            {/* Mischievous Grin */}
            <path d="M25 29 Q32 34 39 29" stroke="#450a0a" strokeWidth="2" fill="none" strokeLinecap="round" />
            {/* Goatee */}
            <polygon points="32,38 29,34 35,34" fill="#450a0a" />
          </svg>
        </button>
      )}

      {/* DEVIL DIALOGUE MODAL */}
      {showDevilModal && (
        <div className="fixed inset-0 bg-black/65 flex items-center justify-center p-4 z-40">
          <div className="w-full max-w-md rounded-2xl bg-[#1a0b0b] border-2 border-[#dc2626] p-6 shadow-2xl flex flex-col items-center text-center gap-4 text-white">
            <svg width="88" height="88" viewBox="0 0 64 64" className="drop-shadow-lg">
              <path d="M18 18 Q10 4 23 11" fill="#fde047" stroke="#854d0e" strokeWidth="1.5" />
              <path d="M46 18 Q54 4 41 11" fill="#fde047" stroke="#854d0e" strokeWidth="1.5" />
              <circle cx="32" cy="32" r="20" fill="#ef4444" stroke="#7f1d1d" strokeWidth="2.5" />
              <ellipse cx="24" cy="28" rx="4" ry="4.5" fill="#fef08a" />
              <ellipse cx="40" cy="28" rx="4" ry="4.5" fill="#fef08a" />
              <circle cx="24" cy="28" r="1.8" fill="#0f172a" />
              <circle cx="40" cy="28" r="1.8" fill="#0f172a" />
              <path d="M18 21 L28 24" stroke="#450a0a" strokeWidth="2.5" strokeLinecap="round" />
              <path d="M46 21 L36 24" stroke="#450a0a" strokeWidth="2.5" strokeLinecap="round" />
              <path d="M22 39 Q32 46 42 39" stroke="#450a0a" strokeWidth="2.5" fill="none" strokeLinecap="round" />
              <polygon points="32,52 28,46 36,46" fill="#450a0a" />
            </svg>

            <h3 className="font-display font-extrabold text-xl text-[#fca5a5]">
              {lang === 'en' ? 'The Pier Devil' : 'El Diablo del Muelle'}
            </h3>
            <p className="text-sm text-[#fecaca]">
              {underworldUnlocked || levelProgress.level >= 10
                ? lang === 'en'
                  ? 'You have unlocked the Level 10 pact! Do you want to travel to the Underworld now?'
                  : '¡Has alcanzado el pacto de Nivel 10! ¿Quieres viajar al Inframundo ahora?'
                : lang === 'en'
                  ? 'Are you willing to spend 20,000 coins (or reach Level 10) to travel to the Underworld?'
                  : '¿Estás dispuesto a gastar 20.000 monedas (o alcanzar el Nivel 10) por viajar al Inframundo?'}
            </p>

            <div className="w-full flex gap-3 mt-2">
              <button
                type="button"
                disabled={!underworldUnlocked && levelProgress.level < 10 && coins < 20000}
                onClick={() => {
                  if (!underworldUnlocked) {
                    const freeViaLevel10 = levelProgress.level >= 10;
                    if (!freeViaLevel10 && coins < 20000) return;
                    const nextCoins = freeViaLevel10 ? coins : Math.max(0, coins - 20000);
                    if (!freeViaLevel10) {
                      setCoins(nextCoins);
                    }
                    underworldUnlockedRef.current = true;
                    setUnderworldUnlocked(true);
                    try {
                      localStorage.setItem('ice_fishing_underworld_unlocked', '1');
                      const raw = localStorage.getItem(SAVE_KEY);
                      const prevSave = raw ? (JSON.parse(raw) as Partial<SaveData>) : {};
                      localStorage.setItem(
                        SAVE_KEY,
                        JSON.stringify({
                          ...prevSave,
                          coins: nextCoins,
                          underworldUnlocked: true,
                        })
                      );
                    } catch {
                      // ignore storage errors
                    }
                    if (firebaseUser && cloudDocExistsRef.current) {
                      const savePath = `playerSaves/${firebaseUser.uid}`;
                      updateDoc(doc(db, 'playerSaves', firebaseUser.uid), {
                        coins: Math.round(nextCoins),
                        underworldUnlocked: true,
                        updatedAt: serverTimestamp(),
                      }).catch((err) => {
                        const msg = err instanceof Error ? err.message : String(err);
                        if (
                          msg.toLowerCase().includes('permission') ||
                          msg.toLowerCase().includes('insufficient')
                        ) {
                          handleFirestoreError(err, OperationType.UPDATE, savePath);
                        }
                      });
                    }
                  }
                  travelToWorld('underworld');
                  setShowDevilModal(false);
                }}
                className={`flex-1 py-2.5 rounded-xl font-display font-extrabold text-sm transition-all cursor-pointer ${
                  underworldUnlocked || levelProgress.level >= 10 || coins >= 20000
                    ? 'bg-gradient-to-b from-[#ef4444] to-[#991b1b] hover:brightness-110 text-white'
                    : 'bg-[#3f1d1d] text-[#9ca3af] cursor-not-allowed'
                }`}
              >
                {lang === 'en' ? 'Yes' : 'Sí'}
              </button>
              <button
                type="button"
                onClick={() => setShowDevilModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-[#2d1a1a] hover:bg-[#3f2323] text-[#fecaca] font-display font-bold text-sm transition-colors cursor-pointer"
              >
                No
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FIRST-TIME UNDERWORLD & UNDERWORLD MARKET BRIEF GUIDES */}
      {activeUnderworldGuide && (() => {
        const guide = getUnderworldGuideContent(activeUnderworldGuide, lang);
        const isMarketGuide = guide.kind === 'underworld_market';
        return (
          <div
            data-testid={`underworld-guide-modal-${guide.kind}`}
            onClick={() => dismissUnderworldGuide(guide.kind)}
            className="fixed inset-0 z-50 bg-black/65 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-ui-backdrop pointer-events-auto"
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="underworld-guide-title"
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md max-h-[86vh] overflow-y-auto rounded-2xl bg-gradient-to-b from-[#230907] via-[#170606] to-[#0d0404] border-2 border-[#f97316] shadow-[0_18px_55px_rgba(220,38,38,0.48)] text-white flex flex-col animate-ui-modal-in"
            >
              {/* Header */}
              <div className="px-4 sm:px-5 py-3.5 bg-gradient-to-r from-[#7f1d1d]/95 via-[#9a3412]/90 to-[#450a0a]/95 border-b border-[#fb923c]/35 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#f97316]/25 border border-[#fdba74]/50 text-[#fde047] font-display font-black text-[10px] uppercase tracking-wider">
                    <Flame className="w-3 h-3 shrink-0" />
                    <span>{guide.badge}</span>
                  </span>
                  <h3
                    id="underworld-guide-title"
                    className="font-display font-extrabold text-base sm:text-lg text-white mt-1 leading-tight"
                  >
                    {guide.headline}
                  </h3>
                </div>
                <button
                  type="button"
                  data-testid="close-underworld-guide-btn"
                  aria-label={lang === 'en' ? 'Close guide' : 'Cerrar guía'}
                  onClick={() => dismissUnderworldGuide(guide.kind)}
                  className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 border border-white/20 flex items-center justify-center text-white shrink-0 cursor-pointer touch-manipulation"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Body */}
              <div className="p-4 sm:p-5 flex flex-col gap-3">
                <p className="text-xs sm:text-sm text-amber-100/90 leading-snug">
                  {guide.summary}
                </p>

                <div className="flex flex-col gap-2">
                  {guide.points.map((pt, idx) => (
                    <div
                      key={idx}
                      className="rounded-xl bg-[#2a0c09]/85 border border-[#f97316]/35 px-3 py-2.5 flex items-start gap-2.5"
                    >
                      <span
                        className="w-8 h-8 rounded-lg bg-[#450a0a] border border-[#fb923c]/45 flex items-center justify-center text-base shrink-0"
                        aria-hidden="true"
                      >
                        {pt.icon}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="font-display font-bold text-xs sm:text-[13px] text-[#fde047] leading-snug">
                          {pt.title}
                        </div>
                        <p className="text-[11px] sm:text-xs text-amber-100/80 leading-snug mt-0.5">
                          {pt.detail}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                {!isMarketGuide && (
                  <p className="text-[11px] text-amber-200/75 text-center">
                    {lang === 'en'
                      ? 'Use the Market button above anytime to visit the Underworld stalls.'
                      : 'Usa el botón Mercado de arriba cuando quieras para ir a sus puestos.'}
                  </p>
                )}

                <button
                  type="button"
                  data-testid="dismiss-underworld-guide-btn"
                  onClick={() => dismissUnderworldGuide(guide.kind)}
                  className="btn-arcade btn-shine w-full min-h-[44px] py-2.5 px-4 rounded-xl bg-gradient-to-b from-[#fb923c] via-[#ea580c] to-[#c2410c] hover:brightness-110 active:scale-[0.98] border border-[#fef08a] text-white font-display font-extrabold text-sm shadow-[0_6px_20px_rgba(234,88,12,0.4)] cursor-pointer touch-manipulation"
                >
                  {guide.buttonLabel}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* WORLD TRAVEL TRANSITION ANIMATION OVERLAY */}
      {isTransitioningWorld && (
        <WorldTravelOverlay targetWorld={transitioningWorldName} lang={lang} />
      )}
      {/* ADMIN COMMAND CONSOLE MODAL */}
      {showAdminCommandModal && (
        <div
          data-testid="admin-command-modal"
          onClick={() => setShowAdminCommandModal(false)}
          className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 z-50 animate-ui-backdrop pointer-events-auto"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg rounded-2xl bg-[#0f0404] border-2 border-[#dc2626] shadow-[0_0_50px_rgba(220,38,38,0.35)] flex flex-col overflow-hidden text-white animate-ui-modal-in"
          >
            {/* Header */}
            <div className="px-4 py-3 bg-gradient-to-r from-[#2a0606] via-[#1a0505] to-[#2a0606] border-b border-[#dc2626]/40 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#991b1b] border border-[#f87171] flex items-center justify-center shadow-inner">
                  <Terminal className="w-4 h-4 text-[#fde047]" />
                </div>
                <div>
                  <h3 className="font-display font-extrabold text-sm sm:text-base text-white flex items-center gap-1.5">
                    <span>{t('adminConsole', lang)}</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#ca8a04] text-[#1e1b4b] font-black uppercase">
                      Admin
                    </span>
                  </h3>
                  <p className="text-[10px] text-[#fca5a5] font-mono">
                    {lang === 'en' ? 'Luck Command · salva2012mc' : 'Comando de Suerte · salva2012mc'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                data-testid="close-admin-command-modal"
                onClick={() => setShowAdminCommandModal(false)}
                className="p-1.5 rounded-lg hover:bg-[#3b0a0a] text-[#fca5a5] hover:text-white transition-colors cursor-pointer"
                title={lang === 'en' ? 'Close (Esc)' : 'Cerrar (Esc)'}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-4 sm:p-5 flex flex-col gap-4 font-sans">
              {/* Current Luck Status Badge */}
              <div className="p-3 rounded-xl bg-[#1a0808] border border-[#ef4444]/30 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="text-2xl shrink-0">🍀</span>
                  <div className="min-w-0">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-[#fca5a5]">
                      {lang === 'en' ? 'Current fishing status' : 'Estado actual de pesca'}
                    </div>
                    <div className="text-sm font-display font-extrabold text-[#fde047] truncate">
                      {luckSecondsLeft > 0
                        ? lang === 'en'
                          ? `Luck x${activeLuckMultiplier} ACTIVE`
                          : `Suerte x${activeLuckMultiplier} ACTIVA`
                        : lang === 'en'
                          ? 'Normal Luck (x1)'
                          : 'Suerte Normal (x1)'}
                    </div>
                  </div>
                </div>

                <div className="shrink-0 text-right">
                  {luckSecondsLeft > 0 ? (
                    <span className="px-2.5 py-1 rounded-lg bg-[#15803d] border border-[#22c55e] text-white text-xs font-mono font-bold shadow-sm">
                      ⏱ {formatLuckTimeRemaining(luckSecondsLeft)}
                    </span>
                  ) : (
                    <span className="text-xs font-semibold text-[#94a3b8]">
                      {lang === 'en' ? 'No multiplier' : 'Sin multiplicador'}
                    </span>
                  )}
                </div>
              </div>

              {/* Terminal Command Input Form */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!adminCommandInput.trim()) return;
                  const res = executeAdminLuckCommand(adminCommandInput);
                  if (res.success) {
                    setAdminCommandFeedback({
                      type: 'success',
                      text: res.message,
                    });
                  } else {
                    setAdminCommandFeedback({
                      type: 'error',
                      text: res.message,
                    });
                  }
                }}
                className="flex flex-col gap-2"
              >
                <label className="text-xs font-bold text-[#fecaca] flex items-center justify-between">
                  <span>{lang === 'en' ? 'Enter your command:' : 'Introduce tu comando:'}</span>
                  <span className="text-[10px] font-mono text-[#fde047]">
                    {lang === 'en'
                      ? 'Syntax: /luck <mult> <time>'
                      : 'Sintaxis: /suerte <mult> <tiempo>'}
                  </span>
                </label>

                <div className="flex items-center gap-2">
                  <div className="flex-1 flex items-center bg-[#070202] border-2 border-[#ef4444]/60 focus-within:border-[#fde047] rounded-xl px-3 py-2 shadow-inner transition-colors">
                    <span className="text-[#fde047] font-mono font-bold text-sm mr-2 select-none">
                      &gt;
                    </span>
                    <input
                      type="text"
                      data-testid="admin-command-input"
                      autoFocus
                      value={adminCommandInput}
                      onChange={(e) => {
                        setAdminCommandInput(e.target.value);
                        if (adminCommandFeedback) setAdminCommandFeedback(null);
                      }}
                      placeholder={lang === 'en' ? '/luck 50 1h' : '/suerte 50 1h'}
                      className="w-full bg-transparent text-white font-mono text-sm outline-none placeholder:text-[#52525b]"
                    />
                  </div>

                  <button
                    type="submit"
                    data-testid="admin-command-submit"
                    className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#dc2626] to-[#991b1b] hover:from-[#ef4444] hover:to-[#b91c1c] text-white font-display font-extrabold text-xs shadow-md border border-[#f87171] transition-all cursor-pointer hover:-translate-y-0.5 active:translate-y-0.5 shrink-0"
                  >
                    {lang === 'en' ? 'Execute' : 'Ejecutar'}
                  </button>
                </div>
              </form>

              {/* Feedback Alert */}
              {adminCommandFeedback && (
                <div
                  data-testid="admin-command-feedback"
                  className={`p-3 rounded-xl text-xs font-mono border whitespace-pre-line leading-relaxed ${
                    adminCommandFeedback.type === 'success'
                      ? 'bg-[#052e16] border-[#22c55e] text-[#86efac]'
                      : 'bg-[#450a0a] border-[#ef4444] text-[#fca5a5]'
                  }`}
                >
                  {adminCommandFeedback.text}
                </div>
              )}

              {/* Quick Preset Buttons */}
              <div className="flex flex-col gap-1.5 pt-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#fca5a5]">
                  {lang === 'en'
                    ? 'Quick Commands (Click to run):'
                    : 'Comandos Rápidos (Haz clic para ejecutar):'}
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                  {(lang === 'en'
                    ? [
                        { cmd: '/luck 10 30m', desc: 'x10 for 30 mins' },
                        { cmd: '/luck 50 1h', desc: 'x50 for 1 hour' },
                        { cmd: '/luck 100 24h', desc: 'x100 for 24h' },
                        { cmd: '/luck 500 7d', desc: 'x500 for 7 days' },
                        { cmd: '/luck 1000 max', desc: 'x1000 Permanent' },
                        { cmd: '/luck reset', desc: 'Disable boost (x1)' },
                      ]
                    : [
                        { cmd: '/suerte 10 30m', desc: 'x10 durante 30 mins' },
                        { cmd: '/suerte 50 1h', desc: 'x50 durante 1 hora' },
                        { cmd: '/suerte 100 24h', desc: 'x100 durante 24h' },
                        { cmd: '/suerte 500 7d', desc: 'x500 durante 7 días' },
                        { cmd: '/suerte 1000 max', desc: 'x1000 Permanente' },
                        { cmd: '/suerte reset', desc: 'Desactivar boost (x1)' },
                      ]
                  ).map((item) => (
                    <button
                      key={item.cmd}
                      type="button"
                      onClick={() => {
                        setAdminCommandInput(item.cmd);
                        const res = executeAdminLuckCommand(item.cmd);
                        if (res.success) {
                          setAdminCommandFeedback({
                            type: 'success',
                            text: res.message,
                          });
                        } else {
                          setAdminCommandFeedback({
                            type: 'error',
                            text: res.message,
                          });
                        }
                      }}
                      className="px-2.5 py-1.5 rounded-lg bg-[#1a0808] hover:bg-[#2a0e0e] border border-[#ef4444]/40 hover:border-[#fde047] text-left transition-all cursor-pointer group"
                    >
                      <div className="font-mono text-xs font-bold text-[#fde047] group-hover:text-yellow-300">
                        {item.cmd}
                      </div>
                      <div className="text-[10px] text-[#fca5a5] font-sans truncate">
                        {item.desc}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Help & Guide */}
              <div className="p-3 rounded-xl bg-[#090303] border border-white/10 text-[11px] text-[#cbd5e1] flex flex-col gap-1.5 font-sans">
                <div className="font-bold text-[#fde047] flex items-center gap-1">
                  <span>ℹ️</span>
                  <span>
                    {lang === 'en' ? '/luck Command Guide' : 'Guía del comando /suerte'}
                  </span>
                </div>
                <ul className="list-disc list-inside space-y-0.5 text-[#94a3b8]">
                  <li>
                    <strong className="text-white">
                      {lang === 'en' ? 'Multiplier:' : 'Multiplicador:'}
                    </strong>{' '}
                    {lang === 'en'
                      ? 'Any number ≥ 1 (e.g. 5, 20, 100, 5000).'
                      : 'Cualquier número ≥ 1 (ej: 5, 20, 100, 5000).'}
                  </li>
                  <li>
                    <strong className="text-white">
                      {lang === 'en' ? 'Duration:' : 'Duración:'}
                    </strong>{' '}
                    {lang === 'en' ? (
                      <>
                        Seconds (<code className="text-[#fde047]">30s</code>), minutes (
                        <code className="text-[#fde047]">45m</code>), hours (
                        <code className="text-[#fde047]">2h</code>), days (
                        <code className="text-[#fde047]">7d</code>), or{' '}
                        <code className="text-[#fde047]">max</code> (infinite).
                      </>
                    ) : (
                      <>
                        Segundos (<code className="text-[#fde047]">30s</code>), minutos (
                        <code className="text-[#fde047]">45m</code>), horas (
                        <code className="text-[#fde047]">2h</code>), días (
                        <code className="text-[#fde047]">7d</code>) o{' '}
                        <code className="text-[#fde047]">max</code> (infinito).
                      </>
                    )}
                  </li>
                  <li>
                    <strong className="text-white">
                      {lang === 'en' ? 'Keyboard shortcut:' : 'Atajo de teclado:'}
                    </strong>{' '}
                    {lang === 'en' ? (
                      <>
                        Press{' '}
                        <kbd className="px-1 py-0.5 rounded bg-black/70 border border-white/20 font-mono text-white">
                          /
                        </kbd>{' '}
                        or{' '}
                        <kbd className="px-1 py-0.5 rounded bg-black/70 border border-white/20 font-mono text-white">
                          F2
                        </kbd>{' '}
                        to open this console anytime in-game.
                      </>
                    ) : (
                      <>
                        Presiona la tecla{' '}
                        <kbd className="px-1 py-0.5 rounded bg-black/70 border border-white/20 font-mono text-white">
                          /
                        </kbd>{' '}
                        o{' '}
                        <kbd className="px-1 py-0.5 rounded bg-black/70 border border-white/20 font-mono text-white">
                          F2
                        </kbd>{' '}
                        para abrir esta consola desde el juego.
                      </>
                    )}
                  </li>
                </ul>
              </div>
            </div>

            {/* Footer */}
            <div className="px-4 py-2.5 bg-[#140404] border-t border-[#dc2626]/30 flex items-center justify-between text-[11px] text-[#fca5a5]">
              <span className="font-mono text-[10px]">
                {lang === 'en' ? 'ESC to close' : 'ESC para cerrar'}
              </span>
              <button
                type="button"
                onClick={() => setShowAdminCommandModal(false)}
                className="px-3 py-1 rounded-lg bg-[#3b0a0a] hover:bg-[#5c0d0d] text-white text-xs font-bold cursor-pointer transition-colors"
              >
                {lang === 'en' ? 'Close' : 'Cerrar'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* MARKET STALL MODAL: RODS & BAITS ("COMPRAR CAÑAS Y CEBOS") — 3 CAÑAS & 3 GUSANOS FUNCIONALES */}
      {marketStallModal === 'rods' && (() => {
        const currentRodStats = getEquippedRodStats(equippedCosmetics);
        const activeWormObj = equippedBaitId ? getWormBaitById(equippedBaitId) : null;
        const activeWormRemainingCasts = equippedBaitId
          ? activeBaitCharges > 0
            ? activeBaitCharges
            : (baitInventory[equippedBaitId] ?? 0) * (activeWormObj?.castsPerUnit ?? 1)
          : 0;

        const isUnderworldRodsShop = world === 'underworld';

        return (
          <div
            onClick={() => setMarketStallModal('none')}
            className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 z-50 animate-ui-backdrop pointer-events-auto"
          >
            <div
              data-testid="market-stall-rods-modal"
              onClick={(e) => e.stopPropagation()}
              className={`w-full max-w-xl max-h-[88vh] rounded-2xl bg-[#0f172a] border-2 ${
                isUnderworldRodsShop
                  ? 'border-[#f97316] shadow-[0_0_40px_rgba(249,115,22,0.35)]'
                  : 'border-[#38bdf8] shadow-[0_0_40px_rgba(56,189,248,0.3)]'
              } flex flex-col overflow-hidden text-white animate-ui-modal-in`}
            >
              {/* Header */}
              <div
                className={`px-5 py-3.5 ${
                  isUnderworldRodsShop
                    ? 'bg-gradient-to-r from-[#7f1d1d] via-[#b91c1c] to-[#7c2d12]'
                    : 'bg-gradient-to-r from-[#0369a1] via-[#0284c7] to-[#0369a1]'
                } flex items-center justify-between gap-3 border-b border-white/20`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <h3 className="font-display font-extrabold text-base sm:text-lg text-white truncate">
                    {isUnderworldRodsShop
                      ? lang === 'en'
                        ? 'Buy Rods & Baits · Underworld'
                        : 'Comprar Cañas y Cebos · Inframundo'
                      : lang === 'en'
                        ? 'Buy Rods & Baits'
                        : 'Comprar Cañas y Cebos'}
                  </h3>
                  <span className="px-2.5 py-1 rounded-lg bg-[#fef3c7] border border-[#fcd34d] text-[#92400e] text-xs font-extrabold tabular-nums inline-flex items-center gap-1 shrink-0">
                    <CoinIcon size={13} />
                    <span>{formatNumber(coins, lang)}</span>
                  </span>
                </div>
                <button
                  type="button"
                  data-testid="close-rods-stall-btn"
                  onClick={() => setMarketStallModal('none')}
                  className="p-1.5 rounded-lg hover:bg-white/20 text-white cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Active Loadout Summary Bar */}
              <div className="px-5 py-2 bg-[#0b1329] border-b border-white/10 flex items-center justify-between gap-2 flex-wrap text-[11px]">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2 py-0.5 rounded-md bg-[#1e293b] border border-[#38bdf8]/40 text-[#bae6fd] font-bold">
                    🎣{' '}
                    {currentRodStats.rodId === 'rod_og'
                      ? lang === 'en'
                        ? 'OG Rod (2s)'
                        : 'Caña OG (2s)'
                      : currentRodStats.rodId === 'rod_gold'
                        ? lang === 'en'
                          ? 'Gold Rod (3s · 1.5x Luck · Tension+)'
                          : 'Caña de Oro (3s · 1,5x Suerte · Control+)'
                        : currentRodStats.rodId === 'rod_carbon'
                          ? lang === 'en'
                            ? 'Carbon Rod (4s)'
                            : 'Caña de Carbono (4s)'
                          : lang === 'en'
                            ? 'Base Rod (5s)'
                            : 'Caña Base (5s)'}
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-[#1e293b] border border-[#f59e0b]/40 text-[#fde68a] font-bold">
                    🪱{' '}
                    {activeWormObj && activeWormRemainingCasts > 0
                      ? `${lang === 'en' ? activeWormObj.nameEn : activeWormObj.nameEs} (${activeWormRemainingCasts} ${lang === 'en' ? 'casts' : 'tiradas'})`
                      : lang === 'en'
                        ? 'No worm equipped'
                        : 'Sin gusano equipado'}
                  </span>
                </div>
              </div>

              {/* Two Organized Tabs: Cañas & Cebos */}
              <div className="px-5 pt-3 pb-2.5 bg-[#0b1329] border-b border-white/10 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  data-testid="stall-tab-rods"
                  onClick={() => {
                    sound.playClick();
                    setRodsShopNotice('');
                    setRodsStallTab('rods');
                  }}
                  className={`py-2 px-3 rounded-xl font-display font-extrabold text-xs uppercase tracking-wider transition-all cursor-pointer ${
                    rodsStallTab === 'rods'
                      ? isUnderworldRodsShop
                        ? 'bg-[#c2410c] text-white border border-[#fdba74] shadow-md'
                        : 'bg-[#0284c7] text-white border border-[#7dd3fc] shadow-md'
                      : 'bg-[#1e293b] text-slate-300 hover:bg-[#334155] border border-white/10'
                  }`}
                >
                  {isUnderworldRodsShop
                    ? lang === 'en'
                      ? 'Rods'
                      : 'Cañas'
                    : lang === 'en'
                      ? 'Rods (3)'
                      : 'Cañas (3)'}
                </button>
                <button
                  type="button"
                  data-testid="stall-tab-baits"
                  onClick={() => {
                    sound.playClick();
                    setRodsShopNotice('');
                    setRodsStallTab('baits');
                  }}
                  className={`py-2 px-3 rounded-xl font-display font-extrabold text-xs uppercase tracking-wider transition-all cursor-pointer ${
                    rodsStallTab === 'baits'
                      ? isUnderworldRodsShop
                        ? 'bg-[#c2410c] text-white border border-[#fdba74] shadow-md'
                        : 'bg-[#0284c7] text-white border border-[#7dd3fc] shadow-md'
                      : 'bg-[#1e293b] text-slate-300 hover:bg-[#334155] border border-white/10'
                  }`}
                >
                  {isUnderworldRodsShop
                    ? lang === 'en'
                      ? 'Baits'
                      : 'Cebos'
                    : lang === 'en'
                      ? 'Baits / Worms (3)'
                      : 'Cebos / Gusanos (3)'}
                </button>
              </div>

              {rodsShopNotice && (
                <div
                  data-testid="rods-shop-notice"
                  className="mx-5 mt-2.5 px-3 py-1.5 rounded-xl bg-[#064e3b] border border-[#34d399] text-[#d1fae5] text-xs font-extrabold flex items-center justify-between"
                >
                  <span>{rodsShopNotice}</span>
                  <button
                    type="button"
                    onClick={() => setRodsShopNotice('')}
                    className="text-[11px] underline cursor-pointer"
                  >
                    OK
                  </button>
                </div>
              )}

              {/* Content Body */}
              <div className="p-4 sm:p-5 overflow-y-auto flex-1 flex flex-col gap-3">
                {isUnderworldRodsShop ? (
                  rodsStallTab === 'rods' ? (
                    <div
                      data-testid="underworld-lava-rods-coming-soon"
                      className="rounded-2xl bg-gradient-to-b from-[#1f0a07] via-[#2b0d08] to-[#180705] border-2 border-[#f97316]/60 p-5 text-center flex flex-col items-center gap-3 shadow-inner"
                    >
                      <span className="px-3 py-1 rounded-lg bg-[#f97316]/20 border border-[#fb923c] text-[#fde047] font-display font-black text-xs uppercase tracking-wider">
                        {lang === 'en' ? 'Coming Soon' : 'Próximamente'}
                      </span>
                      <h4 className="font-display font-extrabold text-base sm:text-lg text-white">
                        {lang === 'en'
                          ? 'Exclusive Lava & Obsidian Rods'
                          : 'Cañas Exclusivas de Lava'}
                      </h4>
                      <p className="text-xs sm:text-sm text-amber-100/85 max-w-md leading-relaxed">
                        {lang === 'en'
                          ? 'The Underworld craftsman is forging exclusive volcanic rods designed for extreme magma tension and abyssal luck. Available soon!'
                          : 'El artesano del Inframundo está preparando las nuevas cañas exclusivas de lava y obsidiana para pescar en el magma. ¡Disponibles próximamente!'}
                      </p>
                    </div>
                  ) : (
                    <div
                      data-testid="underworld-lava-baits-coming-soon"
                      className="rounded-2xl bg-gradient-to-b from-[#1f0a07] via-[#2b0d08] to-[#180705] border-2 border-[#f97316]/60 p-5 text-center flex flex-col items-center gap-3 shadow-inner"
                    >
                      <span className="px-3 py-1 rounded-lg bg-[#f97316]/20 border border-[#fb923c] text-[#fde047] font-display font-black text-xs uppercase tracking-wider">
                        {lang === 'en' ? 'Coming Soon' : 'Próximamente'}
                      </span>
                      <h4 className="font-display font-extrabold text-base sm:text-lg text-white">
                        {lang === 'en'
                          ? 'Exclusive Lava Baits & Magma Worms'
                          : 'Cebos Exclusivos de Lava'}
                      </h4>
                      <p className="text-xs sm:text-sm text-amber-100/85 max-w-md leading-relaxed">
                        {lang === 'en'
                          ? 'Special incandescent lava baits and ember worms are being prepared for this stall. Available soon!'
                          : 'Los nuevos cebos ígneos y gusanos de magma exclusivos del Inframundo están en preparación. ¡Disponibles próximamente!'}
                      </p>
                    </div>
                  )
                ) : rodsStallTab === 'rods' ? (
                  <>
                    {/* 1) CAÑA DE CARBONO (1.000 monedas, 5s -> 4s) */}
                    {/* 2) CAÑA DORADA (5.000 monedas, 3s, 1.5x suerte, +25% control de tensión) */}
                    {(['rod_carbon', 'rod_gold'] as const).map((rodId) => {
                      const item = COSMETICS_CATALOG.find((c) => c.id === rodId);
                      if (!item) return null;
                      const owned = ownedCosmetics.includes(rodId);
                      const equipped = equippedCosmetics.includes(rodId);
                      const canAfford = coins >= item.price;
                      const isGold = rodId === 'rod_gold';

                      return (
                        <div
                          key={rodId}
                          data-testid={`stall-rod-card-${rodId}`}
                          className={`p-3.5 rounded-xl border-2 flex items-center justify-between gap-3 transition-all ${
                            equipped
                              ? 'bg-gradient-to-r from-[#0c4a6e]/75 via-[#0f172a] to-[#0c4a6e]/65 border-[#38bdf8] shadow-[0_0_20px_rgba(56,189,248,0.3)]'
                              : isGold
                                ? 'bg-gradient-to-r from-[#271704] via-[#451a03]/85 to-[#1c1917] border-[#facc15]/80 shadow-[0_0_16px_rgba(250,204,21,0.18)]'
                                : 'bg-gradient-to-r from-[#091526] via-[#0f172a] to-[#1e293b] border-[#38bdf8]/45'
                          }`}
                        >
                          <div className="flex items-center gap-3.5 min-w-0">
                            <CosmeticItemDrawing itemId={rodId} size={62} />
                            <div className="min-w-0 flex flex-col gap-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span
                                  className={`font-display font-extrabold text-sm sm:text-base ${
                                    isGold ? 'text-[#fde047]' : 'text-[#e0f2fe]'
                                  }`}
                                >
                                  {getCosmeticName(rodId, lang, item.name)}
                                </span>
                                <span
                                  className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase ${
                                    isGold
                                      ? 'bg-[#eab308]/25 border border-[#fde047]/60 text-[#fef08a]'
                                      : 'bg-[#0284c7]/25 border border-[#38bdf8]/60 text-[#7dd3fc]'
                                  }`}
                                >
                                  {isGold
                                    ? lang === 'en'
                                      ? '24K Master'
                                      : 'Maestra 24K'
                                    : lang === 'en'
                                      ? 'Carbon Pro'
                                      : 'Fibra Pro'}
                                </span>
                                {equipped && (
                                  <span className="px-1.5 py-0.5 rounded bg-[#0284c7] text-white text-[9px] font-black uppercase">
                                    {lang === 'en' ? 'Equipped' : 'Equipada'}
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-slate-300 leading-snug">
                                {getCosmeticDescription(rodId, lang, item.description)}
                              </p>
                              <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                                {rodId === 'rod_carbon' ? (
                                  <span className="px-2 py-0.5 rounded-md bg-[#0f172a] border border-[#38bdf8]/50 text-[#7dd3fc] text-[10px] font-extrabold">
                                    ⏱️ {lang === 'en' ? 'Wait: 5s → 4s' : 'Espera: 5s → 4s'}
                                  </span>
                                ) : (
                                  <>
                                    <span className="px-2 py-0.5 rounded-md bg-[#0f172a] border border-[#fbbf24]/60 text-[#fde047] text-[10px] font-extrabold">
                                      ⏱️ {lang === 'en' ? 'Wait: 3s' : 'Espera: 3s'}
                                    </span>
                                    <span className="px-2 py-0.5 rounded-md bg-[#052e16] border border-[#4ade80]/60 text-[#86efac] text-[10px] font-extrabold">
                                      🍀 {lang === 'en' ? '1.5x Luck' : '1,5x Suerte'}
                                    </span>
                                    <span className="px-2 py-0.5 rounded-md bg-[#1e1b4b] border border-[#818cf8]/60 text-[#c7d2fe] text-[10px] font-extrabold">
                                      🛡️ {lang === 'en' ? '+25% Tension Control' : '+25% Control Tensión'}
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>

                          <button
                            type="button"
                            data-testid={`stall-rod-btn-${rodId}`}
                            disabled={!owned && !canAfford}
                            onClick={() => handleBuyOrToggleCosmetic(rodId, item.price)}
                            className={`px-3.5 py-2 rounded-xl font-display font-extrabold text-xs whitespace-nowrap shrink-0 cursor-pointer tabular-nums transition-transform active:scale-95 ${
                              equipped
                                ? 'bg-[#0284c7] hover:bg-[#0369a1] text-white border border-[#7dd3fc]'
                                : owned
                                  ? 'bg-[#7e22ce] hover:bg-[#6b21a8] text-white'
                                  : canAfford
                                    ? 'bg-gradient-to-b from-[#fde047] to-[#f59e0b] hover:brightness-105 text-[#1e1b4b]'
                                    : 'bg-white/10 text-slate-400 cursor-not-allowed'
                            }`}
                          >
                            {equipped ? (
                              lang === 'en' ? 'Equipped' : 'Puesta'
                            ) : owned ? (
                              lang === 'en' ? 'Equip' : 'Equipar'
                            ) : (
                              <span className="inline-flex items-center gap-1">
                                <CoinIcon size={12} />
                                <span>{formatNumber(item.price, lang)}</span>
                              </span>
                            )}
                          </button>
                        </div>
                      );
                    })}

                    {/* 3) CAÑA OG (Ventana de 5 días para reclamar y equipar) */}
                    {(() => {
                      const ogOwned = ownedCosmetics.includes('rod_og') || hasOgTitle;
                      const ogEquipped = equippedCosmetics.includes('rod_og');
                      return (
                        <div
                          data-testid="stall-rod-card-rod_og"
                          className={`p-3.5 rounded-xl border-2 flex flex-col gap-2 transition-all ${
                            ogEquipped
                              ? 'bg-[#431407]/80 border-[#fb923c] shadow-[0_0_20px_rgba(249,115,22,0.35)]'
                              : 'bg-gradient-to-r from-[#271004] via-[#431407] to-[#1e293b] border-[#f97316]'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3.5 min-w-0">
                              <CosmeticItemDrawing itemId="rod_og" size={62} />
                              <div className="min-w-0 flex flex-col gap-1">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="font-display font-extrabold text-sm sm:text-base text-[#fed7aa]">
                                    {lang === 'en' ? 'OG Rod' : 'Caña OG'}
                                  </span>
                                  <span className="px-1.5 py-0.5 rounded bg-gradient-to-r from-[#f97316] to-[#ea580c] text-white text-[9px] font-black uppercase">
                                    {lang === 'en' ? '5-Day Event' : 'Evento 5 Días'}
                                  </span>
                                  {ogEquipped && (
                                    <span className="px-1.5 py-0.5 rounded bg-[#0284c7] text-white text-[9px] font-black uppercase">
                                      {lang === 'en' ? 'Equipped' : 'Equipada'}
                                    </span>
                                  )}
                                </div>
                                <p className="text-[11px] text-[#ffedd5]/90 leading-snug">
                                  {lang === 'en'
                                    ? 'Commemorative founder rod available to claim during the 5-day window. Ultra-fast 2s bite wait.'
                                    : 'Caña conmemorativa disponible para reclamar durante el periodo de 5 días. Tiempo de pesca de 2s.'}
                                </p>
                                <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                                  <span className="px-2 py-0.5 rounded-md bg-[#0f172a] border border-[#fb923c]/60 text-[#fdba74] text-[10px] font-extrabold">
                                    ⏱️ {lang === 'en' ? 'Wait: 2s' : 'Espera: 2s'}
                                  </span>
                                  {ogOfferActive ? (
                                    <span
                                      data-testid="og-offer-countdown"
                                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#7c2d12] border border-[#fb923c] text-[10px] font-extrabold text-[#ffedd5]"
                                    >
                                      <Clock className="w-3 h-3 shrink-0" />
                                      <span>
                                        {lang === 'en'
                                          ? `5-day window · ${formatOgOfferRemaining(ogOfferNowMs, lang)} left`
                                          : `Ventana 5 días · Quedan ${formatOgOfferRemaining(ogOfferNowMs, lang)}`}
                                      </span>
                                    </span>
                                  ) : (
                                    <span className="px-2 py-0.5 rounded-md bg-black/40 border border-white/15 text-[10px] font-bold text-slate-300">
                                      {lang === 'en'
                                        ? '5-day claim window closed'
                                        : 'Ventana de 5 días finalizada'}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            {ogOwned ? (
                              <button
                                type="button"
                                data-testid="stall-rod-btn-rod_og"
                                onClick={() => handleBuyOrToggleCosmetic('rod_og', 0)}
                                className={`px-3.5 py-2 rounded-xl font-display font-extrabold text-xs whitespace-nowrap shrink-0 cursor-pointer transition-transform active:scale-95 ${
                                  ogEquipped
                                    ? 'bg-[#0284c7] hover:bg-[#0369a1] text-white border border-[#7dd3fc]'
                                    : 'bg-[#ea580c] hover:bg-[#c2410c] text-white'
                                }`}
                              >
                                {ogEquipped
                                  ? lang === 'en'
                                    ? 'Equipped'
                                    : 'Puesta'
                                  : lang === 'en'
                                    ? 'Equip'
                                    : 'Equipar'}
                              </button>
                            ) : (
                              <button
                                type="button"
                                data-testid="stall-rod-btn-rod_og"
                                disabled={!ogOfferActive || ogClaimLoading}
                                onClick={handleClaimOgRod}
                                className="px-3.5 py-2 rounded-xl bg-gradient-to-b from-[#f97316] to-[#ea580c] hover:brightness-110 disabled:opacity-45 text-white font-display font-extrabold text-xs whitespace-nowrap shrink-0 cursor-pointer"
                              >
                                {ogClaimLoading
                                  ? lang === 'en'
                                    ? 'Claiming...'
                                    : 'Reclamando...'
                                  : ogOfferActive
                                    ? lang === 'en'
                                      ? 'Claim Free'
                                      : 'Reclamar Gratis'
                                    : lang === 'en'
                                      ? 'Ended'
                                      : 'Finalizada'}
                              </button>
                            )}
                          </div>
                          {ogClaimError && (
                            <p className="text-[11px] font-bold text-[#fca5a5]">{ogClaimError}</p>
                          )}
                        </div>
                      );
                    })()}
                  </>
                ) : (
                  /* TAB CEBOS / GUSANOS: 3 GUSANOS FUNCIONALES */
                  <div className="flex flex-col gap-3">
                    {WORM_BAIT_CATALOG.map((worm) => {
                      const ownedCount = baitInventory[worm.id] ?? 0;
                      const isEquipped = equippedBaitId === worm.id;
                      const totalCastsAvailable =
                        (isEquipped ? activeBaitCharges : 0) +
                        ownedCount * worm.castsPerUnit;
                      const isKorean = worm.id === 'worm_korean';
                      const isLuck5 = worm.id === 'worm_luck5';
                      const quantities =
                        worm.id === 'worm_harbor' ? [1, 5, 10] : [1, 5];

                      return (
                        <div
                          key={worm.id}
                          data-testid={`stall-worm-card-${worm.id}`}
                          className={`p-3.5 rounded-xl border-2 flex flex-col gap-2.5 transition-all ${
                            isEquipped
                              ? 'bg-[#0c4a6e]/55 border-[#38bdf8] shadow-[0_0_18px_rgba(56,189,248,0.22)]'
                              : isKorean
                                ? 'bg-gradient-to-r from-[#1c1917] via-[#292524] to-[#451a03]/55 border-[#f59e0b]/60'
                                : isLuck5
                                  ? 'bg-gradient-to-r from-[#042f2e]/85 via-[#0f172a] to-[#1e1b4b]/85 border-[#2dd4bf]/60'
                                  : 'bg-[#1e293b]/85 border-white/15'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3 min-w-0">
                              <WormBaitIllustrationSvg baitId={worm.id} size={54} />
                              <div className="min-w-0 flex flex-col gap-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span
                                    className={`font-display font-extrabold text-sm ${
                                      isKorean
                                        ? 'text-[#fde047]'
                                        : isLuck5
                                          ? 'text-[#5eead4]'
                                          : 'text-white'
                                    }`}
                                  >
                                    {lang === 'en' ? worm.nameEn : worm.nameEs}
                                  </span>
                                  <span className="px-2 py-0.5 rounded-md bg-black/35 border border-white/15 text-[10px] font-extrabold text-[#fef08a] tabular-nums">
                                    {lang === 'en'
                                      ? `Owned: ${ownedCount}`
                                      : `Tienes: ${ownedCount}`}
                                  </span>
                                </div>
                                <p className="text-[11px] text-slate-300 leading-snug">
                                  {lang === 'en' ? worm.descriptionEn : worm.descriptionEs}
                                </p>
                                <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                                  <span className="px-2 py-0.5 rounded-md bg-[#052e16] border border-[#4ade80]/60 text-[#86efac] text-[10px] font-extrabold">
                                    🍀 {worm.luckMultiplier}x {lang === 'en' ? 'Luck' : 'Suerte'}
                                  </span>
                                  {worm.speedMultiplier > 1 && (
                                    <span className="px-2 py-0.5 rounded-md bg-[#451a03] border border-[#fbbf24]/60 text-[#fde047] text-[10px] font-extrabold">
                                      ⚡ {worm.speedMultiplier}x {lang === 'en' ? 'Speed' : 'Velocidad'}
                                    </span>
                                  )}
                                  <span className="px-2 py-0.5 rounded-md bg-[#0f172a] border border-[#38bdf8]/50 text-[#bae6fd] text-[10px] font-extrabold">
                                    🎯 {worm.castsPerUnit}{' '}
                                    {worm.castsPerUnit === 1
                                      ? lang === 'en'
                                        ? 'cast / unit'
                                        : 'tirada / ud.'
                                      : lang === 'en'
                                        ? 'casts / unit'
                                        : 'tiradas / ud.'}
                                  </span>
                                  <span className="px-2 py-0.5 rounded-md bg-[#1e1b4b] border border-[#a5b4fc]/40 text-[#e0e7ff] text-[10px] font-extrabold">
                                    🪱 {lang === 'en' ? 'Replaces bobber on line' : 'Visible en el sedal'}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <button
                              type="button"
                              data-testid={`equip-worm-btn-${worm.id}`}
                              disabled={!isEquipped && totalCastsAvailable <= 0}
                              onClick={() => handleToggleEquipWormBait(worm.id)}
                              className={`px-3 py-1.5 rounded-xl font-display font-extrabold text-xs whitespace-nowrap shrink-0 cursor-pointer transition-transform active:scale-95 ${
                                isEquipped
                                  ? 'bg-[#0284c7] hover:bg-[#0369a1] text-white border border-[#7dd3fc]'
                                  : totalCastsAvailable > 0
                                    ? 'bg-[#16a34a] hover:bg-[#15803d] text-white'
                                    : 'bg-white/10 text-slate-400 cursor-not-allowed'
                              }`}
                            >
                              {isEquipped
                                ? lang === 'en'
                                  ? 'Equipped'
                                  : 'Equipado'
                                : lang === 'en'
                                  ? 'Equip'
                                  : 'Equipar'}
                            </button>
                          </div>

                          {/* Buy Quantity Row */}
                          <div className="pt-2 border-t border-white/10 flex items-center justify-between gap-2 flex-wrap">
                            <span className="text-[11px] font-bold text-slate-300 tabular-nums">
                              {lang === 'en'
                                ? `Unit price: ${worm.price} coins · Available casts: ${totalCastsAvailable}`
                                : `Precio: ${worm.price} monedas c/u · Tiradas disponibles: ${totalCastsAvailable}`}
                            </span>
                            <div className="flex items-center gap-1.5">
                              {quantities.map((qty) => {
                                const cost = worm.price * qty;
                                const canBuy = coins >= cost;
                                return (
                                  <button
                                    key={qty}
                                    type="button"
                                    data-testid={`buy-worm-${worm.id}-x${qty}`}
                                    disabled={!canBuy}
                                    onClick={() => handleBuyWormBait(worm.id, qty)}
                                    className={`px-2.5 py-1.5 rounded-lg font-display font-extrabold text-xs inline-flex items-center gap-1 tabular-nums cursor-pointer transition-transform active:scale-95 ${
                                      canBuy
                                        ? 'bg-gradient-to-b from-[#fde047] to-[#f59e0b] hover:brightness-105 text-[#1e1b4b]'
                                        : 'bg-white/10 text-slate-400 cursor-not-allowed'
                                    }`}
                                  >
                                    <span>+{qty}</span>
                                    <span className="opacity-75">·</span>
                                    <CoinIcon size={11} />
                                    <span>{formatNumber(cost, lang)}</span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="px-5 py-3 bg-[#0b1329] border-t border-white/10 flex items-center justify-between text-[11px] text-slate-300">
                <span>
                  {lang === 'en'
                    ? 'Effects apply automatically on your next cast'
                    : 'Los efectos se aplican automáticamente en tu siguiente tirada'}
                </span>
                <button
                  type="button"
                  onClick={() => setMarketStallModal('none')}
                  className="px-4 py-1.5 rounded-xl bg-white/10 hover:bg-white/25 text-white font-bold text-xs cursor-pointer"
                >
                  {lang === 'en' ? 'Close' : 'Cerrar'}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* MARKET STALL MODAL: 1V1 ARENA ("ZONA 1V1") - COMING SOON */}
      {marketStallModal === 'pvp' && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 z-50 animate-ui-backdrop pointer-events-auto">
          <div
            data-testid="market-stall-pvp-modal"
            className="w-full max-w-md rounded-2xl bg-[#0f172a] border-2 border-[#f97316] shadow-[0_0_40px_rgba(249,115,22,0.3)] flex flex-col overflow-hidden text-white animate-ui-modal-in"
          >
            <div className="px-5 py-4 bg-gradient-to-r from-[#9a3412] to-[#ea580c] flex items-center justify-between border-b border-white/20">
              <div className="flex items-center gap-2">
                <h3 className="font-display font-extrabold text-lg text-white">
                  {lang === 'en' ? '1v1 Fishing Zone' : 'Zona de Duelo 1v1'}
                </h3>
                <span className="px-2 py-0.5 rounded-md bg-[#fde047] text-[#0f172a] font-display font-black text-[10px] uppercase tracking-wider">
                  {lang === 'en' ? 'Coming Soon' : 'Próximamente'}
                </span>
              </div>
              <button
                type="button"
                data-testid="close-pvp-stall-btn"
                onClick={() => setMarketStallModal('none')}
                className="p-1.5 rounded-lg hover:bg-white/20 text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 flex flex-col gap-4 text-center">
              <div className="py-3 px-4 rounded-xl bg-[#1e293b] border border-[#f97316]/40 flex flex-col items-center gap-1.5">
                <span className="px-3 py-1 rounded-lg bg-[#f97316]/20 border border-[#f97316] text-[#fde047] font-display font-extrabold text-xs uppercase tracking-wider">
                  {lang === 'en' ? 'Mode in Preparation · Coming Soon' : 'Modo en Preparación · Próximamente'}
                </span>
                <h4 className="font-display font-bold text-base text-white mt-1">
                  {lang === 'en' ? 'Competitive 1v1 Fishing Duels' : 'Duelos Competitivos de Pesca 1v1'}
                </h4>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {lang === 'en'
                    ? 'Soon you will be able to challenge other anglers in real-time catch weight & speed duels inside the 1v1 Tent.'
                    : 'Muy pronto podrás desafiar a otros pescadores en duelos de velocidad y peso total de captura dentro de la carpa 1v1.'}
                </p>
              </div>
            </div>
            <div className="px-5 py-3 bg-[#0b1329] border-t border-white/10 flex justify-end">
              <button
                type="button"
                onClick={() => setMarketStallModal('none')}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/25 text-white font-bold text-xs cursor-pointer"
              >
                {lang === 'en' ? 'Close' : 'Cerrar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

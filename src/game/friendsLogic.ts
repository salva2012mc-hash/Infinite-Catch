import { ALL_FISH, COSMETICS_CATALOG, KANTO_SNOW_POKEMON } from './pokemonData';

export interface FriendEntry {
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

export interface MinimalLeaderboardEntry {
  username: string;
  avatar: string;
  catches: number;
  money: number;
  timeSeconds: number;
  bestFishId?: number;
  discoveredCount?: number;
  masteredCount?: number;
  underworldUnlocked?: boolean;
  equippedCosmetics?: string[];
}

const VALID_COSMETIC_IDS = new Set(COSMETICS_CATALOG.map((item) => item.id));

export function sanitizeEquippedCosmetics(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const cleaned: string[] = [];
  for (const entry of raw) {
    if (typeof entry !== 'string') continue;
    const id = entry.trim();
    if (!id || !VALID_COSMETIC_IDS.has(id) || seen.has(id)) continue;
    seen.add(id);
    cleaned.push(id);
    if (cleaned.length >= 50) break;
  }
  return cleaned;
}

export function formatLongTime(secs: number): string {
  const safeSecs = Math.max(0, Math.floor(secs));
  const h = Math.floor(safeSecs / 3600);
  const m = Math.floor((safeSecs % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  const s = safeSecs % 60;
  return `${m}m ${s}s`;
}

export const FORBIDDEN_WORDS = [
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

export function normalizeForProfanity(str: string): string {
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

export function validateFriendUsername(rawName: string): {
  valid: boolean;
  cleanName: string;
  error?: string;
} {
  const cleanName = rawName.trim();
  if (cleanName.length < 2 || cleanName.length > 20) {
    return {
      valid: false,
      cleanName,
      error: 'El nombre debe tener entre 2 y 20 caracteres.',
    };
  }

  // Nombres normales: permite letras, números, espacios, guiones y puntos
  if (!/^[a-zA-Z0-9áéíóúÁÉÍÓÚñÑüÜ _.-]+$/.test(cleanName)) {
    return {
      valid: false,
      cleanName,
      error: 'El nombre contiene caracteres no permitidos. Usa letras y números normales.',
    };
  }

  // Debe contener al menos una letra (no solo números o símbolos)
  if (!/[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ]/.test(cleanName)) {
    return {
      valid: false,
      cleanName,
      error: 'El nombre debe contener al menos una letra.',
    };
  }

  const normalized = normalizeForProfanity(cleanName);
  const words = normalized.split(/[\s_.-]+/);

  for (const bad of FORBIDDEN_WORDS) {
    if (words.some((w) => w === bad)) {
      return {
        valid: false,
        cleanName,
        error: 'No se permiten palabras malsonantes ni inapropiadas.',
      };
    }
    if (bad.length >= 4 && normalized.includes(bad)) {
      return {
        valid: false,
        cleanName,
        error: 'No se permiten palabras malsonantes ni inapropiadas.',
      };
    }
  }

  return { valid: true, cleanName };
}

export type PlayerGender = 'male' | 'female';

export function sanitizePlayerGender(raw: unknown): PlayerGender {
  return raw === 'female' ? 'female' : 'male';
}

export function getDefaultPlayerName(
  gender: PlayerGender,
  lang: 'en' | 'es' = 'es'
): string {
  if (lang === 'en') return 'Angler';
  return gender === 'female' ? 'Pescadora' : 'Pescador';
}

export function validatePlayerName(
  rawName: string,
  lang: 'en' | 'es' = 'es'
): {
  valid: boolean;
  cleanName: string;
  error?: string;
} {
  const cleanName = rawName.trim().replace(/\s+/g, ' ');
  if (cleanName.length < 2 || cleanName.length > 16) {
    return {
      valid: false,
      cleanName,
      error:
        lang === 'en'
          ? 'Name must be between 2 and 16 characters.'
          : 'El nombre debe tener entre 2 y 16 caracteres.',
    };
  }

  if (!/^[a-zA-Z0-9áéíóúÁÉÍÓÚñÑüÜ _.-]+$/.test(cleanName)) {
    return {
      valid: false,
      cleanName,
      error:
        lang === 'en'
          ? 'Use normal letters, numbers, spaces, hyphens or dots.'
          : 'Usa solo letras, números, espacios, guiones o puntos.',
    };
  }

  if (!/[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ]/.test(cleanName)) {
    return {
      valid: false,
      cleanName,
      error:
        lang === 'en'
          ? 'Name must contain at least one letter.'
          : 'El nombre debe incluir al menos una letra.',
    };
  }

  const normalized = normalizeForProfanity(cleanName);
  const words = normalized.split(/[\s_.-]+/);
  const collapsed = normalized.replace(/[\s_.-]+/g, '');

  for (const bad of FORBIDDEN_WORDS) {
    const cleanBad = bad.replace(/\s+/g, '');
    if (words.some((w) => w === bad || w === cleanBad)) {
      return {
        valid: false,
        cleanName,
        error:
          lang === 'en'
            ? 'Inappropriate or offensive words are not allowed.'
            : 'No se permiten palabras malsonantes ni inapropiadas.',
      };
    }
    if (
      cleanBad.length >= 4 &&
      (normalized.includes(bad) || collapsed.includes(cleanBad))
    ) {
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

export function sanitizePlayerNameWithFallback(
  rawName: unknown,
  gender: PlayerGender = 'male',
  lang: 'en' | 'es' = 'en'
): string {
  if (typeof rawName !== 'string') {
    return getDefaultPlayerName(gender, lang);
  }
  const check = validatePlayerName(rawName, lang);
  if (!check.valid) {
    return getDefaultPlayerName(gender, lang);
  }
  return check.cleanName;
}

export function calculateBestFriendScore(f: FriendEntry): number {
  const favWeight = f.isFavorite ? 100_000_000 : 0;
  return favWeight + (f.money || 0) + (f.catches || 0) * 60 + (f.timeSeconds || 0);
}

function hashUsername(clean: string): number {
  let hash = 0;
  for (let i = 0; i < clean.length; i++) {
    hash = (hash << 5) - hash + clean.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function deriveDeterministicFriendStats(
  username: string,
  catches: number
): {
  bestFishId: number;
  discoveredCount: number;
  masteredCount: number;
  underworldUnlocked: boolean;
  equippedCosmetics: string[];
} {
  const abs = hashUsername(username.trim());
  const underworldUnlocked = catches >= 200 && abs % 3 === 0;
  const pool = underworldUnlocked ? ALL_FISH : KANTO_SNOW_POKEMON;

  const targetRarities =
    catches >= 320
      ? ['Legendaria', 'Mítica', 'Secreto']
      : catches >= 170
        ? ['Mítica', 'Épica', 'Legendaria']
        : catches >= 80
          ? ['Épica', 'Rara']
          : ['Rara', 'Común'];

  const candidates = pool.filter((p) => targetRarities.includes(p.rarity));
  const pickPool = candidates.length > 0 ? candidates : pool;
  const bestFish = pickPool[abs % pickPool.length] ?? KANTO_SNOW_POKEMON[0];

  const discoveredCount = Math.min(
    ALL_FISH.length,
    Math.max(4, Math.round(catches * 0.14) + (abs % 9))
  );
  const masteredCount = Math.min(
    discoveredCount,
    Math.floor(Math.max(0, catches - 40) / 85)
  );

  const equippedCosmetics: string[] = [];
  const rodOptions = ['rod_carbon', 'rod_gold', 'rod_og'];
  if (catches >= 340 && abs % 4 === 0) {
    const suits = ['suit_wizard', 'suit_magma', 'suit_millionaire'];
    equippedCosmetics.push(suits[abs % suits.length]);
    if (abs % 2 === 0) {
      equippedCosmetics.push(rodOptions[(abs >> 2) % rodOptions.length]);
    }
  } else {
    const tops = [
      'shirt_blue',
      'shirt_green',
      'shirt_red',
      'shirt_purple',
      'shirt_cyan',
      'shirt_emerald',
      'coat_polar',
      'coat_hoodie',
      'coat_jacket_crimson',
    ];
    const pants = [
      'pants_cargo',
      'pants_black',
      'pants_denim',
      'pants_khaki',
      'pants_ice',
      'pants_white',
    ];
    const hats = ['hat_red', 'hat_cap_blue', 'hat_beanie_wool', 'hat_crown'];
    const scarves = ['scarf_gold', 'scarf_crimson'];
    const glasses = ['glasses_cool', 'glasses_pixel'];

    equippedCosmetics.push(tops[abs % tops.length]);
    equippedCosmetics.push(pants[(abs >> 2) % pants.length]);
    if (abs % 2 === 0) {
      equippedCosmetics.push(hats[(abs >> 3) % hats.length]);
    }
    if (abs % 3 === 0) {
      equippedCosmetics.push(glasses[(abs >> 4) % glasses.length]);
    }
    if (abs % 4 === 1) {
      equippedCosmetics.push(scarves[(abs >> 5) % scarves.length]);
    }
    if (catches >= 150) {
      equippedCosmetics.push(rodOptions[(abs >> 1) % rodOptions.length]);
    }
  }

  return {
    bestFishId: bestFish.id,
    discoveredCount,
    masteredCount,
    underworldUnlocked,
    equippedCosmetics,
  };
}

export function generateDeterministicFriend(username: string): FriendEntry {
  const clean = username.trim();
  const abs = hashUsername(clean);
  const avatars = ['🎣', '🐟', '🦈', '🌊', '🚣', '🐠', '🐳', '🌟', '🏆', '⚓', '🦦', '🐧'];
  const avatar = avatars[abs % avatars.length];
  const catches = 35 + (abs % 420);
  const money = 950 + ((abs * 47) % 68000);
  const timeSeconds = 2400 + ((abs * 83) % 48000);
  const extra = deriveDeterministicFriendStats(clean, catches);

  return {
    username: clean,
    avatar,
    catches,
    money,
    timeSeconds,
    ...extra,
  };
}

import {
  Language,
  formatNumber,
  formatOddsOneIn,
  getRarityDescription,
  getRarityName,
} from './i18n';

export type Rarity =
  | 'Común'
  | 'Rara'
  | 'Épica'
  | 'Mítica'
  | 'Legendaria'
  | 'Secreto'
  | 'Secreto Abisal';

export interface RarityConfig {
  name: Rarity;
  weight: number;
  color: string;
  bgColor: string;
  valueMultiplier: number;
}

export const RARITIES: Record<Rarity, RarityConfig> = {
  Común: {
    name: 'Común',
    weight: 60,
    color: '#475569',
    bgColor: '#e2e8f0',
    valueMultiplier: 1,
  },
  Rara: {
    name: 'Rara',
    weight: 20,
    color: '#0369a1',
    bgColor: '#e0f2fe',
    valueMultiplier: 2,
  },
  Épica: {
    name: 'Épica',
    weight: 10,
    color: '#7e22ce',
    bgColor: '#f3e8ff',
    valueMultiplier: 4,
  },
  Mítica: {
    name: 'Mítica',
    weight: 5,
    color: '#be123c',
    bgColor: '#ffe4e6',
    valueMultiplier: 8,
  },
  Legendaria: {
    name: 'Legendaria',
    weight: 1,
    color: '#b45309',
    bgColor: '#fef3c7',
    valueMultiplier: 16,
  },
  Secreto: {
    name: 'Secreto',
    weight: 0.5,
    color: '#0f172a',
    bgColor: '#cbd5e1',
    valueMultiplier: 35,
  },
  'Secreto Abisal': {
    name: 'Secreto Abisal',
    weight: 0.001,
    color: '#0891b2',
    bgColor: '#cffafe',
    valueMultiplier: 100,
  },
};

export function getRarityOddsLabel(rarity: Rarity, lang: Language = 'es'): string {
  const w = RARITIES[rarity].weight;
  const total = Object.values(RARITIES).reduce((s, r) => s + r.weight, 0);
  const prob = w / total;
  const oneIn = Math.max(1, Math.round(1 / prob));
  return `${w}% · ${formatOddsOneIn(oneIn, lang)}`;
}
export interface PokemonSpecies {
  id: number;
  name: string;
  rarity: Rarity;
  oneIn: number;
  baseValue: number;
  fixedSellValue?: number;
  spriteColor: string;
  accentColor: string;
}

export function getSpeciesSellValue(species: PokemonSpecies): number {
  return (
    species.fixedSellValue ??
    species.baseValue * RARITIES[species.rarity].valueMultiplier
  );
}

export interface FishWeightRange {
  minKg: number;
  maxKg: number;
}

const SPECIES_WEIGHT_RANGES: Record<number, FishWeightRange> = {
  // Río Normal — Comunes
  1: { minKg: 1.5, maxKg: 7.2 }, // Carpa
  2: { minKg: 0.08, maxKg: 0.32 }, // Alburno
  3: { minKg: 0.8, maxKg: 3.2 }, // Pez gato
  4: { minKg: 0.18, maxKg: 0.65 }, // Percasol
  5: { minKg: 0.04, maxKg: 0.12 }, // Guppy
  6: { minKg: 1.1, maxKg: 4.4 }, // Bagre
  21: { minKg: 0.06, maxKg: 0.22 }, // Gobio de río
  22: { minKg: 0.25, maxKg: 0.95 }, // Carpín dorado salvaje
  23: { minKg: 0.1, maxKg: 0.35 }, // Bermejuela
  24: { minKg: 0.25, maxKg: 0.9 }, // Madrilla
  25: { minKg: 0.22, maxKg: 0.85 }, // Sarda
  26: { minKg: 0.1, maxKg: 0.36 }, // Pardilla
  // Río Normal — Raras
  7: { minKg: 0.75, maxKg: 3.2 }, // Trucha
  8: { minKg: 1.2, maxKg: 4.8 }, // Barbo
  9: { minKg: 0.9, maxKg: 3.6 }, // Cacho
  10: { minKg: 0.6, maxKg: 2.4 }, // Piraña
  27: { minKg: 0.12, maxKg: 0.45 }, // Blenio de río
  28: { minKg: 0.08, maxKg: 0.28 }, // Calandino
  29: { minKg: 0.05, maxKg: 0.18 }, // Colmilleja
  30: { minKg: 0.35, maxKg: 1.3 }, // Darso
  31: { minKg: 0.7, maxKg: 2.8 }, // Barbo colirrojo
  32: { minKg: 0.12, maxKg: 0.42 }, // Cachito de arroyo
  // Río Normal — Épicas
  11: { minKg: 1.8, maxKg: 6.8 }, // Trucha arcoíris
  12: { minKg: 1.4, maxKg: 5.2 }, // Tenca
  13: { minKg: 4.0, maxKg: 16.0 }, // Lucio
  33: { minKg: 2.2, maxKg: 7.5 }, // Sábalo
  34: { minKg: 1.9, maxKg: 6.4 }, // Saboga
  35: { minKg: 2.6, maxKg: 9.8 }, // Lucio-perca
  36: { minKg: 1.5, maxKg: 5.4 }, // Black Bass pequeño
  37: { minKg: 3.0, maxKg: 11.5 }, // Barbo comiza
  // Río Normal — Míticas
  14: { minKg: 1.2, maxKg: 4.2 }, // Boga
  15: { minKg: 0.45, maxKg: 1.65 }, // Pez ángel
  16: { minKg: 0.5, maxKg: 1.8 }, // Pez disco
  38: { minKg: 18.0, maxKg: 58.0 }, // Siluro albino
  39: { minKg: 9.0, maxKg: 30.0 }, // Lucio gigante
  40: { minKg: 7.0, maxKg: 26.0 }, // Salmón del Danubio
  41: { minKg: 4.5, maxKg: 16.5 }, // Paci
  42: { minKg: 12.0, maxKg: 36.0 }, // Carpa espejo gigante
  // Río Normal — Legendarias
  17: { minKg: 2.2, maxKg: 7.8 }, // Bocachico
  18: { minKg: 4.5, maxKg: 16.5 }, // Salmón
  43: { minKg: 55.0, maxKg: 175.0 }, // Esturión beluga
  44: { minKg: 35.0, maxKg: 115.0 }, // Arapaima gigas
  45: { minKg: 18.0, maxKg: 55.0 }, // Pez espátula americano
  46: { minKg: 65.0, maxKg: 210.0 }, // Siluro gigante centenario
  // Río Normal — Secretas
  19: { minKg: 2.0, maxKg: 6.8 }, // Anguila europea
  47: { minKg: 35.0, maxKg: 95.0 }, // Celacanto de río profundo
  48: { minKg: 12.0, maxKg: 38.0 }, // Anguila eléctrica gigante
  49: { minKg: 80.0, maxKg: 240.0 }, // Dragón de agua dulce ancestral
  // Río Normal — Secretas Abisales
  20: { minKg: 45.0, maxKg: 150.0 }, // Esturión
  50: { minKg: 120.0, maxKg: 340.0 }, // Monstruo del lago de las simas abisales
  51: { minKg: 3.2, maxKg: 10.5 }, // Pez borrón
  // Inframundo
  101: { minKg: 1.2, maxKg: 4.5 }, // Pez Demonio de Fuego
  106: { minKg: 1.8, maxKg: 6.2 }, // Obsidiana
  107: { minKg: 0.8, maxKg: 3.0 }, // Almas
  108: { minKg: 2.2, maxKg: 7.5 }, // Madera quemada
  102: { minKg: 2.5, maxKg: 8.5 }, // Anguila de Magma
  109: { minKg: 3.0, maxKg: 10.5 }, // Cadáveres
  110: { minKg: 4.5, maxKg: 15.0 }, // Cuernos
  111: { minKg: 1.6, maxKg: 5.8 }, // Cenizas
  103: { minKg: 3.5, maxKg: 12.0 }, // Calaveras de Magma
  112: { minKg: 8.0, maxKg: 26.0 }, // Alas de magma
  104: { minKg: 10.0, maxKg: 32.0 }, // Mini Demonio
  105: { minKg: 16.0, maxKg: 48.0 }, // Corazón de Magma
  113: { minKg: 2.4, maxKg: 8.0 }, // Pergamino quemado
  114: { minKg: 55.0, maxKg: 175.0 }, // Jabalí de fuego
};

const RARITY_FALLBACK_WEIGHT: Record<Rarity, FishWeightRange> = {
  Común: { minKg: 0.3, maxKg: 1.8 },
  Rara: { minKg: 0.8, maxKg: 3.6 },
  Épica: { minKg: 2.0, maxKg: 8.0 },
  Mítica: { minKg: 5.0, maxKg: 18.0 },
  Legendaria: { minKg: 12.0, maxKg: 45.0 },
  Secreto: { minKg: 20.0, maxKg: 75.0 },
  'Secreto Abisal': { minKg: 45.0, maxKg: 160.0 },
};

export function getSpeciesWeightRange(species: PokemonSpecies): FishWeightRange {
  return SPECIES_WEIGHT_RANGES[species.id] ?? RARITY_FALLBACK_WEIGHT[species.rarity];
}

export function getSpeciesWeightFactor(
  species: PokemonSpecies,
  weightKg?: number
): number {
  if (typeof weightKg !== 'number' || !Number.isFinite(weightKg)) {
    return 0.5;
  }
  const { minKg, maxKg } = getSpeciesWeightRange(species);
  if (maxKg <= minKg) return 0.5;
  return Math.max(0, Math.min(1, (weightKg - minKg) / (maxKg - minKg)));
}

export function rollFishWeightKg(
  species: PokemonSpecies,
  roll: number = Math.random()
): number {
  const { minKg, maxKg } = getSpeciesWeightRange(species);
  const t = Number.isFinite(roll) ? Math.max(0, Math.min(1, roll)) : 0.5;
  // Monotonic bell-leaning curve: keeps typical catches realistic while allowing full [minKg, maxKg] bounds
  const centered = t - 0.5;
  const shaped = Math.max(
    0,
    Math.min(1, 0.5 + centered * (0.68 + 1.28 * centered * centered))
  );
  const raw = minKg + shaped * (maxKg - minKg);
  const rounded = maxKg >= 20 ? Math.round(raw * 10) / 10 : Math.round(raw * 100) / 100;
  return Math.max(minKg, Math.min(maxKg, rounded));
}

export function calculateWeightedSellValue(
  species: PokemonSpecies,
  weightKg?: number
): number {
  const base = getSpeciesSellValue(species);
  const factor = getSpeciesWeightFactor(species, weightKg);
  // 0.75x at min weight -> 1.00x at median weight -> 1.30x at trophy max weight
  const multiplier =
    factor <= 0.5 ? 0.75 + factor * 0.5 : 1.0 + (factor - 0.5) * 0.6;
  return Math.max(1, Math.round(base * multiplier));
}

export function formatFishWeight(
  weightKg: number,
  lang: Language = 'es'
): string {
  if (!Number.isFinite(weightKg) || weightKg <= 0) return '—';
  const decimals = weightKg >= 20 ? 1 : 2;
  const formatted = new Intl.NumberFormat(lang === 'en' ? 'en-US' : 'es-ES', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(weightKg);
  return `${formatted} kg`;
}

export function formatFishWeightRange(
  species: PokemonSpecies,
  lang: Language = 'es'
): string {
  const { minKg, maxKg } = getSpeciesWeightRange(species);
  const fmt = (val: number) =>
    new Intl.NumberFormat(lang === 'en' ? 'en-US' : 'es-ES', {
      minimumFractionDigits: val >= 20 ? 0 : val < 1 ? 2 : 1,
      maximumFractionDigits: val >= 20 ? 1 : 2,
    }).format(val);
  return `${fmt(minKg)}–${fmt(maxKg)} kg`;
}

export function updateMaxFishWeightRecord(
  records: Record<number, number>,
  speciesId: number,
  weightKg?: number
): Record<number, number> {
  if (
    !Number.isFinite(speciesId) ||
    speciesId <= 0 ||
    typeof weightKg !== 'number' ||
    !Number.isFinite(weightKg) ||
    weightKg <= 0
  ) {
    return records;
  }
  const cleanWeight = Number(weightKg.toFixed(2));
  const prevMax = Number(records[speciesId]) || 0;
  if (cleanWeight > prevMax) {
    return {
      ...records,
      [speciesId]: cleanWeight,
    };
  }
  return records;
}

export function sanitizeMaxFishWeights(raw: unknown): Record<number, number> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const result: Record<number, number> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    const id = Number(k);
    const w = Number(v);
    if (Number.isFinite(id) && id > 0 && Number.isFinite(w) && w > 0) {
      const clean = Number(w.toFixed(2));
      if (clean > (result[id] ?? 0)) {
        result[id] = clean;
      }
    }
  }
  return result;
}

export function mergeMaxFishWeightRecords(
  ...sources: Array<Record<number, number> | undefined>
): Record<number, number> {
  const merged: Record<number, number> = {};
  for (const src of sources) {
    if (!src) continue;
    for (const [k, v] of Object.entries(src)) {
      const id = Number(k);
      const w = Number(v);
      if (Number.isFinite(id) && id > 0 && Number.isFinite(w) && w > 0) {
        const clean = Number(w.toFixed(2));
        if (clean > (merged[id] ?? 0)) {
          merged[id] = clean;
        }
      }
    }
  }
  return merged;
}

export const RARITY_DESCRIPTIONS: Record<Rarity, string> = {
  Común: 'Muy habitual al lanzar la caña.',
  Rara: 'Sale con menos frecuencia que las comunes.',
  Épica: 'Captura difícil que requiere paciencia.',
  Mítica: 'Muy difícil de pescar en cualquier tirada.',
  Legendaria: 'Extremadamente escasa, pocos pescadores la ven.',
  Secreto: 'Aparición oculta y rarísima.',
  'Secreto Abisal': 'Probabilidad mínima: la captura más difícil del juego.',
};

export function getRarityProbabilitySummary(
  rarity: Rarity,
  pool: PokemonSpecies[],
  lang: Language = 'es'
): { pctLabel: string; oneInLabel: string; description: string; fullText: string } {
  const totalWeight = pool.reduce((sum, p) => sum + 1 / p.oneIn, 0);
  const rarityWeight = pool
    .filter((p) => p.rarity === rarity)
    .reduce((sum, p) => sum + 1 / p.oneIn, 0);
  const prob = totalWeight > 0 && rarityWeight > 0 ? rarityWeight / totalWeight : 0;
  const pct = prob * 100;
  const pctLabel =
    pct >= 1
      ? `${pct.toFixed(1)}%`
      : pct >= 0.01
        ? `${pct.toFixed(2)}%`
        : `${pct.toFixed(4)}%`;
  const oneIn = prob > 0 ? Math.max(1, Math.round(1 / prob)) : 0;
  const oneInLabel = oneIn > 0 ? `~${formatOddsOneIn(oneIn, lang)}` : '—';
  const description = getRarityDescription(rarity, lang) || RARITY_DESCRIPTIONS[rarity];
  const rarityLabel = getRarityName(rarity, lang);
  return {
    pctLabel,
    oneInLabel,
    description,
    fullText: `${rarityLabel}: ${pctLabel} (${oneInLabel}) — ${description}`,
  };
}

export function getSpeciesOddsLabel(species: PokemonSpecies, lang: Language = 'es'): string {
  return formatOddsOneIn(species.oneIn, lang);
}

export type FishingEnvironment = 'Pesca de Río';

export const KANTO_SNOW_POKEMON: PokemonSpecies[] = [
  // Comunes (1x -> 8 a 16 monedas)
  { id: 1, name: 'Carpa', rarity: 'Común', oneIn: 2, baseValue: 8, spriteColor: '#ea580c', accentColor: '#fed7aa' },
  { id: 2, name: 'Alburno', rarity: 'Común', oneIn: 3, baseValue: 10, spriteColor: '#94a3b8', accentColor: '#f8fafc' },
  { id: 3, name: 'Pez gato', rarity: 'Común', oneIn: 4, baseValue: 12, spriteColor: '#475569', accentColor: '#94a3b8' },
  { id: 4, name: 'Percasol', rarity: 'Común', oneIn: 5, baseValue: 14, spriteColor: '#22c55e', accentColor: '#fde047' },
  { id: 5, name: 'Guppy', rarity: 'Común', oneIn: 5, baseValue: 14, spriteColor: '#f97316', accentColor: '#fde047' },
  { id: 6, name: 'Bagre', rarity: 'Común', oneIn: 6, baseValue: 16, spriteColor: '#64748b', accentColor: '#cbd5e1' },
  // Raras (2x -> 28 a 56 monedas)
  { id: 7, name: 'Trucha', rarity: 'Rara', oneIn: 10, baseValue: 14, spriteColor: '#38bdf8', accentColor: '#bae6fd' },
  { id: 8, name: 'Barbo', rarity: 'Rara', oneIn: 10, baseValue: 14, spriteColor: '#ca8a04', accentColor: '#fef08a' },
  { id: 9, name: 'Cacho', rarity: 'Rara', oneIn: 15, baseValue: 19, spriteColor: '#65a30d', accentColor: '#ecfccb' },
  { id: 10, name: 'Piraña', rarity: 'Rara', oneIn: 25, baseValue: 28, spriteColor: '#dc2626', accentColor: '#cbd5e1' },
  // Épicas (4x -> 96 a 192 monedas)
  { id: 11, name: 'Trucha arcoíris', rarity: 'Épica', oneIn: 35, baseValue: 24, spriteColor: '#38bdf8', accentColor: '#f472b6' },
  { id: 12, name: 'Tenca', rarity: 'Épica', oneIn: 56, baseValue: 35, spriteColor: '#15803d', accentColor: '#bbf7d0' },
  { id: 13, name: 'Lucio', rarity: 'Épica', oneIn: 89, baseValue: 48, spriteColor: '#166534', accentColor: '#fde047' },
  // Míticas (8x -> 368 a 760 monedas)
  { id: 14, name: 'Boga', rarity: 'Mítica', oneIn: 203, baseValue: 46, spriteColor: '#0284c7', accentColor: '#e0f2fe' },
  { id: 15, name: 'Pez ángel', rarity: 'Mítica', oneIn: 545, baseValue: 82, spriteColor: '#facc15', accentColor: '#0f172a' },
  { id: 16, name: 'Pez disco', rarity: 'Mítica', oneIn: 700, baseValue: 95, spriteColor: '#e11d48', accentColor: '#bae6fd' },
  // Legendarias (16x -> 1200 a 1600 monedas)
  { id: 17, name: 'Bocachico', rarity: 'Legendaria', oneIn: 1000, baseValue: 75, spriteColor: '#d97706', accentColor: '#fef3c7' },
  { id: 18, name: 'Salmón', rarity: 'Legendaria', oneIn: 1575, baseValue: 100, spriteColor: '#fb7185', accentColor: '#f1f5f9' },
  // Secretas (35x -> 3500 monedas)
  { id: 19, name: 'Anguila europea', rarity: 'Secreto', oneIn: 5555, baseValue: 100, spriteColor: '#1e293b', accentColor: '#64748b' },
  // Secretas Abisales (100x -> 23500 monedas)
  { id: 20, name: 'Esturión', rarity: 'Secreto Abisal', oneIn: 137500, baseValue: 235, spriteColor: '#06b6d4', accentColor: '#cffafe' },
  // Comunes (6 nuevos)
  { id: 21, name: 'Gobio de río', rarity: 'Común', oneIn: 3, baseValue: 10, spriteColor: '#a8a29e', accentColor: '#e7e5e4' },
  { id: 22, name: 'Carpín dorado salvaje', rarity: 'Común', oneIn: 4, baseValue: 12, spriteColor: '#f59e0b', accentColor: '#fde68a' },
  { id: 23, name: 'Bermejuela', rarity: 'Común', oneIn: 4, baseValue: 12, spriteColor: '#fb7185', accentColor: '#fecdd3' },
  { id: 24, name: 'Madrilla', rarity: 'Común', oneIn: 5, baseValue: 14, spriteColor: '#94a3b8', accentColor: '#e2e8f0' },
  { id: 25, name: 'Sarda', rarity: 'Común', oneIn: 5, baseValue: 14, spriteColor: '#38bdf8', accentColor: '#bae6fd' },
  { id: 26, name: 'Pardilla', rarity: 'Común', oneIn: 6, baseValue: 16, spriteColor: '#78716c', accentColor: '#d6d3d1' },
  // Raras (6 nuevos)
  { id: 27, name: 'Blenio de río', rarity: 'Rara', oneIn: 12, baseValue: 16, spriteColor: '#0ea5e9', accentColor: '#bae6fd' },
  { id: 28, name: 'Calandino', rarity: 'Rara', oneIn: 14, baseValue: 18, spriteColor: '#38bdf8', accentColor: '#e0f2fe' },
  { id: 29, name: 'Colmilleja', rarity: 'Rara', oneIn: 16, baseValue: 20, spriteColor: '#a3e635', accentColor: '#ecfccb' },
  { id: 30, name: 'Darso', rarity: 'Rara', oneIn: 18, baseValue: 22, spriteColor: '#818cf8', accentColor: '#e0e7ff' },
  { id: 31, name: 'Barbo colirrojo', rarity: 'Rara', oneIn: 20, baseValue: 24, spriteColor: '#f43f5e', accentColor: '#ffe4e6' },
  { id: 32, name: 'Cachito de arroyo', rarity: 'Rara', oneIn: 22, baseValue: 26, spriteColor: '#2dd4bf', accentColor: '#ccfbf1' },
  // Épicas (5 nuevos)
  { id: 33, name: 'Sábalo', rarity: 'Épica', oneIn: 40, baseValue: 27, spriteColor: '#a855f7', accentColor: '#f3e8ff' },
  { id: 34, name: 'Saboga', rarity: 'Épica', oneIn: 45, baseValue: 30, spriteColor: '#9333ea', accentColor: '#e9d5ff' },
  { id: 35, name: 'Lucio-perca', rarity: 'Épica', oneIn: 52, baseValue: 33, spriteColor: '#c084fc', accentColor: '#faf5ff' },
  { id: 36, name: 'Black Bass pequeño', rarity: 'Épica', oneIn: 60, baseValue: 37, spriteColor: '#22c55e', accentColor: '#dcfce7' },
  { id: 37, name: 'Barbo comiza', rarity: 'Épica', oneIn: 68, baseValue: 40, spriteColor: '#d946ef', accentColor: '#fae8ff' },
  // Míticas (5 nuevos)
  { id: 38, name: 'Siluro albino', rarity: 'Mítica', oneIn: 180, baseValue: 42, spriteColor: '#f8fafc', accentColor: '#fee2e2' },
  { id: 39, name: 'Lucio gigante', rarity: 'Mítica', oneIn: 220, baseValue: 49, spriteColor: '#ef4444', accentColor: '#fecaca' },
  { id: 40, name: 'Salmón del Danubio', rarity: 'Mítica', oneIn: 280, baseValue: 56, spriteColor: '#f97316', accentColor: '#ffedd5' },
  { id: 41, name: 'Paci', rarity: 'Mítica', oneIn: 340, baseValue: 62, spriteColor: '#dc2626', accentColor: '#fee2e2' },
  { id: 42, name: 'Carpa espejo gigante', rarity: 'Mítica', oneIn: 420, baseValue: 70, spriteColor: '#fb7185', accentColor: '#ffe4e6' },
  // Legendarias (4 nuevos)
  { id: 43, name: 'Esturión beluga', rarity: 'Legendaria', oneIn: 1200, baseValue: 85, spriteColor: '#facc15', accentColor: '#fef9c3' },
  { id: 44, name: 'Arapaima gigas', rarity: 'Legendaria', oneIn: 1600, baseValue: 102, spriteColor: '#eab308', accentColor: '#fef08a' },
  { id: 45, name: 'Pez espátula americano', rarity: 'Legendaria', oneIn: 2200, baseValue: 125, spriteColor: '#f59e0b', accentColor: '#fde68a' },
  { id: 46, name: 'Siluro gigante centenario', rarity: 'Legendaria', oneIn: 3000, baseValue: 150, spriteColor: '#d97706', accentColor: '#fef3c7' },
  // Secretos (3 nuevos)
  { id: 47, name: 'Celacanto de río profundo', rarity: 'Secreto', oneIn: 45000, baseValue: 220, spriteColor: '#1e293b', accentColor: '#94a3b8' },
  { id: 48, name: 'Anguila eléctrica gigante', rarity: 'Secreto', oneIn: 60000, baseValue: 260, spriteColor: '#0f172a', accentColor: '#fde047' },
  { id: 49, name: 'Dragón de agua dulce ancestral', rarity: 'Secreto', oneIn: 85000, baseValue: 300, spriteColor: '#334155', accentColor: '#cbd5e1' },
  // Secretos Abisales (2 nuevos, máx. 25,000 monedas)
  { id: 50, name: 'Monstruo del lago de las simas abisales', rarity: 'Secreto Abisal', oneIn: 150000, baseValue: 250, spriteColor: '#0891b2', accentColor: '#a5f3fc' },
  { id: 51, name: 'Pez borrón', rarity: 'Secreto Abisal', oneIn: 67000, baseValue: 180, spriteColor: '#f472b6', accentColor: '#fbcfe8' },
];

export const UNDERWORLD_POKEMON: PokemonSpecies[] = [
  {
    id: 101,
    name: 'Pez Demonio de Fuego',
    rarity: 'Común',
    oneIn: 4,
    baseValue: 12,
    spriteColor: '#ea580c',
    accentColor: '#fed7aa',
  },
  {
    id: 106,
    name: 'Obsidiana',
    rarity: 'Común',
    oneIn: 6,
    baseValue: 16,
    spriteColor: '#312e81',
    accentColor: '#a855f7',
  },
  {
    id: 107,
    name: 'Almas',
    rarity: 'Común',
    oneIn: 10,
    baseValue: 22,
    spriteColor: '#38bdf8',
    accentColor: '#e0f2fe',
  },
  {
    id: 108,
    name: 'Madera quemada',
    rarity: 'Rara',
    oneIn: 28,
    baseValue: 30,
    spriteColor: '#78350f',
    accentColor: '#f97316',
  },
  {
    id: 102,
    name: 'Anguila de Magma',
    rarity: 'Rara',
    oneIn: 32,
    baseValue: 33,
    spriteColor: '#f97316',
    accentColor: '#fef08a',
  },
  {
    id: 109,
    name: 'Cadáveres',
    rarity: 'Rara',
    oneIn: 37,
    baseValue: 36,
    spriteColor: '#94a3b8',
    accentColor: '#cbd5e1',
  },
  {
    id: 110,
    name: 'Cuernos',
    rarity: 'Épica',
    oneIn: 58,
    baseValue: 36,
    spriteColor: '#991b1b',
    accentColor: '#fca5a5',
  },
  {
    id: 111,
    name: 'Cenizas',
    rarity: 'Épica',
    oneIn: 76,
    baseValue: 43,
    spriteColor: '#475569',
    accentColor: '#f97316',
  },
  {
    id: 103,
    name: 'Calaveras de Magma',
    rarity: 'Épica',
    oneIn: 134,
    baseValue: 60,
    spriteColor: '#cbd5e1',
    accentColor: '#f1f5f9',
  },
  {
    id: 112,
    name: 'Alas de magma',
    rarity: 'Mítica',
    oneIn: 438,
    baseValue: 72,
    spriteColor: '#f97316',
    accentColor: '#fef08a',
  },
  {
    id: 104,
    name: 'Mini Demonio',
    rarity: 'Mítica',
    oneIn: 450,
    baseValue: 74,
    spriteColor: '#dc2626',
    accentColor: '#7f1d1d',
  },
  {
    id: 105,
    name: 'Corazón de Magma',
    rarity: 'Legendaria',
    oneIn: 1000,
    baseValue: 75,
    spriteColor: '#facc15',
    accentColor: '#b45309',
  },
  {
    id: 113,
    name: 'Pergamino quemado',
    rarity: 'Secreto',
    oneIn: 6459,
    baseValue: 112,
    spriteColor: '#92400e',
    accentColor: '#fde68a',
  },
  {
    id: 114,
    name: 'Jabalí de fuego',
    rarity: 'Secreto Abisal',
    oneIn: 58907,
    baseValue: 165,
    spriteColor: '#dc2626',
    accentColor: '#fde047',
  },
];

export const ALL_FISH: PokemonSpecies[] = [
  ...KANTO_SNOW_POKEMON,
  ...UNDERWORLD_POKEMON,
];

const RARITY_PRESTIGE_RANK: Record<Rarity, number> = {
  Común: 0,
  Rara: 1,
  Épica: 2,
  Mítica: 3,
  Legendaria: 4,
  Secreto: 5,
  'Secreto Abisal': 6,
};

export function compareSpeciesPrestige(
  a: PokemonSpecies,
  b: PokemonSpecies
): number {
  const rankDiff =
    RARITY_PRESTIGE_RANK[a.rarity] - RARITY_PRESTIGE_RANK[b.rarity];
  if (rankDiff !== 0) return rankDiff;
  const oddsDiff = a.oneIn - b.oneIn;
  if (oddsDiff !== 0) return oddsDiff;
  const valDiff = getSpeciesSellValue(a) - getSpeciesSellValue(b);
  if (valDiff !== 0) return valDiff;
  return a.id - b.id;
}

export function getBestFishFromDiscovered(
  discoveredFish?: Record<number, number>
): PokemonSpecies | null {
  if (!discoveredFish) return null;
  let best: PokemonSpecies | null = null;
  for (const species of ALL_FISH) {
    if ((discoveredFish[species.id] ?? 0) > 0) {
      if (!best || compareSpeciesPrestige(species, best) > 0) {
        best = species;
      }
    }
  }
  return best;
}

export function isUnderworldSpecies(fishId: number): boolean {
  return UNDERWORLD_POKEMON.some((p) => p.id === fishId);
}

export interface CaughtPokemon {
  uid: string;
  species: PokemonSpecies;
  sellValue: number;
  weightKg?: number;
  caughtAt: number;
  variantIndex?: number;
}

export interface CombinedLuckSources {
  timedLuck?: number;
  rodLuck?: number;
  wormLuck?: number;
  extraMultipliers?: number[];
}

/**
 * Combines all active luck sources multiplicatively.
 * Example: 5x worm * 1.5x golden rod = 7.5x; with 2x timed boost = 15x.
 */
export function calculateCombinedLuckMultiplier(
  sources: CombinedLuckSources
): number {
  const clean = (val?: number) =>
    typeof val === 'number' && Number.isFinite(val) && val > 1 ? val : 1;

  let product =
    clean(sources.timedLuck) *
    clean(sources.rodLuck) *
    clean(sources.wormLuck);

  if (Array.isArray(sources.extraMultipliers)) {
    for (const m of sources.extraMultipliers) {
      product *= clean(m);
    }
  }

  return Math.min(10000, Math.round(product * 10000) / 10000);
}

const RARITY_WATERFALL_ORDER: Rarity[] = [
  'Secreto Abisal',
  'Secreto',
  'Legendaria',
  'Mítica',
  'Épica',
  'Rara',
  'Común',
];

/**
 * Computes the exact probability distribution for a species pool at a given luckMultiplier.
 * - At luckMultiplier = 1, each species p has base probability (1 / p.oneIn) / sum(1 / q.oneIn).
 * - At luckMultiplier = L (L > 1), non-common species ("algo bueno": Rara -> Secreto Abisal)
 *   receive literally L * baseProbability(p), allocated from rarest tier down to Rara,
 *   while Común absorbs the remaining probability budget (1 - sum(nonCommon)).
 * - If L is so large that L * sum(nonCommonBase) exceeds 1.0, the rarest tiers
 *   still get their exact Lx multiplier first, and lower tiers take the remaining budget.
 */
export function getEffectiveSpeciesProbabilities(
  pool: PokemonSpecies[],
  luckMultiplier = 1
): Map<number, number> {
  const safeLuck = Number.isFinite(luckMultiplier)
    ? Math.max(1, luckMultiplier)
    : 1;
  const totalBaseWeight = pool.reduce((sum, p) => sum + 1 / p.oneIn, 0);
  const probs = new Map<number, number>();
  if (pool.length === 0 || totalBaseWeight <= 0) {
    return probs;
  }

  const baseProbById = new Map<number, number>();
  for (const p of pool) {
    baseProbById.set(p.id, 1 / p.oneIn / totalBaseWeight);
  }

  if (safeLuck <= 1) {
    for (const p of pool) {
      probs.set(p.id, baseProbById.get(p.id) ?? 0);
    }
    return probs;
  }

  let remainingBudget = 1;

  for (const rarity of RARITY_WATERFALL_ORDER) {
    const tierSpecies = pool.filter((p) => p.rarity === rarity);
    if (tierSpecies.length === 0) continue;

    const tierBaseSum = tierSpecies.reduce(
      (sum, p) => sum + (baseProbById.get(p.id) ?? 0),
      0
    );

    if (rarity === 'Común') {
      const commonShare = Math.max(0, remainingBudget);
      for (const p of tierSpecies) {
        const baseP = baseProbById.get(p.id) ?? 0;
        const share =
          tierBaseSum > 0
            ? commonShare * (baseP / tierBaseSum)
            : commonShare / tierSpecies.length;
        probs.set(p.id, share);
      }
      remainingBudget = 0;
      continue;
    }

    const desiredTierProb = tierBaseSum * safeLuck;
    const allocatedTierProb = Math.min(remainingBudget, desiredTierProb);

    for (const p of tierSpecies) {
      const baseP = baseProbById.get(p.id) ?? 0;
      const share =
        tierBaseSum > 0 ? allocatedTierProb * (baseP / tierBaseSum) : 0;
      probs.set(p.id, share);
    }

    remainingBudget = Math.max(0, remainingBudget - allocatedTierProb);
  }

  // If the pool had no Común species and budget remains, normalize so total = 1
  const currentTotal = Array.from(probs.values()).reduce((a, b) => a + b, 0);
  if (currentTotal > 0 && Math.abs(currentTotal - 1) > 1e-9) {
    for (const [id, val] of probs.entries()) {
      probs.set(id, val / currentTotal);
    }
  }

  return probs;
}

export function rollPokemonCatch(
  rng: () => number = Math.random,
  world: 'river' | 'underworld' = 'river',
  luckMultiplier = 1,
  weightRollOverride?: number
): CaughtPokemon {
  const pool = world === 'underworld' ? UNDERWORLD_POKEMON : KANTO_SNOW_POKEMON;
  const safeLuck = Number.isFinite(luckMultiplier) ? Math.max(1, luckMultiplier) : 1;
  const probMap = getEffectiveSpeciesProbabilities(pool, safeLuck);
  const clampedRng = Math.min(0.999999999999, Math.max(0, rng()));
  let roll = clampedRng;
  let species = pool[pool.length - 1];

  for (const p of pool) {
    roll -= probMap.get(p.id) ?? 0;
    if (roll <= 0) {
      species = p;
      break;
    }
  }

  const uidRand = rng();
  const weightKg = rollFishWeightKg(
    species,
    typeof weightRollOverride === 'number' ? weightRollOverride : uidRand
  );
  const sellValue = calculateWeightedSellValue(species, weightKg);

  return {
    uid: `${species.id}-${Date.now()}-${Math.floor(uidRand * 10000)}`,
    species,
    sellValue,
    weightKg,
    caughtAt: Date.now(),
    variantIndex: species.id === 103 ? Math.floor(rng() * 10) : undefined,
  };
}

// Future-ready Marketplace Adapter (supports local quick-sell now, online P2P market later)
export interface MarketAdapter {
  sellOne(pokemon: CaughtPokemon): Promise<number>;
  sellAll(inventory: CaughtPokemon[]): Promise<number>;
}

export const LocalQuickSellMarket: MarketAdapter = {
  async sellOne(pokemon: CaughtPokemon): Promise<number> {
    return pokemon.sellValue;
  },
  async sellAll(inventory: CaughtPokemon[]): Promise<number> {
    return inventory.reduce((total, p) => total + p.sellValue, 0);
  },
};

export type CosmeticSlot = 'beard' | 'hat' | 'scarf' | 'glasses' | 'coat' | 'suit';

export interface CosmeticItem {
  id: string;
  name: string;
  slot: CosmeticSlot;
  price: number;
  description: string;
}

export const COSMETICS_CATALOG: CosmeticItem[] = [
  {
    id: 'beard_fisher',
    name: 'Barba de Pescador',
    slot: 'beard',
    price: 120,
    description: 'Una barba espesa ideal para el frío de Kanto.',
  },
  {
    id: 'hat_red',
    name: 'Gorra Roja Clásica',
    slot: 'hat',
    price: 180,
    description: 'Estilo entrenador clásico de Pueblo Paleta.',
  },
  {
    id: 'scarf_gold',
    name: 'Bufanda Dorada',
    slot: 'scarf',
    price: 250,
    description: 'Bufanda brillante tejida con lana de Mareep.',
  },
  {
    id: 'glasses_cool',
    name: 'Gafas de Sol',
    slot: 'glasses',
    price: 320,
    description: 'Para evitar el reflejo del sol en la nieve.',
  },
  {
    id: 'coat_polar',
    name: 'Abrigo Polar Azul',
    slot: 'coat',
    price: 450,
    description: 'Abrigo térmico de expedición ártica.',
  },
  {
    id: 'height_tall',
    name: 'Mejora de Altura',
    slot: 'coat',
    price: 380,
    description: 'Botas altas que aumentan la estatura del pescador.',
  },
  {
    id: 'rod_carbon',
    name: 'Caña de Carbono',
    slot: 'scarf',
    price: 1000,
    description: 'Fibra de carbono trenzada de alta precisión con carrete metálico. Reduce el tiempo base de pesca de 5s a 4s.',
  },
  {
    id: 'rod_gold',
    name: 'Caña de Oro',
    slot: 'scarf',
    price: 5000,
    description: 'Caña maestra de oro 24k con carrete engarzado en rubí: facilita el control de tensión (+25%), otorga 1,5x de suerte y reduce el tiempo de pesca a 3s.',
  },
  {
    id: 'shirt_blue',
    name: 'Camiseta Azul',
    slot: 'coat',
    price: 90,
    description: 'Camiseta azul cómoda para pescar en el muelle.',
  },
  {
    id: 'shirt_green',
    name: 'Camiseta Verde',
    slot: 'coat',
    price: 90,
    description: 'Camiseta verde bosque ideal para el río.',
  },
  {
    id: 'shirt_red',
    name: 'Camiseta Roja',
    slot: 'coat',
    price: 90,
    description: 'Camiseta rojo carmesí vibrante de competición.',
  },
  {
    id: 'shirt_yellow',
    name: 'Camiseta Amarilla',
    slot: 'coat',
    price: 90,
    description: 'Camiseta amarillo sol de alta visibilidad.',
  },
  {
    id: 'shirt_purple',
    name: 'Camiseta Morada',
    slot: 'coat',
    price: 110,
    description: 'Camiseta morado neón de edición nocturna.',
  },
  {
    id: 'shirt_orange',
    name: 'Camiseta Naranja',
    slot: 'coat',
    price: 110,
    description: 'Camiseta naranja fuego de estilo clásico.',
  },
  {
    id: 'shirt_black',
    name: 'Camiseta Negra',
    slot: 'coat',
    price: 130,
    description: 'Camiseta negro obsidiana elegante y resistente.',
  },
  {
    id: 'pants_cargo',
    name: 'Pantalones de Pesca',
    slot: 'coat',
    price: 120,
    description: 'Pantalones verde oliva con bolsillos múltiples.',
  },
  {
    id: 'pants_black',
    name: 'Pantalones Negros',
    slot: 'coat',
    price: 140,
    description: 'Pantalones negros impermeables todo terreno.',
  },
  {
    id: 'pants_red',
    name: 'Pantalones Rojos',
    slot: 'coat',
    price: 140,
    description: 'Pantalones rojos deportivos con refuerzo en rodillas.',
  },
  {
    id: 'pants_khaki',
    name: 'Pantalones Beige',
    slot: 'coat',
    price: 120,
    description: 'Pantalones color arena ligeros para cualquier clima.',
  },
  {
    id: 'pants_purple',
    name: 'Pantalones Morados',
    slot: 'coat',
    price: 160,
    description: 'Pantalones morados con bolsillos laterales reforzados.',
  },
  {
    id: 'pants_ice',
    name: 'Pantalones Celeste',
    slot: 'coat',
    price: 140,
    description: 'Pantalones azul glaciar a juego con el hielo.',
  },
  {
    id: 'boots_tall',
    name: 'Botas Altas (+Altura)',
    slot: 'coat',
    price: 190,
    description: 'Botas de pescador con suela gruesa que te hacen más alto.',
  },
  {
    id: 'rod_og',
    name: 'Caña OG',
    slot: 'scarf',
    price: 0,
    description: 'Caña futurista naranja de edición limitada (ventana de 5 días). Pesca ultrarrápida (~2s).',
  },
  // Trajes completos ya montados
  {
    id: 'suit_millionaire',
    name: 'Traje de Millonario',
    slot: 'suit',
    price: 50000,
    description: 'Conjunto completo de lujo: esmoquin negro y oro, chistera, monóculo y aura dorada de millonario.',
  },
  {
    id: 'suit_magma',
    name: 'Traje de Magma',
    slot: 'suit',
    price: 75000,
    description: 'Armadura volcánica completa de obsidiana y lava ardiente con casco ígneo y chispas.',
  },
  {
    id: 'suit_wizard',
    name: 'Traje de Mago',
    slot: 'suit',
    price: 100000,
    description: 'Túnica estelar, gorro de mago y varita mágica: sustituye la caña para pescar con hechizos sin anzuelo.',
  },
  // Más ropa: camisetas, sudaderas, chaquetas, pantalones y accesorios
  {
    id: 'shirt_cyan',
    name: 'Camiseta Turquesa',
    slot: 'coat',
    price: 120,
    description: 'Camiseta fresca turquesa inspirada en las aguas cristalinas.',
  },
  {
    id: 'shirt_pink',
    name: 'Camiseta Rosa Coral',
    slot: 'coat',
    price: 140,
    description: 'Camiseta rosa coral llamativa para pescar con estilo.',
  },
  {
    id: 'shirt_emerald',
    name: 'Chaleco Esmeralda',
    slot: 'coat',
    price: 220,
    description: 'Chaleco verde esmeralda ligero con bolsillos de explorador.',
  },
  {
    id: 'shirt_gold',
    name: 'Chaqueta Dorada',
    slot: 'coat',
    price: 650,
    description: 'Chaqueta brillante de edición dorada para pescadores expertos.',
  },
  {
    id: 'coat_hoodie',
    name: 'Sudadera con Capucha',
    slot: 'coat',
    price: 280,
    description: 'Sudadera azul cómoda con capucha y cordones para la brisa del río.',
  },
  {
    id: 'coat_jacket_crimson',
    name: 'Chaqueta Cortavientos Roja',
    slot: 'coat',
    price: 420,
    description: 'Chaqueta deportiva impermeable roja con cuello alto y franja blanca.',
  },
  {
    id: 'pants_denim',
    name: 'Vaqueros Clásicos',
    slot: 'coat',
    price: 150,
    description: 'Pantalones vaqueros azules resistentes para cualquier jornada.',
  },
  {
    id: 'pants_white',
    name: 'Pantalones Blancos',
    slot: 'coat',
    price: 200,
    description: 'Pantalones blancos impecables de corte elegante.',
  },
  {
    id: 'pants_gold',
    name: 'Pantalones Dorados',
    slot: 'coat',
    price: 500,
    description: 'Pantalones dorados de competición con ribetes brillantes.',
  },
  {
    id: 'hat_cap_blue',
    name: 'Gorra Azul Marina',
    slot: 'hat',
    price: 180,
    description: 'Gorra azul marina con emblema dorado de pescador.',
  },
  {
    id: 'hat_beanie_wool',
    name: 'Gorro de Lana Invernal',
    slot: 'hat',
    price: 210,
    description: 'Gorro calentito de punto azul con pompón blanco.',
  },
  {
    id: 'hat_crown',
    name: 'Corona Real',
    slot: 'hat',
    price: 2500,
    description: 'Corona de oro macizo con rubíes para el rey del muelle.',
  },
  {
    id: 'glasses_pixel',
    name: 'Gafas Pixel VIP',
    slot: 'glasses',
    price: 480,
    description: 'Gafas cuadradas retro estilo arcade de campeón.',
  },
  {
    id: 'scarf_crimson',
    name: 'Bufanda Carmesí',
    slot: 'scarf',
    price: 240,
    description: 'Bufanda suave rojo carmesí tejida para el viento del muelle.',
  },
];

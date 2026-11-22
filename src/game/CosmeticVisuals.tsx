import React from 'react';
import { X } from 'lucide-react';
import { CosmeticItem } from './pokemonData';
import {
  Language,
  formatNumber,
  getCosmeticDescription,
  getCosmeticName,
} from './i18n';

export const CoinIcon: React.FC<{ size?: number; className?: string }> = ({
  size = 16,
  className = '',
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    className={`inline-block shrink-0 ${className}`}
    aria-hidden="true"
  >
    <circle cx="12" cy="12" r="10" fill="#facc15" stroke="#b45309" strokeWidth="2" />
    <circle cx="12" cy="12" r="7" fill="#fde047" stroke="#d97706" strokeWidth="1.2" />
    <rect x="10.75" y="7" width="2.5" height="10" rx="1.2" fill="#b45309" />
  </svg>
);

export type SkinCategory = 'all' | 'suits' | 'head' | 'outfit' | 'rods';

export const SUIT_IDS = ['suit_millionaire', 'suit_magma', 'suit_wizard'] as const;

export function getCosmeticCategory(id: string): Exclude<SkinCategory, 'all'> {
  if (
    id === 'suit_millionaire' ||
    id === 'suit_magma' ||
    id === 'suit_wizard'
  ) {
    return 'suits';
  }
  if (
    id === 'beard_fisher' ||
    id === 'hat_red' ||
    id === 'hat_cap_blue' ||
    id === 'hat_beanie_wool' ||
    id === 'hat_crown' ||
    id === 'glasses_cool' ||
    id === 'glasses_pixel' ||
    id === 'scarf_gold' ||
    id === 'scarf_crimson'
  ) {
    return 'head';
  }
  if (
    id === 'rod_carbon' ||
    id === 'rod_gold' ||
    id === 'rod_abyss' ||
    id === 'rod_cut' ||
    id === 'rod_og'
  ) {
    return 'rods';
  }
  return 'outfit';
}

export const SHIRT_COLORS: Record<string, { main: string; border: string; pocket: string }> = {
  shirt_blue: { main: '#0ea5e9', border: '#0369a1', pocket: '#38bdf8' },
  shirt_green: { main: '#16a34a', border: '#14532d', pocket: '#4ade80' },
  shirt_red: { main: '#ef4444', border: '#991b1b', pocket: '#f87171' },
  shirt_yellow: { main: '#eab308', border: '#854d0e', pocket: '#fef08a' },
  shirt_purple: { main: '#9333ea', border: '#581c87', pocket: '#c084fc' },
  shirt_orange: { main: '#f97316', border: '#9a3412', pocket: '#fdba74' },
  shirt_black: { main: '#1e293b', border: '#020617', pocket: '#475569' },
  shirt_cyan: { main: '#06b6d4', border: '#155e75', pocket: '#67e8f9' },
  shirt_pink: { main: '#ec4899', border: '#9d174d', pocket: '#f9a8d4' },
  shirt_emerald: { main: '#10b981', border: '#065f46', pocket: '#6ee7b7' },
  shirt_gold: { main: '#f59e0b', border: '#92400e', pocket: '#fde68a' },
};

export const PANTS_COLORS: Record<string, { main: string; border: string; pocket: string }> = {
  pants_cargo: { main: '#4d7c0f', border: '#365314', pocket: '#65a30d' },
  pants_black: { main: '#1e293b', border: '#020617', pocket: '#334155' },
  pants_red: { main: '#dc2626', border: '#7f1d1d', pocket: '#ef4444' },
  pants_khaki: { main: '#d6b88d', border: '#785a32', pocket: '#e7d3b3' },
  pants_purple: { main: '#7e22ce', border: '#4c1d95', pocket: '#9333ea' },
  pants_ice: { main: '#0284c7', border: '#0c4a6e', pocket: '#38bdf8' },
  pants_denim: { main: '#2563eb', border: '#1e3a8a', pocket: '#60a5fa' },
  pants_white: { main: '#f1f5f9', border: '#94a3b8', pocket: '#cbd5e1' },
  pants_gold: { main: '#d97706', border: '#78350f', pocket: '#facc15' },
};

export function getCosmeticEquipGroup(id: string): string | null {
  if (
    id === 'suit_millionaire' ||
    id === 'suit_magma' ||
    id === 'suit_wizard'
  ) {
    return 'suit';
  }
  if (
    id === 'coat_polar' ||
    id === 'coat_hoodie' ||
    id === 'coat_jacket_crimson' ||
    id in SHIRT_COLORS
  ) {
    return 'torso';
  }
  if (id in PANTS_COLORS) {
    return 'pants';
  }
  if (id === 'boots_tall' || id === 'height_tall') {
    return 'boots';
  }
  if (
    id === 'hat_red' ||
    id === 'hat_cap_blue' ||
    id === 'hat_beanie_wool' ||
    id === 'hat_crown'
  ) {
    return 'hat';
  }
  if (id === 'glasses_cool' || id === 'glasses_pixel') {
    return 'glasses';
  }
  if (id === 'scarf_gold' || id === 'scarf_crimson') {
    return 'scarf';
  }
  if (id === 'beard_fisher') {
    return 'beard';
  }
  if (
    id === 'rod_carbon' ||
    id === 'rod_gold' ||
    id === 'rod_abyss' ||
    id === 'rod_cut' ||
    id === 'rod_og'
  ) {
    return 'rod';
  }
  return null;
}

const SUIT_OVERRIDDEN_GROUPS = new Set([
  'suit',
  'torso',
  'pants',
  'boots',
  'hat',
  'glasses',
  'scarf',
  'beard',
]);

export function equipCosmeticWithRules(prev: string[], id: string): string[] {
  const group = getCosmeticEquipGroup(id);
  let base = prev;
  if (group === 'suit') {
    base = prev.filter((x) => {
      const xGroup = getCosmeticEquipGroup(x);
      return !xGroup || !SUIT_OVERRIDDEN_GROUPS.has(xGroup);
    });
  } else if (group && SUIT_OVERRIDDEN_GROUPS.has(group)) {
    base = prev.filter((x) => {
      const xGroup = getCosmeticEquipGroup(x);
      return xGroup !== group && xGroup !== 'suit';
    });
  } else if (group) {
    base = prev.filter((x) => getCosmeticEquipGroup(x) !== group);
  }
  return base.includes(id) ? base : [...base, id];
}

export const CosmeticItemDrawing: React.FC<{
  itemId: string;
  size?: number;
}> = ({ itemId, size = 56 }) => {
  const shirtStyle = SHIRT_COLORS[itemId];
  const pantsStyle = PANTS_COLORS[itemId];

  if (itemId === 'rod_carbon') {
    return (
      <div
        style={{ width: size, height: size }}
        className="rounded-xl bg-gradient-to-br from-[#061224] via-[#0f172a] to-[#1e293b] border-2 border-[#38bdf8] p-1 flex items-center justify-center shrink-0 overflow-hidden shadow-[inset_0_0_12px_rgba(56,189,248,0.28)]"
      >
        <svg viewBox="0 0 64 64" className="w-full h-full">
          {/* Tech grid & cyan glow */}
          <circle cx="32" cy="32" r="24" fill="#0284c7" opacity="0.14" />
          <line x1="9" y1="55" x2="54" y2="10" stroke="#38bdf8" strokeWidth="8.5" strokeLinecap="round" opacity="0.22" />
          {/* Split-grip EVA handle & butt cap */}
          <line x1="8" y1="56" x2="14" y2="50" stroke="#0f172a" strokeWidth="7.2" strokeLinecap="round" />
          <circle cx="8.5" cy="55.5" r="2.6" fill="#38bdf8" />
          <line x1="14" y1="50" x2="18" y2="46" stroke="#64748b" strokeWidth="4" strokeLinecap="round" />
          <line x1="18" y1="46" x2="25" y2="39" stroke="#1e293b" strokeWidth="6.8" strokeLinecap="round" />
          <line x1="18.5" y1="45.5" x2="24.5" y2="39.5" stroke="#38bdf8" strokeWidth="1.6" strokeDasharray="2 2.2" strokeLinecap="round" />
          {/* Woven carbon-fiber blank with cross-weave pattern */}
          <line x1="25" y1="39" x2="54" y2="10" stroke="#1e293b" strokeWidth="4.8" strokeLinecap="round" />
          <line x1="25" y1="39" x2="54" y2="10" stroke="#475569" strokeWidth="3.4" strokeLinecap="round" />
          <line x1="26" y1="38" x2="53" y2="11" stroke="#7dd3fc" strokeWidth="1.5" strokeDasharray="2.5 2.5" strokeLinecap="round" />
          {/* Ceramic SiC guide rings & stems */}
          <line x1="33" y1="31" x2="36" y2="33" stroke="#94a3b8" strokeWidth="1.4" />
          <circle cx="37.2" cy="34.2" r="2.2" fill="#0f172a" stroke="#38bdf8" strokeWidth="1.4" />
          <line x1="42" y1="22" x2="44.5" y2="24" stroke="#94a3b8" strokeWidth="1.3" />
          <circle cx="45.5" cy="25" r="1.9" fill="#0f172a" stroke="#38bdf8" strokeWidth="1.3" />
          <circle cx="54" cy="10" r="2" fill="#0f172a" stroke="#7dd3fc" strokeWidth="1.4" />
          {/* CNC Machined Spinning Reel + Crank Arm */}
          <line x1="22" y1="42" x2="26.5" y2="46.5" stroke="#94a3b8" strokeWidth="2.4" strokeLinecap="round" />
          <circle cx="27.5" cy="47.5" r="6.2" fill="#0f172a" stroke="#38bdf8" strokeWidth="2" />
          <circle cx="27.5" cy="47.5" r="3.8" fill="#1e293b" stroke="#7dd3fc" strokeWidth="1" />
          <circle cx="27.5" cy="47.5" r="1.7" fill="#38bdf8" />
          <path d="M27.5 47.5 L33 51 L35 48.5" stroke="#e2e8f0" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="35" cy="48.5" r="1.6" fill="#38bdf8" />
          {/* High-tensile braided cyan line & carbon jig */}
          <path d="M54 10 Q59 24 53 38" stroke="#7dd3fc" strokeWidth="1.6" fill="none" />
          <polygon points="53,36 49.5,43 53,46.5 56.5,43" fill="#0284c7" stroke="#e0f2fe" strokeWidth="1.2" />
          {/* Top-left CARBON badge */}
          <rect x="5" y="6" width="22" height="11" rx="3" fill="#0284c7" stroke="#bae6fd" strokeWidth="1" />
          <text x="16" y="14" textAnchor="middle" fill="#ffffff" fontSize="7.2" fontWeight="900" fontFamily="sans-serif">
            C-4S
          </text>
        </svg>
      </div>
    );
  }

  if (itemId === 'rod_gold') {
    return (
      <div
        style={{ width: size, height: size }}
        className="rounded-xl bg-gradient-to-br from-[#2a1205] via-[#451a03] to-[#78350f] border-2 border-[#facc15] p-1 flex items-center justify-center shrink-0 overflow-hidden shadow-[inset_0_0_14px_rgba(250,204,21,0.38)]"
      >
        <svg viewBox="0 0 64 64" className="w-full h-full">
          {/* Golden royal halo & shimmer */}
          <circle cx="32" cy="32" r="24" fill="#facc15" opacity="0.16" />
          <line x1="9" y1="55" x2="54" y2="10" stroke="#fde047" strokeWidth="9.5" strokeLinecap="round" opacity="0.3" />
          {/* Royal crimson-velvet & gold-filigree handle */}
          <line x1="8" y1="56" x2="14" y2="50" stroke="#991b1b" strokeWidth="7.4" strokeLinecap="round" />
          <circle cx="8.5" cy="55.5" r="2.8" fill="#fde047" stroke="#b45309" strokeWidth="1" />
          <line x1="14" y1="50" x2="25" y2="39" stroke="#7f1d1d" strokeWidth="6.8" strokeLinecap="round" />
          <line x1="14.5" y1="49.5" x2="24.5" y2="39.5" stroke="#fde047" strokeWidth="2.2" strokeDasharray="2.2 2.4" strokeLinecap="round" />
          {/* 24K Forged Gold Blank with central gleam */}
          <line x1="25" y1="39" x2="54" y2="10" stroke="#b45309" strokeWidth="5.2" strokeLinecap="round" />
          <line x1="25" y1="39" x2="54" y2="10" stroke="#facc15" strokeWidth="3.6" strokeLinecap="round" />
          <line x1="26" y1="38" x2="53" y2="11" stroke="#fef9c3" strokeWidth="1.4" strokeLinecap="round" />
          {/* Crowned gold guide rings */}
          <line x1="33" y1="31" x2="36" y2="33" stroke="#eab308" strokeWidth="1.5" />
          <circle cx="37.2" cy="34.2" r="2.3" fill="#451a03" stroke="#fef08a" strokeWidth="1.5" />
          <line x1="42" y1="22" x2="44.5" y2="24" stroke="#eab308" strokeWidth="1.4" />
          <circle cx="45.5" cy="25" r="2" fill="#451a03" stroke="#fef08a" strokeWidth="1.4" />
          <circle cx="54" cy="10" r="2.2" fill="#dc2626" stroke="#fef08a" strokeWidth="1.4" />
          {/* Imperial Gold & Ruby Reel + Crank */}
          <line x1="22" y1="42" x2="26.5" y2="46.5" stroke="#facc15" strokeWidth="2.6" strokeLinecap="round" />
          <circle cx="27.5" cy="47.5" r="6.5" fill="#eab308" stroke="#fef08a" strokeWidth="1.8" />
          <circle cx="27.5" cy="47.5" r="4.2" fill="#78350f" stroke="#facc15" strokeWidth="1" />
          <polygon points="27.5,44.7 30.3,47.5 27.5,50.3 24.7,47.5" fill="#ef4444" stroke="#fecaca" strokeWidth="0.8" />
          <path d="M27.5 47.5 L33.5 51.2 L35.5 48.5" stroke="#fef08a" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="35.5" cy="48.5" r="1.8" fill="#ef4444" stroke="#fef08a" strokeWidth="0.9" />
          {/* Golden silk line & ruby diamond lure */}
          <path d="M54 10 Q59 25 53 38" stroke="#fde047" strokeWidth="1.8" fill="none" />
          <polygon points="53,35 49,40.5 53,46 57,40.5" fill="#dc2626" stroke="#fef08a" strokeWidth="1.4" />
          {/* Sparkles & 24K Badge */}
          <path d="M41 8 L42.4 11.2 L45.6 12.6 L42.4 14 L41 17.2 L39.6 14 L36.4 12.6 L39.6 11.2 Z" fill="#fef08a" />
          <rect x="5" y="6" width="22" height="11" rx="3" fill="#eab308" stroke="#fef9c3" strokeWidth="1" />
          <text x="16" y="14" textAnchor="middle" fill="#451a03" fontSize="7.4" fontWeight="900" fontFamily="sans-serif">
            24K
          </text>
        </svg>
      </div>
    );
  }

  if (itemId === 'rod_og') {
    return (
      <div
        style={{ width: size, height: size }}
        className="rounded-xl bg-gradient-to-br from-[#2a0a04] via-[#7c2d12] to-[#1e1b4b] border-2 border-[#fb923c] p-1 flex items-center justify-center shrink-0 overflow-hidden shadow-[inset_0_0_14px_rgba(251,146,60,0.38)]"
      >
        <svg viewBox="0 0 64 64" className="w-full h-full">
          {/* Blaze-orange energy aura */}
          <circle cx="32" cy="32" r="24" fill="#f97316" opacity="0.16" />
          <line x1="9" y1="55" x2="54" y2="10" stroke="#fb923c" strokeWidth="9" strokeLinecap="round" opacity="0.32" />
          {/* Founder obsidian & blaze grip */}
          <line x1="8" y1="56" x2="14" y2="50" stroke="#1e1b4b" strokeWidth="7.4" strokeLinecap="round" />
          <circle cx="8.5" cy="55.5" r="2.8" fill="#f97316" stroke="#fed7aa" strokeWidth="1" />
          <line x1="14" y1="50" x2="25" y2="39" stroke="#431407" strokeWidth="6.8" strokeLinecap="round" />
          <line x1="14.5" y1="49.5" x2="24.5" y2="39.5" stroke="#fb923c" strokeWidth="2.1" strokeDasharray="2.2 2.2" strokeLinecap="round" />
          {/* OG Plasma-Orange Blank with glowing core */}
          <line x1="25" y1="39" x2="54" y2="10" stroke="#c2410c" strokeWidth="5.2" strokeLinecap="round" />
          <line x1="25" y1="39" x2="54" y2="10" stroke="#f97316" strokeWidth="3.6" strokeLinecap="round" />
          <line x1="26" y1="38" x2="53" y2="11" stroke="#ffedd5" strokeWidth="1.5" strokeLinecap="round" />
          {/* Neon-rimmed guide rings */}
          <line x1="33" y1="31" x2="36" y2="33" stroke="#fb923c" strokeWidth="1.5" />
          <circle cx="37.2" cy="34.2" r="2.3" fill="#1e1b4b" stroke="#fed7aa" strokeWidth="1.5" />
          <line x1="42" y1="22" x2="44.5" y2="24" stroke="#fb923c" strokeWidth="1.4" />
          <circle cx="45.5" cy="25" r="2" fill="#1e1b4b" stroke="#fed7aa" strokeWidth="1.4" />
          <circle cx="54" cy="10" r="2.2" fill="#f97316" stroke="#fff7ed" strokeWidth="1.4" />
          {/* OG High-Speed Turbo Reel + Crank */}
          <line x1="22" y1="42" x2="26.5" y2="46.5" stroke="#fdba74" strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="27.5" cy="47.5" r="6.4" fill="#ea580c" stroke="#ffedd5" strokeWidth="1.9" />
          <circle cx="27.5" cy="47.5" r="3.9" fill="#431407" stroke="#fb923c" strokeWidth="1" />
          <circle cx="27.5" cy="47.5" r="1.9" fill="#fde047" />
          <path d="M27.5 47.5 L33.5 51 L35.5 48.3" stroke="#ffedd5" strokeWidth="1.7" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="35.5" cy="48.3" r="1.7" fill="#f97316" stroke="#fff7ed" strokeWidth="0.9" />
          {/* Plasma line & founder ember lure */}
          <path d="M54 10 Q59 24 53 38" stroke="#fed7aa" strokeWidth="1.8" fill="none" />
          <circle cx="53" cy="40.5" r="3.8" fill="#f97316" stroke="#fff7ed" strokeWidth="1.4" />
          <circle cx="53" cy="40.5" r="1.5" fill="#fde047" />
          {/* Top-left OG Founder Crest */}
          <rect x="5" y="6" width="22" height="12" rx="3.5" fill="#ea580c" stroke="#fed7aa" strokeWidth="1.2" />
          <text
            x="16"
            y="14.6"
            textAnchor="middle"
            fill="#fff7ed"
            fontSize="8.2"
            fontWeight="900"
            fontFamily="sans-serif"
          >
            OG
          </text>
        </svg>
      </div>
    );
  }

  if (itemId === 'suit_millionaire') {
    return (
      <div
        style={{ width: size, height: size }}
        className="rounded-xl bg-gradient-to-br from-[#1e293b] via-[#0f172a] to-[#422006] border-2 border-[#facc15] p-1 flex items-center justify-center shrink-0 overflow-hidden shadow-inner"
      >
        <svg viewBox="0 0 64 64" className="w-full h-full">
          {/* Top Hat */}
          <rect x="20" y="6" width="24" height="14" rx="2" fill="#090d16" stroke="#facc15" strokeWidth="1.5" />
          <rect x="20" y="16" width="24" height="3.5" fill="#eab308" />
          <rect x="14" y="19" width="36" height="3.5" rx="1.5" fill="#0f172a" stroke="#facc15" strokeWidth="1.2" />
          {/* Luxury Head + Monocle */}
          <circle cx="32" cy="29" r="7" fill="#f5cfa0" />
          <circle cx="35" cy="28" r="2.8" fill="none" stroke="#facc15" strokeWidth="1.5" />
          <line x1="37.5" y1="30" x2="39" y2="36" stroke="#facc15" strokeWidth="1" />
          {/* Tuxedo */}
          <path d="M18 37 L46 37 L49 58 L15 58 Z" fill="#0f172a" stroke="#facc15" strokeWidth="1.6" />
          <polygon points="27,37 37,37 32,50" fill="#f8fafc" />
          <polygon points="28,39 32,41 36,39 32,37" fill="#eab308" />
          <circle cx="38" cy="43" r="1.8" fill="#38bdf8" />
          {/* Diamond Sparkles */}
          <path d="M11 12 L12.5 15 L15.5 16.5 L12.5 18 L11 21 L9.5 18 L6.5 16.5 L9.5 15 Z" fill="#fde047" />
          <path d="M53 26 L54 28.5 L56.5 29.5 L54 30.5 L53 33 L52 30.5 L49.5 29.5 L52 28.5 Z" fill="#fde047" />
        </svg>
      </div>
    );
  }

  if (itemId === 'suit_magma') {
    return (
      <div
        style={{ width: size, height: size }}
        className="rounded-xl bg-gradient-to-br from-[#450a0a] via-[#7c2d12] to-[#1c1917] border-2 border-[#f97316] p-1 flex items-center justify-center shrink-0 overflow-hidden shadow-inner"
      >
        <svg viewBox="0 0 64 64" className="w-full h-full">
          {/* Magma Horns */}
          <path d="M21 15 L14 6 L26 11 Z" fill="#f97316" stroke="#fde047" strokeWidth="1.2" />
          <path d="M43 15 L50 6 L38 11 Z" fill="#f97316" stroke="#fde047" strokeWidth="1.2" />
          {/* Volcanic Helmet */}
          <path d="M20 28 C20 14 44 14 44 28 Z" fill="#1c1917" stroke="#f97316" strokeWidth="1.8" />
          <rect x="24" y="21" width="16" height="4" rx="1.5" fill="#fde047" />
          {/* Obsidian Armor */}
          <path d="M13 33 L21 29 L43 29 L51 33 L47 57 L17 57 Z" fill="#292524" stroke="#ea580c" strokeWidth="2" />
          {/* Glowing Lava Cracks & Core */}
          <polygon points="32,34 37,41 32,48 27,41" fill="#facc15" stroke="#ef4444" strokeWidth="1.4" />
          <path d="M18 39 L26 42 M46 39 L38 42 M23 52 L32 48 L41 52" stroke="#f97316" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </div>
    );
  }

  if (itemId === 'suit_wizard') {
    return (
      <div
        style={{ width: size, height: size }}
        className="rounded-xl bg-gradient-to-br from-[#1e1b4b] via-[#312e81] to-[#4c1d95] border-2 border-[#a855f7] p-1 flex items-center justify-center shrink-0 overflow-hidden shadow-inner"
      >
        <svg viewBox="0 0 64 64" className="w-full h-full">
          {/* Wizard Hat */}
          <path d="M32 6 L43 23 L21 23 Z" fill="#4338ca" stroke="#c084fc" strokeWidth="1.5" strokeLinejoin="round" />
          <rect x="21" y="19" width="22" height="3.5" fill="#facc15" />
          <ellipse cx="32" cy="23" rx="16" ry="3.5" fill="#3730a3" stroke="#c084fc" strokeWidth="1.3" />
          {/* Starry Robe */}
          <path d="M22 29 L13 56 L47 56 L39 29 Z" fill="#312e81" stroke="#818cf8" strokeWidth="1.8" strokeLinejoin="round" />
          <path d="M29 29 L32 56" stroke="#facc15" strokeWidth="2" />
          {/* Magic Wand */}
          <line x1="42" y1="47" x2="55" y2="21" stroke="#92400e" strokeWidth="3.5" strokeLinecap="round" />
          <circle cx="56" cy="19" r="4.5" fill="#38bdf8" stroke="#fef08a" strokeWidth="1.6" />
          <path d="M56 10 L57.5 14 L61.5 15.5 L57.5 17 L56 21 L54.5 17 L50.5 15.5 L54.5 14 Z" fill="#fde047" opacity="0.9" />
          <circle cx="24" cy="40" r="1.5" fill="#fde047" />
          <circle cx="37" cy="47" r="1.5" fill="#38bdf8" />
        </svg>
      </div>
    );
  }

  return (
    <div
      style={{ width: size, height: size }}
      className="rounded-xl bg-gradient-to-br from-[#f0f9ff] to-[#e2e8f0] border border-[#cbd5e1] p-1 flex items-center justify-center shrink-0 shadow-inner"
    >
      <svg viewBox="0 0 64 64" className="w-full h-full">
        {itemId === 'beard_fisher' && (
          <g>
            <path
              d="M14 22 C14 16 20 14 24 18 Q32 24 40 18 C44 14 50 16 50 22 C52 38 44 54 32 56 C20 54 12 38 14 22 Z"
              fill="#78350f"
              stroke="#451a03"
              strokeWidth="2.5"
            />
            <path
              d="M20 26 Q32 32 44 26"
              stroke="#92400e"
              strokeWidth="3"
              fill="none"
              strokeLinecap="round"
            />
            <path
              d="M25 36 Q32 46 39 36"
              stroke="#451a03"
              strokeWidth="2"
              fill="none"
              strokeLinecap="round"
            />
            <ellipse cx="32" cy="24" rx="8" ry="3.5" fill="#fca5a5" opacity="0.55" />
          </g>
        )}

        {itemId === 'hat_red' && (
          <g>
            <path
              d="M12 38 C12 20 22 14 33 14 C44 14 52 22 52 38 Z"
              fill="#dc2626"
              stroke="#7f1d1d"
              strokeWidth="2.5"
            />
            <path
              d="M10 38 Q34 34 58 42 Q46 47 10 42 Z"
              fill="#b91c1c"
              stroke="#7f1d1d"
              strokeWidth="2.2"
            />
            <circle cx="32" cy="13" r="3" fill="#fef08a" stroke="#7f1d1d" strokeWidth="1.5" />
            <circle cx="32" cy="26" r="6" fill="#ffffff" />
            <path d="M26 26 L38 26" stroke="#dc2626" strokeWidth="2" />
          </g>
        )}

        {itemId === 'hat_cap_blue' && (
          <g>
            <path
              d="M12 38 C12 20 22 14 33 14 C44 14 52 22 52 38 Z"
              fill="#1d4ed8"
              stroke="#1e3a8a"
              strokeWidth="2.5"
            />
            <path
              d="M10 38 Q34 34 58 42 Q46 47 10 42 Z"
              fill="#1e40af"
              stroke="#1e3a8a"
              strokeWidth="2.2"
            />
            <circle cx="32" cy="26" r="5" fill="#facc15" />
          </g>
        )}

        {itemId === 'hat_beanie_wool' && (
          <g>
            <circle cx="32" cy="13" r="6" fill="#f8fafc" stroke="#94a3b8" strokeWidth="1.8" />
            <path
              d="M14 42 C14 20 22 16 32 16 C42 16 50 20 50 42 Z"
              fill="#0284c7"
              stroke="#0c4a6e"
              strokeWidth="2.4"
            />
            <rect x="11" y="38" width="42" height="11" rx="4" fill="#38bdf8" stroke="#0c4a6e" strokeWidth="2.2" />
            <line x1="21" y1="39" x2="21" y2="48" stroke="#0284c7" strokeWidth="2" />
            <line x1="32" y1="39" x2="32" y2="48" stroke="#0284c7" strokeWidth="2" />
            <line x1="43" y1="39" x2="43" y2="48" stroke="#0284c7" strokeWidth="2" />
          </g>
        )}

        {itemId === 'hat_crown' && (
          <g>
            <path
              d="M10 46 L14 20 L24 31 L32 14 L40 31 L50 20 L54 46 Z"
              fill="#facc15"
              stroke="#92400e"
              strokeWidth="2.4"
              strokeLinejoin="round"
            />
            <rect x="10" y="42" width="44" height="7" rx="2" fill="#eab308" stroke="#92400e" strokeWidth="2" />
            <circle cx="32" cy="34" r="3.5" fill="#dc2626" />
            <circle cx="20" cy="37" r="2.4" fill="#0284c7" />
            <circle cx="44" cy="37" r="2.4" fill="#0284c7" />
          </g>
        )}

        {itemId === 'scarf_gold' && (
          <g>
            <path
              d="M36 28 L46 52 L36 55 L28 32 Z"
              fill="#eab308"
              stroke="#854d0e"
              strokeWidth="2.2"
              strokeLinejoin="round"
            />
            <path
              d="M22 28 L16 50 L26 53 L32 30 Z"
              fill="#facc15"
              stroke="#854d0e"
              strokeWidth="2.2"
              strokeLinejoin="round"
            />
            <rect
              x="12"
              y="16"
              width="40"
              height="16"
              rx="8"
              fill="#fde047"
              stroke="#854d0e"
              strokeWidth="2.5"
            />
            <line x1="20" y1="18" x2="20" y2="30" stroke="#ca8a04" strokeWidth="2" />
            <line x1="32" y1="18" x2="32" y2="30" stroke="#ca8a04" strokeWidth="2" />
            <line x1="44" y1="18" x2="44" y2="30" stroke="#ca8a04" strokeWidth="2" />
          </g>
        )}

        {itemId === 'scarf_crimson' && (
          <g>
            <path
              d="M36 28 L46 52 L36 55 L28 32 Z"
              fill="#b91c1c"
              stroke="#7f1d1d"
              strokeWidth="2.2"
              strokeLinejoin="round"
            />
            <path
              d="M22 28 L16 50 L26 53 L32 30 Z"
              fill="#dc2626"
              stroke="#7f1d1d"
              strokeWidth="2.2"
              strokeLinejoin="round"
            />
            <rect
              x="12"
              y="16"
              width="40"
              height="16"
              rx="8"
              fill="#ef4444"
              stroke="#7f1d1d"
              strokeWidth="2.5"
            />
            <line x1="20" y1="18" x2="20" y2="30" stroke="#fecaca" strokeWidth="2" />
            <line x1="44" y1="18" x2="44" y2="30" stroke="#fecaca" strokeWidth="2" />
          </g>
        )}

        {itemId === 'glasses_cool' && (
          <g>
            <line x1="8" y1="28" x2="14" y2="24" stroke="#0f172a" strokeWidth="3" strokeLinecap="round" />
            <line x1="56" y1="28" x2="50" y2="24" stroke="#0f172a" strokeWidth="3" strokeLinecap="round" />
            <rect x="10" y="24" width="19" height="14" rx="4" fill="#0f172a" stroke="#334155" strokeWidth="2" />
            <rect x="35" y="24" width="19" height="14" rx="4" fill="#0f172a" stroke="#334155" strokeWidth="2" />
            <rect x="29" y="27" width="6" height="3" fill="#0f172a" />
            <line x1="14" y1="28" x2="22" y2="34" stroke="#38bdf8" strokeWidth="2.5" strokeLinecap="round" />
            <line x1="39" y1="28" x2="47" y2="34" stroke="#38bdf8" strokeWidth="2.5" strokeLinecap="round" />
          </g>
        )}

        {itemId === 'glasses_pixel' && (
          <g>
            <rect x="8" y="24" width="21" height="13" fill="#0f172a" />
            <rect x="35" y="24" width="21" height="13" fill="#0f172a" />
            <rect x="29" y="26" width="6" height="4" fill="#0f172a" />
            <rect x="12" y="27" width="4" height="4" fill="#facc15" />
            <rect x="16" y="31" width="4" height="3" fill="#fde047" />
            <rect x="39" y="27" width="4" height="4" fill="#facc15" />
            <rect x="43" y="31" width="4" height="3" fill="#fde047" />
          </g>
        )}

        {itemId === 'coat_polar' && (
          <g>
            <path
              d="M20 14 L10 24 L14 42 L20 40 L20 54 L44 54 L44 40 L50 42 L54 24 L44 14 Z"
              fill="#0284c7"
              stroke="#0c4a6e"
              strokeWidth="2.4"
              strokeLinejoin="round"
            />
            <path d="M23 12 Q32 20 41 12 L43 18 Q32 25 21 18 Z" fill="#f8fafc" stroke="#94a3b8" strokeWidth="1.5" />
            <line x1="32" y1="22" x2="32" y2="54" stroke="#bae6fd" strokeWidth="2.5" />
            <rect x="22" y="37" width="7" height="8" rx="1.5" fill="#0369a1" />
            <rect x="35" y="37" width="7" height="8" rx="1.5" fill="#0369a1" />
          </g>
        )}

        {itemId === 'coat_hoodie' && (
          <g>
            <path
              d="M21 15 L10 25 L14 39 L20 37 L20 53 L44 53 L44 37 L50 39 L54 25 L43 15 Z"
              fill="#2563eb"
              stroke="#1e3a8a"
              strokeWidth="2.4"
              strokeLinejoin="round"
            />
            <path d="M22 14 Q32 24 42 14 Q38 8 32 8 Q26 8 22 14 Z" fill="#1d4ed8" stroke="#1e3a8a" strokeWidth="1.8" />
            <line x1="29" y1="20" x2="29" y2="30" stroke="#e2e8f0" strokeWidth="1.8" strokeLinecap="round" />
            <line x1="35" y1="20" x2="35" y2="30" stroke="#e2e8f0" strokeWidth="1.8" strokeLinecap="round" />
            <rect x="23" y="37" width="18" height="10" rx="3" fill="#1d4ed8" />
          </g>
        )}

        {itemId === 'coat_jacket_crimson' && (
          <g>
            <path
              d="M20 14 L9 24 L13 40 L20 38 L20 54 L44 54 L44 38 L51 40 L55 24 L44 14 Z"
              fill="#dc2626"
              stroke="#7f1d1d"
              strokeWidth="2.4"
              strokeLinejoin="round"
            />
            <rect x="20" y="30" width="24" height="5" fill="#f8fafc" />
            <line x1="32" y1="16" x2="32" y2="54" stroke="#991b1b" strokeWidth="2.2" />
            <rect x="24" y="11" width="16" height="6" rx="2" fill="#991b1b" />
          </g>
        )}

        {shirtStyle && (
          <g>
            <path
              d="M21 15 L9 24 L14 35 L20 32 L20 52 L44 52 L44 32 L50 35 L55 24 L43 15 Q32 22 21 15 Z"
              fill={shirtStyle.main}
              stroke={shirtStyle.border}
              strokeWidth="2.4"
              strokeLinejoin="round"
            />
            <rect
              x="34"
              y="27"
              width="6"
              height="7"
              rx="1"
              fill={shirtStyle.pocket}
              stroke={shirtStyle.border}
              strokeWidth="1.4"
            />
          </g>
        )}

        {pantsStyle && (
          <g>
            <path
              d="M17 12 L47 12 L50 53 L36 53 L32 30 L28 53 L14 53 Z"
              fill={pantsStyle.main}
              stroke={pantsStyle.border}
              strokeWidth="2.4"
              strokeLinejoin="round"
            />
            <rect x="17" y="12" width="30" height="5" fill="#78350f" />
            <rect
              x="15"
              y="27"
              width="8"
              height="10"
              rx="1.5"
              fill={pantsStyle.pocket}
              stroke={pantsStyle.border}
              strokeWidth="1.5"
            />
            <rect
              x="41"
              y="27"
              width="8"
              height="10"
              rx="1.5"
              fill={pantsStyle.pocket}
              stroke={pantsStyle.border}
              strokeWidth="1.5"
            />
          </g>
        )}

        {itemId === 'boots_tall' && (
          <g>
            <path
              d="M15 12 L27 12 L27 42 L35 44 L35 52 L14 52 Z"
              fill="#78350f"
              stroke="#451a03"
              strokeWidth="2.2"
              strokeLinejoin="round"
            />
            <path
              d="M36 16 L47 16 L47 42 L54 44 L54 52 L35 52 Z"
              fill="#92400e"
              stroke="#451a03"
              strokeWidth="2.2"
              strokeLinejoin="round"
            />
            <rect x="14" y="48" width="21" height="4" rx="1" fill="#1e293b" />
            <rect x="35" y="48" width="19" height="4" rx="1" fill="#1e293b" />
            <rect x="16" y="20" width="10" height="3" fill="#facc15" />
          </g>
        )}

        {itemId === 'height_tall' && (
          <g>
            <path
              d="M14 22 L26 22 L26 42 L35 44 L35 53 L13 53 Z"
              fill="#1e3a5f"
              stroke="#0f172a"
              strokeWidth="2.2"
              strokeLinejoin="round"
            />
            <rect x="13" y="47" width="22" height="6" rx="1.5" fill="#eab308" stroke="#713f12" strokeWidth="1.5" />
            <path
              d="M46 44 L46 16 M46 16 L39 24 M46 16 L53 24"
              stroke="#0284c7"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          </g>
        )}
      </svg>
    </div>
  );
};

export const AnglerSkinPreview: React.FC<{
  cosmetics: string[];
  world?: 'river' | 'underworld';
  size?: 'sm' | 'md' | 'lg';
}> = ({ cosmetics, world = 'river', size = 'md' }) => {
  const has = (id: string) => cosmetics.includes(id);
  const isMillionaire = has('suit_millionaire');
  const isMagma = has('suit_magma');
  const isWizard = has('suit_wizard');

  const isTall = !isMillionaire && !isMagma && !isWizard && (has('height_tall') || has('boots_tall'));
  const groundY = 92;
  const bootHeight = !isMillionaire && !isMagma && !isWizard && has('boots_tall') ? 11 : 8;
  const bootY = groundY - bootHeight;
  const tallLift = isTall ? 5 : 0;
  const shiftY = 12 - tallLift;
  const pantsTop = 54 + shiftY;
  const legHeight = Math.max(12, bootY + 3 - pantsTop);
  const equippedPantsId = cosmetics.find((id) => id in PANTS_COLORS);
  const equippedShirtId = cosmetics.find((id) => id in SHIRT_COLORS);
  const pantsStyle = equippedPantsId ? PANTS_COLORS[equippedPantsId] : null;

  const pantsColor = isMillionaire
    ? '#0f172a'
    : isMagma
      ? '#1c1917'
      : isWizard
        ? '#1e1b4b'
        : pantsStyle
          ? pantsStyle.main
          : '#1e3a5f';

  const torsoColor = isMillionaire
    ? '#0f172a'
    : isMagma
      ? '#292524'
      : isWizard
        ? '#312e81'
        : has('coat_polar')
          ? '#0284c7'
          : has('coat_hoodie')
            ? '#2563eb'
            : has('coat_jacket_crimson')
              ? '#dc2626'
              : equippedShirtId
                ? SHIRT_COLORS[equippedShirtId].main
                : '#a16207';

  const skinColor = isMagma ? '#451a03' : '#f5cfa0';
  const svgW = size === 'lg' ? 112 : size === 'sm' ? 42 : 88;
  const svgH = size === 'lg' ? 132 : size === 'sm' ? 50 : 106;

  return (
    <svg width={svgW} height={svgH} viewBox="0 0 88 102" className="shrink-0 drop-shadow-sm">
      {/* Ground Aura / Contact Shadow directly beneath boot soles */}
      {isMillionaire && (
        <g>
          <ellipse cx="41.5" cy={groundY} rx="28" ry="7" fill="rgba(250, 204, 21, 0.42)" />
          <ellipse cx="41.5" cy={groundY} rx="20" ry="4" fill="rgba(253, 224, 71, 0.55)" />
        </g>
      )}
      {isMagma && (
        <g>
          <ellipse cx="41.5" cy={groundY} rx="28" ry="7" fill="rgba(249, 115, 22, 0.45)" />
          <ellipse cx="41.5" cy={groundY} rx="20" ry="4" fill="rgba(239, 68, 68, 0.55)" />
        </g>
      )}
      {isWizard && (
        <g>
          <ellipse cx="41.5" cy={groundY} rx="28" ry="7" fill="rgba(168, 85, 247, 0.42)" />
          <ellipse cx="41.5" cy={groundY} rx="20" ry="4" fill="rgba(56, 189, 248, 0.55)" />
        </g>
      )}
      <ellipse cx="41.5" cy={groundY} rx="20" ry="4.5" fill="rgba(15, 23, 42, 0.24)" />
      <ellipse cx="34" cy={groundY} rx="7" ry="2.2" fill="rgba(15, 23, 42, 0.32)" />
      <ellipse cx="49" cy={groundY} rx="7" ry="2.2" fill="rgba(15, 23, 42, 0.32)" />

      {/* Suit-Specific Floating Effect Particles & Auras in Preview */}
      {isMillionaire && (
        <g>
          <path d="M18 42 L20 45 L23 46 L20 47 L18 50 L16 47 L13 46 L16 45 Z" fill="#fde047" />
          <path d="M68 32 L69.5 35 L72.5 36 L69.5 37 L68 40 L66.5 37 L63.5 36 L66.5 35 Z" fill="#fde047" />
          <circle cx="24" cy="22" r="2.5" fill="#facc15" opacity="0.8" />
          <circle cx="64" cy="62" r="2" fill="#facc15" opacity="0.8" />
        </g>
      )}
      {isMagma && (
        <g>
          <circle cx="22" cy="54" r="3" fill="#f97316" opacity="0.85" />
          <circle cx="66" cy="46" r="2.5" fill="#ef4444" opacity="0.85" />
          <circle cx="28" cy="26" r="2" fill="#fde047" opacity="0.9" />
          <circle cx="60" cy="70" r="3.2" fill="#f97316" opacity="0.8" />
        </g>
      )}
      {isWizard && (
        <g>
          <circle cx="20" cy="40" r="2.8" fill="#38bdf8" opacity="0.85" />
          <circle cx="68" cy="38" r="3" fill="#c084fc" opacity="0.85" />
          <circle cx="26" cy="68" r="2.2" fill="#fde047" opacity="0.9" />
          <circle cx="62" cy="62" r="2.6" fill="#38bdf8" opacity="0.8" />
          <path d="M72 16 L73 19 L76 20 L73 21 L72 24 L71 21 L68 20 L71 19 Z" fill="#fde047" />
        </g>
      )}

      {/* Legs / Pants */}
      <rect x="30" y={pantsTop} width="9" height={legHeight} rx="3" fill={pantsColor} />
      <rect x="44" y={pantsTop} width="9" height={legHeight} rx="3" fill={pantsColor} />
      {isMillionaire && (
        <>
          <line x1="31.5" y1={pantsTop + 1} x2="31.5" y2={bootY + 1} stroke="#facc15" strokeWidth="1.4" />
          <line x1="51.5" y1={pantsTop + 1} x2="51.5" y2={bootY + 1} stroke="#facc15" strokeWidth="1.4" />
        </>
      )}
      {isMagma && (
        <>
          <line x1="34" y1={pantsTop + 2} x2="34" y2={bootY} stroke="#f97316" strokeWidth="1.5" />
          <line x1="49" y1={pantsTop + 2} x2="49" y2={bootY} stroke="#f97316" strokeWidth="1.5" />
        </>
      )}
      {!isMillionaire && !isMagma && !isWizard && pantsStyle && (
        <>
          <rect x="29" y={pantsTop + 6} width="4" height="6" rx="1" fill={pantsStyle.pocket} />
          <rect x="50" y={pantsTop + 6} width="4" height="6" rx="1" fill={pantsStyle.pocket} />
        </>
      )}

      {/* Boots resting directly on groundY */}
      <rect
        x="28"
        y={bootY}
        width="12"
        height={bootHeight}
        rx="2.5"
        fill={isMillionaire ? '#090d16' : isMagma ? '#ea580c' : isWizard ? '#4c1d95' : has('boots_tall') ? '#78350f' : '#451a03'}
      />
      <rect
        x="43"
        y={bootY}
        width="12"
        height={bootHeight}
        rx="2.5"
        fill={isMillionaire ? '#090d16' : isMagma ? '#ea580c' : isWizard ? '#4c1d95' : has('boots_tall') ? '#78350f' : '#451a03'}
      />
      {!isMillionaire && !isMagma && !isWizard && has('height_tall') && (
        <>
          <rect x="28" y={bootY + bootHeight - 3} width="12" height="3" rx="1" fill="#eab308" />
          <rect x="43" y={bootY + bootHeight - 3} width="12" height="3" rx="1" fill="#eab308" />
        </>
      )}

      <g transform={`translate(0, ${shiftY})`}>
      {/* Torso / Outfit */}
      {isWizard ? (
        <g>
          <path d="M27 30 L56 30 L60 68 L23 68 Z" fill="#312e81" stroke="#818cf8" strokeWidth="1.2" />
          <line x1="41.5" y1="30" x2="41.5" y2="68" stroke="#facc15" strokeWidth="2.2" />
          <rect x="25" y="49" width="33" height="4" rx="1.5" fill="#facc15" />
          <circle cx="33" cy="40" r="1.4" fill="#fde047" />
          <circle cx="50" cy="58" r="1.4" fill="#38bdf8" />
        </g>
      ) : (
        <rect x="26" y="30" width="31" height="27" rx="7" fill={torsoColor} />
      )}

      {isMillionaire && (
        <g>
          <polygon points="36,30 47,30 41.5,45" fill="#f8fafc" />
          <polygon points="38,32 41.5,34 45,32 41.5,30" fill="#eab308" />
          <rect x="26" y="30" width="31" height="27" rx="7" fill="none" stroke="#facc15" strokeWidth="1.3" />
          <circle cx="49" cy="39" r="2" fill="#38bdf8" />
        </g>
      )}

      {isMagma && (
        <g>
          <polygon points="41.5,34 47,42 41.5,50 36,42" fill="#facc15" stroke="#ef4444" strokeWidth="1.3" />
          <path d="M28 38 L36 42 M55 38 L47 42" stroke="#f97316" strokeWidth="2" strokeLinecap="round" />
        </g>
      )}

      {!isMillionaire && !isMagma && !isWizard && has('coat_polar') && (
        <>
          <path d="M31 30 Q41.5 36 52 30" stroke="#f8fafc" strokeWidth="3.5" fill="none" strokeLinecap="round" />
          <line x1="41.5" y1="33" x2="41.5" y2="57" stroke="#bae6fd" strokeWidth="2" />
        </>
      )}

      {!isMillionaire && !isMagma && !isWizard && has('coat_hoodie') && (
        <>
          <path d="M32 30 Q41.5 36 51 30" stroke="#1d4ed8" strokeWidth="3" fill="none" />
          <line x1="38" y1="33" x2="38" y2="41" stroke="#e2e8f0" strokeWidth="1.5" />
          <line x1="45" y1="33" x2="45" y2="41" stroke="#e2e8f0" strokeWidth="1.5" />
        </>
      )}

      {!isMillionaire && !isMagma && !isWizard && has('coat_jacket_crimson') && (
        <>
          <rect x="26" y="42" width="31" height="4" fill="#f8fafc" />
          <line x1="41.5" y1="30" x2="41.5" y2="57" stroke="#7f1d1d" strokeWidth="1.8" />
        </>
      )}

      {/* Scarves */}
      {!isMillionaire && !isMagma && !isWizard && has('scarf_gold') && (
        <g>
          <rect x="29" y="28" width="25" height="6" rx="3" fill="#facc15" stroke="#854d0e" strokeWidth="1.2" />
          <path d="M44 33 L49 46 L43 47 L39 34 Z" fill="#eab308" stroke="#854d0e" strokeWidth="1" />
        </g>
      )}
      {!isMillionaire && !isMagma && !isWizard && has('scarf_crimson') && (
        <g>
          <rect x="29" y="28" width="25" height="6" rx="3" fill="#ef4444" stroke="#7f1d1d" strokeWidth="1.2" />
          <path d="M44 33 L49 46 L43 47 L39 34 Z" fill="#dc2626" stroke="#7f1d1d" strokeWidth="1" />
        </g>
      )}

      {/* Head */}
      <circle cx="41.5" cy="19" r="11" fill={skinColor} />
      {isMagma && (
        <>
          <circle cx="41.5" cy="19" r="11" fill="#1c1917" stroke="#f97316" strokeWidth="1.5" />
          <rect x="35" y="16" width="13" height="3.5" rx="1.5" fill="#fde047" />
          <ellipse cx="38.2" cy="17.7" rx="1.05" ry="1.3" fill="#1c1917" />
          <ellipse cx="44.8" cy="17.7" rx="1.05" ry="1.3" fill="#1c1917" />
        </>
      )}

      {/* Beard */}
      {(isWizard || (!isMillionaire && !isMagma && has('beard_fisher'))) && (
        <path
          d="M32 22 Q41.5 35 51 22 Z"
          fill={isWizard ? '#e2e8f0' : '#78350f'}
        />
      )}

      {/* Stickman Eyes & Smile */}
      {!isMagma && (isMillionaire || isWizard || (!has('glasses_cool') && !has('glasses_pixel'))) && (
        <g>
          <ellipse cx="38" cy="17.6" rx="1.25" ry="1.85" fill="#0f172a" />
          <ellipse cx="45.2" cy="17.6" rx="1.25" ry="1.85" fill="#0f172a" />
        </g>
      )}
      <path
        d="M 38.6 23.2 Q 41.6 25.6 44.6 23.2"
        fill="none"
        stroke={
          isMagma
            ? '#fde047'
            : has('beard_fisher') && !isMillionaire && !isWizard
              ? '#2a1205'
              : '#1e1b4b'
        }
        strokeWidth="1.3"
        strokeLinecap="round"
      />

      {/* Glasses / Monocle */}
      {isMillionaire && (
        <g>
          <circle cx="45.4" cy="17.5" r="3.4" fill="rgba(56,189,248,0.24)" stroke="#facc15" strokeWidth="1.4" />
          <line x1="48.5" y1="20" x2="49.8" y2="27" stroke="#facc15" strokeWidth="1" />
        </g>
      )}
      {!isMillionaire && !isMagma && !isWizard && has('glasses_cool') && (
        <g>
          <rect x="33" y="15.5" width="7" height="4.5" rx="1.2" fill="#0f172a" />
          <rect x="43" y="15.5" width="7" height="4.5" rx="1.2" fill="#0f172a" />
          <line x1="40" y1="17.5" x2="43" y2="17.5" stroke="#0f172a" strokeWidth="1.5" />
        </g>
      )}
      {!isMillionaire && !isMagma && !isWizard && has('glasses_pixel') && (
        <g>
          <rect x="32.5" y="15" width="7.5" height="5" fill="#0f172a" />
          <rect x="43" y="15" width="7.5" height="5" fill="#0f172a" />
          <rect x="40" y="16" width="3" height="2" fill="#0f172a" />
          <rect x="34" y="16" width="2.2" height="2.2" fill="#facc15" />
          <rect x="44.5" y="16" width="2.2" height="2.2" fill="#facc15" />
        </g>
      )}

      {/* Hats */}
      {isMillionaire ? (
        <g>
          <rect x="31" y="1" width="21" height="12" rx="1.5" fill="#090d16" stroke="#facc15" strokeWidth="1" />
          <rect x="31" y="10" width="21" height="2.5" fill="#eab308" />
          <rect x="25" y="12.5" width="33" height="3.2" rx="1.5" fill="#0f172a" stroke="#facc15" strokeWidth="1" />
        </g>
      ) : isMagma ? (
        <g>
          <path d="M33 10 L27 2 L37 8 Z" fill="#f97316" stroke="#fde047" strokeWidth="1" />
          <path d="M50 10 L56 2 L46 8 Z" fill="#f97316" stroke="#fde047" strokeWidth="1" />
        </g>
      ) : isWizard ? (
        <g>
          <path d="M41.5 -2 L52 13 L31 13 Z" fill="#4338ca" stroke="#c084fc" strokeWidth="1.1" />
          <rect x="32" y="10" width="19" height="2.5" fill="#facc15" />
          <ellipse cx="41.5" cy="13.5" rx="15.5" ry="2.8" fill="#3730a3" stroke="#c084fc" strokeWidth="1" />
        </g>
      ) : has('hat_crown') ? (
        <g>
          <path
            d="M29 14 L31 4 L36.5 9 L41.5 2 L46.5 9 L52 4 L54 14 Z"
            fill="#facc15"
            stroke="#92400e"
            strokeWidth="1.2"
            strokeLinejoin="round"
          />
          <circle cx="41.5" cy="10" r="1.6" fill="#dc2626" />
        </g>
      ) : has('hat_beanie_wool') ? (
        <g>
          <circle cx="41.5" cy="4.5" r="3.2" fill="#f8fafc" stroke="#94a3b8" strokeWidth="1" />
          <path d="M30 14 Q41.5 4 53 14 Z" fill="#0284c7" />
          <rect x="29" y="11.5" width="25" height="4" rx="2" fill="#38bdf8" stroke="#0c4a6e" strokeWidth="1" />
        </g>
      ) : (
        <g>
          <path
            d="M29.5 14 Q41.5 3 53.5 14 Z"
            fill={has('hat_red') ? '#dc2626' : has('hat_cap_blue') ? '#1d4ed8' : '#57534e'}
          />
          <rect
            x="26"
            y="13"
            width="31"
            height="3.2"
            rx="1.5"
            fill={has('hat_red') ? '#b91c1c' : has('hat_cap_blue') ? '#1e3a8a' : '#44403c'}
          />
        </g>
      )}

      {world === 'underworld' && !isMagma && (
        <>
          <path d="M33 7 Q28 0 35 4" fill="#fde047" stroke="#713f12" strokeWidth="1" />
          <path d="M50 7 Q55 0 48 4" fill="#fde047" stroke="#713f12" strokeWidth="1" />
        </>
      )}

      {/* Arm */}
      <line
        x1="50"
        y1="38"
        x2="60"
        y2="34"
        stroke={torsoColor}
        strokeWidth="5"
        strokeLinecap="round"
      />
      <circle cx="60.5" cy="33.5" r="3.2" fill={skinColor} />

      {/* Custom Staff / Wand / Fishing Rod */}
      {isWizard ? (
        <g>
          <line x1="59" y1="35" x2="77" y2="15" stroke="#92400e" strokeWidth="3.2" strokeLinecap="round" />
          <circle cx="78" cy="14" r="4" fill="#38bdf8" stroke="#fde047" strokeWidth="1.4" />
          <path
            d="M78 6 L79.3 10.5 L83.8 11.8 L79.3 13.1 L78 17.6 L76.7 13.1 L72.2 11.8 L76.7 10.5 Z"
            fill="#fef08a"
          />
          <circle cx="71" cy="24" r="1.5" fill="#c084fc" />
          <circle cx="83" cy="21" r="1.4" fill="#38bdf8" />
        </g>
      ) : isMillionaire ? (
        <g>
          {/* Floating Golden Diamond Briefcase / Luxury Currency Staff */}
          <line x1="59" y1="35" x2="77" y2="15" stroke="#d97706" strokeWidth="3.5" strokeLinecap="round" />
          <rect x="73" y="10" width="10" height="8" rx="2" fill="#facc15" stroke="#78350f" strokeWidth="1.2" />
          <path d="M76 10 L76.5 7.5 Q78 6 79.5 7.5 L80 10" fill="none" stroke="#78350f" strokeWidth="1.2" />
          <circle cx="78" cy="14" r="2.2" fill="#38bdf8" />
          <circle cx="70" cy="22" r="1.6" fill="#fde047" />
          <circle cx="82" cy="19" r="1.5" fill="#38bdf8" />
        </g>
      ) : isMagma ? (
        <g>
          {/* No rod — Pyrokinesis Telekinesis Glowing Hand Aura */}
          <circle cx="61.5" cy="33.5" r="6" fill="#f97316" opacity="0.85" />
          <circle cx="62" cy="33" r="3" fill="#fde047" />
          <circle cx="68" cy="27" r="2" fill="#ef4444" opacity="0.9" />
          <circle cx="56" cy="38" r="1.8" fill="#facc15" opacity="0.9" />
        </g>
      ) : (
        <>
          {has('rod_og') && (
            <line
              x1="59"
              y1="35"
              x2="82"
              y2="6"
              stroke="#fb923c"
              strokeWidth="6.8"
              strokeLinecap="round"
              opacity="0.35"
            />
          )}
          {has('rod_gold') && !has('rod_og') && (
            <line
              x1="59"
              y1="35"
              x2="82"
              y2="6"
              stroke="#fde047"
              strokeWidth="6.4"
              strokeLinecap="round"
              opacity="0.34"
            />
          )}
          {has('rod_carbon') && !has('rod_gold') && !has('rod_og') && (
            <line
              x1="59"
              y1="35"
              x2="82"
              y2="6"
              stroke="#38bdf8"
              strokeWidth="6"
              strokeLinecap="round"
              opacity="0.22"
            />
          )}
          {/* Rod Blank */}
          <line
            x1="59"
            y1="35"
            x2="82"
            y2="6"
            stroke={
              has('rod_og')
                ? '#f97316'
                : has('rod_gold')
                  ? '#facc15'
                  : has('rod_carbon')
                    ? '#1e293b'
                    : '#1e293b'
            }
            strokeWidth={has('rod_og') || has('rod_gold') || has('rod_carbon') ? '3.8' : '2.8'}
            strokeLinecap="round"
          />
          {has('rod_og') && (
            <>
              <line x1="60" y1="34" x2="81" y2="7" stroke="#ffedd5" strokeWidth="1.2" strokeLinecap="round" />
              <circle cx="63" cy="31.5" r="2.9" fill="#ea580c" stroke="#ffedd5" strokeWidth="1.1" />
              <circle cx="63" cy="31.5" r="1.1" fill="#fde047" />
              <circle cx="71" cy="20" r="1.4" fill="none" stroke="#fed7aa" strokeWidth="1" />
              <circle cx="77" cy="12.5" r="1.2" fill="none" stroke="#fed7aa" strokeWidth="1" />
            </>
          )}
          {has('rod_gold') && !has('rod_og') && (
            <>
              <line x1="60" y1="34" x2="81" y2="7" stroke="#fef9c3" strokeWidth="1.2" strokeLinecap="round" />
              <circle cx="63" cy="31.5" r="2.9" fill="#eab308" stroke="#fef08a" strokeWidth="1.1" />
              <circle cx="63" cy="31.5" r="1.1" fill="#dc2626" />
              <circle cx="71" cy="20" r="1.4" fill="none" stroke="#fef08a" strokeWidth="1" />
              <circle cx="77" cy="12.5" r="1.2" fill="none" stroke="#fef08a" strokeWidth="1" />
            </>
          )}
          {has('rod_carbon') && !has('rod_gold') && !has('rod_og') && (
            <>
              <line
                x1="61"
                y1="32.5"
                x2="80"
                y2="8.5"
                stroke="#38bdf8"
                strokeWidth="1.4"
                strokeDasharray="2.2 2.2"
                strokeLinecap="round"
              />
              <circle cx="63" cy="31.5" r="2.8" fill="#0f172a" stroke="#38bdf8" strokeWidth="1.1" />
              <circle cx="63" cy="31.5" r="1" fill="#7dd3fc" />
              <circle cx="71" cy="20" r="1.3" fill="none" stroke="#38bdf8" strokeWidth="1" />
              <circle cx="77" cy="12.5" r="1.1" fill="none" stroke="#38bdf8" strokeWidth="1" />
            </>
          )}
        </>
      )}
      </g>
    </svg>
  );
};

export interface SkinStudioModalProps {
  coins: number;
  username: string;
  world: 'river' | 'underworld';
  catalog: CosmeticItem[];
  ownedCosmetics: string[];
  equippedCosmetics: string[];
  initialTab: 'wardrobe' | 'shop';
  previewCosmeticId: string | null;
  lang?: Language;
  onSetPreviewCosmeticId: (id: string | null) => void;
  onBuyOrToggle: (id: string, price: number) => void;
  onResetAll: () => void;
  onClose: () => void;
}

export const SkinStudioModal: React.FC<SkinStudioModalProps> = ({
  coins,
  username,
  world,
  catalog,
  ownedCosmetics,
  equippedCosmetics,
  initialTab,
  previewCosmeticId,
  lang = 'en',
  onSetPreviewCosmeticId,
  onBuyOrToggle,
  onResetAll,
  onClose,
}) => {
  const [tab, setTab] = React.useState<'wardrobe' | 'shop'>(initialTab);
  const [category, setCategory] = React.useState<SkinCategory>('all');
  const [searchQuery, setSearchQuery] = React.useState<string>('');

  React.useEffect(() => {
    setTab(initialTab);
  }, [initialTab]);

  // Compute live preview list with smart slot & full-suit replacement
  const previewCosmetics = React.useMemo(() => {
    if (!previewCosmeticId) return equippedCosmetics;
    return equipCosmeticWithRules(equippedCosmetics, previewCosmeticId);
  }, [equippedCosmetics, previewCosmeticId]);

  const previewItem = previewCosmeticId
    ? catalog.find((c) => c.id === previewCosmeticId) ?? null
    : null;

  // Rods belong exclusively to the dedicated Rods & Baits shop stall, not the clothing market
  const shopItems = catalog.filter((item) => getCosmeticCategory(item.id) !== 'rods');
  const wardrobeItems = catalog.filter(
    (item) => ownedCosmetics.includes(item.id) && getCosmeticCategory(item.id) !== 'rods'
  );
  const normalizedQuery = searchQuery.trim().toLowerCase();
  const activeList = (tab === 'wardrobe' ? wardrobeItems : shopItems).filter((item) => {
    const matchesCat = category === 'all' || getCosmeticCategory(item.id) === category;
    if (!matchesCat) return false;
    if (!normalizedQuery) return true;
    const locName = getCosmeticName(item.id, lang, item.name).toLowerCase();
    const locDesc = getCosmeticDescription(item.id, lang, item.description).toLowerCase();
    return (
      locName.includes(normalizedQuery) ||
      locDesc.includes(normalizedQuery) ||
      item.name.toLowerCase().includes(normalizedQuery) ||
      item.description.toLowerCase().includes(normalizedQuery)
    );
  });

  const activeSuit = catalog.find(
    (c) => getCosmeticCategory(c.id) === 'suits' && previewCosmetics.includes(c.id)
  );

  const categoryTabs: { id: SkinCategory; label: string }[] = [
    { id: 'all', label: lang === 'en' ? 'All' : 'Todo' },
    { id: 'suits', label: lang === 'en' ? 'Suits' : 'Trajes' },
    { id: 'head', label: lang === 'en' ? 'Head' : 'Cabeza' },
    { id: 'outfit', label: lang === 'en' ? 'Clothing & Boots' : 'Ropa y Botas' },
  ];

  return (
    <div className="fixed inset-0 bg-[#0f2942]/55 backdrop-blur-[2px] flex items-center justify-center p-3 sm:p-4 z-30 animate-ui-backdrop">
      <div className="w-full max-w-3xl h-[88vh] max-h-[88vh] rounded-2xl bg-[#f8fafc] border-2 border-[#cbd5e1] shadow-2xl flex flex-col overflow-hidden animate-ui-modal-in">
        {/* Cabecera fija */}
        <div className="shrink-0 px-5 pt-4 pb-3 border-b border-[#e2e8f0] bg-white flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="font-display font-extrabold text-xl text-[#0f2942] leading-tight">
                {lang === 'en' ? 'Locker & Style Shop' : 'Taquilla y Tienda de Estilo'}
              </h2>
              <p className="text-[11px] font-semibold text-[#64748b]">
                {lang === 'en'
                  ? 'Full suits, colorful outfits, hats, and special rods'
                  : 'Trajes completos, ropa de colores, sombreros y cañas especiales'}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="px-2.5 py-1 rounded-lg bg-[#fef3c7] border border-[#fcd34d] text-[#92400e] text-xs font-extrabold tabular-nums inline-flex items-center gap-1.5">
                <CoinIcon size={14} />
                <span>{formatNumber(coins, lang)}</span>
              </span>
              <button
                type="button"
                onClick={() => {
                  onSetPreviewCosmeticId(null);
                  onClose();
                }}
                aria-label={lang === 'en' ? 'Close locker' : 'Cerrar taquilla'}
                className="p-2 rounded-xl hover:bg-[#e2e8f0] text-[#475569] cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Pestañas Vestidor vs Tienda */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              data-testid="skin-tab-wardrobe"
              onClick={() => {
                setTab('wardrobe');
                onSetPreviewCosmeticId(null);
              }}
              className={`py-2 px-3 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                tab === 'wardrobe'
                  ? 'bg-[#7e22ce] text-white shadow-sm'
                  : 'bg-[#e2e8f0] text-[#475569] hover:bg-[#cbd5e1]'
              }`}
            >
              👕 {lang === 'en' ? 'My Locker' : 'Mi Taquilla'} ({ownedCosmetics.length})
            </button>
            <button
              type="button"
              data-testid="skin-tab-shop"
              onClick={() => setTab('shop')}
              className={`py-2 px-3 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                tab === 'shop'
                  ? 'bg-[#0284c7] text-white shadow-sm'
                  : 'bg-[#e2e8f0] text-[#475569] hover:bg-[#cbd5e1]'
              }`}
            >
              🛍️ {lang === 'en' ? 'Shop' : 'Tienda'} ({shopItems.length})
            </button>
          </div>
        </div>

        {/* Estudio de 2 columnas en escritorio / apilado en móvil */}
        <div className="flex-1 min-h-0 flex flex-col md:flex-row overflow-hidden">
          {/* Columna izquierda: Maniquí en vivo */}
          <aside className="shrink-0 md:w-64 p-4 bg-gradient-to-b from-[#dbeafe]/80 via-[#f0f9ff] to-[#f8fafc] border-b md:border-b-0 md:border-r border-[#cbd5e1] flex md:flex-col items-center justify-between md:justify-start gap-3">
            <div className={`rounded-2xl border px-4 py-3 flex items-center justify-center shadow-inner ${
              world === 'underworld'
                ? 'bg-gradient-to-b from-[#2b0909] via-[#450a0a] to-[#1a0505] border-[#ef4444]/40'
                : 'bg-gradient-to-b from-[#0f2942] via-[#1e3a5f] to-[#0c1e35] border-[#38bdf8]/40'
            }`}>
              <AnglerSkinPreview cosmetics={previewCosmetics} world={world} size="lg" />
            </div>

            <div className="flex flex-col gap-1.5 min-w-0 flex-1 md:w-full">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-extrabold uppercase tracking-wider text-[#0369a1] truncate">
                  {username}
                </span>
                {equippedCosmetics.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      onSetPreviewCosmeticId(null);
                      onResetAll();
                    }}
                    className="px-2 py-0.5 rounded-md bg-white hover:bg-[#fee2e2] border border-[#cbd5e1] hover:border-[#fca5a5] text-[10px] font-bold text-[#475569] hover:text-[#b91c1c] cursor-pointer shrink-0"
                  >
                    {lang === 'en' ? 'Unequip all' : 'Quitar todo'}
                  </button>
                )}
              </div>

              <span className="text-xs font-semibold text-[#334155]">
                {activeSuit
                  ? `${lang === 'en' ? 'Active suit:' : 'Traje activo:'} ${getCosmeticName(activeSuit.id, lang, activeSuit.name)}`
                  : equippedCosmetics.length === 0
                    ? lang === 'en'
                      ? 'Classic angler look'
                      : 'Aspecto clásico de pescador'
                    : lang === 'en'
                      ? `${equippedCosmetics.length} item${equippedCosmetics.length === 1 ? '' : 's'} equipped`
                      : `${equippedCosmetics.length} prenda(s) equipada(s)`}
              </span>

              {previewCosmetics.includes('suit_wizard') && (
                <p className="text-[11px] font-bold text-[#6d28d9] bg-[#f3e8ff] border border-[#d8b4fe] rounded-lg px-2 py-1">
                  {lang === 'en'
                    ? 'Magic wand active: fish with spells without casting a hook.'
                    : 'Varita mágica activa: pesca con hechizos sin lanzar anzuelo.'}
                </p>
              )}

              {previewItem && (
                <div className="mt-0.5 flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg bg-[#fef9c3] border border-[#facc15]">
                  <span className="text-[11px] font-bold text-[#854d0e] truncate">
                    {lang === 'en' ? 'Previewing:' : 'Probando:'}{' '}
                    {getCosmeticName(previewItem.id, lang, previewItem.name)}
                  </span>
                  <button
                    type="button"
                    onClick={() => onSetPreviewCosmeticId(null)}
                    className="text-[10px] font-extrabold text-[#a16207] hover:underline cursor-pointer shrink-0"
                  >
                    {lang === 'en' ? 'Clear' : 'Quitar'}
                  </button>
                </div>
              )}
            </div>
          </aside>

          {/* Columna derecha: Filtros y lista desplazable */}
          <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
            <div className="shrink-0 px-4 pt-3 pb-2.5 bg-[#f8fafc] border-b border-[#e2e8f0] flex flex-col gap-2">
              <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
                {categoryTabs.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    data-testid={`skin-cat-${cat.id}`}
                    onClick={() => setCategory(cat.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                      category === cat.id
                        ? 'bg-[#0f2942] text-white'
                        : 'bg-[#e2e8f0] text-[#475569] hover:bg-[#cbd5e1]'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={
                  lang === 'en'
                    ? 'Search suit, shirt, hat, or rod...'
                    : 'Buscar traje, camiseta, gorro o caña...'
                }
                className="w-full px-3 py-1.5 rounded-lg bg-white border border-[#cbd5e1] text-xs font-medium text-[#0f2942] placeholder:text-[#94a3b8] focus:outline-none focus:border-[#0284c7]"
              />
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 flex flex-col gap-2.5">
              {activeList.length === 0 ? (
                <div className="py-10 px-4 rounded-xl bg-white border border-dashed border-[#cbd5e1] text-center flex flex-col items-center gap-2.5">
                  <p className="text-xs text-[#64748b] font-medium">
                    {tab === 'wardrobe'
                      ? lang === 'en'
                        ? "You don't own any items in this category yet."
                        : 'Todavía no tienes objetos en esta categoría.'
                      : lang === 'en'
                        ? 'No items match your search.'
                        : 'No hay objetos que coincidan con tu búsqueda.'}
                  </p>
                  {tab === 'wardrobe' && (
                    <button
                      type="button"
                      onClick={() => setTab('shop')}
                      className="px-4 py-2 rounded-xl bg-[#0284c7] hover:bg-[#0369a1] text-white text-xs font-extrabold cursor-pointer"
                    >
                      {lang === 'en' ? 'Go to Shop' : 'Ir a la Tienda'}
                    </button>
                  )}
                </div>
              ) : (
                activeList.map((item) => {
                  const owned = ownedCosmetics.includes(item.id);
                  const equipped = equippedCosmetics.includes(item.id);
                  const canAfford = coins >= item.price;
                  const isPreviewing = previewCosmeticId === item.id;
                  const isSuit = getCosmeticCategory(item.id) === 'suits';
                  const itemName = getCosmeticName(item.id, lang, item.name);
                  const itemDesc = getCosmeticDescription(item.id, lang, item.description);

                  return (
                    <div
                      key={item.id}
                      data-testid={`cosmetic-card-${item.id}`}
                      className={`flex items-center justify-between p-2.5 rounded-xl border gap-3 transition-colors ${
                        equipped
                          ? 'border-[#0284c7] bg-[#f0f9ff]'
                          : isPreviewing
                            ? 'border-[#eab308] bg-[#fefce8]'
                            : isSuit
                              ? 'border-[#cbd5e1] bg-gradient-to-r from-[#fffbeb]/60 via-white to-white'
                              : 'border-[#e2e8f0] bg-white'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <CosmeticItemDrawing itemId={item.id} size={56} />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-sm text-[#0f2942] truncate">
                              {itemName}
                            </span>
                            {isSuit && (
                              <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#b45309]">
                                · {lang === 'en' ? 'Full Suit' : 'Traje Completo'}
                              </span>
                            )}
                            {equipped && (
                              <span className="px-1.5 py-0.5 rounded bg-[#bae6fd] text-[#0369a1] text-[10px] font-extrabold shrink-0">
                                {lang === 'en' ? 'Equipped' : 'Puesto'}
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-[#64748b] line-clamp-2 mt-0.5">
                            {itemDesc}
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1.5 shrink-0">
                        {!owned && (
                          <button
                            type="button"
                            onClick={() =>
                              onSetPreviewCosmeticId(isPreviewing ? null : item.id)
                            }
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer border ${
                              isPreviewing
                                ? 'bg-[#fef08a] border-[#eab308] text-[#713f12]'
                                : 'bg-[#f8fafc] hover:bg-[#e2e8f0] border-[#cbd5e1] text-[#475569]'
                            }`}
                          >
                            {isPreviewing
                              ? lang === 'en'
                                ? 'Previewing'
                                : 'Probando'
                              : lang === 'en'
                                ? 'Preview'
                                : 'Probar'}
                          </button>
                        )}
                        <button
                          type="button"
                          disabled={!owned && !canAfford}
                          onClick={() => {
                            if (!owned && isPreviewing) {
                              onSetPreviewCosmeticId(null);
                            }
                            onBuyOrToggle(item.id, item.price);
                          }}
                          className={`px-3.5 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap cursor-pointer tabular-nums ${
                            equipped
                              ? 'bg-[#0284c7] hover:bg-[#0369a1] text-white'
                              : owned
                                ? 'bg-[#7e22ce] hover:bg-[#6b21a8] text-white'
                                : canAfford
                                  ? 'bg-[#1e3a5f] hover:bg-[#162d4a] text-white'
                                  : 'bg-[#f1f5f9] text-[#94a3b8] cursor-not-allowed'
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
                              <CoinIcon size={13} />
                              <span>{formatNumber(item.price, lang)}</span>
                            </span>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

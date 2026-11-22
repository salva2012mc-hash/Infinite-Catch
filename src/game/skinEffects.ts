/**
 * ============================================================================
 * SISTEMA DE EFECTOS VISUALES PARA SKINS ESPECIALES (MAGMA, MILLONARIA, MAGO)
 * ============================================================================
 * Arquitectura optimizada a 60 FPS para móvil y PC:
 *  - Object Pooling preasignado (sin creación de objetos por frame).
 *  - Límites dinámicos de partículas según calidad gráfica (low / normal / rtx)
 *    y tamaño de pantalla (móvil vs escritorio).
 *  - Separación estricta en 4 capas de renderizado:
 *      1. Capa de Fondo (niebla, distorsión térmica, charco de lava, portal, círculos mágicos)
 *      2. Capa de Partículas (brasas, humo, vapor, monedas/billetes con rebote, rocas, polvo estelar)
 *      3. Capa de Brillo (mezcla aditiva 'lighter', halos, esfera de energía, ondas expansivas)
 *      4. Capa de Destello (estrellas de 4 puntas, flashes de picada, rayos críticos, contador animado)
 */

import { FishingPhase } from './fishingLogic';
import { CaughtPokemon, Rarity } from './pokemonData';
import { formatNumber, Language } from './i18n';

export type ActiveSkinId = 'none' | 'suit_magma' | 'suit_millionaire' | 'suit_wizard';
export type VfxGraphicsQuality = 'low' | 'normal' | 'rtx';

// ----------------------------------------------------------------------------
// CONSTANTES CONFIGURABLES (Colores, cantidades, duración, intensidad)
// ----------------------------------------------------------------------------

export const SKIN_VFX_CONFIG = {
  /** Tamaño máximo fijo de los pools preasignados (cero basura en memoria) */
  POOL_PARTICLES_MAX: 260,
  POOL_RINGS_MAX: 24,

  /** Multiplicadores de presupuesto para mantener 60 FPS en móvil y PC */
  QUALITY_SCALE: {
    low: 0.45,
    normal: 0.85,
    rtx: 1.15,
  } as Record<VfxGraphicsQuality, number>,
  MOBILE_BREAKPOINT_PX: 640,
  MOBILE_BUDGET_SCALE: 0.68,

  /** Configuración SKIN 1: MAGMA */
  MAGMA: {
    PALETTE: {
      volcanicBlack: '#0c0a09',
      basaltDark: '#1c1917',
      lavaRed: '#dc2626',
      crimsonGlow: '#ef4444',
      incandescentOrange: '#f97316',
      amberBright: '#fb923c',
      lavaCoreYellow: '#fde047',
      smokeDark: 'rgba(28, 25, 23, 0.55)',
      steamGray: 'rgba(226, 232, 240, 0.52)',
    },
    IDLE_EMBER_RATE: 14, // brasas por segundo alrededor del personaje y agua
    IDLE_SMOKE_RATE: 4.5, // volutas de humo ligero por segundo
    HEAT_HAZE_BANDS: 5, // bandas de distorsión térmica
    CAST_FIRE_TRAIL_RATE: 42, // estela de fuego al lanzar
    WATER_STEAM_BURST: 14, // vapor al caer al agua
    WATER_BOIL_BUBBLE_RATE: 11, // burbujas hirviendo en espera/picada
    BITE_INTENSITY_MULT: 1.75, // intensificación de lava y temblor rojo al picar
    ERUPTION_LAVA_BURST: 36, // gotas de lava en "Erupción Volcánica"
    ERUPTION_ROCK_BURST: 12, // rocas ardientes en "Erupción Volcánica"
    ERUPTION_DURATION_SEC: 2.8, // duración del charco de lava enfriándose
    SHAKE_DURATION_SEC: 0.62, // duración del screen shake al capturar
    SHAKE_AMPLITUDE_PX: 13, // intensidad máxima del screen shake
  },

  /** Configuración SKIN 2: LA MILLONARIA */
  MILLIONAIRE: {
    PALETTE: {
      goldDark: '#92400e',
      goldMid: '#eab308',
      goldBright: '#facc15',
      goldHighlight: '#fef08a',
      pearlWhite: '#f8fafc',
      elegantBlack: '#090d16',
      diamondBlue: '#38bdf8',
      diamondIce: '#e0f2fe',
      billEmerald: '#10b981',
      billMint: '#a7f3d0',
    },
    IDLE_SPARKLE_RATE: 9, // destellos diamante (4 puntas) por segundo
    IDLE_AMBIENT_WEALTH_RATE: 5.2, // monedas y billetes flotando alrededor
    METALLIC_SHEEN_SPEED: 0.72, // velocidad del reflejo metálico en la caña
    CAST_CONFETTI_RATE: 34, // estela dorada y confeti de lujo al lanzar
    WATER_GOLD_SPARK_BURST: 16,
    FORTUNE_RAIN_COINS: 30, // lluvia inicial de monedas con rebote
    FORTUNE_RAIN_BILLS: 16, // billetes planeando y rebotando
    COIN_GRAVITY_PX: 680,
    COIN_BOUNCE_RESTITUTION: 0.48,
    COUNTER_DURATION_SEC: 1.25, // duración de subida del contador de dinero
    JACKPOT_CHANCE: 0.24, // probabilidad de "Jackpot" con explosión de diamantes
    JACKPOT_DIAMOND_BURST: 26,
  },

  /** Configuración SKIN 3: MAGO */
  WIZARD: {
    PALETTE: {
      deepBlue: '#0f172a',
      royalIndigo: '#312e81',
      arcaneViolet: '#8b5cf6',
      neonPurple: '#c084fc',
      brightCyan: '#22d3ee',
      etherealWhite: '#ecfeff',
      starGold: '#fde047',
      mistPurple: 'rgba(139, 92, 246, 0.18)',
    },
    ORBITING_RUNES_COUNT: 5, // runas brillantes que orbitan y se encienden en secuencia
    IDLE_STARDUST_RATE: 11, // polvo de estrellas continuo
    IDLE_FIREFLY_RATE: 4.5, // luciérnagas arcanas
    CAST_SPIRAL_RATE: 40, // estela arcana en espiral
    PORTAL_OPEN_DURATION_SEC: 2.6, // duración total del "Portal Arcano"
    RECOMPOSE_START_SEC: 1.05, // instante en que el pez se desintegra hacia el inventario
    RECOMPOSE_PARTICLES: 34, // partículas de polvo de estrellas que viajan al inventario
    CRITICAL_SPELL_RARITIES: new Set<Rarity>([
      'Rara',
      'Épica',
      'Mítica',
      'Legendaria',
      'Secreto',
      'Secreto Abisal',
    ]),
  },
} as const;

// ----------------------------------------------------------------------------
// LISTA DE SONIDOS SUGERIDOS PARA CADA EFECTO (solo descripción)
// ----------------------------------------------------------------------------

export const SKIN_SUGGESTED_SOUNDS = {
  MAGMA: {
    idle: 'Burbujas lentas de magma espeso con un zumbido térmico grave de fondo.',
    cast: 'Silbido ardiente tipo antorcha agitada que corta el aire con chisporroteo.',
    waterHit: 'Choque térmico intenso: siseo agudo de vapor presurizado + burbujeo hirviente.',
    bite: 'Crujido volcánico seco seguido de un pulso grave palpitante de alerta roja.',
    catchEruption:
      'Explosión volcánica profunda (sub-bass impact), chorro de lava ascendente y rocas chocando.',
    lavaCool: 'Siseo suave decreciente de roca incandescente solidificándose al enfriarse.',
  },
  MILLIONAIRE: {
    idle: 'Tintineo cristalino muy sutil de monedas metálicas y destellos suaves de arpa.',
    cast: 'Barrido dorado elegante (glissando ascendente) acompañado de chasquido de seda/confeti.',
    waterHit: 'Salpicadura cristalina con eco metálico agudo como si cayeran monedas al agua.',
    bite: 'Destello sonoro dorado + timbre clásico de caja registradora ("cha-ching").',
    catchFortuneRain:
      'Cascada alegre de monedas rebotando sobre madera + contador rápido de ticks ascendentes.',
    jackpot:
      'Fanfarria triunfal de metales brillantes con explosión cristalina de diamantes y campana.',
  },
  WIZARD: {
    idle: 'Resonancia etérea de cristal flotante con campanillas arcanas suaves y susurro cósmico.',
    cast: 'Vórtice mágico giratorio (whoosh filtrado ascendente) con chispas cristalinas.',
    waterHit: 'Acorde místico reverberante al abrirse el círculo de runas sobre la superficie.',
    bite: 'Destello agudo de cristal resonante + pulso rápido de runas activándose en secuencia.',
    catchArcanePortal:
      'Apertura grave de portal dimensional + polvo estelar viajando y recompone con chime al llegar.',
    criticalSpell:
      'Descarga eléctrica arcana fulminante (trueno cristalino) para peces Raros o superiores.',
  },
} as const;

// ----------------------------------------------------------------------------
// FUNCIONES DE EASING Y UTILIDADES MATEMÁTICAS
// ----------------------------------------------------------------------------

export function clamp01(t: number): number {
  return t < 0 ? 0 : t > 1 ? 1 : t;
}

export function easeOutCubic(t: number): number {
  const x = clamp01(t);
  return 1 - Math.pow(1 - x, 3);
}

export function easeInOutSine(t: number): number {
  const x = clamp01(t);
  return -(Math.cos(Math.PI * x) - 1) / 2;
}

export function easeOutBack(t: number): number {
  const x = clamp01(t);
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
}

function hashUid01(uid: string): number {
  let h = 2166136261;
  for (let i = 0; i < uid.length; i++) {
    h ^= uid.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 1000) / 1000;
}

// ----------------------------------------------------------------------------
// TIPOS INTERNOS DEL POOL DE PARTÍCULAS Y ANILLOS
// ----------------------------------------------------------------------------

type ParticleKind =
  | 'ember' // Brasa naranja ascendente
  | 'smoke' // Humo oscuro ligero
  | 'steam' // Vapor al tocar el agua (Magma)
  | 'boil_bubble' // Burbuja de lava hirviendo
  | 'lava_blob' // Gota de magma en erupción
  | 'volcanic_rock' // Roca ardiente giratoria
  | 'diamond_star' // Destello de 4 puntas (Millonaria)
  | 'coin' // Moneda dorada giratoria / con rebote
  | 'bill' // Billete elegante flotando / cayendo
  | 'confetti' // Confeti de lujo al lanzar
  | 'diamond_gem' // Diamante explosivo de Jackpot
  | 'stardust' // Polvo de estrellas (Mago)
  | 'firefly' // Luciérnaga arcana
  | 'recompose_mote'; // Partícula que viaja al inventario

interface SkinParticle {
  active: boolean;
  kind: ParticleKind;
  layer: 'particle' | 'glow' | 'flash';
  x: number;
  y: number;
  vx: number;
  vy: number;
  ax: number;
  ay: number;
  size: number;
  rotation: number;
  vRot: number;
  spinPhase: number;
  spinSpeed: number;
  life: number;
  maxLife: number;
  alpha: number;
  color: string;
  secondaryColor: string;
  bouncesLeft: number;
  floorY: number;
  targetX: number;
  targetY: number;
  startX: number;
  startY: number;
}

type RingKind = 'lava_ring' | 'gold_ripple' | 'magic_circle' | 'heat_shockwave';

interface SkinRingEffect {
  active: boolean;
  kind: RingKind;
  x: number;
  y: number;
  life: number;
  maxLife: number;
  startRx: number;
  endRx: number;
  lineWidth: number;
  color: string;
  secondaryColor: string;
  rotation: number;
}

export interface SkinFrameState {
  skin: ActiveSkinId;
  phase: FishingPhase;
  elapsed: number;
  width: number;
  height: number;
  charX: number;
  charY: number;
  rodBaseX: number;
  rodBaseY: number;
  rodTipX: number;
  rodTipY: number;
  holeX: number;
  holeY: number;
  projectileX: number | null;
  projectileY: number | null;
  quality: VfxGraphicsQuality;
  isPaused: boolean;
  pendingRarity?: Rarity;
  caughtFish?: CaughtPokemon | null;
  revealElapsed: number;
  inBuildup: boolean;
  lang: Language;
}

export interface CatchVisualTransform {
  offsetX: number;
  offsetY: number;
  scale: number;
  rotation: number;
  alpha: number;
  goldOverlayAlpha: number;
  hideOriginalForDisintegration: boolean;
}

// ----------------------------------------------------------------------------
// HELPERS DE DIBUJO VECTORIAL OPTIMIZADO (sin asignaciones)
// ----------------------------------------------------------------------------

function drawFourPointStar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  rotation: number
) {
  const inner = radius * 0.24;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);
  ctx.beginPath();
  ctx.moveTo(0, -radius);
  ctx.quadraticCurveTo(inner, -inner, radius, 0);
  ctx.quadraticCurveTo(inner, inner, 0, radius);
  ctx.quadraticCurveTo(-inner, inner, -radius, 0);
  ctx.quadraticCurveTo(-inner, -inner, 0, -radius);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawSpinningCoin(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  spinAngle: number,
  mainColor: string,
  shineColor: string
) {
  const scaleX = Math.max(0.18, Math.abs(Math.cos(spinAngle)));
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scaleX, 1);
  ctx.fillStyle = mainColor;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#92400e';
  ctx.lineWidth = 1.2;
  ctx.stroke();

  ctx.fillStyle = shineColor;
  ctx.beginPath();
  ctx.arc(-r * 0.22, -r * 0.22, r * 0.45, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawBanknote(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  rotation: number,
  flutterAngle: number
) {
  const w = size * 1.9;
  const h = size * 0.95;
  const scaleY = 0.45 + 0.55 * Math.abs(Math.cos(flutterAngle));
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);
  ctx.scale(1, scaleY);
  ctx.fillStyle = '#10b981';
  ctx.strokeStyle = '#ecfdf5';
  ctx.lineWidth = 1.1;
  ctx.fillRect(-w * 0.5, -h * 0.5, w, h);
  ctx.strokeRect(-w * 0.5, -h * 0.5, w, h);
  ctx.fillStyle = '#fef08a';
  ctx.beginPath();
  ctx.arc(0, 0, h * 0.26, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawVolcanicRock(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  rotation: number
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);
  ctx.fillStyle = '#1c1917';
  ctx.strokeStyle = '#f97316';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(-size, -size * 0.35);
  ctx.lineTo(-size * 0.25, -size * 0.95);
  ctx.lineTo(size * 0.78, -size * 0.55);
  ctx.lineTo(size, size * 0.32);
  ctx.lineTo(size * 0.15, size * 0.92);
  ctx.lineTo(-size * 0.75, size * 0.58);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Grieta incandescente interior
  ctx.strokeStyle = '#fde047';
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  ctx.moveTo(-size * 0.45, -size * 0.15);
  ctx.lineTo(size * 0.08, size * 0.12);
  ctx.lineTo(size * 0.42, -size * 0.2);
  ctx.stroke();
  ctx.restore();
}

function drawDiamondGem(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  rotation: number
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);
  ctx.fillStyle = '#e0f2fe';
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  ctx.moveTo(0, -size);
  ctx.lineTo(size * 0.78, -size * 0.15);
  ctx.lineTo(0, size);
  ctx.lineTo(-size * 0.78, -size * 0.15);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(0, -size * 0.75);
  ctx.lineTo(size * 0.35, -size * 0.15);
  ctx.lineTo(0, size * 0.25);
  ctx.lineTo(-size * 0.35, -size * 0.15);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawArcaneRune(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  variant: number,
  color: string,
  alpha: number
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.7;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  const v = variant % 4;
  if (v === 0) {
    // Runa angular tipo Ansuz/Fehu
    ctx.moveTo(-size * 0.35, size * 0.7);
    ctx.lineTo(-size * 0.35, -size * 0.7);
    ctx.lineTo(size * 0.45, -size * 0.25);
    ctx.moveTo(-size * 0.35, 0);
    ctx.lineTo(size * 0.4, size * 0.35);
  } else if (v === 1) {
    // Runa rombo estelar
    ctx.moveTo(0, -size * 0.75);
    ctx.lineTo(size * 0.5, 0);
    ctx.lineTo(0, size * 0.75);
    ctx.lineTo(-size * 0.5, 0);
    ctx.closePath();
    ctx.moveTo(0, -size * 0.75);
    ctx.lineTo(0, size * 0.75);
  } else if (v === 2) {
    // Runa tridente arcano
    ctx.moveTo(0, size * 0.75);
    ctx.lineTo(0, -size * 0.75);
    ctx.moveTo(-size * 0.48, -size * 0.3);
    ctx.lineTo(0, 0.1 * size);
    ctx.lineTo(size * 0.48, -size * 0.3);
  } else {
    // Runa reloj solar
    ctx.moveTo(-size * 0.45, -size * 0.65);
    ctx.lineTo(size * 0.45, size * 0.65);
    ctx.moveTo(size * 0.45, -size * 0.65);
    ctx.lineTo(-size * 0.45, size * 0.65);
    ctx.moveTo(-size * 0.45, -size * 0.65);
    ctx.lineTo(size * 0.45, -size * 0.65);
  }
  ctx.stroke();
  ctx.restore();
}

// ----------------------------------------------------------------------------
// RENDERIZADORES DE CAÑA / VARITA PERSONALIZADOS PARA CADA SKIN
// ----------------------------------------------------------------------------

export function drawMagmaVolcanicRod(
  ctx: CanvasRenderingContext2D,
  baseX: number,
  baseY: number,
  tipX: number,
  tipY: number,
  bendOffset: number,
  elapsed: number,
  isBite: boolean
) {
  const trembleX = isBite ? Math.sin(elapsed * 52) * 3.4 : 0;
  const trembleY = isBite ? Math.cos(elapsed * 46) * 2.8 : 0;
  const bx = baseX + trembleX * 0.4;
  const by = baseY + trembleY * 0.4;
  const tx = tipX + trembleX;
  const ty = tipY + trembleY;
  const cx = (bx + tx) * 0.5;
  const cy = (by + ty) * 0.5 + bendOffset;

  const pulse = 0.65 + 0.35 * Math.sin(elapsed * (isBite ? 16 : 5.2));
  const biteRedBoost = isBite ? 1.45 : 1;

  ctx.save();
  ctx.lineCap = 'round';

  // 1. Bloom emisivo alrededor de las grietas y la punta volcánica
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.strokeStyle = isBite
    ? `rgba(239, 68, 68, ${0.55 * pulse})`
    : `rgba(249, 115, 22, ${0.36 * pulse})`;
  ctx.lineWidth = isBite ? 14 : 10;
  ctx.beginPath();
  ctx.moveTo(bx, by);
  ctx.quadraticCurveTo(cx, cy, tx, ty);
  ctx.stroke();
  ctx.restore();

  // 2. Cuerpo de roca volcánica oscura (basalto agrietado)
  ctx.strokeStyle = SKIN_VFX_CONFIG.MAGMA.PALETTE.volcanicBlack;
  ctx.lineWidth = 7.5;
  ctx.beginPath();
  ctx.moveTo(bx, by);
  ctx.quadraticCurveTo(cx, cy, tx, ty);
  ctx.stroke();

  ctx.strokeStyle = SKIN_VFX_CONFIG.MAGMA.PALETTE.basaltDark;
  ctx.lineWidth = 5.2;
  ctx.beginPath();
  ctx.moveTo(bx, by);
  ctx.quadraticCurveTo(cx, cy, tx, ty);
  ctx.stroke();

  // 3. Grietas de lava incandescente recorriendo la caña
  ctx.strokeStyle = isBite
    ? `rgba(239, 68, 68, ${Math.min(1, 0.85 * biteRedBoost)})`
    : `rgba(249, 115, 22, ${0.72 + pulse * 0.25})`;
  ctx.lineWidth = isBite ? 2.8 : 2.1;
  ctx.setLineDash([7, 5, 3, 6]);
  ctx.lineDashOffset = -elapsed * (isBite ? 24 : 8);
  ctx.beginPath();
  ctx.moveTo(bx, by);
  ctx.quadraticCurveTo(cx, cy, tx, ty);
  ctx.stroke();

  // Grieta interna núcleo amarillo-naranja brillante
  ctx.strokeStyle = isBite
    ? '#fca5a5'
    : `rgba(253, 224, 71, ${0.55 + pulse * 0.35})`;
  ctx.lineWidth = 1.1;
  ctx.setLineDash([4, 9]);
  ctx.beginPath();
  ctx.moveTo(bx, by);
  ctx.quadraticCurveTo(cx, cy, tx, ty);
  ctx.stroke();
  ctx.setLineDash([]);

  // 4. Punta de magma incandescente
  const tipGrad = ctx.createRadialGradient(tx, ty, 1, tx, ty, isBite ? 17 : 12);
  tipGrad.addColorStop(0, '#fef08a');
  tipGrad.addColorStop(0.45, isBite ? '#ef4444' : '#f97316');
  tipGrad.addColorStop(1, 'rgba(220, 38, 38, 0)');
  ctx.fillStyle = tipGrad;
  ctx.beginPath();
  ctx.arc(tx, ty, isBite ? 17 : 12, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

export function drawMillionaireGoldRod(
  ctx: CanvasRenderingContext2D,
  baseX: number,
  baseY: number,
  tipX: number,
  tipY: number,
  bendOffset: number,
  elapsed: number,
  isBite: boolean
) {
  const cx = (baseX + tipX) * 0.5;
  const cy = (baseY + tipY) * 0.5 + bendOffset;

  ctx.save();
  ctx.lineCap = 'round';

  // Halo dorado suave en la punta
  if (isBite) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const biteGrad = ctx.createRadialGradient(tipX, tipY, 2, tipX, tipY, 24);
    biteGrad.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
    biteGrad.addColorStop(0.45, 'rgba(250, 204, 21, 0.7)');
    biteGrad.addColorStop(1, 'rgba(250, 204, 21, 0)');
    ctx.fillStyle = biteGrad;
    ctx.beginPath();
    ctx.arc(tipX, tipY, 24, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Sombra elegante negra en bordes + cuerpo de oro pulido
  ctx.strokeStyle = SKIN_VFX_CONFIG.MILLIONAIRE.PALETTE.elegantBlack;
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.moveTo(baseX, baseY);
  ctx.quadraticCurveTo(cx, cy, tipX, tipY);
  ctx.stroke();

  const goldGrad = ctx.createLinearGradient(baseX, baseY, tipX, tipY);
  const sweep = (elapsed * SKIN_VFX_CONFIG.MILLIONAIRE.METALLIC_SHEEN_SPEED) % 1;
  const s0 = Math.max(0, sweep - 0.14);
  const s1 = sweep;
  const s2 = Math.min(1, sweep + 0.14);
  goldGrad.addColorStop(0, '#b45309');
  if (s0 > 0.02) goldGrad.addColorStop(s0, '#eab308');
  goldGrad.addColorStop(s1, '#fffbeb'); // Reflejo metálico animado recorriendo la caña
  if (s2 < 0.98) goldGrad.addColorStop(s2, '#facc15');
  goldGrad.addColorStop(1, '#d97706');

  ctx.strokeStyle = goldGrad;
  ctx.lineWidth = 4.6;
  ctx.beginPath();
  ctx.moveTo(baseX, baseY);
  ctx.quadraticCurveTo(cx, cy, tipX, tipY);
  ctx.stroke();

  // Gemas incrustadas a lo largo de la caña (evaluación cuadrática de Bezier)
  const gemT = [0.24, 0.54, 0.82];
  for (let i = 0; i < gemT.length; i++) {
    const t = gemT[i];
    const omt = 1 - t;
    const gx = omt * omt * baseX + 2 * omt * t * cx + t * t * tipX;
    const gy = omt * omt * baseY + 2 * omt * t * cy + t * t * tipY;
    ctx.fillStyle = i === 1 ? '#38bdf8' : '#e0f2fe';
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(gx, gy, i === 2 ? 3.2 : 2.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  // Remate diamante en la punta
  drawDiamondGem(ctx, tipX, tipY, isBite ? 7.5 : 5.8, elapsed * 1.4);

  ctx.restore();
}

export function drawWizardCrystalWand(
  ctx: CanvasRenderingContext2D,
  baseX: number,
  baseY: number,
  tipX: number,
  tipY: number,
  elapsed: number,
  isBite: boolean
) {
  ctx.save();
  ctx.lineCap = 'round';

  // Vara tallada azul profundo / oro con runas grabadas
  const wandGrad = ctx.createLinearGradient(baseX, baseY, tipX, tipY);
  wandGrad.addColorStop(0, '#1e1b4b');
  wandGrad.addColorStop(0.65, '#4338ca');
  wandGrad.addColorStop(1, '#8b5cf6');
  ctx.strokeStyle = wandGrad;
  ctx.lineWidth = 5.5;
  ctx.beginPath();
  ctx.moveTo(baseX, baseY);
  ctx.lineTo(tipX, tipY);
  ctx.stroke();

  // Engarce dorado superior
  ctx.strokeStyle = '#fde047';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(baseX + (tipX - baseX) * 0.72, baseY + (tipY - baseY) * 0.72);
  ctx.lineTo(tipX, tipY);
  ctx.stroke();

  // Cristal luminoso que FLOTA y pulsa más allá de la punta
  const dx = tipX - baseX;
  const dy = tipY - baseY;
  const len = Math.max(1, Math.hypot(dx, dy));
  const ux = dx / len;
  const uy = dy / len;
  const floatDist = 14 + Math.sin(elapsed * 3.8) * 3.2;
  const crysX = tipX + ux * floatDist;
  const crysY = tipY + uy * floatDist - 3;

  const pulse = 1 + Math.sin(elapsed * (isBite ? 18 : 5.5)) * (isBite ? 0.34 : 0.18);

  // Bloom aditivo alrededor del cristal
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const crysGlow = ctx.createRadialGradient(crysX, crysY, 1, crysX, crysY, 20 * pulse);
  crysGlow.addColorStop(0, isBite ? 'rgba(236, 254, 255, 0.95)' : 'rgba(34, 211, 238, 0.7)');
  crysGlow.addColorStop(0.5, 'rgba(139, 92, 246, 0.38)');
  crysGlow.addColorStop(1, 'rgba(139, 92, 246, 0)');
  ctx.fillStyle = crysGlow;
  ctx.beginPath();
  ctx.arc(crysX, crysY, 20 * pulse, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Cristal facetado flotante
  const cw = 6.2 * pulse;
  const ch = 10.2 * pulse;
  ctx.save();
  ctx.translate(crysX, crysY);
  ctx.rotate(Math.sin(elapsed * 2.2) * 0.14);
  ctx.fillStyle = isBite ? '#ecfeff' : '#22d3ee';
  ctx.strokeStyle = '#c084fc';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(0, -ch);
  ctx.lineTo(cw, 0);
  ctx.lineTo(0, ch);
  ctx.lineTo(-cw, 0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(0, -ch * 0.65);
  ctx.lineTo(cw * 0.45, 0);
  ctx.lineTo(0, ch * 0.2);
  ctx.lineTo(-cw * 0.45, 0);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // Runas brillantes que orbitan el cristal y se encienden EN SECUENCIA
  const runeCount = SKIN_VFX_CONFIG.WIZARD.ORBITING_RUNES_COUNT;
  const seqFloat = elapsed * (isBite ? 6.5 : 2.6);
  const activeIdx = Math.floor(seqFloat) % runeCount;
  for (let i = 0; i < runeCount; i++) {
    const ang = elapsed * (isBite ? 4.4 : 1.75) + (i * Math.PI * 2) / runeCount;
    const rx = crysX + Math.cos(ang) * 20;
    const ry = crysY + Math.sin(ang) * 14;
    const isLit = i === activeIdx;
    const rAlpha = isLit ? 1 : 0.36;
    drawArcaneRune(
      ctx,
      rx,
      ry,
      isLit ? 5.6 : 4.2,
      i,
      isLit ? '#ecfeff' : i % 2 === 0 ? '#22d3ee' : '#c084fc',
      rAlpha
    );
  }

  ctx.restore();
}

// ----------------------------------------------------------------------------
// MOTOR CENTRAL DE EFECTOS POR SKIN (OBJECT POOLING + 4 CAPAS)
// ----------------------------------------------------------------------------

export class SkinEffectsEngine {
  private particles: SkinParticle[];
  private rings: SkinRingEffect[];

  private prevSkin: ActiveSkinId = 'none';
  private prevPhase: FishingPhase = 'IDLE';
  private castWaterHitFired = false;
  private lastCaughtUid: string | null = null;
  private currentJackpot = false;
  private currentCriticalSpell = false;
  private currentCatchValue = 0;
  private catchRevealTime = 0;

  // Temporizador para charco de lava enfriándose (Magma)
  private lavaPuddleTimer = 0;
  private lavaPuddleX = 0;
  private lavaPuddleY = 0;

  // Screen shake (traumatismo con decaimiento exponencial)
  private shakeTimer = 0;
  private shakeDuration = 0;
  private shakeAmplitude = 0;

  // Flash breve de picada (Millonaria / Mago)
  private biteFlashAlpha = 0;
  private biteFlashColor = '#fde047';

  // Destello en inventario al recomponer el pez del Mago
  private inventoryRecomposeFlash = 0;

  // Acumuladores fraccionales para emisión constante independiente de FPS
  private accumA = 0;
  private accumB = 0;
  private accumC = 0;
  private accumTrail = 0;
  private accumBoil = 0;

  constructor() {
    this.particles = Array.from({ length: SKIN_VFX_CONFIG.POOL_PARTICLES_MAX }, () => ({
      active: false,
      kind: 'ember',
      layer: 'particle',
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      ax: 0,
      ay: 0,
      size: 3,
      rotation: 0,
      vRot: 0,
      spinPhase: 0,
      spinSpeed: 0,
      life: 0,
      maxLife: 1,
      alpha: 1,
      color: '#ffffff',
      secondaryColor: '#ffffff',
      bouncesLeft: 0,
      floorY: 0,
      targetX: 0,
      targetY: 0,
      startX: 0,
      startY: 0,
    }));

    this.rings = Array.from({ length: SKIN_VFX_CONFIG.POOL_RINGS_MAX }, () => ({
      active: false,
      kind: 'lava_ring',
      x: 0,
      y: 0,
      life: 0,
      maxLife: 0.8,
      startRx: 10,
      endRx: 70,
      lineWidth: 2,
      color: '#ffffff',
      secondaryColor: '#ffffff',
      rotation: 0,
    }));
  }

  private getBudgetFactor(state: SkinFrameState): number {
    const q = SKIN_VFX_CONFIG.QUALITY_SCALE[state.quality] ?? 0.85;
    const m = state.width < SKIN_VFX_CONFIG.MOBILE_BREAKPOINT_PX ? SKIN_VFX_CONFIG.MOBILE_BUDGET_SCALE : 1;
    return q * m;
  }

  private allocParticle(): SkinParticle | null {
    for (let i = 0; i < this.particles.length; i++) {
      if (!this.particles[i].active) return this.particles[i];
    }
    return null;
  }

  private allocRing(): SkinRingEffect | null {
    for (let i = 0; i < this.rings.length; i++) {
      if (!this.rings[i].active) return this.rings[i];
    }
    return null;
  }

  private spawnRing(
    kind: RingKind,
    x: number,
    y: number,
    startRx: number,
    endRx: number,
    maxLife: number,
    lineWidth: number,
    color: string,
    secondaryColor: string
  ) {
    const r = this.allocRing();
    if (!r) return;
    r.active = true;
    r.kind = kind;
    r.x = x;
    r.y = y;
    r.life = 0;
    r.maxLife = maxLife;
    r.startRx = startRx;
    r.endRx = endRx;
    r.lineWidth = lineWidth;
    r.color = color;
    r.secondaryColor = secondaryColor;
    r.rotation = Math.random() * Math.PI * 2;
  }

  private clearAll() {
    for (let i = 0; i < this.particles.length; i++) this.particles[i].active = false;
    for (let i = 0; i < this.rings.length; i++) this.rings[i].active = false;
    this.lavaPuddleTimer = 0;
    this.shakeTimer = 0;
    this.biteFlashAlpha = 0;
    this.inventoryRecomposeFlash = 0;
  }

  public getScreenShake(): { x: number; y: number } {
    if (this.shakeTimer <= 0 || this.shakeDuration <= 0) return { x: 0, y: 0 };
    const progress = this.shakeTimer / this.shakeDuration;
    const amp = this.shakeAmplitude * progress * progress;
    return {
      x: (Math.random() * 2 - 1) * amp,
      y: (Math.random() * 2 - 1) * amp,
    };
  }

  public getCatchVisualTransform(state: SkinFrameState): CatchVisualTransform {
    const neutral: CatchVisualTransform = {
      offsetX: 0,
      offsetY: 0,
      scale: 1,
      rotation: 0,
      alpha: 1,
      goldOverlayAlpha: 0,
      hideOriginalForDisintegration: false,
    };

    if (state.skin === 'none' || state.phase !== 'CAUGHT' || state.inBuildup) {
      return neutral;
    }

    const t = state.revealElapsed;
    if (state.skin === 'suit_magma') {
      // El pez sale disparado desde el hoyo del agua con "Erupción Volcánica"
      const launchDur = 0.44;
      if (t < launchDur) {
        const p = easeOutBack(t / launchDur);
        const startOffsetX = state.holeX - state.width * 0.5;
        const startOffsetY = state.holeY - state.height * 0.46;
        const arc = Math.sin((t / launchDur) * Math.PI) * 58;
        return {
          ...neutral,
          offsetX: startOffsetX * (1 - p),
          offsetY: startOffsetY * (1 - p) - arc,
          scale: 0.35 + 0.65 * easeOutCubic(t / launchDur),
          rotation: (1 - p) * -0.22,
        };
      }
      return neutral;
    }

    if (state.skin === 'suit_millionaire') {
      // El pez capturado conserva su aspecto normal sin baño dorado
      return neutral;
    }

    if (state.skin === 'suit_wizard') {
      // Sale girando dentro de la esfera de energía desde el portal sobre el agua
      const emergeDur = 0.55;
      if (t < emergeDur) {
        const p = easeOutCubic(t / emergeDur);
        const startOffsetX = state.holeX - state.width * 0.5;
        const startOffsetY = state.holeY - state.height * 0.46;
        return {
          ...neutral,
          offsetX: startOffsetX * (1 - p),
          offsetY: startOffsetY * (1 - p) - Math.sin(p * Math.PI) * 44,
          scale: 0.28 + 0.72 * p,
          rotation: (1 - p) * Math.PI * 2,
        };
      }
      // Breve disolución etérea final antes de recomponerse en el inventario
      const disStart = SKIN_VFX_CONFIG.WIZARD.RECOMPOSE_START_SEC + 0.45;
      if (t > disStart) {
        const dp = clamp01((t - disStart) / 0.55);
        return {
          ...neutral,
          alpha: Math.max(0.28, 1 - dp * 0.72),
          scale: 1 - dp * 0.14,
        };
      }
      return neutral;
    }

    return neutral;
  }

  public update(dt: number, state: SkinFrameState) {
    if (state.skin !== this.prevSkin) {
      this.clearAll();
      this.prevSkin = state.skin;
      this.accumA = 0;
      this.accumB = 0;
      this.accumC = 0;
      this.lastCaughtUid = null;
    }

    if (state.skin === 'none') {
      this.prevPhase = state.phase;
      return;
    }

    if (!state.isPaused) {
      // Actualizar temporizadores
      if (this.lavaPuddleTimer > 0) this.lavaPuddleTimer = Math.max(0, this.lavaPuddleTimer - dt);
      if (this.shakeTimer > 0) this.shakeTimer = Math.max(0, this.shakeTimer - dt);
      if (this.biteFlashAlpha > 0) this.biteFlashAlpha = Math.max(0, this.biteFlashAlpha - dt * 2.4);
      if (this.inventoryRecomposeFlash > 0) {
        this.inventoryRecomposeFlash = Math.max(0, this.inventoryRecomposeFlash - dt * 1.9);
      }

      // Detectar transiciones de fase para disparar efectos puntuales
      if (state.phase !== this.prevPhase) {
        if (state.phase === 'CASTING') {
          this.castWaterHitFired = false;
        } else if (state.phase === 'BITING') {
          this.triggerBiteEffect(state);
        } else if (state.phase === 'IDLE' || state.phase === 'MISSED') {
          this.lastCaughtUid = null;
        }
        this.prevPhase = state.phase;
      }

      // Impacto en el agua al caer el lanzamiento (tanto en WAITING como fin de CASTING)
      if (!this.castWaterHitFired && state.phase === 'WAITING') {
        this.castWaterHitFired = true;
        this.triggerWaterImpact(state);
      }

      // Disparo único de captura al revelarse el pez (tras buildup si es Legendario/Secreto)
      if (
        state.phase === 'CAUGHT' &&
        !state.inBuildup &&
        state.caughtFish &&
        this.lastCaughtUid !== state.caughtFish.uid
      ) {
        this.lastCaughtUid = state.caughtFish.uid;
        this.catchRevealTime = 0;
        this.triggerCatchEffect(state, state.caughtFish);
      }

      if (state.phase === 'CAUGHT' && !state.inBuildup) {
        const prevT = this.catchRevealTime;
        this.catchRevealTime += dt;
        // Emisión de partículas de recomposición hacia el inventario en Mago
        if (
          state.skin === 'suit_wizard' &&
          prevT < SKIN_VFX_CONFIG.WIZARD.RECOMPOSE_START_SEC &&
          this.catchRevealTime >= SKIN_VFX_CONFIG.WIZARD.RECOMPOSE_START_SEC
        ) {
          this.spawnWizardRecomposeBurst(state);
        }
      }

      // Emisiones continuas según la skin equipada
      const budget = this.getBudgetFactor(state);
      if (state.skin === 'suit_magma') {
        this.emitMagmaContinuous(dt, state, budget);
      } else if (state.skin === 'suit_millionaire') {
        this.emitMillionaireContinuous(dt, state, budget);
      } else if (state.skin === 'suit_wizard') {
        this.emitWizardContinuous(dt, state, budget);
      }

      // Actualizar física y vida de partículas del pool
      for (let i = 0; i < this.particles.length; i++) {
        const p = this.particles[i];
        if (!p.active) continue;
        p.life += dt;
        if (p.life >= p.maxLife) {
          p.active = false;
          continue;
        }
        p.spinPhase += p.spinSpeed * dt;
        p.rotation += p.vRot * dt;

        if (p.kind === 'recompose_mote') {
          // Trayectoria guiada suave hacia el botón de inventario/mercado
          const prog = easeInOutSine(p.life / p.maxLife);
          const arcLift = Math.sin(prog * Math.PI) * -55;
          p.x = p.startX + (p.targetX - p.startX) * prog + Math.sin(prog * 10 + p.spinPhase) * 14 * (1 - prog);
          p.y = p.startY + (p.targetY - p.startY) * prog + arcLift;
          if (p.life + dt >= p.maxLife) {
            this.inventoryRecomposeFlash = Math.min(1, this.inventoryRecomposeFlash + 0.16);
          }
          continue;
        }

        p.vx += p.ax * dt;
        p.vy += p.ay * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;

        // Rebotes realistas contra el suelo/muelle para monedas, billetes y rocas
        if (p.bouncesLeft > 0 && p.y >= p.floorY && p.vy > 0) {
          p.y = p.floorY;
          p.vy = -p.vy * SKIN_VFX_CONFIG.MILLIONAIRE.COIN_BOUNCE_RESTITUTION;
          p.vx *= 0.78;
          p.vRot *= 0.72;
          p.bouncesLeft--;
        }
      }

      // Actualizar anillos y ondas
      for (let i = 0; i < this.rings.length; i++) {
        const r = this.rings[i];
        if (!r.active) continue;
        r.life += dt;
        if (r.life >= r.maxLife) r.active = false;
      }
    }
  }

  // --------------------------------------------------------------------------
  // EMISIONES CONTINUAS POR SKIN
  // --------------------------------------------------------------------------

  private emitMagmaContinuous(dt: number, state: SkinFrameState, budget: number) {
    const cfg = SKIN_VFX_CONFIG.MAGMA;
    const isBite = state.phase === 'BITING';
    const mult = isBite ? cfg.BITE_INTENSITY_MULT : 1;

    // 1. Brasas y chispas naranjas ascendentes (alrededor de caña/personaje y agua)
    this.accumA += dt * cfg.IDLE_EMBER_RATE * budget * mult;
    while (this.accumA >= 1) {
      this.accumA -= 1;
      const p = this.allocParticle();
      if (!p) break;
      const fromWater = Math.random() < 0.45;
      const originX = fromWater ? state.holeX + (Math.random() - 0.5) * 84 : state.charX + (Math.random() - 0.5) * 70;
      const originY = fromWater ? state.holeY + (Math.random() - 0.5) * 14 : state.charY - 25 - Math.random() * 140;
      p.active = true;
      p.kind = 'ember';
      p.layer = 'glow';
      p.x = originX;
      p.y = originY;
      p.vx = (Math.random() - 0.5) * 32;
      p.vy = -(48 + Math.random() * 68) * mult;
      p.ax = (Math.random() - 0.5) * 18;
      p.ay = -18;
      p.size = 1.8 + Math.random() * 2.8;
      p.rotation = 0;
      p.vRot = 0;
      p.spinPhase = Math.random() * 6;
      p.spinSpeed = 4;
      p.life = 0;
      p.maxLife = 0.75 + Math.random() * 0.75;
      p.alpha = 0.92;
      p.color = isBite && Math.random() < 0.4 ? cfg.PALETTE.crimsonGlow : Math.random() < 0.35 ? cfg.PALETTE.lavaCoreYellow : cfg.PALETTE.incandescentOrange;
      p.secondaryColor = cfg.PALETTE.lavaRed;
      p.bouncesLeft = 0;
    }

    // 2. Humo oscuro ligero ascendente
    this.accumB += dt * cfg.IDLE_SMOKE_RATE * budget;
    while (this.accumB >= 1) {
      this.accumB -= 1;
      const p = this.allocParticle();
      if (!p) break;
      const atTip = Math.random() < 0.5;
      p.active = true;
      p.kind = 'smoke';
      p.layer = 'particle';
      p.x = (atTip ? state.rodTipX : state.holeX) + (Math.random() - 0.5) * 24;
      p.y = (atTip ? state.rodTipY : state.holeY) + (Math.random() - 0.5) * 10;
      p.vx = (Math.random() - 0.5) * 14;
      p.vy = -(22 + Math.random() * 24);
      p.ax = 6;
      p.ay = -4;
      p.size = 8 + Math.random() * 11;
      p.rotation = Math.random() * 6.28;
      p.vRot = (Math.random() - 0.5) * 1.2;
      p.spinPhase = 0;
      p.spinSpeed = 0;
      p.life = 0;
      p.maxLife = 1.2 + Math.random() * 0.8;
      p.alpha = 0.36;
      p.color = cfg.PALETTE.basaltDark;
      p.secondaryColor = cfg.PALETTE.volcanicBlack;
      p.bouncesLeft = 0;
    }

    // 3. Burbujas hirviendo en la superficie durante WAITING / BITING
    if (state.phase === 'WAITING' || state.phase === 'BITING') {
      this.accumBoil += dt * cfg.WATER_BOIL_BUBBLE_RATE * budget * (isBite ? 1.8 : 1);
      while (this.accumBoil >= 1) {
        this.accumBoil -= 1;
        const p = this.allocParticle();
        if (!p) break;
        p.active = true;
        p.kind = 'boil_bubble';
        p.layer = 'particle';
        p.x = state.holeX + (Math.random() - 0.5) * 68;
        p.y = state.holeY + (Math.random() - 0.5) * 18;
        p.vx = (Math.random() - 0.5) * 12;
        p.vy = -(18 + Math.random() * 26);
        p.ax = 0;
        p.ay = -12;
        p.size = 2.6 + Math.random() * 4.2;
        p.rotation = 0;
        p.vRot = 0;
        p.spinPhase = 0;
        p.spinSpeed = 0;
        p.life = 0;
        p.maxLife = 0.42 + Math.random() * 0.35;
        p.alpha = 0.88;
        p.color = isBite ? cfg.PALETTE.crimsonGlow : cfg.PALETTE.incandescentOrange;
        p.secondaryColor = cfg.PALETTE.lavaCoreYellow;
        p.bouncesLeft = 0;
      }
    }

    // 4. Estela de fuego al lanzar
    if (state.phase === 'CASTING' && state.projectileX !== null && state.projectileY !== null) {
      this.accumTrail += dt * cfg.CAST_FIRE_TRAIL_RATE * budget;
      while (this.accumTrail >= 1) {
        this.accumTrail -= 1;
        const p = this.allocParticle();
        if (!p) break;
        p.active = true;
        p.kind = 'ember';
        p.layer = 'glow';
        p.x = state.projectileX + (Math.random() - 0.5) * 10;
        p.y = state.projectileY + (Math.random() - 0.5) * 10;
        p.vx = (Math.random() - 0.5) * 34;
        p.vy = -(20 + Math.random() * 42);
        p.ax = 0;
        p.ay = 0;
        p.size = 3.2 + Math.random() * 4;
        p.rotation = 0;
        p.vRot = 0;
        p.spinPhase = 0;
        p.spinSpeed = 0;
        p.life = 0;
        p.maxLife = 0.34 + Math.random() * 0.22;
        p.alpha = 0.96;
        p.color = Math.random() < 0.4 ? cfg.PALETTE.lavaCoreYellow : cfg.PALETTE.incandescentOrange;
        p.secondaryColor = cfg.PALETTE.lavaRed;
        p.bouncesLeft = 0;
      }
    }
  }

  private emitMillionaireContinuous(dt: number, state: SkinFrameState, budget: number) {
    const cfg = SKIN_VFX_CONFIG.MILLIONAIRE;

    // 1. Destellos tipo diamante (estrellitas de 4 puntas) que aparecen y desaparecen
    this.accumA += dt * cfg.IDLE_SPARKLE_RATE * budget;
    while (this.accumA >= 1) {
      this.accumA -= 1;
      const p = this.allocParticle();
      if (!p) break;
      const aroundRod = Math.random() < 0.55;
      p.active = true;
      p.kind = 'diamond_star';
      p.layer = 'flash';
      p.x = aroundRod
        ? state.rodBaseX + (state.rodTipX - state.rodBaseX) * Math.random() + (Math.random() - 0.5) * 36
        : state.charX + (Math.random() - 0.5) * 90;
      p.y = aroundRod
        ? state.rodBaseY + (state.rodTipY - state.rodBaseY) * Math.random() + (Math.random() - 0.5) * 32
        : state.charY - 30 - Math.random() * 170;
      p.vx = (Math.random() - 0.5) * 10;
      p.vy = -8 - Math.random() * 14;
      p.ax = 0;
      p.ay = 0;
      p.size = 4.5 + Math.random() * 6.5;
      p.rotation = (Math.random() - 0.5) * 0.6;
      p.vRot = (Math.random() - 0.5) * 1.6;
      p.spinPhase = 0;
      p.spinSpeed = 0;
      p.life = 0;
      p.maxLife = 0.55 + Math.random() * 0.55;
      p.alpha = 0.95;
      p.color = Math.random() < 0.5 ? cfg.PALETTE.pearlWhite : cfg.PALETTE.diamondIce;
      p.secondaryColor = cfg.PALETTE.goldBright;
      p.bouncesLeft = 0;
    }

    // 2. Monedas y billetes pequeños que flotan alrededor y giran con brillo metálico
    this.accumB += dt * cfg.IDLE_AMBIENT_WEALTH_RATE * budget;
    while (this.accumB >= 1) {
      this.accumB -= 1;
      const p = this.allocParticle();
      if (!p) break;
      const isCoin = Math.random() < 0.64;
      p.active = true;
      p.kind = isCoin ? 'coin' : 'bill';
      p.layer = 'particle';
      p.x = state.charX + (Math.random() - 0.5) * 115;
      p.y = state.charY - 25 - Math.random() * 145;
      p.vx = (Math.random() - 0.5) * 20;
      p.vy = -(16 + Math.random() * 22);
      p.ax = 0;
      p.ay = 0;
      p.size = isCoin ? 4.4 + Math.random() * 2.2 : 5 + Math.random() * 2.2;
      p.rotation = (Math.random() - 0.5) * 0.8;
      p.vRot = (Math.random() - 0.5) * 1.8;
      p.spinPhase = Math.random() * 6.28;
      p.spinSpeed = 4.5 + Math.random() * 3.5;
      p.life = 0;
      p.maxLife = 1.15 + Math.random() * 0.7;
      p.alpha = 0.88;
      p.color = cfg.PALETTE.goldBright;
      p.secondaryColor = cfg.PALETTE.goldHighlight;
      p.bouncesLeft = 0;
    }

    // 3. Estela dorada con confeti de lujo al lanzar
    if (state.phase === 'CASTING' && state.projectileX !== null && state.projectileY !== null) {
      this.accumTrail += dt * cfg.CAST_CONFETTI_RATE * budget;
      while (this.accumTrail >= 1) {
        this.accumTrail -= 1;
        const p = this.allocParticle();
        if (!p) break;
        const paletteRoll = Math.random();
        p.active = true;
        p.kind = 'confetti';
        p.layer = 'particle';
        p.x = state.projectileX + (Math.random() - 0.5) * 12;
        p.y = state.projectileY + (Math.random() - 0.5) * 12;
        p.vx = (Math.random() - 0.5) * 65;
        p.vy = (Math.random() - 0.5) * 45 + 18;
        p.ax = 0;
        p.ay = 90;
        p.size = 3.5 + Math.random() * 3.5;
        p.rotation = Math.random() * 6.28;
        p.vRot = (Math.random() - 0.5) * 8;
        p.spinPhase = Math.random() * 6;
        p.spinSpeed = 7;
        p.life = 0;
        p.maxLife = 0.55 + Math.random() * 0.4;
        p.alpha = 0.95;
        p.color =
          paletteRoll < 0.5
            ? cfg.PALETTE.goldBright
            : paletteRoll < 0.78
              ? cfg.PALETTE.pearlWhite
              : paletteRoll < 0.9
                ? cfg.PALETTE.diamondBlue
                : cfg.PALETTE.elegantBlack;
        p.secondaryColor = cfg.PALETTE.goldHighlight;
        p.bouncesLeft = 0;
      }
    }
  }

  private emitWizardContinuous(dt: number, state: SkinFrameState, budget: number) {
    const cfg = SKIN_VFX_CONFIG.WIZARD;

    // 1. Polvo de estrellas flotante
    this.accumA += dt * cfg.IDLE_STARDUST_RATE * budget;
    while (this.accumA >= 1) {
      this.accumA -= 1;
      const p = this.allocParticle();
      if (!p) break;
      const aroundWater = Math.random() < 0.42;
      p.active = true;
      p.kind = 'stardust';
      p.layer = 'glow';
      p.x = aroundWater
        ? state.holeX + (Math.random() - 0.5) * 110
        : state.charX + (Math.random() - 0.5) * 125;
      p.y = aroundWater
        ? state.holeY + (Math.random() - 0.5) * 32
        : state.charY - 25 - Math.random() * 175;
      p.vx = (Math.random() - 0.5) * 18;
      p.vy = -(12 + Math.random() * 24);
      p.ax = 0;
      p.ay = 0;
      p.size = 2.2 + Math.random() * 3.4;
      p.rotation = Math.random() * 3.14;
      p.vRot = (Math.random() - 0.5) * 2;
      p.spinPhase = Math.random() * 6;
      p.spinSpeed = 4;
      p.life = 0;
      p.maxLife = 0.95 + Math.random() * 0.8;
      p.alpha = 0.85;
      p.color = Math.random() < 0.5 ? cfg.PALETTE.brightCyan : cfg.PALETTE.neonPurple;
      p.secondaryColor = cfg.PALETTE.etherealWhite;
      p.bouncesLeft = 0;
    }

    // 2. Luciérnagas arcanas pulsantes
    this.accumB += dt * cfg.IDLE_FIREFLY_RATE * budget;
    while (this.accumB >= 1) {
      this.accumB -= 1;
      const p = this.allocParticle();
      if (!p) break;
      p.active = true;
      p.kind = 'firefly';
      p.layer = 'glow';
      p.x = state.charX + (Math.random() - 0.5) * 180;
      p.y = state.charY - 35 - Math.random() * 185;
      p.vx = (Math.random() - 0.5) * 28;
      p.vy = (Math.random() - 0.5) * 24;
      p.ax = (Math.random() - 0.5) * 14;
      p.ay = -6;
      p.size = 2.8 + Math.random() * 2.8;
      p.rotation = 0;
      p.vRot = 0;
      p.spinPhase = Math.random() * 6.28;
      p.spinSpeed = 6;
      p.life = 0;
      p.maxLife = 1.6 + Math.random() * 1.1;
      p.alpha = 0.9;
      p.color = Math.random() < 0.55 ? cfg.PALETTE.brightCyan : cfg.PALETTE.starGold;
      p.secondaryColor = cfg.PALETTE.arcaneViolet;
      p.bouncesLeft = 0;
    }

    // 3. Estela de energía arcana en espiral al lanzar
    if (state.phase === 'CASTING' && state.projectileX !== null && state.projectileY !== null) {
      this.accumTrail += dt * cfg.CAST_SPIRAL_RATE * budget;
      while (this.accumTrail >= 1) {
        this.accumTrail -= 1;
        const p = this.allocParticle();
        if (!p) break;
        const spiralA = state.elapsed * 22 + this.accumTrail * 3.14;
        p.active = true;
        p.kind = 'stardust';
        p.layer = 'glow';
        p.x = state.projectileX + Math.cos(spiralA) * 9;
        p.y = state.projectileY + Math.sin(spiralA) * 9;
        p.vx = Math.cos(spiralA) * 22;
        p.vy = Math.sin(spiralA) * 22 - 12;
        p.ax = 0;
        p.ay = 0;
        p.size = 3.0 + Math.random() * 2.8;
        p.rotation = spiralA;
        p.vRot = 3;
        p.spinPhase = spiralA;
        p.spinSpeed = 6;
        p.life = 0;
        p.maxLife = 0.42 + Math.random() * 0.22;
        p.alpha = 0.95;
        p.color = Math.random() < 0.5 ? cfg.PALETTE.brightCyan : cfg.PALETTE.neonPurple;
        p.secondaryColor = cfg.PALETTE.etherealWhite;
        p.bouncesLeft = 0;
      }
    }
  }

  // --------------------------------------------------------------------------
  // EVENTOS ÚNICOS: IMPACTO EN EL AGUA, PICADA Y CAPTURA
  // --------------------------------------------------------------------------

  private triggerWaterImpact(state: SkinFrameState) {
    const budget = this.getBudgetFactor(state);
    const { holeX, holeY } = state;

    if (state.skin === 'suit_magma') {
      const cfg = SKIN_VFX_CONFIG.MAGMA;
      // Anillo de lava en la superficie
      this.spawnRing(
        'lava_ring',
        holeX,
        holeY + 2,
        12,
        88,
        0.95,
        4.2,
        cfg.PALETTE.incandescentOrange,
        cfg.PALETTE.lavaCoreYellow
      );
      this.spawnRing(
        'lava_ring',
        holeX,
        holeY + 2,
        8,
        62,
        0.72,
        3.0,
        cfg.PALETTE.crimsonGlow,
        cfg.PALETTE.incandescentOrange
      );
      // Vapor blanco-grisáceo al caer al agua
      const steamCount = Math.max(4, Math.round(cfg.WATER_STEAM_BURST * budget));
      for (let i = 0; i < steamCount; i++) {
        const p = this.allocParticle();
        if (!p) break;
        p.active = true;
        p.kind = 'steam';
        p.layer = 'particle';
        p.x = holeX + (Math.random() - 0.5) * 38;
        p.y = holeY + (Math.random() - 0.5) * 10;
        p.vx = (Math.random() - 0.5) * 44;
        p.vy = -(36 + Math.random() * 52);
        p.ax = 0;
        p.ay = -14;
        p.size = 9 + Math.random() * 12;
        p.rotation = Math.random() * 6.28;
        p.vRot = (Math.random() - 0.5) * 1.4;
        p.spinPhase = 0;
        p.spinSpeed = 0;
        p.life = 0;
        p.maxLife = 0.65 + Math.random() * 0.45;
        p.alpha = 0.62;
        p.color = cfg.PALETTE.steamGray;
        p.secondaryColor = '#ffffff';
        p.bouncesLeft = 0;
      }
    } else if (state.skin === 'suit_millionaire') {
      const cfg = SKIN_VFX_CONFIG.MILLIONAIRE;
      // Ondas doradas y brillos en el agua
      this.spawnRing(
        'gold_ripple',
        holeX,
        holeY + 2,
        10,
        78,
        0.85,
        3.2,
        cfg.PALETTE.goldBright,
        cfg.PALETTE.pearlWhite
      );
      this.spawnRing(
        'gold_ripple',
        holeX,
        holeY + 2,
        16,
        96,
        1.05,
        2.0,
        cfg.PALETTE.diamondBlue,
        cfg.PALETTE.goldHighlight
      );
      const count = Math.max(5, Math.round(cfg.WATER_GOLD_SPARK_BURST * budget));
      for (let i = 0; i < count; i++) {
        const p = this.allocParticle();
        if (!p) break;
        const ang = -Math.PI + Math.random() * Math.PI;
        const spd = 55 + Math.random() * 105;
        p.active = true;
        p.kind = 'diamond_star';
        p.layer = 'flash';
        p.x = holeX + (Math.random() - 0.5) * 18;
        p.y = holeY;
        p.vx = Math.cos(ang) * spd;
        p.vy = Math.sin(ang) * spd - 20;
        p.ax = 0;
        p.ay = 240;
        p.size = 4.5 + Math.random() * 5;
        p.rotation = Math.random() * 3.14;
        p.vRot = (Math.random() - 0.5) * 5;
        p.spinPhase = 0;
        p.spinSpeed = 0;
        p.life = 0;
        p.maxLife = 0.55 + Math.random() * 0.25;
        p.alpha = 0.95;
        p.color = i % 2 === 0 ? cfg.PALETTE.goldBright : cfg.PALETTE.pearlWhite;
        p.secondaryColor = cfg.PALETTE.diamondBlue;
        p.bouncesLeft = 0;
      }
    } else if (state.skin === 'suit_wizard') {
      const cfg = SKIN_VFX_CONFIG.WIZARD;
      // Círculo mágico con runas que se expande sobre la superficie
      this.spawnRing(
        'magic_circle',
        holeX,
        holeY + 2,
        14,
        96,
        1.15,
        2.8,
        cfg.PALETTE.brightCyan,
        cfg.PALETTE.neonPurple
      );
    }
  }

  private triggerBiteEffect(state: SkinFrameState) {
    if (state.skin === 'suit_millionaire') {
      // Destello de luz dorada al picar (el sonido de caja registradora lo dispara IceFishingCanvas)
      this.biteFlashAlpha = 0.58;
      this.biteFlashColor = SKIN_VFX_CONFIG.MILLIONAIRE.PALETTE.goldHighlight;
      this.spawnRing(
        'gold_ripple',
        state.holeX,
        state.holeY + 2,
        12,
        88,
        0.6,
        3.5,
        SKIN_VFX_CONFIG.MILLIONAIRE.PALETTE.goldBright,
        '#ffffff'
      );
    } else if (state.skin === 'suit_magma') {
      this.biteFlashAlpha = 0.42;
      this.biteFlashColor = '#ef4444';
      this.spawnRing(
        'lava_ring',
        state.holeX,
        state.holeY + 2,
        12,
        84,
        0.55,
        4.0,
        SKIN_VFX_CONFIG.MAGMA.PALETTE.crimsonGlow,
        SKIN_VFX_CONFIG.MAGMA.PALETTE.lavaCoreYellow
      );
    } else if (state.skin === 'suit_wizard') {
      this.biteFlashAlpha = 0.45;
      this.biteFlashColor = SKIN_VFX_CONFIG.WIZARD.PALETTE.brightCyan;
      this.spawnRing(
        'magic_circle',
        state.holeX,
        state.holeY + 2,
        18,
        86,
        0.85,
        3.0,
        SKIN_VFX_CONFIG.WIZARD.PALETTE.brightCyan,
        SKIN_VFX_CONFIG.WIZARD.PALETTE.starGold
      );
    }
  }

  private triggerCatchEffect(state: SkinFrameState, fish: CaughtPokemon) {
    const budget = this.getBudgetFactor(state);

    if (state.skin === 'suit_magma') {
      // "Erupción Volcánica": onda expansiva, lava, rocas ardientes, screen shake y charco
      const cfg = SKIN_VFX_CONFIG.MAGMA;
      this.shakeDuration = cfg.SHAKE_DURATION_SEC;
      this.shakeTimer = cfg.SHAKE_DURATION_SEC;
      this.shakeAmplitude = cfg.SHAKE_AMPLITUDE_PX;

      this.lavaPuddleX = state.holeX;
      this.lavaPuddleY = state.holeY + 4;
      this.lavaPuddleTimer = cfg.ERUPTION_DURATION_SEC;

      this.spawnRing(
        'heat_shockwave',
        state.holeX,
        state.holeY + 2,
        18,
        Math.max(state.width, state.height) * 0.42,
        0.78,
        5.5,
        cfg.PALETTE.incandescentOrange,
        cfg.PALETTE.lavaCoreYellow
      );
      this.spawnRing(
        'lava_ring',
        state.holeX,
        state.holeY + 2,
        16,
        118,
        1.05,
        4.0,
        cfg.PALETTE.crimsonGlow,
        cfg.PALETTE.incandescentOrange
      );

      // Chorros de lava disparados hacia arriba
      const lavaCount = Math.max(12, Math.round(cfg.ERUPTION_LAVA_BURST * budget));
      for (let i = 0; i < lavaCount; i++) {
        const p = this.allocParticle();
        if (!p) break;
        const spread = (Math.random() - 0.5) * 280;
        p.active = true;
        p.kind = 'lava_blob';
        p.layer = 'glow';
        p.x = state.holeX + (Math.random() - 0.5) * 32;
        p.y = state.holeY;
        p.vx = spread;
        p.vy = -(250 + Math.random() * 290);
        p.ax = 0;
        p.ay = 640;
        p.size = 4 + Math.random() * 6.5;
        p.rotation = 0;
        p.vRot = 0;
        p.spinPhase = 0;
        p.spinSpeed = 0;
        p.life = 0;
        p.maxLife = 0.75 + Math.random() * 0.45;
        p.alpha = 0.96;
        p.color = Math.random() < 0.45 ? cfg.PALETTE.lavaCoreYellow : cfg.PALETTE.incandescentOrange;
        p.secondaryColor = cfg.PALETTE.lavaRed;
        p.bouncesLeft = 0;
      }

      // Rocas ardientes expulsadas con rebote
      const rockCount = Math.max(5, Math.round(cfg.ERUPTION_ROCK_BURST * budget));
      for (let i = 0; i < rockCount; i++) {
        const p = this.allocParticle();
        if (!p) break;
        p.active = true;
        p.kind = 'volcanic_rock';
        p.layer = 'particle';
        p.x = state.holeX + (Math.random() - 0.5) * 24;
        p.y = state.holeY;
        p.vx = (Math.random() - 0.5) * 320;
        p.vy = -(280 + Math.random() * 260);
        p.ax = 0;
        p.ay = 720;
        p.size = 6.5 + Math.random() * 6.5;
        p.rotation = Math.random() * 6.28;
        p.vRot = (Math.random() - 0.5) * 9;
        p.spinPhase = 0;
        p.spinSpeed = 0;
        p.life = 0;
        p.maxLife = 1.2 + Math.random() * 0.45;
        p.alpha = 1;
        p.color = cfg.PALETTE.basaltDark;
        p.secondaryColor = cfg.PALETTE.incandescentOrange;
        p.bouncesLeft = 1;
        p.floorY = Math.min(state.height - 20, state.holeY + 55 + Math.random() * 75);
      }
    } else if (state.skin === 'suit_millionaire') {
      // "Lluvia de Fortuna": monedas y billetes con física y rebotes, contador y Jackpot
      const cfg = SKIN_VFX_CONFIG.MILLIONAIRE;
      this.currentCatchValue = Math.max(10, Math.round(fish.sellValue));
      const roll = hashUid01(fish.uid);
      this.currentJackpot =
        roll < cfg.JACKPOT_CHANCE ||
        fish.species.rarity === 'Legendaria' ||
        fish.species.rarity === 'Secreto' ||
        fish.species.rarity === 'Secreto Abisal';

      const coinCount = Math.max(12, Math.round(cfg.FORTUNE_RAIN_COINS * budget));
      for (let i = 0; i < coinCount; i++) {
        const p = this.allocParticle();
        if (!p) break;
        p.active = true;
        p.kind = 'coin';
        p.layer = 'particle';
        p.x = state.width * (0.14 + Math.random() * 0.72);
        p.y = -20 - Math.random() * 140;
        p.vx = (Math.random() - 0.5) * 140;
        p.vy = 110 + Math.random() * 150;
        p.ax = 0;
        p.ay = cfg.COIN_GRAVITY_PX;
        p.size = 6 + Math.random() * 4.5;
        p.rotation = 0;
        p.vRot = 0;
        p.spinPhase = Math.random() * 6.28;
        p.spinSpeed = 7 + Math.random() * 5;
        p.life = 0;
        p.maxLife = 2.0 + Math.random() * 0.65;
        p.alpha = 1;
        p.color = cfg.PALETTE.goldBright;
        p.secondaryColor = cfg.PALETTE.goldHighlight;
        p.bouncesLeft = 2;
        p.floorY = state.height * (0.82 + Math.random() * 0.11);
      }

      const billCount = Math.max(6, Math.round(cfg.FORTUNE_RAIN_BILLS * budget));
      for (let i = 0; i < billCount; i++) {
        const p = this.allocParticle();
        if (!p) break;
        p.active = true;
        p.kind = 'bill';
        p.layer = 'particle';
        p.x = state.width * (0.16 + Math.random() * 0.68);
        p.y = -15 - Math.random() * 120;
        p.vx = (Math.random() - 0.5) * 95;
        p.vy = 70 + Math.random() * 80;
        p.ax = 0;
        p.ay = 140;
        p.size = 7 + Math.random() * 4;
        p.rotation = (Math.random() - 0.5) * 1.2;
        p.vRot = (Math.random() - 0.5) * 3.5;
        p.spinPhase = Math.random() * 6.28;
        p.spinSpeed = 4.5;
        p.life = 0;
        p.maxLife = 2.15 + Math.random() * 0.55;
        p.alpha = 0.96;
        p.color = cfg.PALETTE.billEmerald;
        p.secondaryColor = cfg.PALETTE.billMint;
        p.bouncesLeft = 1;
        p.floorY = state.height * (0.84 + Math.random() * 0.1);
      }

      if (this.currentJackpot) {
        const diamondCount = Math.max(10, Math.round(cfg.JACKPOT_DIAMOND_BURST * budget));
        const cx = state.width * 0.5;
        const cy = state.height * 0.45;
        for (let i = 0; i < diamondCount; i++) {
          const p = this.allocParticle();
          if (!p) break;
          const ang = (i / diamondCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.25;
          const spd = 160 + Math.random() * 210;
          p.active = true;
          p.kind = 'diamond_gem';
          p.layer = 'flash';
          p.x = cx;
          p.y = cy;
          p.vx = Math.cos(ang) * spd;
          p.vy = Math.sin(ang) * spd - 60;
          p.ax = 0;
          p.ay = 340;
          p.size = 7 + Math.random() * 5;
          p.rotation = Math.random() * 6.28;
          p.vRot = (Math.random() - 0.5) * 6;
          p.spinPhase = 0;
          p.spinSpeed = 0;
          p.life = 0;
          p.maxLife = 1.1 + Math.random() * 0.45;
          p.alpha = 1;
          p.color = cfg.PALETTE.diamondIce;
          p.secondaryColor = cfg.PALETTE.diamondBlue;
          p.bouncesLeft = 0;
        }
      }
    } else if (state.skin === 'suit_wizard') {
      // "Portal Arcano" + "Hechizo Crítico" para peces Raros+
      const cfg = SKIN_VFX_CONFIG.WIZARD;
      this.currentCriticalSpell = cfg.CRITICAL_SPELL_RARITIES.has(fish.species.rarity);

      this.spawnRing(
        'magic_circle',
        state.holeX,
        state.holeY + 2,
        22,
        125,
        1.4,
        3.4,
        cfg.PALETTE.brightCyan,
        cfg.PALETTE.neonPurple
      );
      if (this.currentCriticalSpell) {
        this.biteFlashAlpha = 0.55;
        this.biteFlashColor = cfg.PALETTE.brightCyan;
      }
    }
  }

  private spawnWizardRecomposeBurst(state: SkinFrameState) {
    const budget = this.getBudgetFactor(state);
    const count = Math.max(12, Math.round(SKIN_VFX_CONFIG.WIZARD.RECOMPOSE_PARTICLES * budget));
    const startCenterX = state.width * 0.5;
    const startCenterY = state.height * 0.46;
    // Destino aproximado del botón de Mercado/Inventario en la barra superior
    const targetX = state.width * 0.62;
    const targetY = 36;

    for (let i = 0; i < count; i++) {
      const p = this.allocParticle();
      if (!p) break;
      const sx = startCenterX + (Math.random() - 0.5) * 140;
      const sy = startCenterY + (Math.random() - 0.5) * 85;
      p.active = true;
      p.kind = 'recompose_mote';
      p.layer = 'glow';
      p.startX = sx;
      p.startY = sy;
      p.x = sx;
      p.y = sy;
      p.targetX = targetX + (Math.random() - 0.5) * 18;
      p.targetY = targetY + (Math.random() - 0.5) * 10;
      p.vx = 0;
      p.vy = 0;
      p.ax = 0;
      p.ay = 0;
      p.size = 3.2 + Math.random() * 3.5;
      p.rotation = 0;
      p.vRot = 0;
      p.spinPhase = Math.random() * 6.28;
      p.spinSpeed = 4;
      p.life = 0;
      p.maxLife = 0.62 + Math.random() * 0.32;
      p.alpha = 0.96;
      p.color = i % 2 === 0 ? SKIN_VFX_CONFIG.WIZARD.PALETTE.brightCyan : SKIN_VFX_CONFIG.WIZARD.PALETTE.neonPurple;
      p.secondaryColor = SKIN_VFX_CONFIG.WIZARD.PALETTE.etherealWhite;
      p.bouncesLeft = 0;
    }
  }

  // --------------------------------------------------------------------------
  // CAPA 1: FONDO (distorsión térmica, niebla púrpura, charco de lava, portal)
  // --------------------------------------------------------------------------

  public renderBackgroundLayer(ctx: CanvasRenderingContext2D, state: SkinFrameState) {
    if (state.skin === 'none') return;

    if (state.skin === 'suit_magma') {
      const cfg = SKIN_VFX_CONFIG.MAGMA;
      const hazeBands =
        state.quality === 'low' ? 1 : state.quality === 'normal' ? 3 : cfg.HEAT_HAZE_BANDS;
      // Distorsión de calor (heat haze) ondulante sobre el agua y personaje
      ctx.save();
      for (let b = 0; b < hazeBands; b++) {
        const yOff = Math.sin(state.elapsed * 3.2 + b * 1.4) * 5;
        const hy = state.holeY - 18 - b * 24 + yOff;
        const hx = state.holeX + Math.cos(state.elapsed * 2.5 + b) * 14;
        const grad = ctx.createRadialGradient(hx, hy, 4, hx, hy, 56 + b * 10);
        grad.addColorStop(0, 'rgba(251, 146, 60, 0.08)');
        grad.addColorStop(0.55, 'rgba(220, 38, 38, 0.04)');
        grad.addColorStop(1, 'rgba(220, 38, 38, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.ellipse(hx, hy, 64 + b * 10, 14, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      // Charco de lava enfriándose tras la captura ("Erupción Volcánica")
      if (this.lavaPuddleTimer > 0) {
        const coolT = 1 - this.lavaPuddleTimer / cfg.ERUPTION_DURATION_SEC;
        const alpha = coolT < 0.75 ? 0.88 : ((1 - coolT) / 0.25) * 0.88;
        const rx = 56 + easeOutCubic(Math.min(1, coolT * 3)) * 22;
        const ry = rx * 0.34;
        const puddleGrad = ctx.createRadialGradient(
          this.lavaPuddleX,
          this.lavaPuddleY,
          4,
          this.lavaPuddleX,
          this.lavaPuddleY,
          rx
        );
        if (coolT < 0.35) {
          puddleGrad.addColorStop(0, `rgba(253, 224, 71, ${alpha})`);
          puddleGrad.addColorStop(0.5, `rgba(249, 115, 22, ${alpha * 0.9})`);
          puddleGrad.addColorStop(1, `rgba(127, 29, 29, 0)`);
        } else if (coolT < 0.7) {
          puddleGrad.addColorStop(0, `rgba(239, 68, 68, ${alpha * 0.85})`);
          puddleGrad.addColorStop(0.55, `rgba(153, 27, 27, ${alpha * 0.8})`);
          puddleGrad.addColorStop(1, `rgba(28, 25, 23, 0)`);
        } else {
          // Costra oscura enfriándose
          puddleGrad.addColorStop(0, `rgba(68, 64, 60, ${alpha * 0.8})`);
          puddleGrad.addColorStop(0.65, `rgba(28, 25, 23, ${alpha * 0.7})`);
          puddleGrad.addColorStop(1, `rgba(12, 10, 9, 0)`);
        }
        ctx.fillStyle = puddleGrad;
        ctx.beginPath();
        ctx.ellipse(this.lavaPuddleX, this.lavaPuddleY, rx, ry, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    } else if (state.skin === 'suit_wizard') {
      const cfg = SKIN_VFX_CONFIG.WIZARD;
      // Niebla púrpura suave alrededor del agua y del mago
      ctx.save();
      if (state.quality !== 'low') {
        const mistA = ctx.createRadialGradient(state.charX, state.charY - 70, 14, state.charX, state.charY - 70, 145);
        mistA.addColorStop(0, cfg.PALETTE.mistPurple);
        mistA.addColorStop(1, 'rgba(139, 92, 246, 0)');
        ctx.fillStyle = mistA;
        ctx.beginPath();
        ctx.arc(state.charX, state.charY - 70, 145, 0, Math.PI * 2);
        ctx.fill();
      }

      const mistB = ctx.createRadialGradient(state.holeX, state.holeY, 10, state.holeX, state.holeY, 115);
      mistB.addColorStop(0, 'rgba(34, 211, 238, 0.14)');
      mistB.addColorStop(0.55, cfg.PALETTE.mistPurple);
      mistB.addColorStop(1, 'rgba(139, 92, 246, 0)');
      ctx.fillStyle = mistB;
      ctx.beginPath();
      ctx.ellipse(state.holeX, state.holeY, 115, 48, 0, 0, Math.PI * 2);
      ctx.fill();

      // Runas brillantes sobre el agua en el punto de la picada
      if (state.phase === 'BITING') {
        const ringR = 54 + Math.sin(state.elapsed * 14) * 5;
        for (let i = 0; i < 6; i++) {
          const ang = state.elapsed * 3.8 + (i * Math.PI * 2) / 6;
          drawArcaneRune(
            ctx,
            state.holeX + Math.cos(ang) * ringR,
            state.holeY + 2 + Math.sin(ang) * (ringR * 0.38),
            7.2,
            i,
            i % 2 === 0 ? cfg.PALETTE.brightCyan : cfg.PALETTE.starGold,
            0.92
          );
        }
      }

      // Portal Arcano brillante sobre el agua al capturar
      if (state.phase === 'CAUGHT' && !state.inBuildup && state.revealElapsed < cfg.PORTAL_OPEN_DURATION_SEC) {
        const pProg = state.revealElapsed / cfg.PORTAL_OPEN_DURATION_SEC;
        const openScale =
          pProg < 0.18
            ? easeOutBack(pProg / 0.18)
            : pProg > 0.78
              ? Math.max(0, 1 - (pProg - 0.78) / 0.22)
              : 1;
        const prx = 74 * openScale;
        const pry = 28 * openScale;
        if (prx > 2) {
          const portalGrad = ctx.createRadialGradient(state.holeX, state.holeY, 2, state.holeX, state.holeY, prx);
          portalGrad.addColorStop(0, 'rgba(236, 254, 255, 0.95)');
          portalGrad.addColorStop(0.38, 'rgba(34, 211, 238, 0.75)');
          portalGrad.addColorStop(0.72, 'rgba(139, 92, 246, 0.55)');
          portalGrad.addColorStop(1, 'rgba(15, 23, 42, 0)');
          ctx.fillStyle = portalGrad;
          ctx.beginPath();
          ctx.ellipse(state.holeX, state.holeY, prx, pry, 0, 0, Math.PI * 2);
          ctx.fill();

          ctx.strokeStyle = cfg.PALETTE.brightCyan;
          ctx.lineWidth = 2.4;
          ctx.beginPath();
          ctx.ellipse(state.holeX, state.holeY, prx * 0.9, pry * 0.9, 0, 0, Math.PI * 2);
          ctx.stroke();

          for (let r = 0; r < 6; r++) {
            const ang = state.elapsed * 4.5 + (r * Math.PI * 2) / 6;
            drawArcaneRune(
              ctx,
              state.holeX + Math.cos(ang) * prx * 0.78,
              state.holeY + Math.sin(ang) * pry * 0.78,
              6.5 * openScale,
              r,
              cfg.PALETTE.etherealWhite,
              0.9 * openScale
            );
          }
        }
      }
      ctx.restore();
    }

    // Ondas activas sobre el agua (anillos de lava, ondas doradas, círculos mágicos)
    for (let i = 0; i < this.rings.length; i++) {
      const r = this.rings[i];
      if (!r.active || r.kind === 'heat_shockwave') continue;
      const prog = clamp01(r.life / r.maxLife);
      const ease = easeOutCubic(prog);
      const rx = r.startRx + (r.endRx - r.startRx) * ease;
      const ry = rx * 0.37;
      const alpha = (1 - prog) * 0.88;

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = r.color;
      ctx.lineWidth = r.lineWidth * (1 - prog * 0.45);
      ctx.beginPath();
      ctx.ellipse(r.x, r.y, rx, ry, 0, 0, Math.PI * 2);
      ctx.stroke();

      if (r.kind === 'magic_circle') {
        // Círculo interior con runas rotatorias sobre la superficie del agua
        ctx.strokeStyle = r.secondaryColor;
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.ellipse(r.x, r.y, rx * 0.68, ry * 0.68, 0, 0, Math.PI * 2);
        ctx.stroke();
        for (let k = 0; k < 4; k++) {
          const ang = r.rotation + prog * 2.2 + (k * Math.PI) / 2;
          drawArcaneRune(
            ctx,
            r.x + Math.cos(ang) * rx * 0.84,
            r.y + Math.sin(ang) * ry * 0.84,
            5.5,
            k,
            r.color,
            alpha
          );
        }
      }
      ctx.restore();
    }
  }

  // --------------------------------------------------------------------------
  // CAPA 2: PARTÍCULAS (humo, vapor, burbujas, rocas, monedas, billetes, confeti)
  // --------------------------------------------------------------------------

  public renderParticlesLayer(ctx: CanvasRenderingContext2D, state: SkinFrameState) {
    if (state.skin === 'none') return;

    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      if (!p.active || p.layer !== 'particle') continue;
      const prog = clamp01(p.life / p.maxLife);
      const fade = prog < 0.15 ? prog / 0.15 : 1 - (prog - 0.15) / 0.85;
      const alpha = Math.max(0, p.alpha * fade);
      if (alpha <= 0.01) continue;

      if (p.kind === 'smoke' || p.kind === 'steam') {
        const rad = p.size * (0.7 + prog * 0.75);
        ctx.globalAlpha = alpha;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, rad, 0, Math.PI * 2);
        ctx.fill();
        continue;
      }

      if (p.kind === 'boil_bubble') {
        const rad = p.size * (0.8 + Math.sin(prog * Math.PI) * 0.35);
        ctx.globalAlpha = alpha;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, rad, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = p.secondaryColor;
        ctx.beginPath();
        ctx.arc(p.x - rad * 0.28, p.y - rad * 0.28, rad * 0.32, 0, Math.PI * 2);
        ctx.fill();
        continue;
      }

      ctx.save();
      ctx.globalAlpha = alpha;

      switch (p.kind) {
        case 'volcanic_rock': {
          drawVolcanicRock(ctx, p.x, p.y, p.size, p.rotation);
          break;
        }
        case 'coin': {
          drawSpinningCoin(ctx, p.x, p.y, p.size, p.spinPhase, p.color, p.secondaryColor);
          break;
        }
        case 'bill': {
          drawBanknote(ctx, p.x, p.y, p.size, p.rotation, p.spinPhase);
          break;
        }
        case 'confetti': {
          const tilt = Math.cos(p.spinPhase);
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rotation);
          ctx.fillStyle = p.color;
          ctx.fillRect(-p.size * 0.65, -p.size * 0.35 * tilt, p.size * 1.3, Math.max(1.5, p.size * 0.7 * Math.abs(tilt)));
          break;
        }
        default:
          break;
      }

      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }

  // --------------------------------------------------------------------------
  // CAPA 3: BRILLO (mezcla aditiva 'lighter', halos, shockwaves, esfera arcana)
  // --------------------------------------------------------------------------

  public renderGlowLayer(ctx: CanvasRenderingContext2D, state: SkinFrameState) {
    if (state.skin === 'none') return;

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    // Partículas luminosas (brasas, gotas de lava, polvo estelar, luciérnagas, recomposición)
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      if (!p.active || p.layer !== 'glow') continue;
      const prog = clamp01(p.life / p.maxLife);
      const env =
        p.kind === 'recompose_mote'
          ? Math.sin(prog * Math.PI)
          : prog < 0.2
            ? prog / 0.2
            : 1 - (prog - 0.2) / 0.8;
      const alpha = Math.max(0, p.alpha * env);
      if (alpha <= 0.01) continue;

      if (p.kind === 'firefly') {
        const pulse = 0.55 + 0.45 * Math.sin(p.spinPhase);
        const rad = p.size * 2.5 * pulse;
        ctx.globalAlpha = alpha * 0.32 * pulse;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, rad, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = alpha * 0.85 * pulse;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(p.x, p.y, rad * 0.4, 0, Math.PI * 2);
        ctx.fill();
      } else {
        const rad = p.size * (p.kind === 'lava_blob' ? 1.5 : 1.25);
        ctx.globalAlpha = alpha;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, rad, 0, Math.PI * 2);
        ctx.fill();
        if (state.quality !== 'low' && (p.kind === 'lava_blob' || p.kind === 'recompose_mote')) {
          ctx.globalAlpha = alpha * 0.45;
          ctx.fillStyle = p.secondaryColor;
          ctx.beginPath();
          ctx.arc(p.x, p.y, rad * 1.9, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // Ondas expansivas de calor (Magma "Erupción Volcánica")
    for (let i = 0; i < this.rings.length; i++) {
      const r = this.rings[i];
      if (!r.active || r.kind !== 'heat_shockwave') continue;
      const prog = clamp01(r.life / r.maxLife);
      const rx = r.startRx + (r.endRx - r.startRx) * easeOutCubic(prog);
      ctx.globalAlpha = (1 - prog) * 0.85;
      ctx.strokeStyle = r.color;
      ctx.lineWidth = r.lineWidth * (1 - prog * 0.6);
      ctx.beginPath();
      ctx.ellipse(r.x, r.y, rx, rx * 0.42, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Halos especiales sobre el pez capturado
    if (state.phase === 'CAUGHT' && !state.inBuildup) {
      const cx = state.width * 0.5;
      const cy = state.height * 0.46;

      if (state.skin === 'suit_wizard') {
        // Esfera de energía envolviendo al pez + destello al recomponerse en inventario
        const xform = this.getCatchVisualTransform(state);
        const sx = cx + xform.offsetX;
        const sy = cy + xform.offsetY;
        const sphereR = 112 * xform.scale * (1 + Math.sin(state.elapsed * 6) * 0.05);
        const sphereGrad = ctx.createRadialGradient(sx, sy, sphereR * 0.3, sx, sy, sphereR);
        sphereGrad.addColorStop(0, 'rgba(34, 211, 238, 0.08)');
        sphereGrad.addColorStop(0.75, 'rgba(139, 92, 246, 0.32)');
        sphereGrad.addColorStop(1, 'rgba(34, 211, 238, 0)');
        ctx.globalAlpha = xform.alpha;
        ctx.fillStyle = sphereGrad;
        ctx.beginPath();
        ctx.arc(sx, sy, sphereR, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = 'rgba(34, 211, 238, 0.72)';
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.arc(sx, sy, sphereR * 0.86, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    if (this.inventoryRecomposeFlash > 0.01) {
      const ix = state.width * 0.62;
      const iy = 36;
      const fg = ctx.createRadialGradient(ix, iy, 2, ix, iy, 42 * this.inventoryRecomposeFlash + 14);
      fg.addColorStop(0, `rgba(236, 254, 255, ${this.inventoryRecomposeFlash * 0.9})`);
      fg.addColorStop(0.5, `rgba(34, 211, 238, ${this.inventoryRecomposeFlash * 0.55})`);
      fg.addColorStop(1, 'rgba(139, 92, 246, 0)');
      ctx.globalAlpha = 1;
      ctx.fillStyle = fg;
      ctx.beginPath();
      ctx.arc(ix, iy, 56, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  // --------------------------------------------------------------------------
  // CAPA 4: DESTELLO (4 puntas, flash picada, rayo crítico, contador dinero)
  // --------------------------------------------------------------------------

  public renderFlashLayer(ctx: CanvasRenderingContext2D, state: SkinFrameState) {
    if (state.skin === 'none') return;

    // 1. Destellos tipo diamante (4 puntas) y diamantes de Jackpot
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      if (!p.active || p.layer !== 'flash') continue;
      const prog = clamp01(p.life / p.maxLife);
      const env = Math.sin(prog * Math.PI);
      const alpha = Math.max(0, p.alpha * env);
      if (alpha <= 0.01) continue;

      ctx.save();
      ctx.globalAlpha = alpha;
      if (p.kind === 'diamond_star') {
        ctx.fillStyle = p.color;
        drawFourPointStar(ctx, p.x, p.y, p.size * (0.55 + 0.65 * env), p.rotation);
      } else if (p.kind === 'diamond_gem') {
        drawDiamondGem(ctx, p.x, p.y, p.size, p.rotation);
      }
      ctx.restore();
    }

    // 2. Flash radial breve al picar (destello dorado / rojo volcánico / cian cristal)
    if (this.biteFlashAlpha > 0.01) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = this.biteFlashAlpha;
      const fg = ctx.createRadialGradient(state.holeX, state.holeY, 4, state.holeX, state.holeY, 130);
      fg.addColorStop(0, '#ffffff');
      fg.addColorStop(0.35, this.biteFlashColor);
      fg.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = fg;
      ctx.beginPath();
      ctx.arc(state.holeX, state.holeY, 130, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // 3. Efectos de texto/rayos en captura: Contador de Lluvia de Fortuna, Jackpot y Rayo Arcano
    if (state.phase === 'CAUGHT' && !state.inBuildup) {
      const t = state.revealElapsed;
      const cx = state.width * 0.5;

      if (state.skin === 'suit_millionaire') {
        const cfg = SKIN_VFX_CONFIG.MILLIONAIRE;
        const countProg = easeOutCubic(t / cfg.COUNTER_DURATION_SEC);
        const shownCoins = Math.round(this.currentCatchValue * countProg);
        const counterY = Math.min(state.height - 54, state.height * 0.78);

        ctx.save();
        ctx.textAlign = 'center';
        if (this.currentJackpot) {
          const jScale = t < 0.35 ? easeOutBack(t / 0.35) : 1 + Math.sin(state.elapsed * 8) * 0.04;
          ctx.save();
          ctx.translate(cx, counterY - 38);
          ctx.scale(jScale, jScale);
          ctx.font = '900 28px Outfit, sans-serif';
          ctx.lineWidth = 6;
          ctx.strokeStyle = '#090d16';
          ctx.strokeText('💎 JACKPOT! 💎', 0, 0);
          ctx.fillStyle = '#38bdf8';
          ctx.fillText('💎 JACKPOT! 💎', 0, 0);
          ctx.restore();
        }

        ctx.font = '800 30px Outfit, sans-serif';
        ctx.lineWidth = 6;
        ctx.strokeStyle = '#090d16';
        const label = `+$${formatNumber(shownCoins, state.lang)}`;
        ctx.strokeText(label, cx, counterY);
        ctx.fillStyle = '#facc15';
        ctx.fillText(label, cx, counterY);
        ctx.restore();
      } else if (state.skin === 'suit_wizard' && this.currentCriticalSpell) {
        // Rayo arcano para peces raros o superiores ("Hechizo Crítico")
        if (t < 0.72) {
          const boltAlpha = t < 0.12 ? t / 0.12 : 1 - (t - 0.12) / 0.6;
          ctx.save();
          ctx.globalCompositeOperation = 'lighter';
          ctx.globalAlpha = Math.max(0, boltAlpha);
          ctx.strokeStyle = '#ecfeff';
          ctx.lineWidth = 4.2;
          ctx.beginPath();
          let bx = state.holeX;
          let by = 0;
          ctx.moveTo(bx, by);
          const steps = 8;
          for (let s = 1; s <= steps; s++) {
            const frac = s / steps;
            bx = state.holeX + Math.sin(s * 17.3 + Math.floor(t * 24)) * 26 * (1 - frac * 0.5);
            by = state.holeY * frac;
            ctx.lineTo(bx, by);
          }
          ctx.stroke();

          ctx.strokeStyle = SKIN_VFX_CONFIG.WIZARD.PALETTE.brightCyan;
          ctx.lineWidth = 9;
          ctx.globalAlpha = Math.max(0, boltAlpha * 0.45);
          ctx.stroke();
          ctx.restore();
        }

        if (t < 1.8) {
          const labelAlpha = t < 0.2 ? t / 0.2 : t > 1.35 ? (1.8 - t) / 0.45 : 1;
          ctx.save();
          ctx.globalAlpha = Math.max(0, labelAlpha);
          ctx.textAlign = 'center';
          ctx.font = '900 24px Outfit, sans-serif';
          ctx.lineWidth = 5;
          ctx.strokeStyle = '#0f172a';
          const critText = state.lang === 'en' ? '⚡ CRITICAL SPELL!' : '⚡ ¡HECHIZO CRÍTICO!';
          const critY = Math.min(state.height - 54, state.height * 0.77);
          ctx.strokeText(critText, cx, critY);
          ctx.fillStyle = '#22d3ee';
          ctx.fillText(critText, cx, critY);
          ctx.restore();
        }
      }
    }
  }
}

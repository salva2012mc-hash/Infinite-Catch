import { memo, useEffect, useRef } from 'react';
import {
  FishingPhase,
  FishingState,
  stepFishingState,
  TIMING,
} from './fishingLogic';
import { CaughtPokemon, Rarity, formatFishWeight } from './pokemonData';
import {
  CUSTOM_FISH_IMAGES,
  getCachedCleanFishCanvas,
  loadCleanFishCanvas,
  loadMagmaSkullSprites,
} from './RealisticFishThumb';
import { sound } from './sound';
import { SHIRT_COLORS, PANTS_COLORS } from './CosmeticVisuals';
import { Language, formatOddsOneIn, getFishName } from './i18n';
import {
  ActiveSkinId,
  SkinEffectsEngine,
  SkinFrameState,
  drawMagmaVolcanicRod,
  drawMillionaireGoldRod,
  drawWizardCrystalWand,
} from './skinEffects';
import { FightTelemetry, getRarityFightProfile } from './fightPhysics';
import { WormBaitId } from './levelSystem';

function drawFishingLineWorm(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  wormId: WormBaitId,
  elapsed: number,
  phase: FishingPhase,
  isFighting: boolean
): void {
  ctx.save();
  ctx.translate(x, y);

  const wriggleSpeed = isFighting || phase === 'BITING' ? 14 : phase === 'WAITING' ? 6.5 : 4.2;
  const wriggleAmp = isFighting || phase === 'BITING' ? 3.2 : 2.1;

  // Subtle aura behind special worms so they stand out crisply against water or lava
  if (wormId === 'worm_luck5') {
    ctx.fillStyle = 'rgba(45, 212, 191, 0.26)';
    ctx.beginPath();
    ctx.arc(0, 3, 12, 0, Math.PI * 2);
    ctx.fill();
  } else if (wormId === 'worm_korean') {
    ctx.fillStyle = 'rgba(251, 191, 36, 0.22)';
    ctx.beginPath();
    ctx.arc(0, 3, 11, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.fillStyle = 'rgba(244, 63, 94, 0.18)';
    ctx.beginPath();
    ctx.arc(0, 3, 10, 0, Math.PI * 2);
    ctx.fill();
  }

  // Steel fishing hook & eyelet attached to the line at (0, 0)
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 1.7;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(0, -1.5, 1.8, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(0, 0.3);
  ctx.lineTo(0, 7.5);
  ctx.arc(2.6, 7.5, 2.6, Math.PI, 0, true);
  ctx.lineTo(5.2, 5.2);
  ctx.stroke();

  // Segmented wriggling worm body threaded on the hook
  const segCount = 7;
  for (let i = segCount - 1; i >= 0; i--) {
    const t = i / (segCount - 1);
    const wave = Math.sin(elapsed * wriggleSpeed - i * 0.85) * wriggleAmp;
    const sx = (t - 0.38) * 11 + wave * 0.55;
    const sy = -1 + t * 11.5 + Math.cos(elapsed * wriggleSpeed - i * 0.7) * 0.9;
    const radius = i === 0 ? 3.2 : i === 2 ? 3.5 : Math.max(1.9, 3.3 - t * 1.25);

    if (wormId === 'worm_korean') {
      // Natural golden-amber Korean ragworm with tiny side bristles (parapodia)
      ctx.strokeStyle = '#fde047';
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.moveTo(sx - radius - 1.6, sy - 0.5);
      ctx.lineTo(sx + radius + 1.6, sy + 0.5);
      ctx.stroke();

      ctx.fillStyle = i === 2 ? '#fef08a' : i % 2 === 0 ? '#f59e0b' : '#d97706';
      ctx.strokeStyle = '#78350f';
    } else if (wormId === 'worm_luck5') {
      // Bioluminescent turquoise & gold high-tide worm
      ctx.fillStyle = i === 2 ? '#fde047' : i % 2 === 0 ? '#2dd4bf' : '#0d9488';
      ctx.strokeStyle = '#042f2e';
    } else {
      // Classic coral-crimson Harbor Worm
      ctx.fillStyle = i === 2 ? '#fecdd3' : i % 2 === 0 ? '#fb7185' : '#e11d48';
      ctx.strokeStyle = '#881337';
    }

    ctx.lineWidth = 1.15;
    ctx.beginPath();
    ctx.arc(sx, sy, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Gloss highlight on upper segments
    if (i <= 3) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
      ctx.beginPath();
      ctx.arc(sx - radius * 0.3, sy - radius * 0.3, radius * 0.32, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Signature micro-sparkle for Tide Worm x5
  if (wormId === 'worm_luck5') {
    const spX = 6.5 + Math.cos(elapsed * 5) * 1.5;
    const spY = -3.5 + Math.sin(elapsed * 5) * 1.5;
    ctx.fillStyle = '#fde047';
    ctx.beginPath();
    ctx.moveTo(spX, spY - 3);
    ctx.lineTo(spX + 1, spY - 1);
    ctx.lineTo(spX + 3, spY);
    ctx.lineTo(spX + 1, spY + 1);
    ctx.lineTo(spX, spY + 3);
    ctx.lineTo(spX - 1, spY + 1);
    ctx.lineTo(spX - 3, spY);
    ctx.lineTo(spX - 1, spY - 1);
    ctx.closePath();
    ctx.fill();
  }

  ctx.restore();
}

export type GameMode = 'title' | 'playing' | 'paused';
export type GraphicsQuality = 'low' | 'normal' | 'rtx';

export interface WizardRayConfig {
  intensity: number; // 1..7
  heightRatio: number; // fraction of canvas height shooting upward
  beamWidth: number;
  boltCount: number;
  ringCount: number;
  sparkCount: number;
  skyGlowAlpha: number;
  coreColor: string;
  outerColor: string;
  secondaryColor: string;
  rgbOuter: string;
  rgbSecondary: string;
}

export function getWizardRayConfig(rarity?: Rarity): WizardRayConfig {
  switch (rarity) {
    case 'Secreto Abisal':
      return {
        intensity: 7,
        heightRatio: 1.08,
        beamWidth: 64,
        boltCount: 8,
        ringCount: 7,
        sparkCount: 52,
        skyGlowAlpha: 0.44,
        coreColor: '#ecfeff',
        outerColor: '#06b6d4',
        secondaryColor: '#38bdf8',
        rgbOuter: '6, 182, 212',
        rgbSecondary: '56, 189, 248',
      };
    case 'Secreto':
      return {
        intensity: 6,
        heightRatio: 1.02,
        beamWidth: 52,
        boltCount: 6,
        ringCount: 6,
        sparkCount: 42,
        skyGlowAlpha: 0.38,
        coreColor: '#ffffff',
        outerColor: '#e2e8f0',
        secondaryColor: '#fde047',
        rgbOuter: '226, 232, 240',
        rgbSecondary: '253, 224, 71',
      };
    case 'Legendaria':
      return {
        intensity: 5,
        heightRatio: 0.96,
        beamWidth: 42,
        boltCount: 5,
        ringCount: 5,
        sparkCount: 34,
        skyGlowAlpha: 0.32,
        coreColor: '#fefce8',
        outerColor: '#facc15',
        secondaryColor: '#fb923c',
        rgbOuter: '250, 204, 21',
        rgbSecondary: '251, 146, 60',
      };
    case 'Mítica':
      return {
        intensity: 4,
        heightRatio: 0.84,
        beamWidth: 32,
        boltCount: 4,
        ringCount: 4,
        sparkCount: 26,
        skyGlowAlpha: 0.25,
        coreColor: '#fef2f2',
        outerColor: '#ef4444',
        secondaryColor: '#fb7185',
        rgbOuter: '239, 68, 68',
        rgbSecondary: '251, 113, 133',
      };
    case 'Épica':
      return {
        intensity: 3,
        heightRatio: 0.72,
        beamWidth: 24,
        boltCount: 3,
        ringCount: 3,
        sparkCount: 20,
        skyGlowAlpha: 0.19,
        coreColor: '#faf5ff',
        outerColor: '#a855f7',
        secondaryColor: '#e879f9',
        rgbOuter: '168, 85, 247',
        rgbSecondary: '232, 121, 249',
      };
    case 'Rara':
      return {
        intensity: 2,
        heightRatio: 0.56,
        beamWidth: 16,
        boltCount: 2,
        ringCount: 2,
        sparkCount: 14,
        skyGlowAlpha: 0.13,
        coreColor: '#f0f9ff',
        outerColor: '#0ea5e9',
        secondaryColor: '#67e8f9',
        rgbOuter: '14, 165, 233',
        rgbSecondary: '103, 232, 249',
      };
    case 'Común':
    default:
      return {
        intensity: 1,
        heightRatio: 0.42,
        beamWidth: 11,
        boltCount: 1,
        ringCount: 2,
        sparkCount: 9,
        skyGlowAlpha: 0.08,
        coreColor: '#f0f9ff',
        outerColor: '#38bdf8',
        secondaryColor: '#93c5fd',
        rgbOuter: '56, 189, 248',
        rgbSecondary: '147, 197, 253',
      };
  }
}

function drawFemaleShopkeeperFullBody(
  ctx: CanvasRenderingContext2D,
  x: number,
  counterY: number,
  scale: number,
  elapsed: number,
  isLow: boolean,
  pass: 'body' | 'hands_overlay',
  isUnderworld = false
) {
  const breath = Math.sin(elapsed * 2.1) * 0.9;
  const handWave = Math.sin(elapsed * 2.4) * 1.1;
  const blinkCycle = (elapsed + 1.35) % 4.4;
  const isBlinking = blinkCycle > 4.26;

  ctx.save();
  ctx.translate(x, counterY);
  ctx.scale(scale, scale);

  if (pass === 'body') {
    // Warm recessed shadow + volcanic ember backlight inside the wooden stall
    const boothGlow = ctx.createRadialGradient(0, -28, 4, 0, -24, 34);
    if (isUnderworld) {
      boothGlow.addColorStop(0, 'rgba(38, 9, 6, 0.56)');
      boothGlow.addColorStop(0.65, 'rgba(185, 28, 28, 0.16)');
      boothGlow.addColorStop(1, 'rgba(12, 5, 4, 0)');
    } else {
      boothGlow.addColorStop(0, 'rgba(12, 8, 5, 0.48)');
      boothGlow.addColorStop(1, 'rgba(12, 8, 5, 0)');
    }
    ctx.fillStyle = boothGlow;
    ctx.beginPath();
    ctx.arc(0, -24, 34, 0, Math.PI * 2);
    ctx.fill();

    // Flowing back hair behind shoulders & side ponytail tail
    ctx.fillStyle = isUnderworld ? '#431910' : '#4c2612';
    ctx.beginPath();
    ctx.ellipse(0, -41 + breath * 0.5, 13.0, 13.8, 0, 0, Math.PI * 2);
    ctx.fill();
    // Side ponytail draping over right shoulder
    ctx.beginPath();
    ctx.moveTo(8.5, -45 + breath * 0.5);
    ctx.quadraticCurveTo(18.0, -40 + breath * 0.6, 16.0 + Math.sin(elapsed * 1.8) * 0.7, -24.5 + breath);
    ctx.quadraticCurveTo(11.5, -23.5 + breath, 9.5, -34 + breath * 0.6);
    ctx.closePath();
    ctx.fill();
    // Soft left hair lock framing neck
    ctx.beginPath();
    ctx.moveTo(-9.5, -41 + breath * 0.5);
    ctx.quadraticCurveTo(-13.8, -33 + breath * 0.6, -11.5, -26 + breath * 0.7);
    ctx.quadraticCurveTo(-8.8, -27 + breath * 0.6, -8.5, -35 + breath * 0.5);
    ctx.closePath();
    ctx.fill();
    // Hair tie ribbon
    ctx.fillStyle = isUnderworld ? '#ef4444' : '#d97706';
    ctx.beginPath();
    ctx.ellipse(10.8, -43.5 + breath * 0.5, 2.5, 1.6, 0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fde047';
    ctx.beginPath();
    ctx.arc(10.8, -43.5 + breath * 0.5, 0.8, 0, Math.PI * 2);
    ctx.fill();

    // Lower body: hips & outdoor trousers (tucked behind the wooden counter)
    ctx.fillStyle = isUnderworld ? '#261815' : '#2d3b4e';
    ctx.beginPath();
    ctx.roundRect(-11.5, -2 + breath * 0.3, 10.5, 28, 3);
    ctx.roundRect(1, -2 + breath * 0.3, 10.5, 28, 3);
    ctx.fill();
    ctx.fillStyle = isUnderworld ? '#1c1210' : '#233040';
    ctx.beginPath();
    ctx.roundRect(-12, -4 + breath * 0.4, 24, 9, 3);
    ctx.fill();
    // Leather waist belt + brass buckle
    ctx.fillStyle = '#5c3317';
    ctx.fillRect(-12, -5.5 + breath * 0.4, 24, 3.2);
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(-2.4, -5.8 + breath * 0.4, 4.8, 3.8);

    // Back upper arms (shirt sleeves angling out from shoulders to elbows)
    const torsoTopY = -33 + breath;
    const sleeveFill = isUnderworld ? '#d4b499' : '#cbb392';
    const drawArmSleeve = (side: -1 | 1) => {
      const shX = side * 11.5;
      const shY = torsoTopY + 5.5;
      const elX = side * 18.2;
      const elY = torsoTopY + 18.5;
      const wrX = side * (side === -1 ? 11.5 : 12.2);
      const wrY = side === -1 ? 0.5 + breath * 0.4 : -2.5 + handWave * 0.5 + breath * 0.4;

      // Upper sleeve
      ctx.strokeStyle = sleeveFill;
      ctx.lineWidth = 6.2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(shX, shY);
      ctx.lineTo(elX, elY);
      ctx.stroke();

      // Subtle dark outline on sleeve
      if (!isLow) {
        ctx.strokeStyle = isUnderworld ? 'rgba(28, 10, 6, 0.58)' : 'rgba(36, 20, 10, 0.52)';
        ctx.lineWidth = 7.4;
        ctx.globalCompositeOperation = 'source-over';
        ctx.beginPath();
        ctx.moveTo(shX, shY);
        ctx.lineTo(elX, elY);
        ctx.stroke();

        ctx.strokeStyle = sleeveFill;
        ctx.lineWidth = 5.4;
        ctx.beginPath();
        ctx.moveTo(shX, shY);
        ctx.lineTo(elX, elY);
        ctx.stroke();
      }

      // Forearm (rolled sleeve -> warm skin forearm towards counter)
      ctx.strokeStyle = isUnderworld ? 'rgba(28, 10, 6, 0.54)' : 'rgba(36, 20, 10, 0.48)';
      ctx.lineWidth = 5.6;
      ctx.beginPath();
      ctx.moveTo(elX, elY);
      ctx.lineTo(wrX, wrY);
      ctx.stroke();

      ctx.strokeStyle = '#e5b887';
      ctx.lineWidth = 4.1;
      ctx.beginPath();
      ctx.moveTo(elX, elY);
      ctx.lineTo(wrX, wrY);
      ctx.stroke();

      // Rolled cuff at elbow
      ctx.fillStyle = isUnderworld ? '#e2c5ab' : '#dfd0b8';
      ctx.beginPath();
      ctx.arc(elX, elY, 3.1, 0, Math.PI * 2);
      ctx.fill();
    };

    drawArmSleeve(-1);
    drawArmSleeve(1);

    // Torso: Collared warm blouse under tailored market apron-vest
    ctx.fillStyle = sleeveFill;
    ctx.beginPath();
    ctx.roundRect(-12.5, torsoTopY, 25, 29, [6, 6, 3, 3]);
    ctx.fill();

    // Subtle plaid lines on shirt collar/shoulders
    if (!isLow) {
      ctx.strokeStyle = isUnderworld ? 'rgba(124, 45, 18, 0.28)' : 'rgba(92, 58, 33, 0.28)';
      ctx.lineWidth = 0.9;
      ctx.beginPath();
      ctx.moveTo(-11, torsoTopY + 5);
      ctx.lineTo(11, torsoTopY + 5);
      ctx.moveTo(-6, torsoTopY + 1);
      ctx.lineTo(-6, torsoTopY + 10);
      ctx.moveTo(6, torsoTopY + 1);
      ctx.lineTo(6, torsoTopY + 10);
      ctx.stroke();
    }

    // Market apron / fishing vest over shirt (Volcanic crimson-ember in Underworld, Olive-teal in River)
    ctx.fillStyle = isUnderworld ? '#7f1d1d' : '#1c5a4f';
    ctx.beginPath();
    ctx.moveTo(-10.5, torsoTopY + 2);
    ctx.lineTo(-4.5, torsoTopY + 2);
    ctx.lineTo(0, torsoTopY + 9);
    ctx.lineTo(4.5, torsoTopY + 2);
    ctx.lineTo(10.5, torsoTopY + 2);
    ctx.lineTo(12, torsoTopY + 28.5);
    ctx.lineTo(-12, torsoTopY + 28.5);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = isUnderworld ? '#f59e0b' : '#0c2e28';
    ctx.lineWidth = isUnderworld ? 1.1 : 1.0;
    ctx.stroke();

    // Apron front pocket + trim
    ctx.fillStyle = isUnderworld ? '#5c1212' : '#15443c';
    ctx.beginPath();
    ctx.roundRect(-7.5, torsoTopY + 15, 15, 9.5, 2);
    ctx.fill();
    ctx.strokeStyle = isUnderworld ? '#d97706' : '#0d2b26';
    ctx.lineWidth = 0.85;
    ctx.stroke();

    // Small brass/gold vest buttons
    ctx.fillStyle = '#fbbf24';
    ctx.beginPath();
    ctx.arc(0, torsoTopY + 11.5, 1.05, 0, Math.PI * 2);
    ctx.arc(-5.5, torsoTopY + 6.5, 0.95, 0, Math.PI * 2);
    ctx.arc(5.5, torsoTopY + 6.5, 0.95, 0, Math.PI * 2);
    ctx.fill();

    // Neck
    ctx.fillStyle = '#cfa070';
    ctx.beginPath();
    ctx.roundRect(-3.6, torsoTopY - 4.8, 7.2, 6.8, 2);
    ctx.fill();

    // Head (matches game vendor/player stickman proportions, warm booth-lit skin)
    const headY = torsoTopY - 13.5;
    ctx.fillStyle = '#ecc090';
    ctx.beginPath();
    ctx.arc(0, headY, 10.6, 0, Math.PI * 2);
    ctx.fill();

    // Warm booth interior lighting gradient on face
    if (!isLow) {
      const faceShade = ctx.createLinearGradient(-10, headY - 10, 10, headY + 10);
      faceShade.addColorStop(0, isUnderworld ? 'rgba(45, 10, 6, 0.26)' : 'rgba(30, 16, 8, 0.24)');
      faceShade.addColorStop(0.55, 'rgba(255, 255, 255, 0)');
      faceShade.addColorStop(1, isUnderworld ? 'rgba(251, 146, 60, 0.28)' : 'rgba(254, 215, 130, 0.22)');
      ctx.fillStyle = faceShade;
      ctx.fill();
      ctx.strokeStyle = isUnderworld ? 'rgba(120, 42, 18, 0.5)' : 'rgba(92, 54, 28, 0.45)';
      ctx.lineWidth = 0.9;
      ctx.stroke();
    }

    // Small golden earrings on sides of head
    ctx.fillStyle = '#facc15';
    ctx.beginPath();
    ctx.arc(-10.3, headY + 2.1, 1.15, 0, Math.PI * 2);
    ctx.arc(10.3, headY + 2.1, 1.15, 0, Math.PI * 2);
    ctx.fill();

    // Chestnut / Dark-Auburn hair crown & parted bangs framing face
    ctx.fillStyle = isUnderworld ? '#542114' : '#5a2e16';
    ctx.beginPath();
    ctx.arc(0, headY - 2.2, 10.9, Math.PI * 0.96, Math.PI * 2.04);
    ctx.quadraticCurveTo(9.5, headY - 6, 4.2, headY - 5.2);
    ctx.quadraticCurveTo(1.5, headY - 8.2, -1.5, headY - 6.0);
    ctx.quadraticCurveTo(-7.2, headY - 5.2, -10.6, headY - 1.5);
    ctx.closePath();
    ctx.fill();

    // Warm hair highlight arc
    if (!isLow) {
      ctx.strokeStyle = isUnderworld ? 'rgba(249, 115, 22, 0.55)' : 'rgba(180, 118, 66, 0.55)';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.arc(-1, headY - 3, 7.8, Math.PI * 1.15, Math.PI * 1.72);
      ctx.stroke();
    }

    // Expressive stickman-style blinking eyes + delicate curved eyelashes
    const eyeY = headY - 0.6;
    if (isBlinking) {
      ctx.strokeStyle = '#1c120c';
      ctx.lineWidth = 1.3;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-5.2, eyeY);
      ctx.lineTo(-2.2, eyeY);
      ctx.moveTo(2.2, eyeY);
      ctx.lineTo(5.2, eyeY);
      ctx.stroke();
    } else {
      ctx.fillStyle = '#1c120c';
      ctx.beginPath();
      ctx.ellipse(-3.7, eyeY, 1.3, 1.9, 0, 0, Math.PI * 2);
      ctx.ellipse(3.7, eyeY, 1.3, 1.9, 0, 0, Math.PI * 2);
      ctx.fill();
      // Eye catchlights
      ctx.fillStyle = 'rgba(255, 250, 235, 0.9)';
      ctx.beginPath();
      ctx.arc(-4.1, eyeY - 0.65, 0.5, 0, Math.PI * 2);
      ctx.arc(3.3, eyeY - 0.65, 0.5, 0, Math.PI * 2);
      ctx.fill();
      // Expressive feminine eyelashes (two delicate lashes per eye)
      ctx.strokeStyle = '#26140c';
      ctx.lineWidth = 0.85;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-4.8, eyeY - 1.1);
      ctx.lineTo(-6.0, eyeY - 2.0);
      ctx.moveTo(-4.3, eyeY - 1.5);
      ctx.lineTo(-5.2, eyeY - 2.5);
      ctx.moveTo(4.8, eyeY - 1.1);
      ctx.lineTo(6.0, eyeY - 2.0);
      ctx.moveTo(4.3, eyeY - 1.5);
      ctx.lineTo(5.2, eyeY - 2.5);
      ctx.stroke();
    }

    // Soft arched eyebrows
    ctx.strokeStyle = isUnderworld ? '#431910' : '#4c2612';
    ctx.lineWidth = 0.95;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-5.3, eyeY - 3.2);
    ctx.quadraticCurveTo(-3.7, eyeY - 4.1, -2.1, eyeY - 3.2);
    ctx.moveTo(2.1, eyeY - 3.2);
    ctx.quadraticCurveTo(3.7, eyeY - 4.1, 5.3, eyeY - 3.2);
    ctx.stroke();

    // Rosy cheeks
    ctx.fillStyle = isUnderworld ? 'rgba(248, 113, 113, 0.30)' : 'rgba(239, 108, 108, 0.24)';
    ctx.beginPath();
    ctx.ellipse(-6.2, headY + 2.4, 2.1, 1.15, 0, 0, Math.PI * 2);
    ctx.ellipse(6.2, headY + 2.4, 2.1, 1.15, 0, 0, Math.PI * 2);
    ctx.fill();

    // Friendly warm smile
    ctx.strokeStyle = '#3b1d12';
    ctx.lineWidth = 1.3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(0, headY + 3.0, 3.1, 0.16 * Math.PI, 0.84 * Math.PI);
    ctx.stroke();

    // Soft awning cast shadow over top of booth interior so she blends into the stall depth
    const awningShade = ctx.createLinearGradient(0, headY - 14, 0, -4);
    awningShade.addColorStop(0, isUnderworld ? 'rgba(24, 8, 5, 0.36)' : 'rgba(18, 10, 5, 0.34)');
    awningShade.addColorStop(0.55, isUnderworld ? 'rgba(24, 8, 5, 0.12)' : 'rgba(18, 10, 5, 0.14)');
    awningShade.addColorStop(1, 'rgba(18, 10, 5, 0.04)');
    ctx.fillStyle = awningShade;
    ctx.beginPath();
    ctx.roundRect(-22, headY - 14, 44, 62, 8);
    ctx.fill();
  } else {
    // Pass 2: Hands resting naturally on the top back edge of the wooden counter
    const leftHandX = -11.5;
    const leftHandY = 0.8 + breath * 0.35;
    const rightHandX = 12.2;
    const rightHandY = -2.2 + handWave * 0.5 + breath * 0.35;

    // Subtle wood contact shadows under resting hands
    ctx.fillStyle = 'rgba(18, 10, 4, 0.38)';
    ctx.beginPath();
    ctx.ellipse(leftHandX, leftHandY + 2.2, 4.2, 1.5, 0, 0, Math.PI * 2);
    ctx.ellipse(rightHandX, rightHandY + 3.2, 3.8, 1.3, 0, 0, Math.PI * 2);
    ctx.fill();

    // Left hand resting on counter
    ctx.fillStyle = '#e7bb8b';
    ctx.strokeStyle = 'rgba(72, 42, 20, 0.55)';
    ctx.lineWidth = 0.85;
    ctx.beginPath();
    ctx.ellipse(leftHandX, leftHandY, 3.4, 2.5, 0.15, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Right hand resting/gesturing beside the counter
    ctx.fillStyle = '#e7bb8b';
    ctx.beginPath();
    ctx.ellipse(rightHandX, rightHandY, 3.3, 2.5, -0.25, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  ctx.restore();
}

function drawWizardUpwardRay(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  canvasWidth: number,
  canvasHeight: number,
  rayTime: number,
  elapsed: number,
  isBite: boolean,
  cfg: WizardRayConfig,
  quality: GraphicsQuality = 'normal'
) {
  const shootT = Math.min(1, rayTime / 0.22);
  const easeShoot = 1 - Math.pow(1 - shootT, 3);
  const fullHeight = canvasHeight * cfg.heightRatio;
  const currentHeight = Math.max(24, fullHeight * easeShoot);
  const topY = y - currentHeight;

  const surge = isBite ? 1.24 : 1;
  const pulse = (0.92 + Math.sin(elapsed * (10 + cfg.intensity * 2)) * 0.1) * surge;
  const beamW = cfg.beamWidth * pulse;
  const isLow = quality === 'low';
  const sparkLimit = isLow
    ? Math.ceil(cfg.sparkCount * 0.45)
    : quality === 'normal'
      ? Math.ceil(cfg.sparkCount * 0.75)
      : cfg.sparkCount;
  const boltLimit = isLow ? Math.max(2, Math.ceil(cfg.boltCount * 0.5)) : cfg.boltCount;

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';

  // 1. Subtle sky / atmosphere illumination for higher rarities
  if (cfg.skyGlowAlpha > 0 && !isLow) {
    const skyGrad = ctx.createRadialGradient(
      x,
      Math.max(0, topY + currentHeight * 0.22),
      10,
      x,
      Math.max(0, topY + currentHeight * 0.22),
      canvasWidth * (0.28 + cfg.intensity * 0.05)
    );
    skyGrad.addColorStop(0, `rgba(${cfg.rgbOuter}, ${cfg.skyGlowAlpha * surge * 0.65})`);
    skyGrad.addColorStop(0.5, `rgba(${cfg.rgbSecondary}, ${cfg.skyGlowAlpha * 0.28})`);
    skyGrad.addColorStop(1, `rgba(${cfg.rgbOuter}, 0)`);
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
  }

  // 2. Outer atmospheric pillar gradient shooting upward from the water
  const outerW = beamW * 2.7;
  const outerGrad = ctx.createLinearGradient(x, y, x, topY);
  outerGrad.addColorStop(0, `rgba(${cfg.rgbOuter}, ${0.58 * surge})`);
  outerGrad.addColorStop(0.45, `rgba(${cfg.rgbSecondary}, ${0.32 * surge})`);
  outerGrad.addColorStop(1, `rgba(${cfg.rgbOuter}, 0)`);
  ctx.fillStyle = outerGrad;
  ctx.fillRect(x - outerW * 0.5, topY, outerW, currentHeight);

  // 3. Main vibrant vertical beam
  const mainGrad = ctx.createLinearGradient(x, y, x, topY);
  mainGrad.addColorStop(0, `rgba(${cfg.rgbOuter}, 0.92)`);
  mainGrad.addColorStop(0.55, `rgba(${cfg.rgbSecondary}, 0.62)`);
  mainGrad.addColorStop(1, `rgba(${cfg.rgbOuter}, 0)`);
  ctx.fillStyle = mainGrad;
  ctx.beginPath();
  ctx.moveTo(x - beamW * 0.55, y);
  ctx.lineTo(x + beamW * 0.55, y);
  ctx.lineTo(x + beamW * 0.35, topY);
  ctx.lineTo(x - beamW * 0.35, topY);
  ctx.closePath();
  ctx.fill();

  // 4. White-hot blazing inner core
  const coreW = Math.max(3, beamW * 0.34);
  const coreGrad = ctx.createLinearGradient(x, y, x, topY + currentHeight * 0.08);
  coreGrad.addColorStop(0, '#ffffff');
  coreGrad.addColorStop(0.4, cfg.coreColor);
  coreGrad.addColorStop(1, `rgba(${cfg.rgbOuter}, 0)`);
  ctx.fillStyle = coreGrad;
  ctx.beginPath();
  ctx.moveTo(x - coreW * 0.55, y);
  ctx.lineTo(x + coreW * 0.55, y);
  ctx.lineTo(x + coreW * 0.28, topY + currentHeight * 0.08);
  ctx.lineTo(x - coreW * 0.28, topY + currentHeight * 0.08);
  ctx.closePath();
  ctx.fill();

  // 5. Water surface impact flare & expanding launch shockwave
  const flareGrad = ctx.createRadialGradient(x, y, 2, x, y, beamW * 2.1);
  flareGrad.addColorStop(0, '#ffffff');
  flareGrad.addColorStop(0.32, `rgba(${cfg.rgbSecondary}, 0.85)`);
  flareGrad.addColorStop(0.7, `rgba(${cfg.rgbOuter}, 0.35)`);
  flareGrad.addColorStop(1, `rgba(${cfg.rgbOuter}, 0)`);
  ctx.fillStyle = flareGrad;
  ctx.beginPath();
  ctx.ellipse(x, y, beamW * 2.1, beamW * 0.72, 0, 0, Math.PI * 2);
  ctx.fill();

  if (rayTime < 0.55) {
    const burstP = rayTime / 0.55;
    const burstR = (18 + cfg.intensity * 10) + burstP * (65 + cfg.intensity * 26);
    ctx.strokeStyle = `rgba(${cfg.rgbSecondary}, ${(1 - burstP) * 0.9})`;
    ctx.lineWidth = (2.5 + cfg.intensity * 0.5) * (1 - burstP * 0.6);
    ctx.beginPath();
    ctx.ellipse(x, y, burstR, burstR * 0.36, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  // 6. Ascending energy rings climbing up the ray
  for (let r = 0; r < cfg.ringCount; r++) {
    const rp = (rayTime * (1.35 + cfg.intensity * 0.14) + r / cfg.ringCount) % 1;
    const ryPos = y - rp * currentHeight * 0.92;
    const rxSize = beamW * (0.65 + rp * 0.75);
    const alpha = Math.sin(rp * Math.PI) * (0.45 + cfg.intensity * 0.07);
    ctx.strokeStyle = r % 2 === 0 ? `rgba(255, 255, 255, ${alpha})` : `rgba(${cfg.rgbSecondary}, ${alpha})`;
    ctx.lineWidth = 1.6 + cfg.intensity * 0.25;
    ctx.beginPath();
    ctx.ellipse(x, ryPos, rxSize, Math.max(4, rxSize * 0.28), 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  // 7. Jagged upward lightning bolts ("rayos") crackling skyward
  const tickStep = Math.floor(rayTime * (isBite ? 26 : 18));
  const segs = 7 + cfg.intensity;
  for (let b = 0; b < boltLimit; b++) {
    const spread = beamW * (0.55 + (b % 3) * 0.28);
    ctx.strokeStyle = b % 2 === 0 ? '#ffffff' : cfg.secondaryColor;
    ctx.lineWidth = b % 2 === 0 ? 1.8 + cfg.intensity * 0.28 : 1.3 + cfg.intensity * 0.2;
    ctx.globalAlpha = 0.72 + ((b + tickStep) % 3) * 0.09;
    ctx.beginPath();
    let prevBx = x + Math.sin(tickStep * 1.9 + b * 2.3) * (beamW * 0.22);
    let prevBy = y;
    ctx.moveTo(prevBx, prevBy);
    for (let s = 1; s <= segs; s++) {
      const frac = s / segs;
      const hash = Math.sin(tickStep * 12.9898 + b * 78.233 + s * 37.719);
      const bx = x + hash * spread * (0.6 + frac * 0.7);
      const by = y - frac * currentHeight * (0.88 + ((b % 2) * 0.12));
      ctx.lineTo(bx, by);

      // Forked lightning branches for higher rarities (Épica+ / Mítica+)
      if (cfg.intensity >= 4 && s >= 2 && s <= segs - 2 && (s + b + tickStep) % 4 === 0) {
        const dir = hash >= 0 ? 1 : -1;
        ctx.moveTo(bx, by);
        ctx.lineTo(bx + dir * (16 + cfg.intensity * 4), by - currentHeight * 0.08);
        ctx.moveTo(bx, by);
      }
      prevBx = bx;
      prevBy = by;
    }
    ctx.stroke();
  }

  // 8. Spiraling upward glowing magic sparks & star motes
  ctx.globalAlpha = 1;
  for (let sp = 0; sp < sparkLimit; sp++) {
    const speed = 0.65 + (sp % 5) * 0.22 + cfg.intensity * 0.08;
    const prog = (rayTime * speed + sp / sparkLimit) % 1;
    const sy = y - prog * currentHeight * 0.96;
    const orbit = (beamW * 0.4 + ((sp * 19) % Math.max(18, beamW * 1.4))) * (0.7 + prog * 0.5);
    const sx = x + Math.sin(rayTime * 4.5 + sp * 1.7 + prog * 5) * orbit;
    const sr = (1.6 + (sp % 3) * 0.9 + cfg.intensity * 0.22) * (1 - prog * 0.55);
    const sAlpha = Math.sin(prog * Math.PI) * 0.95;
    ctx.fillStyle =
      sp % 3 === 0
        ? `rgba(255, 255, 255, ${sAlpha})`
        : sp % 3 === 1
          ? `rgba(${cfg.rgbSecondary}, ${sAlpha})`
          : `rgba(${cfg.rgbOuter}, ${sAlpha})`;
    ctx.beginPath();
    ctx.arc(sx, sy, sr, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

export function getMillionaireRayConfig(rarity?: Rarity): WizardRayConfig {
  const base = getWizardRayConfig(rarity);
  return {
    ...base,
    coreColor: '#ffffff',
    outerColor: '#facc15',
    secondaryColor: '#38bdf8',
    rgbOuter: '250, 204, 21',
    rgbSecondary: '56, 189, 248',
  };
}

function drawMillionaireRay(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  canvasWidth: number,
  canvasHeight: number,
  rayTime: number,
  elapsed: number,
  isBite: boolean,
  cfg: WizardRayConfig,
  quality: GraphicsQuality = 'normal'
) {
  const shootT = Math.min(1, rayTime / 0.22);
  const easeShoot = 1 - Math.pow(1 - shootT, 3);
  const fullHeight = canvasHeight * cfg.heightRatio;
  const currentHeight = Math.max(24, fullHeight * easeShoot);
  const topY = y - currentHeight;

  const surge = isBite ? 1.24 : 1;
  const pulse = (0.92 + Math.sin(elapsed * (11 + cfg.intensity * 2)) * 0.1) * surge;
  const beamW = cfg.beamWidth * pulse;
  const isLow = quality === 'low';
  const sparkLimit = isLow
    ? Math.ceil(cfg.sparkCount * 0.45)
    : quality === 'normal'
      ? Math.ceil(cfg.sparkCount * 0.75)
      : cfg.sparkCount;

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';

  if (cfg.skyGlowAlpha > 0 && !isLow) {
    const skyGrad = ctx.createRadialGradient(
      x,
      Math.max(0, topY + currentHeight * 0.22),
      10,
      x,
      Math.max(0, topY + currentHeight * 0.22),
      canvasWidth * (0.28 + cfg.intensity * 0.05)
    );
    skyGrad.addColorStop(0, `rgba(${cfg.rgbOuter}, ${cfg.skyGlowAlpha * surge * 0.7})`);
    skyGrad.addColorStop(0.5, `rgba(${cfg.rgbSecondary}, ${cfg.skyGlowAlpha * 0.3})`);
    skyGrad.addColorStop(1, `rgba(${cfg.rgbOuter}, 0)`);
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
  }

  const outerW = beamW * 2.8;
  const outerGrad = ctx.createLinearGradient(x, y, x, topY);
  outerGrad.addColorStop(0, `rgba(${cfg.rgbOuter}, ${0.62 * surge})`);
  outerGrad.addColorStop(0.45, `rgba(${cfg.rgbSecondary}, ${0.35 * surge})`);
  outerGrad.addColorStop(1, `rgba(${cfg.rgbOuter}, 0)`);
  ctx.fillStyle = outerGrad;
  ctx.fillRect(x - outerW * 0.5, topY, outerW, currentHeight);

  const mainGrad = ctx.createLinearGradient(x, y, x, topY);
  mainGrad.addColorStop(0, `rgba(${cfg.rgbOuter}, 0.95)`);
  mainGrad.addColorStop(0.55, `rgba(${cfg.rgbSecondary}, 0.65)`);
  mainGrad.addColorStop(1, `rgba(${cfg.rgbOuter}, 0)`);
  ctx.fillStyle = mainGrad;
  ctx.beginPath();
  ctx.moveTo(x - beamW * 0.55, y);
  ctx.lineTo(x + beamW * 0.55, y);
  ctx.lineTo(x + beamW * 0.35, topY);
  ctx.lineTo(x - beamW * 0.35, topY);
  ctx.closePath();
  ctx.fill();

  const coreW = Math.max(3, beamW * 0.34);
  const coreGrad = ctx.createLinearGradient(x, y, x, topY + currentHeight * 0.08);
  coreGrad.addColorStop(0, '#ffffff');
  coreGrad.addColorStop(0.4, cfg.coreColor);
  coreGrad.addColorStop(1, `rgba(${cfg.rgbOuter}, 0)`);
  ctx.fillStyle = coreGrad;
  ctx.beginPath();
  ctx.moveTo(x - coreW * 0.55, y);
  ctx.lineTo(x + coreW * 0.55, y);
  ctx.lineTo(x + coreW * 0.28, topY + currentHeight * 0.08);
  ctx.lineTo(x - coreW * 0.28, topY + currentHeight * 0.08);
  ctx.closePath();
  ctx.fill();

  for (let r = 0; r < cfg.ringCount; r++) {
    const rp = (rayTime * (1.4 + cfg.intensity * 0.15) + r / cfg.ringCount) % 1;
    const ryPos = y - rp * currentHeight * 0.92;
    const rxSize = beamW * (0.65 + rp * 0.75);
    const alpha = Math.sin(rp * Math.PI) * (0.5 + cfg.intensity * 0.08);
    ctx.strokeStyle = r % 2 === 0 ? `rgba(255, 255, 255, ${alpha})` : `rgba(${cfg.rgbSecondary}, ${alpha})`;
    ctx.lineWidth = 1.8 + cfg.intensity * 0.25;
    ctx.beginPath();
    ctx.ellipse(x, ryPos, rxSize, Math.max(4, rxSize * 0.28), 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Sparkling diamond dust & gold coins
  for (let sp = 0; sp < sparkLimit; sp++) {
    const speed = 0.7 + (sp % 5) * 0.22 + cfg.intensity * 0.08;
    const prog = (rayTime * speed + sp / sparkLimit) % 1;
    const sy = y - prog * currentHeight * 0.96;
    const orbit = (beamW * 0.4 + ((sp * 19) % Math.max(18, beamW * 1.4))) * (0.7 + prog * 0.5);
    const sx = x + Math.sin(rayTime * 5 + sp * 1.7 + prog * 5) * orbit;
    const sr = (1.8 + (sp % 3) * 0.9 + cfg.intensity * 0.22) * (1 - prog * 0.55);
    const sAlpha = Math.sin(prog * Math.PI) * 0.95;
    ctx.fillStyle = sp % 2 === 0 ? `rgba(253, 224, 71, ${sAlpha})` : `rgba(56, 189, 248, ${sAlpha})`;
    ctx.beginPath();
    ctx.arc(sx, sy, sr, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

export function getMagmaRayConfig(rarity?: Rarity): WizardRayConfig {
  const base = getWizardRayConfig(rarity);
  return {
    ...base,
    coreColor: '#fef08a',
    outerColor: '#f97316',
    secondaryColor: '#ef4444',
    rgbOuter: '249, 115, 22',
    rgbSecondary: '239, 68, 68',
  };
}

function drawMagmaRay(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  canvasWidth: number,
  canvasHeight: number,
  rayTime: number,
  elapsed: number,
  isBite: boolean,
  cfg: WizardRayConfig,
  quality: GraphicsQuality = 'normal'
) {
  const shootT = Math.min(1, rayTime / 0.22);
  const easeShoot = 1 - Math.pow(1 - shootT, 3);
  const fullHeight = canvasHeight * cfg.heightRatio;
  const currentHeight = Math.max(24, fullHeight * easeShoot);
  const topY = y - currentHeight;

  const surge = isBite ? 1.25 : 1;
  const pulse = (0.92 + Math.sin(elapsed * (12 + cfg.intensity * 2)) * 0.12) * surge;
  const beamW = cfg.beamWidth * pulse;
  const isLow = quality === 'low';
  const sparkLimit = isLow
    ? Math.ceil(cfg.sparkCount * 0.45)
    : quality === 'normal'
      ? Math.ceil(cfg.sparkCount * 0.75)
      : cfg.sparkCount;

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';

  if (cfg.skyGlowAlpha > 0 && !isLow) {
    const skyGrad = ctx.createRadialGradient(
      x,
      Math.max(0, topY + currentHeight * 0.22),
      10,
      x,
      Math.max(0, topY + currentHeight * 0.22),
      canvasWidth * (0.28 + cfg.intensity * 0.05)
    );
    skyGrad.addColorStop(0, `rgba(${cfg.rgbOuter}, ${cfg.skyGlowAlpha * surge * 0.75})`);
    skyGrad.addColorStop(0.5, `rgba(${cfg.rgbSecondary}, ${cfg.skyGlowAlpha * 0.32})`);
    skyGrad.addColorStop(1, `rgba(${cfg.rgbOuter}, 0)`);
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
  }

  const outerW = beamW * 2.8;
  const outerGrad = ctx.createLinearGradient(x, y, x, topY);
  outerGrad.addColorStop(0, `rgba(${cfg.rgbOuter}, ${0.65 * surge})`);
  outerGrad.addColorStop(0.45, `rgba(${cfg.rgbSecondary}, ${0.38 * surge})`);
  outerGrad.addColorStop(1, `rgba(${cfg.rgbOuter}, 0)`);
  ctx.fillStyle = outerGrad;
  ctx.fillRect(x - outerW * 0.5, topY, outerW, currentHeight);

  const mainGrad = ctx.createLinearGradient(x, y, x, topY);
  mainGrad.addColorStop(0, `rgba(${cfg.rgbOuter}, 0.95)`);
  mainGrad.addColorStop(0.55, `rgba(${cfg.rgbSecondary}, 0.68)`);
  mainGrad.addColorStop(1, `rgba(${cfg.rgbOuter}, 0)`);
  ctx.fillStyle = mainGrad;
  ctx.beginPath();
  ctx.moveTo(x - beamW * 0.55, y);
  ctx.lineTo(x + beamW * 0.55, y);
  ctx.lineTo(x + beamW * 0.35, topY);
  ctx.lineTo(x - beamW * 0.35, topY);
  ctx.closePath();
  ctx.fill();

  const coreW = Math.max(3, beamW * 0.34);
  const coreGrad = ctx.createLinearGradient(x, y, x, topY + currentHeight * 0.08);
  coreGrad.addColorStop(0, '#ffffff');
  coreGrad.addColorStop(0.4, cfg.coreColor);
  coreGrad.addColorStop(1, `rgba(${cfg.rgbOuter}, 0)`);
  ctx.fillStyle = coreGrad;
  ctx.beginPath();
  ctx.moveTo(x - coreW * 0.55, y);
  ctx.lineTo(x + coreW * 0.55, y);
  ctx.lineTo(x + coreW * 0.28, topY + currentHeight * 0.08);
  ctx.lineTo(x - coreW * 0.28, topY + currentHeight * 0.08);
  ctx.closePath();
  ctx.fill();

  // Volcanic rising embers & lava sparks
  for (let sp = 0; sp < sparkLimit; sp++) {
    const speed = 0.75 + (sp % 5) * 0.22 + cfg.intensity * 0.08;
    const prog = (rayTime * speed + sp / sparkLimit) % 1;
    const sy = y - prog * currentHeight * 0.96;
    const orbit = (beamW * 0.4 + ((sp * 19) % Math.max(18, beamW * 1.4))) * (0.7 + prog * 0.5);
    const sx = x + Math.sin(rayTime * 6 + sp * 1.7 + prog * 5) * orbit;
    const sr = (1.8 + (sp % 3) * 0.9 + cfg.intensity * 0.22) * (1 - prog * 0.55);
    const sAlpha = Math.sin(prog * Math.PI) * 0.95;
    ctx.fillStyle = sp % 2 === 0 ? `rgba(253, 224, 71, ${sAlpha})` : `rgba(249, 115, 22, ${sAlpha})`;
    ctx.beginPath();
    ctx.arc(sx, sy, sr, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

function drawUnderworldObjectSprite(
  ctx: CanvasRenderingContext2D,
  id: number,
  cx: number,
  cy: number,
  elapsed: number
): boolean {
  ctx.save();
  ctx.translate(cx, cy);
  switch (id) {
    case 106: {
      // Obsidiana: faceted dark purple crystal shard
      ctx.fillStyle = '#1e1b4b';
      ctx.strokeStyle = '#c084fc';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, -64);
      ctx.lineTo(44, -18);
      ctx.lineTo(32, 52);
      ctx.lineTo(-28, 56);
      ctx.lineTo(-46, -12);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = 'rgba(168, 85, 247, 0.38)';
      ctx.beginPath();
      ctx.moveTo(0, -64);
      ctx.lineTo(44, -18);
      ctx.lineTo(4, 14);
      ctx.lineTo(-14, -22);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      return true;
    }
    case 107: {
      // Almas: glowing cyan/white spirit wisp
      const sway = Math.sin(elapsed * 5) * 6;
      const g = ctx.createRadialGradient(0, -6, 6, 0, -6, 64);
      g.addColorStop(0, '#e0f2fe');
      g.addColorStop(0.55, '#38bdf8');
      g.addColorStop(1, 'rgba(56,189,248,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(0, -6, 64, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#f0f9ff';
      ctx.beginPath();
      ctx.moveTo(0, -52);
      ctx.quadraticCurveTo(40, -24, 24, 22);
      ctx.quadraticCurveTo(10, 46, sway, 58);
      ctx.quadraticCurveTo(-18, 38, -28, 18);
      ctx.quadraticCurveTo(-40, -24, 0, -52);
      ctx.fill();
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(-10, -14, 4.5, 0, Math.PI * 2);
      ctx.arc(10, -14, 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      return true;
    }
    case 108: {
      // Madera quemada: charred log with glowing orange embers
      ctx.rotate(-0.18);
      ctx.fillStyle = '#451a03';
      ctx.strokeStyle = '#1c0a00';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.roundRect(-64, -24, 128, 48, 14);
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = '#f97316';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-40, -6);
      ctx.lineTo(-10, 8);
      ctx.lineTo(20, -10);
      ctx.lineTo(44, 6);
      ctx.stroke();
      ctx.fillStyle = '#fde047';
      ctx.beginPath();
      ctx.arc(-14, 6, 4, 0, Math.PI * 2);
      ctx.arc(24, -8, 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      return true;
    }
    case 109: {
      // Cadáveres: crossed weathered bones & ribs
      ctx.strokeStyle = '#334155';
      ctx.fillStyle = '#e2e8f0';
      ctx.lineWidth = 4;
      for (const ang of [-0.55, 0.55]) {
        ctx.save();
        ctx.rotate(ang);
        ctx.beginPath();
        ctx.roundRect(-56, -9, 112, 18, 8);
        ctx.fill();
        ctx.stroke();
        for (const sx of [-54, 54]) {
          ctx.beginPath();
          ctx.arc(sx, -8, 10, 0, Math.PI * 2);
          ctx.arc(sx, 8, 10, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        }
        ctx.restore();
      }
      ctx.restore();
      return true;
    }
    case 110: {
      // Cuernos: pair of curved crimson demon horns
      for (const dir of [-1, 1]) {
        ctx.save();
        ctx.scale(dir, 1);
        ctx.fillStyle = '#991b1b';
        ctx.strokeStyle = '#450a0a';
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.moveTo(14, 38);
        ctx.quadraticCurveTo(54, 22, 62, -46);
        ctx.quadraticCurveTo(38, -8, 22, 12);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }
      ctx.restore();
      return true;
    }
    case 111: {
      // Cenizas: dark ash mound with rising glowing embers
      ctx.fillStyle = '#334155';
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-66, 36);
      ctx.quadraticCurveTo(-22, -26, 0, -28);
      ctx.quadraticCurveTo(26, -24, 66, 36);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#64748b';
      ctx.beginPath();
      ctx.arc(-20, 12, 18, 0, Math.PI * 2);
      ctx.arc(16, 14, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fb923c';
      for (let i = 0; i < 6; i++) {
        const px = Math.sin(elapsed * 3 + i * 1.4) * 38;
        const py = -12 - ((elapsed * 28 + i * 15) % 44);
        ctx.beginPath();
        ctx.arc(px, py, 3.2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
      return true;
    }
    case 112: {
      // Alas de magma: spread fiery wings
      const flap = Math.sin(elapsed * 8) * 0.08;
      for (const dir of [-1, 1]) {
        ctx.save();
        ctx.scale(dir, 1);
        ctx.rotate(flap);
        ctx.fillStyle = '#ea580c';
        ctx.strokeStyle = '#fef08a';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(6, 12);
        ctx.quadraticCurveTo(46, -54, 78, -28);
        ctx.lineTo(62, 6);
        ctx.lineTo(42, 24);
        ctx.lineTo(18, 32);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }
      ctx.restore();
      return true;
    }
    case 113: {
      // Pergamino quemado: scorched ancient scroll with glowing rune
      ctx.fillStyle = '#b45309';
      ctx.strokeStyle = '#451a03';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.roundRect(-48, -42, 96, 84, 10);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#78350f';
      ctx.beginPath();
      ctx.roundRect(-56, -48, 112, 16, 8);
      ctx.roundRect(-56, 32, 112, 16, 8);
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = '#fde68a';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-22, -10);
      ctx.lineTo(22, -10);
      ctx.moveTo(0, -22);
      ctx.lineTo(0, 18);
      ctx.stroke();
      ctx.restore();
      return true;
    }
    case 114: {
      // Jabalí de fuego: blazing crimson fire boar with golden tusks
      const glow = ctx.createRadialGradient(0, 0, 10, 0, 0, 76);
      glow.addColorStop(0, 'rgba(250, 204, 21, 0.55)');
      glow.addColorStop(1, 'rgba(220, 38, 38, 0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(0, 0, 76, 0, Math.PI * 2);
      ctx.fill();
      // Flame mane
      ctx.fillStyle = '#f97316';
      ctx.beginPath();
      ctx.moveTo(-48, -16);
      ctx.lineTo(-28, -56);
      ctx.lineTo(-6, -34);
      ctx.lineTo(18, -58);
      ctx.lineTo(36, -30);
      ctx.lineTo(54, -44);
      ctx.lineTo(44, 12);
      ctx.closePath();
      ctx.fill();
      // Body
      ctx.fillStyle = '#b91c1c';
      ctx.strokeStyle = '#fde047';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(0, 6, 56, 36, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      // Tusks & eye
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.moveTo(-48, 16);
      ctx.quadraticCurveTo(-70, 6, -64, -14);
      ctx.quadraticCurveTo(-56, 4, -42, 8);
      ctx.fill();
      ctx.fillStyle = '#fde047';
      ctx.beginPath();
      ctx.arc(-28, -2, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      return true;
    }
    default:
      ctx.restore();
      return false;
  }
}

interface IceFishingCanvasProps {
  mode: GameMode;
  fishingStateRef: React.MutableRefObject<FishingState>;
  equippedCosmetics: string[];
  lastCaught: CaughtPokemon | null;
  pendingCatch: CaughtPokemon | null;
  onPhaseChange: (phase: FishingPhase, fishCount: number) => void;
  onCatchPokemon: () => void;
  onCanvasClick?: () => void;
  world?: 'river' | 'underworld';
  tutorialStep?: number;
  isMinigameOpen?: boolean;
  fightTelemetryRef?: React.MutableRefObject<FightTelemetry>;
  lang?: Language;
  graphicsQuality?: GraphicsQuality;
  scene?: 'dock' | 'market';
  onSceneChange?: (scene: 'dock' | 'market') => void;
  onOpenMarketStall?: (stall: 'sell' | 'rods' | 'pvp') => void;
  walkRequest?: { id: number; target: 'market' | 'dock' } | null;
  onWalkStateChange?: (isWalking: boolean) => void;
  tutorialHighlightedStall?: 'sell' | 'rods' | 'pvp' | null;
  activeWormId?: WormBaitId | null;
}

interface Snowflake {
  x: number;
  y: number;
  r: number;
  vy: number;
  vx: number;
  alpha: number;
}

interface SplashParticle {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  r: number;
  color: string;
}

interface WaterRipple {
  active: boolean;
  x: number;
  y: number;
  life: number;
  maxLife: number;
  startRx: number;
  endRx: number;
  lineWidth: number;
  color: string;
}

export const IceFishingCanvas = memo(function IceFishingCanvas({
  mode,
  fishingStateRef,
  equippedCosmetics,
  lastCaught,
  pendingCatch,
  onPhaseChange,
  onCatchPokemon,
  onCanvasClick,
  world = 'river',
  tutorialStep = 0,
  isMinigameOpen = false,
  fightTelemetryRef,
  lang = 'en',
  graphicsQuality = 'normal',
  scene = 'dock',
  onSceneChange,
  onOpenMarketStall,
  walkRequest = null,
  onWalkStateChange,
  tutorialHighlightedStall = null,
  activeWormId = null,
}: IceFishingCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const modeRef = useRef<GameMode>(mode);
  const equippedRef = useRef<string[]>(equippedCosmetics);
  const lastCaughtRef = useRef<CaughtPokemon | null>(lastCaught);
  const revealSoundPlayedRef = useRef<string | null>(null);
  const introSoundPlayedRef = useRef<string | null>(null);
  const secretoImgRef = useRef<HTMLImageElement | null>(null);
  const abisalImgRef = useRef<HTMLImageElement | null>(null);
  const legendarioImgRef = useRef<HTMLImageElement | null>(null);
  const ogRodImgRef = useRef<HTMLImageElement | null>(null);
  const marketBgImgRef = useRef<HTMLImageElement | null>(null);
  const underworldMarketBgImgRef = useRef<HTMLImageElement | null>(null);
  const cleanFishCanvasesRef = useRef<Record<number, HTMLCanvasElement>>({});
  const magmaSkullsRef = useRef<HTMLCanvasElement[]>([]);

  useEffect(() => {
    const sImg = new Image();
    sImg.src = './assets/aistudio/Revelaci_n_dorada_en_las_estrellas_162a001d.webp';
    secretoImgRef.current = sImg;

    const aImg = new Image();
    aImg.src = './assets/aistudio/Secreto_abisal_bajo_el_mar_e7b83bcb.webp';
    abisalImgRef.current = aImg;

    const lImg = new Image();
    lImg.src = './assets/aistudio/T_tulo_dorado_legendario_con_corona_y_tesoros_a812eb59.webp';
    legendarioImgRef.current = lImg;

    const ogImg = new Image();
    ogImg.src = './assets/aistudio/Can_a_de_pesca_OG_futurista_20453ef6.webp';
    ogRodImgRef.current = ogImg;

    const mImg = new Image();
    mImg.src = './assets/aistudio/market_background.webp';
    marketBgImgRef.current = mImg;

    const uwMImg = new Image();
    uwMImg.src = './assets/aistudio/underworld_market_background.webp';
    underworldMarketBgImgRef.current = uwMImg;

    for (const idStr of Object.keys(CUSTOM_FISH_IMAGES)) {
      const id = Number(idStr);
      if (id === 103) continue;
      loadCleanFishCanvas(id).then((canvas) => {
        if (canvas) {
          cleanFishCanvasesRef.current[id] = canvas;
        }
      });
    }

    loadMagmaSkullSprites().then((sprites) => {
      magmaSkullsRef.current = sprites;
    });
  }, []);
  const pendingCatchRef = useRef<CaughtPokemon | null>(pendingCatch);
  const onPhaseChangeRef = useRef(onPhaseChange);
  const onCatchPokemonRef = useRef(onCatchPokemon);
  const worldRef = useRef<'river' | 'underworld'>(world);
  const tutorialStepRef = useRef<number>(tutorialStep);
  const isMinigameOpenRef = useRef<boolean>(isMinigameOpen);
  const fightTelemetryPropRef = useRef<React.MutableRefObject<FightTelemetry> | undefined>(fightTelemetryRef);
  const langRef = useRef<Language>(lang);
  const graphicsQualityRef = useRef<GraphicsQuality>(graphicsQuality);
  const sceneRef = useRef<'dock' | 'market'>(scene);
  const onSceneChangeRef = useRef(onSceneChange);
  const onOpenMarketStallRef = useRef(onOpenMarketStall);
  const walkRequestRef = useRef<{ id: number; target: 'market' | 'dock' } | null>(walkRequest);
  const onWalkStateChangeRef = useRef(onWalkStateChange);
  const tutorialHighlightedStallRef = useRef<'sell' | 'rods' | 'pvp' | null>(tutorialHighlightedStall);
  const activeWormIdRef = useRef<WormBaitId | null>(activeWormId);
  const resizeCanvasRef = useRef<(() => void) | null>(null);

  modeRef.current = mode;
  worldRef.current = world;
  tutorialStepRef.current = tutorialStep;
  isMinigameOpenRef.current = isMinigameOpen;
  fightTelemetryPropRef.current = fightTelemetryRef;
  langRef.current = lang;
  graphicsQualityRef.current = graphicsQuality;
  sceneRef.current = scene;
  onSceneChangeRef.current = onSceneChange;
  onOpenMarketStallRef.current = onOpenMarketStall;
  walkRequestRef.current = walkRequest;
  onWalkStateChangeRef.current = onWalkStateChange;
  tutorialHighlightedStallRef.current = tutorialHighlightedStall;
  activeWormIdRef.current = activeWormId;
  equippedRef.current = equippedCosmetics;
  lastCaughtRef.current = lastCaught;
  pendingCatchRef.current = pendingCatch;
  onPhaseChangeRef.current = onPhaseChange;
  onCatchPokemonRef.current = onCatchPokemon;
  void onCanvasClick;

  useEffect(() => {
    resizeCanvasRef.current?.();
  }, [graphicsQuality]);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = container.clientWidth || window.innerWidth;
    let height = container.clientHeight || window.innerHeight;

    const resize = () => {
      width = container.clientWidth || window.innerWidth;
      height = container.clientHeight || window.innerHeight;
      const gq = graphicsQualityRef.current;
      const maxDpr = gq === 'low' ? 1 : 2;
      const dpr = Math.min(window.devicePixelRatio || 1, maxDpr);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.imageSmoothingEnabled = gq !== 'low';
      ctx.imageSmoothingQuality = gq === 'low' ? 'low' : 'high';
    };
    resizeCanvasRef.current = resize;
    resize();

    const ro = new ResizeObserver(resize);
    ro.observe(container);

    const createBokehSprite = (inner: string, mid: string, outer: string) => {
      const c = document.createElement('canvas');
      c.width = 64;
      c.height = 64;
      const bctx = c.getContext('2d');
      if (bctx) {
        const g = bctx.createRadialGradient(32, 32, 0, 32, 32, 32);
        g.addColorStop(0, inner);
        g.addColorStop(0.45, mid);
        g.addColorStop(1, outer);
        bctx.fillStyle = g;
        bctx.fillRect(0, 0, 64, 64);
      }
      return c;
    };
    const riverBokehSprite = createBokehSprite(
      'rgba(254, 249, 195, 1)',
      'rgba(251, 191, 36, 0.42)',
      'rgba(56, 189, 248, 0)'
    );

    const snowflakes: Snowflake[] = Array.from({ length: 70 }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      r: 1.5 + Math.random() * 2.2,
      vy: 20 + Math.random() * 26,
      vx: -8 + Math.random() * 16,
      alpha: 0.4 + Math.random() * 0.5,
    }));

    interface LavaBubble {
      x: number;
      y: number;
      r: number;
      vy: number;
      vx: number;
      alpha: number;
      pulseSpeed: number;
      pulseOffset: number;
    }

    const lavaBubbles: LavaBubble[] = Array.from({ length: 28 }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      r: 1.1 + Math.random() * 1.7,
      vy: 18 + Math.random() * 24,
      vx: -6 + Math.random() * 12,
      alpha: 0.45 + Math.random() * 0.45,
      pulseSpeed: 2.5 + Math.random() * 3,
      pulseOffset: Math.random() * Math.PI * 2,
    }));

    const rtxBokeh = Array.from({ length: 22 }, (_, idx) => ({
      x: Math.random() * width,
      y: Math.random() * height,
      r: 4 + (idx % 5) * 3.2,
      vx: (idx % 2 === 0 ? 1 : -1) * (6 + (idx % 4) * 3),
      vy: -(5 + (idx % 3) * 4),
      phase: idx * 0.73,
      alpha: 0.16 + (idx % 4) * 0.06,
    }));


    const splashPool: SplashParticle[] = Array.from({ length: 64 }, () => ({
      active: false,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      life: 0,
      maxLife: 0.5,
      r: 3,
      color: '#ffffff',
    }));

    const ripplePool: WaterRipple[] = Array.from({ length: 16 }, () => ({
      active: false,
      x: 0,
      y: 0,
      life: 0,
      maxLife: 0.75,
      startRx: 10,
      endRx: 58,
      lineWidth: 2,
      color: '#bae6fd',
    }));

    const BOBBER_TRAIL_LEN = 6;
    const bobberTrailX = new Float32Array(BOBBER_TRAIL_LEN);
    const bobberTrailY = new Float32Array(BOBBER_TRAIL_LEN);
    let bobberTrailCount = 0;

    const spawnRipple = (
      cx: number,
      cy: number,
      startRx: number,
      endRx: number,
      maxLife: number,
      lineWidth: number,
      color: string
    ) => {
      for (let i = 0; i < ripplePool.length; i++) {
        const r = ripplePool[i];
        if (!r.active) {
          r.active = true;
          r.x = cx;
          r.y = cy;
          r.life = 0;
          r.maxLife = maxLife;
          r.startRx = startRx;
          r.endRx = endRx;
          r.lineWidth = lineWidth;
          r.color = color;
          return;
        }
      }
    };

    const spawnSplash = (cx: number, cy: number, count: number, color: string) => {
      let spawned = 0;
      for (let i = 0; i < splashPool.length && spawned < count; i++) {
        const p = splashPool[i];
        if (!p.active) {
          const angle = -Math.PI + Math.random() * Math.PI;
          const speed = 60 + Math.random() * 130;
          p.active = true;
          p.x = cx + (Math.random() - 0.5) * 16;
          p.y = cy;
          p.vx = Math.cos(angle) * speed;
          p.vy = Math.sin(angle) * speed - 40;
          p.life = 0;
          p.maxLife = 0.45 + Math.random() * 0.25;
          p.r = 2.2 + Math.random() * 2.8;
          p.color = color;
          spawned++;
        }
      }
    };

    const skinEngine = new SkinEffectsEngine();
    let lastTime = performance.now();
    let elapsed = 0;
    let prevPhase: FishingPhase = fishingStateRef.current.phase;
    let castLandedFired = false;
    let wizardRayActive = false;
    let wizardRayTime = 0;
    let caughtBurstUid: string | null = null;
    let skinCatchSoundUid: string | null = null;
    let biteAnimTime = 0;
    let waitRippleAccum = 0;
    let biteRippleAccum = 0;
    let fightSplashAccum = 0;
    let lastFailBurstTs = 0;
    let rafId = 0;

    let mouseX = -999;
    let mouseY = -999;
    let hoveredStall: 'sell' | 'rods' | 'pvp' | null = null;
    const stallScales: Record<'sell' | 'rods' | 'pvp', number> = {
      sell: 1,
      rods: 1,
      pvp: 1,
    };

    type WalkStage =
      | 'idle'
      | 'walk_dock_to_left'
      | 'fade_to_market'
      | 'walk_market_enter'
      | 'walk_market_to_right'
      | 'fade_to_dock'
      | 'walk_dock_return';

    let walkStage: WalkStage = 'idle';
    let walkTimer = 0;
    let walkCycle = 0;
    let transitionFadeAlpha = 0;
    let lastHandledWalkReqId = walkRequestRef.current?.id ?? 0;

    const startWalkToMarket = () => {
      if (walkStage !== 'idle' || sceneRef.current !== 'dock') return;
      if (fishingStateRef.current.phase !== 'IDLE') {
        fishingStateRef.current = {
          ...fishingStateRef.current,
          phase: 'IDLE',
          phaseTimer: 0,
        };
        onPhaseChangeRef.current('IDLE', fishingStateRef.current.fishCount);
        prevPhase = 'IDLE';
      }
      walkStage = 'walk_dock_to_left';
      walkTimer = 0;
      onWalkStateChangeRef.current?.(true);
    };

    const startWalkToDock = () => {
      if (walkStage !== 'idle' || sceneRef.current !== 'market') return;
      hoveredStall = null;
      canvas.style.cursor = 'default';
      walkStage = 'walk_market_to_right';
      walkTimer = 0;
      onWalkStateChangeRef.current?.(true);
    };

    const detectStallAt = (px: number, py: number): 'sell' | 'rods' | 'pvp' | null => {
      if (walkStage !== 'idle') return null;
      if (sceneRef.current === 'market') {
        if (px >= width * 0.08 && px <= width * 0.35 && py >= height * 0.14 && py <= height * 0.77) {
          return 'sell';
        }
        if (px >= width * 0.36 && px <= width * 0.63 && py >= height * 0.11 && py <= height * 0.74) {
          return 'rods';
        }
        // In the Underworld Market, the 1v1 Zone stall is visible in the scenery but inactive for now
        if (
          worldRef.current !== 'underworld' &&
          px >= width * 0.64 &&
          px <= width * 0.87 &&
          py >= height * 0.14 &&
          py <= height * 0.67
        ) {
          return 'pvp';
        }
      }
      return null;
    };

    const onMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseX = e.clientX - rect.left;
      mouseY = e.clientY - rect.top;
      hoveredStall = detectStallAt(mouseX, mouseY);
      canvas.style.cursor = hoveredStall ? 'pointer' : 'default';
    };

    const onMouseLeave = () => {
      hoveredStall = null;
      canvas.style.cursor = 'default';
    };

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        const rect = canvas.getBoundingClientRect();
        mouseX = e.touches[0].clientX - rect.left;
        mouseY = e.touches[0].clientY - rect.top;
        hoveredStall = detectStallAt(mouseX, mouseY);
      }
    };

    const onClick = (e: MouseEvent) => {
      if (tutorialHighlightedStallRef.current !== null || tutorialStepRef.current === 4) {
        return;
      }
      const rect = canvas.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;
      const targetStall = detectStallAt(clickX, clickY) ?? hoveredStall;
      if (sceneRef.current === 'market' && walkStage === 'idle') {
        if (targetStall === 'sell') {
          onOpenMarketStallRef.current?.('sell');
        } else if (targetStall === 'rods') {
          onOpenMarketStallRef.current?.('rods');
        } else if (targetStall === 'pvp' && worldRef.current !== 'underworld') {
          onOpenMarketStallRef.current?.('pvp');
        }
      }
    };

    canvas.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('mouseleave', onMouseLeave);
    canvas.addEventListener('touchstart', onTouchStart, { passive: true });
    canvas.addEventListener('click', onClick);

    const render = (now: number) => {
      const rawDt = (now - lastTime) / 1000;
      lastTime = now;
      const dt = Math.min(rawDt, 0.05);

      const req = walkRequestRef.current;
      if (req && req.id !== lastHandledWalkReqId) {
        lastHandledWalkReqId = req.id;
        if (req.target === 'market') {
          startWalkToMarket();
        } else if (req.target === 'dock') {
          startWalkToDock();
        }
      }

      if (walkStage !== 'idle') {
        if (walkStage === 'walk_dock_to_left') {
          walkTimer += dt;
          walkCycle += dt * 10.5;
          if (walkTimer >= 1.18) {
            walkStage = 'fade_to_market';
            walkTimer = 0;
          }
        } else if (walkStage === 'fade_to_market') {
          walkTimer += dt;
          walkCycle += dt * 9.5;
          transitionFadeAlpha = Math.min(1, walkTimer / 0.25);
          if (walkTimer >= 0.25) {
            sceneRef.current = 'market';
            onSceneChangeRef.current?.('market');
            walkStage = 'walk_market_enter';
            walkTimer = 0;
          }
        } else if (walkStage === 'walk_market_enter') {
          walkTimer += dt;
          walkCycle += dt * 10.2;
          transitionFadeAlpha = Math.max(0, 1 - walkTimer / 0.26);
          if (walkTimer >= 0.66) {
            walkStage = 'idle';
            walkTimer = 0;
            transitionFadeAlpha = 0;
            onWalkStateChangeRef.current?.(false);
          }
        } else if (walkStage === 'walk_market_to_right') {
          walkTimer += dt;
          walkCycle += dt * 10.5;
          if (walkTimer >= 0.62) {
            walkStage = 'fade_to_dock';
            walkTimer = 0;
          }
        } else if (walkStage === 'fade_to_dock') {
          walkTimer += dt;
          walkCycle += dt * 9.5;
          transitionFadeAlpha = Math.min(1, walkTimer / 0.25);
          if (walkTimer >= 0.25) {
            sceneRef.current = 'dock';
            onSceneChangeRef.current?.('dock');
            walkStage = 'walk_dock_return';
            walkTimer = 0;
          }
        } else if (walkStage === 'walk_dock_return') {
          walkTimer += dt;
          walkCycle += dt * 10.5;
          transitionFadeAlpha = Math.max(0, 1 - walkTimer / 0.26);
          if (walkTimer >= 1.12) {
            walkStage = 'idle';
            walkTimer = 0;
            transitionFadeAlpha = 0;
            onWalkStateChangeRef.current?.(false);
          }
        }
      }

      if (modeRef.current !== 'paused') {
        elapsed += dt;
        if (wizardRayActive) {
          wizardRayTime += dt;
        }
      }

      if (modeRef.current === 'playing' && sceneRef.current === 'dock' && walkStage === 'idle') {
        const current = fishingStateRef.current;
        if (current.phase !== prevPhase) {
          if (current.phase === 'CASTING') {
            castLandedFired = false;
            wizardRayActive = false;
            wizardRayTime = 0;
            bobberTrailCount = 0;
            sound.playCast();
          } else if (current.phase === 'WAITING') {
            if (equippedRef.current.includes('suit_wizard') && !wizardRayActive) {
              wizardRayActive = true;
              wizardRayTime = 0;
              const rayCfg = getWizardRayConfig(pendingCatchRef.current?.species.rarity);
              sound.playWizardRay(rayCfg.intensity);
            }
          } else if (current.phase === 'BITING') {
            biteAnimTime = 0;
            biteRippleAccum = 0;
          } else if (current.phase === 'IDLE' || current.phase === 'MISSED') {
            wizardRayActive = false;
            wizardRayTime = 0;
          } else if (current.phase === 'CAUGHT') {
            wizardRayActive = false;
            wizardRayTime = 0;
            const isUnderworld = worldRef.current === 'underworld';
            if (isUnderworld) {
              spawnSplash(width * 0.62, height * 0.65, 20, '#f97316');
              spawnRipple(width * 0.62, height * 0.65 + 2, 12, 74, 0.7, 3, '#fb923c');
            } else {
              spawnSplash(width * 0.62, height * 0.65, 20, '#e0f2fe');
              spawnRipple(width * 0.62, height * 0.65 + 2, 12, 74, 0.7, 3, '#bae6fd');
            }
          }
          prevPhase = current.phase;
        }

        const caughtRarity = lastCaughtRef.current?.species.rarity;
        const isHighCaught =
          current.phase === 'CAUGHT' &&
          (caughtRarity === 'Legendaria' ||
            caughtRarity === 'Secreto' ||
            caughtRarity === 'Secreto Abisal');

        if (isMinigameOpenRef.current) {
          // Keep fishing phase paused while player completes the minigame / revive modal
        } else if (isHighCaught) {
          const nextTimer = current.phaseTimer + dt;
          if (nextTimer >= 10.0) {
            fishingStateRef.current = { ...current, phase: 'IDLE', phaseTimer: 0 };
            onPhaseChangeRef.current('IDLE', current.fishCount);
            prevPhase = 'IDLE';
          } else {
            fishingStateRef.current = { ...current, phaseTimer: nextTimer };
          }
        } else {
          const { next, event } = stepFishingState(current, dt);
          fishingStateRef.current = next;

          if (event === 'bite_start') {
            biteAnimTime = 0;
            biteRippleAccum = 0;
            if (equippedRef.current.includes('suit_millionaire')) {
              sound.playCashRegister();
            } else {
              sound.playBite();
            }
            const isUw = worldRef.current === 'underworld';
            const rx = Math.floor(width * 0.62);
            const ry = Math.floor(height * 0.65) + 2;
            spawnSplash(rx, ry, 10, isUw ? '#f97316' : '#bae6fd');
            spawnRipple(rx, ry, 8, 52, 0.45, 3, isUw ? '#fde047' : '#ffffff');
            spawnRipple(rx, ry, 14, 72, 0.65, 2, isUw ? '#fb923c' : '#bae6fd');
            onPhaseChangeRef.current(next.phase, next.fishCount);
          } else if (event === 'bite_missed') {
            sound.playMiss();
            onPhaseChangeRef.current(next.phase, next.fishCount);
          } else if (event === 'ready' || next.phase !== prevPhase) {
            onPhaseChangeRef.current(next.phase, next.fishCount);
          }
          prevPhase = next.phase;
        }
      }

      const gq = graphicsQualityRef.current;
      const isRtx = gq === 'rtx';
      const isLow = gq === 'low';

      if (modeRef.current !== 'paused') {
        const isUnderworld = worldRef.current === 'underworld';
        const snowLimit = isLow ? 22 : gq === 'normal' ? 52 : snowflakes.length;
        for (let si = 0; si < snowLimit; si++) {
          const s = snowflakes[si];
          if (isUnderworld) {
            // Rising fiery volcanic embers
            s.x += (s.vx + Math.sin(elapsed * 1.5 + s.y * 0.02) * 12) * dt;
            s.y -= (Math.abs(s.vy) + 35) * dt;
            if (s.y < -10) {
              s.y = height + 10;
              s.x = Math.random() * width;
            }
          } else {
            // Falling snow
            s.x += (s.vx + Math.sin(elapsed * 0.8 + s.y * 0.01) * 10) * dt;
            s.y += s.vy * dt;
            if (s.y > height + 10) {
              s.y = -10;
              s.x = Math.random() * width;
            }
          }
          if (s.x < -10) s.x = width + 10;
          if (s.x > width + 10) s.x = -10;
        }

        if (isUnderworld) {
          const bubbleLimit = isLow ? 10 : gq === 'normal' ? 24 : lavaBubbles.length;
          for (let bi = 0; bi < bubbleLimit; bi++) {
            const b = lavaBubbles[bi];
            b.x += (b.vx + Math.sin(elapsed * 2 + b.y * 0.01) * 8) * dt;
            b.y -= b.vy * dt;
            if (b.y < -20) {
              b.y = height + 20;
              b.x = Math.random() * width;
            }
            if (b.x < -20) b.x = width + 20;
            if (b.x > width + 20) b.x = -20;
          }
        }

        if (isRtx) {
          for (let ki = 0; ki < rtxBokeh.length; ki++) {
            const k = rtxBokeh[ki];
            k.x += (k.vx + Math.sin(elapsed * 0.9 + k.phase) * 7) * dt;
            k.y += (k.vy + Math.cos(elapsed * 0.7 + k.phase) * 4) * dt;
            if (k.y < -30) {
              k.y = height + 30;
              k.x = Math.random() * width;
            }
            if (k.x < -30) k.x = width + 30;
            if (k.x > width + 30) k.x = -30;
          }
        }
      }

      for (const p of splashPool) {
        if (!p.active) continue;
        p.life += dt;
        if (p.life >= p.maxLife) {
          p.active = false;
          continue;
        }
        p.vy += 320 * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
      }

      // --- TRANSPARENT CANVAS OVER GUARANTEED DOM BACKGROUND ---
      const holeX = Math.floor(width * 0.62);
      const holeY = Math.floor(height * 0.65);
      const holeRx = Math.min(72, width * 0.1);
      const holeRy = holeRx * 0.36;

      ctx.clearRect(0, 0, width, height);

      // Water / Lava ripples & precomputed Angler/Rod/Skin VFX state
      const phase = fishingStateRef.current.phase;
      const isUnderworldTheme = worldRef.current === 'underworld';
      const inMarketScene = sceneRef.current === 'market';
      const isUnderworldMarket = isUnderworldTheme && inMarketScene;
      const isCharWalking = walkStage !== 'idle';

      const eq = equippedRef.current;
      const isMillionaire = eq.includes('suit_millionaire');
      const isMagma = eq.includes('suit_magma');
      const isWizard = eq.includes('suit_wizard');
      const activeSkin: ActiveSkinId = isMagma
        ? 'suit_magma'
        : isMillionaire
          ? 'suit_millionaire'
          : isWizard
            ? 'suit_wizard'
            : 'none';

      const hasOgRod = eq.includes('rod_og');
      const hasGoldRod = eq.includes('rod_gold');
      const hasCarbonRod = eq.includes('rod_carbon');
      const hasRedHat = eq.includes('hat_red');
      const hasBlueCap = eq.includes('hat_cap_blue');
      const hasBeanie = eq.includes('hat_beanie_wool');
      const hasCrown = eq.includes('hat_crown');
      const hasBeard = eq.includes('beard_fisher');
      const hasGlasses = eq.includes('glasses_cool');
      const hasPixelGlasses = eq.includes('glasses_pixel');
      const hasScarfGold = eq.includes('scarf_gold');
      const hasScarfCrimson = eq.includes('scarf_crimson');
      const hasCoat = eq.includes('coat_polar');
      const hasHoodie = eq.includes('coat_hoodie');
      const hasCrimsonJacket = eq.includes('coat_jacket_crimson');
      const equippedShirtId = eq.find((id) => id in SHIRT_COLORS);
      const equippedPantsId = eq.find((id) => id in PANTS_COLORS);
      const pantsStyle = equippedPantsId ? PANTS_COLORS[equippedPantsId] : null;
      const shirtStyle = equippedShirtId ? SHIRT_COLORS[equippedShirtId] : null;
      const hasTallBoots = eq.includes('boots_tall');
      const heightBoost =
        !isMillionaire && !isMagma && !isWizard
          ? (eq.includes('height_tall') ? 10 : 0) + (hasTallBoots ? 5 : 0)
          : 0;

      // Smooth 2D walking position, direction & stride kinematics
      const marketIdleX = isUnderworldMarket ? 0.775 : 0.80;
      let charXRatio = inMarketScene ? marketIdleX : 0.34;
      let facingDir = inMarketScene ? -1 : 1;

      if (walkStage === 'walk_dock_to_left') {
        const t = Math.min(1, walkTimer / 1.18);
        const ease = t < 0.15 ? (t / 0.15) * 0.12 : 0.12 + ((t - 0.15) / 0.85) * 0.88;
        charXRatio = 0.34 - (0.34 - 0.075) * ease;
        facingDir = -1;
      } else if (walkStage === 'fade_to_market') {
        charXRatio = 0.075 - Math.min(1, walkTimer / 0.25) * 0.03;
        facingDir = -1;
      } else if (walkStage === 'walk_market_enter') {
        const t = Math.min(1, walkTimer / 0.66);
        const easeOut = 1 - Math.pow(1 - t, 2);
        charXRatio = 0.91 - (0.91 - marketIdleX) * easeOut;
        facingDir = -1;
      } else if (walkStage === 'walk_market_to_right') {
        const t = Math.min(1, walkTimer / 0.62);
        charXRatio = marketIdleX + (0.92 - marketIdleX) * t;
        facingDir = 1;
      } else if (walkStage === 'fade_to_dock') {
        charXRatio = 0.92 + Math.min(1, walkTimer / 0.25) * 0.03;
        facingDir = 1;
      } else if (walkStage === 'walk_dock_return') {
        const t = Math.min(1, walkTimer / 1.12);
        const easeOut = 1 - Math.pow(1 - t, 1.85);
        charXRatio = 0.075 + (0.34 - 0.075) * easeOut;
        facingDir = 1;
      }

      const legSwing = isCharWalking ? Math.sin(walkCycle) * 0.42 : 0;
      const walkBounceY = isCharWalking ? Math.abs(Math.sin(walkCycle)) * 4.2 : 0;
      const breath = isCharWalking
        ? Math.sin(walkCycle * 2) * 1.2
        : Math.sin(elapsed * 2.2) * 1.5;
      const charX = Math.floor(width * charXRatio);
      const baseCharY = Math.floor(
        height * (isUnderworldMarket ? 0.892 : inMarketScene ? 0.908 : 0.922)
      );
      const charY = Math.floor(baseCharY - walkBounceY);
      const charScale = Math.max(
        1.38,
        Math.min(2.35, Math.min(width * 0.00155, height * 0.00245))
      ) * (inMarketScene ? 0.94 : 1);
      const pivotY = -44 - heightBoost;
      const torsoY = -94 - heightBoost + breath;
      const shX = 7;
      const shY = torsoY + 14;
      const armLen = 23;

      const ft = fightTelemetryPropRef.current?.current;
      const isFighting = Boolean(ft?.active) && phase === 'BITING' && !inMarketScene && !isCharWalking;
      const fightProfile = ft
        ? getRarityFightProfile(ft.rarity, ft.weightFactor)
        : null;
      const failAge =
        ft && ft.failReason !== 'none' && ft.failTimestamp > 0
          ? Math.max(0, (now - ft.failTimestamp) / 1000)
          : 99;
      const isSnapVisual = Boolean(
        !inMarketScene && ft && ft.failReason === 'line_snapped' && failAge < 1.2
      );
      const isEscapeVisual = Boolean(
        !inMarketScene && ft && ft.failReason === 'fish_escaped' && failAge < 1.2
      );
      const isFailFace = Boolean(
        !inMarketScene &&
          ft &&
          (ft.failReason === 'line_snapped' || ft.failReason === 'fish_escaped') &&
          failAge < 2.2
      );

      let torsoTilt = 0;
      let armAngle = -0.18;
      let castT = 0;
      if (isCharWalking) {
        torsoTilt = 0.055 + Math.sin(walkCycle * 2) * 0.025;
        armAngle = -0.52 + Math.cos(walkCycle) * 0.22;
      } else if (inMarketScene) {
        torsoTilt = 0.015 * Math.sin(elapsed * 1.8);
        armAngle = -0.45 + Math.sin(elapsed * 2.1) * 0.04;
      } else if (phase === 'CASTING') {
        castT = Math.min(1, fishingStateRef.current.phaseTimer / TIMING.CAST_DURATION);
        if (castT < 0.34) {
          const w = Math.sin((castT / 0.34) * (Math.PI / 2));
          torsoTilt = -0.16 * w;
          armAngle = -0.18 + (-2.35 - -0.18) * w;
        } else if (castT < 0.62) {
          const s = (castT - 0.34) / 0.28;
          const e = s < 0.5 ? 2 * s * s : 1 - Math.pow(-2 * s + 2, 2) / 2;
          torsoTilt = -0.16 + 0.33 * e;
          armAngle = -2.35 + (0.28 - -2.35) * e;
        } else {
          const f = (castT - 0.62) / 0.38;
          const easeOut = 1 - Math.pow(1 - f, 2);
          torsoTilt = 0.17 * (1 - easeOut);
          armAngle = 0.28 + (-0.18 - 0.28) * easeOut;
        }
      } else if (isFighting && ft && fightProfile) {
        const thrash = Math.sin(elapsed * fightProfile.thrashFreq);
        torsoTilt =
          -0.09 -
          ft.tension * 0.13 -
          ft.pullPulse * 0.07 +
          thrash * (0.018 + ft.tension * 0.028);
        armAngle =
          -0.32 -
          ft.pullPulse * 0.22 +
          Math.sin(elapsed * (fightProfile.thrashFreq + 4)) *
            (0.06 + ft.tension * 0.1);
      } else if (isSnapVisual) {
        const recoil = Math.exp(-failAge * 4.5);
        torsoTilt = -0.22 * recoil;
        armAngle = -0.58 * recoil - 0.18 * (1 - recoil);
      } else if (phase === 'BITING') {
        torsoTilt = -0.05 + Math.sin(elapsed * 18) * 0.03;
        armAngle = -0.25 + Math.sin(elapsed * 22) * 0.12;
      } else if (phase === 'CAUGHT') {
        torsoTilt = -0.08;
        armAngle = -0.45;
      }

      const handLocalX = shX + Math.cos(armAngle) * armLen;
      const handLocalY = shY + Math.sin(armAngle) * armLen;
      const relHandX = handLocalX;
      const relHandY = handLocalY - pivotY;
      const cosT = Math.cos(torsoTilt);
      const sinT = Math.sin(torsoTilt);
      const handWorldX = charX + facingDir * (relHandX * cosT - relHandY * sinT) * charScale;
      const handWorldY = charY + (pivotY + relHandX * sinT + relHandY * cosT) * charScale;

      const restHandX = charX + facingDir * (shX + Math.cos(-0.18) * armLen) * charScale;
      const restHandY = charY + (shY + Math.sin(-0.18) * armLen) * charScale;

      const rawTipX = charX + facingDir * (width * 0.27);
      const rawTipY = height * 0.42;
      const rodLengthFactor = isWizard ? 0.38 : isMillionaire || isMagma ? 0.9 : 1;
      const restTipX = restHandX + (rawTipX - restHandX) * rodLengthFactor;
      const restTipY = restHandY + (rawTipY - restHandY) * rodLengthFactor;
      const rodLen = Math.max(
        isWizard ? 58 : 70,
        Math.hypot(restTipX - restHandX, restTipY - restHandY)
      );
      const restRodAngle = Math.atan2(restTipY - restHandY, restTipX - restHandX);

      const rodBaseX = handWorldX;
      const rodBaseY = handWorldY;
      let rodTipX = restTipX;
      let rodTipY = restTipY;
      let rodBendOffset = isWizard ? 0 : -16;
      let castRodAngle = restRodAngle;
      if (isCharWalking || inMarketScene) {
        const carryLen = rodLen * 0.72;
        const carryBob = isCharWalking ? Math.sin(walkCycle) * 0.08 : Math.sin(elapsed * 2) * 0.025;
        const carryAngle = facingDir === -1 ? -2.18 + carryBob : -0.96 - carryBob;
        rodTipX = rodBaseX + Math.cos(carryAngle) * carryLen;
        rodTipY = rodBaseY + Math.sin(carryAngle) * carryLen;
        rodBendOffset = isWizard ? 0 : -6;
      }

      if (phase === 'CASTING') {
        const backAngle = -2.42;
        const forwardAngle = restRodAngle + 0.24;
        if (castT < 0.34) {
          const w = Math.sin((castT / 0.34) * (Math.PI / 2));
          castRodAngle = restRodAngle + (backAngle - restRodAngle) * w;
          rodBendOffset = isWizard ? 0 : -18 + 26 * w;
        } else if (castT < 0.62) {
          const s = (castT - 0.34) / 0.28;
          const e = s < 0.5 ? 2 * s * s : 1 - Math.pow(-2 * s + 2, 2) / 2;
          castRodAngle = backAngle + (forwardAngle - backAngle) * e;
          rodBendOffset = isWizard ? 0 : -28 * Math.sin(s * Math.PI);
        } else {
          const f = (castT - 0.62) / 0.38;
          const easeOut = 1 - Math.pow(1 - f, 2);
          const bounce = Math.sin(f * Math.PI * 2.5) * 0.06 * (1 - f);
          castRodAngle = forwardAngle + (restRodAngle - forwardAngle) * easeOut + bounce;
          rodBendOffset = isWizard ? 0 : -18 + Math.sin(f * Math.PI * 2) * 8 * (1 - f);
        }
        rodTipX = rodBaseX + Math.cos(castRodAngle) * rodLen;
        rodTipY = rodBaseY + Math.sin(castRodAngle) * rodLen;
      } else if (isFighting && ft && fightProfile) {
        const fShake = Math.sin(elapsed * fightProfile.thrashFreq * 1.15);
        const fBob = Math.cos(elapsed * fightProfile.thrashFreq * 0.9);
        if (isWizard) {
          rodTipX = restTipX + fShake * (5 + ft.tension * 8);
          rodTipY = restTipY - 12 + fBob * (6 + ft.tension * 8);
        } else {
          rodBendOffset = -20 - ft.tension * 32 - ft.pullPulse * 12;
          rodTipX =
            restTipX +
            ft.distance * 14 +
            fShake * (3.5 + ft.tension * 7.5);
          rodTipY =
            restTipY +
            18 +
            ft.tension * 28 +
            fBob * (6 + ft.tension * 9);
        }
      } else if (isSnapVisual) {
        const whip = Math.exp(-failAge * 4.5) * Math.sin(failAge * 26);
        rodBendOffset = isWizard ? 0 : -10 + whip * 18;
        rodTipX = restTipX - 18 * Math.exp(-failAge * 3);
        rodTipY = restTipY - 26 * Math.exp(-failAge * 3) + whip * 24;
      } else if (phase === 'BITING') {
        if (isWizard) {
          rodTipX = restTipX + Math.sin(elapsed * 22) * 4;
          rodTipY = restTipY - 12 + Math.cos(elapsed * 26) * 5;
        } else {
          rodTipY = restTipY + 18 + Math.sin(elapsed * 26) * 10;
        }
      } else if (
        phase === 'CAUGHT' &&
        lastCaughtRef.current?.species.rarity === 'Secreto Abisal'
      ) {
        rodTipY = (isWizard ? restTipY - 16 : restTipY + 20) + Math.sin(elapsed * 32) * 12;
      } else if (phase === 'CAUGHT') {
        rodTipX = restTipX - (isWizard ? 10 : 24);
        rodTipY = isWizard ? restTipY - 22 : restTipY - 24;
      }

      let projectileX: number | null = null;
      let projectileY: number | null = null;
      if (phase === 'CASTING' && castT >= 0.52) {
        const flyT = Math.min(1, (castT - 0.52) / 0.46);
        const easeFly = 1 - Math.pow(1 - flyT, 1.55);
        projectileX = rodTipX + (holeX - rodTipX) * easeFly;
        projectileY =
          rodTipY + (holeY + 2 - rodTipY) * easeFly - Math.sin(flyT * Math.PI) * 62;
      }

      const caughtSpecies = lastCaughtRef.current?.species;
      const caughtRarityCheck = caughtSpecies?.rarity;
      const isHighCaughtReveal =
        phase === 'CAUGHT' &&
        (caughtRarityCheck === 'Legendaria' ||
          caughtRarityCheck === 'Secreto' ||
          caughtRarityCheck === 'Secreto Abisal');
      const skinBuildupDur = isHighCaughtReveal ? 5.0 : 0;
      const skinElapsedCaught = fishingStateRef.current.phaseTimer;
      const skinInBuildup = isHighCaughtReveal && skinElapsedCaught < skinBuildupDur;
      const skinRevealElapsed = Math.max(0, skinElapsedCaught - skinBuildupDur);

      const skinFrameState: SkinFrameState = {
        skin: activeSkin,
        phase,
        elapsed,
        width,
        height,
        charX,
        charY,
        rodBaseX,
        rodBaseY,
        rodTipX,
        rodTipY,
        holeX,
        holeY,
        projectileX,
        projectileY,
        quality: gq,
        isPaused: modeRef.current === 'paused',
        pendingRarity: pendingCatchRef.current?.species.rarity,
        caughtFish: lastCaughtRef.current,
        revealElapsed: skinRevealElapsed,
        inBuildup: skinInBuildup,
        lang: langRef.current,
      };

      skinEngine.update(dt, skinFrameState);
      const shake = skinEngine.getScreenShake();
      ctx.save();
      if (shake.x !== 0 || shake.y !== 0) {
        ctx.translate(shake.x, shake.y);
      }

      // RTX ULTRA: Volumetric Light Shafts + Ray-Traced Water Specular Reflections & Caustics
      if (isRtx) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';

        // 1. Volumetric God-Rays from sunset/volcanic horizon
        const sunOriginX = isUnderworldTheme ? width * 0.78 : width * 0.655;
        const sunOriginY = isUnderworldTheme ? -height * 0.14 : height * 0.33;
        const raySpread = width * 0.24;
        for (let r = 0; r < 5; r++) {
          const sway = Math.sin(elapsed * 0.55 + r * 1.3) * 24;
          const targetX =
            (isUnderworldTheme ? width * (0.14 + r * 0.19) : width * (0.26 + r * 0.17)) + sway;
          const halfW = raySpread * (0.16 + (r % 3) * 0.05);
          const beamGrad = ctx.createLinearGradient(
            sunOriginX,
            sunOriginY,
            targetX,
            height * 0.9
          );
          const peakAlpha =
            (0.032 + 0.015 * Math.sin(elapsed * 1.1 + r)) *
            (isUnderworldTheme ? 1.2 : 0.95);
          if (isUnderworldTheme) {
            beamGrad.addColorStop(0, `rgba(251, 146, 60, ${peakAlpha * 1.4})`);
            beamGrad.addColorStop(0.55, `rgba(239, 68, 68, ${peakAlpha * 0.65})`);
            beamGrad.addColorStop(1, 'rgba(239, 68, 68, 0)');
          } else {
            beamGrad.addColorStop(0, `rgba(254, 240, 138, ${peakAlpha * 1.15})`);
            beamGrad.addColorStop(0.5, `rgba(251, 191, 36, ${peakAlpha * 0.45})`);
            beamGrad.addColorStop(1, 'rgba(56, 189, 248, 0)');
          }
          ctx.fillStyle = beamGrad;
          ctx.beginPath();
          ctx.moveTo(sunOriginX - 18, sunOriginY);
          ctx.lineTo(sunOriginX + 18, sunOriginY);
          ctx.lineTo(targetX + halfW, height * 0.92);
          ctx.lineTo(targetX - halfW, height * 0.92);
          ctx.closePath();
          ctx.fill();
        }

        if (!inMarketScene) {
          // 2. Ray-Traced Water / Lava Specular Reflection Bands & Caustics
          const reflCenterX = isUnderworldTheme ? width * 0.58 : width * 0.655;
          const reflTopY = height * 0.52;
          const reflHeight = height * 0.28;
          for (let band = 0; band < 9; band++) {
            const tBand = band / 8;
            const by = reflTopY + tBand * reflHeight;
            const shimmer = Math.sin(elapsed * 3.1 + band * 1.45) * (10 + tBand * 16);
            const bw = (38 + tBand * 96) * (0.85 + 0.15 * Math.sin(elapsed * 2.4 + band));
            const bAlpha = (1 - tBand * 0.55) * (isUnderworldTheme ? 0.14 : 0.13);
            ctx.fillStyle = isUnderworldTheme
              ? `rgba(251, 146, 60, ${bAlpha})`
              : `rgba(254, 243, 199, ${bAlpha})`;
            ctx.beginPath();
            ctx.ellipse(reflCenterX + shimmer, by, bw, 2.2 + tBand * 2.1, 0, 0, Math.PI * 2);
            ctx.fill();
          }

          // 3. Dynamic Caustic Light Pool around Fishing Spot (reacts to phase & suits!)
          const isSuitActive =
            equippedRef.current.includes('suit_wizard') ||
            equippedRef.current.includes('suit_millionaire') ||
            equippedRef.current.includes('suit_magma');
          const causticPulse = phase === 'BITING' ? 1.35 + Math.sin(elapsed * 18) * 0.2 : 1 + Math.sin(elapsed * 2.6) * 0.12;
          const causticR = holeRx * 1.55 * causticPulse;
          const causticGrad = ctx.createRadialGradient(
            holeX,
            holeY + 4,
            4,
            holeX,
            holeY + 4,
            causticR
          );
          if (equippedRef.current.includes('suit_wizard') && (phase === 'WAITING' || phase === 'BITING')) {
            causticGrad.addColorStop(0, 'rgba(192, 132, 252, 0.42)');
            causticGrad.addColorStop(0.5, 'rgba(56, 189, 248, 0.2)');
            causticGrad.addColorStop(1, 'rgba(56, 189, 248, 0)');
          } else if (equippedRef.current.includes('suit_millionaire') && (phase === 'WAITING' || phase === 'BITING')) {
            causticGrad.addColorStop(0, 'rgba(253, 224, 71, 0.46)');
            causticGrad.addColorStop(0.5, 'rgba(56, 189, 248, 0.22)');
            causticGrad.addColorStop(1, 'rgba(250, 204, 21, 0)');
          } else if (equippedRef.current.includes('suit_magma') || isUnderworldTheme) {
            causticGrad.addColorStop(0, isSuitActive ? 'rgba(253, 224, 71, 0.42)' : 'rgba(249, 115, 22, 0.34)');
            causticGrad.addColorStop(0.5, 'rgba(239, 68, 68, 0.18)');
            causticGrad.addColorStop(1, 'rgba(239, 68, 68, 0)');
          } else {
            causticGrad.addColorStop(0, phase === 'BITING' ? 'rgba(254, 240, 138, 0.42)' : 'rgba(125, 211, 252, 0.28)');
            causticGrad.addColorStop(0.55, 'rgba(56, 189, 248, 0.12)');
            causticGrad.addColorStop(1, 'rgba(56, 189, 248, 0)');
          }
          ctx.fillStyle = causticGrad;
          ctx.beginPath();
          ctx.ellipse(holeX, holeY + 4, causticR, causticR * 0.42, 0, 0, Math.PI * 2);
          ctx.fill();

          // Sparkling caustic web facets orbiting water hole
          for (let c = 0; c < 6; c++) {
            const ang = elapsed * 0.9 + (c * Math.PI) / 3;
            const cxC = holeX + Math.cos(ang) * holeRx * 0.72;
            const cyC = holeY + 4 + Math.sin(ang) * holeRy * 0.72;
            const cAlpha = 0.16 + 0.14 * Math.abs(Math.sin(elapsed * 3.5 + c));
            ctx.strokeStyle = isUnderworldTheme
              ? `rgba(253, 224, 71, ${cAlpha})`
              : `rgba(224, 242, 254, ${cAlpha})`;
            ctx.lineWidth = 1.4;
            ctx.beginPath();
            ctx.ellipse(cxC, cyC, 11, 4.2, ang * 0.3, 0, Math.PI * 2);
            ctx.stroke();
          }
        }

        ctx.restore();
      } else if (!isLow && !inMarketScene) {
        // Normal mode: subtle ambient caustic shimmer anchored around fishing spot
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        const softSpotR = holeRx * 1.2;
        const spotGrad = ctx.createRadialGradient(
          holeX,
          holeY + 4,
          4,
          holeX,
          holeY + 4,
          softSpotR
        );
        if (isUnderworldTheme) {
          spotGrad.addColorStop(0, 'rgba(249, 115, 22, 0.24)');
          spotGrad.addColorStop(1, 'rgba(239, 68, 68, 0)');
        } else {
          spotGrad.addColorStop(0, phase === 'BITING' ? 'rgba(253, 224, 71, 0.28)' : 'rgba(125, 211, 252, 0.2)');
          spotGrad.addColorStop(1, 'rgba(56, 189, 248, 0)');
        }
        ctx.fillStyle = spotGrad;
        ctx.beginPath();
        ctx.ellipse(holeX, holeY + 4, softSpotR, softSpotR * 0.4, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      if (modeRef.current !== 'paused' && !inMarketScene) {
        if (phase === 'WAITING') {
          waitRippleAccum += dt;
          if (waitRippleAccum >= 0.85) {
            waitRippleAccum = 0;
            spawnRipple(
              holeX,
              holeY + 2,
              10,
              holeRx * 0.78,
              0.9,
              1.6,
              isUnderworldTheme ? '#f97316' : '#bae6fd'
            );
          }
        } else if (phase === 'BITING') {
          biteAnimTime += dt;
          biteRippleAccum += dt;
          if (biteRippleAccum >= 0.24) {
            biteRippleAccum = 0;
            spawnRipple(
              holeX,
              holeY + 2,
              10,
              holeRx * 0.95,
              0.52,
              2.6,
              isUnderworldTheme ? '#fde047' : '#ffffff'
            );
          }
        } else {
          waitRippleAccum = 0;
        }
      }

      if (!inMarketScene) {
        for (let i = 0; i < ripplePool.length; i++) {
          const r = ripplePool[i];
          if (!r.active) continue;
          if (modeRef.current !== 'paused') {
            r.life += dt;
            if (r.life >= r.maxLife) {
              r.active = false;
              continue;
            }
          }
          const prog = r.life / r.maxLife;
          const easeOut = 1 - Math.pow(1 - prog, 2);
          const rx = r.startRx + (r.endRx - r.startRx) * easeOut;
          const ry = rx * 0.36;
          ctx.save();
          ctx.globalAlpha = (1 - prog) * 0.82;
          ctx.strokeStyle = r.color;
          ctx.lineWidth = r.lineWidth * (1 - prog * 0.4);
          ctx.beginPath();
          ctx.ellipse(r.x, r.y, rx, ry, 0, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        }
      }

      // INTERACTIVE MARKET STALLS (Hover / Touch Scale Magnification + Selection Frame)
      if (inMarketScene) {
        const lerpF = Math.min(1, dt * 14);
        const stallsConfig: Array<{
          id: 'sell' | 'rods' | 'pvp';
          x: number;
          y: number;
          w: number;
          h: number;
          color: string;
          glow: string;
          badge: string;
          inactive?: boolean;
        }> = [
          {
            id: 'sell',
            x: width * 0.088,
            y: height * 0.145,
            w: width * 0.258,
            h: height * 0.625,
            color: isUnderworldMarket ? '#f59e0b' : '#facc15',
            glow: isUnderworldMarket ? 'rgba(245, 158, 11, 0.48)' : 'rgba(250, 204, 21, 0.42)',
            badge: isUnderworldMarket
              ? langRef.current === 'en'
                ? 'SELL CATCH'
                : 'VENDER PESCA'
              : langRef.current === 'en'
                ? 'SELL CATCH & OUTFITS'
                : 'VENDER PESCA Y TIENDA',
          },
          {
            id: 'rods',
            x: width * 0.362,
            y: height * 0.11,
            w: width * 0.268,
            h: height * 0.625,
            color: isUnderworldMarket ? '#f97316' : '#38bdf8',
            glow: isUnderworldMarket ? 'rgba(249, 115, 22, 0.48)' : 'rgba(56, 189, 248, 0.42)',
            badge: isUnderworldMarket
              ? langRef.current === 'en'
                ? 'BUY RODS & BAITS'
                : 'COMPRAR CAÑAS Y CEBOS'
              : langRef.current === 'en'
                ? 'RODS & BAITS'
                : 'CAÑAS Y CEBOS',
          },
          {
            id: 'pvp',
            x: width * 0.645,
            y: height * 0.145,
            w: width * 0.222,
            h: height * 0.515,
            color: isUnderworldMarket ? '#64748b' : '#f97316',
            glow: isUnderworldMarket ? 'rgba(100, 116, 139, 0.25)' : 'rgba(249, 115, 22, 0.42)',
            badge: isUnderworldMarket
              ? langRef.current === 'en'
                ? '1V1 ZONE · INACTIVE'
                : 'ZONA 1V1 · INACTIVO'
              : langRef.current === 'en'
                ? '1V1 ZONE · COMING SOON'
                : 'ZONA 1V1 · PRÓXIMAMENTE',
            inactive: isUnderworldMarket,
          },
        ];

        const mImg = isUnderworldMarket
          ? underworldMarketBgImgRef.current
          : marketBgImgRef.current;
        const hasMarketImg = Boolean(mImg && mImg.complete && mImg.naturalWidth > 0);
        let imgCoverScale = 1;
        let imgOffsetX = 0;
        let imgOffsetY = 0;
        let renderedW = width;
        let renderedH = height;
        if (hasMarketImg && mImg) {
          imgCoverScale = Math.max(width / mImg.naturalWidth, height / mImg.naturalHeight);
          renderedW = mImg.naturalWidth * imgCoverScale;
          renderedH = mImg.naturalHeight * imgCoverScale;
          imgOffsetX = (width - renderedW) * 0.44;
          imgOffsetY = (height - renderedH) * 0.62;
        }

        // Helper: renders the full-bodied female shopkeeper tucked BEHIND the "VENDER PESCA" counter
        // using exact image-space coordinates and foreground counter/crate/scale occlusion.
        const renderSellBoothShopkeeper = () => {
          if (!hasMarketImg || !mImg) return;
          const natW = mImg.naturalWidth;
          const natH = mImg.naturalHeight;
          const boothLeft = imgOffsetX + renderedW * 0.125;
          const boothTop = imgOffsetY + renderedH * 0.330;
          const boothW = renderedW * 0.198;
          const boothH = renderedH * 0.315;
          const npcX = imgOffsetX + renderedW * 0.226;
          const counterBackY = imgOffsetY + renderedH * 0.464;
          const npcScale = (renderedH * 0.124) / 59;

          ctx.save();
          ctx.beginPath();
          ctx.rect(boothLeft, boothTop, boothW, boothH);
          ctx.clip();

          // 1. Full articulated body behind the counter
          drawFemaleShopkeeperFullBody(
            ctx,
            npcX,
            counterBackY,
            npcScale,
            elapsed,
            isLow,
            'body',
            isUnderworldMarket
          );

          // 2. Composite foreground wooden counter surface & front from mImg OVER her lower body/legs
          const drawFgSlice = (rx: number, ry: number, rw: number, rh: number) => {
            ctx.drawImage(
              mImg,
              natW * rx,
              natH * ry,
              natW * rw,
              natH * rh,
              imgOffsetX + renderedW * rx,
              imgOffsetY + renderedH * ry,
              renderedW * rw,
              renderedH * rh
            );
          };
          // Main wooden counter table & front panel below back edge
          drawFgSlice(0.122, 0.462, 0.212, 0.220);
          // Left fish crate resting on counter top
          drawFgSlice(0.125, 0.382, 0.062, 0.088);
          // Right weighing scale resting on counter top
          drawFgSlice(0.262, 0.415, 0.052, 0.056);

          // 3. Hands resting softly on top of the counter's back edge
          drawFemaleShopkeeperFullBody(
            ctx,
            npcX,
            counterBackY,
            npcScale,
            elapsed,
            isLow,
            'hands_overlay',
            isUnderworldMarket
          );
          ctx.restore();
        };

        // Draw resting shopkeeper behind the counter before stall hover overlays
        renderSellBoothShopkeeper();

        // Ambient volcanic embers & lava crack glow in Underworld Market
        if (isUnderworldMarket && !isLow) {
          ctx.save();
          ctx.globalCompositeOperation = 'lighter';
          for (let eIdx = 0; eIdx < 14; eIdx++) {
            const seed = eIdx * 1.73;
            const cycle = (elapsed * (0.28 + (eIdx % 4) * 0.06) + seed) % 1;
            const ex =
              width * (0.12 + ((eIdx * 0.067) % 0.82)) +
              Math.sin(elapsed * 1.9 + seed * 3) * 14;
            const ey = height * (0.94 - cycle * 0.46);
            const eAlpha = Math.sin(cycle * Math.PI) * 0.65;
            const eRadius = 1.6 + (eIdx % 3) * 0.85;
            ctx.fillStyle =
              eIdx % 2 === 0
                ? `rgba(251, 146, 60, ${eAlpha})`
                : `rgba(253, 224, 71, ${eAlpha})`;
            ctx.beginPath();
            ctx.arc(ex, ey, eRadius, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.restore();
        }

        const tutStall = tutorialHighlightedStallRef.current;

        for (const st of stallsConfig) {
          const isTutFocused = tutStall === st.id && walkStage === 'idle';
          const isTutDimmed = tutStall !== null && tutStall !== st.id;
          const isHovered =
            !st.inactive &&
            (isTutFocused || (!tutStall && hoveredStall === st.id && walkStage === 'idle'));
          const targetScale = isHovered ? 1.055 : 1.0;
          stallScales[st.id] += (targetScale - stallScales[st.id]) * lerpF;
          const sc = stallScales[st.id];
          const hoverT = Math.max(0, Math.min(1, (sc - 1) / 0.055));
          const cx = st.x + st.w * 0.5;
          const cy = st.y + st.h * 0.5;

          ctx.save();
          ctx.translate(cx, cy);
          ctx.scale(sc, sc);
          ctx.translate(-cx, -cy);

          // Magnified stall image crop when hovered/selected or tutorial-focused
          if (hoverT > 0.01 && hasMarketImg && mImg) {
            ctx.save();
            if (!isLow) {
              ctx.shadowColor = 'rgba(2, 6, 23, 0.72)';
              ctx.shadowBlur = 22 * hoverT;
              ctx.shadowOffsetY = 6 * hoverT;
            }
            ctx.beginPath();
            ctx.roundRect(st.x, st.y, st.w, st.h, 16);
            ctx.fillStyle = 'rgba(15, 23, 42, 0.25)';
            ctx.fill();
            ctx.clip();

            const sx = (st.x - imgOffsetX) / imgCoverScale;
            const sy = (st.y - imgOffsetY) / imgCoverScale;
            const sw = st.w / imgCoverScale;
            const sh = st.h / imgCoverScale;
            ctx.drawImage(mImg, sx, sy, sw, sh, st.x, st.y, st.w, st.h);

            // Keep the female shopkeeper seamlessly scaled inside the "VENDER PESCA" zoomed crop
            if (st.id === 'sell') {
              renderSellBoothShopkeeper();
            }

            // Subtle warm highlight sheen on selected stall
            const sheen = ctx.createLinearGradient(st.x, st.y, st.x, st.y + st.h);
            sheen.addColorStop(0, `rgba(255, 255, 255, ${0.14 * hoverT})`);
            sheen.addColorStop(0.5, 'rgba(255, 255, 255, 0)');
            sheen.addColorStop(1, `rgba(15, 23, 42, ${0.22 * hoverT})`);
            ctx.fillStyle = sheen;
            ctx.fillRect(st.x, st.y, st.w, st.h);
            ctx.restore();
          }

          // Selection border & corner brackets
          const tutPulse = isTutFocused ? 0.5 + 0.5 * Math.sin(elapsed * 5.2) : 0;
          const borderAlpha = st.inactive
            ? 0.14
            : isTutDimmed
              ? 0.1
              : isTutFocused
                ? 0.85 + tutPulse * 0.15
                : 0.22 + hoverT * 0.78;
          ctx.save();
          if (!isLow && (hoverT > 0.05 || isTutFocused)) {
            ctx.shadowColor = st.color;
            ctx.shadowBlur = isTutFocused ? 20 + tutPulse * 10 : 16 * hoverT;
          }
          ctx.strokeStyle = st.color;
          ctx.globalAlpha = borderAlpha;
          ctx.lineWidth = isTutFocused ? 3.2 + tutPulse * 1.1 : 1.6 + hoverT * 2.2;
          ctx.beginPath();
          ctx.roundRect(st.x, st.y, st.w, st.h, 16);
          ctx.stroke();
          ctx.restore();

          // Bouncing golden tutorial arrow over focused stall
          if (isTutFocused) {
            const arrowBounce = Math.sin(elapsed * 6) * 5;
            const arrowX = cx;
            const arrowY = st.y - 14 + arrowBounce;
            ctx.save();
            ctx.fillStyle = '#fde047';
            ctx.strokeStyle = '#0f172a';
            ctx.lineWidth = 2.4;
            ctx.beginPath();
            ctx.moveTo(arrowX, arrowY + 11);
            ctx.lineTo(arrowX - 11, arrowY - 5);
            ctx.lineTo(arrowX + 11, arrowY - 5);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            ctx.restore();
          }

          // Bottom interactive stall badge
          const badgeW = Math.min(st.w - 10, Math.max(152, st.w * 0.86));
          const badgeH = 30;
          const badgeX = cx - badgeW * 0.5;
          const badgeY = st.y + st.h - badgeH - 10;
          ctx.save();
          ctx.globalAlpha = st.inactive ? 0.65 : isTutDimmed ? 0.52 : 1;
          ctx.fillStyle = isHovered
            ? isUnderworldMarket
              ? 'rgba(28, 10, 6, 0.95)'
              : 'rgba(9, 14, 26, 0.94)'
            : isUnderworldMarket
              ? 'rgba(20, 7, 5, 0.82)'
              : 'rgba(9, 14, 26, 0.78)';
          ctx.strokeStyle = st.color;
          ctx.lineWidth = isHovered ? 2 : 1.2;
          ctx.beginPath();
          ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 9);
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = st.inactive ? '#cbd5e1' : isHovered ? st.color : '#f8fafc';
          ctx.font = `800 ${width < 640 ? 10 : 11.5}px Outfit, sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(st.badge, cx, badgeY + badgeH * 0.5 + 0.5, badgeW - 14);
          ctx.restore();

          ctx.restore();
        }
      }

      // CAPA 1 (Skin Fondo): Distorsión térmica, niebla arcana, charco de lava, portal y círculos mágicos
      if (!inMarketScene) {
        skinEngine.renderBackgroundLayer(ctx, skinFrameState);
      }

      // 4. Procedural Dock Angler (full skins support + expressive stickman face + 2D walking cycle)
      ctx.save();
      ctx.translate(charX, charY);
      ctx.scale(facingDir * charScale, charScale);

      const groundShadowOffsetY = walkBounceY / charScale;
      ctx.save();
      ctx.translate(0, groundShadowOffsetY);

      // RTX Dynamic Directional Cast Shadow & Multi-Layered Ambient Penumbra
      if (isRtx) {
        // Long directional cast shadow across the dock away from the sunset sun (down-left) / lava glare
        const shadowDir = isUnderworldTheme ? -1 : -0.82 * facingDir;
        ctx.save();
        ctx.translate(0, 1);
        ctx.transform(1, 0, shadowDir * (0.9 + torsoTilt * 0.65), 0.32, 0, 0);
        const castShadowGrad = ctx.createLinearGradient(0, 0, 0, -128);
        castShadowGrad.addColorStop(
          0,
          isUnderworldTheme ? 'rgba(18, 4, 4, 0.58)' : 'rgba(26, 12, 5, 0.54)'
        );
        castShadowGrad.addColorStop(
          0.55,
          isUnderworldTheme ? 'rgba(30, 8, 8, 0.3)' : 'rgba(42, 20, 8, 0.25)'
        );
        castShadowGrad.addColorStop(
          1,
          isUnderworldTheme ? 'rgba(30, 8, 8, 0)' : 'rgba(42, 20, 8, 0)'
        );
        ctx.fillStyle = castShadowGrad;
        // Shadow torso + legs silhouette
        ctx.beginPath();
        ctx.roundRect(-16, -96 - heightBoost, 32, 96 + heightBoost, 8);
        ctx.fill();
        // Shadow head
        ctx.beginPath();
        ctx.arc(0, -110 - heightBoost, 15, 0, Math.PI * 2);
        ctx.fill();
        // Shadow arm
        ctx.lineCap = 'round';
        ctx.strokeStyle = isUnderworldTheme
          ? 'rgba(18, 4, 4, 0.34)'
          : 'rgba(26, 12, 5, 0.3)';
        ctx.lineWidth = 8;
        ctx.beginPath();
        ctx.moveTo(shX, shY);
        ctx.lineTo(handLocalX, handLocalY);
        ctx.stroke();
        ctx.restore();

        // Soft wide ambient occlusion shadow under boots on sunlit planks
        const aoGrad = ctx.createRadialGradient(-2, 0.5, 4, -2, 0.5, 40);
        aoGrad.addColorStop(
          0,
          isUnderworldTheme ? 'rgba(18, 4, 4, 0.62)' : 'rgba(24, 11, 4, 0.58)'
        );
        aoGrad.addColorStop(
          0.55,
          isUnderworldTheme ? 'rgba(24, 6, 6, 0.28)' : 'rgba(38, 18, 7, 0.26)'
        );
        aoGrad.addColorStop(
          1,
          isUnderworldTheme ? 'rgba(24, 6, 6, 0)' : 'rgba(38, 18, 7, 0)'
        );
        ctx.fillStyle = aoGrad;
        ctx.beginPath();
        ctx.ellipse(-2.5, 1, 40, 10.5, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      // Volcanic lava crack & magma bounce under-glow beneath player boots in Underworld Market
      if (isUnderworldMarket && !isLow) {
        const lavaBounce = ctx.createRadialGradient(0, 1, 2, 0, 1, 34);
        lavaBounce.addColorStop(0, 'rgba(249, 115, 22, 0.34)');
        lavaBounce.addColorStop(0.55, 'rgba(220, 38, 38, 0.16)');
        lavaBounce.addColorStop(1, 'rgba(220, 38, 38, 0)');
        ctx.fillStyle = lavaBounce;
        ctx.beginPath();
        ctx.ellipse(0, 1, 34, 8.8, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      // Dock contact shadow & subtle suit aura flush under boots at y = 0
      if (isMillionaire) {
        ctx.fillStyle = isRtx ? 'rgba(250, 204, 21, 0.48)' : 'rgba(250, 204, 21, 0.32)';
        ctx.beginPath();
        ctx.ellipse(0.5, 0, isRtx ? 32 : 27, isRtx ? 8.5 : 7, 0, 0, Math.PI * 2);
        ctx.fill();
      } else if (isMagma) {
        ctx.fillStyle = isRtx ? 'rgba(249, 115, 22, 0.52)' : 'rgba(249, 115, 22, 0.36)';
        ctx.beginPath();
        ctx.ellipse(0.5, 0, isRtx ? 32 : 27, isRtx ? 8.5 : 7, 0, 0, Math.PI * 2);
        ctx.fill();
      } else if (isWizard) {
        ctx.fillStyle = isRtx ? 'rgba(168, 85, 247, 0.48)' : 'rgba(168, 85, 247, 0.34)';
        ctx.beginPath();
        ctx.ellipse(0.5, 0, isRtx ? 32 : 27, isRtx ? 8.5 : 7, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      if (!isLow) {
        const strideShadowSpread = isCharWalking ? Math.abs(Math.sin(walkCycle)) * 4.5 : 0;
        ctx.fillStyle = isUnderworldTheme
          ? isRtx
            ? 'rgba(18, 4, 4, 0.52)'
            : 'rgba(24, 6, 6, 0.38)'
          : isRtx
            ? 'rgba(26, 12, 4, 0.5)'
            : 'rgba(32, 15, 6, 0.38)';
        ctx.beginPath();
        ctx.ellipse(-1, 0.5, 22 + strideShadowSpread, 5.8, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      // Always ground angler on dock planks with warm left-directed penumbra
      if (!isRtx && !isLow) {
        const normalAoGrad = ctx.createRadialGradient(-2, 0.5, 3, -2, 0.5, 32);
        normalAoGrad.addColorStop(
          0,
          isUnderworldTheme ? 'rgba(15, 4, 4, 0.54)' : 'rgba(26, 12, 4, 0.52)'
        );
        normalAoGrad.addColorStop(
          1,
          isUnderworldTheme ? 'rgba(15, 4, 4, 0)' : 'rgba(26, 12, 4, 0)'
        );
        ctx.fillStyle = normalAoGrad;
        ctx.beginPath();
        ctx.ellipse(-3.5, 1, 32, 8.2, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      // Tight boot-sole contact shadows directly onto wood grain / dirt path
      const soleOffset = 7.5;
      const soleSwing = isCharWalking ? Math.sin(walkCycle) * 8.5 : 0;
      const soleRx = 8.2;
      ctx.fillStyle = isUnderworldTheme
        ? isLow
          ? 'rgba(15, 4, 4, 0.38)'
          : 'rgba(15, 4, 4, 0.56)'
        : isLow
          ? 'rgba(24, 11, 4, 0.38)'
          : 'rgba(22, 10, 3, 0.58)';
      ctx.beginPath();
      ctx.ellipse(-soleOffset - soleSwing, 0.6, soleRx, 2.8, 0, 0, Math.PI * 2);
      ctx.ellipse(soleOffset + soleSwing, 0.6, soleRx, 2.8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore(); // end groundShadowOffsetY

      // Boots & Pants (contoured with warm sunset plank shading & 2D walking stride)
        const pantsColor = isMillionaire
          ? '#090d16'
          : isMagma
            ? '#1c1917'
            : isWizard
              ? '#1e1b4b'
              : pantsStyle
                ? pantsStyle.main
                : '#1e3a5f';
        const contourColor = isUnderworldTheme
          ? 'rgba(24, 6, 6, 0.72)'
          : 'rgba(34, 18, 8, 0.56)';
        const bootFillColor = isMillionaire
          ? '#020617'
          : isMagma
            ? '#ea580c'
            : isWizard
              ? '#4c1d95'
              : hasTallBoots
                ? '#78350f'
                : '#451a03';
        const bootH = !isMillionaire && !isMagma && !isWizard && hasTallBoots ? 13 : 8;
        const hipPivotY = -44 - heightBoost;

        const drawSingleLeg = (isFrontLeg: boolean, angle: number) => {
          const legX = isFrontLeg ? 3 : -10;
          const bootX = isFrontLeg ? 2.5 : -11.5;
          const soleX = isFrontLeg ? 2 : -12;
          const hipCenterX = isFrontLeg ? 5.5 : -5.5;
          const liftY = isCharWalking ? -Math.max(0, Math.sin(isFrontLeg ? walkCycle : walkCycle + Math.PI)) * 3.2 : 0;

          ctx.save();
          ctx.translate(hipCenterX, hipPivotY + liftY);
          ctx.rotate(angle);
          ctx.translate(-hipCenterX, -hipPivotY);

          ctx.fillStyle = pantsColor;
          ctx.beginPath();
          ctx.roundRect(legX, -46 - heightBoost, 9, 42 + heightBoost, 3);
          ctx.fill();
          if (!isLow) {
            ctx.strokeStyle = contourColor;
            ctx.lineWidth = 1.1;
            ctx.stroke();
            if (isFrontLeg) {
              ctx.fillStyle = isUnderworldTheme
                ? 'rgba(251, 146, 60, 0.24)'
                : 'rgba(253, 224, 71, 0.24)';
              ctx.fillRect(8.4, -44 - heightBoost, 2.2, 34 + heightBoost);
            }
            if (!isUnderworldTheme) {
              ctx.fillStyle = 'rgba(245, 158, 11, 0.14)';
              ctx.fillRect(legX + 0.5, -18, 8, 12);
            }
          }

          if (isMillionaire) {
            ctx.fillStyle = '#facc15';
            ctx.fillRect(isFrontLeg ? 9 : -11, -45, 2, 38);
          } else if (isMagma) {
            ctx.fillStyle = '#f97316';
            ctx.fillRect(isFrontLeg ? 5 : -7, -42, 2, 32);
          } else if (!isWizard && pantsStyle) {
            ctx.fillStyle = pantsStyle.pocket;
            ctx.fillRect(isFrontLeg ? 9 : -13, -28 - heightBoost * 0.5, 4, 8);
          }

          ctx.fillStyle = bootFillColor;
          ctx.beginPath();
          ctx.roundRect(bootX, -bootH, 12, bootH, 2.5);
          ctx.fill();
          if (!isLow) {
            ctx.strokeStyle = contourColor;
            ctx.lineWidth = 1;
            ctx.stroke();
            if (isFrontLeg) {
              ctx.fillStyle = isUnderworldTheme
                ? 'rgba(251, 146, 60, 0.25)'
                : 'rgba(253, 224, 71, 0.24)';
              ctx.fillRect(11.6, -bootH + 1.5, 1.8, Math.max(2, bootH - 3.5));
            }
          }
          ctx.fillStyle = isUnderworldTheme ? '#090d16' : '#1c1008';
          ctx.fillRect(soleX, -2.2, 13, 2.2);

          ctx.restore();
        };

        const leg1Swing = isCharWalking ? Math.sin(walkCycle) * 0.35 : 0;
        const leg2Swing = isCharWalking ? Math.sin(walkCycle + Math.PI) * 0.35 : 0;
        drawSingleLeg(false, leg1Swing);
        drawSingleLeg(true, leg2Swing);

        ctx.save();
        ctx.translate(0, pivotY);
        ctx.rotate(torsoTilt);
        ctx.translate(0, -pivotY);

        const torsoOuterColor = isMillionaire
          ? '#0f172a'
          : isMagma
            ? '#292524'
            : isWizard
              ? '#312e81'
              : hasCoat
                ? '#0284c7'
                : hasHoodie
                  ? '#2563eb'
                  : hasCrimsonJacket
                    ? '#dc2626'
                    : shirtStyle
                      ? shirtStyle.main
                      : '#78350f';
        const torsoInnerColor = isMillionaire
          ? '#1e293b'
          : isMagma
            ? '#1c1917'
            : isWizard
              ? '#4338ca'
              : hasCoat
                ? '#0369a1'
                : hasHoodie
                  ? '#1d4ed8'
                  : hasCrimsonJacket
                    ? '#991b1b'
                    : shirtStyle
                      ? shirtStyle.border
                      : '#a16207';

        if (isWizard) {
          ctx.fillStyle = '#312e81';
          ctx.beginPath();
          ctx.moveTo(-16, torsoY);
          ctx.lineTo(16, torsoY);
          ctx.lineTo(22, torsoY + 62);
          ctx.lineTo(-22, torsoY + 62);
          ctx.closePath();
          ctx.fill();
          ctx.strokeStyle = '#818cf8';
          ctx.lineWidth = 1.6;
          ctx.stroke();
          ctx.fillStyle = '#facc15';
          ctx.fillRect(-2, torsoY, 4, 62);
          ctx.fillRect(-18, torsoY + 28, 36, 5);
          ctx.fillStyle = '#fde047';
          ctx.beginPath();
          ctx.arc(-10, torsoY + 18, 1.8, 0, Math.PI * 2);
          ctx.arc(11, torsoY + 46, 1.8, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillStyle = torsoOuterColor;
          ctx.beginPath();
          ctx.roundRect(-16, torsoY, 32, 50, 7);
          ctx.fill();
          ctx.fillStyle = torsoInnerColor;
          ctx.fillRect(-12, torsoY + 4, 24, 42);
        }

        if (isMillionaire) {
          ctx.strokeStyle = '#facc15';
          ctx.lineWidth = 1.8;
          ctx.beginPath();
          ctx.roundRect(-16, torsoY, 32, 50, 7);
          ctx.stroke();
          ctx.fillStyle = '#f8fafc';
          ctx.beginPath();
          ctx.moveTo(-6, torsoY + 1);
          ctx.lineTo(6, torsoY + 1);
          ctx.lineTo(0, torsoY + 24);
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = '#eab308';
          ctx.beginPath();
          ctx.moveTo(-4, torsoY + 2);
          ctx.lineTo(4, torsoY + 6);
          ctx.lineTo(4, torsoY + 2);
          ctx.lineTo(-4, torsoY + 6);
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = '#38bdf8';
          ctx.beginPath();
          ctx.arc(9, torsoY + 15, 2.3, 0, Math.PI * 2);
          ctx.fill();
        } else if (isMagma) {
          ctx.strokeStyle = '#f97316';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(-14, torsoY + 14);
          ctx.lineTo(-4, torsoY + 22);
          ctx.moveTo(14, torsoY + 14);
          ctx.lineTo(4, torsoY + 22);
          ctx.moveTo(-9, torsoY + 40);
          ctx.lineTo(0, torsoY + 33);
          ctx.lineTo(9, torsoY + 40);
          ctx.stroke();
          ctx.fillStyle = '#fde047';
          ctx.strokeStyle = '#ef4444';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(0, torsoY + 12);
          ctx.lineTo(6, torsoY + 22);
          ctx.lineTo(0, torsoY + 32);
          ctx.lineTo(-6, torsoY + 22);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        } else if (!isWizard) {
          if (hasHoodie) {
            ctx.strokeStyle = '#e2e8f0';
            ctx.lineWidth = 1.6;
            ctx.beginPath();
            ctx.moveTo(-4, torsoY + 3);
            ctx.lineTo(-4, torsoY + 15);
            ctx.moveTo(4, torsoY + 3);
            ctx.lineTo(4, torsoY + 15);
            ctx.stroke();
          }
          if (hasCrimsonJacket) {
            ctx.fillStyle = '#f8fafc';
            ctx.fillRect(-16, torsoY + 22, 32, 5);
          }
          if (hasScarfGold || hasScarfCrimson) {
            const scMain = hasScarfGold ? '#facc15' : '#ef4444';
            const scTail = hasScarfGold ? '#eab308' : '#dc2626';
            ctx.fillStyle = scMain;
            ctx.beginPath();
            ctx.roundRect(-13, torsoY - 3, 26, 7, 3);
            ctx.fill();
            ctx.fillStyle = scTail;
            ctx.fillRect(4, torsoY + 3, 6, 15);
          }
        }

        const headY = torsoY - 16;
        const skinColor = isMagma ? '#1c1917' : '#f5cfa0';
        if (!isLow) {
          ctx.fillStyle = isMagma ? '#0c0a09' : '#c6935f';
          ctx.fillRect(-5, torsoY - 5, 10, 6);
        }
        ctx.fillStyle = skinColor;
        ctx.beginPath();
        ctx.arc(0, headY, 14, 0, Math.PI * 2);
        ctx.fill();
        if (!isLow && !isMagma) {
          const faceTint = ctx.createLinearGradient(-14, headY, 14, headY);
          faceTint.addColorStop(0, isUnderworldTheme ? 'rgba(69, 10, 10, 0.22)' : 'rgba(15, 23, 42, 0.16)');
          faceTint.addColorStop(0.55, 'rgba(255, 255, 255, 0)');
          faceTint.addColorStop(1, isUnderworldTheme ? 'rgba(251, 146, 60, 0.2)' : 'rgba(254, 240, 138, 0.24)');
          ctx.fillStyle = faceTint;
          ctx.fill();
          ctx.strokeStyle = 'rgba(120, 74, 38, 0.45)';
          ctx.lineWidth = 1.1;
          ctx.stroke();
        }

        const leftEyeX = -4.0;
        const rightEyeX = 4.8;
        const eyeY = headY - 2.0;
        const mouthX = 0.6;
        const mouthY = headY + 5.6;

        const isHappyFace = phase === 'CAUGHT';
        const isSadFace = phase === 'MISSED' || isFailFace;
        const isPullingFace = isFighting || phase === 'BITING';
        const isCastFace = phase === 'CASTING' && castT >= 0.24 && castT <= 0.72;
        const highStrain = isPullingFace && Boolean(ft && ft.tension > 0.62);
        const blinkCycle = elapsed % 4.2;
        const isBlinking =
          !isHappyFace &&
          !isSadFace &&
          !isPullingFace &&
          !isCastFace &&
          blinkCycle > 4.06;

        if (isMagma) {
          ctx.strokeStyle = '#f97316';
          ctx.lineWidth = 2;
          ctx.stroke();
          ctx.fillStyle = '#fde047';
          ctx.beginPath();
          ctx.roundRect(-8, headY - 4.4, 16, 4.8, 2);
          ctx.fill();
          // Stickman eyes glowing inside volcanic visor
          ctx.fillStyle = '#1c1917';
          if (isBlinking) {
            ctx.fillRect(leftEyeX - 1.6, eyeY - 0.5, 3.2, 1.1);
            ctx.fillRect(rightEyeX - 1.6, eyeY - 0.5, 3.2, 1.1);
          } else {
            const mEyeRy = isHappyFace || isPullingFace || isSadFace ? 1.8 : 1.5;
            ctx.beginPath();
            ctx.ellipse(leftEyeX, eyeY, 1.35, mEyeRy, 0, 0, Math.PI * 2);
            ctx.ellipse(rightEyeX, eyeY, 1.35, mEyeRy, 0, 0, Math.PI * 2);
            ctx.fill();
          }
        }

        if (isWizard || (!isMillionaire && !isMagma && hasBeard)) {
          ctx.fillStyle = isWizard ? '#e2e8f0' : '#78350f';
          ctx.beginPath();
          ctx.arc(0, headY + 4, 12, 0, Math.PI);
          ctx.fill();
        }

        // Stickman eyes (also visible behind Millionaire monocle)
        if (!isMagma && (isMillionaire || isWizard || (!hasGlasses && !hasPixelGlasses))) {
          if (isBlinking) {
            ctx.strokeStyle = '#0f172a';
            ctx.lineWidth = 1.65;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(leftEyeX - 2.1, eyeY);
            ctx.lineTo(leftEyeX + 2.1, eyeY);
            ctx.moveTo(rightEyeX - 2.1, eyeY);
            ctx.lineTo(rightEyeX + 2.1, eyeY);
            ctx.stroke();
          } else {
            const eyeRx = isSadFace ? 1.75 : 1.55;
            const eyeRy = isHappyFace || isPullingFace || isSadFace ? 2.65 : 2.25;
            ctx.fillStyle = '#0f172a';
            ctx.beginPath();
            ctx.ellipse(leftEyeX, eyeY, eyeRx, eyeRy, 0, 0, Math.PI * 2);
            ctx.ellipse(rightEyeX, eyeY, eyeRx, eyeRy, 0, 0, Math.PI * 2);
            ctx.fill();
          }

          // Subtle expressive stickman eyebrows
          if (isPullingFace || isSadFace || isHappyFace || isCastFace) {
            ctx.strokeStyle = isWizard ? '#94a3b8' : '#3b200f';
            ctx.lineWidth = 1.25;
            ctx.lineCap = 'round';
            ctx.beginPath();
            if (isSadFace) {
              ctx.moveTo(leftEyeX - 2.2, eyeY - 3.6);
              ctx.lineTo(leftEyeX + 1.8, eyeY - 5.0);
              ctx.moveTo(rightEyeX - 1.8, eyeY - 5.0);
              ctx.lineTo(rightEyeX + 2.2, eyeY - 3.6);
            } else if (isPullingFace || isCastFace) {
              ctx.moveTo(leftEyeX - 2.0, eyeY - 5.0);
              ctx.lineTo(leftEyeX + 1.8, eyeY - 3.6);
              ctx.moveTo(rightEyeX - 1.8, eyeY - 3.6);
              ctx.lineTo(rightEyeX + 2.0, eyeY - 5.0);
            } else if (isHappyFace) {
              ctx.moveTo(leftEyeX - 2.0, eyeY - 4.4);
              ctx.quadraticCurveTo(leftEyeX, eyeY - 6.0, leftEyeX + 2.0, eyeY - 4.4);
              ctx.moveTo(rightEyeX - 2.0, eyeY - 4.4);
              ctx.quadraticCurveTo(rightEyeX, eyeY - 6.0, rightEyeX + 2.0, eyeY - 4.4);
            }
            ctx.stroke();
          }
        }

        if (isMillionaire) {
          ctx.strokeStyle = '#facc15';
          ctx.lineWidth = 1.7;
          ctx.fillStyle = 'rgba(56, 189, 248, 0.22)';
          ctx.beginPath();
          ctx.arc(rightEyeX, eyeY, 4.3, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(rightEyeX + 3.8, eyeY + 2.2);
          ctx.lineTo(rightEyeX + 5.2, eyeY + 12.2);
          ctx.stroke();
        } else if (!isMagma && !isWizard && (hasGlasses || hasPixelGlasses)) {
          ctx.fillStyle = '#0f172a';
          ctx.fillRect(-9, headY - 4.5, 8, 5);
          ctx.fillRect(1, headY - 4.5, 8, 5);
          ctx.fillRect(-1, headY - 3, 2, 1.8);
          if (hasPixelGlasses) {
            ctx.fillStyle = '#facc15';
            ctx.fillRect(-7, headY - 3.5, 2.5, 2.5);
            ctx.fillRect(3, headY - 3.5, 2.5, 2.5);
          }
        }

        // Expressive Stickman Mouth reacting to fishing state
        ctx.save();
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        const mouthStroke = isMagma
          ? '#fde047'
          : isWizard
            ? '#1e1b4b'
            : hasBeard && !isMillionaire
              ? '#2a1205'
              : '#1e1b4b';
        const mouthFill = isMagma ? '#ea580c' : '#991b1b';

        if (isHappyFace) {
          // Big cheerful catch D-smile
          ctx.fillStyle = mouthFill;
          ctx.strokeStyle = mouthStroke;
          ctx.lineWidth = 1.35;
          ctx.beginPath();
          ctx.moveTo(mouthX - 4.6, mouthY - 0.8);
          ctx.lineTo(mouthX + 4.8, mouthY - 0.8);
          ctx.quadraticCurveTo(mouthX + 0.1, mouthY + 6.4, mouthX - 4.6, mouthY - 0.8);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          // Subtle upper smile highlight
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(mouthX - 2.6, mouthY - 0.6, 5.4, 1.3);
        } else if (isSadFace) {
          if (isSnapVisual && failAge < 0.75) {
            // Shocked 'O' right as line snaps
            ctx.fillStyle = mouthFill;
            ctx.strokeStyle = mouthStroke;
            ctx.lineWidth = 1.45;
            ctx.beginPath();
            ctx.ellipse(mouthX, mouthY + 0.6, 2.5, 3.1, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
          } else {
            // Clear disappointed frown on escape / miss
            ctx.strokeStyle = mouthStroke;
            ctx.lineWidth = 1.6;
            ctx.beginPath();
            ctx.moveTo(mouthX - 3.8, mouthY + 2.2);
            ctx.quadraticCurveTo(mouthX, mouthY - 2.6, mouthX + 4.0, mouthY + 2.2);
            ctx.stroke();
          }
        } else if (isPullingFace) {
          if (highStrain) {
            // Tense clenched teeth grimace under heavy fish tension
            ctx.fillStyle = '#f8fafc';
            ctx.strokeStyle = mouthStroke;
            ctx.lineWidth = 1.35;
            ctx.beginPath();
            ctx.roundRect(mouthX - 4.0, mouthY - 1.3, 8.2, 3.6, 1.6);
            ctx.fill();
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(mouthX - 3.5, mouthY + 0.5);
            ctx.lineTo(mouthX + 3.7, mouthY + 0.5);
            ctx.stroke();
          } else {
            // Focused determined pull grin / grit
            ctx.strokeStyle = mouthStroke;
            ctx.lineWidth = 1.55;
            ctx.beginPath();
            ctx.moveTo(mouthX - 3.6, mouthY + 0.6);
            ctx.quadraticCurveTo(mouthX, mouthY - 1.2, mouthX + 3.8, mouthY + 0.5);
            ctx.stroke();
          }
        } else if (isCastFace) {
          // Focused small effort 'o' while casting
          ctx.fillStyle = mouthFill;
          ctx.strokeStyle = mouthStroke;
          ctx.lineWidth = 1.35;
          ctx.beginPath();
          ctx.ellipse(mouthX, mouthY + 0.4, 1.8, 2.1, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        } else {
          // Calm relaxed stickman smile (IDLE / WAITING)
          ctx.strokeStyle = mouthStroke;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(mouthX - 3.2, mouthY - 0.1);
          ctx.quadraticCurveTo(mouthX, mouthY + 2.5, mouthX + 3.4, mouthY - 0.1);
          ctx.stroke();
        }
        ctx.restore();

        if (isMillionaire) {
          ctx.fillStyle = '#090d16';
          ctx.strokeStyle = '#facc15';
          ctx.lineWidth = 1.4;
          ctx.fillRect(-13, headY - 26, 26, 19);
          ctx.strokeRect(-13, headY - 26, 26, 19);
          ctx.fillStyle = '#eab308';
          ctx.fillRect(-13, headY - 11, 26, 3.5);
          ctx.fillStyle = '#0f172a';
          ctx.fillRect(-20, headY - 8, 40, 4);
          ctx.strokeRect(-20, headY - 8, 40, 4);
        } else if (isMagma) {
          ctx.fillStyle = '#f97316';
          ctx.strokeStyle = '#fde047';
          ctx.lineWidth = 1.6;
          ctx.beginPath();
          ctx.moveTo(-10, headY - 12);
          ctx.lineTo(-19, headY - 26);
          ctx.lineTo(-4, headY - 15);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(10, headY - 12);
          ctx.lineTo(19, headY - 26);
          ctx.lineTo(4, headY - 15);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        } else if (isWizard) {
          ctx.fillStyle = '#4338ca';
          ctx.strokeStyle = '#c084fc';
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          ctx.moveTo(0, headY - 34);
          ctx.lineTo(16, headY - 7);
          ctx.lineTo(-16, headY - 7);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          ctx.fillStyle = '#facc15';
          ctx.fillRect(-12, headY - 11, 24, 3.5);
          ctx.fillStyle = '#3730a3';
          ctx.beginPath();
          ctx.ellipse(0, headY - 7, 21, 4, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        } else if (hasCrown) {
          ctx.fillStyle = '#facc15';
          ctx.strokeStyle = '#92400e';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(-14, headY - 6);
          ctx.lineTo(-12, headY - 20);
          ctx.lineTo(-5, headY - 13);
          ctx.lineTo(0, headY - 23);
          ctx.lineTo(5, headY - 13);
          ctx.lineTo(12, headY - 20);
          ctx.lineTo(14, headY - 6);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          ctx.fillStyle = '#dc2626';
          ctx.beginPath();
          ctx.arc(0, headY - 11, 2.2, 0, Math.PI * 2);
          ctx.fill();
        } else if (hasBeanie) {
          ctx.fillStyle = '#f8fafc';
          ctx.beginPath();
          ctx.arc(0, headY - 20, 4, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#0284c7';
          ctx.beginPath();
          ctx.arc(0, headY - 6, 15, Math.PI, 0);
          ctx.fill();
          ctx.fillStyle = '#38bdf8';
          ctx.fillRect(-16, headY - 9, 32, 5);
        } else {
          ctx.fillStyle = hasRedHat ? '#dc2626' : hasBlueCap ? '#1d4ed8' : '#57534e';
          ctx.beginPath();
          ctx.arc(0, headY - 6, 15, Math.PI, 0);
          ctx.fill();
          ctx.fillRect(-20, headY - 7, 40, 4);
        }

        if (worldRef.current === 'underworld' && !isMagma) {
          ctx.fillStyle = '#fde047';
          ctx.strokeStyle = '#713f12';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(-10, headY - 17);
          ctx.quadraticCurveTo(-18, headY - 30, -9, headY - 26);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(10, headY - 17);
          ctx.quadraticCurveTo(18, headY - 30, 9, headY - 26);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        }

        ctx.lineCap = 'round';
        ctx.strokeStyle = torsoOuterColor;
        ctx.lineWidth = 7.5;
        ctx.beginPath();
        ctx.moveTo(shX, shY);
        ctx.lineTo(handLocalX, handLocalY);
        ctx.stroke();

        if (!isLow) {
          ctx.strokeStyle = isUnderworldTheme
            ? 'rgba(251, 146, 60, 0.28)'
            : 'rgba(253, 224, 71, 0.28)';
          ctx.lineWidth = 2.1;
          ctx.beginPath();
          ctx.moveTo(shX, shY - 2.3);
          ctx.lineTo(handLocalX, handLocalY - 2.3);
          ctx.stroke();
        }

        ctx.fillStyle = skinColor;
        ctx.beginPath();
        ctx.arc(handLocalX, handLocalY, 4.2, 0, Math.PI * 2);
        ctx.fill();
        if (!isLow && !isMagma) {
          ctx.strokeStyle = 'rgba(120, 68, 32, 0.5)';
          ctx.lineWidth = 0.9;
          ctx.stroke();
        }

        if (!isLow) {
          ctx.save();
          const torsoShade = ctx.createLinearGradient(-16, torsoY, 16, torsoY + 48);
          torsoShade.addColorStop(
            0,
            isUnderworldTheme ? 'rgba(20, 4, 4, 0.34)' : 'rgba(28, 16, 10, 0.28)'
          );
          torsoShade.addColorStop(0.5, 'rgba(255, 255, 255, 0)');
          torsoShade.addColorStop(
            1,
            isUnderworldTheme
              ? isRtx
                ? 'rgba(251, 146, 60, 0.3)'
                : 'rgba(251, 146, 60, 0.2)'
              : isRtx
                ? 'rgba(253, 224, 71, 0.34)'
                : 'rgba(253, 224, 71, 0.22)'
          );
          ctx.fillStyle = torsoShade;
          ctx.beginPath();
          ctx.roundRect(-16, torsoY, 32, 50, 7);
          ctx.fill();
          if (!isWizard && !isMillionaire && !isMagma) {
            ctx.strokeStyle = isUnderworldTheme
              ? 'rgba(20, 5, 5, 0.55)'
              : 'rgba(34, 18, 8, 0.46)';
            ctx.lineWidth = 1.1;
            ctx.stroke();
          }
          if (!isUnderworldTheme) {
            ctx.strokeStyle = isRtx
              ? 'rgba(254, 240, 138, 0.55)'
              : 'rgba(254, 240, 138, 0.35)';
            ctx.lineWidth = 1.3;
            ctx.beginPath();
            ctx.moveTo(8, torsoY + 1);
            ctx.quadraticCurveTo(15.5, torsoY + 2, 15.5, torsoY + 12);
            ctx.stroke();
          }
          ctx.restore();
        }

        ctx.restore();
        ctx.restore();

      // Estela de movimiento al lanzar la caña o varita
      if (phase === 'CASTING' && castT >= 0.32 && castT <= 0.72) {
        const swooshAlpha = Math.sin(((castT - 0.32) / 0.4) * Math.PI) * 0.65;
        ctx.save();
        ctx.strokeStyle = isWizard
          ? `rgba(192, 132, 252, ${swooshAlpha})`
          : isMagma
            ? `rgba(249, 115, 22, ${swooshAlpha})`
            : isMillionaire
              ? `rgba(250, 204, 21, ${swooshAlpha})`
              : worldRef.current === 'underworld'
                ? `rgba(253, 224, 71, ${swooshAlpha})`
                : `rgba(224, 242, 254, ${swooshAlpha})`;
        ctx.lineWidth = isWizard ? 4.5 : 3.5;
        ctx.setLineDash([10, 8]);
        ctx.beginPath();
        ctx.arc(
          rodBaseX,
          rodBaseY,
          rodLen * 0.92,
          -2.42 + 0.15,
          Math.max(-2.42 + 0.25, castRodAngle),
          false
        );
        ctx.stroke();
        ctx.restore();
      }

      if (isWizard) {
        // Varita arcana con cristal flotante pulsante y runas en secuencia
        drawWizardCrystalWand(
          ctx,
          rodBaseX,
          rodBaseY,
          rodTipX,
          rodTipY,
          elapsed,
          phase === 'BITING'
        );

        const wizardRayCfg = getWizardRayConfig(pendingCatchRef.current?.species.rarity);

        if (!isCharWalking && !inMarketScene && phase === 'CASTING') {
          if (castT >= 0.52 && projectileX !== null && projectileY !== null) {
            const flyT = Math.min(1, (castT - 0.52) / 0.46);
            if (flyT >= 0.94 && !castLandedFired) {
              castLandedFired = true;
              wizardRayActive = true;
              wizardRayTime = 0;
              sound.playWizardRay(wizardRayCfg.intensity);
              spawnSplash(holeX, holeY + 2, 10 + wizardRayCfg.intensity * 3, wizardRayCfg.outerColor);
              spawnSplash(holeX, holeY + 2, 8 + wizardRayCfg.intensity * 2, wizardRayCfg.secondaryColor);
              spawnRipple(holeX, holeY + 2, 10, 54 + wizardRayCfg.intensity * 6, 0.55, 3.0, wizardRayCfg.secondaryColor);
              spawnRipple(holeX, holeY + 2, 14, 76 + wizardRayCfg.intensity * 8, 0.85, 2.4, wizardRayCfg.outerColor);
            }

            if (flyT < 0.96 && modeRef.current !== 'paused') {
              for (let i = BOBBER_TRAIL_LEN - 1; i > 0; i--) {
                bobberTrailX[i] = bobberTrailX[i - 1];
                bobberTrailY[i] = bobberTrailY[i - 1];
              }
              bobberTrailX[0] = projectileX;
              bobberTrailY[0] = projectileY;
              if (bobberTrailCount < BOBBER_TRAIL_LEN) bobberTrailCount++;
            }

            ctx.save();
            for (let i = 1; i < bobberTrailCount; i++) {
              const alpha = (1 - i / bobberTrailCount) * 0.78;
              const rad = Math.max(2, 7.5 * (1 - i / bobberTrailCount));
              ctx.fillStyle = i % 2 === 0 ? `rgba(192, 132, 252, ${alpha})` : `rgba(34, 211, 238, ${alpha})`;
              ctx.beginPath();
              ctx.arc(bobberTrailX[i], bobberTrailY[i], rad, 0, Math.PI * 2);
              ctx.fill();
            }
            ctx.fillStyle = '#ecfeff';
            ctx.shadowColor = '#22d3ee';
            ctx.shadowBlur = 16;
            ctx.beginPath();
            ctx.arc(projectileX, projectileY, 7.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          }
        } else if (!isCharWalking && !inMarketScene && (phase === 'WAITING' || phase === 'BITING')) {
          const isBite = phase === 'BITING';
          const ringRx = (isBite ? 34 : 26) + Math.sin(elapsed * (isBite ? 16 : 4)) * (isBite ? 5 : 2);
          const ringRy = ringRx * 0.42;

          ctx.save();
          ctx.strokeStyle = isBite ? wizardRayCfg.secondaryColor : wizardRayCfg.outerColor;
          ctx.lineWidth = isBite ? 3.5 : 2.5;
          ctx.shadowColor = wizardRayCfg.outerColor;
          ctx.shadowBlur = isBite ? 18 : 12;
          ctx.beginPath();
          ctx.ellipse(holeX, holeY + 2, ringRx, ringRy, 0, 0, Math.PI * 2);
          ctx.stroke();

          const moteCount = isBite ? 9 : 5;
          for (let m = 0; m < moteCount; m++) {
            const p = ((elapsed * (isBite ? 2.4 : 0.85) + m / moteCount) % 1);
            const curveLift = Math.sin(p * Math.PI) * 32;
            const px = rodTipX + (holeX - rodTipX) * p;
            const py = rodTipY + (holeY + 2 - rodTipY) * p - curveLift;
            ctx.fillStyle = m % 2 === 0 ? wizardRayCfg.secondaryColor : wizardRayCfg.outerColor;
            ctx.beginPath();
            ctx.arc(px, py, isBite ? 3.8 : 2.4, 0, Math.PI * 2);
            ctx.fill();
          }

          if (isBite) {
            ctx.strokeStyle = `rgba(${wizardRayCfg.rgbSecondary}, 0.78)`;
            ctx.lineWidth = 2.6;
            ctx.setLineDash([8, 6]);
            ctx.beginPath();
            ctx.moveTo(rodTipX, rodTipY);
            ctx.quadraticCurveTo(
              (rodTipX + holeX) * 0.5,
              (rodTipY + holeY) * 0.5 - 32 + Math.sin(elapsed * 24) * 8,
              holeX,
              holeY + 2
            );
            ctx.stroke();
          }
          ctx.restore();
        }

        if (
          !isCharWalking &&
          !inMarketScene &&
          wizardRayActive &&
          (phase === 'CASTING' || phase === 'WAITING' || phase === 'BITING')
        ) {
          drawWizardUpwardRay(
            ctx,
            holeX,
            holeY + 2,
            width,
            height,
            wizardRayTime,
            elapsed,
            phase === 'BITING',
            wizardRayCfg,
            gq
          );
        }
      } else if (isMillionaire) {
        // Caña de oro pulido con reflejos metálicos animados y gemas incrustadas
        drawMillionaireGoldRod(
          ctx,
          rodBaseX,
          rodBaseY,
          rodTipX,
          rodTipY,
          rodBendOffset,
          elapsed,
          phase === 'BITING'
        );

        if (!isCharWalking && !inMarketScene) {
        const milRayCfg = getMillionaireRayConfig(pendingCatchRef.current?.species.rarity);
        let milBobberX = holeX;
        let milBobberY = holeY + 2;
        if (phase === 'IDLE') {
          milBobberX = rodTipX;
          milBobberY = rodTipY + 18;
        } else if (phase === 'CASTING') {
          if (castT >= 0.52 && projectileX !== null && projectileY !== null) {
            milBobberX = projectileX;
            milBobberY = projectileY;
            const flyT = Math.min(1, (castT - 0.52) / 0.46);
            if (flyT >= 0.94 && !castLandedFired) {
              castLandedFired = true;
              wizardRayActive = true;
              wizardRayTime = 0;
              spawnSplash(holeX, holeY + 2, 12, milRayCfg.outerColor);
              spawnRipple(holeX, holeY + 2, 10, 60, 0.7, 2.5, milRayCfg.secondaryColor);
            }
          } else {
            milBobberX = rodTipX;
            milBobberY = rodTipY + 14;
          }
        } else if (phase === 'WAITING') {
          milBobberY = holeY + 2 + Math.sin(elapsed * 3.2) * 2.4;
        } else if (isFighting && ft && fightProfile) {
          const pullAwayX = ft.distance * Math.min(width * 0.2, 175);
          milBobberX =
            holeX +
            pullAwayX +
            Math.sin(elapsed * (fightProfile.thrashFreq * 0.6)) *
              (7 + ft.tension * 13);
          milBobberY =
            holeY +
            5 +
            Math.sin(elapsed * fightProfile.thrashFreq) * (4 + ft.tension * 6.5) +
            (ft.fishPulling ? 4 : 0);
        } else if (isEscapeVisual && ft) {
          milBobberX = holeX + ft.distance * Math.min(width * 0.2, 175) + failAge * 210;
          milBobberY = holeY + 4 + Math.sin(failAge * 28) * 5;
        } else if (phase === 'BITING') {
          milBobberY = holeY + 6 + Math.sin(elapsed * 26) * 5;
        } else if (phase === 'CAUGHT') {
          milBobberX = rodTipX;
          milBobberY = rodTipY + 22;
        }

        // Hilo dorado y flotador diamante
        ctx.save();
        if (isSnapVisual) {
          const whipX =
            rodTipX + Math.sin(failAge * 24) * 32 * Math.exp(-failAge * 2.5);
          const whipY =
            rodTipY + 46 + Math.cos(failAge * 18) * 18 * Math.exp(-failAge * 2.5);
          ctx.strokeStyle = `rgba(248, 113, 113, ${Math.max(0, 1 - failAge / 1.15)})`;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(rodTipX, rodTipY);
          ctx.lineTo(whipX, whipY);
          ctx.stroke();
        } else {
          if (isEscapeVisual) {
            ctx.globalAlpha = Math.max(0, 1 - failAge / 1.1);
          } else {
            ctx.strokeStyle =
              isFighting && ft && ft.tension >= 0.78
                ? 'rgba(239, 68, 68, 0.96)'
                : 'rgba(254, 240, 138, 0.92)';
            ctx.lineWidth = isFighting && ft ? 1.6 + ft.tension * 1.1 : 1.6;
            const vib =
              isFighting && ft && ft.tension >= 0.62
                ? Math.sin(elapsed * 58) * (1.8 + ft.tension * 2.2)
                : 0;
            ctx.beginPath();
            ctx.moveTo(rodTipX, rodTipY);
            ctx.quadraticCurveTo(
              (rodTipX + milBobberX) * 0.5 + vib,
              (rodTipY + milBobberY) * 0.5 - vib * 0.6,
              milBobberX,
              milBobberY
            );
            ctx.stroke();
          }

          ctx.fillStyle = '#facc15';
          ctx.strokeStyle = '#090d16';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(milBobberX, milBobberY, 5.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          ctx.fillStyle = '#e0f2fe';
          ctx.beginPath();
          ctx.arc(milBobberX - 1.5, milBobberY - 1.5, 2.2, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();

        if (wizardRayActive && (phase === 'CASTING' || phase === 'WAITING' || phase === 'BITING')) {
          drawMillionaireRay(ctx, holeX, holeY + 2, width, height, wizardRayTime, elapsed, phase === 'BITING', milRayCfg, gq);
        }
        }
      } else if (isMagma) {
        // Caña de roca volcánica agrietada con grietas de lava que pulsan y tiemblan al picar
        drawMagmaVolcanicRod(
          ctx,
          rodBaseX,
          rodBaseY,
          rodTipX,
          rodTipY,
          rodBendOffset,
          elapsed,
          phase === 'BITING'
        );

        if (!isCharWalking && !inMarketScene) {
        const magmaRayCfg = getMagmaRayConfig(pendingCatchRef.current?.species.rarity);
        let magmaBobberX = holeX;
        let magmaBobberY = holeY + 2;
        if (phase === 'IDLE') {
          magmaBobberX = rodTipX;
          magmaBobberY = rodTipY + 18;
        } else if (phase === 'CASTING') {
          if (castT >= 0.52 && projectileX !== null && projectileY !== null) {
            magmaBobberX = projectileX;
            magmaBobberY = projectileY;
            const flyT = Math.min(1, (castT - 0.52) / 0.46);
            if (flyT >= 0.94 && !castLandedFired) {
              castLandedFired = true;
              wizardRayActive = true;
              wizardRayTime = 0;
              spawnSplash(holeX, holeY + 2, 14, magmaRayCfg.outerColor);
              spawnRipple(holeX, holeY + 2, 12, 70, 0.7, 3.2, magmaRayCfg.secondaryColor);
            }
          } else {
            magmaBobberX = rodTipX;
            magmaBobberY = rodTipY + 14;
          }
        } else if (phase === 'WAITING') {
          magmaBobberY = holeY + 2 + Math.sin(elapsed * 3.4) * 2.5;
        } else if (isFighting && ft && fightProfile) {
          const pullAwayX = ft.distance * Math.min(width * 0.2, 175);
          magmaBobberX =
            holeX +
            pullAwayX +
            Math.sin(elapsed * (fightProfile.thrashFreq * 0.6)) *
              (7 + ft.tension * 13);
          magmaBobberY =
            holeY +
            5 +
            Math.sin(elapsed * fightProfile.thrashFreq) * (4 + ft.tension * 6.5) +
            (ft.fishPulling ? 4 : 0);
        } else if (isEscapeVisual && ft) {
          magmaBobberX = holeX + ft.distance * Math.min(width * 0.2, 175) + failAge * 210;
          magmaBobberY = holeY + 4 + Math.sin(failAge * 28) * 5;
        } else if (phase === 'BITING') {
          magmaBobberY = holeY + 6 + Math.sin(elapsed * 28) * 5.2;
        } else if (phase === 'CAUGHT') {
          magmaBobberX = rodTipX;
          magmaBobberY = rodTipY + 22;
        }

        // Sedal incandescente y boya de magma
        ctx.save();
        if (isSnapVisual) {
          const whipX =
            rodTipX + Math.sin(failAge * 24) * 32 * Math.exp(-failAge * 2.5);
          const whipY =
            rodTipY + 46 + Math.cos(failAge * 18) * 18 * Math.exp(-failAge * 2.5);
          ctx.strokeStyle = `rgba(248, 113, 113, ${Math.max(0, 1 - failAge / 1.15)})`;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(rodTipX, rodTipY);
          ctx.lineTo(whipX, whipY);
          ctx.stroke();
        } else {
          if (isEscapeVisual) {
            ctx.globalAlpha = Math.max(0, 1 - failAge / 1.1);
          } else {
            ctx.strokeStyle =
              phase === 'BITING' || (isFighting && ft && ft.tension >= 0.72)
                ? 'rgba(239, 68, 68, 0.96)'
                : 'rgba(251, 146, 60, 0.9)';
            ctx.lineWidth = isFighting && ft ? 1.8 + ft.tension * 1.1 : 1.8;
            const vib =
              isFighting && ft && ft.tension >= 0.62
                ? Math.sin(elapsed * 58) * (1.8 + ft.tension * 2.2)
                : 0;
            ctx.beginPath();
            ctx.moveTo(rodTipX, rodTipY);
            ctx.quadraticCurveTo(
              (rodTipX + magmaBobberX) * 0.5 + vib,
              (rodTipY + magmaBobberY) * 0.5 - vib * 0.6,
              magmaBobberX,
              magmaBobberY
            );
            ctx.stroke();
          }

          ctx.fillStyle = phase === 'BITING' ? '#ef4444' : '#f97316';
          ctx.strokeStyle = '#fde047';
          ctx.lineWidth = 1.6;
          ctx.beginPath();
          ctx.arc(magmaBobberX, magmaBobberY, 6, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        }
        ctx.restore();

        if (wizardRayActive && (phase === 'CASTING' || phase === 'WAITING' || phase === 'BITING')) {
          drawMagmaRay(ctx, holeX, holeY + 2, width, height, wizardRayTime, elapsed, phase === 'BITING', magmaRayCfg, gq);
        }
        }
      } else {
        // Standard Realistic Fishing Rod, Cork Handle, Spinning Reel, Line & Bobber
        const rdx = rodTipX - rodBaseX;
        const rdy = rodTipY - rodBaseY;
        const rDist = Math.max(1, Math.hypot(rdx, rdy));
        const ux = rdx / rDist;
        const uy = rdy / rDist;
        const buttX = rodBaseX - ux * 20;
        const buttY = rodBaseY - uy * 20;
        const gripEndX = rodBaseX + ux * 10;
        const gripEndY = rodBaseY + uy * 10;

        // Cork butt handle & reel seat passing cleanly through the angler's gripping fist
        ctx.save();
        ctx.lineCap = 'round';
        ctx.strokeStyle = '#b98350';
        ctx.lineWidth = 5.5;
        ctx.beginPath();
        ctx.moveTo(buttX, buttY);
        ctx.lineTo(gripEndX, gripEndY);
        ctx.stroke();

        // Dark reel seat collar & cap
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 6.2;
        ctx.beginPath();
        ctx.moveTo(rodBaseX - ux * 4, rodBaseY - uy * 4);
        ctx.lineTo(rodBaseX + ux * 5, rodBaseY + uy * 5);
        ctx.stroke();

        // Compact hanging spinning reel mounted under the rod base
        const reelCenterX = rodBaseX + ux * 5 - uy * 9.5;
        const reelCenterY = rodBaseY + uy * 5 + ux * 9.5;
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.moveTo(rodBaseX + ux * 2, rodBaseY + uy * 2);
        ctx.lineTo(reelCenterX, reelCenterY);
        ctx.stroke();
        ctx.fillStyle = '#0f172a';
        ctx.strokeStyle = hasOgRod
          ? '#fb923c'
          : hasGoldRod
            ? '#facc15'
            : hasCarbonRod
              ? '#38bdf8'
              : '#94a3b8';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.arc(reelCenterX, reelCenterY, 5.6, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        // Reel inner spool ring
        ctx.fillStyle = hasOgRod
          ? '#fde047'
          : hasGoldRod
            ? '#dc2626'
            : hasCarbonRod
              ? '#38bdf8'
              : '#cbd5e1';
        ctx.beginPath();
        ctx.arc(reelCenterX, reelCenterY, 2.4, 0, Math.PI * 2);
        ctx.fill();
        // Rotating reel crank arm & knob
        const crankAng = isFighting ? elapsed * 14 : elapsed * 1.4;
        const knobX = reelCenterX + Math.cos(crankAng) * 5.2;
        const knobY = reelCenterY + Math.sin(crankAng) * 5.2;
        ctx.strokeStyle = hasOgRod
          ? '#ffedd5'
          : hasGoldRod
            ? '#fef08a'
            : hasCarbonRod
              ? '#bae6fd'
              : '#e2e8f0';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(reelCenterX, reelCenterY);
        ctx.lineTo(knobX, knobY);
        ctx.stroke();
        ctx.fillStyle = hasOgRod
          ? '#f97316'
          : hasGoldRod
            ? '#eab308'
            : hasCarbonRod
              ? '#0284c7'
              : '#64748b';
        ctx.beginPath();
        ctx.arc(knobX, knobY, 1.6, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        const ctrlX = (rodBaseX + rodTipX) * 0.5;
        const ctrlY = (rodBaseY + rodTipY) * 0.5 + rodBendOffset;

        if (hasOgRod || hasGoldRod || hasCarbonRod) {
          ctx.save();
          ctx.strokeStyle = hasOgRod
            ? 'rgba(251, 146, 60, 0.45)'
            : hasGoldRod
              ? 'rgba(250, 204, 21, 0.38)'
              : 'rgba(56, 189, 248, 0.25)';
          ctx.lineWidth = hasOgRod ? 9 : hasGoldRod ? 8.2 : 7;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(rodBaseX, rodBaseY);
          ctx.quadraticCurveTo(ctrlX, ctrlY, rodTipX, rodTipY);
          ctx.stroke();
          ctx.restore();
        }

        ctx.strokeStyle = hasOgRod
          ? '#f97316'
          : hasGoldRod
            ? '#eab308'
            : hasCarbonRod
              ? '#1e293b'
              : '#1e293b';
        ctx.lineWidth = hasOgRod ? 5 : hasGoldRod || hasCarbonRod ? 4.4 : 3.2;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(rodBaseX, rodBaseY);
        ctx.quadraticCurveTo(ctrlX, ctrlY, rodTipX, rodTipY);
        ctx.stroke();

        if (hasOgRod || hasGoldRod || hasCarbonRod) {
          ctx.save();
          ctx.strokeStyle = hasOgRod
            ? '#ffedd5'
            : hasGoldRod
              ? '#fef08a'
              : '#38bdf8';
          ctx.lineWidth = 1.6;
          if (hasCarbonRod && !hasGoldRod && !hasOgRod) {
            ctx.setLineDash([3.5, 3.5]);
          }
          ctx.beginPath();
          ctx.moveTo(rodBaseX, rodBaseY);
          ctx.quadraticCurveTo(ctrlX, ctrlY, rodTipX, rodTipY);
          ctx.stroke();
          ctx.setLineDash([]);

          // Ceramic / Gold / Neon guide rings along the curved rod blank
          const ringTs = [0.36, 0.68, 0.98];
          for (const rt of ringTs) {
            const omt = 1 - rt;
            const gx = omt * omt * rodBaseX + 2 * omt * rt * ctrlX + rt * rt * rodTipX;
            const gy = omt * omt * rodBaseY + 2 * omt * rt * ctrlY + rt * rt * rodTipY;
            ctx.fillStyle = '#0f172a';
            ctx.strokeStyle = hasOgRod
              ? '#fed7aa'
              : hasGoldRod
                ? '#fef08a'
                : '#7dd3fc';
            ctx.lineWidth = 1.25;
            ctx.beginPath();
            ctx.arc(gx, gy + 1.8, rt > 0.9 ? 2.0 : 2.3, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
          }
          ctx.restore();
        }

        // Fishing Line & Bobber (with real-time fight pull-away, tension & snap/escape VFX)
        if (!isCharWalking && !inMarketScene) {
        const computeFightPoint = () => {
          if (!ft || !fightProfile) {
            return { x: holeX, y: holeY + 6 + Math.sin(elapsed * 26) * 4.5 };
          }
          const pullAwayX = ft.distance * Math.min(width * 0.2, 175);
          const thrashX =
            Math.sin(elapsed * (fightProfile.thrashFreq * 0.6)) *
            (7 + ft.tension * 13);
          const thrashY =
            Math.sin(elapsed * fightProfile.thrashFreq) *
              (4 + ft.tension * 6.5) +
            (ft.fishPulling ? 4 : 0);
          return {
            x: holeX + pullAwayX + thrashX,
            y: holeY + 5 + thrashY,
          };
        };

        let bobberX = holeX;
        let bobberY = holeY + 2;
        if (phase === 'IDLE') {
          bobberX = rodTipX;
          bobberY = rodTipY + 18;
        } else if (phase === 'CASTING') {
          if (castT < 0.52) {
            bobberX = rodTipX;
            bobberY = rodTipY + 14;
          } else {
            const flyT = Math.min(1, (castT - 0.52) / 0.46);
            const easeFly = 1 - Math.pow(1 - flyT, 1.6);
            const launchX = rodTipX;
            const launchY = rodTipY + 10;
            bobberX = launchX + (holeX - launchX) * easeFly;
            bobberY =
              launchY +
              (holeY + 2 - launchY) * easeFly -
              Math.sin(flyT * Math.PI) * 58;
            if (flyT >= 0.94 && !castLandedFired) {
              castLandedFired = true;
              const uw = worldRef.current === 'underworld';
              const splashColor = uw ? '#f97316' : '#bae6fd';
              spawnSplash(holeX, holeY + 2, 12, splashColor);
              spawnRipple(holeX, holeY + 2, 8, 44, 0.45, 2.5, uw ? '#fde047' : '#ffffff');
              spawnRipple(holeX, holeY + 2, 12, 64, 0.68, 2.0, splashColor);
              spawnRipple(holeX, holeY + 2, 16, 82, 0.92, 1.4, splashColor);
            }
            if (flyT < 0.96 && modeRef.current !== 'paused') {
              for (let i = BOBBER_TRAIL_LEN - 1; i > 0; i--) {
                bobberTrailX[i] = bobberTrailX[i - 1];
                bobberTrailY[i] = bobberTrailY[i - 1];
              }
              bobberTrailX[0] = bobberX;
              bobberTrailY[0] = bobberY;
              if (bobberTrailCount < BOBBER_TRAIL_LEN) bobberTrailCount++;
            }
          }
        } else if (phase === 'WAITING') {
          bobberY = holeY + 2 + Math.sin(elapsed * 3) * 2.2;
        } else if (isFighting && ft) {
          const fp = computeFightPoint();
          bobberX = fp.x;
          bobberY = fp.y;
          if (modeRef.current !== 'paused') {
            fightSplashAccum += dt;
            const interval = ft.fishPulling || ft.tension >= 0.72 ? 0.16 : 0.28;
            if (fightSplashAccum >= interval) {
              fightSplashAccum = 0;
              const uw = worldRef.current === 'underworld';
              spawnSplash(bobberX, bobberY + 2, ft.fishPulling ? 8 : 5, uw ? '#fb923c' : '#e0f2fe');
              spawnRipple(
                bobberX,
                bobberY + 3,
                8,
                34 + ft.tension * 26,
                0.55,
                2.2,
                ft.tension >= 0.78 ? '#fca5a5' : uw ? '#fde047' : '#bae6fd'
              );
            }
          }
        } else if (isEscapeVisual && ft) {
          bobberX = holeX + ft.distance * Math.min(width * 0.2, 175) + failAge * 210;
          bobberY = holeY + 4 + Math.sin(failAge * 28) * 5;
          if (ft.failTimestamp !== lastFailBurstTs) {
            lastFailBurstTs = ft.failTimestamp;
            spawnSplash(holeX + 85, holeY + 4, 16, '#bae6fd');
            spawnRipple(holeX + 85, holeY + 4, 10, 74, 0.75, 2.8, '#ffffff');
          }
        } else if (isSnapVisual && ft) {
          if (ft.failTimestamp !== lastFailBurstTs) {
            lastFailBurstTs = ft.failTimestamp;
            const midX = (rodTipX + holeX) * 0.52;
            const midY = (rodTipY + holeY) * 0.52;
            spawnSplash(midX, midY, 14, '#fef08a');
            spawnSplash(midX, midY, 10, '#ef4444');
          }
        } else if (phase === 'BITING') {
          const bitePlunge = Math.exp(-biteAnimTime * 7) * 9;
          bobberY = holeY + 6 + bitePlunge + Math.sin(elapsed * 26) * 4.5;
        } else if (phase === 'CAUGHT') {
          bobberX = rodTipX;
          bobberY = rodTipY + 24;
        }

        if (phase === 'CASTING' && castT >= 0.52 && bobberTrailCount > 1) {
          ctx.save();
          for (let i = 1; i < bobberTrailCount; i++) {
            const alpha = (1 - i / bobberTrailCount) * 0.45;
            const radius = Math.max(1.5, 4.5 * (1 - i / bobberTrailCount));
            ctx.fillStyle = `rgba(224, 242, 254, ${alpha})`;
            ctx.beginPath();
            ctx.arc(bobberTrailX[i], bobberTrailY[i], radius, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.restore();
        }

        // Underwater struggling fish shadow beneath the fighting bobber
        if (isFighting && ft && !isLow) {
          ctx.save();
          const shadowX = bobberX + 4;
          const shadowY = bobberY + 12;
          const tailFlip = Math.sin(elapsed * (fightProfile?.thrashFreq ?? 18)) * 0.25;
          ctx.translate(shadowX, shadowY);
          ctx.rotate(tailFlip);
          ctx.fillStyle =
            worldRef.current === 'underworld'
              ? 'rgba(20, 4, 4, 0.58)'
              : 'rgba(6, 20, 42, 0.48)';
          ctx.beginPath();
          ctx.ellipse(0, 0, 18 + ft.tension * 6, 7.5, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.moveTo(-16, 0);
          ctx.lineTo(-27, -7);
          ctx.lineTo(-27, 7);
          ctx.closePath();
          ctx.fill();
          ctx.restore();
        }

        if (isSnapVisual) {
          // Whipping broken half-line dangling off the rebounding rod tip
          ctx.save();
          const whipX =
            rodTipX + Math.sin(failAge * 24) * 32 * Math.exp(-failAge * 2.5);
          const whipY =
            rodTipY + 46 + Math.cos(failAge * 18) * 18 * Math.exp(-failAge * 2.5);
          ctx.strokeStyle = `rgba(248, 113, 113, ${Math.max(0, 1 - failAge / 1.15)})`;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(rodTipX, rodTipY);
          ctx.quadraticCurveTo(
            (rodTipX + whipX) * 0.5 - 12,
            (rodTipY + whipY) * 0.5,
            whipX,
            whipY
          );
          ctx.stroke();
          ctx.restore();
        } else if (isEscapeVisual) {
          // Escaping wake + fading bobber shooting away
          ctx.save();
          const alpha = Math.max(0, 1 - failAge / 1.1);
          ctx.globalAlpha = alpha;
          ctx.strokeStyle = 'rgba(224, 242, 254, 0.8)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(bobberX - 36, bobberY);
          ctx.lineTo(bobberX, bobberY);
          ctx.stroke();
          if (activeWormIdRef.current) {
            drawFishingLineWorm(
              ctx,
              bobberX,
              bobberY,
              activeWormIdRef.current,
              elapsed,
              phase,
              false
            );
          } else {
            ctx.fillStyle = '#ef4444';
            ctx.beginPath();
            ctx.arc(bobberX, bobberY, 5.5, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.restore();
        } else {
          // Active fishing line (color-coded & vibrating under high tension)
          ctx.save();
          if (isFighting && ft) {
            ctx.strokeStyle =
              ft.tension >= 0.78
                ? 'rgba(239, 68, 68, 0.98)'
                : ft.tension >= 0.56
                  ? 'rgba(251, 191, 36, 0.95)'
                  : 'rgba(224, 242, 254, 0.95)';
            ctx.lineWidth = 1.6 + ft.tension * 1.1;
            if (!isLow && ft.tension >= 0.72) {
              ctx.shadowColor = '#ef4444';
              ctx.shadowBlur = 8;
            }
            const vib =
              ft.tension >= 0.62
                ? Math.sin(elapsed * 58) * (1.8 + ft.tension * 2.5)
                : 0;
            ctx.beginPath();
            ctx.moveTo(rodTipX, rodTipY);
            ctx.quadraticCurveTo(
              (rodTipX + bobberX) * 0.5 + vib,
              (rodTipY + bobberY) * 0.5 - vib * 0.7,
              bobberX,
              bobberY
            );
            ctx.stroke();
          } else {
            ctx.strokeStyle = 'rgba(248, 250, 252, 0.9)';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(rodTipX, rodTipY);
            if (phase === 'CASTING' && castT >= 0.52) {
              const flyT = Math.min(1, (castT - 0.52) / 0.46);
              const arcSag = Math.sin(flyT * Math.PI) * 26;
              ctx.quadraticCurveTo(
                (rodTipX + bobberX) * 0.5,
                (rodTipY + bobberY) * 0.5 - arcSag,
                bobberX,
                bobberY
              );
            } else {
              ctx.lineTo(bobberX, bobberY);
            }
            ctx.stroke();
          }
          ctx.restore();

          if (activeWormIdRef.current) {
            drawFishingLineWorm(
              ctx,
              bobberX,
              bobberY,
              activeWormIdRef.current,
              elapsed,
              phase,
              isFighting
            );
          } else {
            ctx.fillStyle = '#ef4444';
            ctx.beginPath();
            ctx.arc(bobberX, bobberY, 5.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(bobberX, bobberY + 2, 5.5, 0, Math.PI);
            ctx.fill();
          }
        }
        }
      }

      // Caught Fish visual & Rarity-specific animations (large in center)
      if (!inMarketScene && !isCharWalking && phase === 'CAUGHT' && lastCaughtRef.current) {
        const poke = lastCaughtRef.current.species;
        const rarity = poke.rarity;
        const elapsedCaught = fishingStateRef.current.phaseTimer;
        if (caughtBurstUid !== lastCaughtRef.current.uid) {
          caughtBurstUid = lastCaughtRef.current.uid;
          spawnSplash(width * 0.5, height * 0.46, 18, poke.spriteColor);
          spawnSplash(width * 0.5, height * 0.46, 12, '#fef08a');
        }
        const t = Math.min(1, elapsedCaught / TIMING.RESULT_DURATION);

        const isHighRarity =
          rarity === 'Legendaria' ||
          rarity === 'Secreto' ||
          rarity === 'Secreto Abisal';
        const buildupDuration = isHighRarity ? 5.0 : 0;
        const inBuildup = isHighRarity && elapsedCaught < buildupDuration;

        ctx.save();
        if (inBuildup) {
          if (introSoundPlayedRef.current !== lastCaughtRef.current.uid) {
            introSoundPlayedRef.current = lastCaughtRef.current.uid;
            sound.playEpicIntro();
          }
          if (
            rarity === 'Legendaria' ||
            rarity === 'Secreto' ||
            rarity === 'Secreto Abisal'
          ) {
            const decay = Math.max(0, 1 - elapsedCaught / buildupDuration);
            const shakeAmp = 12 * decay * decay;
            if (shakeAmp > 0.2) {
              ctx.translate(
                (Math.random() - 0.5) * shakeAmp,
                (Math.random() - 0.5) * shakeAmp
              );
            }
          }
        }

        // Rarity-specific full-screen flash / tint / 10s buildup explosion
        if (rarity === 'Común') {
          ctx.fillStyle = `rgba(226, 232, 240, ${(1 - t) * 0.25})`;
          ctx.fillRect(0, 0, width, height);
        } else if (rarity === 'Rara') {
          ctx.fillStyle = `rgba(56, 189, 248, ${(1 - t) * 0.32})`;
          ctx.fillRect(0, 0, width, height);
        } else if (rarity === 'Épica') {
          ctx.fillStyle = `rgba(168, 85, 247, ${(1 - t) * 0.38})`;
          ctx.fillRect(0, 0, width, height);
        } else if (rarity === 'Mítica') {
          ctx.fillStyle = `rgba(239, 68, 68, ${(1 - t) * 0.42})`;
          ctx.fillRect(0, 0, width, height);
        } else if (rarity === 'Legendaria') {
          if (inBuildup) {
            ctx.fillStyle = '#1c1000';
            ctx.fillRect(-30, -30, width + 60, height + 60);
            if (legendarioImgRef.current && legendarioImgRef.current.complete) {
              ctx.drawImage(legendarioImgRef.current, -20, -20, width + 40, height + 40);
            }
            if (elapsedCaught < 1.0) {
              const expT = elapsedCaught / 1.0;
              const expR = expT * Math.max(width, height) * 0.48;
              ctx.fillStyle = `rgba(254, 240, 138, ${(1 - expT) * 0.45})`;
              ctx.beginPath();
              ctx.arc(width * 0.5, height * 0.5, expR, 0, Math.PI * 2);
              ctx.fill();
            }
          } else {
            // Darken sky, draw storm clouds at top, and animate falling lightning bolts
            ctx.fillStyle = 'rgba(15, 23, 42, 0.62)';
            ctx.fillRect(0, 0, width, height);

            // Storm clouds at top
            ctx.save();
            ctx.fillStyle = 'rgba(30, 41, 59, 0.92)';
            for (let c = 0; c < 7; c++) {
              const cxCloud = (c / 6) * width + Math.sin(elapsedCaught * 0.8 + c) * 18;
              ctx.beginPath();
              ctx.arc(cxCloud, height * 0.06, width * 0.12, 0, Math.PI * 2);
              ctx.fill();
            }
            ctx.restore();

            // Continuously falling lightning bolts from clouds to ground
            ctx.save();
            ctx.strokeStyle = '#fef08a';
            ctx.lineWidth = 4;
            ctx.shadowColor = '#facc15';
            ctx.shadowBlur = 18;
            const stormTime = elapsedCaught - buildupDuration;
            for (let i = 0; i < 4; i++) {
              const cycle = (stormTime * 2.1 + i * 0.31) % 1;
              const bx = width * (0.15 + ((i * 0.23 + Math.floor(stormTime * 2.1 + i * 0.31) * 0.17) % 0.72));
              const startY = height * 0.08;
              const endY = startY + cycle * (height * 0.92);
              ctx.globalAlpha = cycle < 0.85 ? 1 : (1 - cycle) / 0.15;
              ctx.beginPath();
              ctx.moveTo(bx, startY);
              const segs = 4;
              for (let s = 1; s <= segs; s++) {
                const sy = startY + ((endY - startY) * s) / segs;
                const sx = bx + (s % 2 === 0 ? 16 : -16);
                ctx.lineTo(sx, sy);
              }
              ctx.stroke();
            }
            ctx.restore();
          }
        } else if (rarity === 'Secreto') {
          if (inBuildup) {
            ctx.fillStyle = '#000000';
            ctx.fillRect(-30, -30, width + 60, height + 60);
            if (secretoImgRef.current && secretoImgRef.current.complete) {
              ctx.drawImage(secretoImgRef.current, -20, -20, width + 40, height + 40);
            }
            if (elapsedCaught < 1.0) {
              const expT = elapsedCaught / 1.0;
              const expR = expT * Math.max(width, height) * 0.48;
              ctx.fillStyle = `rgba(254, 240, 138, ${(1 - expT) * 0.45})`;
              ctx.beginPath();
              ctx.arc(width * 0.5, height * 0.5, expR, 0, Math.PI * 2);
              ctx.fill();
            }
          } else {
            // Dark starry overlay + falling star particles
            ctx.fillStyle = 'rgba(2, 6, 23, 0.55)';
            ctx.fillRect(0, 0, width, height);
            ctx.save();
            ctx.fillStyle = '#fde047';
            ctx.shadowColor = '#facc15';
            ctx.shadowBlur = 8;
            for (let i = 0; i < 32; i++) {
              const sx = ((i * 173) % 100) * 0.01 * width;
              const sy = ((elapsedCaught * 130 + i * 65) % (height + 40)) - 20;
              ctx.beginPath();
              ctx.arc(sx, sy, 2 + (i % 3), 0, Math.PI * 2);
              ctx.fill();
            }
            ctx.restore();
          }
        } else if (rarity === 'Secreto Abisal') {
          if (inBuildup) {
            ctx.fillStyle = '#0c4a6e';
            ctx.fillRect(-30, -30, width + 60, height + 60);
            if (abisalImgRef.current && abisalImgRef.current.complete) {
              ctx.drawImage(abisalImgRef.current, -20, -20, width + 40, height + 40);
            }
            if (elapsedCaught < 1.0) {
              const expT = elapsedCaught / 1.0;
              const expR = expT * Math.max(width, height) * 0.48;
              ctx.fillStyle = `rgba(165, 243, 252, ${(1 - expT) * 0.45})`;
              ctx.beginPath();
              ctx.arc(width * 0.5, height * 0.5, expR, 0, Math.PI * 2);
              ctx.fill();
            }
          } else {
            // Bigger, bluer firework bursts around the fish
            ctx.save();
            const burstT = (elapsedCaught - buildupDuration) % 1.25;
            const radius = burstT * 280;
            ctx.shadowColor = '#38bdf8';
            ctx.shadowBlur = 14;
            for (let f = 0; f < 4; f++) {
              const fx = width * (0.2 + f * 0.2);
              const fy = height * (0.3 + (f % 2) * 0.22);
              for (let p = 0; p < 14; p++) {
                const ang = (p / 14) * Math.PI * 2;
                const px = fx + Math.cos(ang) * radius;
                const py = fy + Math.sin(ang) * radius;
                ctx.fillStyle =
                  p % 3 === 0 ? '#38bdf8' : p % 3 === 1 ? '#0284c7' : '#bae6fd';
                ctx.beginPath();
                ctx.arc(px, py, 5.5, 0, Math.PI * 2);
                ctx.fill();
              }
            }
            ctx.restore();
          }
        }

        // Large centered fish showcase (shown after buildup explosion)
        if (!inBuildup) {
          if (isHighRarity && revealSoundPlayedRef.current !== lastCaughtRef.current.uid) {
            revealSoundPlayedRef.current = lastCaughtRef.current.uid;
            sound.playCatch(worldRef.current);
          }
          if (skinCatchSoundUid !== lastCaughtRef.current.uid) {
            skinCatchSoundUid = lastCaughtRef.current.uid;
            if (isMagma) {
              sound.playMagmaEruption();
            } else if (isMillionaire) {
              sound.playCashRegister();
            } else if (isWizard) {
              const isRarePlus = rarity !== 'Común';
              sound.playArcanePortal(isRarePlus);
            }
          }
        const cx = width * 0.5;
        const cy =
          rarity === 'Secreto Abisal'
            ? height * 0.48 + Math.sin(elapsed * 32) * 8
            : height * 0.46;
        const revealElapsed = Math.max(0, elapsedCaught - buildupDuration);
        const popT = Math.min(1, revealElapsed / 0.28);
        const c1 = 1.70158;
        const c3 = c1 + 1;
        const popScale =
          popT >= 1
            ? 1
            : 1 + c3 * Math.pow(popT - 1, 3) + c1 * Math.pow(popT - 1, 2);

        const cleanFishCanvas =
          cleanFishCanvasesRef.current[poke.id] ??
          getCachedCleanFishCanvas(poke.id);
        const magmaSkulls = magmaSkullsRef.current;

        let drawW = 138;
        let drawH = 78;
        let skullCanvas: HTMLCanvasElement | null = null;

        if (poke.id === 103 && magmaSkulls.length > 0) {
          const idx = (lastCaughtRef.current?.variantIndex ?? 0) % magmaSkulls.length;
          skullCanvas = magmaSkulls[idx];
          const maxW = Math.min(width * 0.52, 460);
          const maxH = Math.min(height * 0.36, 280);
          const scale = Math.min(
            maxW / skullCanvas.width,
            maxH / skullCanvas.height
          );
          drawW = Math.max(1, Math.round(skullCanvas.width * scale));
          drawH = Math.max(1, Math.round(skullCanvas.height * scale));
        } else if (cleanFishCanvas) {
          const maxW = Math.min(width * 0.68, 620);
          const maxH = Math.min(height * 0.4, 320);
          const scale = Math.min(
            maxW / cleanFishCanvas.width,
            maxH / cleanFishCanvas.height
          );
          drawW = Math.max(1, Math.round(cleanFishCanvas.width * scale));
          drawH = Math.max(1, Math.round(cleanFishCanvas.height * scale));
        }

        const spriteHalfH =
          skullCanvas || cleanFishCanvas ? drawH / 2 : 52;
        const minSpriteTop = Math.min(144, height * 0.24);
        const maxSpriteBottom = height - 96;
        const spriteCy = Math.min(
          maxSpriteBottom - spriteHalfH,
          Math.max(cy + 20, minSpriteTop + spriteHalfH)
        );

        const rarityColor =
          rarity === 'Común'
            ? '#f8fafc'
            : rarity === 'Rara'
              ? '#38bdf8'
              : rarity === 'Épica'
                ? '#c084fc'
                : rarity === 'Mítica'
                  ? '#f87171'
                  : rarity === 'Legendaria'
                    ? '#facc15'
                    : rarity === 'Secreto'
                      ? '#e2e8f0'
                      : '#22d3ee';

        // Integrated atmospheric spotlight aura + reveal burst behind caught fish
        const burstDuration = 0.72;
        if (revealElapsed < burstDuration) {
          const bt = Math.max(0, Math.min(1, revealElapsed / burstDuration));
          const easeOut = 1 - Math.pow(1 - bt, 3);
          const ringBase = Math.max(drawW, drawH) * 0.42;
          const ringRadius = ringBase + easeOut * (Math.min(width, height) * 0.24);
          ctx.save();
          ctx.globalAlpha = (1 - bt) * (isLow ? 0.42 : 0.72);
          ctx.strokeStyle = rarityColor;
          ctx.lineWidth = Math.max(1.5, (1 - bt) * 5.5);
          ctx.beginPath();
          ctx.arc(cx, spriteCy, ringRadius, 0, Math.PI * 2);
          ctx.stroke();

          if (!isLow && rarity !== 'Común' && bt > 0.12) {
            const bt2 = Math.min(1, (bt - 0.12) / 0.88);
            const ring2R = ringBase * 0.8 + (1 - Math.pow(1 - bt2, 2)) * (Math.min(width, height) * 0.18);
            ctx.globalAlpha = (1 - bt2) * 0.48;
            ctx.lineWidth = Math.max(1, (1 - bt2) * 3);
            ctx.beginPath();
            ctx.arc(cx, spriteCy, ring2R, 0, Math.PI * 2);
            ctx.stroke();
          }
          ctx.restore();
        }

        if (!isLow) {
          const haloPulse = 0.88 + 0.12 * Math.sin(revealElapsed * 4.2);
          const haloRx = Math.max(120, drawW * 0.72) * (0.96 + 0.04 * haloPulse);
          const haloRy = Math.max(90, drawH * 0.85) * (0.96 + 0.04 * haloPulse);
          ctx.save();
          const backVignette = ctx.createRadialGradient(
            cx,
            spriteCy,
            12,
            cx,
            spriteCy,
            haloRx * 1.15
          );
          backVignette.addColorStop(
            0,
            isUnderworldTheme
              ? 'rgba(24, 5, 5, 0.56)'
              : 'rgba(8, 20, 42, 0.48)'
          );
          backVignette.addColorStop(0.65, 'rgba(10, 20, 38, 0.18)');
          backVignette.addColorStop(1, 'rgba(10, 20, 38, 0)');
          ctx.fillStyle = backVignette;
          ctx.beginPath();
          ctx.ellipse(cx, spriteCy, haloRx * 1.15, haloRy * 1.1, 0, 0, Math.PI * 2);
          ctx.fill();

          ctx.globalCompositeOperation = 'lighter';
          const flashBoost = revealElapsed < 0.3 ? (1 - revealElapsed / 0.3) * 0.25 : 0;
          const rarityGlow = ctx.createRadialGradient(
            cx,
            spriteCy,
            8,
            cx,
            spriteCy,
            haloRx * 0.9
          );
          rarityGlow.addColorStop(0, `${rarityColor}${flashBoost > 0.08 ? '52' : '3d'}`);
          rarityGlow.addColorStop(0.55, `${rarityColor}18`);
          rarityGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
          ctx.fillStyle = rarityGlow;
          ctx.beginPath();
          ctx.ellipse(cx, spriteCy, haloRx * 0.9, haloRy * 0.84, 0, 0, Math.PI * 2);
          ctx.fill();

          // Subtle rarity sparkle glints around caught sprite (zero allocation)
          if (rarity !== 'Común') {
            const glintCount =
              rarity === 'Rara' || rarity === 'Épica' ? 4 : 6;
            const orbitRx = Math.max(84, drawW * 0.56);
            const orbitRy = Math.max(54, drawH * 0.58);
            for (let g = 0; g < glintCount; g++) {
              const ang = (g / glintCount) * Math.PI * 2 + revealElapsed * 0.65;
              const twinkle = Math.max(0, Math.sin(revealElapsed * 5.2 + g * 1.7));
              if (twinkle <= 0.15) continue;
              const gx = cx + Math.cos(ang) * orbitRx;
              const gy = spriteCy + Math.sin(ang) * orbitRy;
              const r = (3.5 + (g % 2) * 2) * twinkle;
              ctx.globalAlpha = twinkle * 0.78;
              ctx.strokeStyle = rarityColor;
              ctx.lineWidth = 1.6;
              ctx.beginPath();
              ctx.moveTo(gx - r, gy);
              ctx.lineTo(gx + r, gy);
              ctx.moveTo(gx, gy - r);
              ctx.lineTo(gx, gy + r);
              ctx.stroke();
            }
          }
          ctx.restore();
        }

        const catchXform = skinEngine.getCatchVisualTransform(skinFrameState);

        ctx.save();
        ctx.globalAlpha = catchXform.alpha;
        ctx.translate(cx + catchXform.offsetX, spriteCy + catchXform.offsetY);
        if (catchXform.rotation !== 0) {
          ctx.rotate(catchXform.rotation);
        }
        const totalScale = (0.55 + 0.45 * popScale) * catchXform.scale;
        ctx.scale(totalScale, totalScale);
        ctx.translate(-cx, -spriteCy);
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = isLow ? 'low' : 'high';

        if (!isLow) {
          ctx.shadowColor =
            rarity === 'Legendaria'
              ? 'rgba(250, 204, 21, 0.72)'
              : rarity === 'Secreto Abisal'
                ? 'rgba(34, 211, 238, 0.78)'
                : rarity === 'Mítica'
                  ? 'rgba(239, 68, 68, 0.68)'
                  : 'rgba(2, 6, 23, 0.7)';
          ctx.shadowBlur = isRtx ? 18 : 10;
          ctx.shadowOffsetY = isRtx ? 6 : 4;
        }

        if (skullCanvas) {
          ctx.drawImage(
            skullCanvas,
            cx - drawW / 2,
            spriteCy - drawH / 2,
            drawW,
            drawH
          );
        } else if (cleanFishCanvas) {
          ctx.drawImage(
            cleanFishCanvas,
            cx - drawW / 2,
            spriteCy - drawH / 2,
            drawW,
            drawH
          );
        } else if (
          drawUnderworldObjectSprite(ctx, poke.id, cx, spriteCy, elapsed)
        ) {
          // drawn custom underworld fallback
        } else {
          ctx.fillStyle = poke.spriteColor;
          ctx.beginPath();
          ctx.ellipse(cx, spriteCy, 69, 39, -0.1, 0, Math.PI * 2);
          ctx.fill();
        }

        // Baño dorado brillante sobre el pez para Skin La Millonaria (solo si habilitado)
        if (catchXform.goldOverlayAlpha > 0) {
          ctx.save();
          ctx.globalCompositeOperation = 'lighter';
          const goldOverlay = ctx.createRadialGradient(cx, spriteCy, 8, cx, spriteCy, Math.max(drawW, drawH) * 0.56);
          goldOverlay.addColorStop(0, `rgba(254, 240, 138, ${catchXform.goldOverlayAlpha})`);
          goldOverlay.addColorStop(0.6, `rgba(250, 204, 21, ${catchXform.goldOverlayAlpha * 0.55})`);
          goldOverlay.addColorStop(1, 'rgba(250, 204, 21, 0)');
          ctx.fillStyle = goldOverlay;
          ctx.beginPath();
          ctx.ellipse(cx, spriteCy, drawW * 0.52, drawH * 0.54, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }

        ctx.restore();

        // Integrated Frosted Showcase Plate above caught fish (smooth entrance + rarity shimmer)
        const localizedFishName = getFishName(poke.id, langRef.current);
        const rawOddsText = formatOddsOneIn(poke.oneIn, langRef.current);
        const caughtWeightKg = lastCaughtRef.current?.weightKg;
        const oddsText =
          typeof caughtWeightKg === 'number' && caughtWeightKg > 0
            ? `${rawOddsText} · ${formatFishWeight(caughtWeightKg, langRef.current)}`
            : rawOddsText;
        const baseNameFontSize =
          width < 520
            ? localizedFishName.length > 22
              ? 24
              : 28
            : localizedFishName.length > 26
              ? 32
              : 38;
        const oddsFontSize = width < 520 ? 17 : 21;

        const plateT = Math.min(1, revealElapsed / 0.24);
        const plateEase = 1 - Math.pow(1 - plateT, 3);
        const plateOffsetY = (1 - plateEase) * 10;

        ctx.save();
        ctx.globalAlpha = plateEase;
        ctx.translate(0, plateOffsetY);
        ctx.font = `800 ${baseNameFontSize}px Outfit, sans-serif`;
        const measuredNameW = ctx.measureText(localizedFishName).width;
        ctx.font = `700 ${oddsFontSize}px "Plus Jakarta Sans", sans-serif`;
        const measuredOddsW = ctx.measureText(oddsText).width;
        const maxPlateW = Math.min(width - 32, 620);
        const plateW = Math.min(
          maxPlateW,
          Math.max(220, Math.max(measuredNameW, measuredOddsW) + 56)
        );
        const plateH = baseNameFontSize + oddsFontSize + 32;
        const idealPlateBottom = spriteCy - spriteHalfH - 14;
        const plateTop = Math.max(66, idealPlateBottom - plateH);
        const plateLeft = cx - plateW / 2;

        // Frosted twilight glass backdrop
        ctx.fillStyle = isUnderworldTheme
          ? 'rgba(26, 7, 7, 0.8)'
          : 'rgba(10, 22, 42, 0.78)';
        ctx.beginPath();
        ctx.roundRect(plateLeft, plateTop, plateW, plateH, 16);
        ctx.fill();

        if (!isLow) {
          ctx.shadowColor = `${rarityColor}55`;
          ctx.shadowBlur = isRtx ? 14 : 8;
        }
        ctx.strokeStyle = `${rarityColor}a6`;
        ctx.lineWidth = 1.8;
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Crisp rarity accent bar + subtle entrance light sweep
        ctx.fillStyle = rarityColor;
        ctx.beginPath();
        ctx.roundRect(cx - 34, plateTop + 5, 68, 3.5, 2);
        ctx.fill();

        if (!isLow && revealElapsed < 0.95) {
          const sweepT = revealElapsed / 0.95;
          const sweepX = plateLeft + plateW * (0.1 + sweepT * 0.8);
          ctx.save();
          ctx.beginPath();
          ctx.roundRect(plateLeft, plateTop, plateW, plateH, 16);
          ctx.clip();
          const sweepGrad = ctx.createLinearGradient(sweepX - 40, plateTop, sweepX + 40, plateTop + plateH);
          sweepGrad.addColorStop(0, 'rgba(255,255,255,0)');
          sweepGrad.addColorStop(0.5, 'rgba(255,255,255,0.16)');
          sweepGrad.addColorStop(1, 'rgba(255,255,255,0)');
          ctx.fillStyle = sweepGrad;
          ctx.fillRect(plateLeft, plateTop, plateW, plateH);
          ctx.restore();
        }

        const nameY = plateTop + 14 + baseNameFontSize * 0.85;
        const oddsY = nameY + oddsFontSize + 9;
        const maxTextWidth = plateW - 28;

        ctx.textAlign = 'center';
        ctx.font = `800 ${baseNameFontSize}px Outfit, sans-serif`;
        ctx.lineWidth = 5;
        ctx.strokeStyle = 'rgba(2, 6, 23, 0.9)';
        ctx.strokeText(localizedFishName, cx, nameY, maxTextWidth);
        ctx.fillStyle = rarityColor;
        ctx.fillText(localizedFishName, cx, nameY, maxTextWidth);

        ctx.font = `700 ${oddsFontSize}px "Plus Jakarta Sans", sans-serif`;
        ctx.lineWidth = 4;
        ctx.strokeText(oddsText, cx, oddsY, maxTextWidth);
        ctx.fillStyle = '#fef08a';
        ctx.fillText(oddsText, cx, oddsY, maxTextWidth);
        ctx.restore();
        }
        ctx.restore();
      }

      // 5. Visual Bite Alert (Rarity-specific cues + elastic bounce & shockwave ring)
      if (phase === 'BITING') {
        const springBounce =
          Math.exp(-biteAnimTime * 9) * Math.sin(biteAnimTime * 28) * 0.34;
        const pulse = Math.max(0.7, 1 + springBounce + Math.sin(elapsed * 18) * 0.1);
        const pendingRarity = pendingCatchRef.current?.species.rarity;
        const cueColor =
          pendingRarity === 'Épica'
            ? '#a855f7'
            : pendingRarity === 'Mítica'
              ? '#ef4444'
              : pendingRarity === 'Legendaria'
                ? '#eab308'
                : pendingRarity === 'Secreto'
                  ? '#0f172a'
                  : pendingRarity === 'Secreto Abisal'
                    ? '#06b6d4'
                    : '#f59e0b';

        // Expanding shockwave ring on initial bite
        if (biteAnimTime < 0.45) {
          const shockT = biteAnimTime / 0.45;
          ctx.save();
          ctx.globalAlpha = 1 - shockT;
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 3.5 * (1 - shockT * 0.5);
          ctx.beginPath();
          ctx.arc(holeX, holeY - 68, 22 + shockT * 36, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        }

        // Mystical blue flame for Secreto Abisal
        if (pendingRarity === 'Secreto Abisal') {
          ctx.save();
          ctx.fillStyle = 'rgba(34, 211, 238, 0.35)';
          ctx.beginPath();
          ctx.arc(holeX, holeY - 68, 36 + Math.sin(elapsed * 20) * 6, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }

        ctx.save();
        ctx.translate(holeX, holeY - 68 - Math.max(0, Math.sin(biteAnimTime * 16) * 5 * Math.exp(-biteAnimTime * 4)));
        ctx.scale(pulse, pulse);
        ctx.fillStyle = cueColor;
        ctx.beginPath();
        ctx.arc(0, 0, 22, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.fillStyle = '#ffffff';
        ctx.font = '800 26px Outfit, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(pendingRarity === 'Secreto' ? '?' : '!', 0, 1);
        ctx.restore();
      }

      // 6. Splash & Snow
      for (const p of splashPool) {
        if (!p.active) continue;
        ctx.fillStyle = p.color;
        ctx.globalAlpha = 1 - p.life / p.maxLife;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      const isUnderworld = worldRef.current === 'underworld';
      const renderSnowLimit = isLow ? 22 : gq === 'normal' ? 52 : snowflakes.length;
      for (let si = 0; si < renderSnowLimit; si++) {
        const s = snowflakes[si];
        ctx.globalAlpha = s.alpha;
        ctx.fillStyle = isUnderworld
          ? s.r > 2.2
            ? '#fef08a'
            : '#f97316'
          : '#ffffff';
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r * (isUnderworld ? 1.15 : 1), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      if (isUnderworld) {
        // Crisp volcanic sparks instead of large blurry gradient blobs
        const renderBubbleLimit = isLow ? 10 : gq === 'normal' ? 20 : lavaBubbles.length;
        for (let bi = 0; bi < renderBubbleLimit; bi++) {
          const b = lavaBubbles[bi];
          const pulse = 0.85 + Math.sin(elapsed * b.pulseSpeed + b.pulseOffset) * 0.15;
          const r = Math.max(1.1, b.r * pulse);
          ctx.globalAlpha = Math.min(1, b.alpha * 0.95);
          ctx.fillStyle = '#ea580c';
          ctx.beginPath();
          ctx.arc(b.x, b.y, r + 0.7, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#fef08a';
          ctx.beginPath();
          ctx.arc(b.x, b.y, r * 0.65, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }

      // RTX ULTRA: Atmospheric Fireflies & Sun Bloom (River only — keep Underworld razor-sharp without blurry bokeh fog)
      if (isRtx && !isUnderworld) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        const bokehSprite = riverBokehSprite;
        for (let ki = 0; ki < rtxBokeh.length; ki++) {
          const k = rtxBokeh[ki];
          const pulseA = k.alpha * (0.6 + 0.4 * Math.sin(elapsed * 2.2 + k.phase));
          const drawR = k.r * 2.2;
          ctx.globalAlpha = Math.min(1, pulseA * 1.35);
          ctx.drawImage(bokehSprite, k.x - drawR, k.y - drawR, drawR * 2, drawR * 2);
        }
        ctx.globalAlpha = 1;

        const skyBloomX = width * 0.655;
        const skyBloomY = height * 0.34;
        const skyBloom = ctx.createRadialGradient(
          skyBloomX,
          skyBloomY,
          10,
          skyBloomX,
          skyBloomY,
          width * 0.42
        );
        skyBloom.addColorStop(0, 'rgba(254, 240, 138, 0.15)');
        skyBloom.addColorStop(0.45, 'rgba(251, 191, 36, 0.05)');
        skyBloom.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = skyBloom;
        ctx.fillRect(0, 0, width, height);
        ctx.restore();

        // Subtle cinematic vignette for depth
        ctx.save();
        const vig = ctx.createRadialGradient(
          width * 0.5,
          height * 0.5,
          Math.min(width, height) * 0.36,
          width * 0.5,
          height * 0.5,
          Math.max(width, height) * 0.76
        );
        vig.addColorStop(0, 'rgba(0, 0, 0, 0)');
        vig.addColorStop(1, 'rgba(2, 6, 23, 0.34)');
        ctx.fillStyle = vig;
        ctx.fillRect(0, 0, width, height);
        ctx.restore();
      }

      const drawTutorialSparkle = (sx: number, sy: number, size: number, alpha: number) => {
        ctx.save();
        ctx.translate(sx, sy);
        const traceStar = (r: number) => {
          ctx.beginPath();
          ctx.moveTo(0, -r);
          ctx.quadraticCurveTo(r * 0.22, -r * 0.22, r, 0);
          ctx.quadraticCurveTo(r * 0.22, r * 0.22, 0, r);
          ctx.quadraticCurveTo(-r * 0.22, r * 0.22, -r, 0);
          ctx.quadraticCurveTo(-r * 0.22, -r * 0.22, 0, -r);
          ctx.closePath();
        };
        if (!isLow) {
          ctx.globalAlpha = alpha * 0.35;
          ctx.fillStyle = '#facc15';
          traceStar(size * 1.45);
          ctx.fill();
        }
        ctx.globalAlpha = alpha;
        ctx.fillStyle = '#fef9c3';
        traceStar(size);
        ctx.fill();
        ctx.restore();
      };

      const activeTutStep = tutorialStepRef.current;
      if (modeRef.current === 'playing' && activeTutStep === 1 && fishingStateRef.current.phase === 'IDLE') {
        ctx.save();
        // Subtle golden water shimmer marking where the hook will land
        const rippleA = (elapsed * 0.85) % 1;
        const rippleB = (elapsed * 0.85 + 0.5) % 1;
        for (const prog of [rippleA, rippleB]) {
          ctx.strokeStyle = `rgba(254, 240, 138, ${(1 - prog) * 0.7})`;
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.ellipse(
            holeX,
            holeY + 2,
            20 + prog * 40,
            8 + prog * 16,
            0,
            0,
            Math.PI * 2
          );
          ctx.stroke();
        }
        for (let i = 0; i < 4; i++) {
          const ang = elapsed * 1.4 + (i / 4) * Math.PI * 2;
          const sx = holeX + Math.cos(ang) * (36 + Math.sin(elapsed * 3 + i) * 8);
          const sy = holeY + Math.sin(ang) * 14 - 2;
          const tw = 0.4 + 0.5 * Math.abs(Math.sin(elapsed * 4.5 + i * 1.1));
          drawTutorialSparkle(sx, sy, 5 + (i % 2) * 2, tw);
        }
        ctx.restore();
      } else if (modeRef.current === 'playing' && activeTutStep === 2 && fishingStateRef.current.phase === 'BITING') {
        for (let i = 0; i < 8; i++) {
          const ang = elapsed * 3.2 + (i / 8) * Math.PI * 2;
          const sx = holeX + Math.cos(ang) * 44;
          const sy = holeY - 68 + Math.sin(ang) * 44;
          const tw = 0.5 + 0.5 * Math.abs(Math.sin(elapsed * 8 + i));
          drawTutorialSparkle(sx, sy, 8, tw);
        }
      }

      // CAPA 2 (Skin Partículas): Humo, vapor, burbujas hirviendo, rocas, monedas, billetes y confeti
      if (!inMarketScene) {
        skinEngine.renderParticlesLayer(ctx, skinFrameState);
        // CAPA 3 (Skin Brillo): Mezcla aditiva 'lighter', halos, shockwaves y esfera de energía
        skinEngine.renderGlowLayer(ctx, skinFrameState);
        // CAPA 4 (Skin Destello): Estrellas 4 puntas, flash de picada, rayo crítico y contador de dinero
        skinEngine.renderFlashLayer(ctx, skinFrameState);
      }

      // Cierre del transform de Screen Shake global de escena
      ctx.restore();

      // Corte / Fundido animado de transición entre Muelle y Mercado (Fundido a Rojo/Brasa en el Inframundo)
      if (transitionFadeAlpha > 0.001) {
        const a = Math.min(1, transitionFadeAlpha);
        ctx.save();
        if (worldRef.current === 'underworld') {
          ctx.fillStyle = `rgba(22, 3, 3, ${a * 0.96})`;
          ctx.fillRect(0, 0, width, height);

          const emberGrad = ctx.createRadialGradient(
            width * 0.5,
            height * 0.72,
            width * 0.04,
            width * 0.5,
            height * 0.55,
            Math.max(width, height) * 0.78
          );
          emberGrad.addColorStop(0, `rgba(249, 115, 22, ${a * 0.72})`);
          emberGrad.addColorStop(0.38, `rgba(220, 38, 38, ${a * 0.64})`);
          emberGrad.addColorStop(0.75, `rgba(127, 29, 29, ${a * 0.58})`);
          emberGrad.addColorStop(1, `rgba(18, 3, 3, ${a * 0.92})`);
          ctx.fillStyle = emberGrad;
          ctx.fillRect(0, 0, width, height);

          // Floating incandescent embers during the transition fade
          ctx.globalCompositeOperation = 'lighter';
          for (let i = 0; i < 18; i++) {
            const seed = i * 2.17;
            const prog = (elapsed * 1.4 + seed) % 1;
            const ex =
              width * ((i * 0.059 + 0.04) % 0.94) +
              Math.sin(elapsed * 4 + seed) * 22;
            const ey = height * (0.98 - prog * 0.85);
            const sparkR = (1.8 + (i % 3) * 1.3) * a;
            ctx.fillStyle =
              i % 3 === 0
                ? `rgba(254, 240, 138, ${a * 0.85})`
                : `rgba(251, 146, 60, ${a * 0.78})`;
            ctx.beginPath();
            ctx.arc(ex, ey, sparkR, 0, Math.PI * 2);
            ctx.fill();
          }
        } else {
          ctx.fillStyle = `rgba(6, 11, 22, ${a})`;
          ctx.fillRect(0, 0, width, height);
        }
        ctx.restore();
      }

      rafId = requestAnimationFrame(render);
    };

    rafId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(rafId);
      ro.disconnect();
      canvas.removeEventListener('mousemove', onMouseMove);
      canvas.removeEventListener('mouseleave', onMouseLeave);
      canvas.removeEventListener('touchstart', onTouchStart);
      canvas.removeEventListener('click', onClick);
    };
  }, [fishingStateRef]);

  return (
    <div ref={containerRef} className="fixed inset-0 w-full h-full overflow-hidden bg-[#0a1322]">
      {/* Hardware-accelerated SVG unsharp-mask filter for crisp Underworld Lava rock & magma edges */}
      <svg className="absolute w-0 h-0 pointer-events-none" aria-hidden="true">
        <defs>
          <filter id="underworld-crisp-filter" colorInterpolationFilters="sRGB">
            <feConvolveMatrix
              order="3 3"
              preserveAlpha="true"
              kernelMatrix="0 -0.32 0 -0.32 2.28 -0.32 0 -0.32 0"
            />
          </filter>
        </defs>
      </svg>
      <img
        src={
          scene === 'market'
            ? world === 'underworld'
              ? './assets/aistudio/underworld_market_background.webp'
              : './assets/aistudio/market_background.webp'
            : world === 'underworld'
              ? './assets/aistudio/IMG_5207_e2629c0e.webp'
              : './assets/aistudio/Atardecer_dorado_en_el_muelle_del_lago_55e5adb2.png'
        }
        alt={
          scene === 'market'
            ? world === 'underworld'
              ? lang === 'en'
                ? 'Underworld Marketplace'
                : 'Mercado del Inframundo'
              : lang === 'en'
                ? 'Marketplace'
                : 'Mercado'
            : world === 'underworld'
              ? lang === 'en'
                ? 'Underworld Lava Dock'
                : 'Muelle del Inframundo con Lava'
              : lang === 'en'
                ? 'Sunset Lake Dock'
                : 'Muelle al atardecer'
        }
        referrerPolicy="no-referrer"
        draggable={false}
        loading="eager"
        decoding="async"
        style={{
          transform: 'translateZ(0)',
          filter:
            world === 'underworld' && scene === 'dock'
              ? graphicsQuality === 'low'
                ? 'contrast(1.08) saturate(1.12)'
                : 'url(#underworld-crisp-filter) contrast(1.08) saturate(1.14)'
              : undefined,
        }}
        className={`absolute inset-0 w-full h-full object-cover select-none pointer-events-none ${
          world === 'underworld' && scene === 'dock' ? 'object-center' : 'object-[44%_62%]'
        }`}
      />
      <canvas
        ref={canvasRef}
        data-testid="fishing-canvas"
        className="relative z-10 block w-full h-full cursor-default"
        style={{ transform: 'translateZ(0)', willChange: 'transform' }}
      />
    </div>
  );
});

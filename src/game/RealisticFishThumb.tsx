import React, { useEffect, useRef } from 'react';

export const MAGMA_SKULL_SHEET_SRC =
  './assets/aistudio/IMG_0338_7a9a6710.webp';

export const CUSTOM_FISH_IMAGES: Record<number, string> = {
  1: './assets/aistudio/Gemini_Generated_Image_ye4p3hye4p3hye4p_68af3aff.webp',
  2: './assets/aistudio/Gemini_Generated_Image_4cr7nl4cr7nl4cr7_ea58aeaf.webp',
  3: './assets/aistudio/Gemini_Generated_Image_cjm00dcjm00dcjm0_0788ad49.webp',
  4: './assets/aistudio/Gemini_Generated_Image_kftxhtkftxhtkftx_271cabf3.webp',
  5: './assets/aistudio/Gemini_Generated_Image_u8audpu8audpu8au_1__ca6df88c.webp',
  6: './assets/aistudio/Gemini_Generated_Image_bievbfbievbfbiev_697af200.webp',
  7: './assets/aistudio/Gemini_Generated_Image_2o7ji92o7ji92o7j_198d4fb7.webp',
  8: './assets/aistudio/Gemini_Generated_Image_c1bphuc1bphuc1bp_4f67fc98.webp',
  9: './assets/aistudio/Gemini_Generated_Image_9oec9v9oec9v9oec_6a6ddcf9.webp',
  10: './assets/aistudio/Gemini_Generated_Image_ywqyl6ywqyl6ywqy_7697db92.webp',
  11: './assets/aistudio/fish_11_trucha_arcoiris.webp',
  12: './assets/aistudio/fish_12_tenca.webp',
  13: './assets/aistudio/fish_13_lucio.webp',
  21: './assets/aistudio/Gemini_Generated_Image_stci9xstci9xstci_1__f189a744.webp',
  22: './assets/aistudio/Gemini_Generated_Image_8avbex8avbex8avb_6a1b597f.webp',
  23: './assets/aistudio/Gemini_Generated_Image_ymdse6ymdse6ymds_34dadb5c.webp',
  24: './assets/aistudio/Gemini_Generated_Image_o3l8rlo3l8rlo3l8_d25ea6e1.webp',
  25: './assets/aistudio/Gemini_Generated_Image_nu8ga4nu8ga4nu8g_1__4eb4cba8.webp',
  26: './assets/aistudio/Gemini_Generated_Image_tzsv2xtzsv2xtzsv_e2e7d855.webp',
  27: './assets/aistudio/Gemini_Generated_Image_tqseo0tqseo0tqse_739b12c7.webp',
  28: './assets/aistudio/Gemini_Generated_Image_kidzshkidzshkidz_ff63d31a.webp',
  29: './assets/aistudio/IMG_5218_64c6ca67.webp',
  30: './assets/aistudio/IMG_5219_7311d79b.webp',
  31: './assets/aistudio/IMG_5220_f55bf48b.webp',
  14: './assets/aistudio/Gemini_Generated_Image_6yw4si6yw4si6yw4_f2f40f64.webp',
  15: './assets/aistudio/Gemini_Generated_Image_og020eog020eog02_7bb00b8b.webp',
  16: './assets/aistudio/Gemini_Generated_Image_u0tbm9u0tbm9u0tb_612deb69.webp',
  17: './assets/aistudio/Gemini_Generated_Image_hv6bfzhv6bfzhv6b_c300c324.webp',
  18: './assets/aistudio/Gemini_Generated_Image_f1221hf1221hf122_5073b8a3.webp',
  19: './assets/aistudio/Gemini_Generated_Image_hnn048hnn048hnn0_1cb941c4.webp',
  20: './assets/aistudio/Gemini_Generated_Image_g53c0kg53c0kg53c_f8b0e348.webp',
  32: './assets/aistudio/fish_32_cachito.webp',
  33: './assets/aistudio/Gemini_Generated_Image_9l4ko79l4ko79l4k_95ee762f.webp',
  34: './assets/aistudio/Gemini_Generated_Image_lolnwwlolnwwloln_e112ccb0.webp',
  35: './assets/aistudio/Gemini_Generated_Image_le2f1zle2f1zle2f_e4cda4cc.webp',
  36: './assets/aistudio/Gemini_Generated_Image_u08fgmu08fgmu08f_12274be5.webp',
  37: './assets/aistudio/Gemini_Generated_Image_fbss51fbss51fbss_4bfbaa87.webp',
  38: './assets/aistudio/Gemini_Generated_Image_9y3kog9y3kog9y3k_bc992008.webp',
  39: './assets/aistudio/Gemini_Generated_Image_csngw1csngw1csng_1bf8116a.webp',
  40: './assets/aistudio/Gemini_Generated_Image_7utrrg7utrrg7utr_a586b6f8.webp',
  41: './assets/aistudio/Gemini_Generated_Image_w2445jw2445jw244_a4abfa31.webp',
  42: './assets/aistudio/Gemini_Generated_Image_wrt484wrt484wrt4_f9241203.webp',
  43: './assets/aistudio/Gemini_Generated_Image_gws783gws783gws7_7dfb78e3.webp',
  44: './assets/aistudio/Gemini_Generated_Image_i316zpi316zpi316_c8ec34b1.webp',
  45: './assets/aistudio/Gemini_Generated_Image_1fux3a1fux3a1fux_2bb8747d.webp',
  46: './assets/aistudio/Gemini_Generated_Image_gzo5ptgzo5ptgzo5_95914fed.webp',
  47: './assets/aistudio/Gemini_Generated_Image_su219jsu219jsu21_361e8b15.webp',
  48: './assets/aistudio/Gemini_Generated_Image_2p18yw2p18yw2p18_82b32c4d.webp',
  49: './assets/aistudio/Gemini_Generated_Image_e43p6ne43p6ne43p_5f6badf4.webp',
  50: './assets/aistudio/Gemini_Generated_Image_3069u53069u53069_5a0b34f1.webp',
  51: './assets/aistudio/Gemini_Generated_Image_o7l78xo7l78xo7l7_337d0f2d.webp',
  101: './assets/aistudio/IMG_0340_49a91ff8.webp',
  102: './assets/aistudio/IMG_0339_6c3581f5.webp',
  103: MAGMA_SKULL_SHEET_SRC,
  104: './assets/aistudio/IMG_0338_d5bc8e3e.webp',
  105: './assets/aistudio/IMG_0338_4052dfeb.webp',
  106: './assets/aistudio/Gemini_Generated_Image_xkeg5oxkeg5oxkeg_2129f089.webp',
  107: './assets/aistudio/Gemini_Generated_Image_197fcm197fcm197f_23f159c7.webp',
  108: './assets/aistudio/Gemini_Generated_Image_7gvv4f7gvv4f7gvv_56ee1f85.webp',
  109: './assets/aistudio/Gemini_Generated_Image_obw301obw301obw3_c1256f06.webp',
  110: './assets/aistudio/Gemini_Generated_Image_rmqpzrrmqpzrrmqp_f45b9b98.webp',
  111: './assets/aistudio/Gemini_Generated_Image_fjtx86fjtx86fjtx_92400c78.webp',
  112: './assets/aistudio/Gemini_Generated_Image_nl6sbmnl6sbmnl6s_710dbe78.webp',
  113: './assets/aistudio/Gemini_Generated_Image_nctmddnctmddnctm_05d79b43.webp',
  114: './assets/aistudio/Gemini_Generated_Image_2tcuph2tcuph2tcu_2c13743f.webp',
};

let cachedSkullSprites: HTMLCanvasElement[] | null = null;
let skullSpritesPromise: Promise<HTMLCanvasElement[]> | null = null;
const cleanFishCache = new Map<number, HTMLCanvasElement>();
const cleanFishPromises = new Map<number, Promise<HTMLCanvasElement | null>>();

export const CHECKERBOARD_FISH_IDS = new Set<number>([
  1, // Carpa
  2, // Alburno
  7, // Trucha
  8, // Barbo
  9, // Cacho
  10, // Piraña
  14, // Boga
  21, // Gobio de río
  22, // Carpín dorado salvaje
  23, // Bermejuela
  24, // Madrilla
  25, // Sarda
  26, // Pardilla
  27, // Blenio de río
  29, // Colmilleja
  30, // Darso
  31, // Barbo colirrojo
  33, // Sábalo
  34, // Saboga
  35, // Lucio-perca
  36, // Black Bass pequeño
  37, // Barbo comiza
]);

export function stripBackgroundFloodFill(
  imgData: ImageData,
  fishId?: number
): void {
  const { width: w, height: h, data: d } = imgData;
  if (w === 0 || h === 0) return;

  // Sample the 4 corners (and slight insets) to detect the true background type
  const sampleCoords: [number, number][] = [
    [0, 0],
    [w - 1, 0],
    [0, h - 1],
    [w - 1, h - 1],
    [Math.min(2, w - 1), Math.min(2, h - 1)],
    [Math.max(0, w - 3), Math.min(2, h - 1)],
    [Math.min(2, w - 1), Math.max(0, h - 3)],
    [Math.max(0, w - 3), Math.max(0, h - 3)],
  ];

  let darkCornerCount = 0;
  let transparentCornerCount = 0;
  let bestLightMin = -1;
  let bgR = 255;
  let bgG = 255;
  let bgB = 255;

  for (let i = 0; i < 4; i++) {
    const [cx, cy] = sampleCoords[i];
    const p = (cy * w + cx) * 4;
    if (d[p + 3] < 16) {
      transparentCornerCount++;
      continue;
    }
    const r = d[p];
    const g = d[p + 1];
    const b = d[p + 2];
    const maxC = Math.max(r, g, b);
    const minC = Math.min(r, g, b);
    if (maxC <= 22) {
      darkCornerCount++;
    }
    if (minC > bestLightMin) {
      bestLightMin = minC;
      bgR = r;
      bgG = g;
      bgB = b;
    }
  }

  // Already transparent PNG/WebP (e.g., fish 11, 12, 13, 32)
  if (transparentCornerCount === 4) {
    if (w >= 64 && h >= 64) {
      refineTransparentSilhouetteEdges(d, w, h);
    }
    return;
  }

  const isDarkBg = darkCornerCount >= 3;

  // Detect checkerboard background either by known fishId or by border white + neutral gray squares
  let hasBorderWhite = false;
  let hasBorderNeutralGray = false;
  let grayMin = 240;
  let maxBorderSat = 4;

  const borderStep = Math.max(1, Math.floor(w / 120));
  const borderRows =
    h >= 16
      ? [
          0,
          Math.min(2, h - 1),
          Math.min(6, h - 1),
          Math.max(0, h - 7),
          Math.max(0, h - 3),
          h - 1,
        ]
      : [0, h - 1];

  for (const y of borderRows) {
    for (let x = 0; x < w; x += borderStep) {
      if (fishId === 31 && y > h * 0.84 && x > w * 0.35 && x < w * 0.65) {
        continue;
      }
      const p = (y * w + x) * 4;
      if (d[p + 3] < 16) continue;
      const r = d[p];
      const g = d[p + 1];
      const b = d[p + 2];
      const maxC = Math.max(r, g, b);
      const minC = Math.min(r, g, b);
      const sat = maxC - minC;
      if (sat <= 9 && minC >= 168) {
        if (minC >= 245) {
          hasBorderWhite = true;
        } else if (maxC <= 236) {
          hasBorderNeutralGray = true;
        }
        if (minC < grayMin) grayMin = minC;
        if (sat > maxBorderSat) maxBorderSat = sat;
      }
    }
  }

  const isCheckerboard =
    !isDarkBg &&
    ((fishId !== undefined && CHECKERBOARD_FISH_IDS.has(fishId)) ||
      (hasBorderWhite && hasBorderNeutralGray));

  // For Barbo colirrojo (id 31), clear the baked-in bottom text label before flood filling
  if (fishId === 31) {
    const yStart = Math.floor(h * 0.86);
    const xStart = Math.floor(w * 0.36);
    const xEnd = Math.ceil(w * 0.64);
    for (let y = yStart; y < h; y++) {
      for (let x = xStart; x < xEnd; x++) {
        d[(y * w + x) * 4 + 3] = 0;
      }
    }
  }

  const gFloor = Math.max(168, (grayMin <= 236 ? grayMin : 192) - 4);
  const satLimit = Math.min(8, Math.max(5, maxBorderSat + 1));
  const useQuadrantFlatness = isCheckerboard && w >= 64 && h >= 64;

  // Check if a 3x3 block starting at (bx, by) is a flat neutral checkerboard square interior
  const isFlatNeutralBlock = (bx: number, by: number): boolean => {
    if (bx < 0 || by < 0 || bx + 2 >= w || by + 2 >= h) return true;
    let bMin = 255;
    let bMax = 0;
    for (let dy = 0; dy <= 2; dy++) {
      const rowOff = (by + dy) * w + bx;
      for (let dx = 0; dx <= 2; dx++) {
        const p = (rowOff + dx) * 4;
        const r = d[p];
        const g = d[p + 1];
        const b = d[p + 2];
        const mx = Math.max(r, g, b);
        const mn = Math.min(r, g, b);
        if (mn < gFloor || mx - mn > satLimit + 1) return false;
        if (mn < bMin) bMin = mn;
        if (mx > bMax) bMax = mx;
      }
    }
    return bMax - bMin <= 6;
  };

  // Determine whether a pixel at (x, y) with (r,g,b) qualifies as background when flooded from neighbor (nr,ng,nb)
  const matchesBg = (
    x: number,
    y: number,
    r: number,
    g: number,
    b: number,
    nr: number,
    ng: number,
    nb: number,
    isSeed: boolean
  ): boolean => {
    const maxC = Math.max(r, g, b);
    const minC = Math.min(r, g, b);

    if (isDarkBg) {
      // Pure black background (e.g., Underworld items 112, 113, 114):
      // Only strip near-black background pixels (maxC <= 10) so dark volcanic rock
      // and burnt scroll edges (RGB >= 12) remain 100% intact.
      if (maxC > 10) return false;
      if (!isSeed) {
        const step = Math.max(
          Math.abs(r - nr),
          Math.abs(g - ng),
          Math.abs(b - nb)
        );
        if (step > 6) return false;
      }
      return true;
    }

    if (isCheckerboard) {
      const sat = maxC - minC;
      if (minC < gFloor || sat > satLimit + 2) return false;
      if (useQuadrantFlatness) {
        // Pure white square bleed tucked into tight barbel/fin crevices
        if (minC >= 247 && sat <= 5) return true;
        return (
          isFlatNeutralBlock(x - 3, y - 3) ||
          isFlatNeutralBlock(x + 1, y - 3) ||
          isFlatNeutralBlock(x - 3, y + 1) ||
          isFlatNeutralBlock(x + 1, y + 1)
        );
      }
      return true;
    }

    // Light / white / off-white background:
    // Never match dark pixels (maxC < 35) on light-background images, and keep
    // tight tolerance around (bgR, bgG, bgB) so silver/white fish bellies
    // (Salmón, Bocachico, Esturión, Esturión beluga, Pez espátula, Siluro albino, etc.)
    // and glowing lures (Monstruo abisal) are never eaten away.
    const diffBg = Math.max(
      Math.abs(r - bgR),
      Math.abs(g - bgG),
      Math.abs(b - bgB)
    );
    if (diffBg > 10 || maxC - minC > 9) {
      return false;
    }
    if (!isSeed) {
      const step = Math.max(
        Math.abs(r - nr),
        Math.abs(g - ng),
        Math.abs(b - nb)
      );
      if (step > 5) return false;
    }
    return true;
  };

  const visited = new Uint8Array(w * h);
  const queue = new Int32Array(w * h);
  let head = 0;
  let tail = 0;

  const tryPushSeed = (x: number, y: number) => {
    const idx = y * w + x;
    if (visited[idx]) return;
    const p = idx * 4;
    if (
      d[p + 3] === 0 ||
      matchesBg(x, y, d[p], d[p + 1], d[p + 2], bgR, bgG, bgB, true)
    ) {
      visited[idx] = 1;
      queue[tail++] = idx;
    }
  };

  const tryPushNeighbor = (
    x: number,
    y: number,
    nr: number,
    ng: number,
    nb: number
  ) => {
    const idx = y * w + x;
    if (visited[idx]) return;
    const p = idx * 4;
    if (
      d[p + 3] === 0 ||
      matchesBg(x, y, d[p], d[p + 1], d[p + 2], nr, ng, nb, false)
    ) {
      visited[idx] = 1;
      queue[tail++] = idx;
    }
  };

  for (let x = 0; x < w; x++) {
    tryPushSeed(x, 0);
    tryPushSeed(x, h - 1);
  }
  for (let y = 1; y < h - 1; y++) {
    tryPushSeed(0, y);
    tryPushSeed(w - 1, y);
  }

  while (head < tail) {
    const idx = queue[head++];
    const p = idx * 4;
    const nr = d[p];
    const ng = d[p + 1];
    const nb = d[p + 2];
    d[p + 3] = 0;
    const x = idx % w;
    const y = (idx - x) / w;
    if (x > 0) tryPushNeighbor(x - 1, y, nr, ng, nb);
    if (x + 1 < w) tryPushNeighbor(x + 1, y, nr, ng, nb);
    if (y > 0) tryPushNeighbor(x, y - 1, nr, ng, nb);
    if (y + 1 < h) tryPushNeighbor(x, y + 1, nr, ng, nb);
  }

  // Remove tiny isolated JPEG checkerboard corner specks not connected to the fish body
  if (!isDarkBg && w >= 64 && h >= 64) {
    const minComponentPixels = Math.max(40, Math.floor(w * h * 0.001));
    const fgVisited = new Uint8Array(w * h);
    const compQueue = new Int32Array(w * h);
    for (let i = 0; i < w * h; i++) {
      if (d[i * 4 + 3] === 0 || fgVisited[i]) continue;
      let cHead = 0;
      let cTail = 0;
      fgVisited[i] = 1;
      compQueue[cTail++] = i;
      while (cHead < cTail) {
        const cur = compQueue[cHead++];
        const cx = cur % w;
        const cy = (cur - cx) / w;
        if (cx > 0) {
          const nb = cur - 1;
          if (!fgVisited[nb] && d[nb * 4 + 3] > 0) {
            fgVisited[nb] = 1;
            compQueue[cTail++] = nb;
          }
        }
        if (cx + 1 < w) {
          const nb = cur + 1;
          if (!fgVisited[nb] && d[nb * 4 + 3] > 0) {
            fgVisited[nb] = 1;
            compQueue[cTail++] = nb;
          }
        }
        if (cy > 0) {
          const nb = cur - w;
          if (!fgVisited[nb] && d[nb * 4 + 3] > 0) {
            fgVisited[nb] = 1;
            compQueue[cTail++] = nb;
          }
        }
        if (cy + 1 < h) {
          const nb = cur + w;
          if (!fgVisited[nb] && d[nb * 4 + 3] > 0) {
            fgVisited[nb] = 1;
            compQueue[cTail++] = nb;
          }
        }
      }
      if (cTail < minComponentPixels) {
        for (let k = 0; k < cTail; k++) {
          d[compQueue[k] * 4 + 3] = 0;
        }
      }
    }
  }

  // High-res silhouette cleanup (decontaminate 1-2px compressed white/gray halo & smooth sawtooth edges)
  if (w >= 64 && h >= 64) {
    // Pass A: Remove 1-2px outermost near-background compression fringe touching stripped space
    if (!isDarkBg) {
      const stripFringeRing = (strictSecondPass: boolean) => {
        const outerFringe: number[] = [];
        for (let y = 1; y < h - 1; y++) {
          for (let x = 1; x < w - 1; x++) {
            const idx = y * w + x;
            const p = idx * 4;
            if (d[p + 3] === 0) continue;
            const touchingBg =
              d[(idx - 1) * 4 + 3] === 0 ||
              d[(idx + 1) * 4 + 3] === 0 ||
              d[(idx - w) * 4 + 3] === 0 ||
              d[(idx + w) * 4 + 3] === 0;
            if (!touchingBg) continue;
            const r = d[p];
            const g = d[p + 1];
            const b = d[p + 2];
            const maxC = Math.max(r, g, b);
            const minC = Math.min(r, g, b);
            const sat = maxC - minC;

            if (!strictSecondPass) {
              // Trim isolated protruding 1px pale compression teeth
              let zero8 = 0;
              for (let dy = -1; dy <= 1; dy++) {
                const rowOff = (y + dy) * w + x;
                for (let dx = -1; dx <= 1; dx++) {
                  if (dx === 0 && dy === 0) continue;
                  if (d[(rowOff + dx) * 4 + 3] === 0) zero8++;
                }
              }
              if (zero8 >= 6 && minC >= 180 && sat <= 26) {
                outerFringe.push(p);
                continue;
              }
              if (isCheckerboard) {
                if (
                  (minC >= 242 && sat <= 8) ||
                  (minC >= gFloor - 10 && sat <= satLimit + 8)
                ) {
                  outerFringe.push(p);
                }
              } else {
                const diffBg = Math.max(
                  Math.abs(r - bgR),
                  Math.abs(g - bgG),
                  Math.abs(b - bgB)
                );
                if (diffBg <= 20 && sat <= 16) {
                  outerFringe.push(p);
                }
              }
            } else {
              if (isCheckerboard) {
                if (minC >= 245 && sat <= 6) {
                  outerFringe.push(p);
                }
              } else {
                const diffBg = Math.max(
                  Math.abs(r - bgR),
                  Math.abs(g - bgG),
                  Math.abs(b - bgB)
                );
                if (diffBg <= 12 && sat <= 11) {
                  outerFringe.push(p);
                }
              }
            }
          }
        }
        for (const p of outerFringe) {
          d[p + 3] = 0;
        }
      };

      stripFringeRing(false);
      stripFringeRing(true);
    }

    // Pass B: Unmix & decontaminate remaining 1-2px pale/chalky edge halos using interior fish colors
    const isBoundary = new Uint8Array(w * h);
    const boundaryIndices: number[] = [];
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const idx = y * w + x;
        if (d[idx * 4 + 3] === 0) continue;
        let hasZeroNeighbor = false;
        for (let dy = -1; dy <= 1 && !hasZeroNeighbor; dy++) {
          const rowOff = (y + dy) * w + x;
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;
            if (d[(rowOff + dx) * 4 + 3] === 0) {
              hasZeroNeighbor = true;
              break;
            }
          }
        }
        if (hasZeroNeighbor) {
          isBoundary[idx] = 1;
          boundaryIndices.push(idx);
        }
      }
    }

    if (!isDarkBg && boundaryIndices.length > 0) {
      const isRing2 = new Uint8Array(w * h);
      const ring2Indices: number[] = [];
      for (const bIdx of boundaryIndices) {
        const bx = bIdx % w;
        const by = (bIdx - bx) / w;
        for (let dy = -1; dy <= 1; dy++) {
          const ny = by + dy;
          if (ny < 1 || ny >= h - 1) continue;
          for (let dx = -1; dx <= 1; dx++) {
            const nx = bx + dx;
            if (nx < 1 || nx >= w - 1) continue;
            const nIdx = ny * w + nx;
            if (!isBoundary[nIdx] && !isRing2[nIdx] && d[nIdx * 4 + 3] > 0) {
              isRing2[nIdx] = 1;
              ring2Indices.push(nIdx);
            }
          }
        }
      }

      const sampleInterior = (x: number, y: number) => {
        let sumR = 0;
        let sumG = 0;
        let sumB = 0;
        let weightSum = 0;
        for (let dy = -3; dy <= 3; dy++) {
          const ny = y + dy;
          if (ny < 0 || ny >= h) continue;
          for (let dx = -3; dx <= 3; dx++) {
            const distSq = dx * dx + dy * dy;
            if (distSq === 0 || distSq > 10) continue;
            const nx = x + dx;
            if (nx < 0 || nx >= w) continue;
            const nIdx = ny * w + nx;
            const np = nIdx * 4;
            if (d[np + 3] === 255 && !isBoundary[nIdx]) {
              const wgt = 1 / distSq;
              sumR += d[np] * wgt;
              sumG += d[np + 1] * wgt;
              sumB += d[np + 2] * wgt;
              weightSum += wgt;
            }
          }
        }
        return weightSum > 0
          ? {
              ir: sumR / weightSum,
              ig: sumG / weightSum,
              ib: sumB / weightSum,
            }
          : null;
      };

      for (const idx of boundaryIndices) {
        const p = idx * 4;
        const x = idx % w;
        const y = (idx - x) / w;
        const r = d[p];
        const g = d[p + 1];
        const b = d[p + 2];
        const maxC = Math.max(r, g, b);
        const minC = Math.min(r, g, b);
        const sat = maxC - minC;
        const lum = (r + g + b) / 3;

        const interior = sampleInterior(x, y);
        if (!interior) continue;
        const { ir, ig, ib } = interior;
        const iLum = (ir + ig + ib) / 3;

        const isNeutralHalo =
          minC >= 152 && sat <= 34 && (lum >= iLum - 10 || iLum < 165);
        const isTintedMatteHalo =
          sat <= 52 && minC >= 145 && lum - iLum >= 34;

        if (!isNeutralHalo && !isTintedMatteHalo) continue;

        let refR = bgR;
        let refG = bgG;
        let refB = bgB;
        if (isCheckerboard) {
          if (maxC <= 236) {
            refR = 204;
            refG = 204;
            refB = 204;
          } else {
            refR = 255;
            refG = 255;
            refB = 255;
          }
        }

        const fgDist = Math.hypot(ir - refR, ig - refG, ib - refB);
        const pxDist = Math.hypot(r - refR, g - refG, b - refB);

        if (fgDist > 26) {
          const cov = Math.min(1, Math.max(0, pxDist / fgDist));
          if (cov < 0.16) {
            d[p + 3] = 0;
          } else {
            d[p + 3] = Math.round(Math.min(242, Math.max(40, cov * 255)));
            d[p] = Math.round(r * 0.1 + ir * 0.9);
            d[p + 1] = Math.round(g * 0.1 + ig * 0.9);
            d[p + 2] = Math.round(b * 0.1 + ib * 0.9);
          }
        } else if (minC >= 244 && sat <= 7) {
          d[p + 3] = 0;
        }
      }

      // Clean 2nd-ring chalky WebP halo pixels around darker/richer fins
      for (const idx of ring2Indices) {
        const p = idx * 4;
        const x = idx % w;
        const y = (idx - x) / w;
        const r = d[p];
        const g = d[p + 1];
        const b = d[p + 2];
        const maxC = Math.max(r, g, b);
        const minC = Math.min(r, g, b);
        const sat = maxC - minC;
        const lum = (r + g + b) / 3;
        if (minC < 178 || sat > 24) continue;
        const interior = sampleInterior(x, y);
        if (!interior) continue;
        const { ir, ig, ib } = interior;
        const iLum = (ir + ig + ib) / 3;
        if (lum - iLum >= 28) {
          d[p] = Math.round(r * 0.32 + ir * 0.68);
          d[p + 1] = Math.round(g * 0.32 + ig * 0.68);
          d[p + 2] = Math.round(b * 0.32 + ib * 0.68);
        }
      }
    }

    // Pass C: Curvature-aware 3x3 perimeter alpha anti-aliasing
    applyPerimeterAntiAliasing(d, w, h, boundaryIndices);
    return;
  }

  // Compact synthetic grids (<64px): simple 1-pixel edge feathering
  const toSoften: number[] = [];
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const idx = y * w + x;
      const p = idx * 4;
      if (d[p + 3] === 0) continue;
      const r = d[p];
      const g = d[p + 1];
      const b = d[p + 2];
      const maxC = Math.max(r, g, b);
      const minC = Math.min(r, g, b);
      const isNearBoundaryBg = isDarkBg
        ? maxC <= 16
        : isCheckerboard
          ? minC >= gFloor - 8 && maxC - minC <= satLimit + 4
          : Math.max(Math.abs(r - bgR), Math.abs(g - bgG), Math.abs(b - bgB)) <=
              10 && maxC - minC <= 10;
      if (!isNearBoundaryBg) continue;
      if (
        d[(idx - 1) * 4 + 3] === 0 ||
        d[(idx + 1) * 4 + 3] === 0 ||
        d[(idx - w) * 4 + 3] === 0 ||
        d[(idx + w) * 4 + 3] === 0
      ) {
        toSoften.push(p);
      }
    }
  }
  for (const p of toSoften) {
    d[p + 3] = 92;
  }
}

function applyPerimeterAntiAliasing(
  d: Uint8ClampedArray,
  w: number,
  h: number,
  boundaryIndices: number[]
): void {
  if (boundaryIndices.length === 0) return;
  const alphaSnapshot = new Uint8ClampedArray(w * h);
  for (let i = 0; i < w * h; i++) {
    alphaSnapshot[i] = d[i * 4 + 3];
  }
  for (const idx of boundaryIndices) {
    const p = idx * 4;
    const curA = alphaSnapshot[idx];
    if (curA === 0) continue;
    const x = idx % w;
    const y = (idx - x) / w;
    let weightedSum = 0;
    let totalWeight = 0;
    let zeroCount = 0;
    for (let dy = -1; dy <= 1; dy++) {
      const ny = y + dy;
      if (ny < 0 || ny >= h) continue;
      for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx;
        if (nx < 0 || nx >= w) continue;
        const nA = alphaSnapshot[ny * w + nx];
        if ((dx !== 0 || dy !== 0) && nA === 0) {
          zeroCount++;
        }
        const wgt = dx === 0 && dy === 0 ? 3 : dx === 0 || dy === 0 ? 1.5 : 1;
        weightedSum += nA * wgt;
        totalWeight += wgt;
      }
    }
    const smoothed = Math.round(weightedSum / totalWeight);
    if (zeroCount >= 6) {
      d[p + 3] = Math.round(smoothed * (curA < 190 ? 0.65 : 0.75));
    } else if (zeroCount >= 4) {
      d[p + 3] = Math.min(curA, Math.max(92, Math.min(238, smoothed + 18)));
    } else {
      d[p + 3] = Math.max(185, Math.min(255, smoothed + 36));
    }
  }
}

function refineTransparentSilhouetteEdges(
  d: Uint8ClampedArray,
  w: number,
  h: number
): void {
  // 1. Remove faint orphan semi-transparent dust left by lossy alpha compression
  for (let i = 0; i < w * h; i++) {
    if (d[i * 4 + 3] < 22) {
      d[i * 4 + 3] = 0;
    }
  }

  // 2. Strip 1-2px pale white/gray matte rim pixels touching transparent space (including opaque a>=235 rims)
  for (let pass = 0; pass < 2; pass++) {
    const toStrip: number[] = [];
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const idx = y * w + x;
        const p = idx * 4;
        const a = d[p + 3];
        if (a === 0) continue;
        const touchingZero =
          d[(idx - 1) * 4 + 3] === 0 ||
          d[(idx + 1) * 4 + 3] === 0 ||
          d[(idx - w) * 4 + 3] === 0 ||
          d[(idx + w) * 4 + 3] === 0;
        if (!touchingZero) continue;

        let zero8 = 0;
        let sumR = 0;
        let sumG = 0;
        let sumB = 0;
        let count = 0;
        for (let dy = -2; dy <= 2; dy++) {
          const ny = y + dy;
          if (ny < 0 || ny >= h) continue;
          for (let dx = -2; dx <= 2; dx++) {
            const nx = x + dx;
            if (nx < 0 || nx >= w) continue;
            const np = (ny * w + nx) * 4;
            if (Math.abs(dx) <= 1 && Math.abs(dy) <= 1 && (dx !== 0 || dy !== 0)) {
              if (d[np + 3] === 0) zero8++;
            }
            if (d[np + 3] >= 245 && (Math.abs(dx) > 1 || Math.abs(dy) > 1 || pass === 0)) {
              sumR += d[np];
              sumG += d[np + 1];
              sumB += d[np + 2];
              count++;
            }
          }
        }
        if (zero8 >= 6 && a < 160) {
          toStrip.push(p);
          continue;
        }
        const r = d[p];
        const g = d[p + 1];
        const b = d[p + 2];
        const minC = Math.min(r, g, b);
        const sat = Math.max(r, g, b) - minC;
        const lum = (r + g + b) / 3;
        const iLum = count > 0 ? (sumR + sumG + sumB) / (3 * count) : lum;

        if (pass === 0) {
          if (
            (minC >= 200 && sat <= 24 && (a < 235 || lum - iLum >= 22)) ||
            (a < 185 && minC >= 172 && sat <= 28 && lum - iLum >= 16)
          ) {
            toStrip.push(p);
          }
        } else {
          if (a < 220 && minC >= 208 && sat <= 20 && lum - iLum >= 24) {
            toStrip.push(p);
          }
        }
      }
    }
    for (const p of toStrip) {
      d[p + 3] = 0;
    }
  }

  // 3. Collect boundary pixels and unmix RGB toward solid interior fish tones
  const isBoundary = new Uint8Array(w * h);
  const boundaryIndices: number[] = [];
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const idx = y * w + x;
      if (d[idx * 4 + 3] === 0) continue;
      let hasZeroNeighbor = false;
      for (let dy = -1; dy <= 1 && !hasZeroNeighbor; dy++) {
        const rowOff = (y + dy) * w + x;
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          if (d[(rowOff + dx) * 4 + 3] === 0) {
            hasZeroNeighbor = true;
            break;
          }
        }
      }
      if (hasZeroNeighbor) {
        isBoundary[idx] = 1;
        boundaryIndices.push(idx);
      }
    }
  }

  for (const idx of boundaryIndices) {
    const p = idx * 4;
    const x = idx % w;
    const y = (idx - x) / w;
    const a = d[p + 3];
    const r = d[p];
    const g = d[p + 1];
    const b = d[p + 2];
    const minC = Math.min(r, g, b);
    const sat = Math.max(r, g, b) - minC;
    const lum = (r + g + b) / 3;

    let sumR = 0;
    let sumG = 0;
    let sumB = 0;
    let weightSum = 0;
    for (let dy = -3; dy <= 3; dy++) {
      const ny = y + dy;
      if (ny < 0 || ny >= h) continue;
      for (let dx = -3; dx <= 3; dx++) {
        const distSq = dx * dx + dy * dy;
        if (distSq === 0 || distSq > 10) continue;
        const nx = x + dx;
        if (nx < 0 || nx >= w) continue;
        const nIdx = ny * w + nx;
        const np = nIdx * 4;
        if (d[np + 3] >= 245 && !isBoundary[nIdx]) {
          const wgt = 1 / distSq;
          sumR += d[np] * wgt;
          sumG += d[np + 1] * wgt;
          sumB += d[np + 2] * wgt;
          weightSum += wgt;
        }
      }
    }
    if (weightSum === 0) continue;
    const ir = sumR / weightSum;
    const ig = sumG / weightSum;
    const ib = sumB / weightSum;
    const iLum = (ir + ig + ib) / 3;

    const isPaleHalo = minC >= 158 && sat <= 34 && (lum >= iLum - 12 || a < 245);
    const isTintedHalo = sat <= 50 && minC >= 148 && lum - iLum >= 32;
    if (isPaleHalo || isTintedHalo) {
      const blend = a < 235 ? 0.9 : 0.78;
      d[p] = Math.round(r * (1 - blend) + ir * blend);
      d[p + 1] = Math.round(g * (1 - blend) + ig * blend);
      d[p + 2] = Math.round(b * (1 - blend) + ib * blend);
      if (a >= 235 && lum - iLum >= 26) {
        d[p + 3] = 205;
      }
    }
  }

  // 4. Smooth silhouette perimeter alpha
  applyPerimeterAntiAliasing(d, w, h, boundaryIndices);
}

function removeDisconnectedBottomComponents(
  imgData: ImageData,
  minYRatio: number
): void {
  const { width: w, height: h, data: d } = imgData;
  if (w === 0 || h === 0) return;

  const yThreshold = h * minYRatio;
  const visited = new Uint8Array(w * h);
  const queue = new Int32Array(w * h);

  for (let startIdx = 0; startIdx < w * h; startIdx++) {
    if (visited[startIdx] || d[startIdx * 4 + 3] === 0) continue;

    let head = 0;
    let tail = 0;
    let minY = h;
    visited[startIdx] = 1;
    queue[tail++] = startIdx;

    while (head < tail) {
      const idx = queue[head++];
      const x = idx % w;
      const y = (idx - x) / w;
      if (y < minY) minY = y;

      for (let dy = -1; dy <= 1; dy++) {
        const ny = y + dy;
        if (ny < 0 || ny >= h) continue;
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          const nx = x + dx;
          if (nx < 0 || nx >= w) continue;
          const nIdx = ny * w + nx;
          if (!visited[nIdx] && d[nIdx * 4 + 3] > 0) {
            visited[nIdx] = 1;
            queue[tail++] = nIdx;
          }
        }
      }
    }

    if (minY > yThreshold) {
      for (let i = 0; i < tail; i++) {
        d[queue[i] * 4 + 3] = 0;
      }
    }
  }
}

function trimTransparentCanvas(
  source: HTMLCanvasElement,
  imgData: ImageData
): HTMLCanvasElement {
  const { width: w, height: h, data: d } = imgData;
  let minX = w;
  let minY = h;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (d[(y * w + x) * 4 + 3] > 10) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (maxX < minX || maxY < minY) return source;

  const pad = 4;
  const cx = Math.max(0, minX - pad);
  const cy = Math.max(0, minY - pad);
  const cw = Math.min(w - cx, maxX - minX + 1 + pad * 2);
  const ch = Math.min(h - cy, maxY - minY + 1 + pad * 2);

  const trimmed = document.createElement('canvas');
  trimmed.width = cw;
  trimmed.height = ch;
  const tctx = trimmed.getContext('2d');
  if (tctx) {
    tctx.drawImage(source, cx, cy, cw, ch, 0, 0, cw, ch);
  }
  return trimmed;
}

export function loadCleanFishCanvas(
  fishId: number
): Promise<HTMLCanvasElement | null> {
  const cached = cleanFishCache.get(fishId);
  if (cached) return Promise.resolve(cached);

  const existing = cleanFishPromises.get(fishId);
  if (existing) return existing;

  const src = CUSTOM_FISH_IMAGES[fishId];
  if (!src) return Promise.resolve(null);

  const promise = new Promise<HTMLCanvasElement | null>((resolve) => {
    const img = new Image();
    img.src = src;
    img.onload = () => {
      const nw = img.naturalWidth;
      const nh = img.naturalHeight;
      if (nw === 0 || nh === 0) {
        resolve(null);
        return;
      }
      // Keep full crisp native resolution (cap only extreme >1800px images)
      const maxNative = 1600;
      const scale = Math.min(1, maxNative / Math.max(nw, nh));
      const w = Math.max(1, Math.round(nw * scale));
      const h = Math.max(1, Math.round(nh * scale));

      const off = document.createElement('canvas');
      off.width = w;
      off.height = h;
      const octx = off.getContext('2d');
      if (!octx) {
        resolve(null);
        return;
      }
      octx.imageSmoothingEnabled = true;
      octx.imageSmoothingQuality = 'high';
      octx.drawImage(img, 0, 0, w, h);

      const imgData = octx.getImageData(0, 0, w, h);
      const fd = imgData.data;
      const hasPreCleanedAlpha =
        fd[3] < 16 &&
        fd[(w - 1) * 4 + 3] < 16 &&
        fd[((h - 1) * w) * 4 + 3] < 16 &&
        fd[(w * h - 1) * 4 + 3] < 16;

      if (!hasPreCleanedAlpha) {
        stripBackgroundFloodFill(imgData, fishId);
        if (fishId === 31 || fishId === 42) {
          removeDisconnectedBottomComponents(imgData, 0.82);
        }
        octx.putImageData(imgData, 0, 0);
      }

      const trimmed = trimTransparentCanvas(off, imgData);
      cleanFishCache.set(fishId, trimmed);
      resolve(trimmed);
    };
    img.onerror = () => resolve(null);
  });

  cleanFishPromises.set(fishId, promise);
  return promise;
}

export function getCachedCleanFishCanvas(
  fishId: number
): HTMLCanvasElement | null {
  return cleanFishCache.get(fishId) ?? null;
}

export function extractMagmaSkullSprites(
  img: HTMLImageElement
): HTMLCanvasElement[] {
  if (cachedSkullSprites) return cachedSkullSprites;

  const w = img.naturalWidth;
  const h = img.naturalHeight;
  const tmp = document.createElement('canvas');
  tmp.width = w;
  tmp.height = h;
  const tctx = tmp.getContext('2d');
  if (!tctx || w === 0 || h === 0) return [];

  tctx.drawImage(img, 0, 0);
  const fullData = tctx.getImageData(0, 0, w, h);
  const d = fullData.data;
  const hasAlphaBg =
    d[3] < 16 &&
    d[(w - 1) * 4 + 3] < 16 &&
    d[((h - 1) * w) * 4 + 3] < 16 &&
    d[(w * h - 1) * 4 + 3] < 16;

  const isForeground = (x: number, y: number): boolean => {
    const idx = (y * w + x) * 4;
    if (hasAlphaBg) return d[idx + 3] > 20;
    return d[idx] < 240 || d[idx + 1] < 240 || d[idx + 2] < 240;
  };

  // Find horizontal split between the 2 rows
  const yLo = Math.floor(h * 0.38);
  const yHi = Math.floor(h * 0.62);
  let midY = Math.floor(h * 0.5);
  let minRowFg = Infinity;
  for (let y = yLo; y <= yHi; y++) {
    let count = 0;
    for (let x = 0; x < w; x += 2) {
      if (isForeground(x, y)) count++;
    }
    if (count < minRowFg) {
      minRowFg = count;
      midY = y;
    }
  }

  const rowBounds: [number, number][] = [
    [0, midY],
    [midY, h],
  ];

  const sprites: HTMLCanvasElement[] = [];

  for (const [ry0, ry1] of rowBounds) {
    const colSplits = [0];
    for (let k = 1; k < 5; k++) {
      const approx = Math.floor((w * k) / 5);
      const xLo = Math.max(0, approx - Math.floor(w * 0.06));
      const xHi = Math.min(w - 1, approx + Math.floor(w * 0.06));
      let bestX = approx;
      let minColFg = Infinity;
      for (let x = xLo; x <= xHi; x++) {
        let count = 0;
        for (let y = ry0; y < ry1; y += 2) {
          if (isForeground(x, y)) count++;
        }
        if (count < minColFg) {
          minColFg = count;
          bestX = x;
        }
      }
      colSplits.push(bestX);
    }
    colSplits.push(w);

    for (let c = 0; c < 5; c++) {
      const cx0 = colSplits[c];
      const cx1 = colSplits[c + 1];

      let bx0 = cx1;
      let bx1 = cx0;
      let by0 = ry1;
      let by1 = ry0;

      for (let y = ry0; y < ry1; y++) {
        for (let x = cx0; x < cx1; x++) {
          if (isForeground(x, y)) {
            if (x < bx0) bx0 = x;
            if (x >= bx1) bx1 = x + 1;
            if (y < by0) by0 = y;
            if (y >= by1) by1 = y + 1;
          }
        }
      }

      if (bx1 <= bx0 || by1 <= by0) {
        bx0 = cx0;
        bx1 = cx1;
        by0 = ry0;
        by1 = ry1;
      }

      const pad = 2;
      const fx0 = Math.max(0, bx0 - pad);
      const fy0 = Math.max(0, by0 - pad);
      const fx1 = Math.min(w, bx1 + pad);
      const fy1 = Math.min(h, by1 + pad);
      const sw = Math.max(1, fx1 - fx0);
      const sh = Math.max(1, fy1 - fy0);

      const cellCanvas = document.createElement('canvas');
      cellCanvas.width = sw;
      cellCanvas.height = sh;
      const cctx = cellCanvas.getContext('2d');
      if (cctx) {
        const cellData = tctx.getImageData(fx0, fy0, sw, sh);
        if (!hasAlphaBg) {
          stripBackgroundFloodFill(cellData);
        }
        cctx.putImageData(cellData, 0, 0);
      }
      sprites.push(cellCanvas);
    }
  }

  cachedSkullSprites = sprites;
  return sprites;
}

export function loadMagmaSkullSprites(): Promise<HTMLCanvasElement[]> {
  if (cachedSkullSprites) return Promise.resolve(cachedSkullSprites);
  if (skullSpritesPromise) return skullSpritesPromise;

  skullSpritesPromise = new Promise((resolve) => {
    const img = new Image();
    img.src = MAGMA_SKULL_SHEET_SRC;
    img.onload = () => {
      resolve(extractMagmaSkullSprites(img));
    };
    img.onerror = () => {
      resolve([]);
    };
  });

  return skullSpritesPromise;
}

interface RealisticFishThumbProps {
  fishId: number;
  alt: string;
  variantIndex?: number;
  className?: string;
  square?: boolean;
}

export const RealisticFishThumb: React.FC<RealisticFishThumbProps> = React.memo(({
  fishId,
  alt,
  variantIndex = 0,
  className = 'w-16 h-10 object-contain shrink-0 drop-shadow-[0_2px_4px_rgba(2,6,23,0.45)]',
  square = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const src = CUSTOM_FISH_IMAGES[fishId];

  useEffect(() => {
    if (!src) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let cancelled = false;

    const drawSource = (source: HTMLCanvasElement) => {
      if (cancelled) return;
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);
      ctx.save();
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      const pad = 10;
      const availW = Math.max(1, w - pad * 2);
      const availH = Math.max(1, h - pad * 2);
      const scale = Math.min(availW / source.width, availH / source.height);
      const dw = Math.max(1, Math.round(source.width * scale));
      const dh = Math.max(1, Math.round(source.height * scale));
      const dx = Math.floor((w - dw) / 2);
      const dy = Math.floor((h - dh) / 2);
      ctx.shadowColor = 'rgba(2, 6, 23, 0.42)';
      ctx.shadowBlur = 4;
      ctx.shadowOffsetY = 1;
      ctx.drawImage(source, dx, dy, dw, dh);
      ctx.restore();
    };

    if (fishId === 103) {
      loadMagmaSkullSprites().then((sprites) => {
        if (!cancelled && sprites.length > 0) {
          drawSource(sprites[variantIndex % sprites.length]);
        }
      });
    } else {
      loadCleanFishCanvas(fishId).then((cleanCanvas) => {
        if (!cancelled && cleanCanvas) {
          drawSource(cleanCanvas);
        }
      });
    }

    return () => {
      cancelled = true;
    };
  }, [src, fishId, variantIndex]);

  if (!src) return null;

  return (
    <canvas
      ref={canvasRef}
      width={square ? 224 : 320}
      height={square ? 224 : 200}
      aria-label={alt}
      className={className}
    />
  );
});

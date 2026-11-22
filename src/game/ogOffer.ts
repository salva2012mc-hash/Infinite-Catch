import { Language } from './i18n';

export const OG_OFFER_START_ISO = '2026-11-20T14:30:00-08:00';
export const OG_OFFER_END_ISO = '2026-11-25T14:30:00-08:00';
export const OG_OFFER_DURATION_DAYS = 5;
export const OG_OFFER_DURATION_MS = OG_OFFER_DURATION_DAYS * 24 * 60 * 60 * 1000;
export const OG_OFFER_START_MS = Date.parse(OG_OFFER_START_ISO);
export const OG_OFFER_END_MS = OG_OFFER_START_MS + OG_OFFER_DURATION_MS;

export function isOgOfferActive(nowMs: number = Date.now()): boolean {
  return Number.isFinite(nowMs) && nowMs < OG_OFFER_END_MS;
}

export function getOgOfferRemainingMs(nowMs: number = Date.now()): number {
  if (!Number.isFinite(nowMs)) return 0;
  return Math.max(0, OG_OFFER_END_MS - nowMs);
}

export function formatOgOfferRemaining(nowMs: number = Date.now(), lang: Language = 'es'): string {
  const remainingMs = getOgOfferRemainingMs(nowMs);
  if (remainingMs <= 0) {
    return lang === 'en' ? 'Offer expired' : 'Oferta expirada';
  }

  const totalSeconds = Math.ceil(remainingMs / 1000);
  const days = Math.floor(totalSeconds / 86_400);
  const hours = Math.floor((totalSeconds % 86_400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (days >= 1) {
    return `${days}d ${hours}h ${String(minutes).padStart(2, '0')}m`;
  }
  if (hours >= 1) {
    return `${hours}h ${String(minutes).padStart(2, '0')}m ${String(seconds).padStart(2, '0')}s`;
  }
  if (minutes >= 1) {
    return `${minutes}m ${String(seconds).padStart(2, '0')}s`;
  }
  return `${seconds}s`;
}

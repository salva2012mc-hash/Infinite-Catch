import test from 'node:test';
import assert from 'node:assert/strict';
import {
  OG_OFFER_START_MS,
  OG_OFFER_END_MS,
  OG_OFFER_DURATION_MS,
  isOgOfferActive,
  getOgOfferRemainingMs,
  formatOgOfferRemaining,
} from './ogOffer';

test('OG rod offer lasts exactly 5 days from launch timestamp', () => {
  assert.equal(OG_OFFER_END_MS - OG_OFFER_START_MS, OG_OFFER_DURATION_MS);
  assert.equal(OG_OFFER_DURATION_MS, 5 * 24 * 60 * 60 * 1000);
  assert.equal(OG_OFFER_END_MS, 1795645800000);
});

test('isOgOfferActive returns true before deadline and false at or after deadline', () => {
  assert.equal(isOgOfferActive(OG_OFFER_START_MS), true);
  assert.equal(isOgOfferActive(OG_OFFER_END_MS - 1), true);
  assert.equal(isOgOfferActive(OG_OFFER_END_MS), false);
  assert.equal(isOgOfferActive(OG_OFFER_END_MS + 60_000), false);
});

test('formatOgOfferRemaining formats remaining days, hours, minutes, seconds, and expired state', () => {
  assert.equal(formatOgOfferRemaining(OG_OFFER_START_MS), '5d 0h 00m');
  assert.equal(formatOgOfferRemaining(OG_OFFER_END_MS - (2 * 3600 + 5 * 60 + 9) * 1000), '2h 05m 09s');
  assert.equal(formatOgOfferRemaining(OG_OFFER_END_MS - 95_000), '1m 35s');
  assert.equal(formatOgOfferRemaining(OG_OFFER_END_MS - 12_000), '12s');
  assert.equal(getOgOfferRemainingMs(OG_OFFER_END_MS), 0);
  assert.equal(formatOgOfferRemaining(OG_OFFER_END_MS), 'Oferta expirada');
});

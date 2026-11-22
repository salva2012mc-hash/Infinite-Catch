import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseDurationToMs,
  parseAdminCommand,
  formatLuckTimeRemaining,
} from './adminCommands';

test('parseDurationToMs parses minutes, hours, days, seconds and max', () => {
  assert.equal(parseDurationToMs('30m')?.ms, 30 * 60 * 1000);
  assert.equal(parseDurationToMs('1h')?.ms, 60 * 60 * 1000);
  assert.equal(parseDurationToMs('24h')?.ms, 24 * 60 * 60 * 1000);
  assert.equal(parseDurationToMs('7d')?.ms, 7 * 24 * 60 * 60 * 1000);
  assert.equal(parseDurationToMs('90s')?.ms, 90 * 1000);
  assert.equal(parseDurationToMs('15')?.ms, 15 * 60 * 1000); // defaults to minutes
  assert.equal(parseDurationToMs('max')?.ms, 999 * 24 * 60 * 60 * 1000);
  assert.equal(parseDurationToMs('infinito')?.ms, 999 * 24 * 60 * 60 * 1000);
  assert.equal(parseDurationToMs('invalid'), null);
});

test('parseAdminCommand parses /suerte with multiplier and duration', () => {
  const r1 = parseAdminCommand('/suerte 10 30m');
  assert.equal(r1.success, true);
  assert.equal(r1.multiplier, 10);
  assert.equal(r1.durationMs, 30 * 60 * 1000);

  const r2 = parseAdminCommand('/suerte x50 1h');
  assert.equal(r2.success, true);
  assert.equal(r2.multiplier, 50);
  assert.equal(r2.durationMs, 60 * 60 * 1000);

  const r3 = parseAdminCommand('/luck 100 max');
  assert.equal(r3.success, true);
  assert.equal(r3.multiplier, 100);
  assert.ok(r3.durationMs! > 365 * 24 * 60 * 60 * 1000);

  const r4 = parseAdminCommand('/suerte reset');
  assert.equal(r4.success, true);
  assert.equal(r4.isReset, true);
  assert.equal(r4.multiplier, 1);

  const r5 = parseAdminCommand('/suerte 0');
  assert.equal(r5.success, true);
  assert.equal(r5.isReset, true);

  const rHelp = parseAdminCommand('/ayuda');
  assert.equal(rHelp.success, true);
  assert.ok(rHelp.message.includes('/suerte'));
});

test('formatLuckTimeRemaining formats seconds, minutes, hours and days', () => {
  assert.equal(formatLuckTimeRemaining(45), '0:45');
  assert.equal(formatLuckTimeRemaining(130), '2:10');
  assert.equal(formatLuckTimeRemaining(3665), '1h 1m');
  assert.equal(formatLuckTimeRemaining(90000), '1d 1h');
});

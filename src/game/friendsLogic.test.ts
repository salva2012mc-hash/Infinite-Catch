import test from 'node:test';
import assert from 'node:assert/strict';
import {
  validateFriendUsername,
  validatePlayerName,
  sanitizePlayerNameWithFallback,
  sanitizePlayerGender,
  getDefaultPlayerName,
  generateDeterministicFriend,
  calculateBestFriendScore,
  formatLongTime,
  sanitizeEquippedCosmetics,
} from './friendsLogic';
import { COSMETICS_CATALOG } from './pokemonData';

test('validates normal friend usernames accurately', () => {
  assert.equal(validateFriendUsername('Carlos').valid, true);
  assert.equal(validateFriendUsername('María José').valid, true);
  assert.equal(validateFriendUsername('Pescador_99').valid, true);
  assert.equal(validateFriendUsername('Nico-Fishing').valid, true);
});

test('rejects profanities and offensive names', () => {
  assert.equal(validateFriendUsername('puta').valid, false);
  assert.equal(validateFriendUsername('mierda_pro').valid, false);
  assert.equal(validateFriendUsername('cabron').valid, false);
  assert.equal(validateFriendUsername('pendejo99').valid, false);
  assert.equal(validateFriendUsername('asshole').valid, false);
});

test('rejects usernames with invalid length or characters', () => {
  assert.equal(validateFriendUsername('a').valid, false); // too short
  assert.equal(validateFriendUsername('123456789012345678901').valid, false); // too long
  assert.equal(validateFriendUsername('12345').valid, false); // no letters
  assert.equal(validateFriendUsername('***###').valid, false); // special characters
});

test('validatePlayerName and sanitizePlayerNameWithFallback enforce clean names and fallback', () => {
  assert.equal(validatePlayerName('  Ana   Mar ', 'es').cleanName, 'Ana Mar');
  assert.equal(validatePlayerName('Lu', 'en').valid, true);
  assert.equal(validatePlayerName('A', 'es').valid, false);
  assert.equal(validatePlayerName('p.u.t.a', 'es').valid, false);
  assert.equal(validatePlayerName('f u c k', 'en').valid, false);
  assert.equal(validatePlayerName('c4br0n', 'es').valid, false);
  assert.equal(validatePlayerName('99999', 'en').valid, false);

  assert.equal(sanitizePlayerNameWithFallback('puta', 'female', 'es'), 'Pescadora');
  assert.equal(sanitizePlayerNameWithFallback('asshole', 'male', 'en'), 'Angler');
  assert.equal(sanitizePlayerNameWithFallback('   Lucía  ', 'female', 'es'), 'Lucía');
  assert.equal(sanitizePlayerGender('female'), 'female');
  assert.equal(sanitizePlayerGender('other'), 'male');
  assert.equal(getDefaultPlayerName('female', 'es'), 'Pescadora');
  assert.equal(getDefaultPlayerName('male', 'es'), 'Pescador');
});

test('generateDeterministicFriend generates consistent stats, profile metrics, skin, and valid avatar', () => {
  const validIds = new Set(COSMETICS_CATALOG.map((c) => c.id));
  const f1 = generateDeterministicFriend('Mateo');
  const f2 = generateDeterministicFriend('Mateo');
  assert.equal(f1.username, 'Mateo');
  assert.equal(f1.avatar, f2.avatar);
  assert.equal(f1.catches, f2.catches);
  assert.equal(f1.money, f2.money);
  assert.equal(f1.bestFishId, f2.bestFishId);
  assert.equal(f1.discoveredCount, f2.discoveredCount);
  assert.deepEqual(f1.equippedCosmetics, f2.equippedCosmetics);
  assert.ok(Array.isArray(f1.equippedCosmetics) && f1.equippedCosmetics.length > 0);
  for (const cid of f1.equippedCosmetics ?? []) {
    assert.ok(validIds.has(cid), `Unexpected cosmetic id: ${cid}`);
  }
  assert.ok(f1.money > 0);
  assert.ok(f1.catches > 0);
  assert.ok(f1.timeSeconds > 0);
  assert.ok((f1.bestFishId ?? 0) > 0);
  assert.ok((f1.discoveredCount ?? 0) > 0);
});

test('sanitizeEquippedCosmetics keeps valid unique cosmetic IDs up to 50 and strips invalid values', () => {
  const cleaned = sanitizeEquippedCosmetics([
    'suit_wizard',
    'invalid_item',
    'suit_wizard',
    42,
    'rod_og',
    'shirt_blue',
  ]);
  assert.deepEqual(cleaned, ['suit_wizard', 'rod_og', 'shirt_blue']);
  assert.deepEqual(sanitizeEquippedCosmetics('not-an-array'), []);
});

test('calculateBestFriendScore ranks favorite friend above higher base stats', () => {
  const regularFriend = {
    username: 'ProFisher',
    avatar: '🎣',
    catches: 800,
    money: 100000,
    timeSeconds: 50000,
    isFavorite: false,
  };

  const favoriteFriend = {
    username: 'Bestie',
    avatar: '🌟',
    catches: 50,
    money: 2000,
    timeSeconds: 1500,
    isFavorite: true,
  };

  assert.ok(
    calculateBestFriendScore(favoriteFriend) > calculateBestFriendScore(regularFriend)
  );
});

test('formatLongTime formats hours and minutes properly', () => {
  assert.equal(formatLongTime(45), '0m 45s');
  assert.equal(formatLongTime(125), '2m 5s');
  assert.equal(formatLongTime(3670), '1h 1m');
  assert.equal(formatLongTime(7300), '2h 1m');
});

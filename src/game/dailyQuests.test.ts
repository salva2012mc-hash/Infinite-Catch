import test from 'node:test';
import assert from 'node:assert/strict';
import {
  HARD_QUEST_LUCK_DURATION_MS,
  HARD_QUEST_LUCK_MULTIPLIER,
  applyCatchToDailyQuests,
  applyCoinsToDailyQuests,
  applyPlayTimeToDailyQuests,
  claimDailyQuestReward,
  createDailyQuestsForDate,
  ensureDailyQuestsCurrent,
  formatQuestProgressLabel,
  getDailyDateKey,
} from './dailyQuests';

test('createDailyQuestsForDate provides coin quests and a hard quest with 3m x2 luck reward', () => {
  const day0 = createDailyQuestsForDate('2026-11-17');
  assert.equal(day0.quests.length, 3);
  const easy = day0.quests.find((q) => q.difficulty === 'easy');
  const medium = day0.quests.find((q) => q.difficulty === 'medium');
  const hard = day0.quests.find((q) => q.difficulty === 'hard');

  assert.ok(easy && easy.rewardCoins >= 400);
  assert.ok(medium && medium.rewardCoins >= 1000);
  assert.ok(hard);
  assert.equal(hard.metric, 'catch_epic_plus');
  assert.equal(hard.target, 15);
  assert.equal(hard.rewardLuckMultiplier, HARD_QUEST_LUCK_MULTIPLIER);
  assert.equal(hard.rewardLuckDurationMs, 3 * 60 * 1000);
  assert.equal(HARD_QUEST_LUCK_DURATION_MS, 180_000);

  // Day 1 rotates hard quest to 30 minutes active play
  const day1 = createDailyQuestsForDate('2026-11-18');
  const hardDay1 = day1.quests.find((q) => q.difficulty === 'hard');
  assert.ok(hardDay1);
  assert.equal(hardDay1.metric, 'play_seconds');
  assert.equal(hardDay1.target, 1800);
  assert.equal(hardDay1.rewardLuckMultiplier, 2);
  assert.equal(hardDay1.rewardLuckDurationMs, 180_000);
});

test('daily quest progress updates on catches, coins, and active playtime and awards rewards on claim', () => {
  const now = Date.parse('2026-11-17T10:00:00');
  let state = createDailyQuestsForDate(getDailyDateKey(now));

  // Catch 5 Common fish -> completes easy quest + does not count toward rare_plus/epic_plus
  for (let i = 0; i < 5; i++) {
    state = applyCatchToDailyQuests(state, { rarity: 'Común' }, now);
  }
  const easyQuest = state.quests.find((q) => q.id === 'easy_common_5');
  assert.equal(easyQuest?.progress, 5);

  const cannotClaimHard = claimDailyQuestReward(state, 'hard_epic_15', now);
  assert.equal(cannotClaimHard.claimedQuest, null);

  const claimEasy = claimDailyQuestReward(state, 'easy_common_5', now);
  assert.ok(claimEasy.claimedQuest);
  assert.equal(claimEasy.claimedQuest.rewardCoins, 400);
  state = claimEasy.nextState;

  // Double-claim is blocked
  const doubleClaim = claimDailyQuestReward(state, 'easy_common_5', now);
  assert.equal(doubleClaim.claimedQuest, null);

  // Catch 15 Epic+ fish -> completes both Rare+ and Epic+ quests
  for (let i = 0; i < 15; i++) {
    state = applyCatchToDailyQuests(state, { rarity: i % 3 === 0 ? 'Legendaria' : 'Épica' }, now);
  }
  const hardQuest = state.quests.find((q) => q.id === 'hard_epic_15');
  assert.equal(hardQuest?.progress, 15);

  const claimHard = claimDailyQuestReward(state, 'hard_epic_15', now);
  assert.ok(claimHard.claimedQuest);
  assert.equal(claimHard.claimedQuest.rewardCoins, 3500);
  assert.equal(claimHard.claimedQuest.rewardLuckMultiplier, 2);
  assert.equal(claimHard.claimedQuest.rewardLuckDurationMs, 180_000);
});

test('play_seconds hard quest and earn_coins medium quest track and reset cleanly at midnight', () => {
  const day1Now = Date.parse('2026-11-18T10:00:00');
  let day1 = createDailyQuestsForDate(getDailyDateKey(day1Now));
  day1 = applyPlayTimeToDailyQuests(day1, 1800, day1Now);
  day1 = applyCoinsToDailyQuests(day1, 1200, day1Now);

  const playQuest = day1.quests.find((q) => q.id === 'hard_play_30m');
  assert.equal(playQuest?.progress, 1800);
  assert.equal(formatQuestProgressLabel(playQuest!, 'en'), '30:00 / 30:00');

  const coinQuest = day1.quests.find((q) => q.id === 'med_earn_1000');
  assert.equal(coinQuest?.progress, 1000);

  // Advancing to next day generates fresh quests
  const day2Now = Date.parse('2026-11-19T00:05:00');
  const rolledOver = ensureDailyQuestsCurrent(day1, day2Now);
  assert.equal(rolledOver.dateKey, getDailyDateKey(day2Now));
  assert.ok(rolledOver.quests.every((q) => q.progress === 0 && !q.claimed));
});

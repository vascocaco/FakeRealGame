const assert = require('assert');
const { calculateAnswerScore } = require('../server.js');

const startedAt = 1_000;
const answeredAt = 1_500;

assert.deepStrictEqual(
  calculateAnswerScore({ correct: true, usedHelper: false, startedAt, answeredAt }),
  { earned: 100, speedBonus: 50, total: 150 },
  'correct fast answers without helpers should receive base points and speed bonus'
);

assert.deepStrictEqual(
  calculateAnswerScore({ correct: true, usedHelper: true, startedAt, answeredAt }),
  { earned: 100, speedBonus: 0, total: 100 },
  'correct answers after using a helper should receive only base points'
);

assert.deepStrictEqual(
  calculateAnswerScore({ correct: false, usedHelper: true, startedAt, answeredAt }),
  { earned: 0, speedBonus: 0, total: 0 },
  'incorrect answers should not receive points even if a helper was used'
);

console.log('scoring tests passed');

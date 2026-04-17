const test = require('node:test');
const assert = require('node:assert/strict');
const { scoreTask } = require('../tools/utils/fuzzyTaskSearch');

test('scoreTask handles typos and word reordering', () => {
  const typo = scoreTask({ title: 'Gym Workout' }, 'jym');
  assert.ok(typo.score >= 50);

  const reordered = scoreTask({ title: 'Call the dentist' }, 'dentist call');
  assert.ok(reordered.score >= 80);
});

const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeDueAt } = require('../tools/utils/dateTime');

test('normalizeDueAt handles vague time phrases', () => {
  const meta = {
    localDate: '2026-04-12',
    localTimeString: '10:00:00 AM'
  };

  const tomorrowMorning = normalizeDueAt('tomorrow morning', meta);
  assert.equal(tomorrowMorning.dueAt, '2026-04-13T09:00:00');
  assert.equal(tomorrowMorning.hasTime, true);

  const later = normalizeDueAt('later', meta);
  assert.equal(later.dueAt, '2026-04-12T18:00:00');
  assert.equal(later.hasTime, true);

  const dateOnly = normalizeDueAt('2026-04-18', meta);
  assert.equal(dateOnly.dueAt, '2026-04-18T00:00:00');
  assert.equal(dateOnly.hasTime, false);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { registrationDays, registrationOpen } from '../src/lib/recruitment/summary-period.ts';
import { refreshAdminOnce, ADMIN_REFRESH_RELEASE } from '../src/scripts/admin-refresh.ts';

const opensAt = '2026-10-02T21:00:00.000Z';
const closesAt = '2026-10-11T05:00:00.000Z';
const now = Date.parse('2026-10-12T12:00:00Z');

test('Lima midnight closure excludes the deadline day and all later empty days', () => {
  const days = registrationDays(opensAt, closesAt, ['2026-10-11T04:59:59Z'], now);
  assert.equal(days.length, 9);
  assert.equal(days[0], '2026-10-02');
  assert.equal(days.at(-1), '2026-10-10');
});
test('daytime deadlines, extensions and open calls retain valid registration days', () => {
  assert.equal(registrationDays(opensAt, '2026-10-11T05:01:00Z', [], now).at(-1), '2026-10-11');
  assert.equal(registrationDays(opensAt, '2026-10-14T05:00:00Z', [], now).at(-1), '2026-10-12');
  assert.equal(registrationDays(opensAt, null, [], now).at(-1), '2026-10-12');
  assert.deepEqual(registrationDays('2026-10-15T05:00:00Z', null, [], now), []);
});
test('in-progress visibility reacts at the deadline, opening, extension and manual disable', () => {
  const period = { enabled: true, opensAt, closesAt };
  assert.equal(registrationOpen(period, Date.parse(closesAt) - 1), true);
  assert.equal(registrationOpen(period, Date.parse(closesAt)), false);
  assert.equal(registrationOpen(period, now), false);
  assert.equal(registrationOpen({ ...period, closesAt: '2026-10-14T05:00:00Z' }, now), true);
  assert.equal(registrationOpen({ ...period, closesAt: null, enabled: false }, now), false);
  assert.equal(registrationOpen(period, Date.parse(opensAt) - 1), false);
});

test('one-off refresh preserves authentication and return parameters and never loops', () => {
  const values = new Map([['admin_token', 'existing-session']]);
  const replacements = [];
  const browser = {
    location: { href: 'https://www.ccunicode.org/admin?volver=gth', replace: url => replacements.push(url) },
    localStorage: { getItem: key => values.get(key), setItem: (key, value) => values.set(key, value) },
  };
  assert.equal(refreshAdminOnce(browser), true);
  assert.equal(values.get('admin_token'), 'existing-session');
  const url = new URL(replacements[0]);
  assert.equal(url.searchParams.get('volver'), 'gth');
  assert.equal(url.searchParams.get('panel_update'), ADMIN_REFRESH_RELEASE);
  assert.equal(refreshAdminOnce(browser), false);
  browser.location.href = url.href;
  values.clear();
  assert.equal(refreshAdminOnce(browser), false);
  assert.equal(replacements.length, 1);
});
test('blocked browser storage skips refresh without breaking sign-in', () => {
  assert.equal(refreshAdminOnce({ location: { href: 'https://www.ccunicode.org/admin', replace: () => assert.fail('Must not reload') }, localStorage: { getItem: () => { throw new Error('blocked'); } } }), false);
});

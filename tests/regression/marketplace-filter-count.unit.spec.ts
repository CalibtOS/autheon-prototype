import { test, expect } from './support/fixtures/prototype-test.ts';
import { gotoPrototype } from './support/helpers/stable-page.ts';
import { getPrototypeFrame } from './support/helpers/selectors.ts';

/**
 * Unit tests for the canonical applied-filter count selector.
 *
 * The repository has no JS unit-test runner (no bundler, no Jest/Vitest — the
 * prototype is static React + Babel-standalone over CDN scripts). The selector
 * is a pure function exported on `window` by driver.jsx, so these tests drive
 * it directly inside the page context. No DOM, no rendering, no store — this
 * is a pure-function test suite that happens to execute in a browser realm.
 *
 * Contract under test:
 *   getAppliedMarketplaceFilterCount(committedFilters) -> number
 * counting only filters that actually restrict the Marketplace result set.
 *
 * Keys match FilterSheet + jobMatchesDriverFilters: vehicleType / transportType
 * (not the retired vehicle / axle aliases).
 */

type FilterCase = { name: string; filters: unknown; expected: number };

/** Evaluate the selector for a batch of cases in one round-trip. */
async function countAll(
  page: import('@playwright/test').Page,
  cases: FilterCase[],
): Promise<Record<string, number>> {
  const frame = await getPrototypeFrame(page);
  return frame.evaluate((rows) => {
    const fn = (window as never as {
      getAppliedMarketplaceFilterCount: (f: unknown) => number;
    }).getAppliedMarketplaceFilterCount;
    if (typeof fn !== 'function') {
      throw new Error('getAppliedMarketplaceFilterCount is not exported on window');
    }
    const out: Record<string, number> = {};
    for (const row of rows as FilterCase[]) out[row.name] = fn(row.filters);
    return out;
  }, cases);
}

async function expectCounts(
  page: import('@playwright/test').Page,
  cases: FilterCase[],
): Promise<void> {
  const actual = await countAll(page, cases);
  const expected = Object.fromEntries(cases.map((c) => [c.name, c.expected]));
  expect(actual).toEqual(expected);
}

test.describe('getAppliedMarketplaceFilterCount (pure selector)', () => {
  test.beforeEach(async ({ page }) => {
    await gotoPrototype(page);
  });

  test('returns 0 for empty, missing and non-restrictive input', async ({ page }) => {
    await expectCounts(page, [
      { name: 'empty object', filters: {}, expected: 0 },
      { name: 'undefined', filters: undefined, expected: 0 },
      { name: 'null', filters: null, expected: 0 },
      { name: 'empty strings', filters: { startPlz: '', endPlz: '', from: '', to: '' }, expected: 0 },
      { name: 'nulls', filters: { startPlz: null, endPlz: null, from: null, to: null }, expected: 0 },
      {
        name: 'undefined values',
        filters: {
          startPlz: undefined,
          vehicleType: undefined,
          transportType: undefined,
        },
        expected: 0,
      },
      { name: 'whitespace only', filters: { startPlz: '   ', endPlz: '\t' }, expected: 0 },
    ]);
  });

  test('ignores default single-select values that do not restrict results', async ({ page }) => {
    await expectCounts(page, [
      { name: 'vehicleType All', filters: { vehicleType: 'All' }, expected: 0 },
      { name: 'transportType All', filters: { transportType: 'All' }, expected: 0 },
      {
        name: 'both All',
        filters: { vehicleType: 'All', transportType: 'All' },
        expected: 0,
      },
      {
        name: 'All alongside a real filter',
        filters: { vehicleType: 'All', transportType: 'All', startPlz: '80' },
        expected: 1,
      },
    ]);
  });

  test('counts active single-select values', async ({ page }) => {
    await expectCounts(page, [
      {
        name: 'vehicleType passenger_car',
        filters: { vehicleType: 'passenger_car' },
        expected: 1,
      },
      {
        name: 'vehicleType truck_up_to_7_5_t',
        filters: { vehicleType: 'truck_up_to_7_5_t' },
        expected: 1,
      },
      {
        name: 'transportType own_axle',
        filters: { transportType: 'own_axle' },
        expected: 1,
      },
      {
        name: 'transportType third_party_axle',
        filters: { transportType: 'third_party_axle' },
        expected: 1,
      },
      {
        name: 'vehicleType + transportType',
        filters: { vehicleType: 'passenger_car', transportType: 'own_axle' },
        expected: 2,
      },
    ]);
  });

  test('ignores retired vehicle / axle aliases so they cannot inflate the count', async ({
    page,
  }) => {
    await expectCounts(page, [
      { name: 'legacy vehicle only', filters: { vehicle: 'SUV' }, expected: 0 },
      { name: 'legacy axle only', filters: { axle: 'Own axle' }, expected: 0 },
      {
        name: 'legacy alongside real',
        filters: { vehicle: 'SUV', axle: 'Own axle', startPlz: '80' },
        expected: 1,
      },
    ]);
  });

  test('counts active text (postal area) filters', async ({ page }) => {
    await expectCounts(page, [
      { name: 'start only', filters: { startPlz: '80' }, expected: 1 },
      { name: 'end only', filters: { endPlz: '10' }, expected: 1 },
      { name: 'both', filters: { startPlz: '80', endPlz: '10' }, expected: 2 },
      {
        name: 'multi-select start areas',
        filters: { startPlz: ['51', '52', '80'] },
        expected: 3,
      },
      {
        name: 'legacy string still counts as one area',
        filters: { startPlz: '80' },
        expected: 1,
      },
    ]);
  });

  test('counts each bound of a date range separately, ignoring empty bounds', async ({ page }) => {
    // Existing Marketplace semantics: `from` and `to` are two independently
    // removable chips, so each active bound contributes 1.
    await expectCounts(page, [
      { name: 'from only', filters: { from: '2026-05-01' }, expected: 1 },
      { name: 'to only', filters: { to: '2026-05-30' }, expected: 1 },
      { name: 'both bounds', filters: { from: '2026-05-01', to: '2026-05-30' }, expected: 2 },
      { name: 'from set, to empty', filters: { from: '2026-05-01', to: '' }, expected: 1 },
      { name: 'both empty', filters: { from: '', to: '' }, expected: 0 },
      { name: 'date preset', filters: { from: 'Today' }, expected: 1 },
    ]);
  });

  test('excludes sort state', async ({ page }) => {
    await expectCounts(page, [
      { name: 'sort only', filters: { sortBy: 'date_desc' }, expected: 0 },
      { name: 'sort alt key', filters: { sort: 'price_asc' }, expected: 0 },
      {
        name: 'sort alongside one filter',
        filters: { sortBy: 'price_asc', vehicleType: 'passenger_car' },
        expected: 1,
      },
    ]);
  });

  test('excludes search state (search is not a Marketplace filter)', async ({ page }) => {
    // The Marketplace has no search field (search exists only on My Orders) and
    // no confirmed requirement classifies search as a filter.
    await expectCounts(page, [
      { name: 'search only', filters: { search: 'Bremen' }, expected: 0 },
      { name: 'query only', filters: { query: 'Bremen' }, expected: 0 },
      {
        name: 'search alongside one filter',
        filters: { search: 'Bremen', transportType: 'own_axle' },
        expected: 1,
      },
    ]);
  });

  test('ignores unknown keys so nothing can leak into the count', async ({ page }) => {
    await expectCounts(page, [
      { name: 'unknown only', filters: { bogus: 'yes', anything: 1 }, expected: 0 },
      {
        name: 'unknown + real',
        filters: { bogus: 'yes', vehicleType: 'passenger_car' },
        expected: 1,
      },
    ]);
  });

  test('counts each filter key at most once', async ({ page }) => {
    await expectCounts(page, [
      { name: 'same value repeated across keys', filters: { startPlz: '80', endPlz: '80' }, expected: 2 },
      {
        name: 'full set is 6, not more',
        filters: {
          startPlz: '80',
          endPlz: '10',
          from: '2026-05-01',
          to: '2026-05-30',
          vehicleType: 'passenger_car',
          transportType: 'own_axle',
        },
        expected: 6,
      },
    ]);
  });

  test('returns 0 after clearing every filter', async ({ page }) => {
    await expectCounts(page, [
      {
        name: 'cleared shape (what FilterSheet reset produces)',
        filters: {
          startPlz: [],
          endPlz: [],
          from: '',
          to: '',
          vehicleType: 'All',
          transportType: 'All',
        },
        expected: 0,
      },
    ]);
  });

  test('is pure — repeated calls do not mutate the input or drift', async ({ page }) => {
    const frame = await getPrototypeFrame(page);
    const result = await frame.evaluate(() => {
      const fn = (window as never as {
        getAppliedMarketplaceFilterCount: (f: unknown) => number;
      }).getAppliedMarketplaceFilterCount;
      const input = {
        startPlz: '80',
        vehicleType: 'passenger_car',
        transportType: 'All',
      };
      const snapshot = JSON.stringify(input);
      const counts = [fn(input), fn(input), fn(input)];
      return { counts, mutated: JSON.stringify(input) !== snapshot };
    });
    expect(result.counts).toEqual([2, 2, 2]);
    expect(result.mutated).toBe(false);
  });

  test('chip list and count come from the same derivation', async ({ page }) => {
    // Guards against the badge and the chip row ever disagreeing.
    const frame = await getPrototypeFrame(page);
    const result = await frame.evaluate(() => {
      const w = window as never as {
        getAppliedMarketplaceFilters: (f: unknown, t?: unknown) => unknown[];
        getAppliedMarketplaceFilterCount: (f: unknown) => number;
      };
      const samples: unknown[] = [
        {},
        { startPlz: '80' },
        { startPlz: '80', vehicleType: 'passenger_car' },
        {
          startPlz: '80',
          endPlz: '10',
          from: '2026-05-01',
          to: '2026-05-30',
          vehicleType: 'passenger_car',
          transportType: 'own_axle',
        },
        { vehicleType: 'All', transportType: 'All' },
      ];
      return samples.map((s) => ({
        chips: w.getAppliedMarketplaceFilters(s).length,
        count: w.getAppliedMarketplaceFilterCount(s),
      }));
    });
    for (const row of result) expect(row.chips).toBe(row.count);
    expect(result.map((r) => r.count)).toEqual([0, 1, 2, 6, 0]);
  });
});

test.describe('jobMatchesDriverFilters date presets (audit item 43)', () => {
  test.beforeEach(async ({ page }) => {
    await gotoPrototype(page);
  });

  test('This week matches Mon–Sun containing fixture today 05.05.2026', async ({ page }) => {
    // Fixture today = Tue 05.05.2026 → week Mon 04.05. – Sun 10.05.
    const frame = await getPrototypeFrame(page);
    const result = await frame.evaluate(() => {
      const fn = (window as never as {
        jobMatchesDriverFilters: (
          job: { date: string; startPlz?: string; endPlz?: string },
          filters: Record<string, string>,
        ) => boolean;
      }).jobMatchesDriverFilters;
      if (typeof fn !== 'function') {
        throw new Error('jobMatchesDriverFilters is not exported on window');
      }
      const base = { startPlz: '80', endPlz: '10' };
      const filters = { from: 'This week' };
      return {
        monday: fn({ ...base, date: '04.05.' }, filters),
        fixtureToday: fn({ ...base, date: '05.05.' }, filters),
        friday: fn({ ...base, date: '08.05.' }, filters),
        sunday: fn({ ...base, date: '10.05.' }, filters),
        nextMonday: fn({ ...base, date: '11.05.' }, filters),
        priorSunday: fn({ ...base, date: '03.05.' }, filters),
        aprilJob: fn({ ...base, date: '28.04.' }, filters),
        todayOnly: fn({ ...base, date: '05.05.' }, { from: 'Today' }),
        todayMiss: fn({ ...base, date: '08.05.' }, { from: 'Today' }),
      };
    });
    expect(result).toEqual({
      monday: true,
      fixtureToday: true,
      friday: true,
      sunday: true,
      nextMonday: false,
      priorSunday: false,
      aprilJob: false,
      todayOnly: true,
      todayMiss: false,
    });
  });
});

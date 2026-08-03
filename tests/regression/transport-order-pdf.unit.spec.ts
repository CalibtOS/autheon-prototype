import { test, expect } from './support/fixtures/prototype-test.ts';
import { gotoPrototype } from './support/helpers/stable-page.ts';
import { getPrototypeFrame } from './support/helpers/selectors.ts';

/**
 * Unit tests for the transport-order document renderer
 * (`prototype/project/transport-order-pdf.js`).
 *
 * The repository has no JS unit-test runner — the prototype is static React
 * over Babel-standalone with no bundler — so, following the convention of
 * `marketplace-filter-count.unit.spec.ts`, these pure functions are driven
 * directly inside the page realm. No DOM, no store, no rendering.
 *
 * The module is deliberately German-only: the production document must not
 * follow the prototype's UI locale, so these expectations are German literals.
 */

type Doc = {
  selectTemplate: (v: unknown) => string | null;
  formatGermanDate: (v: unknown) => string;
  formatGermanTime: (v: unknown) => string;
  formatTimeWindow: (a: unknown, b: unknown) => string;
  formatEurNet: (v: unknown) => string;
  sha256Hex: (v: string) => string;
  escapeHtml: (v: unknown) => string;
  buildPayload: (input: unknown) => {
    ok: boolean;
    missing: string[];
    payload: Record<string, never> | null;
  };
  renderHtml: (payload: unknown, options?: unknown) => string;
  buildDocument: (
    input: unknown,
    options?: unknown,
  ) => { ok: boolean; missing: string[]; html?: string; checksum?: string; payload?: never };
  MANDATORY_FIELDS: string[];
};

/**
 * Runs a callback inside the prototype frame with the renderer module and a
 * deep copy of the fixture input. The callback is serialized to source, so it
 * must not close over anything in the Node scope — everything it needs arrives
 * through its two parameters.
 */
async function inDoc<T>(
  page: import('@playwright/test').Page,
  fn: (doc: Doc, input: typeof VALID_INPUT) => T,
): Promise<T> {
  const frame = await getPrototypeFrame(page);
  return frame.evaluate(
    ({ source, input }) => {
      const doc = (window as never as { AutheonTransportOrderPdf?: Doc })
        .AutheonTransportOrderPdf;
      if (!doc) throw new Error('AutheonTransportOrderPdf is not loaded');
      // eslint-disable-next-line no-new-func
      return new Function('doc', 'input', `return (${source})(doc, input);`)(
        doc,
        input,
      );
    },
    { source: fn.toString(), input: VALID_INPUT },
  ) as Promise<T>;
}

/** A complete, valid render input; individual tests override single fields. */
const VALID_INPUT = {
  job: {
    id: 'A-2026-09001',
    tour: '9001-26',
    customerName: 'Testkunde GmbH',
    vehicleType: 'passenger_car',
    manufacturer: 'Volkswagen',
    vehicleModel: 'Passat',
    plate: 'M-AB 1234',
    vin: 'WVGZZZ5NZKW123456',
    transportType: 'own_axle',
    registrationStatus: 'registered',
    driverOffer: 100,
    notesDriver: 'Ankunft 15 Minuten früher bestätigen.',
    pickup: {
      street: 'Hafenstraße',
      houseNumber: '18',
      postalCode: '50678',
      city: 'Köln',
      country: 'Deutschland',
      contactPerson: 'Sabine Krüger',
      alternateContactPerson: 'Tobias Lang',
      phone: '+49 221 5500 118',
      email: 'disposition@rk-koeln.de',
      notes: 'Schlüsselübergabe an der Rezeption.',
      date: '04.05.2026',
      windowFrom: '08:00',
      windowTo: '12:00',
    },
    delivery: {
      street: 'Landsberger Allee',
      houseNumber: '204',
      postalCode: '80339',
      city: 'München',
      country: 'Deutschland',
      contactPerson: 'Jonas Weber',
      phone: '+49 89 4400 2204',
      email: 'annahme@ah-sued.de',
      notes: 'Anlieferung nur über Tor 3.',
      date: '05.05.2026',
      windowFrom: '13:00',
      windowTo: '17:00',
    },
  },
  servicePartner: {
    company: 'Musterdrive GmbH',
    person: 'Max Mustermann',
    street: 'Mustermannstraße',
    houseNumber: '100',
    postalCode: '55555',
    city: 'Musterstadt',
    country: 'Deutschland',
  },
  admin: { initials: 'A. Bauer', phone: '+49 2173 265 1112' },
  bookedAt: '2026-05-04T09:32:00.000Z',
};

test.describe('transport-order document renderer (pure functions)', () => {
  test.beforeEach(async ({ page }) => {
    await gotoPrototype(page);
  });

  test('maps every canonical vehicle type to the approved template', async ({ page }) => {
    const result = await inDoc(page, (doc) => ({
      passenger_car: doc.selectTemplate('passenger_car'),
      truck_up_to_7_5_t: doc.selectTemplate('truck_up_to_7_5_t'),
      truck_over_7_5_t: doc.selectTemplate('truck_over_7_5_t'),
      // A translated label must never resolve a template.
      germanLabel: doc.selectTemplate('PKW'),
      englishLabel: doc.selectTemplate('Passenger car'),
      retiredType: doc.selectTemplate('transporter'),
      empty: doc.selectTemplate(''),
      nullish: doc.selectTemplate(null),
    }));

    expect(result).toEqual({
      passenger_car: 'pkw',
      // Both approved truck categories share ONE template.
      truck_up_to_7_5_t: 'lkw',
      truck_over_7_5_t: 'lkw',
      germanLabel: null,
      englishLabel: null,
      retiredType: null,
      empty: null,
      nullish: null,
    });
  });

  test('renders the exact client-defined title per template', async ({ page }) => {
    const titles = await inDoc(page, (doc, input) => {
      const build = (vehicleType: string) => {
        const data = JSON.parse(JSON.stringify(input));
        data.job.vehicleType = vehicleType;
        const r = doc.buildPayload(data);
        const p = r.payload as never as { title: { lead: string; accent: string } };
        return `${p.title.lead} ${p.title.accent}`;
      };
      return {
        pkw: build('passenger_car'),
        lkwSmall: build('truck_up_to_7_5_t'),
        lkwLarge: build('truck_over_7_5_t'),
      };
    });

    expect(titles).toEqual({
      pkw: 'FAHRAUFTRAG PKW',
      lkwSmall: 'FAHRAUFTRAG LKW',
      lkwLarge: 'FAHRAUFTRAG LKW',
    });
  });

  test('formats dates as DD.MM.YYYY in Europe/Berlin', async ({ page }) => {
    const result = await inDoc(page, (doc) => ({
      iso: doc.formatGermanDate('2026-05-04T09:32:00.000Z'),
      dotted: doc.formatGermanDate('04.05.2026'),
      dottedNoYear: doc.formatGermanDate('04.05.'),
      // 22:30 UTC on 4 May is already 5 May in Berlin (CEST, UTC+2).
      lateUtcRollsForward: doc.formatGermanDate('2026-05-04T22:30:00.000Z'),
      // 23:30 UTC on 4 January is 5 January in Berlin (CET, UTC+1).
      winterRollsForward: doc.formatGermanDate('2026-01-04T23:30:00.000Z'),
      singleDigits: doc.formatGermanDate('2026-01-02T12:00:00.000Z'),
      empty: doc.formatGermanDate(''),
      invalid: doc.formatGermanDate('not a date'),
    }));

    expect(result).toEqual({
      iso: '04.05.2026',
      dotted: '04.05.2026',
      dottedNoYear: expect.stringMatching(/^04\.05\.\d{4}$/),
      lateUtcRollsForward: '05.05.2026',
      winterRollsForward: '05.01.2026',
      // Zero-padded, never "2.1.2026".
      singleDigits: '02.01.2026',
      empty: '',
      invalid: '',
    });
  });

  test('formats times as HH:MM Uhr and survives both DST boundaries', async ({ page }) => {
    const result = await inDoc(page, (doc) => ({
      cest: doc.formatGermanTime('2026-05-04T09:32:00.000Z'),
      cet: doc.formatGermanTime('2026-01-04T09:32:00.000Z'),
      // Spring forward 2026-03-29 01:00 UTC: 02:00 CET becomes 03:00 CEST.
      justBeforeSpringForward: doc.formatGermanTime('2026-03-29T00:30:00.000Z'),
      justAfterSpringForward: doc.formatGermanTime('2026-03-29T01:30:00.000Z'),
      // Fall back 2026-10-25 01:00 UTC: 03:00 CEST becomes 02:00 CET.
      justBeforeFallBack: doc.formatGermanTime('2026-10-25T00:30:00.000Z'),
      justAfterFallBack: doc.formatGermanTime('2026-10-25T01:30:00.000Z'),
      midnight: doc.formatGermanTime('2026-05-03T22:00:00.000Z'),
      empty: doc.formatGermanTime(''),
    }));

    expect(result).toEqual({
      cest: '11:32 Uhr',
      cet: '10:32 Uhr',
      justBeforeSpringForward: '01:30 Uhr',
      justAfterSpringForward: '03:30 Uhr',
      justBeforeFallBack: '02:30 Uhr',
      justAfterFallBack: '02:30 Uhr',
      // 24-hour clock, never "12:00 AM".
      midnight: '00:00 Uhr',
      empty: '',
    });
  });

  test('formats time windows and omits absent halves', async ({ page }) => {
    const result = await inDoc(page, (doc) => ({
      both: doc.formatTimeWindow('08:00', '12:00'),
      fromOnly: doc.formatTimeWindow('08:00', ''),
      toOnly: doc.formatTimeWindow('', '12:00'),
      neither: doc.formatTimeWindow('', ''),
      padded: doc.formatTimeWindow('8:00', '9:05'),
      junk: doc.formatTimeWindow('flexible', ''),
    }));

    expect(result).toEqual({
      both: '08:00 – 12:00 Uhr',
      fromOnly: '08:00 Uhr',
      toOnly: '12:00 Uhr',
      neither: '',
      padded: '08:00 – 09:05 Uhr',
      junk: '',
    });
  });

  test('formats compensation in German with the EUR Netto suffix', async ({ page }) => {
    const result = await inDoc(page, (doc) => ({
      spec: doc.formatEurNet(100),
      cents: doc.formatEurNet(45.5),
      rounded: doc.formatEurNet(1250.505),
      thousands: doc.formatEurNet(2480.75),
      millions: doc.formatEurNet(1234567.89),
      zero: doc.formatEurNet(0),
      stringInput: doc.formatEurNet('260'),
      empty: doc.formatEurNet(''),
      nullish: doc.formatEurNet(null),
      notANumber: doc.formatEurNet('abc'),
    }));

    expect(result).toEqual({
      spec: '100,00 EUR Netto',
      cents: '45,50 EUR Netto',
      rounded: '1.250,51 EUR Netto',
      thousands: '2.480,75 EUR Netto',
      millions: '1.234.567,89 EUR Netto',
      zero: '0,00 EUR Netto',
      stringInput: '260,00 EUR Netto',
      empty: '',
      nullish: '',
      notANumber: '',
    });
  });

  test('selects exactly one registration checkbox and adds the red deregistered notice', async ({
    page,
  }) => {
    const result = await inDoc(page, (doc, input) => {
      const render = (status: string) => {
        const data = JSON.parse(JSON.stringify(input));
        data.job.registrationStatus = status;
        const built = doc.buildDocument(data);
        const html = built.html || '';
        // The selected box is the only one carrying the X path.
        const boxes = html.match(/<svg class="cb"[\s\S]*?<\/svg>/g) || [];
        return {
          ok: built.ok,
          boxes: boxes.length,
          checked: boxes.filter((b) => b.includes('M1.9 1.9')).length,
          checkedIsFirst: boxes[0]?.includes('M1.9 1.9') ?? false,
          redNotice: /class="dereg">Abgemeldet</.test(html),
        };
      };
      return {
        registered: render('registered'),
        deregistered: render('deregistered'),
        missing: doc.buildDocument(
          (() => {
            const data = JSON.parse(JSON.stringify(input));
            data.job.registrationStatus = '';
            return data;
          })(),
        ).missing,
      };
    });

    expect(result.registered).toEqual({
      ok: true,
      boxes: 2,
      checked: 1,
      checkedIsFirst: true,
      redNotice: false,
    });
    expect(result.deregistered).toEqual({
      ok: true,
      boxes: 2,
      checked: 1,
      // Zugelassen comes first in the template, so the SECOND box is marked.
      checkedIsFirst: false,
      redNotice: true,
    });
    // Registration status is mandatory: an unknown value is a hard failure,
    // never a silently unchecked pair of boxes.
    expect(result.missing).toContain('registrationStatus');
  });

  test('omits an absent optional field together with its label', async ({ page }) => {
    const result = await inDoc(page, (doc, input) => {
      const data = JSON.parse(JSON.stringify(input));
      const full = doc.buildDocument(data).html || '';
      // Strip every optional value from the pickup section.
      data.job.pickup.contactPerson = '';
      data.job.pickup.phone = '';
      data.job.pickup.email = '';
      data.job.pickup.notes = '';
      data.job.pickup.alternateContactPerson = '';
      data.job.pickup.windowFrom = '';
      data.job.pickup.windowTo = '';
      data.job.notesDriver = '';
      const bare = doc.buildDocument(data).html || '';
      const count = (h: string, needle: string) =>
        h.split(needle).length - 1;
      return {
        fullContactLabels: count(full, '>Ansprechpartner</th>'),
        bareContactLabels: count(bare, '>Ansprechpartner</th>'),
        fullPhoneLabels: count(full, 'Telefonnummer – E-Mail'),
        barePhoneLabels: count(bare, 'Telefonnummer – E-Mail'),
        fullHasTwoInfoBlocks: count(full, 'Zusatzinformation:') === 2,
        // Delivery keeps its own values, so exactly one block survives.
        bareHasDeliveryInfo: count(bare, 'Zusatzinformation:') === 1,
        // No blank cell is left behind.
        bareNoEmptyCell: !/<td[^>]*><\/td>/.test(bare),
        // The mandatory date row is still present, spanning both columns.
        bareHasDateRow: /Datum – Uhrzeit<\/th><td colspan="2">04\.05\.2026/.test(bare),
      };
    });

    expect(result).toEqual({
      // One label per section when both are populated; pickup's disappears
      // entirely — label included — once its values are gone.
      fullContactLabels: 2,
      bareContactLabels: 1,
      fullPhoneLabels: 2,
      barePhoneLabels: 1,
      // Pickup's additional-information block is gone; delivery's remains.
      fullHasTwoInfoBlocks: true,
      bareHasDeliveryInfo: true,
      bareNoEmptyCell: true,
      bareHasDateRow: true,
    });
  });

  test('rejects every missing mandatory field instead of publishing a gap', async ({ page }) => {
    const result = await inDoc(page, (doc, input) => {
      const drop = (path: string) => {
        const data = JSON.parse(JSON.stringify(input));
        const parts = path.split('.');
        let node = data as Record<string, never>;
        for (const key of parts.slice(0, -1)) node = node[key];
        (node as Record<string, string>)[parts[parts.length - 1]] = '';
        const built = doc.buildDocument(data);
        return { ok: built.ok, missing: built.missing, html: !!built.html };
      };
      return {
        mandatoryList: doc.MANDATORY_FIELDS.slice().sort(),
        tour: drop('job.tour'),
        vin: drop('job.vin'),
        offer: drop('job.driverOffer'),
        partnerCity: drop('servicePartner.city'),
        pickupStreet: drop('job.pickup.street'),
        deliveryDate: drop('job.delivery.date'),
        vehicleType: drop('job.vehicleType'),
        booked: drop('bookedAt'),
        // An optional field must NOT appear as missing.
        optionalAdminPhone: drop('admin.phone'),
      };
    });

    expect(result.mandatoryList).toContain('servicePartner.country');
    expect(result.mandatoryList).toContain('registrationStatus');
    // The PWA distance is not a PDF field at all, so it can never be mandatory.
    expect(result.mandatoryList).not.toContain('distanceKm');

    for (const key of [
      'tour',
      'vin',
      'offer',
      'partnerCity',
      'pickupStreet',
      'deliveryDate',
      'vehicleType',
      'booked',
    ] as const) {
      // No HTML is produced at all when mandatory data is absent.
      expect(result[key], key).toMatchObject({ ok: false, html: false });
      expect(result[key].missing.length, key).toBeGreaterThan(0);
    }
    expect(result.tour.missing).toContain('tour');
    expect(result.vin.missing).toContain('vin');
    expect(result.offer.missing).toContain('compensation');
    expect(result.partnerCity.missing).toContain('servicePartner.city');
    expect(result.vehicleType.missing).toContain('vehicleType');
    expect(result.optionalAdminPhone).toMatchObject({ ok: true });
  });

  test('produces the required PDF metadata and one consistent tour identifier', async ({
    page,
  }) => {
    const result = await inDoc(page, (doc, input) => {
      const built = doc.buildDocument(input);
      const p = built.payload as never as {
        metaTitle: string;
        metaAuthor: string;
        fileName: string;
        tour: string;
      };
      const html = built.html || '';
      return {
        metaTitle: p.metaTitle,
        metaAuthor: p.metaAuthor,
        fileName: p.fileName,
        tour: p.tour,
        titleTag: (html.match(/<title>([^<]*)<\/title>/) || [])[1],
        authorMeta: (html.match(/name="author" content="([^"]*)"/) || [])[1],
        lang: (html.match(/<html lang="([a-z-]+)"/) || [])[1],
      };
    });

    expect(result).toEqual({
      metaTitle: 'Fahrauftrag 9001-26',
      metaAuthor: 'AUTHEON GmbH',
      // Filename, metadata title and displayed tour number all carry 9001-26.
      fileName: 'Fahrauftrag-9001-26.pdf',
      tour: '9001-26',
      titleTag: 'Fahrauftrag 9001-26',
      authorMeta: 'AUTHEON GmbH',
      // The production document stays German regardless of UI locale.
      lang: 'de',
    });
  });

  test('never emits the PWA distance', async ({ page }) => {
    const result = await inDoc(page, (doc, input) => {
      const data = JSON.parse(JSON.stringify(input));
      data.job.distanceKm = 412;
      const html = doc.buildDocument(data).html || '';
      const payload = JSON.stringify(doc.buildPayload(data).payload);
      return {
        htmlHasKm: /\b412\b/.test(html) || /\bkm\b/.test(html),
        payloadHasDistance: /distance/i.test(payload),
      };
    });

    expect(result).toEqual({ htmlHasKm: false, payloadHasDistance: false });
  });

  test('computes SHA-256 correctly and changes it when any value changes', async ({ page }) => {
    const result = await inDoc(page, (doc, input) => {
      const data = JSON.parse(JSON.stringify(input));
      const a = doc.buildDocument(data);
      const again = doc.buildDocument(JSON.parse(JSON.stringify(data)));
      data.job.plate = 'B-XY 9999';
      const changed = doc.buildDocument(data);
      return {
        // Published SHA-256 test vectors.
        emptyString: doc.sha256Hex(''),
        abc: doc.sha256Hex('abc'),
        // Umlauts must be hashed as UTF-8, not as code units.
        umlaut: doc.sha256Hex('ä'),
      // Surrogate pair: proves the UTF-8 encoder handles astral code points.
      emoji: doc.sha256Hex('Grüße 😀'),
        length: (a.checksum || '').length,
        deterministic: a.checksum === again.checksum,
        changes: a.checksum !== changed.checksum,
      };
    });

    expect(result).toEqual({
      emptyString: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      abc: 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
      umlaut: '33e6d73fee82904c8d7afb78de1154d1e8dc2a0edb08120e63df5b9385c2d9cc',
      emoji: '3436cf1c2f912923eb6c58432bc973f1e3bf57852f000822b53954e45e6c5be4',
      length: 64,
      deterministic: true,
      changes: true,
    });
  });

  test('escapes hostile values instead of injecting markup', async ({ page }) => {
    const result = await inDoc(page, (doc, input) => {
      const data = JSON.parse(JSON.stringify(input));
      data.servicePartner.company =
        '<script>alert(1)</script><img src=x onerror=alert(2)>';
      data.job.pickup.notes = '"><style>@import url(http://evil.test/x.css)</style>';
      const html = doc.buildDocument(data).html || '';
      return {
        escaped: doc.escapeHtml('<a href="x">&\'</a>'),
        noScriptTag: !/<script>alert/.test(html),
        noImgTag: !/<img src=x/.test(html),
        // The only <style> in the document is the renderer's own.
        styleBlocks: (html.match(/<style>/g) || []).length,
        noRemoteUrl: !/evil\.test/.test(html.replace(/&#x2F;|&amp;/g, '')) ||
          html.includes('&lt;style&gt;'),
      };
    });

    expect(result.escaped).toBe('&lt;a href=&quot;x&quot;&gt;&amp;&#39;&lt;/a&gt;');
    expect(result.noScriptTag).toBe(true);
    expect(result.noImgTag).toBe(true);
    expect(result.styleBlocks).toBe(2); // font faces + document stylesheet
    expect(result.noRemoteUrl).toBe(true);
  });

  test('leaves no unresolved template tokens or editable form fields', async ({ page }) => {
    const result = await inDoc(page, (doc, input) => {
      const html = doc.buildDocument(input).html || '';
      return {
        handlebars: /\{\{|\}\}/.test(html),
        ejs: /<%[-=]?/.test(html),
        // A literal ${...} would mean a template literal escaped unevaluated.
        templateLiteral: /\$\{/.test(html),
        formFields: /<(input|select|textarea|form|button)\b/i.test(html),
        // Every German label the approved template defines is present.
        hasLabels: [
          'Fahrzeughersteller &amp; Modell',
          'Amt. Kennzeichen / FIN',
          'Zulassungsstatus',
          'ÜBERNAHME',
          'ÜBERGABE',
          'Buchungsdatum/-Zeit',
          'Vergütung',
          'Sehr geehrte Damen und Herren,',
          'Mit freundlichen Grüßen',
        ].every((s) => html.includes(s)),
      };
    });

    expect(result).toEqual({
      handlebars: false,
      ejs: false,
      templateLiteral: false,
      formFields: false,
      hasLabels: true,
    });
  });

  test('orders additional information exactly as the work order requires', async ({ page }) => {
    const order = await inDoc(page, (doc, input) => {
      const data = JSON.parse(JSON.stringify(input));
      data.job.pickup.notes = 'NOTE_PICKUP';
      data.job.pickup.alternateContactPerson = 'ALT_PICKUP';
      data.job.notesDriver = 'NOTE_DRIVER';
      const html = doc.buildDocument(data).html || '';
      return ['NOTE_PICKUP', 'ALT_PICKUP', 'NOTE_DRIVER'].map((s) => html.indexOf(s));
    });

    expect(order.every((i) => i > 0)).toBe(true);
    // note -> additional contact person -> driver note
    expect(order[0]).toBeLessThan(order[1]);
    expect(order[1]).toBeLessThan(order[2]);
  });
});

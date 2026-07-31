/**
 * Deterministic transport-order fixtures.
 *
 * Written as a globalThis-attaching IIFE rather than an ES module, matching the
 * convention `prototype/project/*.js` uses, so the SAME file can be loaded by
 * the Node CLI generator and by the Playwright specs (whose TypeScript is
 * transpiled to CommonJS and therefore cannot import ESM).
 */
(function (global) {
  "use strict";
  /** Booking instant used by every fixture unless stated otherwise. */
  const BOOKED_AT = "2026-05-04T09:32:00.000Z"; // 11:32 Uhr Europe/Berlin (CEST)

  /** A DST boundary case: 00:30 UTC on the spring-forward day is 02:30 CET. */
  const BOOKED_AT_DST = "2026-03-29T00:30:00.000Z";

  const PARTNER = {
    company: "Musterdrive GmbH",
    person: "Max Mustermann",
    street: "Mustermannstraße",
    houseNumber: "100",
    postalCode: "55555",
    city: "Musterstadt",
    country: "Deutschland",
  };

  const ADMIN = {
    initials: "A. Bauer",
    name: "Anna Bauer",
    phone: "+49 2173 265 1112",
  };

  const baseLocation = (over = {}) => ({
    name: "",
    street: "",
    houseNumber: "",
    postalCode: "",
    city: "",
    country: "Deutschland",
    contactPerson: "",
    alternateContactPerson: "",
    phone: "",
    secondPhone: "",
    email: "",
    notes: "",
    date: "",
    windowFrom: "",
    windowTo: "",
    ...over,
  });

  const baseJob = (over = {}) => ({
    id: "A-2026-00845",
    tour: "0845-26",
    customerName: "Rheinland Kraftwagen GmbH",
    vehicleType: "passenger_car",
    manufacturer: "Volkswagen",
    vehicleModel: "Passat Variant 2.0 TDI",
    plate: "M-AB 1234",
    vin: "WVGZZZ5NZKW123456",
    transportType: "own_axle",
    registrationStatus: "registered",
    driverOffer: 260,
    notesDriver: "Ankunft 15 Minuten früher bestätigen.",
    distanceKm: 412,
    pickup: baseLocation(),
    delivery: baseLocation(),
    ...over,
  });

  const PICKUP = baseLocation({
    name: "Rheinland Kraftwagen GmbH",
    street: "Hafenstraße",
    houseNumber: "18",
    postalCode: "50678",
    city: "Köln",
    contactPerson: "Sabine Krüger",
    phone: "+49 221 5500 118",
    email: "disposition@rk-koeln.de",
    notes: "Schlüsselübergabe an der Rezeption, Tankfüllung ca. 1/2.",
    alternateContactPerson: "Tobias Lang",
    date: "04.05.2026",
    windowFrom: "08:00",
    windowTo: "12:00",
  });

  const DELIVERY = baseLocation({
    name: "Autohaus Süd GmbH & Co. KG",
    street: "Landsberger Allee",
    houseNumber: "204b",
    postalCode: "80339",
    city: "München",
    contactPerson: "Jonas Weber",
    phone: "+49 89 4400 2204",
    email: "annahme@ah-sued.de",
    notes: "Anlieferung nur über Tor 3.",
    date: "05.05.2026",
    windowFrom: "13:00",
    windowTo: "17:00",
  });

  /**
   * Every fixture is `{ key, label, input }` where `input` is exactly what
   * `AutheonTransportOrderPdf.buildPayload()` accepts.
   */
  const FIXTURES = [
    {
      key: "pkw",
      label: "PKW — representative order",
      input: {
        job: baseJob({ pickup: PICKUP, delivery: DELIVERY }),
        servicePartner: PARTNER,
        admin: ADMIN,
        bookedAt: BOOKED_AT,
      },
    },
    {
      key: "lkw-up-to-7-5t",
      label: "LKW up to 7.5 t",
      input: {
        job: baseJob({
          id: "A-2026-00847",
          tour: "0847-26",
          vehicleType: "truck_up_to_7_5_t",
          manufacturer: "Mercedes-Benz",
          vehicleModel: "Sprinter 316 CDI",
          plate: "K-LT 7150",
          vin: "WDB9066331S123847",
          transportType: "third_party_axle",
          driverOffer: 480,
          pickup: PICKUP,
          delivery: DELIVERY,
        }),
        servicePartner: PARTNER,
        admin: ADMIN,
        bookedAt: BOOKED_AT,
      },
    },
    {
      key: "lkw-over-7-5t",
      label: "LKW over 7.5 t",
      input: {
        job: baseJob({
          id: "A-2026-00849",
          tour: "0849-26",
          vehicleType: "truck_over_7_5_t",
          manufacturer: "MAN",
          vehicleModel: "TGX 18.510",
          plate: "HH-MN 8510",
          vin: "WMA06XZZ8NM123849",
          transportType: "third_party_axle",
          driverOffer: 1250.5,
          pickup: PICKUP,
          delivery: DELIVERY,
        }),
        servicePartner: PARTNER,
        admin: ADMIN,
        bookedAt: BOOKED_AT,
      },
    },
    {
      key: "deregistered",
      label: "Deregistered vehicle — red Abgemeldet notice",
      input: {
        job: baseJob({
          id: "A-2026-00851",
          tour: "0851-26",
          registrationStatus: "deregistered",
          transportType: "third_party_axle",
          plate: "B-XY 9087",
          pickup: PICKUP,
          delivery: DELIVERY,
        }),
        servicePartner: PARTNER,
        admin: ADMIN,
        bookedAt: BOOKED_AT,
      },
    },
    {
      key: "optional-missing",
      label: "All optional fields absent — labels must collapse",
      input: {
        job: baseJob({
          id: "A-2026-00853",
          tour: "0853-26",
          notesDriver: "",
          pickup: baseLocation({
            street: "Hafenstraße",
            postalCode: "50678",
            city: "Köln",
            date: "04.05.2026",
          }),
          delivery: baseLocation({
            street: "Landsberger Allee",
            postalCode: "80339",
            city: "München",
            date: "05.05.2026",
          }),
        }),
        // House number and contact person are optional per the repository's
        // address validation, so this partner snapshot omits both.
        servicePartner: {
          company: "Kurz GmbH",
          street: "Ringstraße",
          postalCode: "10115",
          city: "Berlin",
          country: "Deutschland",
        },
        admin: { initials: "L. Reimann" },
        bookedAt: BOOKED_AT,
      },
    },
    {
      key: "long-content",
      label: "Long addresses, notes and e-mail — wrapping / multi-page",
      input: {
        job: baseJob({
          id: "A-2026-00855",
          tour: "0855-26",
          vehicleType: "truck_over_7_5_t",
          manufacturer: "Mercedes-Benz",
          vehicleModel:
            "Actros 2545 L nRL ClassicSpace 2.3 m Fahrerhaus mit Zusatzausstattungspaket Fernverkehr",
          plate: "GG-LKW 12345",
          vin: "WDB96340310123855",
          driverOffer: 2480.75,
          notesDriver:
            "Der Fahrer muss sich vor Antritt der Fahrt telefonisch bei der Disposition melden und die vollständige Fahrzeugdokumentation, einschließlich Serviceheft, Bordbuch und Schlüsselsatz, gegen Unterschrift entgegennehmen. Auf dem Betriebshof gilt Warnkleidungspflicht.",
          pickup: baseLocation({
            name: "Internationale Fahrzeuglogistik und Speditionsgesellschaft Niederrhein mbH & Co. Betriebs-KG",
            street: "Am Alten Verschiebebahnhof Nordwest",
            houseNumber: "1147-1153a",
            postalCode: "47059",
            city: "Duisburg-Ruhrort",
            contactPerson: "Dr. Maximiliane von Sonnenberg-Wittelsbach",
            alternateContactPerson: "Hans-Jürgen Schmitt-Oberhausen",
            phone: "+49 203 4455 66778899",
            email:
              "fahrzeugdisposition.niederrhein.abteilung-nord@internationale-fahrzeuglogistik-niederrhein.example",
            notes:
              "Zufahrt ausschließlich über die Nordeinfahrt am Alten Verschiebebahnhof. Anmeldung mindestens 30 Minuten vor dem Abholzeitfenster im Pförtnerhaus 2. Das Fahrzeug steht auf Stellplatz H-14 im rückwärtigen Bereich der Halle 7 und ist nicht fahrbereit vorkonditioniert.",
            date: "04.05.2026",
            windowFrom: "06:30",
            windowTo: "10:00",
          }),
          delivery: baseLocation({
            name: "Établissement de Distribution Automobile Méditerranée S.A.S.",
            street: "Avenue des Frères Lumière et Chemin de la Zone Industrielle",
            houseNumber: "2287",
            postalCode: "F-13016",
            city: "Marseille — Saint-Henri",
            country: "Frankreich",
            contactPerson: "Ana-María Fernández-Gutiérrez",
            alternateContactPerson: "Krzysztof Wiśniewski",
            phone: "+33 4 91 00 00 00",
            email:
              "reception.vehicules.mediterranee@etablissement-distribution-automobile.example",
            notes:
              "Livraison uniquement entre 13h00 et 16h30. Übergabeprotokoll in französischer und deutscher Sprache erforderlich; Zollpapiere sind vollständig mitzuführen.",
            date: "07.05.2026",
            windowFrom: "13:00",
            windowTo: "16:30",
          }),
        }),
        servicePartner: {
          company:
            "Überführungs- und Fahrzeugtransportgesellschaft Süddeutschland mbH & Co. KG",
          person: "Rechtsanwältin Dr. Änne Öztürk-Straßburger",
          street: "Prinzregentenstraße am Englischen Garten",
          houseNumber: "118-120",
          postalCode: "80538",
          city: "München",
          country: "Deutschland",
        },
        admin: ADMIN,
        bookedAt: BOOKED_AT,
      },
    },
    {
      key: "international-umlauts",
      label: "Umlauts, special characters and an international address",
      input: {
        job: baseJob({
          id: "A-2026-00857",
          tour: "0857-26",
          customerName: "Škoda & Søn Fahrzeughandel AG (Zürich)",
          manufacturer: "Škoda",
          vehicleModel: "Superb Combi Größe L",
          plate: "ZH-123456",
          vin: "TMBJH7NP8P0123857",
          driverOffer: 1000,
          notesDriver: "Grenzübergang: Zollpapiere & CMR mitführen.",
          pickup: baseLocation({
            name: "Škoda & Søn Fahrzeughandel AG",
            street: "Bahnhofstrasse",
            houseNumber: "42",
            postalCode: "CH-8001",
            city: "Zürich",
            country: "Schweiz",
            contactPerson: "Jürgen Müller-Løvgren",
            phone: "+41 44 000 00 00",
            email: "übergabe@skoda-søn.example",
            notes: "Öffnungszeiten: Mo–Fr 07:30–17:00 Uhr.",
            date: "11.05.2026",
            windowFrom: "07:30",
            windowTo: "11:00",
          }),
          delivery: baseLocation({
            name: "Nordisk Bilhåndtering A/S",
            street: "Østerbrogade",
            houseNumber: "77",
            postalCode: "DK-2100",
            city: "København Ø",
            country: "Dänemark",
            contactPerson: "Søren Kjærgaard",
            phone: "+45 30 00 00 00",
            email: "modtagelse@nordisk-bilhaandtering.example",
            date: "13.05.2026",
            windowFrom: "09:00",
            windowTo: "15:00",
          }),
        }),
        servicePartner: PARTNER,
        admin: ADMIN,
        bookedAt: BOOKED_AT,
      },
    },
  ];

  const FIXTURE_BY_KEY = Object.fromEntries(
    FIXTURES.map((f) => [f.key, f]),
  );
  global.AutheonTransportOrderFixtures = {
    BOOKED_AT,
    BOOKED_AT_DST,
    FIXTURES,
    FIXTURE_BY_KEY,
  };
})(typeof window !== "undefined" ? window : globalThis);

// Strict-TypeScript consumer test.
//
// This file is type-checked by tsc with `strict: true`. It is NOT executed
// at runtime — it exists to prove that the .d.ts surface is sound and
// usable from a strict-mode TS calendar plugin or similar.
//
// Run with: npm run typecheck

import {
  buildRegistry,
  PositionPluginRegistry,
  adsbAdapter,
  trootraxAdapter,
  customAdapter,
  nmeaAdapter,
  traccarAdapter,
  connectTraccarWebSocket,
  aprsAdapter,
  samsaraAdapter,
  startSamsaraFeed,
  aisAdapter,
  inreachAdapter,
  makeMqttAdapter,
  geojsonAdapter,
  toGeoJSON,
  toCSV,
} from '../../src/index.js';

import type {
  NormalizedPosition,
  Adapter,
  StopHandle,
  MqttAdapterOptions,
} from '../../src/index.js';

// ----- registry & adapters -----

const reg: PositionPluginRegistry = buildRegistry({
  adapters: [
    adsbAdapter,
    trootraxAdapter,
    customAdapter,
    nmeaAdapter,
    traccarAdapter,
    aprsAdapter,
    samsaraAdapter,
    aisAdapter,
    inreachAdapter,
    geojsonAdapter,
  ],
  colors: { adsb: '#1f77b4' },
});

const positions: NormalizedPosition[] = reg.parse({ now: 0, messages: 0, aircraft: [] });

// Schema fields are typed and required where they should be.
for (const p of positions) {
  const id: string = p.id;
  const lat: number = p.lat;
  const lon: number = p.lon;
  const alt: number | null = p.altitude;
  const hdg: number | null = p.heading;
  const spd: number | null = p.speed;
  const ts: number = p.timestamp;
  const src: string = p.source;
  const label: string = p.label;
  void id;
  void lat;
  void lon;
  void alt;
  void hdg;
  void spd;
  void ts;
  void src;
  void label;
}

// ----- color lookup -----

const color: string = reg.color('adsb');
void color;

// ----- polling -----

const handle: StopHandle = reg.poll(
  () => Promise.resolve({ now: 0, messages: 0, aircraft: [] }),
  5000,
  (batch: NormalizedPosition[]) => {
    void batch;
  },
);
handle.stop();

// ----- MQTT factory -----

const mqttOpts: MqttAdapterOptions = {
  idField: 'device_id',
  latField: 'gps.lat',
  lonField: 'gps.lon',
  altitudeUnit: 'meters',
  speedUnit: 'mph',
  timestampUnit: 'milliseconds',
};
const mqtt: Adapter = makeMqttAdapter(mqttOpts);
void mqtt;

// ----- runtime helpers -----

const traccarSock: StopHandle = connectTraccarWebSocket('wss://example/api/socket', () => {});
traccarSock.stop();

const samsaraHandle = startSamsaraFeed(
  async (after: string | null) => {
    void after;
    return { data: [], pagination: { endCursor: 'x', hasNextPage: false } };
  },
  (batch: NormalizedPosition[]) => void batch,
  { intervalMs: 5000 },
);
const cursor: string | null = samsaraHandle.cursor();
void cursor;
samsaraHandle.stop();

// ----- export -----

const fc = toGeoJSON(positions);
const fcType: 'FeatureCollection' = fc.type;
void fcType;
const csv: string = toCSV(positions);
void csv;

// ----- sub-path imports -----

import { adsbAdapter as adsbViaSubpath } from '../../src/adapters/adsb.js';
const adsbCheck: Adapter = adsbViaSubpath;
void adsbCheck;

// ----- negative checks via @ts-expect-error -----

// @ts-expect-error — id is required.
const bad1: NormalizedPosition = { lat: 0, lon: 0, timestamp: 0, source: 's', label: 'l', altitude: null, heading: null, speed: null };
void bad1;

// @ts-expect-error — makeMqttAdapter requires idField/latField/lonField.
const bad2: Adapter = makeMqttAdapter({ idField: 'id' });
void bad2;

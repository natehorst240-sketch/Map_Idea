import { makeMqttAdapter } from '../../src/adapters/mqtt.js';

describe('mqtt adapter — factory', () => {
  test('throws when required fields missing', () => {
    expect(() => makeMqttAdapter()).toThrow();
    expect(() => makeMqttAdapter({})).toThrow();
    expect(() => makeMqttAdapter({ idField: 'id' })).toThrow();
  });

  test('canParse always returns false (must register explicitly)', () => {
    const a = makeMqttAdapter({ idField: 'id', latField: 'lat', lonField: 'lon' });
    expect(a.canParse({ id: 'x', lat: 1, lon: 2 })).toBe(false);
    expect(a.canParse('whatever')).toBe(false);
    expect(a.canParse(null)).toBe(false);
  });

  test('flat schema with knots / feet defaults', () => {
    const a = makeMqttAdapter({
      idField: 'device_id',
      latField: 'gps_lat',
      lonField: 'gps_lon',
      altitudeField: 'altitude',
      headingField: 'course',
      speedField: 'speed',
      timestampField: 'ts',
    });
    const out = a.normalize({
      device_id: 'AGV-7',
      gps_lat: 40.5,
      gps_lon: -111.9,
      altitude: 4500,
      course: 90,
      speed: 12,
      ts: 1714158000,
    });
    expect(out).toHaveLength(1);
    expect(out[0].id).toBe('AGV-7');
    expect(out[0].altitude).toBe(4500);
    expect(out[0].speed).toBe(12);
    expect(out[0].timestamp).toBe(1714158000);
    expect(out[0].source).toBe('mqtt');
  });

  test('nested fields via dot notation, metres + km/h', () => {
    const a = makeMqttAdapter({
      idField: 'deviceId',
      latField: 'location.coords.lat',
      lonField: 'location.coords.lng',
      altitudeField: 'location.coords.alt_m',
      speedField: 'telemetry.speed_kmh',
      altitudeUnit: 'meters',
      speedUnit: 'kmh',
    });
    const out = a.normalize({
      deviceId: 'pod-3',
      location: { coords: { lat: 47.5, lng: -122.3, alt_m: 100 } },
      telemetry: { speed_kmh: 50 },
    });
    expect(out).toHaveLength(1);
    expect(out[0].lat).toBe(47.5);
    expect(out[0].altitude).toBeCloseTo(100 * 3.28084, 1);
    expect(out[0].speed).toBeCloseTo(50 * 0.539957, 2);
  });

  test('OsmAnd-style flat payload with mph + ms timestamp', () => {
    const a = makeMqttAdapter({
      idField: 'id',
      latField: 'lat',
      lonField: 'lon',
      headingField: 'bearing',
      speedField: 'speed',
      timestampField: 'timestamp',
      speedUnit: 'mph',
      timestampUnit: 'milliseconds',
      name: 'mqtt-osmand',
      labelField: 'label',
    });
    const out = a.normalize({
      id: 'phone-1',
      label: "Driver's phone",
      lat: '40.5', // string-typed
      lon: '-111.9',
      bearing: 270,
      speed: 35,
      timestamp: 1714158000000,
    });
    expect(out).toHaveLength(1);
    expect(out[0].id).toBe('phone-1');
    expect(out[0].label).toBe("Driver's phone");
    expect(out[0].source).toBe('mqtt-osmand');
    expect(out[0].speed).toBeCloseTo(35 * 0.868976, 2);
    expect(out[0].timestamp).toBe(1714158000); // ms → s
  });

  test('arrays of payloads emit one position each', () => {
    const a = makeMqttAdapter({ idField: 'id', latField: 'lat', lonField: 'lon' });
    const out = a.normalize([
      { id: 'A', lat: 1, lon: 2 },
      { id: 'B', lat: 3, lon: 4 },
    ]);
    expect(out).toHaveLength(2);
  });

  test('records missing required fields are skipped', () => {
    const a = makeMqttAdapter({ idField: 'id', latField: 'lat', lonField: 'lon' });
    const out = a.normalize([
      { id: 'A', lat: 1, lon: 2 },
      { id: 'B', lat: 'NaN', lon: 4 },
      { id: 'C' }, // no lat/lon
    ]);
    expect(out).toHaveLength(1);
    expect(out[0].id).toBe('A');
  });
});

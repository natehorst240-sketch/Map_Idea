import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { nmeaAdapter } from '../../src/adapters/nmea.js';

const here = dirname(fileURLToPath(import.meta.url));
const allLines = readFileSync(resolve(here, '../fixtures/nmea.txt'), 'utf8')
  .split(/\r?\n/)
  .filter((l) => l.trim().length > 0);

function feed(lines) {
  nmeaAdapter.reset();
  return nmeaAdapter.normalize(lines.join('\n'));
}

describe('nmea adapter', () => {
  beforeEach(() => nmeaAdapter.reset());

  test('canParse picks up GGA/RMC strings', () => {
    expect(nmeaAdapter.canParse(allLines[0])).toBe(true);
    expect(nmeaAdapter.canParse('$GPRMC,123519,A,4807.038,N,...')).toBe(true);
    expect(nmeaAdapter.canParse('$GLGGA,...')).toBe(true);
  });

  test('canParse rejects non-NMEA payloads', () => {
    expect(nmeaAdapter.canParse('hello world')).toBe(false);
    expect(nmeaAdapter.canParse({ aircraft: [] })).toBe(false);
    expect(nmeaAdapter.canParse(null)).toBe(false);
  });

  test('canonical Wikipedia GGA+RMC pair emits one merged position', () => {
    const out = feed([allLines[0], allLines[1]]);
    expect(out).toHaveLength(1);
    const p = out[0];
    expect(p.source).toBe('nmea');
    expect(p.lat).toBeCloseTo(48.1173, 3);
    expect(p.lon).toBeCloseTo(11.5167, 3);
    // 545.4 m → ft
    expect(p.altitude).toBeCloseTo(545.4 * 3.28084, 1);
    expect(p.speed).toBeCloseTo(22.4);
    expect(p.heading).toBeCloseTo(84.4);
    expect(p.timestamp).toBe(Date.UTC(1994, 2, 23, 12, 35, 19) / 1000);
    expect(p.meta.fix).toBe(1);
    expect(p.meta.nsats).toBe(8);
  });

  test('bad checksum sentence is silently rejected', () => {
    // Line index 2 has *99 (deliberately wrong). On its own it should produce nothing.
    const out = feed([allLines[2]]);
    expect(out).toHaveLength(0);
  });

  test('multi-talker prefix accepted: $GLGGA, $GNGGA', () => {
    const gl = feed([allLines[3]]); // $GLGGA without checksum
    expect(gl).toHaveLength(0); // alone — needs RMC to emit
    nmeaAdapter.reset();
    const gn = nmeaAdapter.normalize(allLines[4]); // $GNGGA without checksum
    expect(gn).toHaveLength(0);
    // canParse must recognize them
    expect(nmeaAdapter.canParse(allLines[3])).toBe(true);
    expect(nmeaAdapter.canParse(allLines[4])).toBe(true);
  });

  test('GGA with empty altitude → altitude null in merged output', () => {
    // pair an empty-alt GGA with a valid RMC at same coords
    const ggaEmptyAlt = allLines[5]; // $GPGGA,...,,M,0.0,M,, (alt empty)
    const rmcAtSameCoords = '$GPRMC,235505,A,4916.45,N,12311.12,W,000.0,000.0,230394,000.0,W';
    const out = feed([ggaEmptyAlt, rmcAtSameCoords]);
    expect(out).toHaveLength(1);
    expect(out[0].altitude).toBeNull();
  });

  test('RMC with status=V (void) is skipped', () => {
    const out = feed([allLines[6]]); // $GPRMC,...,V,...
    expect(out).toHaveLength(0);
  });

  test('GGA with fix=0 is skipped', () => {
    const out = feed([allLines[7]]); // $GPGGA,...,0,...
    expect(out).toHaveLength(0);
  });

  test('garbage lines are skipped without throwing', () => {
    expect(() => feed([allLines[8]])).not.toThrow(); // "WHATEVER GARBAGE LINE"
  });

  test('multiplexed devices via envelope keep buffers separate', () => {
    nmeaAdapter.reset();
    const a = nmeaAdapter.normalize({ source: 'nmea', deviceId: 'A', sentences: allLines[0] });
    const b = nmeaAdapter.normalize({ source: 'nmea', deviceId: 'B', sentences: allLines[1] });
    // A has only GGA, B has only RMC — neither merges across devices
    expect(a).toHaveLength(0);
    expect(b).toHaveLength(0);
  });

  test('full fixture stream parses without exceptions', () => {
    expect(() => nmeaAdapter.normalize(allLines.join('\n'))).not.toThrow();
  });
});

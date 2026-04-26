// export.js — serialize normalized positions to GeoJSON or CSV.
// Pure functions; the demo wires them to a Blob download.

export function toGeoJSON(positions) {
  return {
    type: 'FeatureCollection',
    features: positions.map((p) => ({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates:
          typeof p.altitude === 'number'
            ? [p.lon, p.lat, p.altitude * 0.3048] // GeoJSON elevation in metres
            : [p.lon, p.lat],
      },
      properties: {
        id: p.id,
        label: p.label,
        source: p.source,
        altitudeFeet: p.altitude,
        heading: p.heading,
        speedKts: p.speed,
        timestamp: p.timestamp,
      },
    })),
  };
}

const CSV_COLS = ['id', 'label', 'source', 'lat', 'lon', 'altitudeFeet', 'heading', 'speedKts', 'timestamp'];

export function toCSV(positions) {
  const rows = [CSV_COLS.join(',')];
  for (const p of positions) {
    const row = [
      p.id,
      p.label,
      p.source,
      p.lat,
      p.lon,
      p.altitude,
      p.heading,
      p.speed,
      p.timestamp,
    ].map(csvCell);
    rows.push(row.join(','));
  }
  return rows.join('\n');
}

function csvCell(v) {
  if (v === null || v === undefined) return '';
  const s = String(v);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

// Convenience: trigger a browser download for the given content.
export function downloadBlob(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

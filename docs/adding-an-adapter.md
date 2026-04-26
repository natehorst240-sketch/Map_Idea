# Adding an Adapter

An adapter converts raw data from one tracking source into the normalized
position schema. The 3D map only consumes that schema — it never sees
adapter internals.

## Step 1: Pick a source

Decide what raw shape you're handling. Examples:

- a JSON envelope from a REST endpoint (Traccar, Samsara)
- a single string of NMEA sentences
- a binary AIS frame
- raw MQTT payloads with a configurable field map

## Step 2: Author the module

Drop a new file at `src/adapters/<name>.js`. The minimum surface:

```js
export const myAdapter = {
  name: 'mysource',

  // True if this adapter should claim the payload. Be specific —
  // false-positives steal payloads from other adapters.
  canParse(raw) { /* ... */ },

  // Return an array (or a single object) of normalized positions.
  // Throwing is okay; the registry catches and logs.
  normalize(raw) { /* ... */ },
};
```

The normalized position schema:

| Field      | Type   | Required | Notes                                      |
|------------|--------|----------|--------------------------------------------|
| id         | string | yes      | Unique asset identifier                    |
| lat        | number | yes      | Decimal degrees WGS84                      |
| lon        | number | yes      | Decimal degrees WGS84                      |
| altitude   | number | no       | **Feet MSL**, or `null`                    |
| heading    | number | no       | True heading 0–360, or `null`              |
| speed      | number | no       | Knots, or `null`                           |
| timestamp  | number | yes      | Unix epoch seconds UTC                     |
| source     | string | yes      | Adapter name                               |
| label      | string | yes      | Display name on the globe                  |
| meta       | object | no       | Source-specific extras, free-form          |

## Step 3: Convert units at the adapter boundary

Convert at the adapter's exit, not later:

| Source emits  | Adapter outputs |
|---------------|-----------------|
| metres        | × 3.281 → feet  |
| km/h          | × 0.540 → knots |
| mph           | × 0.869 → knots |
| ISO 8601      | `Date.parse() / 1000` |

## Step 4: Add a fixture and test

Drop a representative payload into `tests/fixtures/<name>.json` and a
matching `tests/adapters/<name>.test.js`. Verify:

1. `canParse` returns true for your fixture.
2. `canParse` returns false for at least one *other* adapter's fixture.
3. `normalize` produces the right number of positions with correct
   field values.

## Step 5: Register

Add the adapter import and `reg()` call in `index.html`. Add a colour
to `config.js` under `sourceColors`.

## Tips

- `canParse` should be cheap — look at one or two top-level fields, not
  recurse into arrays.
- Never throw from `canParse`. Throwing from `normalize` is fine.
- If your source has multiple message types (NMEA $GPGGA + $GPRMC,
  AIS Type 1 + Type 18), merge inside the adapter; the map only sees
  one position per asset per emit.
- For sources that need configuration (MQTT field map, OAuth token),
  export a factory: `export function makeXAdapter(opts) { return { ... } }`.

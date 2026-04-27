import type { Adapter } from '../types.js';

export type MqttAltitudeUnit = 'feet' | 'meters';
export type MqttSpeedUnit = 'knots' | 'mph' | 'kmh';
export type MqttTimestampUnit = 'seconds' | 'milliseconds' | 'iso';

export interface MqttAdapterOptions {
  /** Required. Dot-notation path to the asset id. */
  idField: string;
  /** Required. Dot-notation path to latitude (decimal degrees). */
  latField: string;
  /** Required. Dot-notation path to longitude (decimal degrees). */
  lonField: string;
  /** Optional. Path to altitude. Default unit is feet. */
  altitudeField?: string;
  /** Optional. Path to true heading in degrees. */
  headingField?: string;
  /** Optional. Path to speed. Default unit is knots. */
  speedField?: string;
  /** Optional. Path to timestamp. Default unit is seconds. */
  timestampField?: string;
  /** Optional. Path to a display label. Defaults to the id. */
  labelField?: string;
  /** Default 'feet'. */
  altitudeUnit?: MqttAltitudeUnit;
  /** Default 'knots'. */
  speedUnit?: MqttSpeedUnit;
  /** Default 'seconds'. */
  timestampUnit?: MqttTimestampUnit;
  /** Source name override. Default 'mqtt'. */
  name?: string;
}

/**
 * Configurable MQTT adapter factory. canParse() is always false — MQTT
 * adapters must be registered explicitly to avoid stealing payloads
 * from other adapters. normalize() accepts a single object or an array.
 *
 * Dot-notation field paths are supported, e.g. `location.coords.lat`.
 */
export declare function makeMqttAdapter(options: MqttAdapterOptions): Adapter;

/*
 * Wire format for messages to and from the AEAC competition telemetry server (ATC).
 * Mirrors Shepard's src/modules/atc/messages.py; keep the two in sync.
 *
 * Source of truth: https://aeac.mylonics.com/#/connect (checked 2026-11-24).
 * Re-check it before each competition; the organizers may change it.
 *
 *   TX (we send)     {"action": <name>, "data": {...}}
 *       "telemetry"           1-2 Hz, every field in REQUIRED_TELEMETRY_FIELDS
 *       "telemetry_request"   {"uavId"} -> server replies with a telemetry_ack
 *       "infraction_request"  {"uavId"} -> server replies with an infraction message
 *   RX (we receive)  {"event": <name>, ...}
 *       "traffic"         1 Hz, simulated aircraft, under "payload"
 *       "telemetry_ack"   after every accepted telemetry message (fields at top level)
 *       "infraction"      pushed when an infraction is recorded, or on request
 *       "error"           the server rejected something; "message" says why
 *   Limits: max 4 messages/s per connection; unixTime must be GPS time within
 *   5 minutes of server time; a gap over 30 s starts a new broadcast session.
 */

export const ACTION_TELEMETRY = "telemetry";
export const ACTION_TELEMETRY_REQUEST = "telemetry_request";
export const ACTION_INFRACTION_REQUEST = "infraction_request";

export const EVENT_TRAFFIC = "traffic";
export const EVENT_TELEMETRY_ACK = "telemetry_ack";
export const EVENT_INFRACTION = "infraction";
export const EVENT_ERROR = "error";

export const INFRACTION_NAMES = [
    "uav_in_traffic", "slow_telem", "fast_telem", "latency",
    "disconnect", "startup", "invalid_gps", "uav_left_boundary",
];

export const REQUIRED_TELEMETRY_FIELDS = [
    "uavId", "unixTime", "latitude", "longitude", "altitudeAGL",
    "horizontalPositionAccuracy", "verticalPositionAccuracy", "batteryPercentage",
    "mode", "rcLinkStatus", "telemetryLinkStatus",
];

export function makeRequest(action, data) {
    return JSON.stringify({ action, data });
}

/** Names of required telemetry fields that are missing or null. */
export function missingTelemetryFields(data) {
    return REQUIRED_TELEMETRY_FIELDS.filter((name) => data?.[name] === undefined || data?.[name] === null);
}

export const formatTelemetry = (data) => makeRequest(ACTION_TELEMETRY, data);
export const formatTelemetryRequest = (uavId) => makeRequest(ACTION_TELEMETRY_REQUEST, { uavId });
export const formatInfractionRequest = (uavId) => makeRequest(ACTION_INFRACTION_REQUEST, { uavId });

/** Parses a server message. Returns null for anything that isn't a JSON object. */
export function parseMessage(raw) {
    let msg;
    try {
        msg = JSON.parse(raw);
    } catch {
        return null;
    }
    if (typeof msg !== "object" || msg === null || Array.isArray(msg)) return null;
    return msg;
}

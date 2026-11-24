// Small display helpers shared by the dashboard cards.

export const DASH = "—";

/** "3.2 s" / "4 min 05 s" between two Date.now() values, or DASH. */
export function formatAge(fromMs, nowMs) {
    if (fromMs == null) return DASH;
    const seconds = Math.max(0, (nowMs - fromMs) / 1000);
    if (seconds < 10) return `${seconds.toFixed(1)} s`;
    if (seconds < 60) return `${Math.floor(seconds)} s`;
    const minutes = Math.floor(seconds / 60);
    return `${minutes} min ${String(Math.floor(seconds % 60)).padStart(2, "0")} s`;
}

/** Local wall-clock time HH:MM:SS for a Date.now() value or unix seconds. */
export function formatClock(value, { unixSeconds = false } = {}) {
    if (value == null) return DASH;
    const date = new Date(unixSeconds ? value * 1000 : value);
    return date.toLocaleTimeString([], { hour12: false });
}

export function formatNumber(value, digits = 1, unit = "") {
    if (value == null || Number.isNaN(Number(value))) return DASH;
    return `${Number(value).toFixed(digits)}${unit ? ` ${unit}` : ""}`;
}

export const formatCoord = (value) => formatNumber(value, 6);

/** Status thresholds for the time since telemetry last reached the server. */
export const LATENCY_S = 15;    // "latency" infraction
export const DISCONNECT_S = 30; // "disconnect" infraction

export function gapLevel(seconds) {
    if (seconds == null) return "idle";
    if (seconds >= LATENCY_S) return "bad";
    if (seconds > 2.5) return "warn";
    return "ok";
}

/** Horizontal distance in metres between two lat/lon points (haversine). */
export function distanceM(lat1, lon1, lat2, lon2) {
    const R = 6371000;
    const toRad = (d) => (d * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(a));
}

// Infractions the AEAC telemetry server records, with the rule behind each one.
// Copied from the "Scoring and infractions" section of https://aeac.mylonics.com (2026-11-24).
export const INFRACTIONS = [
    { key: "uav_in_traffic", label: "UAV in traffic",
      rule: "While armed, the UAV enters the defined traffic keep-away bounds. A continuing incursion is not counted again until the UAV exits and re-enters those bounds." },
    { key: "slow_telem", label: "Slow telemetry rate",
      rule: "While armed, the GPS timestamp delta between telemetry messages is greater than 1.1 seconds." },
    { key: "fast_telem", label: "Fast telemetry rate",
      rule: "While armed, the GPS timestamp delta between telemetry messages is less than 0.4 seconds." },
    { key: "latency", label: "Telemetry latency",
      rule: "While armed, telemetry is more than 15 seconds old according to its GPS timestamp. Telemetry more than 30 seconds old is scored as a disconnect instead." },
    { key: "disconnect", label: "Disconnect",
      rule: "No telemetry is received for more than 30 seconds while the UAV was armed, whether because the connection dropped or because a received sample is more than 30 seconds stale." },
    { key: "startup", label: "Startup",
      rule: "While armed, the broadcast starts instead of OFF or Idle, unless the last recorded state was already armed." },
    { key: "invalid_gps", label: "Invalid GPS",
      rule: "The telemetry message does not carry a valid GPS position when in an armed state." },
    { key: "uav_left_boundary", label: "UAV left flight boundary",
      rule: "An Armed-Pilot or Armed-Automatic UAV is outside the flight boundary and its previous point is missing, more than 60 seconds old, or inside the boundary. Recorded for review; it does not deduct points." },
];

export function totalInfractions(infractions) {
    if (!infractions) return 0;
    return INFRACTIONS.reduce((sum, { key }) => sum + (Number(infractions[key]) || 0), 0);
}

export function infractionLabel(key) {
    return INFRACTIONS.find((i) => i.key === key)?.label ?? key;
}

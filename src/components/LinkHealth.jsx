// Link health (#59): is Shepard's telemetry actually reaching the server?
//
// Compares what Shepard says it sent (its "telemetry" copy to Emu) with what the
// server has ACKed. If Shepard keeps producing telemetry but the ACKs stop
// advancing, Shepard's link to the server is down and Emu should take over as
// the secondary link. The takeover itself is not implemented yet.
import { Field, Panel } from "./common";
import { DISCONNECT_S, LATENCY_S, formatAge, formatClock } from "@/lib/format";

// ACKs this far behind Shepard's latest packet mean the server isn't getting it
const ACK_LAG_WARN_S = 3;

export default function LinkHealth({ state, now }) {
    const { atc, shepard, shepardTelemetry, acks } = state;
    const lastAck = acks.at(-1);
    const packet = shepardTelemetry?.packet;

    const ackLagS = packet?.unixTime != null && lastAck?.unixTime != null ? packet.unixTime - lastAck.unixTime : null;
    const sinceShepardS = shepardTelemetry ? (now - shepardTelemetry.receivedAt) / 1000 : null;
    const sinceAckS = lastAck ? (now - lastAck.receivedAt) / 1000 : null;

    const verdict = assess({ atc, shepard, shepardTelemetry, sinceShepardS, sinceAckS, ackLagS });

    return (
        <Panel title="Link health" issue="#59">
            <div className={`mb-3 rounded-md border px-3 py-2 text-sm ${VERDICT_STYLE[verdict.level]}`}>
                <div className="font-medium">{verdict.title}</div>
                <div className="text-xs opacity-80">{verdict.detail}</div>
            </div>

            <div className="divide-y">
                <Field label="Shepard → server (Shepard reports)"
                       value={shepardTelemetry ? (shepardTelemetry.atcConnected ? "connected" : "NOT connected") : "—"}
                       level={shepardTelemetry ? (shepardTelemetry.atcConnected ? "ok" : "bad") : "idle"} />
                <Field label="Last Shepard packet" value={shepardTelemetry ? `${formatAge(shepardTelemetry.receivedAt, now)} ago` : "none received"}
                       level={sinceShepardS == null ? "idle" : sinceShepardS > 3 ? "warn" : "ok"} />
                <Field label="Shepard packet GPS time" value={packet ? formatClock(packet.unixTime, { unixSeconds: true }) : "—"} />
                <Field label="ACK lag behind Shepard" value={ackLagS != null ? `${ackLagS.toFixed(1)} s` : "—"}
                       level={ackLagS == null ? "idle" : ackLagS >= LATENCY_S ? "bad" : ackLagS > ACK_LAG_WARN_S ? "warn" : "ok"}
                       title="Shepard's newest packet GPS time minus the newest ACKed GPS time" />
                <Field label="Emu → server" value={!atc.enabled ? "disabled" : atc.connected ? "connected (standby)" : "disconnected"}
                       level={!atc.enabled ? "idle" : atc.connected ? "ok" : "bad"} />
                <Field label="Failover" value="not implemented yet" level="idle" />
            </div>
        </Panel>
    );
}

const VERDICT_STYLE = {
    ok: "border-emerald-200 bg-emerald-50 text-emerald-900",
    warn: "border-amber-200 bg-amber-50 text-amber-900",
    bad: "border-red-300 bg-red-50 text-red-900",
    idle: "border-neutral-200 bg-neutral-50 text-neutral-700",
};

function assess({ atc, shepard, shepardTelemetry, sinceShepardS, sinceAckS, ackLagS }) {
    if (!shepard.connected && !shepardTelemetry) {
        return { level: "idle", title: "Not connected to Shepard",
                 detail: "Connect to Shepard (top bar) to compare its telemetry with the server's ACKs." };
    }
    if (!shepardTelemetry) {
        return { level: "idle", title: "Waiting for Shepard telemetry",
                 detail: "Shepard is connected but hasn't sent a telemetry copy yet (shepard#104)." };
    }
    const shepardDown = !shepardTelemetry.atcConnected || (ackLagS != null && ackLagS > ACK_LAG_WARN_S);
    if (shepardDown) {
        const gap = sinceAckS != null ? ` Last ACK ${sinceAckS.toFixed(0)} s ago; disconnect infraction at ${DISCONNECT_S} s.` : "";
        return { level: "bad", title: "Shepard's server link looks down",
                 detail: (atc.connected ? "Emu's link is up and could take over (failover not implemented)." : "Emu's link is down too.") + gap };
    }
    if (sinceShepardS > 3) {
        return { level: "warn", title: "Shepard telemetry is stale",
                 detail: "Emu stopped receiving Shepard's telemetry copy; the Shepard ↔ Emu link may be down." };
    }
    return { level: "ok", title: "Shepard is streaming and the server is ACKing", detail: "Emu is on standby." };
}

// ACK counter (#58): how many telemetry ACKs the server has sent, and whether they keep coming.
import { BigStat, Field, Panel } from "./common";
import { DISCONNECT_S, LATENCY_S, formatAge, formatClock, gapLevel } from "@/lib/format";
import { cn } from "@/lib/utils";

const RATE_WINDOW_S = 10;
const TIMELINE_S = 60;

export default function AckCounter({ acks, ackCount, now }) {
    const last = acks.at(-1);
    const sinceLastS = last ? (now - last.receivedAt) / 1000 : null;
    const level = gapLevel(sinceLastS);

    // ACKs per second over the last few seconds, by when Emu received them
    const recent = acks.filter((a) => now - a.receivedAt <= RATE_WINDOW_S * 1000).length;
    const rateHz = recent / RATE_WINDOW_S;

    // How old the newest ACKed telemetry is by its own GPS timestamp (what "latency" is scored on)
    const telemetryAgeS = last?.unixTime != null ? now / 1000 - last.unixTime : null;

    return (
        <Panel title="Telemetry ACKs" issue="#58">
            <div className="flex items-end justify-between gap-4">
                <BigStat value={ackCount} caption="ACKs received" />
                <BigStat value={`${rateHz.toFixed(1)} Hz`} caption={`last ${RATE_WINDOW_S} s (want 1–2 Hz)`}
                         level={last ? (rateHz >= 0.9 ? "ok" : "warn") : undefined} />
            </div>

            <AckTimeline acks={acks} now={now} />

            <div className="mt-2 divide-y">
                <Field label="Time since last ACK" value={last ? formatAge(last.receivedAt, now) : "waiting for first ACK"}
                       level={level}
                       title={`Latency infraction after ${LATENCY_S} s, disconnect after ${DISCONNECT_S} s without telemetry`} />
                <Field label="Last ACKed GPS time" value={last ? formatClock(last.unixTime, { unixSeconds: true }) : "—"} />
                <Field label="ACKed telemetry age" value={telemetryAgeS != null ? `${telemetryAgeS.toFixed(1)} s` : "—"}
                       level={gapLevel(telemetryAgeS)}
                       title="Now minus the GPS timestamp of the last ACKed sample. Assumes this computer's clock is close to GPS time." />
                <Field label="Source of last ACK" value={last ? sourceLabel(last.source) : "—"} />
            </div>
        </Panel>
    );
}

function sourceLabel(source) {
    if (source === "shepard") return "forwarded by Shepard";
    if (source === "poll") return "Emu telemetry_request";
    return source;
}

/** One cell per second for the last minute: filled if an ACKed sample has that GPS second. */
function AckTimeline({ acks, now }) {
    const nowS = Math.floor(now / 1000);
    const seconds = new Set(acks.map((a) => Math.floor(a.unixTime)));
    const cells = [];
    for (let s = nowS - TIMELINE_S + 1; s <= nowS; s++) cells.push(seconds.has(s));

    return (
        <div className="mt-4" title="Each cell is one second of GPS time; filled when the server ACKed telemetry from that second">
            <div className="flex h-5 gap-px">
                {cells.map((hit, i) => (
                    <div key={i} className={cn("flex-1 rounded-[1px]", hit ? "bg-emerald-500" : "bg-neutral-200")} />
                ))}
            </div>
            <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
                <span>−{TIMELINE_S} s</span>
                <span>now</span>
            </div>
        </div>
    );
}

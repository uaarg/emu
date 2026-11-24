// Infraction counter (#60): the server's per-infraction totals for our UAV.
import { useEffect, useRef, useState } from "react";

import { BigStat, Field, Panel } from "./common";
import { INFRACTIONS, infractionLabel, totalInfractions } from "@/lib/infractions";
import { formatAge, formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

const HIGHLIGHT_MS = 10_000;

export default function InfractionCounter({ infractions, now }) {
    const total = totalInfractions(infractions);
    const changedAt = useChangedAt(infractions);

    return (
        <Panel title="Infractions" issue="#60"
               actions={infractions && <span className="text-xs text-muted-foreground">updated {formatAge(infractions.receivedAt, now)} ago</span>}>
            {!infractions ? (
                <p className="text-sm text-muted-foreground">No infraction data yet. Emu asks the server every 5 s once it is connected.</p>
            ) : (
                <>
                    <div className="flex items-end justify-between gap-4">
                        <BigStat value={total} caption="total infractions" level={total > 0 ? "bad" : "ok"} />
                        <BigStat value={formatNumber(infractions.score, 1)} caption="score (this criterion)" />
                        <BigStat value={formatNumber(infractions.armed_seconds, 0, "s")} caption="armed telemetry" />
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-1.5">
                        {INFRACTIONS.map(({ key, label, rule }) => {
                            const count = Number(infractions[key]) || 0;
                            const fresh = changedAt[key] && now - changedAt[key] < HIGHLIGHT_MS;
                            return (
                                <div key={key} title={rule}
                                     className={cn("flex items-center justify-between rounded-md border px-2 py-1 text-sm transition-colors",
                                                   count > 0 && "border-red-200 bg-red-50",
                                                   fresh && "border-red-400 bg-red-100")}>
                                    <span className="truncate">{label}</span>
                                    <span className={cn("ml-2 font-mono tabular-nums", count > 0 ? "text-red-700" : "text-muted-foreground")}>{count}</span>
                                </div>
                            );
                        })}
                    </div>

                    <div className="mt-2">
                        <Field label="Last infraction" value={infractions.last_infraction ? infractionLabel(infractions.last_infraction) : "none"}
                               level={infractions.last_infraction ? "bad" : undefined} />
                        <Field label="Site" value={<span className="text-xs">{infractions.siteId ?? "—"}</span>} />
                    </div>
                </>
            )}
        </Panel>
    );
}

/** Remembers when each infraction count last went up, so new ones can be highlighted. */
function useChangedAt(infractions) {
    const previous = useRef(null);
    const [changedAt, setChangedAt] = useState({});
    useEffect(() => {
        if (!infractions) return;
        const prev = previous.current;
        if (prev) {
            const bumped = INFRACTIONS.filter(({ key }) => (Number(infractions[key]) || 0) > (Number(prev[key]) || 0));
            if (bumped.length) {
                const at = Date.now();
                setChangedAt((old) => ({ ...old, ...Object.fromEntries(bumped.map(({ key }) => [key, at])) }));
            }
        }
        previous.current = infractions;
    }, [infractions]);
    return changedAt;
}

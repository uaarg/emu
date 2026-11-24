// Simulated traffic from the server, with our UAV's separation from each aircraft.
import { Panel } from "./common";
import { distanceM, formatAge, formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

export default function TrafficCard({ traffic, ownPosition, now }) {
    const aircraft = traffic?.traffic ?? [];
    return (
        <Panel title="Traffic"
               actions={traffic && <span className="text-xs text-muted-foreground">updated {formatAge(traffic.receivedAt, now)} ago</span>}>
            {!traffic ? (
                <p className="text-sm text-muted-foreground">No traffic data. The server pushes it every second once Emu is connected.</p>
            ) : (
                <table className="w-full text-left text-xs">
                    <thead className="text-muted-foreground">
                        <tr>
                            <th className="py-1 pr-2 font-normal">aircraft</th>
                            <th className="py-1 pr-2 font-normal text-right">alt</th>
                            <th className="py-1 pr-2 font-normal text-right">speed</th>
                            <th className="py-1 pr-2 font-normal text-right">hdg</th>
                            <th className="py-1 font-normal text-right" title="Horizontal / vertical distance from our last known position; red when inside the keep-away">separation</th>
                        </tr>
                    </thead>
                    <tbody className="font-mono">
                        {aircraft.map((a) => {
                            const sep = separation(a, ownPosition);
                            return (
                                <tr key={a.aircraftIndex} className={cn("border-t", sep?.inside && "bg-red-50")}>
                                    <td className="py-1 pr-2 font-sans">{a.name}</td>
                                    <td className="py-1 pr-2 text-right">{formatNumber(a.position.altitude, 0, "m")}</td>
                                    <td className="py-1 pr-2 text-right">{formatNumber(a.position.speed, 1, "m/s")}</td>
                                    <td className="py-1 pr-2 text-right">{formatNumber(a.position.direction, 0, "°")}</td>
                                    <td className={cn("py-1 text-right", sep?.inside && "text-red-700")}
                                        title={`keep-away ${a.horizontalKeepAway} m horizontal, ${a.verticalKeepAway} m vertical`}>
                                        {sep ? `${sep.h.toFixed(0)} / ${sep.v.toFixed(0)} m` : "—"}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            )}
            {traffic && <div className="mt-2 truncate text-[10px] text-muted-foreground">site {traffic.siteId}</div>}
        </Panel>
    );
}

function separation(aircraft, own) {
    if (!own || own.latitude == null || own.longitude == null) return null;
    const h = distanceM(own.latitude, own.longitude, aircraft.position.lat, aircraft.position.lon);
    const v = Math.abs((own.altitudeAGL ?? 0) - aircraft.position.altitude);
    return { h, v, inside: h < aircraft.horizontalKeepAway && v < aircraft.verticalKeepAway };
}

// ACK console (#58): one line per telemetry ACK, newest first.
import { Panel } from "./common";
import { ScrollArea } from "./ui/scroll-area";
import { formatClock, formatCoord, formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

const SHOWN = 100;

export default function AckConsole({ acks, className }) {
    const rows = acks.slice(-SHOWN).reverse();
    return (
        <Panel title="ACK console" issue="#58" className={className}
               actions={<span className="text-xs text-muted-foreground">last {Math.min(acks.length, SHOWN)} of {acks.length} kept</span>}>
            <ScrollArea className="h-72">
                <table className="w-full text-left font-mono text-xs">
                    <thead className="sticky top-0 bg-card text-muted-foreground">
                        <tr>
                            <th className="py-1 pr-3 font-normal">received</th>
                            <th className="py-1 pr-3 font-normal">GPS time</th>
                            <th className="py-1 pr-3 font-normal">lat, lon</th>
                            <th className="py-1 pr-3 font-normal">alt</th>
                            <th className="py-1 pr-3 font-normal">mode</th>
                            <th className="py-1 pr-3 font-normal">batt</th>
                            <th className="py-1 pr-3 font-normal">boundary</th>
                            <th className="py-1 pr-3 font-normal">traffic</th>
                            <th className="py-1 font-normal">via</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.length === 0 && (
                            <tr><td colSpan={9} className="py-6 text-center text-muted-foreground">No ACKs yet. They appear once Shepard is streaming telemetry.</td></tr>
                        )}
                        {rows.map((ack) => {
                            const problem = ack.insideBoundary === false || ack.tooCloseToTraffic;
                            return (
                                <tr key={`${ack.uavId}@${ack.unixTime}`} className={cn("border-t", problem && "bg-red-50")}>
                                    <td className="py-0.5 pr-3">{formatClock(ack.receivedAt)}</td>
                                    <td className="py-0.5 pr-3">{formatClock(ack.unixTime, { unixSeconds: true })}</td>
                                    <td className="py-0.5 pr-3">{formatCoord(ack.latitude)}, {formatCoord(ack.longitude)}</td>
                                    <td className="py-0.5 pr-3">{formatNumber(ack.altitudeAGL, 1)}</td>
                                    <td className="py-0.5 pr-3">{ack.mode}</td>
                                    <td className="py-0.5 pr-3">{formatNumber(ack.batteryPercentage, 0)}%</td>
                                    <td className={cn("py-0.5 pr-3", ack.insideBoundary === false && "text-red-700")}>{ack.insideBoundary === false ? "OUTSIDE" : "in"}</td>
                                    <td className={cn("py-0.5 pr-3", ack.tooCloseToTraffic && "text-red-700")}>{ack.tooCloseToTraffic ? "TOO CLOSE" : "clear"}</td>
                                    <td className="py-0.5 text-muted-foreground">{ack.source}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </ScrollArea>
        </Panel>
    );
}

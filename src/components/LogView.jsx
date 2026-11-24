// Logs from Shepard and Emu, plus messages the telemetry server rejected.
import { Panel } from "./common";
import { ScrollArea } from "./ui/scroll-area";
import { formatClock } from "@/lib/format";
import { cn } from "@/lib/utils";

const ROW_STYLE = {
    warning: "bg-amber-50",
    error: "bg-red-50",
};

export default function LogView({ logs, serverErrors, className }) {
    const rows = [
        ...logs,
        ...serverErrors.map((e) => ({ source: "server", severity: "error", message: e.message, receivedAt: e.receivedAt })),
    ].sort((a, b) => b.receivedAt - a.receivedAt);

    return (
        <Panel title="Logs" className={className}>
            <ScrollArea className="h-56">
                <table className="w-full text-left text-xs">
                    <tbody>
                        {rows.length === 0 && (
                            <tr><td className="py-6 text-center text-muted-foreground">Nothing logged yet.</td></tr>
                        )}
                        {rows.map((log, i) => (
                            <tr key={`${log.receivedAt}-${i}`} className={cn("border-t align-top", ROW_STYLE[log.severity])}>
                                <td className="whitespace-nowrap py-0.5 pr-3 font-mono">{formatClock(log.receivedAt)}</td>
                                <td className="whitespace-nowrap py-0.5 pr-3 text-muted-foreground">{log.source}</td>
                                <td className="py-0.5">{log.message}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </ScrollArea>
        </Panel>
    );
}

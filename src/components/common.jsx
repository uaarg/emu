// Small building blocks shared by the dashboard cards.
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { cn } from "@/lib/utils";

const LEVEL_DOT = {
    ok: "bg-emerald-500",
    warn: "bg-amber-500",
    bad: "bg-red-500",
    idle: "bg-neutral-300",
};

const LEVEL_TEXT = {
    ok: "text-emerald-700",
    warn: "text-amber-700",
    bad: "text-red-700",
    idle: "text-muted-foreground",
};

export function StatusDot({ level = "idle", className }) {
    return <span className={cn("inline-block h-2.5 w-2.5 shrink-0 rounded-full", LEVEL_DOT[level], className)} />;
}

/** A labelled connection indicator, e.g. "● Telemetry server  connected". */
export function StatusPill({ label, level, text, title }) {
    return (
        <div className="flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm" title={title}>
            <StatusDot level={level} />
            <span className="font-medium">{label}</span>
            <span className={cn("font-mono text-xs", LEVEL_TEXT[level])}>{text}</span>
        </div>
    );
}

/** One label/value row inside a card. */
export function Field({ label, value, level, title }) {
    return (
        <div className="flex items-baseline justify-between gap-3 py-1 text-sm" title={title}>
            <span className="text-muted-foreground">{label}</span>
            <span className={cn("font-mono tabular-nums text-right", level && LEVEL_TEXT[level])}>{value}</span>
        </div>
    );
}

/** A big number with a caption, for the counters. */
export function BigStat({ value, caption, level }) {
    return (
        <div>
            <div className={cn("text-4xl font-semibold tabular-nums leading-none", level && LEVEL_TEXT[level])}>{value}</div>
            <div className="mt-1 text-xs text-muted-foreground">{caption}</div>
        </div>
    );
}

/** Card with a title, an optional issue tag and optional right-hand header content. */
export function Panel({ title, issue, actions, className, contentClassName, children }) {
    return (
        <Card className={cn("flex min-h-0 flex-col shadow-sm", className)}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4 pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                    {title}
                    {issue && <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] font-normal text-muted-foreground">{issue}</span>}
                </CardTitle>
                {actions}
            </CardHeader>
            <CardContent className={cn("min-h-0 flex-1 p-4 pt-2", contentClassName)}>{children}</CardContent>
        </Card>
    );
}

export function Flag({ on, onText, offText, bad = true }) {
    const level = on ? (bad ? "bad" : "ok") : (bad ? "ok" : "idle");
    return <span className={cn("font-mono text-xs", LEVEL_TEXT[level])}>{on ? onText : offText}</span>;
}

// Top bar: connection status for every link, and the Shepard URL.
import { useState } from "react";

import { StatusPill } from "./common";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { connectShepard, disconnectShepard } from "@/lib/groundStation";

export default function StatusBar({ state, backendConnected }) {
    const { atc, shepard } = state;
    return (
        <header className="flex flex-wrap items-center gap-3 border-b bg-card px-4 py-3">
            <h1 className="mr-2 text-lg font-semibold">Emu</h1>
            <StatusPill label="Backend" level={backendConnected ? "ok" : "bad"} text={backendConnected ? "connected" : "reconnecting…"} />
            <StatusPill label="Telemetry server"
                        level={!atc.enabled ? "idle" : atc.connected ? "ok" : "bad"}
                        text={!atc.enabled ? "disabled" : atc.connected ? "connected" : "disconnected"}
                        title={atc.enabled ? atc.url : "Start the backend with AEAC_CONNECTION_TOKEN (or ATC_URL) set"} />
            <StatusPill label="Shepard"
                        level={shepard.connected ? "ok" : shepard.url ? "bad" : "idle"}
                        text={shepard.connected ? `connected${shepard.mode ? ` · ${shepard.mode}` : ""}` : shepard.url ? "connecting…" : "not connected"}
                        title={shepard.url ?? undefined} />
            {state.uavId && <span className="text-sm text-muted-foreground">UAV <span className="font-mono">{state.uavId}</span></span>}
            <ShepardConnect shepard={shepard} disabled={!backendConnected} />
        </header>
    );
}

function ShepardConnect({ shepard, disabled }) {
    const [url, setUrl] = useState("");
    const [error, setError] = useState(null);
    const active = Boolean(shepard.url);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        try {
            if (active) await disconnectShepard();
            else if (url.trim()) await connectShepard(url.trim());
        } catch (err) {
            setError(err.message);
        }
    };

    return (
        <form className="ml-auto flex items-center gap-2" onSubmit={handleSubmit}>
            {error && <span className="text-xs text-red-700">{error}</span>}
            <Input className="h-9 w-64" type="text" value={active ? shepard.url : url} readOnly={active}
                   onChange={(e) => setUrl(e.target.value)} placeholder="Shepard URL, e.g. http://127.0.0.1:8080" />
            <Button type="submit" variant="outline" size="sm" disabled={disabled}>{active ? "Disconnect" : "Connect"}</Button>
        </form>
    );
}

/*
 * Emu backend: the hub between Shepard, the AEAC telemetry server and the frontend.
 *
 *   Shepard  --ws-->  Emu backend  <--ws-->  AEAC telemetry server
 *                         |
 *                         v  ws /ws (see browserHub.js, groundState.js)
 *                     Emu frontend
 *
 * Env:
 *   AEAC_CONNECTION_TOKEN  token from the AEAC Credentials page (never commit it)
 *   ATC_URL                telemetry server URL override, e.g. a local mock
 *   UAV_ID                 UAV identifier Shepard uses (default "UAARG")
 *   SHEPARD_URL            connect to Shepard on startup (can also be set from the frontend)
 *   PORT                   default 3000
 */

import express from "express";

import { ATC } from "./atc.js";
import { attachBrowserHub } from "./browserHub.js";
import { GroundState } from "./groundState.js";
import { ShepardLink } from "./shepardLink.js";

const PORT = Number(process.env.PORT) || 3000;
const UAV_ID = process.env.UAV_ID || "UAARG";

// The telemetry server allows 4 messages/s per connection. Emu only sends
// requests on its own connection (Shepard sends the telemetry), so 1 + 0.2 /s.
const ACK_POLL_MS = 1000;
const INFRACTION_POLL_MS = 5000;

// The server answers telemetry_request with this error until the UAV has sent telemetry
const NO_TELEMETRY_ERROR = "No telemetry is available for this UAV.";

const state = new GroundState({ uavId: UAV_ID });

// ----------------------
// Telemetry server (#61)
// ----------------------
const atcUrl = process.env.ATC_URL ?? (process.env.AEAC_CONNECTION_TOKEN ? ATC.COMPETITION_URL : null);
const atc = atcUrl ? new ATC(atcUrl, { token: process.env.AEAC_CONNECTION_TOKEN }) : null;

// Don't flood the error list with the same message every poll
let lastError = { message: null, at: 0 };
function recordServerError(message) {
    const now = Date.now();
    if (message === lastError.message && now - lastError.at < 30_000) return;
    lastError = { message, at: now };
    state.addServerError(message);
}

if (atc) {
    const pushStatus = () => state.setAtcStatus({ enabled: true, ...atc.status() });
    atc.events.on("open", () => {
        pushStatus();
        // Ask straight away instead of waiting for the first poll
        atc.requestTelemetry(UAV_ID);
        atc.requestInfractions(UAV_ID);
    });
    atc.events.on("close", pushStatus);
    atc.events.on("telemetry_ack", (msg) => state.recordAck(msg, "poll"));
    atc.events.on("infraction", (msg) => state.setInfractions(msg));
    atc.events.on("traffic", (msg) => state.setTraffic(msg.payload));
    atc.events.on("error", (msg) => {
        // Expected until Shepard streams; the ACK card shows "waiting for first ACK" instead
        if (msg.message !== NO_TELEMETRY_ERROR) recordServerError(msg.message);
    });

    setInterval(() => atc.requestTelemetry(UAV_ID), ACK_POLL_MS).unref();
    setInterval(() => atc.requestInfractions(UAV_ID), INFRACTION_POLL_MS).unref();

    pushStatus();
    atc.startComms();
} else {
    console.log("Telemetry server connection disabled (set AEAC_CONNECTION_TOKEN or ATC_URL to enable)");
}

// ----------------------
// Shepard
// ----------------------
let shepard = null;
let shepardMode = null;

function pushShepardStatus() {
    state.setShepardStatus(shepard ? { ...shepard.status(), mode: shepardMode } : { url: null, connected: false, mode: null });
}

function handleShepardMessage(msg) {
    switch (msg.type) {
        case "log":
            state.addLog("shepard", String(msg.message), msg.severity);
            break;
        case "status":
            if (msg.status === "mode") {
                shepardMode = msg.value;
                pushShepardStatus();
            }
            break;
        case "telemetry":
            state.setShepardTelemetry(msg.packet, Boolean(msg.atc_connected));
            break;
        case "atc": {
            // A telemetry server message Shepard forwarded (e.g. the ACK for its own telemetry)
            const event = msg.event ?? {};
            if (event.event === "telemetry_ack") state.recordAck(event, "shepard");
            else if (event.event === "infraction") state.setInfractions(event);
            else if (event.event === "error" && event.message !== NO_TELEMETRY_ERROR) {
                recordServerError(`(via Shepard) ${event.message}`);
            }
            break;
        }
        default:
            break; // e.g. "img", from the imaging code that was removed
    }
}

async function connectShepard(url) {
    await disconnectShepard();
    shepardMode = null;
    shepard = new ShepardLink(url, { onStatus: pushShepardStatus, onMessage: handleShepardMessage });
    shepard.startComms();
    pushShepardStatus();
    state.addLog("emu", `connecting to Shepard at ${shepard.url}`);
}

async function disconnectShepard() {
    if (!shepard) return;
    const old = shepard;
    shepard = null;
    await old.stop();
    pushShepardStatus();
    state.addLog("emu", "disconnected from Shepard");
}

// ----------------------
// HTTP API
// ----------------------
const app = express();
app.use(express.json());

app.get("/api/state", (_, res) => res.json(state.snapshot()));

app.get("/api/atc/status", (_, res) => {
    res.json(atc ? { enabled: true, ...atc.status() } : { enabled: false });
});

app.post("/api/shepard/connect", async (req, res) => {
    const url = req.body?.url;
    if (typeof url !== "string" || !url.trim()) {
        return res.status(400).json({ error: 'Expected { "url": "http://<shepard-ip>:8080" }' });
    }
    try {
        await connectShepard(url);
    } catch (err) {
        return res.status(400).json({ error: `Invalid Shepard URL: ${err.message}` });
    }
    res.json(state.shepard);
});

app.post("/api/shepard/disconnect", async (_, res) => {
    await disconnectShepard();
    res.json(state.shepard);
});

const server = app.listen(PORT, () => {
    console.log(`Backend running on http://localhost:${PORT}`);
});
attachBrowserHub(server, state);

if (process.env.SHEPARD_URL) {
    connectShepard(process.env.SHEPARD_URL).catch((err) => console.error(`SHEPARD_URL: ${err.message}`));
}

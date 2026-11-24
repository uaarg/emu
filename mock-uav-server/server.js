/**
 * Fake Shepard for local Emu testing (no drone, no Python).
 *
 * Behaves like Shepard's Emu server (src/modules/emu/emu.py) plus its
 * TelemetrySender, using the Shepard -> Emu messages Emu's backend understands
 * (src/server/shepardLink.js):
 *   { type: "log", message, severity }
 *   { type: "status", status: "mode", value }
 *   { type: "telemetry", packet, atc_connected }   every second
 *   { type: "atc", event }                          server messages forwarded, e.g. telemetry_ack
 *
 * It streams the telemetry to a telemetry server (default: the Node mock in
 * atc-mock.js) and forwards the server's ACKs to Emu, like real Shepard should.
 *
 * Usage (from the repo root):
 *   npm run mock-atc                      # terminal 1: fake telemetry server on :8766
 *   npm run mock-shepard                  # terminal 2: this, Emu server on :8080
 *   ATC_URL=ws://127.0.0.1:8766 AEAC_CONNECTION_TOKEN=test npm run server
 *   npm run dev                           # then connect to http://127.0.0.1:8080 in the top bar
 *
 *   curl -X POST localhost:8080/toggle-atc   # simulate Shepard's server link dropping / coming back
 *
 * Env: PORT (8080), HOST, ATC_URL (ws://127.0.0.1:8766), AEAC_CONNECTION_TOKEN ("test"), UAV_ID ("UAARG")
 */

import http from "node:http";
import WebSocket, { WebSocketServer } from "ws";

const PORT = Number(process.env.PORT) || 8080;
const HOST = process.env.HOST || "127.0.0.1";
const ATC_URL = process.env.ATC_URL || "ws://127.0.0.1:8766";
const TOKEN = process.env.AEAC_CONNECTION_TOKEN || "test";
const UAV_ID = process.env.UAV_ID || "UAARG";

const emuClients = new Set();
let atcSocket = null;
let atcEnabled = true; // false = pretend Shepard's link to the server dropped
const start = Date.now();

function toEmu(obj) {
  const data = JSON.stringify(obj);
  for (const ws of emuClients) if (ws.readyState === WebSocket.OPEN) ws.send(data);
}

function log(message, severity = "normal") {
  console.log(`[fake-shepard] ${message}`);
  toEmu({ type: "log", message, severity });
}

// ---- Telemetry server link ----
function connectAtc() {
  if (!atcEnabled) return;
  const sep = ATC_URL.includes("?") ? "&" : "?";
  const ws = new WebSocket(`${ATC_URL}${sep}Authorization=${encodeURIComponent(TOKEN)}`);
  ws.on("open", () => { atcSocket = ws; log(`connected to telemetry server ${ATC_URL}`); });
  ws.on("message", (raw) => {
    let event;
    try { event = JSON.parse(raw.toString()); } catch { return; }
    // Forward what Emu needs; traffic Emu already gets on its own connection
    if (event.event !== "traffic") toEmu({ type: "atc", event });
  });
  ws.on("error", () => {});
  ws.on("close", () => {
    if (atcSocket === ws) { atcSocket = null; log("telemetry server connection closed", "warning"); }
    setTimeout(connectAtc, 2000);
  });
}

// ---- Fake telemetry, 1 Hz ----
function fakePacket() {
  const t = (Date.now() - start) / 1000;
  return {
    uavId: UAV_ID,
    unixTime: Date.now() / 1000,
    latitude: 53.4975 + 0.0004 * Math.sin(t / 30),
    longitude: -113.5535 + 0.0006 * Math.cos(t / 30),
    altitudeAGL: 30,
    horizontalPositionAccuracy: 0.8,
    verticalPositionAccuracy: 1.2,
    batteryPercentage: Math.max(0, 100 - t / 20),
    mode: "idle",
    rcLinkStatus: 1,
    telemetryLinkStatus: 1,
  };
}

setInterval(() => {
  const packet = fakePacket();
  let sent = false;
  if (atcEnabled && atcSocket?.readyState === WebSocket.OPEN) {
    atcSocket.send(JSON.stringify({ action: "telemetry", data: packet }));
    sent = true;
  }
  toEmu({ type: "telemetry", packet, atc_connected: sent });
}, 1000);

// ---- Emu server ----
const server = http.createServer((req, res) => {
  if (req.method === "POST" && req.url === "/toggle-atc") {
    atcEnabled = !atcEnabled;
    if (atcEnabled) connectAtc();
    else { const ws = atcSocket; atcSocket = null; ws?.close(); }
    log(atcEnabled ? "telemetry server link restored (simulated)" : "telemetry server link DROPPED (simulated)",
        atcEnabled ? "normal" : "warning");
    res.writeHead(200, { "Content-Type": "application/json" }).end(JSON.stringify({ atcEnabled }));
    return;
  }
  res.writeHead(404).end();
});

const wss = new WebSocketServer({ server, path: "/ws" });
wss.on("connection", (ws) => {
  emuClients.add(ws);
  ws.on("close", () => emuClients.delete(ws));
  ws.send(JSON.stringify({ type: "status", status: "mode", value: "idle" }));
  log("Emu connected");
});

server.listen(PORT, HOST, () => {
  console.log(`[fake-shepard] Emu server on http://${HOST}:${PORT} (ws path /ws), telemetry server ${ATC_URL}`);
  connectAtc();
});

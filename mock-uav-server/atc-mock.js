/**
 * Mock AEAC competition telemetry server, for testing Emu's ATC client
 * without a real connection token. Follows https://aeac.mylonics.com/#/connect.
 *
 * Usage (from the repo root):
 *   node mock-uav-server/atc-mock.js            # listens on ws://127.0.0.1:8766
 *   ATC_URL=ws://127.0.0.1:8766 AEAC_CONNECTION_TOKEN=test npm run server
 *
 * Env: PORT, HOST, MOCK_TOKEN (default "test"; the token clients must send).
 */

import http from "node:http";
import { pathToFileURL } from "node:url";
import { WebSocketServer } from "ws";

const INFRACTION_NAMES = [
    "uav_in_traffic", "slow_telem", "fast_telem", "latency",
    "disconnect", "startup", "invalid_gps", "uav_left_boundary",
];
const REQUIRED = [
    "uavId", "unixTime", "latitude", "longitude", "altitudeAGL",
    "horizontalPositionAccuracy", "verticalPositionAccuracy", "batteryPercentage",
    "mode", "rcLinkStatus", "telemetryLinkStatus",
];
const SITE_ID = "mock-site";

/** Starts the mock. Returns { server, wss, port, close() }. */
export function startMockAtc({ port = 8766, host = "127.0.0.1", token = "test", trafficMs = 1000, autoPong = true } = {}) {
    const lastTelemetry = new Map();
    const server = http.createServer((_req, res) => { res.writeHead(426).end(); });
    const wss = new WebSocketServer({ noServer: true, autoPong });

    server.on("upgrade", (req, socket, head) => {
        const auth = new URL(req.url, "http://x").searchParams.get("Authorization");
        if (auth !== token) {
            socket.end("HTTP/1.1 401 Unauthorized\r\n\r\n");
            return;
        }
        wss.handleUpgrade(req, socket, head, (ws) => wss.emit("connection", ws, req));
    });

    wss.on("connection", (ws) => {
        const send = (obj) => ws.send(JSON.stringify(obj));
        const error = (message) => send({ event: "error", message });

        ws.on("message", (raw) => {
            let msg;
            try { msg = JSON.parse(raw.toString()); } catch { return error("malformed JSON"); }
            const data = msg?.data ?? {};
            switch (msg?.action) {
                case "telemetry": {
                    const missing = REQUIRED.filter((f) => data[f] === undefined || data[f] === null);
                    if (missing.length) return error(`missing fields: ${missing.join(", ")}`);
                    const ack = { event: "telemetry_ack", ...data, siteId: SITE_ID,
                                  insideBoundary: true, tooCloseToTraffic: false };
                    lastTelemetry.set(data.uavId, ack);
                    return send(ack);
                }
                case "telemetry_request": {
                    const ack = lastTelemetry.get(data.uavId);
                    return ack ? send(ack) : error("No telemetry is available for this UAV.");
                }
                case "infraction_request": {
                    const counts = Object.fromEntries(INFRACTION_NAMES.map((n) => [n, 0]));
                    return send({ event: "infraction", uavId: data.uavId, siteId: SITE_ID, ...counts,
                                  last_infraction: null, score: 100, armed_seconds: 0 });
                }
                default:
                    return error(`unknown action: ${msg?.action}`);
            }
        });

        const traffic = setInterval(() => send({
            event: "traffic",
            payload: { siteId: SITE_ID, traffic: [{
                aircraftIndex: 0, name: "Mock Cessna", horizontalKeepAway: 50, verticalKeepAway: 20,
                position: { lat: 53.4955, lon: -113.548, altitude: 60, speed: 15, direction: 90 },
            }] },
        }), trafficMs);
        ws.on("close", () => clearInterval(traffic));
    });

    return new Promise((resolve) => {
        server.listen(port, host, () => {
            resolve({
                server, wss, port: server.address().port,
                close: () => new Promise((done) => {
                    for (const client of wss.clients) client.terminate();
                    server.close(() => done());
                }),
            });
        });
    });
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
    const port = Number(process.env.PORT) || 8766;
    const host = process.env.HOST || "127.0.0.1";
    const token = process.env.MOCK_TOKEN || "test";
    await startMockAtc({ port, host, token });
    console.log(`Mock ATC server on ws://${host}:${port} (token "${token}")`);
}

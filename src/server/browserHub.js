/*
 * BrowserHub: pushes GroundState to every open Emu frontend over a WebSocket.
 *
 * Browser <- backend:  { type: "snapshot", state }  once on connect
 *                      { type: <update>, ... }      every change (see groundState.js)
 */

import { WebSocketServer } from "ws";

export function attachBrowserHub(httpServer, groundState, { path = "/ws" } = {}) {
    const wss = new WebSocketServer({ server: httpServer, path });

    wss.on("connection", (ws) => {
        ws.send(JSON.stringify({ type: "snapshot", state: groundState.snapshot() }));
    });

    groundState.on("update", (update) => {
        const data = JSON.stringify(update);
        for (const client of wss.clients) {
            if (client.readyState === client.OPEN) client.send(data);
        }
    });

    return wss;
}

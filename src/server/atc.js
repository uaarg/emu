/*
 * ATC ("Air Traffic Control"): Emu's redundant WebSocket client for the AEAC
 * telemetry server (issue #61). Node port of Shepard's src/modules/atc/atc.py.
 *
 * Normally Shepard streams telemetry to the server. Emu keeps its own
 * connection open so it can take over as the secondary link (#59) if
 * Shepard's link drops. It does NOT send telemetry on its own: two streams for
 * the same uavId would trigger fast_telem infractions.
 *
 * Every message from the server is emitted as a "message" event (parsed JSON),
 * plus an event named after the server event ("traffic", "infraction", ...).
 */

import { EventEmitter } from "node:events";

import { WebSocketBase } from "./websocketBase.js";
import { formatInfractionRequest, formatTelemetry, formatTelemetryRequest, parseMessage } from "./atcMessages.js";

export class ATC extends WebSocketBase {
    // From https://aeac.mylonics.com/#/connect
    static COMPETITION_URL = "wss://o61e21rvtd.execute-api.ca-central-1.amazonaws.com/prod";

    /**
     * @param {string} url  telemetry server URL (ATC.COMPETITION_URL, or a mock server)
     * @param {object} opts
     * @param {string} [opts.token]  connection token from the AEAC Credentials page.
     *        Sent as the "Authorization" query parameter. Never commit it; read it
     *        from the AEAC_CONNECTION_TOKEN environment variable.
     */
    constructor(url, { token, ...baseOpts } = {}) {
        super("atc", baseOpts);
        this.url = url; // without the token, safe to log
        this._connectUrl = url;
        if (token) {
            const separator = url.includes("?") ? "&" : "?";
            this._connectUrl = `${url}${separator}Authorization=${encodeURIComponent(token.trim())}`;
        }

        this.events = new EventEmitter();
        // EventEmitter throws on an "error" event nobody listens to; the server's
        // "error" events are already logged in onMessage, so swallow them here.
        this.events.on("error", () => {});
        this.lastMessageAt = null; // Date.now() of the last message received
        this.receivedCount = 0;
    }

    connectUrl() {
        return this._connectUrl;
    }

    logUrl() {
        return this.url;
    }

    // ----------------------
    // Public interface
    // ----------------------
    /**
     * Sends a raw message if connected right now. Returns false (and does NOT
     * queue it) when disconnected: old telemetry is useless to the server, and
     * queueing would replay a burst of stale messages on reconnect.
     */
    sendNow(packet) {
        if (!this.connected) return false;
        this.send(packet);
        return true;
    }

    /** Sends one telemetry packet (server field names). Only for failover (#59). */
    sendTelemetry(data) {
        return this.sendNow(formatTelemetry(data));
    }

    /** Asks for the latest telemetry_ack for uavId. Mind the 4 messages/s limit. */
    requestTelemetry(uavId) {
        return this.sendNow(formatTelemetryRequest(uavId));
    }

    /** Asks for uavId's infraction totals. Mind the 4 messages/s limit. */
    requestInfractions(uavId) {
        return this.sendNow(formatInfractionRequest(uavId));
    }

    status() {
        return {
            url: this.url,
            connected: this.connected,
            lastMessageAt: this.lastMessageAt,
            receivedCount: this.receivedCount,
        };
    }

    // ----------------------
    // WebSocketBase hooks
    // ----------------------
    onOpen() {
        // Drop anything left over from a previous connection (it's stale)
        if (this.sendQueue.length > 0) {
            this.log("info", `dropped ${this.sendQueue.length} stale outgoing message(s) on reconnect`);
            this.sendQueue.length = 0;
        }
        this.events.emit("open");
    }

    onClose() {
        this.events.emit("close");
    }

    onMessage(data) {
        this.log("debug", `received: ${data}`);
        const msg = parseMessage(data);
        if (msg === null) {
            this.log("warn", `ignoring non-JSON message: ${data.slice(0, 200)}`);
            return;
        }
        this.lastMessageAt = Date.now();
        this.receivedCount += 1;
        if (msg.event === "error") {
            this.log("error", `server rejected a message: ${msg.message}`);
        }
        this.events.emit("message", msg);
        if (typeof msg.event === "string") this.events.emit(msg.event, msg);
    }
}

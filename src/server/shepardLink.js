/*
 * ShepardLink: the backend's connection to Shepard (src/modules/emu/emu.py).
 *
 * Messages Shepard sends Emu ({"type": ...}):
 *   log        { message, severity }                    Emu.send_log()
 *   status     { status: "mode", value }                drone mode
 *   telemetry  { packet, atc_connected }                TelemetrySender copy (shepard#104, emu#59)
 *   atc        { event: <telemetry server message> }    forwarded server messages, e.g. ACKs (emu#58)
 * Anything else (e.g. the old "img") is ignored.
 */

import { WebSocketBase } from "./websocketBase.js";
import { parseMessage } from "./atcMessages.js";

export class ShepardLink extends WebSocketBase {
    /**
     * @param {string} url       Shepard's base URL, e.g. http://192.168.1.10:8080 (or ws://.../ws)
     * @param {object} handlers  { onStatus(status), onMessage(msg) }
     */
    constructor(url, { onStatus, onMessage }, opts = {}) {
        super("shepard", opts);
        this.url = ShepardLink.normalizeUrl(url);
        this.lastMessageAt = null;
        this._onStatus = onStatus;
        this._onMessage = onMessage;
    }

    /** Accepts http(s)://host:port, ws(s)://host:port or .../ws; returns ws(s)://host:port/ws */
    static normalizeUrl(url) {
        const parsed = new URL(url.trim());
        if (parsed.protocol === "http:") parsed.protocol = "ws:";
        if (parsed.protocol === "https:") parsed.protocol = "wss:";
        if (parsed.protocol !== "ws:" && parsed.protocol !== "wss:") {
            throw new Error(`unsupported protocol ${parsed.protocol}`);
        }
        if (!parsed.pathname.endsWith("/ws")) parsed.pathname = parsed.pathname.replace(/\/$/, "") + "/ws";
        return parsed.toString();
    }

    connectUrl() {
        return this.url;
    }

    status() {
        return { url: this.url, connected: this.connected, lastMessageAt: this.lastMessageAt };
    }

    onOpen() {
        this._onStatus(this.status());
    }

    onClose() {
        this._onStatus(this.status());
    }

    onMessage(data) {
        const msg = parseMessage(data);
        if (msg === null) {
            this.log("warn", `ignoring non-JSON message: ${data.slice(0, 200)}`);
            return;
        }
        this.lastMessageAt = Date.now();
        this._onMessage(msg);
    }
}

/*
 * WebSocketBase: a reconnecting WebSocket client.
 *
 * Node port of Shepard's src/modules/emu/websocket.py (WebSocketBase), so the
 * Emu and Shepard telemetry-server clients behave the same way:
 *   - startComms() connects, and keeps reconnecting until stop() is called
 *   - send() queues a text message; queued messages go out while connected
 *   - onMessage(data) is called for every text message (override it)
 *   - a ping every heartbeatMs; no pong in time drops the connection, which is
 *     how a silently dead link (e.g. Wi-Fi out of range) gets noticed
 *
 * Node is single-threaded, so instead of Shepard's thread + asyncio loop this
 * is event-driven: nothing here blocks the Express server.
 */

import WebSocket from "ws";

export class WebSocketBase {
    static DEFAULT_RECONNECT_DELAY_MS = 2000;
    static CONNECT_TIMEOUT_MS = 5000;
    static HEARTBEAT_MS = 5000;

    constructor(name, { reconnectDelayMs = WebSocketBase.DEFAULT_RECONNECT_DELAY_MS,
                        heartbeatMs = WebSocketBase.HEARTBEAT_MS,
                        connectTimeoutMs = WebSocketBase.CONNECT_TIMEOUT_MS } = {}) {
        this.name = name;
        this.reconnectDelayMs = reconnectDelayMs;
        this.heartbeatMs = heartbeatMs;
        this.connectTimeoutMs = connectTimeoutMs;

        this.connected = false;
        this.stopping = false;
        this.sendQueue = [];

        this._socket = null;
        this._reconnectTimer = null;
        this._heartbeatTimer = null;
        this._awaitingPong = false;
    }

    // ----------------------
    // Public interface
    // ----------------------
    startComms() {
        if (this._socket !== null || this._reconnectTimer !== null) {
            this.log("warn", "already started");
            return;
        }
        this.stopping = false;
        this._connect();
    }

    /** Stops the client; it will not reconnect. Resolves once the socket is closed. */
    stop() {
        this.stopping = true;
        clearTimeout(this._reconnectTimer);
        this._reconnectTimer = null;
        const socket = this._socket;
        if (socket === null) return Promise.resolve();
        return new Promise((resolve) => {
            socket.once("close", resolve);
            socket.close();
            // Don't wait forever on a dead peer
            setTimeout(() => { socket.terminate(); resolve(); }, 1000).unref();
        });
    }

    /** Queue a text message. */
    send(msg) {
        this.sendQueue.push(msg);
        this._flush();
    }

    // ----------------------
    // Hooks for subclasses
    // ----------------------
    /** URL to connect to. Must be implemented by each subclass. */
    connectUrl() {
        throw new Error("connectUrl() must be implemented by the subclass");
    }

    /** URL that is safe to print (e.g. without a token). */
    logUrl() {
        return this.connectUrl();
    }

    onOpen() {}

    onClose() {}

    onMessage(data) {
        this.log("debug", `received: ${data}`);
    }

    log(level, msg) {
        if (level === "debug" && !process.env.DEBUG) return;
        const fn = console[level] ?? console.log;
        fn(`[ws.${this.name}] ${msg}`);
    }

    // ----------------------
    // Internals
    // ----------------------
    _connect() {
        this._reconnectTimer = null;
        if (this.stopping) return;

        let socket;
        try {
            socket = new WebSocket(this.connectUrl(), { handshakeTimeout: this.connectTimeoutMs });
        } catch (err) {
            // Bad URL. The error text may contain the URL (and a token), so log only its name.
            this.log("error", `could not create connection to ${this.logUrl()}: ${err.name}`);
            this._scheduleReconnect();
            return;
        }
        this._socket = socket;
        let refused = false;

        socket.on("open", () => {
            this.connected = true;
            this.log("info", `connected to ${this.logUrl()}`);
            this._startHeartbeat();
            this.onOpen();
            this._flush();
        });

        socket.on("message", (data, isBinary) => {
            if (isBinary) return;
            try {
                this.onMessage(data.toString());
            } catch (err) {
                // One bad message must never kill the connection
                this.log("error", `message handler failed: ${err.message}`);
            }
        });

        socket.on("pong", () => { this._awaitingPong = false; });

        socket.on("unexpected-response", (_req, res) => {
            // e.g. 401/403 when the token is wrong or expired
            this.log("warn", `${this.logUrl()} refused the connection (HTTP ${res.statusCode})`);
            refused = true; // terminate() below emits an "error" we've already explained
            socket.terminate();
        });

        socket.on("error", (err) => {
            if (refused) return;
            // Don't log err.message: for some errors it includes the full URL (and the token)
            this.log("warn", `could not connect to ${this.logUrl()}: ${err.code ?? err.name}`);
        });

        socket.on("close", () => {
            const wasConnected = this.connected;
            this.connected = false;
            this._socket = null;
            clearInterval(this._heartbeatTimer);
            this._heartbeatTimer = null;
            if (wasConnected) {
                if (!this.stopping) this.log("warn", "connection closed");
                this.onClose();
            }
            this._scheduleReconnect();
        });
    }

    _scheduleReconnect() {
        if (this.stopping || this._reconnectTimer !== null) return;
        this._reconnectTimer = setTimeout(() => this._connect(), this.reconnectDelayMs);
    }

    _startHeartbeat() {
        this._awaitingPong = false;
        this._heartbeatTimer = setInterval(() => {
            if (this._awaitingPong) {
                this.log("warn", "no pong from server, dropping connection");
                this._socket?.terminate();
                return;
            }
            this._awaitingPong = true;
            this._socket?.ping();
        }, this.heartbeatMs);
    }

    _flush() {
        while (this.connected && this._socket?.readyState === WebSocket.OPEN && this.sendQueue.length > 0) {
            const msg = this.sendQueue.shift();
            this._socket.send(msg, (err) => {
                if (err) this.log("error", `message could not be sent: ${err.code ?? err.name}`);
            });
            this.log("debug", `sent: ${msg}`);
        }
    }
}

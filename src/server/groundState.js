/*
 * GroundState: everything the Emu frontend shows, kept in the backend.
 *
 * The backend is the hub: it talks to the telemetry server (ATC, #61) and to
 * Shepard, and the browser only talks to the backend. Every change is emitted
 * as an "update" event { type, ...fields }, and the browser applies the same
 * update to its copy of the state (see src/lib/groundStation.js). A browser
 * that connects later gets snapshot() first.
 *
 * Update types (backend -> browser):
 *   atc_status       { status }                 connection to the telemetry server (#61)
 *   ack              { ack }                    a new telemetry_ack (#58)
 *   infractions      { infractions }            latest infraction message (#60)
 *   traffic          { traffic }                latest traffic payload
 *   server_error     { error }                  the telemetry server rejected something
 *   shepard_status   { status }                 connection to Shepard
 *   shepard_telemetry { telemetry }             telemetry Shepard sent to the server (#59)
 *   log              { log }                    a log line (from Shepard or Emu)
 */

import { EventEmitter } from "node:events";

const MAX_ACKS = 300;    // 5 minutes at 1 Hz
const MAX_ERRORS = 50;
const MAX_LOGS = 200;

function pushBounded(list, item, max) {
    list.push(item);
    if (list.length > max) list.splice(0, list.length - max);
}

export class GroundState extends EventEmitter {
    constructor({ uavId }) {
        super();
        this.uavId = uavId;
        this.atc = { enabled: false, url: null, connected: false, lastMessageAt: null, receivedCount: 0 };
        this.acks = [];          // newest last; each { ...telemetry_ack, receivedAt, source }
        this.ackCount = 0;       // unique ACKs since the backend started (acks[] is capped)
        this.infractions = null; // latest "infraction" message, plus receivedAt
        this.traffic = null;     // latest "traffic" payload, plus receivedAt
        this.serverErrors = [];
        this.shepard = { url: null, connected: false, lastMessageAt: null };
        this.shepardTelemetry = null; // latest { packet, atcConnected, receivedAt } from Shepard
        this.logs = [];
        this._ackKeys = new Set();
    }

    snapshot() {
        return {
            uavId: this.uavId,
            atc: this.atc,
            acks: this.acks,
            ackCount: this.ackCount,
            infractions: this.infractions,
            traffic: this.traffic,
            serverErrors: this.serverErrors,
            shepard: this.shepard,
            shepardTelemetry: this.shepardTelemetry,
            logs: this.logs,
        };
    }

    _emit(type, fields) {
        this.emit("update", { type, ...fields });
    }

    // ----------------------
    // Telemetry server (ATC)
    // ----------------------
    setAtcStatus(status) {
        const changed = status.connected !== this.atc.connected || status.enabled !== this.atc.enabled;
        this.atc = status;
        // receivedCount/lastMessageAt change every second (traffic); only push real changes
        if (changed) this._emit("atc_status", { status });
    }

    /**
     * Records a telemetry_ack. The same ACK can arrive more than once (polled
     * with telemetry_request, forwarded by Shepard, ...); it is counted once,
     * keyed by uavId + GPS unixTime. Returns true if it was new.
     *
     * @param {"poll"|"shepard"|"emu"} source  where the ACK came from
     */
    recordAck(msg, source) {
        const key = `${msg.uavId}@${msg.unixTime}`;
        if (this._ackKeys.has(key)) return false;
        this._ackKeys.add(key);

        const ack = { ...msg, receivedAt: Date.now(), source };
        delete ack.event;
        pushBounded(this.acks, ack, MAX_ACKS);
        // Keep the de-duplication set the same size as the history
        if (this._ackKeys.size > MAX_ACKS * 2) {
            this._ackKeys = new Set(this.acks.map((a) => `${a.uavId}@${a.unixTime}`));
        }
        this.ackCount += 1;
        this._emit("ack", { ack, ackCount: this.ackCount });
        return true;
    }

    setInfractions(msg) {
        const infractions = { ...msg, receivedAt: Date.now() };
        delete infractions.event;
        this.infractions = infractions;
        this._emit("infractions", { infractions });
    }

    setTraffic(payload) {
        this.traffic = { ...payload, receivedAt: Date.now() };
        this._emit("traffic", { traffic: this.traffic });
    }

    addServerError(message) {
        const error = { message, receivedAt: Date.now() };
        pushBounded(this.serverErrors, error, MAX_ERRORS);
        this._emit("server_error", { error });
    }

    // ----------------------
    // Shepard
    // ----------------------
    setShepardStatus(status) {
        this.shepard = status;
        this._emit("shepard_status", { status });
    }

    setShepardTelemetry(packet, atcConnected) {
        this.shepardTelemetry = { packet, atcConnected, receivedAt: Date.now() };
        this._emit("shepard_telemetry", { telemetry: this.shepardTelemetry });
    }

    addLog(source, message, severity = "normal") {
        const log = { source, message, severity, receivedAt: Date.now() };
        pushBounded(this.logs, log, MAX_LOGS);
        this._emit("log", { log });
    }
}

/*
 * useGroundStation(): the frontend's live copy of the backend's GroundState.
 *
 * Connects to the backend's /ws (proxied by Vite in dev), applies the
 * snapshot and every update (see src/server/groundState.js for the types),
 * and reconnects on its own if the backend restarts.
 */

import { useEffect, useReducer, useState } from "react";

const RECONNECT_MS = 2000;
const MAX_ACKS = 300;
const MAX_ERRORS = 50;
const MAX_LOGS = 200;

const EMPTY_STATE = {
    uavId: null,
    atc: { enabled: false, connected: false, url: null },
    acks: [],
    ackCount: 0,
    infractions: null,
    traffic: null,
    serverErrors: [],
    shepard: { url: null, connected: false, mode: null },
    shepardTelemetry: null,
    logs: [],
};

const append = (list, item, max) => [...list, item].slice(-max);

function reducer(state, update) {
    switch (update.type) {
        case "snapshot":
            return { ...EMPTY_STATE, ...update.state };
        case "atc_status":
            return { ...state, atc: update.status };
        case "ack":
            return { ...state, acks: append(state.acks, update.ack, MAX_ACKS), ackCount: update.ackCount };
        case "infractions":
            return { ...state, infractions: update.infractions };
        case "traffic":
            return { ...state, traffic: update.traffic };
        case "server_error":
            return { ...state, serverErrors: append(state.serverErrors, update.error, MAX_ERRORS) };
        case "shepard_status":
            return { ...state, shepard: update.status };
        case "shepard_telemetry":
            return { ...state, shepardTelemetry: update.telemetry };
        case "log":
            return { ...state, logs: append(state.logs, update.log, MAX_LOGS) };
        default:
            return state;
    }
}

function backendWsUrl() {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    return `${protocol}//${window.location.host}/ws`;
}

export function useGroundStation() {
    const [state, dispatch] = useReducer(reducer, EMPTY_STATE);
    const [backendConnected, setBackendConnected] = useState(false);

    useEffect(() => {
        let socket = null;
        let retryTimer = null;
        let closed = false;

        const connect = () => {
            socket = new WebSocket(backendWsUrl());
            socket.onopen = () => setBackendConnected(true);
            socket.onmessage = (event) => {
                try {
                    dispatch(JSON.parse(event.data));
                } catch {
                    console.error("invalid message from backend:", event.data);
                }
            };
            socket.onclose = () => {
                setBackendConnected(false);
                if (!closed) retryTimer = setTimeout(connect, RECONNECT_MS);
            };
        };
        connect();

        return () => {
            closed = true;
            clearTimeout(retryTimer);
            socket?.close();
        };
    }, []);

    return { state, backendConnected };
}

/** Re-renders every intervalMs and returns Date.now(), for "time since" displays. */
export function useNow(intervalMs = 500) {
    const [now, setNow] = useState(() => Date.now());
    useEffect(() => {
        const timer = setInterval(() => setNow(Date.now()), intervalMs);
        return () => clearInterval(timer);
    }, [intervalMs]);
    return now;
}

export async function connectShepard(url) {
    const res = await fetch("/api/shepard/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
    });
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? `HTTP ${res.status}`);
}

export async function disconnectShepard() {
    await fetch("/api/shepard/disconnect", { method: "POST" });
}

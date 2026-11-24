// Run with: npm run test:server
import { test } from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";

import { ATC } from "./atc.js";
import { missingTelemetryFields } from "./atcMessages.js";
import { startMockAtc } from "../../mock-uav-server/atc-mock.js";

const TELEMETRY = {
    uavId: "UAARG", unixTime: 1795000000.5, latitude: 53.4955, longitude: -113.548,
    altitudeAGL: 10, horizontalPositionAccuracy: 0.8, verticalPositionAccuracy: 1.2,
    batteryPercentage: 90, mode: "armed-automatic", rcLinkStatus: 1, telemetryLinkStatus: 1,
};

const fast = { reconnectDelayMs: 50, heartbeatMs: 200 };

function nextEvent(atc, name, timeoutMs = 2000) {
    return Promise.race([
        once(atc.events, name).then(([msg]) => msg),
        new Promise((_, reject) => setTimeout(() => reject(new Error(`timed out waiting for ${name}`)), timeoutMs)),
    ]);
}

test("connects with token, gets ack, infractions and traffic", async () => {
    const mock = await startMockAtc({ port: 0, trafficMs: 100 });
    const atc = new ATC(`ws://127.0.0.1:${mock.port}`, { token: "test", ...fast });
    try {
        atc.startComms();
        await nextEvent(atc, "open");
        assert.equal(atc.connected, true);

        assert.equal(atc.sendTelemetry(TELEMETRY), true);
        const ack = await nextEvent(atc, "telemetry_ack");
        assert.equal(ack.uavId, "UAARG");
        assert.equal(ack.insideBoundary, true);

        atc.requestInfractions("UAARG");
        const inf = await nextEvent(atc, "infraction");
        assert.equal(inf.slow_telem, 0);

        const traffic = await nextEvent(atc, "traffic");
        assert.equal(traffic.payload.traffic[0].name, "Mock Cessna");
    } finally {
        await atc.stop();
        await mock.close();
    }
});

test("server error events are emitted and do not throw", async () => {
    const mock = await startMockAtc({ port: 0 });
    const atc = new ATC(`ws://127.0.0.1:${mock.port}`, { token: "test", ...fast });
    try {
        atc.startComms();
        await nextEvent(atc, "open");
        atc.sendTelemetry({ uavId: "UAARG" });
        const msg = await nextEvent(atc, "message");
        assert.equal(msg.event, "error");
        assert.match(msg.message, /missing fields/);
    } finally {
        await atc.stop();
        await mock.close();
    }
});

test("wrong token is refused and the client keeps retrying", async () => {
    const mock = await startMockAtc({ port: 0 });
    const atc = new ATC(`ws://127.0.0.1:${mock.port}`, { token: "wrong", ...fast });
    try {
        atc.startComms();
        await new Promise((r) => setTimeout(r, 300));
        assert.equal(atc.connected, false);
        assert.equal(atc.sendTelemetry(TELEMETRY), false); // not queued while disconnected
        assert.equal(atc.sendQueue.length, 0);
    } finally {
        await atc.stop();
        await mock.close();
    }
});

test("reconnects after the server drops the connection", async () => {
    const mock = await startMockAtc({ port: 0 });
    const atc = new ATC(`ws://127.0.0.1:${mock.port}`, { token: "test", ...fast });
    try {
        atc.startComms();
        await nextEvent(atc, "open");
        for (const client of mock.wss.clients) client.terminate();
        await nextEvent(atc, "close");
        await nextEvent(atc, "open");
        assert.equal(atc.connected, true);
    } finally {
        await atc.stop();
        await mock.close();
    }
});

test("drops the connection when the server stops answering pings", async () => {
    const mock = await startMockAtc({ port: 0, autoPong: false });
    const atc = new ATC(`ws://127.0.0.1:${mock.port}`, { token: "test", ...fast });
    try {
        atc.startComms();
        await nextEvent(atc, "open");
        await nextEvent(atc, "close", 2000);
    } finally {
        await atc.stop();
        await mock.close();
    }
});

test("token is not in the logged URL", () => {
    const atc = new ATC("wss://example.test/prod", { token: "s3cret token" });
    assert.equal(atc.logUrl(), "wss://example.test/prod");
    assert.equal(atc.connectUrl(), "wss://example.test/prod?Authorization=s3cret%20token");
});

test("missingTelemetryFields", () => {
    assert.deepEqual(missingTelemetryFields(TELEMETRY), []);
    assert.deepEqual(missingTelemetryFields({ ...TELEMETRY, telemetryLinkStatus: null }), ["telemetryLinkStatus"]);
});

/**
 * Mock UAV for local frontend testing.
 *
 * Usage (from this directory):
 *   npm install
 *   npm start
 *
 * In the app, connect to the printed base URL (default http://127.0.0.1:8765).
 * Capture Image sends { type: "image", message: "capture" }; this server
 * replies with { type: "img", value: "/mock/capture?..." } and serves that URL.
 */

import http from "node:http";
import { WebSocketServer } from "ws";

const PORT = Number(process.env.PORT) || 8765;
const HOST = process.env.HOST || "127.0.0.1";

function buildTestSvg() {
  const ts = new Date().toISOString();
  return `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600">
  <defs>
    <pattern id="grid" width="32" height="32" patternUnits="userSpaceOnUse">
      <path d="M 32 0 L 0 0 0 32" fill="none" stroke="#3d4f5f" stroke-width="1"/>
    </pattern>
    <radialGradient id="glow" cx="50%" cy="40%" r="50%">
      <stop offset="0%" stop-color="#4ecdc4"/>
      <stop offset="100%" stop-color="#1a535c"/>
    </radialGradient>
  </defs>
  <rect width="100%" height="100%" fill="#0f1419"/>
  <rect width="100%" height="100%" fill="url(#grid)" opacity="0.5"/>
  <circle cx="400" cy="260" r="120" fill="url(#glow)" stroke="#eee" stroke-width="3"/>
  <circle cx="400" cy="260" r="18" fill="#ff6b6b"/>
  <rect x="180" y="420" width="440" height="6" rx="3" fill="#95a5a6"/>
  <text x="400" y="480" text-anchor="middle" fill="#ecf0f1" font-family="ui-monospace, monospace" font-size="20">mock-uav-server</text>
  <text x="400" y="515" text-anchor="middle" fill="#7f8c8d" font-family="ui-monospace, monospace" font-size="14">${ts}</text>
</svg>`;
}

function sendJson(ws, obj) {
  if (ws.readyState === 1) ws.send(JSON.stringify(obj));
}

const server = http.createServer((req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method === "GET" && req.url.startsWith("/mock/capture")) {
    const body = Buffer.from(buildTestSvg(), "utf8");
    res.writeHead(200, {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "no-store",
    });
    res.end(body);
    return;
  }

  res.writeHead(404, { "Content-Type": "text/plain" });
  res.end("not found");
});

const wss = new WebSocketServer({ server, path: "/ws" });

wss.on("connection", (ws) => {
  sendJson(ws, { type: "status", status: "mode", value: "mock" });
  sendJson(ws, {
    type: "log",
    message: "mock UAV connected",
    severity: "normal",
  });

  ws.on("message", (raw) => {
    let msg;
    try {
      msg = JSON.parse(String(raw));
    } catch {
      return;
    }

    if (msg.type === "image" && msg.message === "capture") {
      const now = new Date();
      const path = `/mock/capture?t=${now.getTime()}`;
      const when = new Intl.DateTimeFormat(undefined, {
        dateStyle: "medium",
        timeStyle: "medium",
      }).format(now);
      sendJson(ws, { type: "img", value: path });
      sendJson(ws, {
        type: "log",
        message: `sent frame ${path} at ${when}`,
        severity: "normal",
      });
      return;
    }

    if (msg.type === "getDistance") {
      sendJson(ws, {
        type: "distance",
        message: "12.34",
      });
      sendJson(ws, {
        type: "log",
        message: "mock distance: 12.34 (fixed)",
        severity: "normal",
      });
      return;
    }

    if (msg.type === "aim") {
      sendJson(ws, {
        type: "log",
        message: `aim vertical=${msg.vertical} horizontal=${msg.horizontal}`,
        severity: "normal",
      });
    }
  });
});

server.listen(PORT, HOST, () => {
  const base = `http://${HOST}:${PORT}`;
  console.log(`Mock UAV HTTP + WebSocket listening at ${base}`);
  console.log(`Connect the frontend to: ${base} (WebSocket: ${base}/ws)`);
});

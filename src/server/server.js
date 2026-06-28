import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import db from "./db.js";
import { addTarget, getAverages, getImageNames, getImageTargets } from "./targets.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const IMAGES_DIR = path.join(__dirname, "../../data/images");

const app = express();
const PORT = 3000;

app.use(express.json());

app.post("/api/targets", (req, res) => {
  const { name, imageId, distPoint } = req.body;
  const validPoint =
    distPoint &&
    typeof distPoint === "object" &&
    typeof distPoint.x === "number" &&
    typeof distPoint.y === "number" &&
    typeof distPoint.z === "number";

  if (!name || !imageId || !validPoint) {
    return res.status(400).json({
      error: 'Expected name, imageId, and distPoint as { "x": 22, "y": 33, "z": 33 }',
    });
  }
  addTarget(name, imageId, distPoint);
  res.json({ success: true });
});

app.get("/api/averages", (_, res) => {
  res.json(getAverages());
});

app.get("/api/imageNames", (_, res) => {
  res.json(getImageNames());
});

app.get("/api/imageTargets/:id1/:id2", (req, res) => {
  const id = `${req.params.id1}/${req.params.id2}`;
  res.json(getImageTargets(id));
});

app.post("/api/saveImage", async (req, res) => {
  const { url } = req.body;
  if (!url || typeof url !== "string") {
    return res.status(400).json({ error: "url required" });
  }
  try {
    const response = await fetch(url);
    if (!response.ok) return res.status(502).json({ error: "failed to fetch image from drone" });
    const buffer = await response.arrayBuffer();
    const contentType = response.headers.get("content-type") || "image/svg+xml";
    const ext = contentType.includes("svg") ? "svg" : contentType.includes("png") ? "png" : "jpg";
    const filename = `${Date.now()}.${ext}`;
    fs.mkdirSync(IMAGES_DIR, { recursive: true });
    fs.writeFileSync(path.join(IMAGES_DIR, filename), Buffer.from(buffer));
    const savedAt = Date.now();
    db.prepare("INSERT OR IGNORE INTO images (filename, saved_at, name) VALUES (?, ?, '')").run(filename, savedAt);
    res.json({ filename, savedAt });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

app.get("/api/savedImages", (_, res) => {
  const rows = db.prepare("SELECT filename, saved_at, name FROM images ORDER BY saved_at ASC").all();
  res.json(rows.map(r => ({ filename: r.filename, savedAt: r.saved_at, name: r.name })));
});

app.get("/api/images/:filename", (req, res) => {
  const { filename } = req.params;
  if (!/^[\w.-]+$/.test(filename)) return res.status(400).json({ error: "invalid filename" });
  const filePath = path.join(IMAGES_DIR, filename);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: "not found" });
  res.sendFile(filePath);
});

app.post("/api/images/:filename/name", (req, res) => {
  const { filename } = req.params;
  if (!/^[\w.-]+$/.test(filename)) return res.status(400).json({ error: "invalid filename" });
  const { name } = req.body;
  if (!name || typeof name !== "string") return res.status(400).json({ error: "name required" });
  db.prepare("UPDATE images SET name = ? WHERE filename = ?").run(name, filename);
  res.json({ success: true });
});

app.delete("/api/images/:filename", (req, res) => {
  const { filename } = req.params;
  if (!/^[\w.-]+$/.test(filename)) return res.status(400).json({ error: "invalid filename" });
  const filePath = path.join(IMAGES_DIR, filename);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: "not found" });
  fs.unlinkSync(filePath);
  db.prepare("DELETE FROM images WHERE filename = ?").run(filename);
  db.prepare("DELETE FROM image_points WHERE image_filename = ?").run(filename);
  res.json({ success: true });
});

app.get("/api/imagePoints/:filename", (req, res) => {
  const { filename } = req.params;
  if (!/^[\w.-]+$/.test(filename)) return res.status(400).json({ error: "invalid filename" });
  const rows = db.prepare("SELECT pixel_x, pixel_y FROM image_points WHERE image_filename = ?").all(filename);
  res.json(rows.map(r => ({ x: r.pixel_x, y: r.pixel_y })));
});

app.post("/api/imagePoints", (req, res) => {
  const { filename, x, y } = req.body;
  if (!filename || typeof x !== "number" || typeof y !== "number") {
    return res.status(400).json({ error: "filename, x, y required" });
  }
  if (!/^[\w.-]+$/.test(filename)) return res.status(400).json({ error: "invalid filename" });
  db.prepare("INSERT INTO image_points (image_filename, pixel_x, pixel_y) VALUES (?, ?, ?)").run(filename, x, y);
  res.json({ success: true });
});

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});

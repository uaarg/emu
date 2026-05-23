import express from "express";
import { addTarget, getAverages, getImageNames, getImageTargets } from "./targets.js";

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

  res.json({
    success: true,
  });
});

app.get("/api/averages", (_, res) => {
  const averages = getAverages();
  res.json(averages);
});

app.get("/api/imageNames", (_, res) => {
  const imageNames = getImageNames();
  res.json(imageNames);
});

app.get("/api/imageTargets/:id1/:id2", (req, res) => {
  const id = `${req.params.id1}/${req.params.id2}`;
  const targets = getImageTargets(id);

  res.json(targets);
});

app.post(
  "/api/saveImage",
  express.raw({ type: "image/*", limit: "20mb" }),
  (req, res) => {
    const imageId = req.body;
    const contentType = req.headers["content-type"];

    if (!imageId) {
      return res.status(400).json({ error: "Missing imageId query parameter" });
    }

    if (!contentType || !contentType.startsWith("image/")) {
      return res.status(400).json({ error: "Expected image content type" });
    }

    const extension = contentType === "image/jpeg" ? "jpg" : "png";
    const dataDir = path.join(process.cwd(), "data", "images");
    const safeId = imageId.replace(/[^a-zA-Z0-9_\-./]/g, "_");
    const imagePath = path.join(dataDir, `${safeId}.${extension}`);

    await fetch(imageId, {method: "GET"})
      .then((response) => response.blob())
      .then((blob) => {
        const buffer = Buffer.from(blob.arrayBuffer());


      try {
        fs.mkdirSync(path.dirname(imagePath), { recursive: true });
        fs.writeFileSync(imagePath, req.body);
        res.json({ success: true, savedTo: imagePath });
      } catch (error) {
        console.error("Failed to save image:", error);
        res.status(500).json({ error: "Unable to save image" });
      }
    
    })  }
);

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});

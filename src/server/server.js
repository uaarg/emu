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

app.get("/api/imageTargets/:imageId", (req, res) => {
  const id = req.params.imageId;
  const targets = getImageTargets(id);

  res.json(targets);
});

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});

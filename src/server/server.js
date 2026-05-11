import express from "express";
import { addTarget, getAverages, getImageNames, getImageTargets } from "./targets.js";
import { 
  getImageLibrary, 
  getRGBDImageData, 
  getImageFile,
  deleteImage 
} from "./imageLibrary.js";

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.static("../../public"));

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
  const imageId = req.params.imageId;
  const targets = getImageTargets(imageId);

  res.json(targets);
});

// Image Library API endpoints
app.get("/api/imageLibrary", (_, res) => {
  const library = getImageLibrary();
  res.json(library);
});

app.get("/api/imageData/:imageName", (req, res) => {
  const imageName = req.params.imageName;
  const imageData = getRGBDImageData(imageName);

  if (!imageData) {
    return res.status(404).json({ error: "Image not found" });
  }

  res.json(imageData);
});

app.get("/api/imageFile/:imageName/:type", (req, res) => {
  const imageName = req.params.imageName;
  const type = req.params.type || "rgb";

  const imageBuffer = getImageFile(imageName, type);

  if (!imageBuffer) {
    return res.status(404).json({ error: "Image file not found" });
  }

  res.setHeader("Content-Type", "image/png");
  res.send(imageBuffer);
});

app.delete("/api/imageLibrary/:imageName", (req, res) => {
  const imageName = req.params.imageName;
  
  try {
    deleteImage(imageName);
    res.json({ success: true, message: "Image deleted" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});

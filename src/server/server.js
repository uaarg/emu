import express from "express";
import { addTarget, getAverages, getImageNames, getImageTargets } from "./targets.js";
import path from "path";
import process from "process";
import fs from "fs";
import { Buffer } from "buffer";

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
    "/api/saveImage", async (req, res) => {
    console.log("received");
    try {
        const body = req.body;
        console.log(body);
        const img_url = body.url;
        const img_idx = body.index;

        const img_dir = path.join(process.cwd(), "images");
        if (!fs.existsSync(img_dir)) {
          fs.mkdirSync(img_dir, { recursive: true });
        }
        const imagePath = path.join(img_dir, `Task_2_UAARG_target_${img_idx}.jpeg`);
        console.log(imagePath);

        const response = await fetch(img_url, {method: "GET"});
        const buffer = Buffer.from(await response.arrayBuffer());
        fs.writeFileSync(imagePath, buffer);
        console.log("done getting image");
        
        res.end('Success');

    } catch(error) {
     console.error(error);
        res.statusCode = 400;
        res.end('Error');
    }
    
});

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});

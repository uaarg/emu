import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function addTarget(name, imageId, distPoint) {
  const dataDir = path.join(__dirname, "../../data");
  const filePath = path.join(dataDir, "targets.json");

  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify({}, null, 2));
  }

  let data = JSON.parse(fs.readFileSync(filePath, "utf8"));

  if (!data[imageId]) {
    data[imageId] = {};
  }

  if (!data[imageId].targets) {
    data[imageId].targets = {};
  }

  if (!data[imageId].distances) {
    data[imageId].distances = [];
  }

  const newPoint = {
    x: distPoint.x,
    y: distPoint.y,
    z: distPoint.z
  };

  const newPairs = createDistPairs(name, newPoint, data[imageId].targets);

  data[imageId].targets[name] = newPoint;
  data[imageId].distances.push(...newPairs);

  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

function createDistPairs(newName, newPoint, oldTargets) {
  const pairs = [];

  for (const [oldName, oldPoint] of Object.entries(oldTargets)) {
    if (oldName === newName) continue;

    const dx = newPoint.x - oldPoint.x;
    const dy = newPoint.y - oldPoint.y;
    const dz = newPoint.z - oldPoint.z;

    pairs.push({
      target1: newName,
      target2: oldName,
      distance: Math.sqrt(dx * dx + dy * dy + dz * dz)
    });
  }

  return pairs;
}

export function getAverages() {
  const filePath = path.join(__dirname, "../../data/targets.json");

  if (!fs.existsSync(filePath)) {
    return [];
  }

  const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
  const pairMap = {};

  for (const image of Object.values(data)) {
    if (!image.distances) continue;

    for (const pair of image.distances) {
      const names = [pair.target1, pair.target2].sort();
      const key = `${names[0]}|${names[1]}`;

      if (!pairMap[key]) {
        pairMap[key] = {
          target1: names[0],
          target2: names[1],
          total: 0,
          count: 0
        };
      }

      pairMap[key].total += pair.distance;
      pairMap[key].count += 1;
    }
  }

  return Object.values(pairMap).map((item) => ({
    target1: item.target1,
    target2: item.target2,
    averageDistance: item.total / item.count
  }));
}

export function getImageNames() {
  const filePath = path.join(__dirname, "../../data/targets.json");

  if (!fs.existsSync(filePath)) {
    return [];
  }

  const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
  const imageNames = [];

  for (const image of Object.keys(data)) {
    imageNames.push(image);
  }

  return imageNames;
}

export function getImageTargets(imageId) {
  const filePath = path.join(__dirname, "../../data/targets.json");

  if (!fs.existsSync(filePath)) {
    return [];
  }

  const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
  const targets = data[imageId].targets;

  return targets;
}

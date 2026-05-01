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

  // 1. Collect all distances
  for (const image of Object.values(data)) {
    if (!image.distances) continue;

    for (const pair of image.distances) {
      const names = [pair.target1, pair.target2].sort();
      const key = `${names[0]}|${names[1]}`;

      if (!pairMap[key]) {
        pairMap[key] = {
          target1: names[0],
          target2: names[1],
          values: []
        };
      }

      pairMap[key].values.push(pair.distance);
    }
  }

  // Helper functions
  const mean = (arr) => arr.reduce((a, b) => a + b, 0) / arr.length;

  const stdDev = (arr, avg) =>
    Math.sqrt(arr.reduce((sum, val) => sum + (val - avg) ** 2, 0) / arr.length);

  // 2. Trim outliers and compute average
  return Object.values(pairMap).map((item) => {
    const values = item.values;

    if (values.length === 0) {
      return {
        target1: item.target1,
        target2: item.target2,
        averageDistance: null
      };
    } else if (values.length < 4) {
      return {
        target1: item.target1,
        target2: item.target2,
        averageDistance: mean(values)
      };
    }

    const avg = mean(values);
    const sd = stdDev(values, avg);

    // keep values within 2 standard deviations
    const filtered = values.filter(
      (v) => Math.abs(v - avg) <= 2 * sd
    );

    const finalAvg =
      filtered.length > 0 ? mean(filtered) : null; // null if all removed

    return {
      target1: item.target1,
      target2: item.target2,
      averageDistance: finalAvg
    };
  });
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

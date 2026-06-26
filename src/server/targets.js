import db from './db.js';

export function addTarget(name, imageId, distPoint) {
  db.prepare('INSERT INTO targets (name, image_id, x, y, z) VALUES (?, ?, ?, ?, ?)')
    .run(name, imageId, distPoint.x, distPoint.y, distPoint.z);
}

export function getImageNames() {
  return db.prepare('SELECT DISTINCT image_id FROM targets').all().map(r => r.image_id);
}

export function getImageTargets(imageId) {
  const rows = db.prepare('SELECT name, x, y, z FROM targets WHERE image_id = ?').all(imageId);
  const result = {};
  for (const row of rows) result[row.name] = { x: row.x, y: row.y, z: row.z };
  return result;
}

export function getAverages() {
  const all = db.prepare('SELECT name, image_id, x, y, z FROM targets').all();

  const byImage = {};
  for (const t of all) {
    if (!byImage[t.image_id]) byImage[t.image_id] = {};
    byImage[t.image_id][t.name] = { x: t.x, y: t.y, z: t.z };
  }

  const pairMap = {};
  for (const targets of Object.values(byImage)) {
    const entries = Object.entries(targets);
    for (let i = 0; i < entries.length; i++) {
      for (let j = i + 1; j < entries.length; j++) {
        const [n1, p1] = entries[i];
        const [n2, p2] = entries[j];
        const dx = p1.x - p2.x, dy = p1.y - p2.y, dz = p1.z - p2.z;
        const key = [n1, n2].sort().join('|');
        if (!pairMap[key]) {
          const [t1, t2] = key.split('|');
          pairMap[key] = { target1: t1, target2: t2, values: [] };
        }
        pairMap[key].values.push(Math.sqrt(dx*dx + dy*dy + dz*dz));
      }
    }
  }

  const mean = arr => arr.reduce((a, b) => a + b, 0) / arr.length;
  const stdDev = (arr, avg) => Math.sqrt(arr.reduce((s, v) => s + (v - avg) ** 2, 0) / arr.length);

  return Object.values(pairMap).map(({ target1, target2, values }) => {
    if (values.length === 0) return { target1, target2, averageDistance: null };
    if (values.length < 4) return { target1, target2, averageDistance: mean(values) };
    const avg = mean(values);
    const sd = stdDev(values, avg);
    const filtered = values.filter(v => Math.abs(v - avg) <= 2 * sd);
    return { target1, target2, averageDistance: filtered.length > 0 ? mean(filtered) : null };
  });
}

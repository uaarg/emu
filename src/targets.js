export async function saveTarget(name, imageId, distPoint) {
  const response = await fetch("/api/targets", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      name,
      imageId,
      distPoint
    })
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Failed to save target");
  }

  return data;
}

export async function fetchAverages() {
  const response = await fetch("/api/averages");
  return await response.json();
}

export async function fetchImageNames() {
  const response = await fetch("/api/imageNames");
  return await response.json();
}

export async function fetchImageTargets(imageId) {
  const response = await fetch(`/api/imageTargets/${imageId}`);
  return await response.json();
}

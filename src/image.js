export async function saveImage(filename, saveIndex) {
  const response = await fetch("/api/saveImage", {
  // await fetch("/api/targets", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      url: filename,
      index: saveIndex,
    })
  });
  console.log("Status Code:", response.status);
  console.log("OK Status:", response.ok);
  if (response.ok) {
    return true;
  } else {
    return false;
  }
}

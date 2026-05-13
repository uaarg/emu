import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const IMAGES_DIR = path.join(__dirname, "../../data/images");
const LIBRARY_FILE = path.join(__dirname, "../../data/imageLibrary.json");

// Ensure directories exist
function ensureDirectories() {
  if (!fs.existsSync(IMAGES_DIR)) {
    fs.mkdirSync(IMAGES_DIR, { recursive: true });
  }
}

// Initialize library file
function ensureLibraryFile() {
  ensureDirectories();
  if (!fs.existsSync(LIBRARY_FILE)) {
    fs.writeFileSync(LIBRARY_FILE, JSON.stringify([], null, 2));
  }
}

/**
 * Save RGBD image data to file system
 * @param {string} imageName - Name/ID of the image
 * @param {Buffer} rgbBuffer - RGB image buffer
 * @param {Buffer} depthBuffer - Depth image buffer (optional)
 * @param {Object} metadata - Image metadata
 */
export function saveRGBDImage(imageName, rgbBuffer, depthBuffer, metadata = {}) {
  ensureLibraryFile();

  const imageDir = path.join(IMAGES_DIR, imageName);
  if (!fs.existsSync(imageDir)) {
    fs.mkdirSync(imageDir, { recursive: true });
  }

  // Save RGB image
  const rgbPath = path.join(imageDir, "rgb.png");
  if (rgbBuffer) {
    fs.writeFileSync(rgbPath, rgbBuffer);
  }

  // Do not save depth images; only RGB data is needed for frontend display.

  // Update library
  let library = JSON.parse(fs.readFileSync(LIBRARY_FILE, "utf8"));

  const imageEntry = {
    name: imageName,
    timestamp: new Date().toISOString(),
    metadata: {
      width: metadata.width || 0,
      height: metadata.height || 0,
      size: metadata.size || 0,
      hasRGB: !!rgbBuffer,
      hasDepth: false,
    },
  };

  // Remove if already exists, then add to end (most recent)
  library = library.filter((img) => img.name !== imageName);
  library.push(imageEntry);

  fs.writeFileSync(LIBRARY_FILE, JSON.stringify(library, null, 2));

  return imageEntry;
}

/**
 * Get list of all saved images
 */
export function getImageLibrary() {
  ensureLibraryFile();

  if (!fs.existsSync(LIBRARY_FILE)) {
    return [];
  }

  const library = JSON.parse(fs.readFileSync(LIBRARY_FILE, "utf8"));
  return library;
}

/**
 * Get RGBD data for a specific image
 */
export function getRGBDImageData(imageName) {
  const imageDir = path.join(IMAGES_DIR, imageName);

  if (!fs.existsSync(imageDir)) {
    return null;
  }

  const rgbPath = path.join(imageDir, "rgb.png");

  const result = {
    imageName,
    imageUrl: null,
    depthUrl: null,
    metadata: {
      timestamp: null,
    },
  };

  // Read RGB image
  if (fs.existsSync(rgbPath)) {
    result.imageUrl = `/api/imageFile/${encodeURIComponent(imageName)}/rgb`;
    // Get metadata
    const stats = fs.statSync(rgbPath);
    result.metadata.size = stats.size;
  }

  // Get from library for additional metadata
  const library = getImageLibrary();
  const libEntry = library.find((img) => img.name === imageName);
  if (libEntry) {
    result.metadata = { ...result.metadata, ...libEntry.metadata };
    result.metadata.timestamp = libEntry.timestamp;
  }

  return result;
}

/**
 * Get raw image file
 */
export function getImageFile(imageName, type = "rgb") {
  const imageDir = path.join(IMAGES_DIR, imageName);
  const filePath = path.join(imageDir, `${type}.png`);

  if (!fs.existsSync(filePath)) {
    return null;
  }

  return fs.readFileSync(filePath);
}

/**
 * Delete an image from the library
 */
export function deleteImage(imageName) {
  const imageDir = path.join(IMAGES_DIR, imageName);

  // Delete image directory
  if (fs.existsSync(imageDir)) {
    fs.rmSync(imageDir, { recursive: true, force: true });
  }

  // Update library
  let library = JSON.parse(fs.readFileSync(LIBRARY_FILE, "utf8"));
  library = library.filter((img) => img.name !== imageName);
  fs.writeFileSync(LIBRARY_FILE, JSON.stringify(library, null, 2));

  return true;
}

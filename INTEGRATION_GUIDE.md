# RGBD Filing System - Integration Guide for Drone Server

## Overview
This guide explains how to integrate the OAKD camera image capture with the new RGBD filing system on the frontend.

## Backend Integration Points

### 1. Image Capture and Storage
When your drone server captures an image from the OAKD camera, you need to:

#### Step 1: Capture RGB and Depth Data
```javascript
// In your drone server code (e.g., on OAKD camera interface)
const rgbImage = oakdCamera.getRGBFrame();      // PNG buffer
const depthImage = oakdCamera.getDepthFrame();  // PNG buffer
const timestamp = new Date().toISOString();
```

#### Step 2: Send to Frontend API
The frontend backend exposes this endpoint to save images:
```
POST /api/imageLibrary/save
Content-Type: application/json

{
  "imageName": "oakd-2026-05-10-120000",
  "rgbBuffer": <base64-encoded RGB PNG>,
  "depthBuffer": <base64-encoded Depth PNG>,
  "metadata": {
    "width": 640,
    "height": 480,
    "timestamp": "2026-05-10T12:00:00Z",
    "camera": "OAKD",
    "exposure": 15000,
    "fps": 30
  }
}
```

### 2. Current Implementation
The system currently stores images that are saved through the local API. To integrate with your drone:

**Option A: HTTP Upload from Drone**
```javascript
// In your drone control code
async function captureAndUpload() {
  const rgb = camera.captureRGB();
  const depth = camera.captureDepth();
  
  const response = await fetch('http://localhost:3000/api/images', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      imageName: generateImageName(),
      rgbBuffer: rgb.toString('base64'),
      depthBuffer: depth.toString('base64'),
      metadata: { width: 640, height: 480 }
    })
  });
}
```

**Option B: File-based Storage (Current Implementation)**
The server loads images from the `/data/images/` directory. You can:
1. Have your drone save images locally
2. File watcher detects new images
3. Images appear in library automatically

## Image Naming Convention

Use this naming scheme for consistency:
```
{camera-id}-{date}-{time}-{sequence}
Example: oakd-2026-05-10-120000-001
```

The system stores metadata including:
- `timestamp` - ISO 8601 format
- `width`, `height` - Image dimensions
- `camera` - Camera model/ID
- `hasRGB`, `hasDepth` - Data availability flags

## Modifying imageLibrary.js for Direct Integration

### Current Structure
```javascript
// server/imageLibrary.js
export function saveRGBDImage(imageName, rgbBuffer, depthBuffer, metadata)
```

### Enhanced Version for Drone Integration
If you want to add a network endpoint, modify `server.js`:

```javascript
import multer from 'multer';
import { saveRGBDImage } from './imageLibrary.js';

const upload = multer({ storage: multer.memoryStorage() });

// Upload endpoint for drone server
app.post("/api/images/upload", upload.fields([
  { name: 'rgb', maxCount: 1 },
  { name: 'depth', maxCount: 1 }
]), (req, res) => {
  const imageName = req.body.imageName || generateImageName();
  const rgbBuffer = req.files.rgb?.[0].buffer;
  const depthBuffer = req.files.depth?.[0].buffer;
  const metadata = JSON.parse(req.body.metadata || '{}');

  try {
    saveRGBDImage(imageName, rgbBuffer, depthBuffer, metadata);
    res.json({ success: true, imageName });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

## WebSocket Integration (If Using Existing Protocol)

If you have WebSocket communication with the drone, you can extend the message protocol:

```javascript
// Existing drone message types (keep current functionality)
{
  "type": "image",
  "message": "capture"
}

// Enhanced with RGBD data
{
  "type": "rgbd",
  "message": {
    "timestamp": "2026-05-10T12:00:00Z",
    "imageName": "oakd-2026-05-10-120000",
    "imageUrl": "/data/images/oakd-2026-05-10-120000/rgb.png",
    "depthUrl": "/data/images/oakd-2026-05-10-120000/depth.png"
  }
}
```

## Frontend Handling of New Images

The frontend automatically polls the `/api/imageLibrary` endpoint and updates the UI when new images appear:

```javascript
// In ImageLibrary.jsx
useEffect(() => {
  const interval = setInterval(fetchImages, 5000); // Poll every 5 seconds
  return () => clearInterval(interval);
}, []);
```

To speed up updates, you could trigger a refresh via WebSocket event:
```javascript
// In App.jsx messageHandler
case "imageAdded":
  // Trigger library refresh
  window.dispatchEvent(new CustomEvent('refreshImageLibrary'));
  break;
```

## Depth Data Processing

The system supports depth maps but doesn't visualize them yet. For future enhancements:

### Depth Map Format
- Typically 16-bit grayscale PNG
- Pixel values represent distance in millimeters
- Can be converted to 3D coordinates:
  ```
  x = (pixel_x - cx) * depth / fx
  y = (pixel_y - cy) * depth / fy
  z = depth
  ```

### Camera Calibration
Store calibration parameters in metadata:
```javascript
metadata: {
  width: 640,
  height: 480,
  fx: 617.5,  // focal length X
  fy: 617.5,  // focal length Y
  cx: 320.0,  // principal point X
  cy: 240.0   // principal point Y
}
```

## Storage Optimization

### Image Compression
The system stores PNG files. For optimization:
- RGB: ~50-100KB per 640×480 image
- Depth: ~30-50KB per 640×480 image
- Consider JPEG for RGB to save space

### Cleanup Strategy
Implement periodic cleanup:
```javascript
export function deleteOldImages(olderThanDays = 30) {
  const library = getImageLibrary();
  const cutoffTime = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);
  
  library.forEach(img => {
    if (new Date(img.timestamp) < cutoffTime) {
      deleteImage(img.name);
    }
  });
}
```

## Testing the Integration

### Manual Test
1. Start frontend: `npm run dev`
2. Start backend: `node src/server/server.js`
3. Place test image in `/data/images/test-image/rgb.png`
4. Refresh library - image should appear

### Automated Test
```bash
# Create test images
mkdir -p data/images/test-1
cp sample-rgb.png data/images/test-1/rgb.png

# Verify via API
curl http://localhost:3000/api/imageLibrary
```

## Common Issues and Solutions

### Issue: Images not appearing after capture
**Solution**: Ensure `data/images/` directory exists and has proper permissions

### Issue: Depth maps not displaying
**Solution**: Currently not visualized; implement depth overlay in RGBDViewer.jsx

### Issue: Out of memory with large images
**Solution**: Implement image streaming or compression pipeline

### Issue: WebSocket disconnect causes measurement loss
**Solution**: Measurements are saved to disk immediately; WebSocket only for UI

## Example: Full Integration Flow

```javascript
// 1. Drone captures image
const rgbFrame = oakdCamera.getRGB();
const depthFrame = oakdCamera.getDepth();

// 2. Save to frontend backend
await fetch('http://localhost:3000/api/images', {
  method: 'POST',
  headers: { 'Content-Type': 'application/octet-stream' },
  body: rgbFrame
});

// 3. Frontend library detects new image
// (via polling or push notification)

// 4. User selects image from library
// Image appears in RGBDViewer

// 5. User clicks to measure distance
// Point sent to drone for 3D coordinate

// 6. Measurement saved to targets.json
// Visualization updates automatically
```

## Performance Considerations

- **Image caching**: Browser caches images at `/api/imageFile/...`
- **Library polling**: Currently 5-second intervals; can be optimized
- **Memory**: Large depth maps may require client-side processing
- **Network**: Direct file serving is efficient for local development

## Future Enhancements

1. **Real-time streaming**: WebRTC for live preview
2. **Batch processing**: Upload multiple images at once
3. **Compression**: On-device JPEG encoding for bandwidth
4. **Metadata enrichment**: GPS, IMU, camera settings
5. **Cloud sync**: Optional remote storage backup
6. **Image processing**: Filtering, enhancement, histogram analysis

## Questions or Issues?

Refer to:
- `FILING_SYSTEM_GUIDE.md` - User documentation
- `src/server/imageLibrary.js` - Implementation details
- `src/components/ImageLibrary.jsx` - Frontend library code
- `src/components/RGBDViewer.jsx` - Viewer implementation

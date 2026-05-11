# RGBD Image Filing System - Implementation Guide

## Overview
Your Emu ground station now has a complete filing system for saving, organizing, and measuring RGBD (Red-Green-Blue-Depth) image data from the OAKD camera. The new layout makes it easy to navigate between saved images and measure distances within them.

## System Architecture

### New Layout Structure
```
┌─────────────────────────────────────────────────────────────┐
│  Connection Bar (Drone URL, Connect/Disconnect)             │
├──────────┬─────────────────────────────┬────────────────────┤
│  UAV     │  Image Library (300px)      │  RGBD Viewer       │  Logs
│  Status  │  - List of saved images     │  (Center)          │  (350px)
│  Panel   │  - Select & navigate        │  - Full image view │
│  (250px) │  - Thumbnails info          │  - Measurement     │
│          │  - Refresh button           │  - Distance tool   │
│          │                             │  - 3D visualization│
└──────────┴─────────────────────────────┴────────────────────┘
```

### Three Main Sections

#### Left Panel: UAV Status
- Connection status
- Time since last message
- Current mode
- Picture count

#### Center: Image Library & RGBD Viewer
**Left-Center (300px): Image Library**
- Displays all saved RGBD images
- Shows timestamp and resolution
- Previous/Next navigation buttons
- Selected image highlighted in blue
- Refresh button to reload list

**Center (Expandable): RGBD Viewer**
- Large display area for selected image
- Shows RGB data from OAKD camera
- Three tabs:
  - **Image**: Full image with measurement point picker
  - **Measurements**: Distance table of all measured points
  - **3D Viewer**: 3D visualization of measured points

#### Right Panel: Logs (350px)
- System messages and point data
- Severity indicators (warning, error, normal)

## Key Features

### 1. Image Library Navigation
- **Easy browsing**: Central list makes all images visible
- **Quick selection**: Click any image to view it
- **Navigation buttons**: Previous/Next for sequential browsing
- **Metadata display**: Timestamp and resolution shown
- **Refresh**: Updates list when new images are saved

### 2. RGBD Image Viewing
- **Full-screen display**: Large center area for clarity
- **Magnifier lens**: Built-in zoom tool (move mouse over image)
- **Point markers**: Red dots show where measurements were taken
- **Real-time feedback**: Points appear immediately on image

### 3. Distance Measurement System
The distance measurement system **only records points when an image is displayed in the viewer**.

**To measure a distance:**
1. Select an image from the library (left-center panel)
2. In the "Image" tab, click on a point in the displayed image
3. A dialog appears asking for a name (e.g., "Point A", "Nose", "Wing Tip")
4. The system sends the pixel coordinates to the drone
5. Drone responds with 3D coordinates (x, y, z in mm)
6. Point is saved and marked with a red dot on the image

**To view all measurements:**
1. Click the "Measurements" tab
2. See a table of all measured points and their distances

**To view 3D visualization:**
1. Click the "3D Viewer" tab
2. Interactive 3D view with points and distance lines
3. Use mouse to rotate/zoom

### 4. Data Storage Structure
All RGBD data is stored locally in the `/data` folder:

```
data/
├── images/                    # RGBD image files
│   ├── image-1/
│   │   ├── rgb.png           # RGB image from camera
│   │   └── depth.png         # Depth map (optional)
│   ├── image-2/
│   │   ├── rgb.png
│   │   └── depth.png
│   └── ...
├── imageLibrary.json          # Index of all images with metadata
└── targets.json               # Measurement data for all images
```

## Backend API Endpoints

### Image Library Management
- **GET `/api/imageLibrary`** - Get list of all saved images
- **GET `/api/imageData/:imageName`** - Get specific image data
- **GET `/api/imageFile/:imageName/:type`** - Get actual image file (rgb or depth)
- **DELETE `/api/imageLibrary/:imageName`** - Delete an image

### Measurement API
- **GET `/api/imageNames`** - Get list of image IDs
- **GET `/api/imageTargets/:imageId`** - Get measurements for an image
- **POST `/api/targets`** - Save a new measurement point
- **GET `/api/averages`** - Get averaged measurements across all images

## Usage Workflow

### Typical Session
1. **Connect to drone**: Enter URL and click "Connect"
2. **Capture or select image**: 
   - New captures from drone appear in library
   - Or select previously saved image
3. **View image**: Click image in library → displays in center
4. **Measure points**: Click locations in image to mark distances
5. **Name measurements**: Enter descriptive names when prompted
6. **Review measurements**: Switch to "Measurements" tab
7. **3D visualization**: Switch to "3D Viewer" to see points in space

### Quick Tips
- **Magnifier Lens**: Hover over image to see zoomed view
- **Navigation**: Use Previous/Next to browse images without selecting
- **Refresh**: If images don't update, click Refresh button
- **Multiple Points**: Click as many points as needed per image
- **Auto-naming**: Points are automatically linked to the image they're measured on

## Technical Details

### Components Added/Modified

**New Components:**
- `ImageLibrary.jsx` - File browser panel
- `RGBDViewer.jsx` - Image display with RGBD support

**New Backend Files:**
- `imageLibrary.js` - Server-side image management

**Modified Files:**
- `App.jsx` - New layout with three sections
- `server.js` - Added image library API endpoints

### State Management
- **FilingSystemLayout**: Manages image selection state
- **MeasurementLayout**: Manages point measurement and dialog state
- **RGBDViewer**: Manages image display and metadata

### Key Design Decisions
✅ **Points only on displayed images**: Prevents accidental measurements on wrong image
✅ **Large center viewing area**: Maximum clarity for distance measurement
✅ **Easy navigation**: Image list always visible, no need to dig through folders
✅ **Preserved functionality**: All existing measurement and 3D viewer features intact

## Troubleshooting

### Images not appearing in library
- Click "Refresh" button
- Check that images are being saved to `/data/images/`
- Verify backend is running on port 3000

### Points not saving
- Ensure drone is connected
- Check that image is properly displayed in RGBDViewer
- Look at logs panel for error messages

### Measurements showing wrong values
- Verify image is the correct one in the library
- Check that pixel clicks are registering (red dots appear)
- Ensure drone depth sensor is functioning

### 3D viewer empty
- Switch to "Image" tab first to select an image
- Click at least 2 points to see distance lines
- Use mouse to rotate/zoom the 3D view

## Future Enhancements
- Depth map visualization overlay on RGB image
- Image tagging and filtering
- Batch measurement processing
- Export measurements to CSV/JSON
- Depth histogram for camera diagnostics
- Multi-camera support

## API Examples

### Save RGBD Image (Backend)
```javascript
saveRGBDImage(
  "image-123",           // unique image name
  rgbBuffer,             // RGB image buffer
  depthBuffer,           // Depth map buffer
  {                      // metadata
    width: 640,
    height: 480,
    timestamp: "2026-05-10T12:00:00Z"
  }
);
```

### Save Measurement
```javascript
// Triggered when user clicks on image
saveTarget(
  "Point A",             // name from dialog
  "image-123",           // image ID
  {                      // 3D coordinates from drone
    x: 150,
    y: 200,
    z: 1200  // millimeters
  }
);
```

## Notes
- All coordinates are in millimeters (mm) unless otherwise specified
- Images are stored locally; consider backup strategy for important data
- Depth data is optional but recommended for accurate 3D measurements
- System supports unlimited number of images (limited by disk space)

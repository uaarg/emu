# Quick Start Guide - RGBD Filing System

## 🚀 Get Started in 5 Minutes

### Step 1: Start the Application
```bash
# Terminal 1: Start Frontend
npm run dev

# Terminal 2: Start Backend
node src/server/server.js
```

### Step 2: Connect to Drone
1. Open browser to `http://localhost:5173` (or shown in terminal)
2. Enter Drone URL: `http://127.0.0.1:8000` (adjust as needed)
3. Click **Connect**
4. Wait for "Connected: yes" in UAV Status panel

### Step 3: Save Your First Image
- Either:
  - **Option A**: Capture from drone (see Drone Integration section)
  - **Option B**: Place test image in `/data/images/test-image/rgb.png`

### Step 4: View Image Library
- Left-center panel shows all saved images
- See timestamp and resolution
- Click any image to view it

### Step 5: Measure a Distance
1. Select image from library
2. In "Image" tab, click a point on the image
3. Enter point name (e.g., "Wing Tip")
4. System measures 3D coordinates from drone
5. Red dot appears on image
6. Check "Measurements" tab for distance

## 📁 Directory Structure

```
emu-filing-patch/
├── src/
│   ├── App.jsx                          ← Main app (MODIFIED)
│   ├── components/
│   │   ├── ImageLibrary.jsx            ← NEW
│   │   ├── RGBDViewer.jsx              ← NEW
│   │   └── ...
│   └── server/
│       ├── server.js                   ← Modified (NEW endpoints)
│       ├── imageLibrary.js             ← NEW
│       └── targets.js
├── data/                                ← Created automatically
│   ├── images/
│   │   ├── image-1/
│   │   │   ├── rgb.png
│   │   │   └── depth.png
│   │   └── image-2/
│   ├── imageLibrary.json
│   └── targets.json
└── FILING_SYSTEM_GUIDE.md              ← Documentation
```

## 🎮 Basic Operations

### View an Image
1. Look at Image Library (left-center)
2. Click any image
3. Image appears in center viewer

### Navigate Images
- **Previous**: Go to previous image
- **Next**: Go to next image
- **Refresh**: Reload image list

### Measure a Point
1. Image displayed in center
2. Click on the image at desired location
3. Type name for the point
4. Point saved with 3D coordinates

### View All Measurements
1. Click "Measurements" tab
2. See table of all points on this image
3. Distances between points shown

### View 3D
1. Click "3D Viewer" tab
2. Points shown in 3D space
3. Rotate with mouse to view from different angles

## 🔌 Drone Integration (Optional)

To save OAKD camera images automatically:

```javascript
// In your drone control code
import { saveRGBDImage } from './src/server/imageLibrary.js';

// When capturing from OAKD camera:
const rgb = oakdCamera.getRGBFrame();
const depth = oakdCamera.getDepthFrame();

saveRGBDImage(
  `oakd-${Date.now()}`,  // image name
  rgb,                    // RGB buffer
  depth,                  // Depth buffer
  { width: 640, height: 480 }
);
```

Images will appear in library automatically!

## 🐛 Troubleshooting

### "No images saved yet"
- Check `/data/images/` folder exists
- Manually add test image to `/data/images/test/rgb.png`
- Click Refresh button
- Check backend console for errors

### Points not saving
- Ensure drone is connected
- Look for red dots on image (click registered)
- Check console logs for errors

### 3D Viewer empty
- Need at least 2 points to see distances
- Check "Measurements" tab first
- Switch to 3D Viewer tab

### Image won't display
- Verify image file is valid PNG
- Check file permissions in `/data/images/`
- Restart backend

## 📊 Layout Quick Reference

```
┌─────────────────────────────────────────┐
│  Connection Bar                         │
├─────┬──────────┬─────────────┬──────────┤
│ UAV │ Library  │  VIEWER     │  LOGS    │
├─────┴──────────┴─────────────┴──────────┤
│  Tabs: [Image] [Measure] [3D]           │
├─────────────────────────────────────────┤
│  Controls (Sliders)                     │
└─────────────────────────────────────────┘
```

## 🎯 Workflow

```
1. Connect to Drone
            ↓
2. Select Image from Library
            ↓
3. Image Displays in Center
            ↓
4. Click Points to Measure
            ↓
5. View Measurements in Table
            ↓
6. Visualize in 3D Viewer
```

## 💾 Data Locations

- **Images**: `/data/images/{name}/`
- **Metadata**: `/data/imageLibrary.json`
- **Measurements**: `/data/targets.json`

All saved automatically!

## 🔗 API Endpoints

Quick reference for developers:

```
GET  /api/imageLibrary              → List all images
GET  /api/imageData/:name           → Get image metadata
GET  /api/imageFile/:name/rgb       → Get RGB image
GET  /api/imageFile/:name/depth     → Get depth image
DELETE /api/imageLibrary/:name      → Delete image
```

## 📖 Full Documentation

For detailed information, see:
- **FILING_SYSTEM_GUIDE.md** - Complete user guide
- **INTEGRATION_GUIDE.md** - Integration with OAKD/drone
- **LAYOUT_VISUAL_GUIDE.md** - Visual reference
- **IMPLEMENTATION_SUMMARY.md** - Technical details

## ✅ Verification

To verify everything is working:

```bash
# 1. Backend should print:
# "Backend running on http://localhost:3000"

# 2. Frontend should load without errors

# 3. UAV Status panel should be visible

# 4. Image Library should show any saved images

# 5. Click Refresh to update list
```

## 🆘 Get Help

1. **Read the error message** - most are self-explanatory
2. **Check console logs** - browser (F12) and terminal
3. **Review documentation** - see files above
4. **Test with sample image** - verify basic functionality
5. **Check /data/ folder** - ensure directory structure

## 🎓 Learning Path

1. **Start**: Run the app and connect drone
2. **Learn**: Click around, try selecting images
3. **Experiment**: Save a measurement point
4. **Explore**: Try all three tabs (Image/Measure/3D)
5. **Integrate**: Connect your OAKD camera
6. **Optimize**: Read integration guide for best practices

## ⏱️ Common Task Times

- Start app: 5-10 seconds
- Connect drone: 1-2 seconds
- Select image: <1 second
- Measure point: 2-5 seconds (depends on drone)
- View measurements: <1 second
- 3D visualization: <1 second

## 🎉 You're All Set!

Your RGBD filing system is ready to use. Start with:

1. `npm run dev` - frontend
2. `node src/server/server.js` - backend
3. Connect to drone
4. Select an image
5. Click to measure!

---

**Need more help?** Check the full documentation files:
- FILING_SYSTEM_GUIDE.md (users)
- INTEGRATION_GUIDE.md (developers)
- LAYOUT_VISUAL_GUIDE.md (designers)

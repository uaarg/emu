# RGBD Filing System - Visual Layout Guide

## New Layout Structure

```
┌────────────────────────────────────────────────────────────────────────────┐
│  CONNECTION BAR (Full Width)                                               │
│  [Drone URL Input] [Connect/Disconnect Button]                            │
└────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│ ┌──────────────┬────────────────────┬──────────────────────────────┐ ┌──────┐│
│ │              │                    │                              │ │      ││
│ │   UAV        │   Image Library    │   RGBD Image Viewer          │ │ LOGS ││
│ │   STATUS     │                    │   ┌──────────────────────┐   │ │      ││
│ │              │  ┌──────────────┐  │   │                      │   │ │ ┌────┤│
│ │  • Connected │  │ image-001    │  │   │                      │   │ │ │ •  ││
│ │  • Mode: idle│  │ 2026-05-10   │  │   │   [Large Image      │   │ │ │ msg││
│ │  • Image: 42 │  │ 640×480      │  │   │    Display Area     │   │ │ │    ││
│ │  • Time: 5s  │  │              │  │   │                      │   │ │ │ •  ││
│ │              │  │ image-002    │  │   │   With:             │   │ │ │ msg││
│ │              │  │ 2026-05-10   │  │   │   - Magnifier Lens  │   │ │ │    ││
│ │ ┌──────────┐ │  │ 640×480      │  │   │   - Red Dots        │   │ │ │ •  ││
│ │ │ 250px    │ │  │              │  │   │   - Click to        │   │ │ │ msg││
│ │ │ Fixed    │ │  │ image-003    │  │   │     Measure         │   │ │ │    ││
│ │ │ Width    │ │  │ 2026-05-10   │  │   │]                    │   │ │ │    ││
│ │ └──────────┘ │  │ 640×480      │  │   │                      │   │ │ │────┤│
│ │              │  │              │  │   │  Tabs:              │   │ │ │    ││
│ │              │  │ [Refresh]    │  │   │  [Image] [Measure]  │   │ │ │ 350│
│ │              │  │              │  │   │  [3D View]          │   │ │ │ px ││
│ │              │  │ [Previous]   │  │   │                      │   │ │ │    ││
│ │              │  │ [Next]       │  │   │  Status:            │   │ │ │    ││
│ │              │  │              │  │   │  640×480            │   │ │ │    ││
│ │              │  │ 1 / 15       │  │   │  Captured: [time]   │   │ │ │    ││
│ │              │  │              │  │   │                      │   │ │ └────┘│
│ │              │  │ ┌──────────┐ │  │   │                      │   │ │      ││
│ │              │  │ │ 300px    │ │  │   │ ┌──────────────────┐ │   │ │      ││
│ │              │  │ │ Width    │ │  │   │ │ Sliders Control │ │   │ │      ││
│ │              │  │ │ Flex Sh. │ │  │   │ └──────────────────┘ │   │ │      ││
│ │              │  │ └──────────┘ │  │   │ (At bottom)         │   │ │      ││
│ │              │  │              │  │   └──────────────────────┘   │ │      ││
│ │              │  │              │  │   (Flex-grow - fills space)  │ │      ││
│ │              │  │              │  │   Fixed Height: 400px min     │ │      ││
│ │              │  └──────────────┘  │                              │ │      ││
│ └──────────────┴────────────────────┴──────────────────────────────┘ └──────┘│
└──────────────────────────────────────────────────────────────────────────────┘
```

## Component Breakdown

### Left Panel: UAV Status (250px, Fixed)
```
┌─────────────────────┐
│  UAV Status         │
├─────────────────────┤
│ Connected: yes      │
│ Time Since Msg: 2s  │
│ Current Mode: idle  │
│ Pics Received: 42   │
└─────────────────────┘
```

### Center-Left: Image Library (300px, Fixed on Left, Scrollable)
```
┌──────────────────────────┐
│  Image Library           │
├──────────────────────────┤
│  [Refresh]               │
├──────────────────────────┤
│  image-001               │  ← Selected (blue bg)
│  2026-05-10 12:00       │
│  640×480 | 85KB         │
│                          │
│  image-002               │
│  2026-05-10 12:15       │
│  640×480 | 87KB         │
│                          │
│  image-003               │
│  2026-05-10 12:30       │
│  640×480 | 89KB         │
│                          │
│  [Previous] [Next]       │
│  3 / 15                  │
└──────────────────────────┘
```

### Center: RGBD Viewer (Flex-grow, Takes remaining space)
```
┌─────────────────────────────────────────────┐
│  RGBD Image Viewer                          │
├─────────────────────────────────────────────┤
│ [Image] [Measurements] [3D Viewer]          │
├─────────────────────────────────────────────┤
│                                              │
│              ┌─────────────────┐             │
│              │                 │             │
│              │    RGB Image    │             │
│              │    with red     │  [Magnifier│
│              │    dots marked  │   Lens]    │
│              │                 │             │
│              │    Click to     │             │
│              │    measure      │             │
│              │                 │             │
│              │                 │             │
│              └─────────────────┘             │
│                                              │
│ Metadata: 640×480, Captured: 2026-05-10     │
│                                              │
├─────────────────────────────────────────────┤
│  [Camera Controls / Sliders]                │
└─────────────────────────────────────────────┘
```

### Right Panel: Logs (350px, Fixed)
```
┌─────────────────────────┐
│  Logs                   │
├─────────────────────────┤
│ Severity | Message      │
├─────────────────────────┤
│ normal   | Connected    │
│ normal   | point: (x,y) │
│ warning  | Low battery  │
│ normal   | Target saved │
│ error    | Timeout      │
└─────────────────────────┘
```

## User Interaction Flow

### Step 1: View Image Library
```
User sees list of all saved RGBD images
in the left-center panel (300px width)
```

### Step 2: Select Image
```
User clicks image from library
                ↓
Image displays in center viewer
(flex-grow takes all remaining space)
```

### Step 3: Measure Distance
```
User clicks point on image
                ↓
Red dot appears at click location
                ↓
Dialog prompts for point name
                ↓
Backend gets 3D coordinates from drone
                ↓
Point saved to measurements database
                ↓
Log message shows result
```

### Step 4: Review Measurements
```
User clicks "Measurements" tab
                ↓
Table shows all points measured on this image
                ↓
Distances calculated between points
```

### Step 5: 3D Visualization
```
User clicks "3D Viewer" tab
                ↓
3D scene with measured points
                ↓
Can rotate/zoom with mouse
                ↓
Distance lines show relationships
```

## Size Calculations

```
Viewport: 1920 × 1080 (example)

Left Panel (UAV):        250px fixed + 16px gap
Library (Images):        300px fixed + 16px gap
Center (Viewer):         ? (flex-grow) 
Right Panel (Logs):      350px fixed + 16px gap
Horizontal Padding:      32px (16px × 2)

Center Width = 1920 - 250 - 16 - 300 - 16 - 350 - 32 = 956px
```

## Responsive Behavior

### On smaller screens (< 1400px):
- Panels maintain minimum widths
- Center viewer gets compressed
- Horizontal scrollbar appears if needed

### On larger screens (> 1920px):
- Center viewer expands significantly
- More space for detailed image viewing
- Better for precise point measurement

## Color Scheme

```
Selected Image:
- Background: Light Blue (#e0f2fe)
- Border: Blue (#0284c7)
- Font Weight: Semibold

Unselected Image:
- Background: White (#ffffff)
- Border: Light Gray (#e5e7eb)
- Hover: Light Gray (#f3f4f6)

Point Markers:
- Color: Red (#ff0000)
- Radius: 5px
- Appears on click

Magnifier Lens:
- Border: 2px Light Gray
- Shadow: Drop shadow
- Background: Dark (#171717)
- Opacity: High
```

## Tab Structure

```
┌─────────────────────────────────────┐
│ [Image] [Measurements] [3D Viewer]  │
├─────────────────────────────────────┤

Tab Content Areas:

IMAGE TAB:
└─ Canvas component
   └─ RGBDViewer
   └─ Point clicking enabled
   └─ Magnifier lens active

MEASUREMENTS TAB:
└─ DistanceTable component
   └─ Shows all points for image
   └─ Distances between points
   └─ Statistics

3D VIEWER TAB:
└─ TargetViewer component
   └─ 3D scene with points
   └─ Distance lines
   └─ Orbit controls
```

## Navigation Flow Diagram

```
Start
  │
  ├─→ Connect to Drone
  │
  ├─→ Image Library Shows All Images
  │   │
  │   ├─→ User Clicks Image
  │   │   │
  │   │   └─→ Image Displays in Center
  │   │
  │   ├─→ User Clicks Previous/Next
  │   │   │
  │   │   └─→ Selected Image Changes
  │   │
  │   └─→ User Clicks Refresh
  │       │
  │       └─→ Library Updates
  │
  ├─→ User Clicks Point on Image
  │   │
  │   ├─→ Dialog Asks for Name
  │   │
  │   ├─→ Drone Measures 3D Position
  │   │
  │   └─→ Point Saved & Marked
  │
  ├─→ User Views Measurements Tab
  │   │
  │   └─→ Shows Distance Table
  │
  └─→ User Views 3D Viewer Tab
      │
      └─→ Shows 3D Visualization
```

## Keyboard Shortcuts (Future Enhancement)

```
Proposed shortcuts:
[←] Previous Image
[→] Next Image
[R] Refresh Library
[I] Switch to Image Tab
[M] Switch to Measurements Tab
[V] Switch to 3D Viewer Tab
[Del] Delete Selected Image
```

## Mobile Responsiveness

```
Large Desktop (1920×1080):
[250] [300] [xxxxx] [350]

Tablet (768×1024):
[150] [200] [xx] [150]  ← Panels compress

Mobile (375×667):
Vertical stack:
[Full width UAV status]
[Full width Library]
[Full width Viewer]
[Full width Logs]
```

## Performance Metrics

```
Expected Loading Times:
- Image Library Load: < 500ms
- Image Display: < 1000ms
- Point Registration: < 100ms
- 3D Viewer: < 2000ms

Memory Usage (Estimate):
- RGB Image (640×480 PNG): ~100KB
- Depth Map (640×480 PNG): ~50KB
- Viewer in Memory: ~5MB
- Total App: ~20-30MB
```

## Accessibility Features

```
✅ Clear contrast ratios
✅ Large clickable areas (images)
✅ Keyboard navigation ready
✅ Clear labels and headings
✅ Status indicators visible
✅ Error messages clear
✅ Tab order logical
✅ Semantic HTML structure
```

---

This visual layout provides an intuitive, professional interface for managing RGBD images and measuring distances with the OAKD camera system.

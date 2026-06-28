import { Canvas } from "@react-three/fiber";
import { OrbitControls, Grid } from "@react-three/drei";
import { useMemo } from "react";
import * as THREE from "three";
import { Button } from "./ui/button";

const VIEW_SCALE = 0.0015; // mm -> scene units (same as TargetViewer)

function PointCloud({ points }) {
  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(points.length * 3);
    for (let i = 0; i < points.length; i++) {
      positions[i * 3]     = points[i].x * VIEW_SCALE;
      positions[i * 3 + 1] = points[i].y * VIEW_SCALE;
      positions[i * 3 + 2] = points[i].z * VIEW_SCALE;
    }
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    return geo;
  }, [points]);

  if (points.length === 0) return null;

  return (
    <points geometry={geometry}>
      <pointsMaterial size={0.05} color="#4ecdc4" sizeAttenuation />
    </points>
  );
}

function DroneMarker({ pose }) {
  if (!pose) return null;
  return (
    <mesh position={[pose.x * VIEW_SCALE, pose.y * VIEW_SCALE, pose.z * VIEW_SCALE]}>
      <sphereGeometry args={[0.15, 16, 16]} />
      <meshStandardMaterial color="#ff6b6b" emissive="#ff6b6b" emissiveIntensity={0.4} />
    </mesh>
  );
}

export default function SlamViewer({ points, pose, onClear }) {
  return (
    <div className="flex flex-col h-full w-full gap-2">
      <div className="flex items-center justify-between px-1">
        <span className="text-sm text-muted-foreground">{points.length} points</span>
        <Button variant="outline" className="h-7 text-xs px-3" onClick={onClear}>Clear Map</Button>
      </div>
      <div className="flex-auto rounded-md border overflow-hidden" style={{ background: "#0f1419" }}>
        {points.length === 0 && pose === null ? (
          <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
            Waiting for SLAM data…
          </div>
        ) : (
          <Canvas camera={{ position: [5, 5, 5], fov: 60 }}>
            <ambientLight intensity={0.6} />
            <directionalLight position={[5, 10, 5]} intensity={1} />
            <Grid args={[20, 20]} />
            <axesHelper args={[2]} />
            <OrbitControls makeDefault />
            <PointCloud points={points} />
            <DroneMarker pose={pose} />
          </Canvas>
        )}
      </div>
    </div>
  );
}

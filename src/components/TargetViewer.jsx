import { Canvas } from "@react-three/fiber";
import { OrbitControls, Html, Line, Grid } from "@react-three/drei";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useEffect, useState } from "react";
import { fetchImageNames, fetchImageTargets } from "@/targets";
import { ButtonGroup } from "./ui/button-group";
import { Button } from "./ui/button";
import { ArrowLeftIcon, ArrowRightIcon } from "lucide-react";

function ImageSelecter({ imageNames, onSelect }) {
  return (
    <div className="flex flex-row gap-5">
      <Select onValueChange={onSelect} defaultValue={imageNames.at(-1)}>
        <SelectTrigger className="w-full max-w-48">
          <SelectValue placeholder="Select an image" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {imageNames && imageNames.map((imageName, idx) => (
              <SelectItem key={idx} value={imageName}>{imageName}</SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
      <ButtonGroup className="sm:flex gap-4">
        <Button variant="outline" size="icon" aria-label="Go Back">
          <ArrowLeftIcon />
        </Button>
        <Button variant="outline" size="icon" aria-label="Go Next">
          <ArrowRightIcon />
        </Button>
      </ButtonGroup>
    </div>
  )
}

function TargetPoint({ name, point }) {
  return (
    <group position={[point.x, point.y, point.z]}>
      <mesh>
        <sphereGeometry args={[0.08, 32, 32]} />
        <meshStandardMaterial color="black" />
      </mesh>

      <Html distanceFactor={8}>
        <div className="rounded bg-background px-[2px] py-[2px] text-[4px] shadow">
          {name}
        </div>
      </Html>
    </group>
  );
}

const VIEW_SCALE = 0.0015; // mm -> scene units, so 1000 mm = 1 unit

export default function TargetViewer() {
  const [currImage, setCurrImage] = useState(null);
  const [imageNames, setImageNames] = useState([]);
  const [targets, setTargets] = useState([]);

  useEffect(() => {
    let cancelled = false;

    fetchImageNames()
      .then((images) => {
        if (cancelled) return;
        setImageNames(images);
        setCurrImage(images.at(-1))
      })
      .catch((error) => {
        console.error(error);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    if (!currImage) {
      return
    }

    fetchImageTargets(currImage)
      .then((targets) => {
        if (cancelled) return;
        setTargets(targets);
      })
      .catch((error) => {
        console.error(error);
      });

    return () => {
      cancelled = true;
    };
  }, [currImage]);

  const scenePoints = Object.fromEntries(
    Object.entries(targets).map(([name, p]) => [
      name,
      {
        x: p.x * VIEW_SCALE,
        y: p.y * VIEW_SCALE,
        z: p.z * VIEW_SCALE,
      },
    ])
  );

  const maxCoord = Math.max(
    1,
    ...Object.values(scenePoints).flatMap((p) => [
      Math.abs(p.x),
      Math.abs(p.y),
      Math.abs(p.z),
    ])
  );

  const axisSize = Math.ceil(maxCoord * 1.25);
  const gridSize = axisSize * 2;
  const gridDivisions = Math.max(10, axisSize);

  return (
    <div className="flex gap-2 flex-col h-full w-full">
      <ImageSelecter imageNames={imageNames} onSelect={imageId => setCurrImage(imageId)}></ImageSelecter>
      <div className="flex-auto rounded-md border overflow-hidden">
        <Canvas camera={{ position: [5, 5, 5], fov: 60 }}>
          <ambientLight intensity={0.8} />
          <directionalLight position={[5, 10, 5]} intensity={1} />
          <Grid args={[gridSize, gridDivisions]} />
          <axesHelper args={[axisSize]} />

          <OrbitControls makeDefault />

          {Object.entries(scenePoints).map(([name, point]) => (
            <TargetPoint key={name} name={name} point={point} />
          ))}

          {Object.keys(scenePoints).length >= 2 &&
            Object.entries(scenePoints)
              .slice(1)
              .map(([name, target], i) => {
                const [prevName, prevTarget] = Object.entries(scenePoints)[i];

                return (
                  <Line
                    key={`${prevName}-${name}`}
                    color="gray"
                    points={[
                      [prevTarget.x, prevTarget.y, prevTarget.z],
                      [target.x, target.y, target.z],
                    ]}
                    lineWidth={2}
                  />
                );
              })}
        </Canvas>
      </div>
    </div>
  );
}

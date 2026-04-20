import { Canvas } from "@react-three/fiber";
import type { ThreeEvent } from "@react-three/fiber";
import { OrbitControls, Html } from "@react-three/drei";
import type { ReactNode } from "react";

type BodyPartKey =
  | "head"
  | "neck"
  | "chest"
  | "belly"
  | "back"
  | "leftArm"
  | "rightArm"
  | "leftLeg"
  | "rightLeg";

type BodyLabels = Record<BodyPartKey, string>;

function PartMesh({
  part,
  position,
  rotation,
  scale,
  selected,
  onPick,
  label,
  children,
}: {
  part: BodyPartKey;
  position: [number, number, number];
  rotation?: [number, number, number];
  scale: [number, number, number];
  selected: BodyPartKey | null;
  onPick: (part: BodyPartKey) => void;
  label: string;
  children: ReactNode;
}) {
  const active = selected === part;
  const color = active ? "#22c55e" : "#38bdf8";
  const emissive = active ? "#0f766e" : "#075985";

  function pick(event: ThreeEvent<MouseEvent>) {
    event.stopPropagation();
    onPick(part);
  }

  return (
    <group position={position} rotation={rotation} scale={scale} onClick={pick}>
      <mesh castShadow receiveShadow>
        {children}
        <meshStandardMaterial
          color={color}
          emissive={emissive}
          emissiveIntensity={active ? 0.32 : 0.12}
          metalness={0.08}
          roughness={0.42}
          transparent
          opacity={active ? 0.96 : 0.84}
        />
      </mesh>

      <Html center position={[0, 0.62, 0]} style={{ pointerEvents: "none" }}>
        <div
          style={{
            padding: "5px 9px",
            borderRadius: 8,
            border: active ? "1px solid rgba(34,197,94,0.95)" : "1px solid rgba(255,255,255,0.22)",
            background: active ? "rgba(15,118,110,0.92)" : "rgba(2,6,23,0.72)",
            fontSize: 12,
            fontWeight: 700,
            whiteSpace: "nowrap",
            boxShadow: active ? "0 10px 24px rgba(34,197,94,0.25)" : "0 8px 20px rgba(0,0,0,0.24)",
          }}
        >
          {label}
        </div>
      </Html>
    </group>
  );
}

function HumanFigure({
  labels,
  selected,
  onPick,
}: {
  labels: BodyLabels;
  selected: BodyPartKey | null;
  onPick: (part: BodyPartKey) => void;
}) {
  return (
    <group>
      <PartMesh part="head" label={labels.head} position={[0, 2.16, 0]} scale={[0.36, 0.42, 0.34]} selected={selected} onPick={onPick}>
        <sphereGeometry args={[1, 32, 32]} />
      </PartMesh>

      <PartMesh part="neck" label={labels.neck} position={[0, 1.73, 0]} scale={[0.22, 0.2, 0.22]} selected={selected} onPick={onPick}>
        <cylinderGeometry args={[1, 1, 1, 32]} />
      </PartMesh>

      <PartMesh part="chest" label={labels.chest} position={[0, 1.24, 0.02]} scale={[0.76, 0.84, 0.48]} selected={selected} onPick={onPick}>
        <capsuleGeometry args={[0.72, 0.78, 12, 32]} />
      </PartMesh>

      <PartMesh part="belly" label={labels.belly} position={[0, 0.45, 0.04]} scale={[0.64, 0.66, 0.44]} selected={selected} onPick={onPick}>
        <capsuleGeometry args={[0.7, 0.42, 12, 32]} />
      </PartMesh>

      <PartMesh part="back" label={labels.back} position={[0, 0.9, -0.42]} scale={[0.74, 1.3, 0.16]} selected={selected} onPick={onPick}>
        <boxGeometry args={[1, 1, 1]} />
      </PartMesh>

      <PartMesh
        part="leftArm"
        label={labels.leftArm}
        position={[-0.83, 0.82, 0]}
        rotation={[0, 0, -0.16]}
        scale={[0.22, 0.98, 0.22]}
        selected={selected}
        onPick={onPick}
      >
        <capsuleGeometry args={[0.72, 1.28, 12, 24]} />
      </PartMesh>

      <PartMesh
        part="rightArm"
        label={labels.rightArm}
        position={[0.83, 0.82, 0]}
        rotation={[0, 0, 0.16]}
        scale={[0.22, 0.98, 0.22]}
        selected={selected}
        onPick={onPick}
      >
        <capsuleGeometry args={[0.72, 1.28, 12, 24]} />
      </PartMesh>

      <PartMesh part="leftLeg" label={labels.leftLeg} position={[-0.28, -0.72, 0]} scale={[0.25, 1.14, 0.25]} selected={selected} onPick={onPick}>
        <capsuleGeometry args={[0.72, 1.5, 12, 24]} />
      </PartMesh>

      <PartMesh part="rightLeg" label={labels.rightLeg} position={[0.28, -0.72, 0]} scale={[0.25, 1.14, 0.25]} selected={selected} onPick={onPick}>
        <capsuleGeometry args={[0.72, 1.5, 12, 24]} />
      </PartMesh>
    </group>
  );
}

export default function Body3D({
  labels,
  selected,
  onPick,
  theme,
}: {
  labels: BodyLabels;
  selected: BodyPartKey | null;
  onPick: (part: BodyPartKey) => void;
  theme: "dark" | "light";
}) {
  return (
    <div style={{ width: "100%", height: "min(74vh, 720px)", minHeight: 520, background: theme === "dark" ? "#0b1220" : "#ffffff" }}>
      <Canvas camera={{ position: [0, 1.05, 5.2], fov: 38 }} shadows>
        <color attach="background" args={[theme === "dark" ? "#0b1220" : "#ffffff"]} />
        <ambientLight intensity={0.72} />
        <directionalLight position={[3, 5, 3]} intensity={1.45} castShadow />
        <pointLight position={[-3, 2.5, 2]} intensity={0.55} color="#67e8f9" />

        <HumanFigure labels={labels} selected={selected} onPick={onPick} />

        <OrbitControls enablePan={false} minDistance={3.2} maxDistance={6.4} target={[0, 0.55, 0]} />
      </Canvas>
    </div>
  );
}

import { Suspense, useEffect, useMemo, useState } from "react";
import { Canvas, type ThreeEvent } from "@react-three/fiber";
import { ContactShadows, Html, OrbitControls, useAnimations, useGLTF } from "@react-three/drei";
import type { Mesh, Object3D } from "three";

type Zone = "head" | "chest" | "abdomen" | "back" | "arm" | "leg";

const MODEL_URL = "/models/real-human.glb";

function isMesh(object: Object3D): object is Mesh {
  return (object as Mesh).isMesh === true;
}

function HumanModel() {
  const gltf = useGLTF(MODEL_URL);
  const { actions } = useAnimations(gltf.animations, gltf.scene);

  useMemo(() => {
    gltf.scene.traverse((object) => {
      if (isMesh(object)) {
        object.castShadow = true;
        object.receiveShadow = true;
      }
    });
  }, [gltf.scene]);

  useEffect(() => {
    const idle = actions.Idle;
    idle?.reset().fadeIn(0.2).play();
    return () => {
      idle?.fadeOut(0.2);
    };
  }, [actions]);

  return <primitive object={gltf.scene} />;
}

function LoadingModel() {
  return (
    <Html center>
      <div
        style={{
          padding: "8px 12px",
          borderRadius: 8,
          background: "rgba(2,6,23,0.78)",
          color: "#e2e8f0",
          fontSize: 13,
          fontWeight: 700,
        }}
      >
        Загрузка 3D
      </div>
    </Html>
  );
}

function HitZone({
  zone,
  label,
  position,
  scale,
  rotation,
  onPick,
}: {
  zone: Zone;
  label: string;
  position: [number, number, number];
  scale: [number, number, number];
  rotation?: [number, number, number];
  onPick: (zone: Zone) => void;
}) {
  const [hovered, setHovered] = useState(false);

  function pick(event: ThreeEvent<MouseEvent>) {
    event.stopPropagation();
    onPick(zone);
  }

  function show(event: ThreeEvent<PointerEvent>) {
    event.stopPropagation();
    setHovered(true);
  }

  function hide(event: ThreeEvent<PointerEvent>) {
    event.stopPropagation();
    setHovered(false);
  }

  return (
    <group
      position={position}
      rotation={rotation}
      scale={scale}
      onClick={pick}
      onPointerOver={show}
      onPointerOut={hide}
    >
      <mesh>
        <capsuleGeometry args={[1, 0.55, 12, 24]} />
        <meshStandardMaterial
          color={hovered ? "#34d399" : "#38bdf8"}
          transparent
          opacity={hovered ? 0.28 : 0.04}
          depthWrite={false}
        />
      </mesh>
      <mesh position={[0, 0, 0.88]} scale={[0.18, 0.18, 0.18]}>
        <sphereGeometry args={[1, 18, 18]} />
        <meshStandardMaterial color={hovered ? "#34d399" : "#38bdf8"} emissive={hovered ? "#064e3b" : "#075985"} />
      </mesh>
      {hovered ? (
        <Html center position={[0, 0.72, 1]} style={{ pointerEvents: "none" }}>
          <div
            style={{
              padding: "6px 10px",
              borderRadius: 8,
              border: "1px solid rgba(255,255,255,0.2)",
              background: "rgba(2,6,23,0.84)",
              color: "white",
              fontSize: 12,
              fontWeight: 700,
              whiteSpace: "nowrap",
            }}
          >
            {label}
          </div>
        </Html>
      ) : null}
    </group>
  );
}

function BodyZones({ onPick }: { onPick: (zone: Zone) => void }) {
  return (
    <>
      <HitZone zone="head" label="Голова" position={[0, 1.56, 0.1]} scale={[0.16, 0.2, 0.14]} onPick={onPick} />
      <HitZone zone="chest" label="Грудь" position={[0, 1.12, 0.12]} scale={[0.31, 0.34, 0.16]} onPick={onPick} />
      <HitZone zone="abdomen" label="Живот" position={[0, 0.74, 0.12]} scale={[0.29, 0.3, 0.15]} onPick={onPick} />
      <HitZone zone="back" label="Спина" position={[0, 1.0, -0.16]} scale={[0.35, 0.5, 0.12]} onPick={onPick} />
      <HitZone zone="arm" label="Рука" position={[-0.58, 0.84, 0.08]} rotation={[0, 0, -0.08]} scale={[0.12, 0.48, 0.12]} onPick={onPick} />
      <HitZone zone="arm" label="Рука" position={[0.58, 0.84, 0.08]} rotation={[0, 0, 0.08]} scale={[0.12, 0.48, 0.12]} onPick={onPick} />
      <HitZone zone="leg" label="Нога" position={[-0.2, 0.24, 0.08]} scale={[0.12, 0.58, 0.12]} onPick={onPick} />
      <HitZone zone="leg" label="Нога" position={[0.2, 0.24, 0.08]} scale={[0.12, 0.58, 0.12]} onPick={onPick} />
    </>
  );
}

export default function Body3D({ onPick }: { onPick: (zone: Zone) => void }) {
  return (
    <div style={{ width: "100%", height: "min(74vh, 720px)", minHeight: 520, background: "#0b1220" }}>
      <Canvas camera={{ position: [0, 0.28, 4.1], fov: 32 }} shadows>
        <color attach="background" args={["#0b1220"]} />
        <ambientLight intensity={0.82} />
        <hemisphereLight args={["#e0f2fe", "#172033", 1.15]} />
        <directionalLight position={[2.8, 4.2, 3]} intensity={1.5} castShadow />
        <pointLight position={[-2, 1.8, 2.5]} intensity={0.6} color="#67e8f9" />
        <Suspense fallback={<LoadingModel />}>
          <group position={[0, -0.86, 0]} scale={1.24}>
            <HumanModel />
            <BodyZones onPick={onPick} />
          </group>
        </Suspense>
        <ContactShadows opacity={0.3} scale={4} blur={2.5} far={2.8} position={[0, -0.9, 0]} />
        <OrbitControls enablePan={false} minDistance={2.6} maxDistance={5.2} target={[0, 0.18, 0]} />
      </Canvas>
    </div>
  );
}

useGLTF.preload(MODEL_URL);

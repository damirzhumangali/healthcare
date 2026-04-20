import { Canvas } from "@react-three/fiber";
import { OrbitControls, Html } from "@react-three/drei";

type Zone = "head" | "chest" | "abdomen" | "back" | "arm" | "leg";

function ZoneMesh({
  zone,
  position,
  scale,
  onPick,
  label,
}: {
  zone: Zone;
  position: [number, number, number];
  scale: [number, number, number];
  onPick: (z: Zone) => void;
  label: string;
}) {
  return (
    <group position={position} scale={scale} onClick={(e) => (e.stopPropagation(), onPick(zone))}>
      {/* Прозрачная "зона" */}
      <mesh>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial transparent opacity={0.18} />
      </mesh>

      {/* Подпись */}
      <Html center style={{ pointerEvents: "none" }}>
        <div
          style={{
            padding: "6px 10px",
            borderRadius: 12,
            border: "1px solid rgba(255,255,255,0.18)",
            background: "rgba(0,0,0,0.45)",
            fontSize: 12,
            whiteSpace: "nowrap",
          }}
        >
          {label}
        </div>
      </Html>
    </group>
  );
}

function Mannequin({ onPick }: { onPick: (z: Zone) => void }) {
  // Простой “манекен” из кликабельных зон
  return (
    <group>
      {/* Голова */}
      <ZoneMesh zone="head" label="Голова" position={[0, 2.1, 0]} scale={[0.55, 0.55, 0.55]} onPick={onPick} />
      {/* Грудь */}
      <ZoneMesh zone="chest" label="Грудь" position={[0, 1.35, 0]} scale={[0.9, 0.7, 0.55]} onPick={onPick} />
      {/* Живот */}
      <ZoneMesh zone="abdomen" label="Живот" position={[0, 0.65, 0]} scale={[0.9, 0.75, 0.55]} onPick={onPick} />
      {/* Спина (сзади) */}
      <ZoneMesh zone="back" label="Спина" position={[0, 1.0, -0.55]} scale={[0.95, 1.35, 0.4]} onPick={onPick} />
      {/* Руки */}
      <ZoneMesh zone="arm" label="Рука" position={[1.1, 1.1, 0]} scale={[0.55, 1.35, 0.45]} onPick={onPick} />
      <ZoneMesh zone="arm" label="Рука" position={[-1.1, 1.1, 0]} scale={[0.55, 1.35, 0.45]} onPick={onPick} />
      {/* Ноги */}
      <ZoneMesh zone="leg" label="Нога" position={[0.45, -0.7, 0]} scale={[0.55, 1.55, 0.55]} onPick={onPick} />
      <ZoneMesh zone="leg" label="Нога" position={[-0.45, -0.7, 0]} scale={[0.55, 1.55, 0.55]} onPick={onPick} />
    </group>
  );
}

export default function Body3D({ onPick }: { onPick: (zone: Zone) => void }) {
  return (
    <div style={{ width: "100%", height: 420, borderRadius: 18, overflow: "hidden", border: "1px solid rgba(255,255,255,0.12)" }}>
      <Canvas camera={{ position: [0, 1.4, 4.2], fov: 45 }}>
        <ambientLight intensity={0.8} />
        <directionalLight position={[3, 5, 2]} intensity={1.2} />

        <Mannequin onPick={onPick} />

        <OrbitControls enablePan={false} minDistance={3} maxDistance={6} />
      </Canvas>
    </div>
  );
}

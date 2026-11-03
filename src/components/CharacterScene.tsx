import { Canvas } from '@react-three/fiber';
import { ContactShadows, Environment, Float, PerspectiveCamera } from '@react-three/drei';
import { Character } from './Character';
import type { CharacterMood } from '../types';

type Props = { mood: CharacterMood; speaking: boolean; accent: string; onClick?: () => void };

export function CharacterScene({ mood, speaking, accent, onClick }: Props) {
  return (
    <Canvas shadows dpr={[1, 2]} gl={{ alpha: true, antialias: true }}>
      <PerspectiveCamera makeDefault position={[0, 1.1, 4.2]} fov={30} />
      <ambientLight intensity={2.2} />
      <directionalLight castShadow position={[2.4, 4, 3]} intensity={3.8} color="#fff2df" shadow-mapSize={[1024, 1024]} />
      <pointLight position={[-2, 1.6, 2]} intensity={2.1} color={accent} />
      <Float speed={1.2} rotationIntensity={0.08} floatIntensity={0.15}>
        <Character mood={mood} speaking={speaking} accent={accent} onClick={onClick} />
      </Float>
      <ContactShadows position={[0, -0.66, 0]} opacity={0.24} scale={3.2} blur={2.8} far={2} />
      <Environment preset="city" background={false} />
    </Canvas>
  );
}

import { RoundedBox } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';
import type { CharacterMood } from '../types';

type Props = { mood: CharacterMood; speaking: boolean; accent: string; onClick?: () => void };

/** A lightweight, fully procedural 3D robot so NEXUS stays fast without external model downloads. */
export function Character({ mood, speaking, accent, onClick }: Props) {
  const root = useRef<THREE.Group>(null);
  const head = useRef<THREE.Group>(null);
  const leftArm = useRef<THREE.Group>(null);
  const rightArm = useRef<THREE.Group>(null);
  const leftEye = useRef<THREE.Mesh>(null);
  const rightEye = useRef<THREE.Mesh>(null);
  const speaker = useRef<THREE.Mesh>(null);
  const elapsed = useRef(0);

  useFrame((_state, delta) => {
    elapsed.current += delta;
    const time = elapsed.current;
    if (!root.current || !head.current || !leftArm.current || !rightArm.current) return;
    root.current.position.y = Math.sin(time * 2.1) * 0.035 + (mood === 'sleep' ? -0.14 : 0);
    root.current.rotation.y = Math.sin(time * 0.45) * 0.08;
    head.current.rotation.y = Math.sin(time * 0.65) * 0.14;
    head.current.rotation.z = Math.sin(time * 0.72) * 0.022;
    leftArm.current.rotation.z = 0.13 + Math.sin(time * 1.4) * 0.035;
    rightArm.current.rotation.z = -0.13 - Math.sin(time * 1.4) * 0.035;
    if (mood === 'wave') rightArm.current.rotation.z = -0.72 + Math.sin(time * 8) * 0.26;
    if (mood === 'thinking') head.current.rotation.z = -0.11;
    if (mood === 'sleep') { head.current.rotation.z = -0.16; leftArm.current.rotation.z = 0.35; rightArm.current.rotation.z = -0.35; }
    if (mood === 'celebrate') { root.current.position.y = Math.abs(Math.sin(time * 5)) * 0.2; leftArm.current.rotation.z = 0.8; rightArm.current.rotation.z = -0.8; }
    const blink = Math.sin(time * 0.7) > 0.985;
    const eyeHeight = mood === 'sleep' || blink ? 0.12 : 1;
    if (leftEye.current) leftEye.current.scale.y = eyeHeight;
    if (rightEye.current) rightEye.current.scale.y = eyeHeight;
    if (speaker.current) { speaker.current.scale.x = speaking ? 0.72 + Math.abs(Math.sin(time * 15)) * 0.34 : 0.72; speaker.current.scale.y = speaking ? 0.55 + Math.abs(Math.sin(time * 15)) * 0.34 : 0.55; }
  });

  const white = '#f4f2ed';
  const pearl = '#e6e3dc';
  const dark = '#101923';
  const copper = accent || '#bd815d';
  const cyan = '#31e6ff';

  return (
    <group ref={root} scale={0.86} onClick={onClick} dispose={null}>
      <group ref={head} position={[0, 1.62, 0]}>
        <mesh position={[0, 0.67, 0]} rotation={[0, 0, -0.12]} castShadow><cylinderGeometry args={[0.025, 0.035, 0.45, 10]} /><meshStandardMaterial color="#aeb3b4" metalness={0.8} roughness={0.26} /></mesh>
        <mesh position={[0.02, 0.91, 0]} castShadow><sphereGeometry args={[0.08, 16, 12]} /><meshStandardMaterial color={cyan} emissive={cyan} emissiveIntensity={3.5} toneMapped={false} /></mesh>
        <RoundedBox args={[1.34, 1.05, 1.02]} radius={0.25} smoothness={5} castShadow><meshStandardMaterial color={white} roughness={0.25} metalness={0.08} /></RoundedBox>
        <RoundedBox args={[1.08, 0.76, 0.075]} radius={0.18} smoothness={5} position={[0, -0.03, 0.53]}><meshStandardMaterial color={copper} roughness={0.25} metalness={0.62} /></RoundedBox>
        <RoundedBox args={[0.98, 0.66, 0.09]} radius={0.15} smoothness={5} position={[0, -0.03, 0.58]}><meshStandardMaterial color={dark} roughness={0.18} metalness={0.42} /></RoundedBox>
        <RoundedBox ref={leftEye} args={[0.14, 0.21, 0.035]} radius={0.055} smoothness={4} position={[-0.22, 0.02, 0.65]}><meshStandardMaterial color={cyan} emissive={cyan} emissiveIntensity={4.2} toneMapped={false} /></RoundedBox>
        <RoundedBox ref={rightEye} args={[0.14, 0.21, 0.035]} radius={0.055} smoothness={4} position={[0.22, 0.02, 0.65]}><meshStandardMaterial color={cyan} emissive={cyan} emissiveIntensity={4.2} toneMapped={false} /></RoundedBox>
        <RoundedBox ref={speaker} args={[0.2, 0.045, 0.025]} radius={0.02} smoothness={3} position={[0, -0.25, 0.65]}><meshStandardMaterial color="#74dce8" emissive="#37c7d8" emissiveIntensity={1.5} toneMapped={false} /></RoundedBox>
        <mesh position={[-0.69, -0.05, 0]} rotation={[0, Math.PI / 2, 0]} castShadow><torusGeometry args={[0.18, 0.045, 8, 20]} /><meshStandardMaterial color="#aeb1b1" metalness={0.72} roughness={0.3} /></mesh>
        <mesh position={[-0.72, -0.05, 0]} rotation={[0, Math.PI / 2, 0]}><cylinderGeometry args={[0.1, 0.1, 0.045, 16]} /><meshStandardMaterial color={pearl} metalness={0.45} roughness={0.3} /></mesh>
      </group>

      <RoundedBox args={[0.98, 1.2, 0.72]} radius={0.2} smoothness={5} position={[0, 0.55, 0]} castShadow><meshStandardMaterial color={white} roughness={0.27} metalness={0.08} /></RoundedBox>
      <RoundedBox args={[0.72, 0.42, 0.045]} radius={0.12} smoothness={4} position={[0, 0.62, 0.39]}><meshStandardMaterial color="#d4d2cc" roughness={0.25} metalness={0.2} /></RoundedBox>
      <mesh position={[0, 0.62, 0.43]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.25, 0.045, 10, 32]} /><meshStandardMaterial color={copper} roughness={0.24} metalness={0.55} /></mesh>
      <mesh position={[0, 0.62, 0.46]}><sphereGeometry args={[0.055, 16, 12]} /><meshStandardMaterial color={cyan} emissive={cyan} emissiveIntensity={3} toneMapped={false} /></mesh>

      <group ref={leftArm} position={[-0.58, 0.66, 0]}>
        <mesh position={[0, -0.24, 0]} rotation={[0, 0, 0.12]} castShadow><capsuleGeometry args={[0.12, 0.44, 8, 14]} /><meshStandardMaterial color={pearl} roughness={0.3} metalness={0.25} /></mesh>
        <mesh position={[0, -0.52, 0]}><sphereGeometry args={[0.14, 16, 12]} /><meshStandardMaterial color="#b6b9b7" roughness={0.28} metalness={0.58} /></mesh>
        <mesh position={[0, -0.64, 0]}><capsuleGeometry args={[0.13, 0.25, 7, 12]} /><meshStandardMaterial color={white} roughness={0.3} metalness={0.1} /></mesh>
      </group>
      <group ref={rightArm} position={[0.58, 0.66, 0]}>
        <mesh position={[0, -0.24, 0]} rotation={[0, 0, -0.12]} castShadow><capsuleGeometry args={[0.12, 0.44, 8, 14]} /><meshStandardMaterial color={pearl} roughness={0.3} metalness={0.25} /></mesh>
        <mesh position={[0, -0.52, 0]}><sphereGeometry args={[0.14, 16, 12]} /><meshStandardMaterial color="#b6b9b7" roughness={0.28} metalness={0.58} /></mesh>
        <mesh position={[0, -0.64, 0]}><capsuleGeometry args={[0.13, 0.25, 7, 12]} /><meshStandardMaterial color={white} roughness={0.3} metalness={0.1} /></mesh>
      </group>

      <RoundedBox args={[0.27, 0.42, 0.36]} radius={0.09} smoothness={4} position={[-0.22, -0.19, 0.02]} castShadow><meshStandardMaterial color={pearl} roughness={0.32} metalness={0.2} /></RoundedBox>
      <RoundedBox args={[0.27, 0.42, 0.36]} radius={0.09} smoothness={4} position={[0.22, -0.19, 0.02]} castShadow><meshStandardMaterial color={pearl} roughness={0.32} metalness={0.2} /></RoundedBox>
    </group>
  );
}

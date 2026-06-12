'use client';

import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, Sparkles, MeshDistortMaterial } from '@react-three/drei';
import * as THREE from 'three';

// A visual 3D node representing a single belt rank
const BeltNode = ({ position, color, glowing }: { position: [number, number, number], color: string, glowing: boolean }) => {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (glowing && meshRef.current) {
      meshRef.current.rotation.y += 0.01;
      meshRef.current.rotation.x += 0.005;
    }
  });

  return (
    <Float speed={2} rotationIntensity={0.5} floatIntensity={1}>
      <mesh position={position} ref={meshRef}>
        <torusGeometry args={[1, 0.3, 16, 100]} />
        <MeshDistortMaterial 
          color={color} 
          emissive={glowing ? color : '#000'} 
          emissiveIntensity={glowing ? 2 : 0} 
          distort={0.2} 
          speed={2} 
        />
        {glowing && <Sparkles count={50} scale={3} size={2} speed={0.4} color={color} />}
      </mesh>
    </Float>
  );
};

export const BeltTracker3D = ({ currentRankColor }: { currentRankColor: string }) => {
  return (
    <div className="w-full h-[400px]">
      <Canvas camera={{ position: [0, 0, 8], fov: 50 }}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} intensity={1} />
        
        {/* Previous Rank */}
        <BeltNode position={[-3, 0, 0]} color="#ffffff" glowing={false} />
        
        {/* Current Rank */}
        <BeltNode position={[0, 0, 2]} color={currentRankColor} glowing={true} />
        
        {/* Next Rank */}
        <BeltNode position={[3, 0, 0]} color="#000000" glowing={false} />
      </Canvas>
    </div>
  );
};

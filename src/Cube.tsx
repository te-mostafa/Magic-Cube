import React, { useMemo, useRef } from "react";
import { View, PanResponder } from "react-native";
import { Canvas, useFrame } from "@react-three/fiber/native";
import * as THREE from "three";
import { Instance, Instances, RoundedBoxGeometry } from "@react-three/drei";

const cubePos = [
    [-1, -1, -1], [-1, -1, 0], [-1, -1, 1],
    [-1,  0, -1], [-1,  0, 0], [-1,  0, 1],
    [-1,  1, -1], [-1,  1, 0], [-1,  1, 1],
    [ 0, -1, -1], [ 0, -1, 0], [ 0, -1, 1],
    [ 0,  0, -1], [ 0,  0, 0], [ 0,  0, 1],
    [ 0,  1, -1], [ 0,  1, 0], [ 0,  1, 1],
    [ 1, -1, -1], [ 1, -1, 0], [ 1, -1, 1],
    [ 1,  0, -1], [ 1,  0, 0], [ 1,  0, 1],
    [ 1,  1, -1], [ 1,  1, 0], [ 1,  1, 1]
]

function Cube({ panRef }) {
    const meshRef = useRef<THREE.Mesh>(null!);

    useFrame(() => {
        if (!meshRef.current) return;

        meshRef.current.rotation.y += panRef.current.x * 0.01;
        meshRef.current.rotation.x += panRef.current.y * 0.01;
      
        panRef.current.x = 0;
        panRef.current.y = 0;
    });

    return (
        <mesh ref={meshRef}>
            <Instances>
                <RoundedBoxGeometry args={[1, 1, 1]} radius={0.2} smoothness={4} />
                <meshStandardMaterial color={"grey"} />
                {cubePos.map((pos, i) => (
                    <Instance key={i} position={pos} />
                ))}
            </Instances>
        </mesh>
    );
}

export default function CubeScreen() {
    const panRef = useRef({ x: 0, y: 0 });
    const prevRef = useRef({ x: 0, y: 0 });
    
    const panResponder = useRef(
        PanResponder.create({
            onMoveShouldSetPanResponder: () => true,
            onPanResponderMove: (_, gestureState) => {
            const deltaX = gestureState.dx - prevRef.current.x;
            const deltaY = gestureState.dy - prevRef.current.y;
        
            panRef.current.x = deltaX;
            panRef.current.y = deltaY;
        
            prevRef.current.x = gestureState.dx;
            prevRef.current.y = gestureState.dy;
            },
            onPanResponderRelease: () => {
            panRef.current = { x: 0, y: 0 };
            prevRef.current = { x: 0, y: 0 };
            },
        })
    ).current;

    return (
        <View style={{ flex: 1 }} {...panResponder.panHandlers}>
        <Canvas camera={{ position: [0, 0, 8] }}>
            <ambientLight />
            <directionalLight position={[5, 5, 5]} />
            <Cube panRef={panRef} />
        </Canvas>
        </View>
    );
}

import React, { useEffect, useMemo, useRef } from "react";
import { View, PanResponder } from "react-native";
import { Canvas, useFrame } from "@react-three/fiber/native";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three-stdlib";
import { Instance, Instances } from "@react-three/drei";

function createFaceAtlas() {
    const colors = [
        new THREE.Color("white"),  // +X
        new THREE.Color("yellow"), // -X
        new THREE.Color("lightgreen"),  // +Y
        new THREE.Color("blue"),   // -Y
        new THREE.Color("red"),    // +Z
        new THREE.Color("orange"), // -Z
        new THREE.Color("black") // No Face
    ];
  
    const data = new Uint8Array(7 * 4);
    colors.forEach((c, i) => {
        data[i * 4 + 0] = Math.floor(c.r * 255);
        data[i * 4 + 1] = Math.floor(c.g * 255);
        data[i * 4 + 2] = Math.floor(c.b * 255);
        data[i * 4 + 3] = 255 // Fully opaque
    });
  
    const tex = new THREE.DataTexture(data, 7, 1, THREE.RGBAFormat);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    tex.needsUpdate = true;
  
    return tex;
}

const colorSides = [
    [0, 1, 'darkorange'],
    [0, -1, 'red'],
    [1, 1, 'white'],
    [1, -1, 'yellow'],
    [2, 1, 'green'],
    [2, -1, 'blue']
]

function Cubelet({ position, geometry }) {
    return (
        <mesh position={position} geometry={geometry}>
            {[...Array(6).keys()].map((i) => (
                <meshStandardMaterial
                    key={i}
                    attach={`material-${i}`}
                    color={position[colorSides[i][0]] === colorSides[i][1] ? colorSides[i][2] : `black`}
                />
            ))}
        </mesh>
    )
}

function createCubeGeometry({position}) {
    const box = new RoundedBoxGeometry(1, 1, 1, 5, 0.2);
    box.computeVertexNormals();
    
    const norm = box.attributes.normal;

    const uvs = [];
    for (let i = 0; i < norm.count; i++) {
        const n = new THREE.Vector3().fromBufferAttribute(norm, i);
        
        let faceIndex = 6;

        if (n.x >=  0.91) faceIndex = 0;
        if (n.x <= -0.91) faceIndex = 1; 
        if (n.y >=  0.91) faceIndex = 2;
        if (n.y <= -0.91) faceIndex = 3; 
        if (n.z >=  0.91) faceIndex = 4;
        if (n.z <= -0.91) faceIndex = 5;

        const u = (faceIndex + 0.5) / 7;
        uvs.push(u, 0.5);
    }

    box.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    return box;
}

function Cube({ panRef }: { panRef: React.RefObject<{ x: number; y: number }> }) {
    const groupRef = useRef<THREE.Group>(null!);
    
    const roundedBoxGeometry = useMemo(() => {
        return new RoundedBoxGeometry(1, 1, 1, 3, 0.1)
    }, [])

    useFrame(() => {
        if (!groupRef.current) return;

        const up = new THREE.Vector3(0, 1, 0);
        up.applyQuaternion(groupRef.current.quaternion);

        // Prevent upside down by limiting rotation.x

        // Compute proposed new rotation.x
        let newRotX = groupRef.current.rotation.x + panRef.current.y * 0.01;

        const maxAngle = Math.PI / 2 * 0.99; // slightly less than 90 deg to avoid gimbal issues
        newRotX = THREE.MathUtils.clamp(newRotX, -maxAngle, maxAngle);

        groupRef.current.rotation.y += panRef.current.x * 0.01;
        groupRef.current.rotation.x = newRotX;

        panRef.current.x = 0;
        panRef.current.y = 0;
    });

    return (
        <group ref={groupRef}>
            {[...Array(3).keys()].map((x) =>
                [...Array(3).keys()].map((y) =>
                    [...Array(3).keys()].map((z) => (
                        <Cubelet key={x + y * 3 + z * 9} position={[x - 1, y - 1, z - 1]} geometry={roundedBoxGeometry} />
                        ))
                    )
                )}
        </group>
    );
}

export default function CubeScreen({ route }) {
    const faces = route.params.faces;

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

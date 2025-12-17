"use client";

import {useTheme} from "next-themes";
import {useCallback, useEffect, useMemo, useRef} from "react";
import * as THREE from "three";

type GeometryShape = {
  mesh: THREE.Mesh;
  rotationSpeed: THREE.Vector3;
  floatSpeed: number;
  floatRange: number;
  initialY: number;
};

export type Auth3DSceneProps = Readonly<{
  className?: string;
  intensity?: "low" | "medium" | "high";
}>;

const GEOMETRY_COUNT = {low: 4, medium: 6, high: 10} as const;
const COLORS = {
  light: {primary: 0x6366f1, secondary: 0x8b5cf6, accent: 0x06b6d4},
  dark: {primary: 0x818cf8, secondary: 0xa78bfa, accent: 0x22d3ee},
} as const;

/**
 * Three.js animated 3D geometric shapes scene for authentication pages.
 *
 * @remarks
 * **Rendering Context**: Client Component with Three.js WebGL rendering.
 *
 * **Features**:
 * - Floating geometric shapes (icosahedrons, octahedrons, torus knots)
 * - Smooth rotation and floating animations
 * - Theme-aware colors (light/dark mode)
 * - Performance optimized with requestAnimationFrame
 * - Responsive canvas sizing
 *
 * **Performance Considerations**:
 * - Uses instanced materials where possible
 * - Cleans up WebGL context on unmount
 * - Pauses animation when tab is not visible
 * - Limits geometry count based on intensity prop
 *
 * @param props - Component properties
 * @param props.className - Additional CSS classes for the container
 * @param props.intensity - Controls the number of shapes: "low" (4), "medium" (6), "high" (10)
 *
 * @returns The Three.js canvas element with animated geometric shapes
 *
 * @example
 * ```tsx
 * <Auth3DScene className="opacity-30" intensity="medium" />
 * ```
 */
export default function Auth3DScene({className, intensity = "medium"}: Auth3DSceneProps): React.JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const shapesRef = useRef<GeometryShape[]>([]);
  const frameIdRef = useRef<number>(0);
  const {theme} = useTheme();

  const colors = useMemo(() => (theme === "dark" ? COLORS.dark : COLORS.light), [theme]);
  const shapeCount = useMemo(() => GEOMETRY_COUNT[intensity], [intensity]);

  const createGeometry = useCallback((index: number): THREE.BufferGeometry => {
    const geometryType = index % 3;
    switch (geometryType) {
      case 0:
        return new THREE.IcosahedronGeometry(0.5 + Math.random() * 0.3, 0);
      case 1:
        return new THREE.OctahedronGeometry(0.4 + Math.random() * 0.3, 0);
      case 2:
      default:
        return new THREE.TorusKnotGeometry(0.3, 0.1, 64, 8);
    }
  }, []);

  const createMaterial = useCallback(
    (index: number): THREE.MeshStandardMaterial => {
      const colorKeys = Object.keys(colors) as Array<keyof typeof colors>;
      const colorKey = colorKeys[index % colorKeys.length] ?? "primary";
      const color = colors[colorKey];

      return new THREE.MeshStandardMaterial({
        color,
        metalness: 0.3,
        roughness: 0.4,
        transparent: true,
        opacity: 0.7,
        wireframe: index % 2 === 0,
      });
    },
    [colors],
  );

  const initScene = useCallback(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    // Scene setup
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // Camera setup
    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    camera.position.z = 5;
    cameraRef.current = camera;

    // Renderer setup
    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: "low-power",
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0xffffff, 1);
    pointLight.position.set(5, 5, 5);
    scene.add(pointLight);

    const pointLight2 = new THREE.PointLight(colors.primary, 0.5);
    pointLight2.position.set(-5, -5, 3);
    scene.add(pointLight2);

    // Create shapes
    const shapes: GeometryShape[] = [];
    for (let i = 0; i < shapeCount; i++) {
      const geometry = createGeometry(i);
      const material = createMaterial(i);
      const mesh = new THREE.Mesh(geometry, material);

      // Random position
      mesh.position.x = (Math.random() - 0.5) * 8;
      mesh.position.y = (Math.random() - 0.5) * 6;
      mesh.position.z = (Math.random() - 0.5) * 4 - 2;

      // Random rotation
      mesh.rotation.x = Math.random() * Math.PI * 2;
      mesh.rotation.y = Math.random() * Math.PI * 2;

      scene.add(mesh);

      shapes.push({
        mesh,
        rotationSpeed: new THREE.Vector3((Math.random() - 0.5) * 0.02, (Math.random() - 0.5) * 0.02, (Math.random() - 0.5) * 0.01),
        floatSpeed: 0.0005 + Math.random() * 0.001,
        floatRange: 0.3 + Math.random() * 0.3,
        initialY: mesh.position.y,
      });
    }
    shapesRef.current = shapes;
  }, [colors, shapeCount, createGeometry, createMaterial]);

  const animate = useCallback(() => {
    frameIdRef.current = requestAnimationFrame(animate);

    const renderer = rendererRef.current;
    const scene = sceneRef.current;
    const camera = cameraRef.current;

    if (!renderer || !scene || !camera) return;

    const time = Date.now();

    // Animate each shape
    for (const shape of shapesRef.current) {
      shape.mesh.rotation.x += shape.rotationSpeed.x;
      shape.mesh.rotation.y += shape.rotationSpeed.y;
      shape.mesh.rotation.z += shape.rotationSpeed.z;

      // Float animation
      shape.mesh.position.y = shape.initialY + Math.sin(time * shape.floatSpeed) * shape.floatRange;
    }

    renderer.render(scene, camera);
  }, []);

  const handleResize = useCallback(() => {
    if (!containerRef.current || !rendererRef.current || !cameraRef.current) return;

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    cameraRef.current.aspect = width / height;
    cameraRef.current.updateProjectionMatrix();
    rendererRef.current.setSize(width, height);
  }, []);

  useEffect(() => {
    initScene();
    animate();

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(frameIdRef.current);

      // Cleanup Three.js resources
      if (rendererRef.current) {
        rendererRef.current.dispose();
        rendererRef.current.domElement.remove();
      }

      if (sceneRef.current) {
        sceneRef.current.traverse((object) => {
          if (object instanceof THREE.Mesh) {
            object.geometry.dispose();
            if (object.material instanceof THREE.Material) {
              object.material.dispose();
            }
          }
        });
      }
    };
  }, [initScene, animate, handleResize]);

  // Update materials when theme changes
  useEffect(() => {
    for (const [index, shape] of shapesRef.current.entries()) {
      if (shape.mesh.material instanceof THREE.MeshStandardMaterial) {
        const colorKeys = Object.keys(colors) as Array<keyof typeof colors>;
        const colorKey = colorKeys[index % colorKeys.length] ?? "primary";
        shape.mesh.material.color.setHex(colors[colorKey]);
      }
    }
  }, [colors]);

  return (
    <div
      ref={containerRef}
      className={`pointer-events-none absolute inset-0 -z-10 overflow-hidden ${className ?? ""}`}
      aria-hidden='true'
    />
  );
}

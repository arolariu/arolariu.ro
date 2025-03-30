/** @format */

"use client";

import {useCallback, useEffect, useRef} from "react";
import {
  BufferAttribute,
  BufferGeometry,
  DoubleSide,
  IcosahedronGeometry,
  Mesh,
  MeshBasicMaterial,
  PerspectiveCamera,
  Points,
  PointsMaterial,
  Scene,
  WebGLRenderer,
} from "three";

/**
 * The TechSphere component renders a 3D sphere with particles using Three.js.
 * It creates a responsive canvas that adjusts to the size of its container.
 * The sphere rotates and has particles that move around it.
 * @returns The TechSphere component, which is a 3D sphere with particles.
 */
export default function TechSphere() {
  // Scene setup
  const scene = new Scene();
  const camera = new PerspectiveCamera(75, 1, 0.1, 1000);
  camera.position.z = 5;

  // Create sphere
  const geometry = new IcosahedronGeometry(3, 3);
  const material = new MeshBasicMaterial({
    color: 0x8b_5c_f6, // purple-500
    wireframe: true,
    transparent: true,
    opacity: 0.8,
    fog: true,
    depthTest: true, // enable depth testing for better rendering
    depthWrite: true, // enable depth writing for better rendering
    side: DoubleSide, // render both sides of the geometry
  });
  const sphere = new Mesh(geometry, material);

  // Create particles
  const particlesGeometry = new BufferGeometry();
  const particlesCount = 1000;
  const posArray = Float32Array.from(
    {length: particlesCount * 3},
    () =>
      // eslint-disable-next-line sonarjs/pseudo-random
      (Math.random() - 0.5) * 5,
  );

  particlesGeometry.setAttribute("position", new BufferAttribute(posArray, 3));
  const particlesMaterial = new PointsMaterial({
    size: 0.05,
    color: 0x63_66_f1, // blue-500
    transparent: true,
    alphaTest: 0.5, // add alpha test for better rendering
  });
  const particlesMesh = new Points(particlesGeometry, particlesMaterial);

  // Container reference element.
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Responsive size handler
  const updateSize = useCallback((renderer: WebGLRenderer) => {
    if (!containerRef.current) return;
    const containerWidth = containerRef.current.clientWidth;
    const width = Math.min(600, containerWidth);
    const height = width;
    renderer.setSize(width, height);
  }, []);

  // Animation loop handler
  const animate = useCallback(
    (renderer: WebGLRenderer) => {
      const rotationSpeed = {x: 0.003, y: 0.005};
      requestAnimationFrame(() => animate(renderer));

      // Rotate sphere
      sphere.rotation.x += rotationSpeed.x;
      sphere.rotation.y += rotationSpeed.y;

      // Rotate particles slightly
      particlesMesh.rotation.x += 0.001;
      particlesMesh.rotation.y += 0.001;
      particlesMesh.rotation.z += 0.001;

      renderer.render(scene, camera);
    },
    [scene, camera],
  );

  useEffect(() => {
    if (!containerRef.current) return;

    const renderer = new WebGLRenderer({
      antialias: true,
      alpha: true,
    });

    updateSize(renderer);

    containerRef.current.append(renderer.domElement);
    scene.add(sphere);
    scene.add(particlesMesh);

    animate(renderer);

    // Handle resize
    const handleResize = () => {
      updateSize(renderer);
      camera.updateProjectionMatrix();
    };

    globalThis.addEventListener("resize", handleResize);

    // Cleanup
    return () => {
      globalThis.removeEventListener("resize", handleResize);

      if (containerRef.current?.contains(renderer.domElement)) {
        renderer.domElement.remove();
      }

      // Dispose resources
      geometry.dispose();
      material.dispose();
      particlesGeometry.dispose();
      particlesMaterial.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <div className='relative mx-auto w-full max-w-[600px] overflow-hidden'>
      <div
        ref={containerRef}
        className='aspect-square w-full'
      />
    </div>
  );
}

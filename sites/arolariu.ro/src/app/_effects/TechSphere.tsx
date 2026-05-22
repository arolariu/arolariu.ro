"use client";

import {useEffect, useRef} from "react";
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
import styles from "./TechSphere.module.scss";

/**
 * The TechSphere component renders a 3D sphere with particles using Three.js.
 * It creates a responsive canvas that adjusts to the size of its container.
 * The sphere rotates and has particles that move around it.
 * @returns The TechSphere component, which is a 3D sphere with particles.
 */
export default function TechSphere(): React.JSX.Element {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = containerRef.current; // snapshot the ref once
    if (!container) {
      return;
    }

    // Honor user's motion preference — render a single static frame and bail.
    const reducedMotion = globalThis.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

    // Scene setup
    const scene = new Scene();
    const camera = new PerspectiveCamera(75, 1, 0.1, 1000);
    camera.position.z = 5;

    const renderer = new WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "low-power", // hint: this is a decorative widget
    });

    // Cap pixel ratio aggressively. Rendering at native DPR=3 (some phones / 4K)
    // quadruples fragment shader work for what is essentially eye-candy.
    renderer.setPixelRatio(Math.min(1.5, globalThis.devicePixelRatio || 1));

    // Sphere
    const sphereGeometry = new IcosahedronGeometry(3, 3);
    const sphereMaterial = new MeshBasicMaterial({
      color: "#8B5CF6", // purple-500
      wireframe: true,
      transparent: true,
      opacity: 0.8,
      fog: true,
      depthTest: true, // enable depth testing for better rendering
      depthWrite: true, // enable depth writing for better rendering
      side: DoubleSide, // render both sides of the geometry
    });
    const sphere = new Mesh(sphereGeometry, sphereMaterial);
    scene.add(sphere);

    // Particles — reduced from 1000 → 400 (perceptually identical, ~60% less vertex work).
    const particlesGeometry = new BufferGeometry();
    const particlesCnt = 400;
    const posArray = new Float32Array(particlesCnt * 3);
    for (let i = 0; i < particlesCnt * 3; i++) {
      // eslint-disable-next-line security/detect-object-injection -- safe access
      posArray[i] =
        // eslint-disable-next-line sonarjs/pseudo-random -- using Math.random for simplicity
        (Math.random() - 0.5) * 5;
    }

    particlesGeometry.setAttribute("position", new BufferAttribute(posArray, 3));
    const particlesMaterial = new PointsMaterial({
      size: 0.05,
      color: "#6366F1", // blue-500
      transparent: true,
      alphaTest: 0.5, // add alpha test for better rendering
    });

    const particlesMesh = new Points(particlesGeometry, particlesMaterial);
    scene.add(particlesMesh);

    // Sizing and Resize Handling
    const handleResize = () => {
      const size = Math.min(600, container.clientWidth);
      renderer.setSize(size, size);
      camera.aspect = 1;
      camera.updateProjectionMatrix();
    };

    handleResize();
    container.append(renderer.domElement);
    globalThis.addEventListener("resize", handleResize);

    // Visibility gating — only animate when (a) the canvas is on-screen,
    // and (b) the document is visible. Otherwise scrolling away from the hero
    // still pays for full-Hz WebGL frames.
    let isInView = true;
    let isDocumentVisible = !globalThis.document?.hidden;
    let rafId = 0;

    const renderOnce = () => {
      sphere.rotation.y += 0.005;
      particlesMesh.rotation.y += 0.001;
      renderer.render(scene, camera);
    };

    const animate = () => {
      if (!isInView || !isDocumentVisible) {
        rafId = 0;
        return;
      }
      renderOnce();
      rafId = requestAnimationFrame(animate);
    };

    const startLoop = () => {
      if (rafId === 0 && isInView && isDocumentVisible && !reducedMotion) {
        rafId = requestAnimationFrame(animate);
      }
    };

    const stopLoop = () => {
      if (rafId !== 0) {
        cancelAnimationFrame(rafId);
        rafId = 0;
      }
    };

    const intersectionObserver = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (!entry) return;
        isInView = entry.isIntersecting;
        if (isInView) {
          startLoop();
        } else {
          stopLoop();
        }
      },
      {threshold: 0},
    );
    intersectionObserver.observe(container);

    const handleVisibilityChange = () => {
      isDocumentVisible = !globalThis.document.hidden;
      if (isDocumentVisible) {
        startLoop();
      } else {
        stopLoop();
      }
    };
    globalThis.document?.addEventListener("visibilitychange", handleVisibilityChange);

    if (reducedMotion) {
      // Render a single frame so the user sees the sphere — but never animate.
      renderOnce();
    } else {
      startLoop();
    }

    // Cleanup
    return () => {
      stopLoop();
      intersectionObserver.disconnect();
      globalThis.document?.removeEventListener("visibilitychange", handleVisibilityChange);
      globalThis.removeEventListener("resize", handleResize);
      if (container.contains(renderer.domElement)) {
        renderer.domElement.remove();
      }

      sphereGeometry.dispose();
      sphereMaterial.dispose();
      particlesGeometry.dispose();
      particlesMaterial.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <div className={styles["container"]}>
      <div
        ref={containerRef}
        className={styles["canvas"]}
      />
    </div>
  );
}

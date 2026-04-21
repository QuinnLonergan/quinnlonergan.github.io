"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

export default function CRTModel() {
  const hitRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const hitArea = hitRef.current;
    if (!hitArea) return;

    const modelCanvas = document.createElement("canvas");
    const isMobile = window.innerWidth < 480;
    const W = isMobile
      ? Math.round(Math.min(window.innerWidth * 0.75, 380))
      : Math.round(Math.min(window.innerWidth * 0.4, 500));
    const H = isMobile
      ? Math.round(Math.min(window.innerHeight * 0.5, 420))
      : Math.round(Math.min(window.innerHeight * 0.55, 600));
    modelCanvas.width = W;
    modelCanvas.height = H;
    (window as any).__crtModelCanvas = modelCanvas;

    const scene = new THREE.Scene();

    const fov = isMobile ? 38 : 35;
    const camera = new THREE.PerspectiveCamera(fov, W / H, 0.1, 100);
    const startAngle = Math.PI * 1.25
    const dist = 4;
    camera.position.set(
      Math.sin(startAngle) * dist,
      isMobile ? 0.3 : 0.5,
      Math.cos(startAngle) * dist,
    );

    const renderer = new THREE.WebGLRenderer({
      canvas: modelCanvas,
      alpha: true,
      antialias: true,
      preserveDrawingBuffer: true,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(1); // offscreen, no DPR needed
    renderer.setClearColor(0x000000, 0);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.6;
    renderer.setSize(W, H);

    const ambient = new THREE.AmbientLight(0xc8a97e, 0.7);
    scene.add(ambient);

    const keyLight = new THREE.DirectionalLight(0xede5d8, 2.4);
    keyLight.position.set(-3, 4, 5);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xc8a97e, 1.0);
    fillLight.position.set(3, 1, 3);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0x8a7f72, 0.8);
    rimLight.position.set(0, 2, -4);
    scene.add(rimLight);

    const controls = new OrbitControls(camera, hitArea);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.enableZoom = false;
    controls.enablePan = false;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 1.2;
    controls.minPolarAngle = Math.PI * 0.3;
    controls.maxPolarAngle = Math.PI * 0.7;

    let model: THREE.Object3D | null = null;
    let baseY = 0;
    const loader = new GLTFLoader();
    loader.load("/crt_tv.glb", (gltf) => {
      model = gltf.scene;

      const box = new THREE.Box3().setFromObject(model);
      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z);
      const mobInit = window.innerWidth < 480;
      const scale = (mobInit ? 1.7 : 1.8) / maxDim;
      model.scale.setScalar(scale);
      model.position.sub(center.multiplyScalar(scale));
      baseY = model.position.y;

      scene.add(model);
    });

    const resize = () => {
      const mob = window.innerWidth < 480;
      const w = mob
        ? Math.round(Math.min(window.innerWidth * 0.75, 380))
        : Math.round(Math.min(window.innerWidth * 0.4, 500));
      const h = mob
        ? Math.round(Math.min(window.innerHeight * 0.5, 420))
        : Math.round(Math.min(window.innerHeight * 0.55, 600));
      modelCanvas.width = w;
      modelCanvas.height = h;
      camera.aspect = w / h;
      camera.fov = mob ? 38 : 35;
      camera.position.y = mob ? 0.3 : 0.5;
      camera.position.z = mob ? 4 : 4;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", resize);

    const onScroll = () => {
      const isMobile = window.innerWidth < 480;
      if (isMobile) { hitArea.style.pointerEvents = "none"; return; }
      const vh = window.innerHeight;
      const progress = Math.min(1, window.scrollY / (vh * 0.6));
      hitArea.style.pointerEvents = progress > 0.8 ? "none" : "all";
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    let raf = 0;
    const clock = new THREE.Clock();
    const crtRenderer = () => (window as any).__crtRenderer;
    const animate = () => {
      raf = requestAnimationFrame(animate);
      const t = clock.getElapsedTime();

      if (model) {
        model.position.y = baseY + Math.sin(t * 0.8) * 0.08;
      }

      controls.update();
      renderer.render(scene, camera);

      const r = crtRenderer();
      if (r) r.markDirty();
    };
    animate();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("scroll", onScroll);
      controls.dispose();
      renderer.dispose();
      (window as any).__crtModelCanvas = null;
    };
  }, []);

  return (
    <div
      ref={hitRef}
      style={{
        position: "fixed",
        top: "50%",
        right: "5vw",
        transform: "translateY(-45%)",
        width: "min(40vw, 500px)",
        height: "min(55vh, 600px)",
        zIndex: 101,
        pointerEvents: "all",
        cursor: "grab",
      }}
    />
  );
}

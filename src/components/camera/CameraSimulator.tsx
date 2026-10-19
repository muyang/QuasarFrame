'use client';

import { useEffect, useRef, useState } from 'react';
import type { PerspectiveCamera, Scene, WebGLRenderer, Mesh, BufferGeometry, Material } from 'three';
import { useCameraStore } from '@/stores/useCameraStore';
import { getCameraView } from '@/lib/camera-optics';
import { useSunCalc } from '@/hooks/useSunCalc';

interface Props {
  coordinates: [number, number];
  elevation: number;
  currentDate: Date;
  timeZone: string;
}

export function CameraSimulator({ coordinates, elevation, currentDate, timeZone }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<WebGLRenderer | null>(null);
  const sceneRef = useRef<Scene | null>(null);
  const cameraRef = useRef<PerspectiveCamera | null>(null);
  const synchronizeRef = useRef<(() => void) | null>(null);
  const [error, setError] = useState(false);
  const { azimuth, elevation: cameraElevation, focalLength, sensor, portrait } = useCameraStore();
  const view = getCameraView(focalLength, sensor, portrait);
  const sunMoonData = useSunCalc(coordinates, currentDate, timeZone);
  const lng = coordinates[0], lat = coordinates[1];

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    let disposed = false;
    let cleanup: (() => void) | undefined;
    async function initialize() {
      const THREE = await import('three');
      const { Sky } = await import('three/examples/jsm/objects/Sky.js');
      if (disposed) return;
      const scene = new THREE.Scene();
      scene.fog = new THREE.FogExp2(0x88aacc, 0.0008);
      const camera = new THREE.PerspectiveCamera(40, 1.5, 1, 50000);
      camera.position.set(0, 2, 0);
      const renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 0.5;
      container!.appendChild(renderer.domElement);
      rendererRef.current = renderer;
      sceneRef.current = scene;
      cameraRef.current = camera;
      const geometry = new THREE.PlaneGeometry(20000, 20000, 64, 64);
      geometry.rotateX(-Math.PI / 2);
      const positions = geometry.attributes.position;
      for (let i = 0; i < positions.count; i++) {
        const x = positions.getX(i), z = positions.getZ(i);
        positions.setY(i, Math.sin(x * 0.001) * Math.cos(z * 0.001) * elevation * 0.4
          + Math.sin(x * 0.003 + 1.5) * Math.cos(z * 0.004) * elevation * 0.2 - elevation * 0.3);
      }
      geometry.computeVertexNormals();
      scene.add(new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color: 0x3a5a3a, roughness: 0.9, flatShading: true })));
      const sky = new Sky();
      sky.name = 'sky';
      sky.scale.setScalar(45000);
      scene.add(sky);
      const sunlight = new THREE.DirectionalLight(0xffffff, 1.5);
      sunlight.name = 'sunlight';
      scene.add(sunlight, new THREE.AmbientLight(0x404060, 0.5));
      const resize = () => {
        const width = container!.clientWidth, height = container!.clientHeight;
        if (!width || !height) return;
        renderer.setSize(width, height);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        synchronizeRef.current?.();
      };
      const observer = new ResizeObserver(resize);
      observer.observe(container!);
      cleanup = () => {
        observer.disconnect();
        scene.traverse((object) => {
          const mesh = object as Mesh<BufferGeometry, Material | Material[]>;
          mesh.geometry?.dispose();
          if (mesh.material) (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).forEach((material) => material.dispose());
        });
        renderer.dispose();
        renderer.domElement.remove();
        rendererRef.current = null;
        sceneRef.current = null;
        cameraRef.current = null;
      };
      resize();
    }
    initialize().catch(() => { if (!disposed) setError(true); });
    return () => { disposed = true; cleanup?.(); };
  }, [lng, lat, elevation]);

  useEffect(() => {
    const synchronize = () => {
      const scene = sceneRef.current, camera = cameraRef.current, renderer = rendererRef.current;
      if (!scene || !camera || !renderer) return;
      camera.fov = view.verticalFov;
      camera.updateProjectionMatrix();
      const az = azimuth * Math.PI / 180, tilt = cameraElevation * Math.PI / 180;
      camera.lookAt(Math.sin(az) * Math.cos(tilt) * 1000, camera.position.y + Math.sin(tilt) * 1000, -Math.cos(az) * Math.cos(tilt) * 1000);
      const sunAz = sunMoonData.sunPosition.azimuth * Math.PI / 180;
      const sunAlt = sunMoonData.sunPosition.altitude * Math.PI / 180;
      const sunlight = scene.getObjectByName('sunlight') as import('three').DirectionalLight;
      sunlight.position.set(Math.sin(sunAz) * Math.cos(sunAlt) * 10000, Math.sin(sunAlt) * 10000, -Math.cos(sunAz) * Math.cos(sunAlt) * 10000);
      sunlight.intensity = sunAlt < 0 ? 0.1 : sunAlt < Math.PI / 12 ? 0.8 : 1.5;
      sunlight.color.setHex(sunAlt < 0 ? 0x4444aa : sunAlt < Math.PI / 12 ? 0xffaa44 : 0xffffff);
      const sky = scene.getObjectByName('sky') as Mesh<BufferGeometry, import('three').ShaderMaterial>;
      sky.material.uniforms.sunPosition.value.copy(sunlight.position);
      renderer.render(scene, camera);
    };
    synchronizeRef.current = synchronize;
    synchronize();
  }, [azimuth, cameraElevation, view.verticalFov, sunMoonData]);

  return <div ref={containerRef} style={{ aspectRatio: view.aspect }} className="w-full rounded-xl overflow-hidden bg-black border border-border/20">
    {error && <p className="text-sm text-muted-foreground p-4">此设备暂不能显示三维示意，请使用日照轨迹和视场参数。</p>}
  </div>;
}

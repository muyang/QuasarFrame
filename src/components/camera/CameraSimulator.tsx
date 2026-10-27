'use client';

import { useEffect, useRef, useState } from 'react';
import type { PerspectiveCamera, Scene, WebGLRenderer, Mesh, BufferGeometry, Material } from 'three';
import { useCameraStore } from '@/stores/useCameraStore';
import { getCameraView } from '@/lib/camera-optics';
import { useSunCalc } from '@/hooks/useSunCalc';

interface Props {
  locationId: string;
  coordinates: [number, number];
  elevation: number;
  currentDate: Date;
  timeZone: string;
  cameraHeightM?: number;
}

interface TerrainPreview {
  metadata: { dataVersion: string; dataset: string; attribution: string; verticalDatum: string; fillMaskStatus: string };
  grid: { bounds: [number, number, number, number]; width: number; height: number; values: Array<number | null> };
  catalogueSampleM: number | null;
  originSampleM: number | null;
}

function displayHeightAtOrigin(preview: TerrainPreview, lng: number, lat: number): number | null {
  const { bounds: [west, south, east, north], width, height, values } = preview.grid;
  const x = (lng - west) * width / (east - west) - 0.5;
  const y = (north - lat) * height / (north - south) - 0.5;
  if (x < 0 || y < 0 || x > width - 1 || y > height - 1) return null;
  const col = Math.min(width - 2, Math.floor(x));
  const row = Math.min(height - 2, Math.floor(y));
  const corners = [values[row * width + col], values[row * width + col + 1],
    values[(row + 1) * width + col], values[(row + 1) * width + col + 1]];
  if (corners.some((value) => value === null)) return null;
  const dx = x - col, dy = y - row;
  return (corners[0]! * (1 - dx) + corners[1]! * dx) * (1 - dy)
    + (corners[2]! * (1 - dx) + corners[3]! * dx) * dy;
}

export function CameraSimulator({ locationId, coordinates, elevation, currentDate, timeZone, cameraHeightM = 1.6 }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<WebGLRenderer | null>(null);
  const sceneRef = useRef<Scene | null>(null);
  const cameraRef = useRef<PerspectiveCamera | null>(null);
  const synchronizeRef = useRef<(() => void) | null>(null);
  const [error, setError] = useState(false);
  const [loadedTerrain, setTerrain] = useState<{ key: string; data: TerrainPreview | null } | null>(null);
  const [terrainStatus, setTerrainStatus] = useState<'loading' | 'available' | 'unavailable'>('loading');
  const { azimuth, elevation: cameraElevation, focalLength, sensor, portrait } = useCameraStore();
  const view = getCameraView(focalLength, sensor, portrait);
  const sunMoonData = useSunCalc(coordinates, currentDate, timeZone);
  const lng = coordinates[0], lat = coordinates[1];
  const terrainKey = `${locationId}:${lng}:${lat}`;
  const terrain = loadedTerrain?.key === terrainKey ? loadedTerrain.data : null;

  useEffect(() => {
    let active = true;
    fetch(`/api/terrain/${encodeURIComponent(locationId)}/grid?longitude=${lng}&latitude=${lat}`)
      .then(async (response) => response.ok ? await response.json() as TerrainPreview : null)
      .then((data) => {
        if (!active) return;
        setTerrain({ key: terrainKey, data: data?.originSampleM === null ? null : data });
        setTerrainStatus(data?.originSampleM === null || !data ? 'unavailable' : 'available');
      })
      .catch(() => { if (active) { setTerrain({ key: terrainKey, data: null }); setTerrainStatus('unavailable'); } });
    return () => { active = false; };
  }, [locationId, lng, lat, terrainKey]);

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
      scene.fog = new THREE.FogExp2(0x88aacc, terrain ? 0.000012 : 0.0008);
      const camera = new THREE.PerspectiveCamera(40, 1.5, 1, terrain ? 150000 : 50000);
      camera.position.set(0, cameraHeightM, 0);
      const renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 0.5;
      container!.appendChild(renderer.domElement);
      rendererRef.current = renderer;
      sceneRef.current = scene;
      cameraRef.current = camera;
      let geometry: import('three').BufferGeometry;
      if (terrain && terrain.originSampleM !== null) {
        const { width, height, values, bounds } = terrain.grid;
        const [west, south, east, north] = bounds;
        // The display mesh is coarser than the source DEM. Place its local ground
        // at zero so interpolation error cannot put the preview camera underground.
        const displayOriginM = displayHeightAtOrigin(terrain, lng, lat) ?? terrain.originSampleM;
        const metersPerLng = 111320 * Math.cos(lat * Math.PI / 180);
        const metersPerLat = 111132;
        const vertices = new Float32Array(width * height * 3);
        const triangles: number[] = [];
        for (let row = 0; row < height; row++) {
          const latitude = north - (row + 0.5) * (north - south) / height;
          for (let col = 0; col < width; col++) {
            const longitude = west + (col + 0.5) * (east - west) / width;
            const index = row * width + col;
            vertices[index * 3] = (longitude - lng) * metersPerLng;
            vertices[index * 3 + 1] = (values[index] ?? displayOriginM) - displayOriginM;
            vertices[index * 3 + 2] = -(latitude - lat) * metersPerLat;
          }
        }
        for (let row = 0; row < height - 1; row++) for (let col = 0; col < width - 1; col++) {
          const a = row * width + col, b = a + 1, c = a + width, d = c + 1;
          if ([a, b, c, d].every((index) => values[index] !== null)) triangles.push(a, c, b, b, c, d);
        }
        geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
        geometry.setIndex(triangles);
      } else {
        geometry = new THREE.PlaneGeometry(20000, 20000, 64, 64);
        geometry.rotateX(-Math.PI / 2);

      }
      geometry.computeVertexNormals();
      scene.add(new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color: 0x4a6b55, roughness: 0.9, flatShading: !terrain, side: THREE.DoubleSide })));
      const sky = new Sky();
      sky.name = 'sky';
      sky.scale.setScalar(terrain ? 120000 : 45000);
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
  }, [lng, lat, elevation, terrain, cameraHeightM]);

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

  return <div>
    <div ref={containerRef} style={{ aspectRatio: view.aspect }} className="relative w-full rounded-xl overflow-hidden bg-black border border-border/20">
      {!terrain && <p className="absolute top-0 left-0 z-10 text-xs text-amber-400 bg-black/70 p-3">暂无真实地形画面 · 平面光位示意</p>}
      {error && <p className="text-sm text-muted-foreground p-4">此设备暂不能显示三维预览，请使用日照轨迹和视场参数。</p>}
    </div>
    {terrainStatus === 'available' && terrain ? <div className="text-xs text-muted-foreground mt-2 space-y-1">
      <p>Copernicus GLO-30 地表高程预览 · EGM2008 · {terrain.metadata.dataVersion}。三维网格经过缩略，机位坐标未核验，不能作为精确构图或导航结论。</p>
      {terrain.catalogueSampleM !== null && Math.abs(elevation - terrain.catalogueSampleM) > 100 && <p className="text-amber-600">注意：此示意坐标的地表高程约 {Math.round(terrain.catalogueSampleM)} 米，与目录标注的 {elevation} 米差异明显；请提供真实机位。</p>}
      <p>{terrain.metadata.attribution}</p>
    </div> : <p className="text-xs text-muted-foreground mt-2">{terrainStatus === 'loading' ? '正在加载地形数据…' : '此地点暂无可用的真实 DEM。画面仅显示平面与理论光位，不代表当地山形。'}</p>}
  </div>;
}

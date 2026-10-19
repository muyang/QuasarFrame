import { useEffect, useRef, useCallback, useState } from 'react';
import type { Location } from '@/types/location';
import { SCENERY_MARKER_COLORS } from '@/lib/constants';

// Runtime Cesium import remains dynamic so this hook can load in a browser-only context.
type CesiumViewer = import('cesium').Viewer;
type CesiumEntity = import('cesium').Entity;
type CesiumEventHandler = import('cesium').ScreenSpaceEventHandler;

export interface UseCesiumOptions {
  ionToken?: string;
  initialPosition?: { lng: number; lat: number; height: number };
}

export interface CesiumApi {
  viewer: CesiumViewer | null;
  flyTo: (location: Location) => void;
  addMarkers: (locations: Location[], onClick?: (loc: Location) => void) => void;
  clearMarkers: () => void;
}

export function useCesium(
  containerRef: React.RefObject<HTMLDivElement | null>,
  options: UseCesiumOptions = {}
): CesiumApi {
  const viewerRef = useRef<CesiumViewer | null>(null);
  const markersRef = useRef<CesiumEntity[]>([]);
  const handlerRef = useRef<CesiumEventHandler | null>(null);
  const [viewer, setViewer] = useState<CesiumViewer | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    let destroyed = false;

    const init = async () => {
      // Set base URL for Cesium assets (workers, images, etc.)
      (window as Window & { CESIUM_BASE_URL?: string }).CESIUM_BASE_URL = '/cesium';

      // Dynamic import Cesium (avoids SSR issues)
      const Cesium = await import('cesium');

      // Import Cesium CSS
      await import('cesium/Build/Cesium/Widgets/widgets.css');

      if (destroyed || !containerRef.current) return;

      // Set Ion token if available
      const token = options.ionToken || process.env.NEXT_PUBLIC_CESIUM_ION_TOKEN;
      if (token && token !== 'your_cesium_ion_token_here') {
        Cesium.Ion.defaultAccessToken = token;
      }

      try {
        const viewer = new Cesium.Viewer(containerRef.current, {
          // No Ion-dependent terrain — use ellipsoid (works without token)
          baseLayerPicker: false,
          geocoder: false,
          homeButton: false,
          sceneModePicker: false,
          navigationHelpButton: false,
          animation: false,
          timeline: false,
          fullscreenButton: false,
          vrButton: false,
          selectionIndicator: false,
          infoBox: false,
          shadows: false,
          requestRenderMode: false,
        });

        // Set initial camera to China
        const pos = options.initialPosition || { lng: 105, lat: 35, height: 4_000_000 };
        viewer.camera.setView({
          destination: Cesium.Cartesian3.fromDegrees(pos.lng, pos.lat, pos.height),
        });

        // Error handling — log but don't crash
        viewer.scene.renderError.addEventListener((_scene: unknown, error: unknown) => {
          console.warn('[Cesium] Render error:', error);
        });

        // Style the globe dark to match theme
        viewer.scene.globe.baseColor = Cesium.Color.fromCssColorString('#0a0a1a');
        viewer.scene.backgroundColor = Cesium.Color.fromCssColorString('#0a0a0f');

        viewerRef.current = viewer;
        setViewer(viewer);
      } catch (err) {
        console.error('[Cesium] Failed to initialize viewer:', err);
      }
    };

    init();

    return () => {
      destroyed = true;
      if (handlerRef.current) {
        handlerRef.current.destroy();
        handlerRef.current = null;
      }
      if (viewerRef.current && !viewerRef.current.isDestroyed()) {
        viewerRef.current.destroy();
      }
      viewerRef.current = null;
    };
  }, []);

  const flyTo = useCallback((location: Location) => {
    const viewer = viewerRef.current;
    if (!viewer || viewer.isDestroyed()) return;

    const [lng, lat] = location.coordinates;
    // Cesium is loaded on demand to keep browser-only code out of SSR.
    import('cesium').then((Cesium) => {
      if (!viewerRef.current || viewerRef.current.isDestroyed()) return;
      viewerRef.current.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(lng, lat, 5000),
        orientation: {
          heading: Cesium.Math.toRadians(location.bestViewingDirections[0] || 0),
          pitch: Cesium.Math.toRadians(-35),
          roll: 0,
        },
        duration: 2.5,
      });
    });
  }, []);

  const addMarkers = useCallback(
    (locations: Location[], onClick?: (loc: Location) => void) => {
      const viewer = viewerRef.current;
      if (!viewer || viewer.isDestroyed()) return;

      // Need Cesium for marker creation
      import('cesium').then((Cesium) => {
        if (!viewerRef.current || viewerRef.current.isDestroyed()) return;
        const v = viewerRef.current;

        // Clear existing markers
        markersRef.current.forEach((entity) => v.entities.remove(entity));
        markersRef.current = [];

        // Destroy old click handler
        if (handlerRef.current) {
          handlerRef.current.destroy();
          handlerRef.current = null;
        }

        locations.forEach((loc) => {
          const [lng, lat] = loc.coordinates;
          const primaryTag = loc.sceneryTags[0];
          const colorHex = SCENERY_MARKER_COLORS[primaryTag] || '#818cf8';
          const color = Cesium.Color.fromCssColorString(colorHex);

          const entity = v.entities.add({
            name: loc.name,
            position: Cesium.Cartesian3.fromDegrees(lng, lat, loc.elevation),
            point: {
              pixelSize: 14,
              color: color,
              outlineColor: Cesium.Color.WHITE.withAlpha(0.8),
              outlineWidth: 2,
              scaleByDistance: new Cesium.NearFarScalar(500, 1.0, 3_000_000, 0.4),
              disableDepthTestDistance: Number.POSITIVE_INFINITY,
            },
            label: {
              text: loc.name,
              font: 'bold 14px sans-serif',
              fillColor: Cesium.Color.WHITE,
              outlineColor: Cesium.Color.BLACK,
              outlineWidth: 2,
              style: Cesium.LabelStyle.FILL_AND_OUTLINE,
              verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
              pixelOffset: new Cesium.Cartesian2(0, -20),
              distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 5_000_000),
              disableDepthTestDistance: Number.POSITIVE_INFINITY,
            },
          });

          markersRef.current.push(entity);
        });

        // Click handler
        if (onClick) {
          const handler = new Cesium.ScreenSpaceEventHandler(v.scene.canvas);
          handlerRef.current = handler;
          handler.setInputAction((click: { position: import('cesium').Cartesian2 }) => {
            const picked: unknown = v.scene.pick(click.position);
            const entity = picked && typeof picked === 'object' && 'id' in picked ? picked.id : null;
            if (entity instanceof Cesium.Entity) {
              const loc = locations.find((l: Location) => l.name === entity.name);
              if (loc) onClick(loc);
            }
          }, Cesium.ScreenSpaceEventType.LEFT_CLICK);
        }
      });
    },
    []
  );

  const clearMarkers = useCallback(() => {
    const viewer = viewerRef.current;
    if (!viewer || viewer.isDestroyed()) return;
    markersRef.current.forEach((entity) => viewer.entities.remove(entity));
    markersRef.current = [];
  }, []);

  return {
    viewer,
    flyTo,
    addMarkers,
    clearMarkers,
  };
}

'use client';

import { useEffect, useRef, useState } from 'react';
import { mapViewportSchema, trustedMapEvent, type MapViewport, type ShootingWorkspace } from '@/lib/shooting-workspace';

type Props = {
  initial: ShootingWorkspace;
  vantage: [number, number];
  subject: [number, number] | null;
  onView: (view: MapViewport) => void;
  onPick: (kind: 'vantage' | 'subject', view: MapViewport) => void;
  onBearing: (bearing: number) => void;
};

/** A deliberately narrow host for GeoLibre's v2 embed protocol. No scripting/tool bridge. */
export function GeoLibreMap({ initial, vantage, subject, onView, onPick, onBearing }: Props) {
  const frame = useRef<HTMLIFrameElement>(null);
  const callbacks = useRef({ onView, onPick, onBearing });
  const readView = useRef<(() => Promise<MapViewport>) | null>(null);
  const [status, setStatus] = useState('正在启动 GeoLibre…');
  const [ready, setReady] = useState(false);
  const [center, setCenter] = useState(initial.viewport.center);
  const [retry, setRetry] = useState(0);
  useEffect(() => { callbacks.current = { onView, onPick, onBearing }; }, [onView, onPick, onBearing]);

  // Parent remounts this adapter for an explicit point/project/projection change.
  useEffect(() => {
    const iframe = frame.current;
    if (!iframe) return;
    const target = iframe.contentWindow;
    const origin = window.location.origin;
    let disposed = false, started = false, initialized = false;
    let sequence = 0;
    const pending = new Map<string, { resolve: (value: unknown) => void; reject: (error: Error) => void; timer: ReturnType<typeof setTimeout> }>();
    const send = (type: string, payload: Record<string, unknown> = {}): Promise<unknown> => new Promise((resolve, reject) => {
      if (disposed || !target) { reject(new Error('地图连接已关闭')); return; }
      const requestId = `qf-${++sequence}`;
      const timer = setTimeout(() => { pending.delete(requestId); reject(new Error('地图响应超时，请重试')); }, 12000);
      pending.set(requestId, { resolve, reject, timer });
      target.postMessage({ v: 2, type, payload, requestId }, origin);
    });
    const fail = (error: unknown) => { if (!disposed) { setReady(false); setStatus(error instanceof Error ? error.message : '地图加载失败'); } };
    const timeout = setTimeout(() => fail(new Error('GeoLibre 尚未就绪。请检查地图安装与网络，再重试。')), 45000);
    const initialize = async () => {
      if (started) return;
      started = true;
      try {
        // GeoLibre emits ready before its WebGL controller exists. Retry only this readiness check.
        for (let attempt = 0; attempt < 40; attempt++) {
          if (disposed) return;
          try { await send('getViewport'); break; }
          catch (error) { if (attempt === 39) throw error; await new Promise((resolve) => setTimeout(resolve, 250)); }
        }
        await send('loadProject', { url: `${origin}/maps/nasa-${initial.projection}.geolibre.json` });
        await send('setView', { ...initial.viewport, duration: 0 });
        for (const [id, point, color] of [['vantage', vantage, '#fbbf24'], ['subject', subject, '#67e8f9']] as const) {
          if (!point || disposed) continue;
          await send('addLayer', { spec: { id: `qf-${id}`, name: id === 'vantage' ? '拍摄机位（待核验）' : '拍摄主体（待核验）', type: 'geojson', source: { type: 'geojson' }, visible: true, opacity: 1,
            style: { markerColor: color, markerSize: 12 }, geojson: { type: 'FeatureCollection', features: [{ type: 'Feature', id, properties: { name: id }, geometry: { type: 'Point', coordinates: point } }] } } });
        }
        if (disposed) return;
        readView.current = async () => mapViewportSchema.parse(await send('getViewport'));
        initialized = true;
        setReady(true); setStatus('GeoLibre 已连接 · 拖动地图，用中心十字选点');
        clearTimeout(timeout);
      } catch (error) { fail(error); }
    };
    const receive = (event: MessageEvent) => {
      const message = trustedMapEvent(event, origin, target);
      if (!message) return;
      if (message.type === 'ready') void initialize();
      if (message.type === 'ack') {
        const id = message.payload.requestId;
        const request = typeof id === 'string' ? pending.get(id) : null;
        if (request && typeof id === 'string') {
          clearTimeout(request.timer); pending.delete(id);
          if (message.payload.ok === true) request.resolve(message.payload.result);
          else request.reject(new Error(String(message.payload.error || '地图请求失败')));
        }
      }
      if (message.type === 'viewChanged' && initialized) {
        const parsed = mapViewportSchema.safeParse(message.payload);
        if (parsed.success) { setCenter(parsed.data.center); callbacks.current.onView(parsed.data); }
      }
    };
    window.addEventListener('message', receive);
    iframe.src = `/geolibre/index.html?maponly&layout=viewer&welcome=0&theme=dark&url=${encodeURIComponent(`${origin}/maps/nasa-${initial.projection}.geolibre.json`)}`;
    return () => {
      disposed = true; clearTimeout(timeout); readView.current = null;
      window.removeEventListener('message', receive);
      for (const request of pending.values()) { clearTimeout(request.timer); request.reject(new Error('地图连接已关闭')); }
      pending.clear();
    };
  // The adapter owns this immutable mount snapshot, not live form state.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [retry]);

  async function pick(kind: 'vantage' | 'subject' | 'bearing') {
    try {
      const view = await readView.current?.();
      if (!view) return;
      callbacks.current.onView(view);
      if (kind === 'bearing') callbacks.current.onBearing((view.bearing % 360 + 360) % 360);
      else callbacks.current.onPick(kind, view);
    } catch { setStatus('无法读取地图中心，请重试'); }
  }
  return <div className="space-y-3">
    <div className="relative h-[420px] md:h-[540px] overflow-hidden rounded-xl border border-border bg-[#081423]">
      <iframe ref={frame} title="GeoLibre NASA 地图" className="h-full w-full border-0" referrerPolicy="no-referrer" allow="geolocation 'none'; camera 'none'; microphone 'none'" />
      <div aria-hidden className="pointer-events-none absolute inset-0 flex items-center justify-center"><span className="text-3xl text-white drop-shadow-[0_1px_2px_black]">＋</span></div>
      <div className="absolute left-3 top-3 rounded-lg bg-background/90 px-3 py-2 text-xs pointer-events-none">NASA 全球概览 · 2004-08<br />黄点：机位 · 青点：主体</div>
    </div>
    <p role="status" className="text-xs text-muted-foreground">{status} · 中心 {center[0].toFixed(5)}, {center[1].toFixed(5)}</p>
    <div className="flex flex-wrap gap-2">
      <button disabled={!ready} onClick={() => void pick('vantage')} className="workbench-button">中心设为机位</button>
      <button disabled={!ready} onClick={() => void pick('subject')} className="workbench-button">中心设为主体</button>
      <button disabled={!ready} onClick={() => void pick('bearing')} className="workbench-button">地图朝向应用到镜头</button>
      <button onClick={() => { setReady(false); setStatus('重新连接…'); setRetry((value) => value + 1); }} className="workbench-button">重载地图</button>
    </div>
  </div>;
}

'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Image from 'next/image';
import Link from 'next/link';
import { Camera, Lock, CheckCircle, Loader2 } from 'lucide-react';
import Hls from 'hls.js';
import flvjs from 'flv.js';

interface FeedDetail {
  id: string;
  name: string;
  locationId: string | null;
  type: 'official' | 'third_party';
  streamUrl: string | null;
  snapshotUrl: string | null;
  streamType: 'hls' | 'rtmp' | 'flv' | 'image' | 'mjpeg';
  isLive: boolean;
  thumbnailUrl: string | null;
  description: string | null;
  status: string;
  owner: { id: string; name: string; avatar: string | null; role: string; isCreator?: boolean } | null;
  canAccess: boolean;
  reason: 'free' | 'subscribed' | 'purchased' | 'owner' | 'login_required';
}

export default function FeedDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [feed, setFeed] = useState<FeedDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [unlocking, setUnlocking] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  useEffect(() => {
    params.then(({ id }) => {
      fetch(`/api/feeds/${id}`)
        .then((r) => r.json())
        .then((data) => {
          setFeed(data);
          if (data.snapshotUrl) {
            setImageUrl(data.snapshotUrl);
          }
          setLoading(false);
        })
        .catch(() => setLoading(false));
    });
  }, [params]);

  // HLS / FLV / image handling
  useEffect(() => {
    if (!feed || !feed.canAccess) return;

    if (feed.streamType === 'hls' && feed.streamUrl && videoRef.current) {
      const video = videoRef.current;
      if (Hls.isSupported()) {
        const hls = new Hls();
        hls.loadSource(feed.streamUrl!);
        hls.attachMedia(video);
        return () => hls.destroy();
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = feed.streamUrl;
      }
    }

    if (feed.streamType === 'flv' && videoRef.current && flvjs.isSupported()) {
      const video = videoRef.current;
      const player = flvjs.createPlayer(
        { type: 'flv', url: `/api/feeds/${feed.id}/stream`, isLive: true },
        { enableStashBuffer: false, stashInitialSize: 128 }
      );
      player.attachMediaElement(video);
      player.on(flvjs.Events.ERROR, (type, detail) => {
        console.error('[flv] error', type, detail);
      });
      player.load();
      video.play().catch(() => {});
      return () => player.destroy();
    }

    if (feed.streamType === 'image' && feed.snapshotUrl) {
      const interval = setInterval(() => {
        setImageUrl(`${feed.snapshotUrl}?t=${Date.now()}`);
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [feed]);

  async function handleUnlock() {
    if (!feed) return;
    if (!session?.user) {
      router.push('/auth/login');
      return;
    }
    setUnlocking(true);
    const res = await fetch(`/api/feeds/${feed.id}/unlock`, { method: 'POST' });
    const data = await res.json();
    setUnlocking(false);

    if (res.ok) {
      window.location.reload();
    } else {
      alert(data.error || '解锁失败');
    }
  }

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-glow/30 border-t-glow rounded-full animate-spin" />
      </div>
    );
  }

  if (!feed) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center text-white/60">
        摄像头不存在
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="mb-6">
        <Link href="/feeds/live" className="text-sm text-white/50 hover:text-glow transition-colors">
          ← 返回实时风景
        </Link>
      </div>

      <div className="flex items-start justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Camera className="w-6 h-6 text-glow" />
            {feed.name}
          </h1>
          {feed.owner && (
            <p className="text-white/50 text-sm mt-1">
              提供者：{feed.owner.name} · {feed.owner.role === 'admin' ? '官方' : feed.owner.isCreator ? '摄影师' : '驴友'}
            </p>
          )}
        </div>
        {feed.isLive && (
          <div className="flex items-center gap-1.5 px-3 py-1 bg-red-500/90 text-white text-sm font-medium rounded-full">
            <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
            LIVE
          </div>
        )}
      </div>

      <div className="relative aspect-video bg-black/40 rounded-xl overflow-hidden border border-white/10 mb-6">
        {feed.canAccess ? (
          feed.streamType === 'hls' || feed.streamType === 'rtmp' || feed.streamType === 'flv' ? (
            <video ref={videoRef} controls autoPlay muted playsInline className="w-full h-full" />
          ) : (
            <Image
              src={imageUrl || feed.thumbnailUrl || feed.snapshotUrl || ''}
              alt={feed.name}
              fill
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 1024px"
            />
          )
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-white/60">
            <Lock className="w-12 h-12 mb-3 opacity-50" />
            <p className="text-lg font-medium">需要订阅或解锁</p>
            <p className="text-sm text-white/40 mt-1">升级为摄影版/专业版会员，或单独解锁此摄像头</p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-4">
          <div className="bg-white/5 border border-white/10 rounded-xl p-5">
            <h2 className="text-lg font-semibold text-white mb-2">介绍</h2>
            <p className="text-white/70 leading-relaxed">{feed.description || '暂无介绍'}</p>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-xl p-5">
            <h2 className="text-lg font-semibold text-white mb-2">信息</h2>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="text-white/40">类型</div>
              <div className="text-white">{feed.type === 'official' ? '官方' : '第三方'}</div>
              <div className="text-white/40">流协议</div>
              <div className="text-white uppercase">{feed.streamType}</div>
              <div className="text-white/40">状态</div>
              <div className="text-white">{feed.status === 'active' ? '运行中' : feed.status}</div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {feed.canAccess ? (
            <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-5 flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-green-400" />
              <div>
                <p className="text-white font-medium">已可观看</p>
                <p className="text-white/50 text-sm">
                  {feed.reason === 'subscribed'
                    ? '会员权益已生效'
                    : feed.reason === 'purchased'
                    ? '已解锁'
                    : feed.reason === 'owner'
                    ? '你是资源提供者'
                    : '免费资源'}
                </p>
              </div>
            </div>
          ) : (
            <div className="bg-white/5 border border-white/10 rounded-xl p-5">
              <h3 className="text-white font-medium mb-2 flex items-center gap-2">
                <Lock className="w-4 h-4" />
                解锁观看
              </h3>
              <p className="text-white/50 text-sm mb-4">
                订阅摄影版/专业版可观看全部第三方摄像头，或单独解锁此摄像头。
              </p>
              <div className="space-y-2">
                <button
                  onClick={() => router.push('/membership')}
                  className="w-full py-2 rounded-lg bg-glow text-black font-medium hover:bg-glow/90 transition-colors"
                >
                  查看会员计划
                </button>
                <button
                  onClick={handleUnlock}
                  disabled={unlocking || status === 'unauthenticated'}
                  className="w-full py-2 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {unlocking ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  解锁 ¥5
                </button>
                {status === 'unauthenticated' && (
                  <p className="text-xs text-white/40 text-center">
                    请先 <Link href="/auth/login" className="text-glow hover:underline">登录</Link>
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

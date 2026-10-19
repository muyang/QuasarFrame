'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Camera, Upload, CreditCard, TrendingUp,
  Image, Download, Eye, DollarSign, Crown,
  Plus, ArrowRight, Map as MapIcon, Bell, Tv, Radio, ShoppingBag, Wallet, Settings,
} from 'lucide-react';

interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: string;
  isCreator?: boolean;
  membership: string;
  balance: number;
  bio: string | null;
  avatar: string | null;
}

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login');
    }
  }, [status, router]);

  useEffect(() => {
    if (status === 'authenticated') {
      fetch('/api/users/me')
        .then((r) => r.json())
        .then(setProfile)
        .catch(console.error);
    }
  }, [status]);

  if (status === 'loading' || !profile) {
    return (
      <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-glow/30 border-t-glow rounded-full animate-spin" />
      </div>
    );
  }

  const roleLabel = profile.role === 'admin' ? '管理员'
    : profile.isCreator ? '摄影师' : '驴友';

  const memberLabel = profile.membership === 'pro' ? '专业版'
    : profile.membership === 'photo' ? '摄影版' : '免费版';

  const isAdmin = profile.role === 'admin';

  // Hub navigation cards — one per section of the personal center.
  const hubCards = [
    { href: '/profile/works', icon: Image, title: '我的作品', desc: '管理已上传的照片与 EXIF', soon: false },
    { href: '/profile/routes', icon: MapIcon, title: '我的线路', desc: '我创建的度假拍摄线路', soon: false },
    { href: '/profile/orders', icon: ShoppingBag, title: '我的订单', desc: '电子相框与内容包订单', soon: false },
    { href: '/profile/commissions', icon: Wallet, title: '我的分佣', desc: '照片/相框版权/广告联营收益', soon: false },
    { href: '/subscribe', icon: Bell, title: '景色订阅', desc: '订阅的景色条件与通知', soon: false },
    { href: '/feeds/manage', icon: Camera, title: '我的摄像头', desc: '我名下的实时风景资源', soon: false },
    { href: '/membership', icon: CreditCard, title: '会员中心', desc: '升级会员、查看订阅状态', soon: false },
    { href: `/profile/${profile.id}`, icon: Settings, title: '公开主页与资料', desc: '修改资料、查看公开主页', soon: false },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-10">
        <div>
          <p className="text-xs uppercase tracking-widest text-glow/70 mb-2 font-mono">PROFILE</p>
          <h1 className="text-3xl font-bold font-heading">{profile.name}</h1>
          <p className="text-muted-foreground mt-1 text-sm">{profile.email}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs px-2.5 py-1 rounded-full bg-muted text-muted-foreground border border-border/50">{roleLabel}</span>
          <span className="text-xs px-2.5 py-1 rounded-full bg-glow/10 text-glow flex items-center gap-1 border border-glow/30">
            <Crown className="w-3 h-3" />
            {memberLabel}
          </span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-12">
        <StatCard icon={<Image className="w-5 h-5" />} label="我的作品" value="—" />
        <StatCard icon={<Download className="w-5 h-5" />} label="下载次数" value="—" />
        <StatCard icon={<Eye className="w-5 h-5" />} label="被浏览" value="—" />
        <StatCard icon={<DollarSign className="w-5 h-5" />} label="余额" value={`¥${profile.balance.toFixed(2)}`} />
      </div>

      {/* Hub nav */}
      <div className="editorial-rule" />
      <div className="flex items-end justify-between mb-6">
        <h2 className="text-xl font-semibold font-heading">个人中心</h2>
        {isAdmin && (
          <Link href="/admin" className="text-xs text-glow hover:underline flex items-center gap-1">
            <TrendingUp className="w-3 h-3" /> 进入后台
          </Link>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {hubCards.map((card) => {
          const Icon = card.icon;
          return (
            <Link
              key={card.href}
              href={card.href}
              className={`group relative bg-card border border-border/50 rounded-xl p-5 hover:border-glow/40 transition-all card-lift ${
                card.soon ? 'opacity-80' : ''
              }`}
            >
              <div className="text-glow mb-3">
                <Icon className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-medium group-hover:text-glow transition-colors flex items-center gap-1.5">
                {card.title}
                {card.soon && (
                  <span className="text-[10px] px-1.5 py-0 rounded-full bg-muted text-muted-foreground border border-border/50">
                    即将上线
                  </span>
                )}
              </h3>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{card.desc}</p>
            </Link>
          );
        })}
      </div>

      {/* Quick upload */}
      <div className="editorial-rule" />
      <div className="mb-6">
        <h2 className="text-xl font-semibold font-heading mb-4">快速操作</h2>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <QuickAction
          href="/upload"
          icon={<Upload className="w-5 h-5" />}
          title="上传作品"
          description="分享摄影作品，附带拍摄参数"
        />
        <QuickAction
          href="/feeds/live"
          icon={<Radio className="w-5 h-5" />}
          title="实时风景"
          description="浏览高清风景摄像头直播"
        />
        <QuickAction
          href="/frame"
          icon={<Tv className="w-5 h-5" />}
          title="电子相框"
          description="选购电子相框 + 内容包"
        />
        {isAdmin && (
          <QuickAction
            href="/admin/review"
            icon={<TrendingUp className="w-5 h-5" />}
            title="内容审核"
            description="审核用户上传的摄影作品"
          />
        )}
        <QuickAction
          href="/discover"
          icon={<ArrowRight className="w-5 h-5" />}
          title="发现灵感"
          description="探索其他摄影师的优秀作品"
        />
      </div>

      {/* Bio */}
      {profile.bio && (
        <div className="mt-10 bg-card border border-border/50 rounded-xl p-6">
          <h3 className="text-xs uppercase tracking-widest text-muted-foreground mb-2 font-mono">个人简介</h3>
          <p className="text-foreground/80 leading-relaxed">{profile.bio}</p>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="bg-card border border-border/50 rounded-xl p-4">
      <div className="flex items-center gap-2 text-muted-foreground mb-2">
        {icon}
        <span className="text-xs">{label}</span>
      </div>
      <div className="text-2xl font-bold font-mono">{value}</div>
    </div>
  );
}

function QuickAction({
  href,
  icon,
  title,
  description,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="group bg-card border border-border/50 rounded-xl p-5 hover:border-glow/40 transition-all card-lift"
    >
      <div className="text-glow mb-3">{icon}</div>
      <h3 className="text-sm font-medium group-hover:text-glow transition-colors">{title}</h3>
      <p className="text-xs text-muted-foreground mt-1">{description}</p>
    </Link>
  );
}

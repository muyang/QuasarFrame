'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Globe, MapPin, Camera, Sparkles, Tv, Map, Bell, Radio, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { UserNav } from '@/components/shared/UserAvatar';

const navItems = [
  { href: '/', label: '首页', labelEn: 'Home', icon: Sparkles },
  { href: '/scout', label: '选景', labelEn: 'Scout', icon: Globe },
  { href: '/discover', label: '发现', labelEn: 'Discover', icon: MapPin },
  { href: '/feeds/live', label: '直播', labelEn: 'Live', icon: Radio },
  { href: '/profile', label: '我的', labelEn: 'Profile', icon: User },
];

export function Navbar() {
  const pathname = usePathname();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center group-hover:bg-primary/30 transition-colors">
            <Camera className="w-4 h-4 text-primary" />
          </div>
          <span className="font-mono text-lg font-bold tracking-tight">
            <span className="text-primary">Quasar</span>
            <span className="text-foreground">Frame</span>
          </span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href ||
              (item.href !== '/' && pathname.startsWith(item.href));
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2',
                  isActive
                    ? 'bg-primary/15 text-primary'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
                )}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </Link>
            );
          })}
        </div>

        {/* User menu */}
        <div className="hidden md:flex items-center gap-3">
          <UserNav />
        </div>
      </nav>
    </header>
  );
}

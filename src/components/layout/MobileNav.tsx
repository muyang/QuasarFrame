'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Globe, MapPin, Radio, User } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/scout', label: '工作台', icon: Globe },
  { href: '/discover', label: '发现', icon: MapPin },
  { href: '/feeds/live', label: '直播', icon: Radio },
  { href: '/profile', label: '我的', icon: User },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background/90 backdrop-blur-xl border-t border-border/50">
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center gap-1 px-3 py-1 rounded-lg transition-all',
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground'
              )}
            >
              <Icon className={cn('w-5 h-5', isActive && 'drop-shadow-[0_0_6px_currentColor]')} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

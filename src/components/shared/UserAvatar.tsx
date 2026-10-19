'use client';

import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import { useState, useRef, useEffect } from 'react';
import { User, LogOut, LayoutDashboard, Upload, CreditCard, Settings } from 'lucide-react';

export function UserNav() {
  const { data: session, status } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (status === 'loading') {
    return <div className="w-8 h-8 rounded-full bg-white/10 animate-pulse" />;
  }

  if (!session?.user) {
    return (
      <Link
        href="/auth/login"
        className="text-sm text-white/70 hover:text-white transition-colors px-3 py-1.5 rounded-lg border border-white/10 hover:border-white/20"
      >
        登录
      </Link>
    );
  }

  const user = session.user;
  const initials = (user.name || user.email || '?').slice(0, 1).toUpperCase();

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setMenuOpen(!menuOpen)}
        className="flex items-center gap-2 hover:opacity-80 transition-opacity"
      >
        {user.avatar ? (
          <img
            src={user.avatar}
            alt={user.name ?? '用户头像'}
            className="w-8 h-8 rounded-full object-cover border border-white/20"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-glow/20 border border-glow/40 flex items-center justify-center text-sm font-medium text-glow">
            {initials}
          </div>
        )}
      </button>

      {menuOpen && (
        <div className="absolute right-0 top-full mt-2 w-56 bg-background/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50">
          <div className="px-4 py-3 border-b border-white/10">
            <div className="text-sm font-medium text-white truncate">{user.name}</div>
            <div className="text-xs text-white/40 truncate">{user.email}</div>
            <div className="flex gap-2 mt-1.5">
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-white/60">
                {user.role === 'admin' ? '管理员' : user.isCreator ? '摄影师' : '驴友'}
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-glow/10 text-glow">
                {user.membership === 'pro' ? '专业版' : user.membership === 'photo' ? '摄影版' : '免费版'}
              </span>
            </div>
          </div>

          <nav className="py-1">
            <MenuItem href="/profile" icon={<LayoutDashboard className="w-4 h-4" />} label="个人中心" onClick={() => setMenuOpen(false)} />
            <MenuItem href="/upload" icon={<Upload className="w-4 h-4" />} label="上传作品" onClick={() => setMenuOpen(false)} />
            <MenuItem href="/membership" icon={<CreditCard className="w-4 h-4" />} label="会员中心" onClick={() => setMenuOpen(false)} />
            <MenuItem href={`/profile/${user.id}`} icon={<User className="w-4 h-4" />} label="公开主页" onClick={() => setMenuOpen(false)} />
          </nav>

          <div className="border-t border-white/10 py-1">
            <button
              onClick={() => signOut({ callbackUrl: '/' })}
              className="flex items-center gap-2.5 w-full px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              退出登录
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function MenuItem({
  href,
  icon,
  label,
  onClick,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="flex items-center gap-2.5 px-4 py-2 text-sm text-white/70 hover:bg-white/5 hover:text-white transition-colors"
    >
      {icon}
      {label}
    </Link>
  );
}

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Camera, Eye, EyeOff } from 'lucide-react';

export function RegisterForm() {
  const router = useRouter();
  const [form, setForm] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    name: '',
    phone: '',
    wechatId: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function updateField(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (form.password !== form.confirmPassword) {
      setError('两次输入的密码不一致');
      return;
    }

    if (form.password.length < 8) {
      setError('密码至少8位');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: form.email,
          password: form.password,
          name: form.name,
          phone: form.phone || undefined,
          wechatId: form.wechatId || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || '注册失败');
        return;
      }

      router.push('/auth/login?registered=true');
    } catch {
      setError('注册失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 mb-4">
          <Camera className="w-8 h-8 text-glow" />
          <span className="text-2xl font-bold">QuasarFrame</span>
        </div>
        <h1 className="text-xl text-white/80">创建账户</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        <div>
          <label className="block text-sm text-white/60 mb-1.5">邮箱 *</label>
          <input
            type="email"
            value={form.email}
            onChange={(e) => updateField('email', e.target.value)}
            placeholder="your@email.com"
            required
            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder:text-white/30 focus:outline-none focus:border-glow/50 focus:ring-1 focus:ring-glow/30 transition-colors"
          />
        </div>

        <div>
          <label className="block text-sm text-white/60 mb-1.5">姓名 *</label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => updateField('name', e.target.value)}
            placeholder="你的名字或昵称"
            required
            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder:text-white/30 focus:outline-none focus:border-glow/50 focus:ring-1 focus:ring-glow/30 transition-colors"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm text-white/60 mb-1.5">密码 *</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={form.password}
                onChange={(e) => updateField('password', e.target.value)}
                placeholder="至少8位"
                required
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder:text-white/30 focus:outline-none focus:border-glow/50 focus:ring-1 focus:ring-glow/30 transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm text-white/60 mb-1.5">确认密码 *</label>
            <input
              type="password"
              value={form.confirmPassword}
              onChange={(e) => updateField('confirmPassword', e.target.value)}
              placeholder="再输一次"
              required
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder:text-white/30 focus:outline-none focus:border-glow/50 focus:ring-1 focus:ring-glow/30 transition-colors"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm text-white/60 mb-2">注册后角色</label>
          <div className="p-3 rounded-lg border border-white/10 bg-white/5 text-left">
            <div className="text-sm font-medium text-white">驴友 / 摄影爱好者</div>
            <div className="text-xs text-white/40 mt-0.5">浏览、收藏、上传、购买均可；首次照片审核通过或线路发布后自动升级为摄影师（享分佣权益）</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm text-white/60 mb-1.5">手机号</label>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => updateField('phone', e.target.value)}
              placeholder="选填"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder:text-white/30 focus:outline-none focus:border-glow/50 focus:ring-1 focus:ring-glow/30 transition-colors"
            />
          </div>
          <div>
            <label className="block text-sm text-white/60 mb-1.5">微信号</label>
            <input
              type="text"
              value={form.wechatId}
              onChange={(e) => updateField('wechatId', e.target.value)}
              placeholder="选填"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder:text-white/30 focus:outline-none focus:border-glow/50 focus:ring-1 focus:ring-glow/30 transition-colors"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-glow hover:bg-glow/90 text-black font-medium rounded-lg px-4 py-2.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-2"
        >
          {loading ? '注册中...' : '注册'}
        </button>
      </form>

      <p className="text-center text-white/40 text-sm mt-6">
        已有账户？{' '}
        <Link href="/auth/login" className="text-glow hover:underline">
          去登录
        </Link>
      </p>
    </div>
  );
}

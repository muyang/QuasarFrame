'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import type { DistributionScope } from '@/lib/license';

type PendingLicense = {
  id: string; resourceId: string; title: string | null; ownerId: string | null;
  version: number; scope: DistributionScope | null; evidenceUrl: string | null; createdAt: string;
};

export default function LicenseReviewPage() {
  const [items, setItems] = useState<PendingLicense[]>([]);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    const response = await fetch('/api/admin/licenses', { cache: 'no-store' });
    if (!response.ok) { setError('无法读取授权申请'); return; }
    const data = await response.json();
    setItems(data.licenses || []);
  }, []);
  useEffect(() => {
    fetch('/api/admin/licenses', { cache: 'no-store' })
      .then((response) => response.ok ? response.json() : Promise.reject(new Error('无法读取授权申请')))
      .then((data) => setItems(data.licenses || []))
      .catch(() => setError('无法读取授权申请'));
  }, []);

  async function decide(id: string, decision: 'approved' | 'rejected') {
    const response = await fetch(`/api/admin/licenses/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ decision }),
    });
    if (!response.ok) { setError((await response.json()).error || '审核失败'); return; }
    setError('');
    await load();
  }

  return <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
    <div><Link href="/admin/review" className="text-sm text-glow">返回作品审核</Link>
      <h1 className="text-2xl font-bold mt-2">分发授权审核</h1>
      <p className="text-sm text-white/60 mt-2">作品内容审核与分发许可分别生效；缺失或撤销许可的作品不会进入公开交付。</p></div>
    {error && <p className="text-red-400">{error}</p>}
    {items.length === 0 && <p className="text-white/50">暂无待审核授权。</p>}
    {items.map((item) => <article key={item.id} className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-3">
      <h2 className="font-medium">{item.title || item.resourceId} · 授权版本 {item.version}</h2>
      <p className="text-xs text-white/50">提交者 {item.ownerId} · {item.createdAt}</p>
      <p className="text-sm">范围：{item.scope ? Object.entries(item.scope).filter(([, value]) => value).map(([key]) => key).join('、') || '无' : '格式无效'}</p>
      {item.evidenceUrl && <a href={item.evidenceUrl} target="_blank" rel="noopener noreferrer" className="text-sm underline text-glow">权属凭证</a>}
      <div className="flex gap-3"><button onClick={() => decide(item.id, 'approved')} disabled={!item.scope}
        className="rounded-lg bg-green-500/15 text-green-300 px-4 py-2 disabled:opacity-40">批准授权</button>
        <button onClick={() => decide(item.id, 'rejected')} className="rounded-lg bg-red-500/15 text-red-300 px-4 py-2">拒绝授权</button></div>
    </article>)}
  </div>;
}

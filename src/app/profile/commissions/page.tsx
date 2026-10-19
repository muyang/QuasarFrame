'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Loader2, Wallet, TrendingUp, Clock, CheckCircle2 } from 'lucide-react';

interface CommissionRow {
  id: string;
  triggerType: string;
  refTable: string | null;
  refId: string | null;
  amount: number;
  percentage: number | null;
  status: string;
  createdAt: string;
  purchaseAmount: number | null;
  purchaseResourceType: string | null;
  purchaseResourceId: string | null;
  purchasePaymentMethod: string | null;
}

const triggerLabels: Record<string, string> = {
  photo_unlock: '照片解锁',
  feed_unlock: '直播解锁',
  frame_royalty: '相框版权',
  ad_affiliate: '广告联营',
};

const triggerColor: Record<string, string> = {
  photo_unlock: 'text-blue-400',
  feed_unlock: 'text-purple-400',
  frame_royalty: 'text-glow',
  ad_affiliate: 'text-emerald-400',
};

export default function MyCommissionsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [rows, setRows] = useState<CommissionRow[]>([]);
  const [summary, setSummary] = useState({ count: 0, pendingAmount: 0, paidAmount: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/auth/login');
  }, [status, router]);

  useEffect(() => {
    if (status !== 'authenticated') return;
    fetch('/api/commissions/me')
      .then((r) => r.json())
      .then((data) => {
        setRows(data.commissions || []);
        setSummary(data.summary || { count: 0, pendingAmount: 0, paidAmount: 0 });
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [status]);

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-glow" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-8">
        <p className="text-xs uppercase tracking-widest text-glow/70 mb-2 font-mono">MY COMMISSIONS</p>
        <h1 className="text-3xl font-bold font-heading">我的分佣</h1>
        <p className="text-muted-foreground mt-2 text-sm">照片解锁 / 直播解锁 / 相框版权 / 广告联营收益</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-card border border-glow/30 bg-glow/5 rounded-xl p-5">
          <div className="flex items-center gap-2 text-glow mb-1">
            <Wallet className="w-4 h-4" />
            <span className="text-xs uppercase tracking-widest font-mono">总收益</span>
          </div>
          <p className="text-2xl font-bold font-mono">
            ¥{(summary.pendingAmount + summary.paidAmount).toFixed(2)}
          </p>
        </div>
        <div className="bg-card border border-border/50 rounded-xl p-5">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <Clock className="w-4 h-4" />
            <span className="text-xs uppercase tracking-widest font-mono">待结算</span>
          </div>
          <p className="text-2xl font-bold font-mono">¥{summary.pendingAmount.toFixed(2)}</p>
        </div>
        <div className="bg-card border border-border/50 rounded-xl p-5">
          <div className="flex items-center gap-2 text-emerald-400 mb-1">
            <CheckCircle2 className="w-4 h-4" />
            <span className="text-xs uppercase tracking-widest font-mono">已结算</span>
          </div>
          <p className="text-2xl font-bold font-mono">¥{summary.paidAmount.toFixed(2)}</p>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="text-center py-20 bg-card border border-border/50 rounded-xl">
          <TrendingUp className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
          <p className="text-muted-foreground mb-2">还没有分佣收入</p>
          <p className="text-xs text-muted-foreground">
            上传照片、创建线路或接入相框后，他人解锁或购买时将自动累计到这里
          </p>
          <Link href="/upload" className="inline-flex items-center gap-1 text-glow hover:underline mt-4">
            前向上传作品 →
          </Link>
        </div>
      ) : (
        <div className="bg-card border border-border/50 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/30 text-[10px] uppercase tracking-widest font-mono text-muted-foreground">
              <tr>
                <th className="text-left p-3">时间</th>
                <th className="text-left p-3">类型</th>
                <th className="text-right p-3">订单金额</th>
                <th className="text-right p-3">分成</th>
                <th className="text-right p-3">收益</th>
                <th className="text-center p-3">状态</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-border/30">
                  <td className="p-3 text-muted-foreground text-xs font-mono">
                    {new Date(r.createdAt).toLocaleDateString('zh-CN')}
                  </td>
                  <td className={`p-3 font-medium ${triggerColor[r.triggerType] || ''}`}>
                    {triggerLabels[r.triggerType] || r.triggerType}
                  </td>
                  <td className="p-3 text-right text-muted-foreground font-mono">
                    {r.purchaseAmount != null ? `¥${r.purchaseAmount.toFixed(2)}` : '—'}
                  </td>
                  <td className="p-3 text-right text-muted-foreground font-mono">
                    {r.percentage != null ? `${(r.percentage * 100).toFixed(0)}%` : '—'}
                  </td>
                  <td className="p-3 text-right font-mono font-medium text-glow">
                    +¥{(r.amount ?? 0).toFixed(2)}
                  </td>
                  <td className="p-3 text-center">
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-mono ${
                        r.status === 'paid'
                          ? 'bg-emerald-400/10 text-emerald-400 border border-emerald-400/30'
                          : 'bg-glow/10 text-glow border border-glow/30'
                      }`}
                    >
                      {r.status === 'paid' ? '已结算' : '待结算'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

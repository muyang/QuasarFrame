'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Check, Crown, Zap, Star } from 'lucide-react';

interface Plan {
  id: string;
  name: string;
  nameEn: string;
  priceMonthly: number;
  priceYearly: number;
  maxDownloadsPerMonth: number;
  featuresJson: string | null;
}

export default function MembershipPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/subscriptions/plans')
      .then((r) => r.json())
      .then((data) => {
        setPlans(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  async function handleSubscribe(planId: string) {
    if (!session?.user) {
      router.push('/auth/login');
      return;
    }

    const res = await fetch('/api/subscriptions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ planId, autoRenew: false }),
    });

    const data = await res.json();
    if (!res.ok) {
      alert(data.error || '订阅失败');
    } else {
      alert('订阅成功！');
      router.refresh();
    }
  }

  const icons = { free: <Star className="w-6 h-6" />, photo: <Zap className="w-6 h-6" />, pro: <Crown className="w-6 h-6" /> };

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-glow/30 border-t-glow rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      <div className="text-center mb-12">
        <h1 className="text-3xl font-bold text-white mb-3">选择你的会员计划</h1>
        <p className="text-white/50 max-w-xl mx-auto">解锁高清摄影作品、完整拍摄参数、实时摄像头资源</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map((plan) => {
          const features: string[] = plan.featuresJson ? JSON.parse(plan.featuresJson) : [];
          const icon = icons[plan.id as keyof typeof icons] || <Star className="w-6 h-6" />;
          const isPopular = plan.id === 'photo';

          return (
            <div
              key={plan.id}
              className={`relative rounded-2xl border p-6 transition-all ${
                isPopular
                  ? 'border-glow/40 bg-glow/5 shadow-lg shadow-glow/10'
                  : 'border-white/10 bg-white/5 hover:border-white/20'
              }`}
            >
              {isPopular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-glow text-black text-xs font-medium rounded-full">
                  最受欢迎
                </div>
              )}

              <div className="text-center mb-6">
                <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl mb-3 ${isPopular ? 'bg-glow/20 text-glow' : 'bg-white/10 text-white/60'}`}>
                  {icon}
                </div>
                <h3 className="text-lg font-bold text-white">{plan.name}</h3>
                <p className="text-xs text-white/40">{plan.nameEn}</p>
              </div>

              <div className="text-center mb-6">
                <span className="text-3xl font-bold text-white">¥{plan.priceMonthly}</span>
                <span className="text-white/40">/月</span>
                {plan.priceYearly > 0 && (
                  <div className="text-xs text-white/40 mt-1">
                    ¥{plan.priceYearly}/年 (省 ¥{plan.priceMonthly * 12 - plan.priceYearly})
                  </div>
                )}
              </div>

              <ul className="space-y-2.5 mb-6">
                {features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-white/70">
                    <Check className={`w-4 h-4 mt-0.5 shrink-0 ${isPopular ? 'text-glow' : 'text-green-400'}`} />
                    {feature}
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handleSubscribe(plan.id)}
                className={`w-full py-2.5 rounded-lg font-medium transition-colors ${
                  plan.priceMonthly === 0
                    ? 'border border-white/20 text-white/60 cursor-default'
                    : isPopular
                    ? 'bg-glow text-black hover:bg-glow/90'
                    : 'bg-white/10 text-white hover:bg-white/20'
                }`}
                disabled={plan.priceMonthly === 0}
              >
                {plan.priceMonthly === 0 ? '当前计划' : '立即订阅'}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

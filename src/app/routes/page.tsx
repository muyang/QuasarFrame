import Link from 'next/link';
import { Plus, Compass } from 'lucide-react';
import { RouteList } from '@/components/routes/RouteList';

export const metadata = {
  title: '度假线路 · QuasarFrame',
  description: '摄影师发布的度假线路 — 多机位、多景别、按日程串联。',
};

export default function RoutesPage() {
  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-start justify-between mb-8">
          <div>
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest font-mono text-glow/80 mb-2">
              <Compass className="w-3 h-3" /> ROUTES
            </div>
            <h1 className="text-3xl font-bold font-heading">度假线路</h1>
            <p className="text-muted-foreground mt-2">
              摄影师串联的机位复现路线 — 按日程、按时段、按景别编排的拍摄旅程。
            </p>
          </div>
          <Link
            href="/routes/new"
            className="flex items-center gap-1 text-sm text-glow hover:text-glow/80 border border-glow/30 hover:border-glow/60 rounded-lg px-3 py-2 transition-colors"
          >
            <Plus className="w-4 h-4" /> 创建线路
          </Link>
        </div>

        <RouteList />
      </div>
    </div>
  );
}

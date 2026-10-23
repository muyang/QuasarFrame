'use client';

import { useEffect, useState } from 'react';

type Node = { id: string; kind: string; label: string; description: string; claimType: string;
  sourceUrl: string; sourceLicense: string; version: number };
type Edge = { id: string; fromId: string; toId: string; relation: string; sourceUrl: string; claimType: string };

export default function KnowledgePage() {
  const [query, setQuery] = useState('');
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [error, setError] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(`/api/knowledge?q=${encodeURIComponent(query)}`, { signal: controller.signal });
        if (!response.ok) throw new Error('知识目录暂不可用');
        const result = await response.json();
        setNodes(result.nodes || []); setEdges(result.edges || []); setError('');
      } catch (caught) { if (!controller.signal.aborted) setError(caught instanceof Error ? caught.message : '查询失败'); }
    }, 250);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [query]);

  const labels = new Map(nodes.map((node) => [node.id, node.label]));
  return <main className="max-w-5xl mx-auto px-4 py-8 space-y-7">
    <div><h1 className="text-3xl font-semibold">摄影知识</h1>
      <p className="text-muted-foreground mt-2">查看风格、色彩、构图与光线之间的关系。每项建议保留来源和类型；未核验的地理与人文事实不会作为确定结论发布。</p></div>
    <label className="block"><span className="text-sm">搜索概念</span>
      <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="例如：冷暖对比、长焦、侧逆光"
        className="mt-2 w-full rounded-lg border border-border bg-background px-4 py-3" /></label>
    {error && <p className="text-red-400">{error}</p>}
    {nodes.length === 0 && !error && <p className="text-muted-foreground">暂无匹配的已发布知识。</p>}
    <div className="grid md:grid-cols-2 gap-4">{nodes.map((node) => <article key={node.id} className="rounded-xl border border-border p-4 space-y-2">
      <div className="flex justify-between gap-2"><h2 className="font-medium">{node.label}</h2><span className="text-xs text-muted-foreground">{node.kind} · {node.claimType}</span></div>
      <p className="text-sm text-muted-foreground">{node.description}</p>
      <p className="text-xs text-muted-foreground">版本 {node.version} · {node.sourceLicense}</p>
      <a className="text-sm text-primary underline" href={node.sourceUrl} target="_blank" rel="noopener noreferrer">查看依据</a>
    </article>)}</div>
    {edges.length > 0 && <section><h2 className="text-lg font-medium mb-3">相关关系</h2>
      <div className="space-y-2">{edges.map((edge) => <p key={edge.id} className="rounded-lg bg-accent/30 px-3 py-2 text-sm">
        {labels.get(edge.fromId)} → {edge.relation} → {labels.get(edge.toId)}
        <a className="ml-3 text-primary underline" href={edge.sourceUrl} target="_blank" rel="noopener noreferrer">依据</a>
      </p>)}</div></section>}
  </main>;
}

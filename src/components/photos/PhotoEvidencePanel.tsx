'use client';

import { useCallback, useEffect, useState } from 'react';
import { noDistribution, type DistributionScope } from '@/lib/license';

type Candidate = { id: string; longitude: number; latitude: number; radiusM: number | null;
  method: 'exif' | 'manual' | 'skyline'; status: 'proposed' | 'user_confirmed' | 'rejected' };
type Evidence = { id: string; field: string; source: string; valueJson: string; confidence: string };
type License = { id: string; version: number; status: string; scope: DistributionScope | null } | null;

export function PhotoEvidencePanel({ photoId }: { photoId: string }) {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [evidence, setEvidence] = useState<Evidence[]>([]);
  const [license, setLicense] = useState<License>(null);
  const [draftScope, setDraftScope] = useState<DistributionScope>(noDistribution);
  const [attest, setAttest] = useState(false);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    const [evidenceResponse, licenseResponse] = await Promise.all([
      fetch(`/api/photos/${photoId}/evidence`, { cache: 'no-store' }),
      fetch(`/api/photos/${photoId}/license`, { cache: 'no-store' }),
    ]);
    if (!evidenceResponse.ok || !licenseResponse.ok) { setError('证据或授权记录暂不可用'); return; }
    const evidenceData = await evidenceResponse.json();
    const licenseData = await licenseResponse.json();
    setCandidates(evidenceData.candidates || []);
    setEvidence(evidenceData.evidence || []);
    setLicense(licenseData.license || null);
    setDraftScope(licenseData.license?.scope || noDistribution);
  }, [photoId]);
  useEffect(() => {
    Promise.all([
      fetch(`/api/photos/${photoId}/evidence`, { cache: 'no-store' }).then((response) => response.json()),
      fetch(`/api/photos/${photoId}/license`, { cache: 'no-store' }).then((response) => response.json()),
    ]).then(([evidenceData, licenseData]) => {
      setCandidates(evidenceData.candidates || []);
      setEvidence(evidenceData.evidence || []);
      setLicense(licenseData.license || null);
      setDraftScope(licenseData.license?.scope || noDistribution);
    }).catch(() => setError('证据或授权记录暂不可用'));
  }, [photoId]);

  async function decide(candidateId: string, decision: 'user_confirmed' | 'rejected') {
    const response = await fetch(`/api/photos/${photoId}/evidence`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ candidateId, decision }),
    });
    if (!response.ok) { setError((await response.json()).error || '处理失败'); return; }
    await load();
  }
  async function revoke() {
    const response = await fetch(`/api/photos/${photoId}/license`, { method: 'DELETE' });
    if (!response.ok) { setError((await response.json()).error || '撤销失败'); return; }
    await load();
  }
  async function submitLicense() {
    if (!attest || !draftScope.web) { setError('请确认作品权利并允许网页展示'); return; }
    const response = await fetch(`/api/photos/${photoId}/license`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ attestOwnership: true, scope: draftScope }),
    });
    if (!response.ok) { setError((await response.json()).error || '提交失败'); return; }
    setError(''); setAttest(false); await load();
  }

  return <section className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-3 text-sm">
    <h3 className="font-medium">照片证据与授权</h3>
    <p className="text-xs text-white/50">仅作者可见。EXIF 与人工填写分别保留；确认候选表示您的判断，仍不等于现场核验。</p>
    {error && <p className="text-red-400">{error}</p>}
    <p className="text-xs text-white/70">证据 {evidence.length} 项；视觉定位尚未运行。</p>
    {candidates.map((candidate) => <div key={candidate.id} className="border-t border-white/10 pt-2 space-y-1">
      <p>{candidate.method.toUpperCase()} 候选：{candidate.longitude.toFixed(5)}, {candidate.latitude.toFixed(5)}
        {candidate.radiusM === null ? ' · 误差未知' : ` · 标称误差 ${candidate.radiusM} m`} · {candidate.status}</p>
      {candidate.status === 'proposed' && <div className="flex gap-3 text-xs">
        <button className="text-glow underline" onClick={() => decide(candidate.id, 'user_confirmed')}>确认是我的判断</button>
        <button className="text-red-300 underline" onClick={() => decide(candidate.id, 'rejected')}>排除</button>
      </div>}
    </div>)}
    <div className="border-t border-white/10 pt-2">
      <p>分发授权：{license ? `${license.status} · 版本 ${license.version}` : '未提交'}</p>
      {license?.scope && <p className="text-xs text-white/50">已申请范围：{Object.entries(license.scope).filter(([, enabled]) => enabled).map(([key]) => key).join('、') || '无'}</p>}
      {license && license.status !== 'revoked' && <button className="text-xs text-red-300 underline mt-1" onClick={revoke}>撤销授权</button>}
    </div>
    <div className="border-t border-white/10 pt-3 space-y-2">
      <p>申请新授权版本</p>
      <div className="grid grid-cols-2 gap-1 text-xs">{([
        ['web', '网页'], ['mobile', '手机'], ['tv', '电视'], ['frame', '相框'],
        ['paid', '收费'], ['download', '下载'], ['derivative', '再加工'],
      ] as const).map(([key, label]) => <label key={key} className="flex gap-1 items-center">
        <input type="checkbox" checked={draftScope[key]} onChange={(event) => setDraftScope((current) => ({ ...current, [key]: event.target.checked }))} />{label}
      </label>)}</div>
      <label className="flex gap-2 text-xs"><input type="checkbox" checked={attest} onChange={(event) => setAttest(event.target.checked)} />我确认拥有对应权利并申请平台审核</label>
      <button className="text-glow underline text-xs" onClick={submitLicense}>提交授权申请</button>
    </div>
  </section>;
}

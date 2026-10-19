'use client';

import dynamic from 'next/dynamic';

const CesiumGlobe = dynamic(
  () => import('@/components/globe/CesiumGlobe').then((m) => m.CesiumGlobe),
  { ssr: false }
);

export default function ScoutPage() {
  return (
    <div className="h-[calc(100vh-4rem)] relative">
      <CesiumGlobe />
    </div>
  );
}

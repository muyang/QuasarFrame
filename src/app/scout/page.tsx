import { ShootingWorkbench } from '@/components/workspace/ShootingWorkbench';

export default async function ScoutPage({ searchParams }: { searchParams: Promise<{ location?: string }> }) {
  const { location } = await searchParams;
  return <ShootingWorkbench key={location ?? 'niubei'} initialLocation={location ?? 'niubei'} />;
}

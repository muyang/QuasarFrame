const activeByViewer = new Map<string, number>();
let activeTotal = 0;

// A process-local guard; deployment-level concurrency must also be enforced
// by the reverse proxy when the service is scaled to multiple workers.
export function acquireStreamSlot(viewer: string): (() => void) | null {
  if (activeTotal >= 32 || (activeByViewer.get(viewer) ?? 0) >= 2) return null;
  activeTotal += 1;
  activeByViewer.set(viewer, (activeByViewer.get(viewer) ?? 0) + 1);
  let released = false;
  return () => {
    if (released) return;
    released = true;
    activeTotal -= 1;
    const remaining = (activeByViewer.get(viewer) ?? 1) - 1;
    if (remaining === 0) activeByViewer.delete(viewer);
    else activeByViewer.set(viewer, remaining);
  };
}

/** SPZ Gaussian-splat assets are not used by QuasarFrame's marker globe. */
export async function loadSpz(): Promise<never> {
  throw new Error('SPZ assets are unavailable in this viewer');
}

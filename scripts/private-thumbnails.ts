import { mkdir, readdir, rename, stat } from 'node:fs/promises';
import path from 'node:path';

const publicDir = process.env.IMAGE_MIGRATION_PUBLIC_DIR ?? path.join(process.cwd(), 'public', 'uploads');
const privateDir = process.env.IMAGE_MIGRATION_THUMBNAIL_DIR ?? path.join(process.cwd(), 'data', 'thumbnails');
const pattern = /^[a-f0-9-]{36}_thumb\.(?:jpe?g|png|webp)$/i;

async function main() {
  await mkdir(privateDir, { recursive: true });
  let moved = 0;
  for (const name of await readdir(publicDir)) {
    if (!pattern.test(name)) continue;
    const destination = path.join(privateDir, name);
    try { await stat(destination); throw new Error(`目标已有同名缩略图：${name}`); }
    catch (error) { if (!(error instanceof Error) || !('code' in error) || error.code !== 'ENOENT') throw error; }
    await rename(path.join(publicDir, name), destination);
    moved += 1;
  }
  console.log(`已将 ${moved} 张旧缩略图移至受控目录。`);
}

main().catch((error) => { console.error(error); process.exitCode = 1; });

import { mkdir, readdir, rename, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

async function main() {
const publicDir = process.env.IMAGE_MIGRATION_PUBLIC_DIR ?? path.join(process.cwd(), 'public', 'uploads');
const privateDir = process.env.IMAGE_MIGRATION_PRIVATE_DIR ?? path.join(process.cwd(), 'data', 'originals');
const originalPattern = /^[a-f0-9-]{36}\.(?:jpe?g|png|webp)$/i;

await mkdir(privateDir, { recursive: true });
let moved = 0;
for (const fileName of await readdir(publicDir)) {
  if (!originalPattern.test(fileName)) continue;
  const source = path.join(publicDir, fileName);
  const destination = path.join(privateDir, fileName);
  if (!(await stat(source)).isFile()) continue;
  try {
    await stat(destination);
    throw new Error(`私有目录已存在同名文件，已停止迁移：${fileName}`);
  } catch (error) {
    if (!(error instanceof Error) || !('code' in error) || error.code !== 'ENOENT') throw error;
  }

  const extension = path.extname(fileName).toLowerCase();
  const thumbnail = await sharp(source)
    .rotate()
    .resize(400, null, { withoutEnlargement: true })
    .toFormat(extension === '.png' ? 'png' : extension === '.webp' ? 'webp' : 'jpeg', { quality: 80 })
    .toBuffer();
  await rename(source, destination);
  await writeFile(path.join(publicDir, `${path.basename(fileName, extension)}_thumb${extension}`), thumbnail);
  moved += 1;
}
console.log(`已将 ${moved} 张原图移入私有目录，并去除公开缩略图的元数据。`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

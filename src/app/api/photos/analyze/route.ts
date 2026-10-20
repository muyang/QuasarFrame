import { requireAuth } from '@/auth/middleware';
import { ALLOWED_IMAGE_TYPES, MAX_FILE_SIZE } from '@/lib/validators';
import { shootingGuidance } from '@/lib/photo-evidence';
import { analyzePhotoBuffer } from '@/server/photo-evidence';

export async function POST(req: Request) {
  const { error } = await requireAuth();
  if (error) return error;
  try {
    const form = await req.formData();
    const file = form.get('file');
    if (!(file instanceof File) || !ALLOWED_IMAGE_TYPES.includes(file.type) || file.size === 0 || file.size > MAX_FILE_SIZE) {
      return Response.json({ error: '请上传 20MB 以内的 JPG、PNG 或 WebP 照片' }, { status: 400 });
    }
    const result = await analyzePhotoBuffer(Buffer.from(await file.arrayBuffer()));
    return Response.json({ ...result, guidance: shootingGuidance(result.evidence),
      analysisType: 'exif_only', visualGeolocation: 'not_run' },
    { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('Photo metadata analysis failed:', error);
    return Response.json({ error: '照片无法解析或元数据损坏' }, { status: 422 });
  }
}

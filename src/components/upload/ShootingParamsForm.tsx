'use client';

import { ShootingPositionIndicator } from '@/components/photos/ShootingPositionIndicator';

interface ShootingParams {
  title: string;
  description: string;
  locationId: string;
  coordinatesLng: string;
  coordinatesLat: string;
  shotAt: string;
  weather: string;
  cameraMake: string;
  cameraModel: string;
  lens: string;
  aperture: string;
  shutterSpeed: string;
  iso: string;
  focalLength: string;
  sensorFormat: 'unknown' | 'fullFrame' | 'apsc' | 'm43';
  azimuth: string;
  elevation: string;
  shareCoordinates: boolean;
  priceType: 'free' | 'paid';
  price: string;
}

interface Props {
  params: ShootingParams;
  onChange: (params: ShootingParams) => void;
}

export function ShootingParamsForm({ params, onChange }: Props) {
  function update(field: keyof ShootingParams, value: string | boolean) {
    onChange({ ...params, [field]: value });
  }

  return (
    <div className="space-y-6">
      {/* Basic Info */}
      <Section title="基本信息">
        <Field label="标题 *">
          <input
            value={params.title}
            onChange={(e) => update('title', e.target.value)}
            placeholder="给作品起个名字"
            className={inputClass}
          />
        </Field>
        <Field label="描述">
          <textarea
            value={params.description}
            onChange={(e) => update('description', e.target.value)}
            placeholder="拍摄心得、场景描述..."
            rows={3}
            className={inputClass}
          />
        </Field>
      </Section>

      {/* Location */}
      <Section title="位置信息">
        <div className="grid grid-cols-2 gap-3">
          <Field label="经度">
            <input
              type="number"
              step="any"
              value={params.coordinatesLng}
              onChange={(e) => update('coordinatesLng', e.target.value)}
              placeholder="如 103.4155"
              className={inputClass}
            />
          </Field>
          <Field label="纬度">
            <input
              type="number"
              step="any"
              value={params.coordinatesLat}
              onChange={(e) => update('coordinatesLat', e.target.value)}
              placeholder="如 29.5910"
              className={inputClass}
            />
          </Field>
        </div>
        <Field label="关联景点 ID">
          <input
            value={params.locationId}
            onChange={(e) => update('locationId', e.target.value)}
            placeholder="如 niubei, chaka (选填)"
            className={inputClass}
          />
        </Field>
        <label className="flex items-center gap-2 text-xs text-white/60"><input type="checkbox" checked={params.shareCoordinates}
          onChange={(event) => update('shareCoordinates', event.target.checked)} />允许在作品详情向其他用户展示精确坐标与朝向</label>
        <p className="text-xs text-white/40">默认仅自己可见；付费解锁也不会自动公开精确机位。GPS/EXIF 信息需由你确认。</p>
      </Section>

      {/* Shooting Time & Weather */}
      <Section title="拍摄时刻">
        <div className="grid grid-cols-2 gap-3">
          <Field label="拍摄时间">
            <input
              type="datetime-local"
              value={params.shotAt}
              onChange={(e) => update('shotAt', e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="天气">
            <input
              value={params.weather}
              onChange={(e) => update('weather', e.target.value)}
              placeholder="如 晴朗、多云、雨后"
              className={inputClass}
            />
          </Field>
        </div>
      </Section>

      {/* Camera Settings */}
      <Section title="相机参数 (EXIF)">
        <div className="grid grid-cols-2 gap-3">
          <Field label="相机品牌">
            <input
              value={params.cameraMake}
              onChange={(e) => update('cameraMake', e.target.value)}
              placeholder="如 Sony, Canon, Nikon"
              className={inputClass}
            />
          </Field>
          <Field label="相机型号">
            <input
              value={params.cameraModel}
              onChange={(e) => update('cameraModel', e.target.value)}
              placeholder="如 A7R IV, R5"
              className={inputClass}
            />
          </Field>
          <Field label="镜头">
            <input
              value={params.lens}
              onChange={(e) => update('lens', e.target.value)}
              placeholder="如 FE 24-70mm F2.8 GM"
              className={inputClass}
            />
          </Field>
          <Field label="焦距 (mm)">
            <input
              type="number"
              min="8"
              max="1200"
              value={params.focalLength}
              onChange={(e) => update('focalLength', e.target.value)}
              placeholder="如 35"
              className={inputClass}
            />
            <p className="text-[10px] text-white/30 mt-1">实际焦距；请同时确认传感器尺寸</p>
          </Field>
          <Field label="传感器尺寸">
            <select value={params.sensorFormat} onChange={(event) => update('sensorFormat', event.target.value)} className={inputClass}>
              <option value="unknown">未知</option><option value="fullFrame">全画幅</option><option value="apsc">APS-C</option><option value="m43">M4/3</option>
            </select>
          </Field>
        </div>
      </Section>

      {/* Exposure */}
      <Section title="曝光参数">
        <div className="grid grid-cols-3 gap-3">
          <Field label="光圈">
            <input
              value={params.aperture}
              onChange={(e) => update('aperture', e.target.value)}
              placeholder="如 f/2.8"
              className={inputClass}
            />
          </Field>
          <Field label="快门速度">
            <input
              value={params.shutterSpeed}
              onChange={(e) => update('shutterSpeed', e.target.value)}
              placeholder="如 1/250"
              className={inputClass}
            />
          </Field>
          <Field label="ISO">
            <input
              type="number"
              value={params.iso}
              onChange={(e) => update('iso', e.target.value)}
              placeholder="如 100"
              className={inputClass}
            />
          </Field>
        </div>
      </Section>

      {/* Shooting Direction */}
      <Section title="拍摄方向 (机位)">
        <ShootingPositionIndicator
          azimuth={params.azimuth ? parseFloat(params.azimuth) : null}
          elevation={params.elevation ? parseFloat(params.elevation) : null}
          focalLength={params.focalLength ? parseInt(params.focalLength) : null}
        />
        <div className="grid grid-cols-2 gap-3">
          <Field label="方位角 (°)">
            <input
              type="number"
              min="0"
              max="360"
              step="1"
              value={params.azimuth}
              onChange={(e) => update('azimuth', e.target.value)}
              placeholder="0=北, 90=东, 180=南, 270=西"
              className={inputClass}
            />
            <p className="text-[10px] text-white/30 mt-1">0-360，从北顺时针</p>
          </Field>
          <Field label="仰角 (°)">
            <input
              type="number"
              min="-10"
              max="80"
              step="1"
              value={params.elevation}
              onChange={(e) => update('elevation', e.target.value)}
              placeholder="-10 到 80"
              className={inputClass}
            />
            <p className="text-[10px] text-white/30 mt-1">水平 0°，向上为正</p>
          </Field>
        </div>
      </Section>

      {/* Pricing */}
      <Section title="定价">
        <div className="flex gap-4 mb-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="priceType"
              value="free"
              checked={params.priceType === 'free'}
              onChange={() => update('priceType', 'free')}
              className="accent-glow"
            />
            <span className="text-sm text-white/70">免费</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="priceType"
              value="paid"
              checked={params.priceType === 'paid'}
              onChange={() => update('priceType', 'paid')}
              className="accent-glow"
            />
            <span className="text-sm text-white/70">付费</span>
          </label>
        </div>
        {params.priceType === 'paid' && (
          <Field label="价格 (¥)">
            <input
              type="number"
              min="1"
              max="10000"
              value={params.price}
              onChange={(e) => update('price', e.target.value)}
              placeholder="1-10000"
              className={inputClass}
            />
          </Field>
        )}
      </Section>
    </div>
  );
}

const inputClass =
  'w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-glow/50 focus:ring-1 focus:ring-glow/30 transition-colors';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-sm font-medium text-white/80 mb-3 pb-1 border-b border-white/10">{title}</h3>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs text-white/50 mb-1">{label}</label>
      {children}
    </div>
  );
}

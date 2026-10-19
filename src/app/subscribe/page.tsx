'use client';

import { useState } from 'react';
import { Bell, MapPin, Mountain, Clock, Check } from 'lucide-react';
import { sceneryTypes, sceneryList } from '@/data/scenery-types';
import { locations } from '@/data/locations';
import { PRESET_CITIES } from '@/lib/constants';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { toast } from 'sonner';
import type { SceneryType, Season } from '@/types/location';
import { cn } from '@/lib/utils';

const seasons: { value: Season; label: string }[] = [
  { value: 'spring', label: '春' },
  { value: 'summer', label: '夏' },
  { value: 'autumn', label: '秋' },
  { value: 'winter', label: '冬' },
];

const frequencyOptions = [
  { value: 'instant', label: '即时通知', desc: '条件满足时立刻推送' },
  { value: 'daily', label: '每日摘要', desc: '每天汇总一次' },
  { value: 'weekly', label: '每周摘要', desc: '每周汇总一次' },
];

export default function SubscribePage() {
  const [selectedScenery, setSelectedScenery] = useState<SceneryType[]>([]);
  const [selectedSeasons, setSelectedSeasons] = useState<Season[]>(['spring', 'autumn']);
  const [radius, setRadius] = useState(200);
  const [maxDifficulty, setMaxDifficulty] = useState(3);
  const [frequency, setFrequency] = useState('daily');
  const [selectedCity, setSelectedCity] = useState('chengdu');
  const [saved, setSaved] = useState(false);

  const toggleScenery = (tag: SceneryType) => {
    setSelectedScenery((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const toggleSeason = (season: Season) => {
    setSelectedSeasons((prev) =>
      prev.includes(season) ? prev.filter((s) => s !== season) : [...prev, season]
    );
  };

  const handleSave = () => {
    setSaved(true);
    toast.success('订阅已保存！', {
      description: '当最佳拍摄条件出现时，我们会通知你。',
    });
  };

  // Simulated notification preview
  const previewNotification = () => {
    const matchingLocs = locations.filter((loc) =>
      selectedScenery.length === 0 || selectedScenery.some((tag) => loc.sceneryTags.includes(tag))
    );
    return matchingLocs[0] || locations[0];
  };

  const previewLoc = previewNotification();
  const previewScenery = selectedScenery[0] || previewLoc.sceneryTags[0];
  const previewInfo = sceneryTypes[previewScenery];

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
            <Bell className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold">定制景色订阅</h1>
          <p className="text-muted-foreground mt-2">
            当你最爱的景色出现时，第一时间收到通知
          </p>
        </div>

        {/* Scenery Type Selection */}
        <section className="mb-10">
          <h2 className="text-lg font-semibold mb-4">感兴趣的景色类型</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {sceneryList.map((info) => (
              <button
                key={info.type}
                onClick={() => toggleScenery(info.type)}
                className={cn(
                  'rounded-xl p-4 border-2 text-center transition-all',
                  selectedScenery.includes(info.type)
                    ? 'border-primary bg-primary/10'
                    : 'border-border/30 hover:border-border/60'
                )}
              >
                <span className="text-2xl block mb-1">{info.icon}</span>
                <span className="text-sm font-medium">{info.label}</span>
                <span className="text-[10px] text-muted-foreground block">{info.labelEn}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Location Preferences */}
        <section className="mb-10 space-y-6">
          <h2 className="text-lg font-semibold">位置偏好</h2>

          {/* City selector */}
          <div>
            <label className="text-sm text-muted-foreground block mb-2">基准城市</label>
            <select
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              className="w-full bg-card border border-border/30 rounded-lg px-4 py-2.5 text-sm"
            >
              {Object.entries(PRESET_CITIES).map(([key, city]) => (
                <option key={key} value={key}>
                  {city.name} ({city.nameEn})
                </option>
              ))}
            </select>
          </div>

          {/* Radius */}
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-muted-foreground">搜索半径</span>
              <span className="font-mono">{radius}km</span>
            </div>
            <input
              type="range"
              min={50}
              max={500}
              step={50}
              value={radius}
              onChange={(e) => setRadius(parseInt(e.target.value))}
              className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-primary bg-muted"
            />
          </div>

          {/* Max difficulty */}
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-muted-foreground">最大难度</span>
              <span>{maxDifficulty} / 5</span>
            </div>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((d) => (
                <button
                  key={d}
                  onClick={() => setMaxDifficulty(d)}
                  className={cn(
                    'flex-1 py-2 rounded-lg text-sm transition-all',
                    d <= maxDifficulty
                      ? 'bg-primary/20 text-primary border border-primary/30'
                      : 'bg-muted/30 text-muted-foreground border border-border/20'
                  )}
                >
                  {'★'.repeat(d)}
                </button>
              ))}
            </div>
          </div>

          {/* Preferred seasons */}
          <div>
            <label className="text-sm text-muted-foreground block mb-2">偏好季节</label>
            <div className="flex gap-2">
              {seasons.map((s) => (
                <button
                  key={s.value}
                  onClick={() => toggleSeason(s.value)}
                  className={cn(
                    'flex-1 py-2 rounded-lg text-sm font-medium transition-all',
                    selectedSeasons.includes(s.value)
                      ? 'bg-primary/20 text-primary border border-primary/30'
                      : 'bg-muted/30 text-muted-foreground border border-border/20'
                  )}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Notification frequency */}
        <section className="mb-10">
          <h2 className="text-lg font-semibold mb-4">通知频率</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {frequencyOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setFrequency(opt.value)}
                className={cn(
                  'rounded-xl p-4 border-2 text-left transition-all',
                  frequency === opt.value
                    ? 'border-primary bg-primary/5'
                    : 'border-border/30 hover:border-border/60'
                )}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Clock className="w-4 h-4" />
                  <span className="font-medium text-sm">{opt.label}</span>
                </div>
                <p className="text-xs text-muted-foreground">{opt.desc}</p>
              </button>
            ))}
          </div>
        </section>

        {/* Notification Preview */}
        <section className="mb-10">
          <h2 className="text-lg font-semibold mb-4">通知预览</h2>
          <div className="rounded-xl bg-card border border-border/30 p-5">
            <div className="flex gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <span className="text-lg">{previewInfo?.icon}</span>
              </div>
              <div className="flex-1">
                <p className="font-semibold text-sm">
                  {previewInfo?.icon} {previewInfo?.label}预警
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {previewLoc.name}（{previewLoc.province}）未来24小时内{previewInfo?.label}条件极佳，
                  建议携带长焦镜头和三脚架前往拍摄。
                </p>
                <p className="text-xs text-muted-foreground mt-2 flex items-center gap-2">
                  <MapPin className="w-3 h-3" />
                  {PRESET_CITIES[selectedCity]?.name}出发约{Math.round(previewLoc.coordinates[0] - PRESET_CITIES[selectedCity]?.coordinates[0])}km
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Save Button */}
        <div className="text-center">
          <button
            onClick={handleSave}
            disabled={saved}
            className={cn(
              buttonVariants({ size: 'lg' }),
              'glow-indigo px-10',
              saved && 'bg-green-600 hover:bg-green-700'
            )}
          >
            {saved ? (
              <>
                <Check className="w-5 h-5 mr-2" />
                已保存
              </>
            ) : (
              <>
                <Bell className="w-5 h-5 mr-2" />
                保存订阅
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

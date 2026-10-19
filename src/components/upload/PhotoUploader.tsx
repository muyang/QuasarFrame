'use client';

import { useState, useCallback, useRef } from 'react';
import { Upload, X, Image as ImageIcon } from 'lucide-react';
import { validateImageFile } from '@/lib/validators';

interface PhotoUploaderProps {
  onFileSelect: (file: File) => void;
  preview?: string | null;
  onClear?: () => void;
}

export function PhotoUploader({ onFileSelect, preview, onClear }: PhotoUploaderProps) {
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    (file: File) => {
      setError('');
      const validation = validateImageFile(file);
      if (!validation.valid) {
        setError(validation.error || '文件格式不支持');
        return;
      }
      onFileSelect(file);
    },
    [onFileSelect]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(true);
  };

  const handleDragLeave = () => setDragging(false);

  return (
    <div className="space-y-2">
      <label className="block text-sm text-white/60 mb-1">上传图片 *</label>

      {preview ? (
        <div className="relative rounded-xl overflow-hidden border border-white/10 bg-white/5 aspect-video">
          <img src={preview} alt="预览" className="w-full h-full object-cover" />
          {onClear && (
            <button
              onClick={onClear}
              className="absolute top-2 right-2 bg-black/60 hover:bg-black/80 rounded-full p-1.5 transition-colors"
            >
              <X className="w-4 h-4 text-white" />
            </button>
          )}
        </div>
      ) : (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => inputRef.current?.click()}
          className={`
            cursor-pointer rounded-xl border-2 border-dashed p-12 text-center transition-all
            ${dragging
              ? 'border-glow/50 bg-glow/5'
              : 'border-white/15 hover:border-white/30 bg-white/3'
            }
          `}
        >
          <Upload className={`w-10 h-10 mx-auto mb-3 ${dragging ? 'text-glow' : 'text-white/30'}`} />
          <p className="text-sm text-white/60">
            拖放图片到此处，或 <span className="text-glow">点击选择文件</span>
          </p>
          <p className="text-xs text-white/30 mt-1">支持 JPG、PNG、WebP，最大 20MB</p>
        </div>
      )}

      {error && <p className="text-sm text-red-400">{error}</p>}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
        className="hidden"
      />
    </div>
  );
}

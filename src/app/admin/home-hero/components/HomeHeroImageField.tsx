'use client';

import Image from 'next/image';
import { useCallback, useRef, useState } from 'react';
import { showToast } from '@/components/Toast';
import { uploadHomeHeroImage } from '../utils/uploadHomeHeroImage';

type HomeHeroImageFieldProps = {
  label: string;
  helperText: string;
  imageUrl: string | null;
  disabled?: boolean;
  onChange: (imageUrl: string | null) => void;
  onUploadingChange?: (uploading: boolean) => void;
};

export function HomeHeroImageField({
  label,
  helperText,
  imageUrl,
  disabled = false,
  onChange,
  onUploadingChange,
}: HomeHeroImageFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const dragDepthRef = useRef(0);
  const [uploading, setUploading] = useState(false);
  const [isDragActive, setIsDragActive] = useState(false);

  const busy = disabled || uploading;

  const setUploadingState = useCallback(
    (next: boolean) => {
      setUploading(next);
      onUploadingChange?.(next);
    },
    [onUploadingChange],
  );

  const uploadFile = useCallback(
    async (file: File) => {
      if (!file.type.startsWith('image/')) {
        showToast('Please select an image file', 'warning');
        return;
      }

      try {
        setUploadingState(true);
        const url = await uploadHomeHeroImage(file);
        onChange(url);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Failed to upload image';
        showToast(message, 'error');
      } finally {
        setUploadingState(false);
      }
    },
    [onChange, setUploadingState],
  );

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    try {
      await uploadFile(file);
    } finally {
      if (event.target) {
        event.target.value = '';
      }
    }
  };

  const resetDragState = () => {
    dragDepthRef.current = 0;
    setIsDragActive(false);
  };

  const handleDragEnter = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (busy) {
      return;
    }
    dragDepthRef.current += 1;
    setIsDragActive(true);
  };

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
    if (dragDepthRef.current === 0) {
      setIsDragActive(false);
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (busy) {
      return;
    }
    event.dataTransfer.dropEffect = 'copy';
  };

  const handleDrop = async (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    resetDragState();

    if (busy) {
      return;
    }

    const file = event.dataTransfer.files?.[0];
    if (!file) {
      return;
    }

    await uploadFile(file);
  };

  return (
    <div className="min-w-0 w-full">
      <label className="mb-1 block text-sm font-medium text-gray-700">{label}</label>
      <p className="mb-3 text-sm text-gray-500">{helperText}</p>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        disabled={busy}
        onChange={handleFileChange}
      />
      <div
        role="button"
        tabIndex={busy ? -1 : 0}
        aria-disabled={busy}
        aria-label={`${label}: drop an image here or click to browse`}
        className={`relative h-40 w-full overflow-hidden rounded-supersudo border-2 border-dashed bg-gray-50 transition-colors ${
          isDragActive
            ? 'border-admin bg-admin-50'
            : 'border-gray-200 hover:border-gray-300'
        } ${busy ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'}`}
        onClick={() => {
          if (!busy) {
            inputRef.current?.click();
          }
        }}
        onKeyDown={(event) => {
          if (busy) {
            return;
          }
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt=""
            fill
            sizes="(max-width: 768px) 100vw, 50vw"
            className="pointer-events-none object-cover object-center"
          />
        ) : (
          <div className="pointer-events-none flex size-full flex-col items-center justify-center gap-1 px-4 text-center text-sm text-gray-400">
            <span>{isDragActive ? 'Drop image to upload' : 'Drag & drop an image here'}</span>
            <span className="text-xs text-gray-400">or click to browse</span>
          </div>
        )}
        {imageUrl && isDragActive ? (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-admin-50/85 text-sm font-medium text-admin-800">
            Drop to replace
          </div>
        ) : null}
        {uploading ? (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-white/70 text-sm text-gray-600">
            Uploading…
          </div>
        ) : null}
        {imageUrl && !uploading ? (
          <button
            type="button"
            className="absolute right-2 top-2 rounded-supersudo bg-white/90 px-2 py-1 text-xs font-medium text-red-600 shadow-sm hover:bg-white hover:text-red-800"
            disabled={busy}
            onClick={(event) => {
              event.stopPropagation();
              onChange(null);
            }}
          >
            Remove
          </button>
        ) : null}
      </div>
    </div>
  );
}

'use client';

import Image from 'next/image';
import type { CSSProperties } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import { Button, Input } from '@/app/admin/lib/adminShopUi';
import type { HomeHeroSlide } from '@/lib/home-hero';
import { HomeHeroImageField } from './HomeHeroImageField';

type HomeHeroSlideEditorProps = {
  slide: HomeHeroSlide;
  index: number;
  expanded: boolean;
  disabled?: boolean;
  onToggleExpanded: () => void;
  onChange: (slide: HomeHeroSlide) => void;
  onRemove: () => void;
  onUploadingChange?: (uploading: boolean) => void;
};

export function HomeHeroSlideEditor({
  slide,
  index,
  expanded,
  disabled = false,
  onToggleExpanded,
  onChange,
  onRemove,
  onUploadingChange,
}: HomeHeroSlideEditorProps) {
  const thumbUrl = slide.desktopImage?.url ?? slide.mobileImage?.url ?? null;
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: slide.id,
    disabled,
  });

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.85 : undefined,
    zIndex: isDragging ? 10 : undefined,
    position: 'relative',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`overflow-hidden rounded-supersudo border border-gray-200 bg-white ${
        isDragging ? 'shadow-md ring-1 ring-admin/30' : ''
      }`}
    >
      <div className="flex flex-wrap items-center gap-3 border-b border-gray-100 px-4 py-3">
        <button
          type="button"
          className={`flex size-8 shrink-0 touch-none items-center justify-center rounded-supersudo border transition-colors ${
            disabled
              ? 'cursor-not-allowed border-transparent text-gray-300'
              : isDragging
                ? 'cursor-grabbing border-admin bg-admin-50 text-admin'
                : 'cursor-grab border-transparent text-gray-400 hover:border-gray-200 hover:bg-gray-100 hover:text-gray-600'
          }`}
          aria-label={`Reorder slide ${index + 1}`}
          disabled={disabled}
          {...attributes}
          {...listeners}
        >
          <GripVertical className="size-4" aria-hidden="true" />
        </button>

        <button
          type="button"
          className="flex min-w-0 flex-1 items-center gap-3 text-left"
          onClick={onToggleExpanded}
          disabled={disabled}
          aria-expanded={expanded}
          aria-label={expanded ? 'Collapse slide' : 'Expand slide'}
        >
          <span
            className="flex size-8 shrink-0 items-center justify-center rounded-supersudo text-gray-500 hover:bg-gray-100 hover:text-gray-800"
            aria-hidden
          >
            <svg
              className={`h-4 w-4 transition-transform ${expanded ? 'rotate-90' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </span>
          <div className="relative size-12 shrink-0 overflow-hidden rounded-supersudo border border-gray-200 bg-gray-50">
            {thumbUrl ? (
              <Image
                src={thumbUrl}
                alt=""
                fill
                sizes="48px"
                className="object-cover object-center"
              />
            ) : (
              <div className="flex size-full items-center justify-center text-[10px] text-gray-400">
                Empty
              </div>
            )}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-gray-900">Slide {index + 1}</p>
            <p className="truncate text-xs text-gray-500">{slide.href || 'No CTA href'}</p>
          </div>
        </button>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-red-600 hover:text-red-800"
            disabled={disabled}
            onClick={onRemove}
            aria-label="Remove slide"
            title="Remove slide"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          </Button>
        </div>
      </div>

      {expanded ? (
        <div className="space-y-6 p-4">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <HomeHeroImageField
              label="Desktop image"
              helperText="Displayed on screens 900px and wider."
              imageUrl={slide.desktopImage?.url ?? null}
              disabled={disabled}
              onChange={(url) =>
                onChange({
                  ...slide,
                  desktopImage: url ? { url } : null,
                })
              }
              onUploadingChange={onUploadingChange}
            />
            <HomeHeroImageField
              label="Mobile image"
              helperText="Displayed below 900px. Desktop image is used when no mobile image is configured."
              imageUrl={slide.mobileImage?.url ?? null}
              disabled={disabled}
              onChange={(url) =>
                onChange({
                  ...slide,
                  mobileImage: url ? { url } : null,
                })
              }
              onUploadingChange={onUploadingChange}
            />
          </div>

          <div>
            <label
              htmlFor={`home-hero-href-${slide.id}`}
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              CTA href
            </label>
            <p className="mb-3 text-sm text-gray-500">
              Prefer an in-site path (e.g. /shop). Full mobee.am URLs also stay inside the site.
            </p>
            <Input
              id={`home-hero-href-${slide.id}`}
              type="text"
              value={slide.href ?? ''}
              onChange={(event) =>
                onChange({
                  ...slide,
                  href: event.target.value,
                })
              }
              placeholder="/shop?brand=apple (prefer in-site path)"
              disabled={disabled}
              className="max-w-xl"
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}

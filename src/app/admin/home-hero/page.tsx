'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { Card, Button } from '@/app/admin/lib/adminShopUi';
import { apiClient } from '@/lib/api-client';
import { fetchAdminReference } from '@/lib/admin/admin-reference-api';
import { invalidateAdminReferenceCache } from '@/lib/admin/admin-reference-cache';
import { showToast } from '@/components/Toast';
import { confirmDialog } from '@/components/ConfirmDialog';
import {
  createEmptyHomeHeroSlide,
  isValidHomeHeroHref,
  MAX_HOME_HERO_SLIDES,
  reorderHomeHeroSlides,
  type HomeHeroSettings,
  type HomeHeroSlide,
} from '@/lib/home-hero';
import { HomeHeroSlideEditor } from './components/HomeHeroSlideEditor';
import { ADMIN_SECONDARY_OUTLINE_BUTTON_EXTRA_CLASS } from '../admin-secondary-action-button.constants';

export default function HomeHeroAdminPage() {
  const [slides, setSlides] = useState<HomeHeroSlide[]>([]);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingCount, setUploadingCount] = useState(0);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetchAdminReference<HomeHeroSettings>('home-hero');
      const nextSlides = response.slides ?? [];
      setSlides(nextSlides);
      setExpandedIds(new Set(nextSlides[0] ? [nextSlides[0].id] : []));
    } catch {
      setSlides([]);
      setExpandedIds(new Set());
      showToast('Failed to load Home Hero settings', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchSettings();
  }, [fetchSettings]);

  const handleUploadingChange = (uploading: boolean) => {
    setUploadingCount((count) => Math.max(0, count + (uploading ? 1 : -1)));
  };

  const updateSlideAt = (index: number, slide: HomeHeroSlide) => {
    setSlides((prev) => prev.map((item, i) => (i === index ? slide : item)));
  };

  const handleAddSlide = () => {
    if (slides.length >= MAX_HOME_HERO_SLIDES) {
      showToast(`Maximum ${MAX_HOME_HERO_SLIDES} slides allowed`, 'warning');
      return;
    }

    const next = createEmptyHomeHeroSlide();
    setSlides((prev) => [...prev, next]);
    setExpandedIds((prev) => new Set([...prev, next.id]));
  };

  const handleRemoveSlide = async (index: number) => {
    const confirmed = await confirmDialog({
      title: 'Remove slide',
      message: `Remove Slide ${index + 1}? Changes are saved only after you press Save changes.`,
      variant: 'danger',
      confirmLabel: 'Remove',
    });
    if (!confirmed) {
      return;
    }

    setSlides((prev) => {
      const removed = prev[index];
      const next = prev.filter((_, i) => i !== index);
      if (removed) {
        setExpandedIds((ids) => {
          const copy = new Set(ids);
          copy.delete(removed.id);
          return copy;
        });
      }
      return next;
    });
  };

  const toggleExpanded = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) {
      return;
    }

    setSlides((current) =>
      reorderHomeHeroSlides(current, String(active.id), String(over.id)),
    );
  };

  const handleSave = async () => {
    for (let index = 0; index < slides.length; index += 1) {
      const href = slides[index]?.href?.trim() ?? '';
      if (href && !isValidHomeHeroHref(href)) {
        showToast(
          `Slide ${index + 1}: CTA href must start with / or be an absolute http:// or https:// URL`,
          'warning',
        );
        return;
      }
    }

    const payload: HomeHeroSettings = {
      slides: slides.map((slide) => ({
        id: slide.id,
        desktopImage: slide.desktopImage,
        mobileImage: slide.mobileImage,
        href: slide.href?.trim() ? slide.href.trim() : null,
      })),
    };

    setSaving(true);
    try {
      const saved = await apiClient.put<HomeHeroSettings>(
        '/api/v1/admin/settings/home-hero',
        payload,
      );
      invalidateAdminReferenceCache('home-hero');
      setSlides(saved.slides ?? []);
      showToast('Home Hero saved', 'success');
    } catch (err: unknown) {
      const apiError = err as { response?: { data?: { detail?: string } }; message?: string };
      const errorMessage =
        apiError.response?.data?.detail || apiError.message || 'Failed to save';
      showToast(errorMessage, 'error');
    } finally {
      setSaving(false);
    }
  };

  const busy = saving || uploadingCount > 0;
  const atMaxSlides = slides.length >= MAX_HOME_HERO_SLIDES;

  return (
    <div className="mx-auto w-full max-w-7xl">
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Home Hero</h1>
          <p className="mt-2 text-gray-600">
            Manage homepage carousel slides. Each slide has desktop image, mobile image, and CTA
            href.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          className={ADMIN_SECONDARY_OUTLINE_BUTTON_EXTRA_CLASS}
          disabled={busy || atMaxSlides}
          onClick={handleAddSlide}
        >
          Add slide
        </Button>
      </div>

      <Card className="p-6">
        {loading ? (
          <div className="py-8 text-center">
            <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-b-2 border-admin" />
            <p className="text-gray-600">Loading settings…</p>
          </div>
        ) : (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Home Hero Slides</h2>
              <p className="mt-1 text-sm text-gray-500">
                {slides.length} / {MAX_HOME_HERO_SLIDES} slides · drag the grip to reorder · order
                matches homepage carousel
              </p>
            </div>

            {slides.length === 0 ? (
              <p className="rounded-supersudo border border-dashed border-gray-200 bg-gray-50 px-4 py-8 text-center text-sm text-gray-500">
                No slides yet. Add a slide or save after loading defaults from the existing banners.
              </p>
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={slides.map((slide) => slide.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-4">
                    {slides.map((slide, index) => (
                      <HomeHeroSlideEditor
                        key={slide.id}
                        slide={slide}
                        index={index}
                        expanded={expandedIds.has(slide.id)}
                        disabled={busy}
                        onToggleExpanded={() => toggleExpanded(slide.id)}
                        onChange={(next) => updateSlideAt(index, next)}
                        onRemove={() => {
                          void handleRemoveSlide(index);
                        }}
                        onUploadingChange={handleUploadingChange}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            )}

            <div className="flex flex-wrap gap-3 pt-2">
              <Button variant="admin" onClick={handleSave} disabled={busy} className="px-6">
                {saving ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-b-2 border-white" />
                    Saving…
                  </span>
                ) : (
                  'Save changes'
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                className={ADMIN_SECONDARY_OUTLINE_BUTTON_EXTRA_CLASS}
                disabled={busy || atMaxSlides}
                onClick={handleAddSlide}
              >
                Add slide
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

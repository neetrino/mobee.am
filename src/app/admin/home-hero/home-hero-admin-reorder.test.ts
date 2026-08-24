import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('Home Hero admin drag reorder UI', () => {
  const pageSource = readFileSync(
    resolve(process.cwd(), 'src/app/admin/home-hero/page.tsx'),
    'utf8',
  );
  const editorSource = readFileSync(
    resolve(process.cwd(), 'src/app/admin/home-hero/components/HomeHeroSlideEditor.tsx'),
    'utf8',
  );

  it('does not render Move up / Move down controls', () => {
    expect(pageSource).not.toContain('Move up');
    expect(pageSource).not.toContain('Move down');
    expect(editorSource).not.toContain('Move up');
    expect(editorSource).not.toContain('Move down');
    expect(editorSource).not.toContain('onMoveUp');
    expect(editorSource).not.toContain('onMoveDown');
  });

  it('uses a handle-only drag grip with accessible label', () => {
    expect(editorSource).toContain('GripVertical');
    expect(editorSource).toContain('Reorder slide');
    expect(editorSource).toContain('useSortable');
    expect(editorSource).toContain('{...listeners}');
    expect(editorSource).toContain('cursor-grab');
  });

  it('wires sortable context and persists order only via Save payload', () => {
    expect(pageSource).toContain('DndContext');
    expect(pageSource).toContain('SortableContext');
    expect(pageSource).toContain('reorderHomeHeroSlides');
    expect(pageSource).toContain("'/api/v1/admin/settings/home-hero'");
    expect(pageSource).toContain('Save changes');
  });

  it('keeps image upload and CTA input interactive outside the drag handle', () => {
    expect(editorSource).toContain('HomeHeroImageField');
    expect(editorSource).toContain('CTA href');
    expect(editorSource).toContain('home-hero-href-');
  });
});

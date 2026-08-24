import type { PartialProductUpdateInput } from "@/lib/schemas/admin-product-update.schema";
import type { EditableProductSnapshot, EditableVariantSnapshot } from "./editableProductSnapshot";

export interface ProcessedVariantForSubmit {
  databaseVariantId?: string;
  price: number;
  compareAtPrice?: number | null;
  stock: number;
  sku: string;
  imageUrl?: string | null;
  published?: boolean;
  options?: Array<{ attributeKey: string; value: string; valueId?: string }>;
}

export interface BuildPartialUpdateInput {
  initial: EditableProductSnapshot;
  current: EditableProductSnapshot;
  processedVariants: ProcessedVariantForSubmit[];
  media: string[];
  locale?: string;
}

function sortIds(ids: string[]): string[] {
  return [...ids].sort();
}

function arraysEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) {
    return false;
  }
  return a.every((value, index) => value === b[index]);
}

function normalizeCompareAtPrice(value: string): string {
  return value.trim();
}

function buildBasicDiff(
  initial: EditableProductSnapshot,
  current: EditableProductSnapshot
): PartialProductUpdateInput["basic"] | undefined {
  const basic: NonNullable<PartialProductUpdateInput["basic"]> = {};

  if (initial.basic.title !== current.basic.title) {
    basic.title = current.basic.title;
  }
  if (initial.basic.slug !== current.basic.slug) {
    basic.slug = current.basic.slug;
  }
  if (initial.basic.descriptionHtml !== current.basic.descriptionHtml) {
    basic.descriptionHtml = current.basic.descriptionHtml || null;
  }

  return Object.keys(basic).length > 0 ? basic : undefined;
}

function buildProductDiff(
  initial: EditableProductSnapshot,
  current: EditableProductSnapshot
): PartialProductUpdateInput["product"] | undefined {
  const product: NonNullable<PartialProductUpdateInput["product"]> = {};

  if (initial.product.brandId !== current.product.brandId) {
    product.brandId = current.product.brandId;
  }
  if (initial.product.primaryCategoryId !== current.product.primaryCategoryId) {
    product.primaryCategoryId = current.product.primaryCategoryId;
  }
  if (!arraysEqual(initial.product.categoryIds, current.product.categoryIds)) {
    product.categoryIds = current.product.categoryIds;
  }
  if (initial.product.published !== current.product.published) {
    product.published = current.product.published;
  }
  if (initial.product.featured !== current.product.featured) {
    product.featured = current.product.featured;
  }
  if (initial.product.warrantyYears !== current.product.warrantyYears) {
    product.warrantyYears = current.product.warrantyYears;
  }

  return Object.keys(product).length > 0 ? product : undefined;
}

function buildLabelsDiff(
  initial: EditableProductSnapshot,
  current: EditableProductSnapshot
): PartialProductUpdateInput["labels"] | undefined {
  const initialById = new Map(
    initial.labels.filter((label) => label.id).map((label) => [label.id!, label])
  );
  const currentById = new Map(
    current.labels.filter((label) => label.id).map((label) => [label.id!, label])
  );

  const removeIds: string[] = [];
  for (const id of initialById.keys()) {
    if (!currentById.has(id)) {
      removeIds.push(id);
    }
  }

  const add: NonNullable<PartialProductUpdateInput["labels"]>["add"] = [];
  const update: NonNullable<PartialProductUpdateInput["labels"]>["update"] = [];

  for (const label of current.labels) {
    if (!label.id) {
      add.push({
        type: label.type,
        value: label.value,
        position: label.position,
        color: label.color ?? null,
      });
      continue;
    }

    const previous = initialById.get(label.id);
    if (!previous) {
      continue;
    }

    const changed =
      previous.type !== label.type ||
      previous.value !== label.value ||
      previous.position !== label.position ||
      (previous.color ?? null) !== (label.color ?? null);

    if (changed) {
      update.push({
        id: label.id,
        type: label.type,
        value: label.value,
        position: label.position,
        color: label.color ?? null,
      });
    }
  }

  if (removeIds.length === 0 && add.length === 0 && update.length === 0) {
    return undefined;
  }

  return {
    ...(removeIds.length > 0 ? { removeIds } : {}),
    ...(add.length > 0 ? { add } : {}),
    ...(update.length > 0 ? { update } : {}),
  };
}

function buildAttributesDiff(
  initialIds: string[],
  currentIds: string[]
): PartialProductUpdateInput["attributes"] | undefined {
  if (arraysEqual(initialIds, currentIds)) {
    return undefined;
  }

  const initialSet = new Set(initialIds);
  const currentSet = new Set(currentIds);

  const addIds = currentIds.filter((id) => !initialSet.has(id));
  const removeIds = initialIds.filter((id) => !currentSet.has(id));

  if (addIds.length === 0 && removeIds.length === 0) {
    return undefined;
  }

  return {
    ...(addIds.length > 0 ? { addIds } : {}),
    ...(removeIds.length > 0 ? { removeIds } : {}),
  };
}

function buildMediaDiff(
  initialMedia: string[],
  currentMedia: string[]
): PartialProductUpdateInput["media"] | undefined {
  if (arraysEqual(initialMedia, currentMedia)) {
    return undefined;
  }

  return { replace: currentMedia };
}

function buildVariantFieldUpdatesFromSnapshots(
  previous: EditableVariantSnapshot,
  current: EditableVariantSnapshot,
  processed: ProcessedVariantForSubmit
): Record<string, unknown> {
  const update: Record<string, unknown> = {};

  if (previous.price !== current.price) {
    update.price = processed.price;
  }

  const prevCompare = normalizeCompareAtPrice(previous.compareAtPrice);
  const nextCompare = normalizeCompareAtPrice(current.compareAtPrice);
  if (prevCompare !== nextCompare) {
    update.compareAtPrice = processed.compareAtPrice ?? null;
  }

  if (previous.stock !== current.stock) {
    update.stock = processed.stock;
  }

  if (previous.sku !== current.sku) {
    update.sku = processed.sku.trim();
  }

  const prevImage = previous.image ?? null;
  const nextImage = current.image ?? null;
  if (prevImage !== nextImage) {
    update.imageUrl = processed.imageUrl ?? null;
  }

  if (!arraysEqual(sortIds(previous.selectedValueIds), sortIds(current.selectedValueIds))) {
    update.options = processed.options;
  }

  return update;
}

function buildSimpleVariantUpdates(
  initial: EditableProductSnapshot,
  current: EditableProductSnapshot,
  processedVariants: ProcessedVariantForSubmit[]
): PartialProductUpdateInput["variants"] | undefined {
  const simpleInitial = initial.simple;
  const simpleCurrent = current.simple;
  const variant = processedVariants[0];

  if (!simpleInitial?.databaseVariantId || !simpleCurrent || !variant) {
    return undefined;
  }

  const previousVariantSnapshot: EditableVariantSnapshot = {
    databaseVariantId: simpleInitial.databaseVariantId,
    uiId: "simple",
    selectedValueIds: [],
    price: simpleInitial.price,
    compareAtPrice: simpleInitial.compareAtPrice,
    stock: simpleInitial.quantity,
    sku: simpleInitial.sku,
    image: null,
    published: true,
  };

  const currentVariantSnapshot: EditableVariantSnapshot = {
    databaseVariantId: simpleCurrent.databaseVariantId,
    uiId: "simple",
    selectedValueIds: [],
    price: simpleCurrent.price,
    compareAtPrice: simpleCurrent.compareAtPrice,
    stock: simpleCurrent.quantity,
    sku: simpleCurrent.sku,
    image: null,
    published: true,
  };

  const updateFields = buildVariantFieldUpdatesFromSnapshots(
    previousVariantSnapshot,
    currentVariantSnapshot,
    variant
  );

  if (Object.keys(updateFields).length === 0) {
    return undefined;
  }

  return {
    update: [{ id: simpleInitial.databaseVariantId, ...updateFields }],
  };
}

function buildVariableVariantUpdates(
  initial: EditableProductSnapshot,
  current: EditableProductSnapshot,
  processedVariants: ProcessedVariantForSubmit[]
): PartialProductUpdateInput["variants"] | undefined {
  const initialByDbId = new Map<string, EditableVariantSnapshot>();
  for (const variant of initial.variants) {
    if (variant.databaseVariantId) {
      initialByDbId.set(variant.databaseVariantId, variant);
    }
  }

  const currentByDbId = new Map<string, EditableVariantSnapshot>();
  for (const variant of current.variants) {
    if (variant.databaseVariantId) {
      currentByDbId.set(variant.databaseVariantId, variant);
    }
  }

  const processedByDbId = new Map<string, ProcessedVariantForSubmit>();
  for (const variant of processedVariants) {
    if (variant.databaseVariantId) {
      processedByDbId.set(variant.databaseVariantId, variant);
    }
  }

  const create: NonNullable<PartialProductUpdateInput["variants"]>["create"] = [];
  const update: NonNullable<PartialProductUpdateInput["variants"]>["update"] = [];

  for (const [dbId, currentVariant] of currentByDbId.entries()) {
    const previousVariant = initialByDbId.get(dbId);
    const processed = processedByDbId.get(dbId);
    if (!previousVariant || !processed) {
      continue;
    }

    const fields = buildVariantFieldUpdatesFromSnapshots(previousVariant, currentVariant, processed);
    if (Object.keys(fields).length > 0) {
      update.push({ id: dbId, ...fields });
    }
  }

  const newCurrentVariants = current.variants.filter((variant) => !variant.databaseVariantId);
  const newProcessedVariants = processedVariants.filter((variant) => !variant.databaseVariantId);

  newCurrentVariants.forEach((_, index) => {
    const processed = newProcessedVariants[index];
    if (!processed) {
      return;
    }

    create.push({
      price: processed.price,
      stock: processed.stock,
      sku: processed.sku.trim() || undefined,
      compareAtPrice: processed.compareAtPrice ?? null,
      imageUrl: processed.imageUrl ?? null,
      published: processed.published ?? true,
      options: processed.options,
    });
  });

  const deleteIds = [...initialByDbId.keys()].filter((id) => !currentByDbId.has(id));

  if (create.length === 0 && update.length === 0 && deleteIds.length === 0) {
    return undefined;
  }

  return {
    ...(create.length > 0 ? { create } : {}),
    ...(update.length > 0 ? { update } : {}),
    ...(deleteIds.length > 0 ? { deleteIds } : {}),
  };
}

/**
 * Builds a partial PUT payload containing only changed sections.
 */
export function buildPartialProductUpdatePayload(
  input: BuildPartialUpdateInput
): PartialProductUpdateInput {
  const { initial, current, processedVariants, media } = input;

  const payload: PartialProductUpdateInput = {
    locale: input.locale ?? "en",
  };

  const basic = buildBasicDiff(initial, current);
  if (basic) {
    payload.basic = basic;
  }

  const product = buildProductDiff(initial, current);
  if (product) {
    payload.product = product;
  }

  const labels = buildLabelsDiff(initial, current);
  if (labels) {
    payload.labels = labels;
  }

  const attributes = buildAttributesDiff(initial.attributeIds, current.attributeIds);
  if (attributes) {
    payload.attributes = attributes;
  }

  const mediaDiff = buildMediaDiff(initial.media, media);
  if (mediaDiff) {
    payload.media = mediaDiff;
  }

  const variants =
    current.productType === "simple"
      ? buildSimpleVariantUpdates(initial, current, processedVariants)
      : buildVariableVariantUpdates(initial, current, processedVariants);
  if (variants) {
    payload.variants = variants;
  }

  return payload;
}

/**
 * Returns true when the partial payload contains any DB write operations.
 */
export function hasPartialUpdateWork(payload: PartialProductUpdateInput): boolean {
  if (payload.basic && Object.keys(payload.basic).length > 0) {
    return true;
  }
  if (payload.product && Object.keys(payload.product).length > 0) {
    return true;
  }
  if (payload.labels) {
    const { add, update, removeIds, replace } = payload.labels;
    if (
      replace !== undefined ||
      (add?.length ?? 0) > 0 ||
      (update?.length ?? 0) > 0 ||
      (removeIds?.length ?? 0) > 0
    ) {
      return true;
    }
  }
  if (payload.attributes) {
    const { addIds, removeIds, replaceIds } = payload.attributes;
    if (
      replaceIds !== undefined ||
      (addIds?.length ?? 0) > 0 ||
      (removeIds?.length ?? 0) > 0
    ) {
      return true;
    }
  }
  if (payload.media?.replace !== undefined) {
    return true;
  }
  if (payload.variants) {
    const { create, update, deleteIds } = payload.variants;
    if ((create?.length ?? 0) > 0 || (update?.length ?? 0) > 0 || (deleteIds?.length ?? 0) > 0) {
      return true;
    }
  }
  return false;
}

export { sortIds, arraysEqual };

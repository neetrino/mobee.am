-- Default strip images for home/header category tiles (same paths as previous static fallbacks).
-- Only rows with empty `media` are updated so admin-uploaded images are not overwritten.

UPDATE "categories" AS c
SET "media" = ARRAY[jsonb_build_object('url', '/images/home/category-strip/computers.png')]
WHERE cardinality(COALESCE(c."media", ARRAY[]::jsonb[])) = 0
  AND EXISTS (
    SELECT 1 FROM "category_translations" ct
    WHERE ct."categoryId" = c."id"
      AND lower(ct."slug") IN (
        'computers', 'computer', 'pcs', 'pc', 'laptops', 'laptop', 'notebooks', 'notebook',
        'hamakargichner', 'hamakargich'
      )
  );

UPDATE "categories" AS c
SET "media" = ARRAY[jsonb_build_object('url', '/images/home/category-strip/phones.png')]
WHERE cardinality(COALESCE(c."media", ARRAY[]::jsonb[])) = 0
  AND EXISTS (
    SELECT 1 FROM "category_translations" ct
    WHERE ct."categoryId" = c."id"
      AND lower(ct."slug") IN (
        'phones', 'phone', 'iphone', 'smartphones', 'smartphone', 'herakhosner',
        'mobile-phones', 'cell-phones'
      )
  );

UPDATE "categories" AS c
SET "media" = ARRAY[jsonb_build_object('url', '/images/home/category-strip/tablets.png')]
WHERE cardinality(COALESCE(c."media", ARRAY[]::jsonb[])) = 0
  AND EXISTS (
    SELECT 1 FROM "category_translations" ct
    WHERE ct."categoryId" = c."id"
      AND lower(ct."slug") IN (
        'tablets', 'tablet', 'planshetner', 'planshety', 'ipad'
      )
  );

UPDATE "categories" AS c
SET "media" = ARRAY[jsonb_build_object('url', '/images/home/category-strip/watches.png')]
WHERE cardinality(COALESCE(c."media", ARRAY[]::jsonb[])) = 0
  AND EXISTS (
    SELECT 1 FROM "category_translations" ct
    WHERE ct."categoryId" = c."id"
      AND lower(ct."slug") IN (
        'watches', 'watch', 'smartwatches', 'smartwatch', 'jamacuyjer', 'jamacuyc',
        'clock', 'clocks'
      )
  );

UPDATE "categories" AS c
SET "media" = ARRAY[jsonb_build_object('url', '/images/home/category-strip/headphones.png')]
WHERE cardinality(COALESCE(c."media", ARRAY[]::jsonb[])) = 0
  AND EXISTS (
    SELECT 1 FROM "category_translations" ct
    WHERE ct."categoryId" = c."id"
      AND lower(ct."slug") IN (
        'headphones', 'headphone', 'earphones', 'earbuds', 'headsets', 'headset',
        'akanjakalner', 'akanjakal'
      )
  );

UPDATE "categories" AS c
SET "media" = ARRAY[jsonb_build_object('url', '/images/home/category-strip/accessories.png')]
WHERE cardinality(COALESCE(c."media", ARRAY[]::jsonb[])) = 0
  AND EXISTS (
    SELECT 1 FROM "category_translations" ct
    WHERE ct."categoryId" = c."id"
      AND lower(ct."slug") IN (
        'accessories', 'accessory', 'aksessuary', 'aksesuarner', 'aksessuarner'
      )
  );

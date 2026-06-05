-- Assign default home strip images to categories that have a slot but no media yet.
UPDATE "categories" AS c
SET "media" = ARRAY[jsonb_build_object('url', '/images/home/category-strip/computers.png')]
WHERE c."homeStripPosition" = 1
  AND cardinality(COALESCE(c."media", ARRAY[]::jsonb[])) = 0;

UPDATE "categories" AS c
SET "media" = ARRAY[jsonb_build_object('url', '/images/home/category-strip/phones.png')]
WHERE c."homeStripPosition" = 2
  AND cardinality(COALESCE(c."media", ARRAY[]::jsonb[])) = 0;

UPDATE "categories" AS c
SET "media" = ARRAY[jsonb_build_object('url', '/images/home/category-strip/tablets.png')]
WHERE c."homeStripPosition" = 3
  AND cardinality(COALESCE(c."media", ARRAY[]::jsonb[])) = 0;

UPDATE "categories" AS c
SET "media" = ARRAY[jsonb_build_object('url', '/images/home/category-strip/watches.png')]
WHERE c."homeStripPosition" = 4
  AND cardinality(COALESCE(c."media", ARRAY[]::jsonb[])) = 0;

UPDATE "categories" AS c
SET "media" = ARRAY[jsonb_build_object('url', '/images/home/category-strip/headphones.png')]
WHERE c."homeStripPosition" = 5
  AND cardinality(COALESCE(c."media", ARRAY[]::jsonb[])) = 0;

UPDATE "categories" AS c
SET "media" = ARRAY[jsonb_build_object('url', '/images/home/category-strip/accessories.png')]
WHERE c."homeStripPosition" = 6
  AND cardinality(COALESCE(c."media", ARRAY[]::jsonb[])) = 0;

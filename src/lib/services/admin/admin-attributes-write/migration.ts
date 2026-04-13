import { db } from "@white-shop/db";
import { logger } from "../../../utils/logger";

/**
 * Ensure colors and imageUrl columns exist in attribute_values table
 * This is a runtime migration that runs automatically when needed
 */
export async function ensureColorsColumnsExist(): Promise<void> {
  try {
    // Check if colors column exists
    const colorsCheck = await db.$queryRawUnsafe(`
      SELECT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public'
        AND table_name = 'attribute_values' 
        AND column_name = 'colors'
      ) as exists;
    `) as Array<{ exists: boolean }>;

    const colorsExists = colorsCheck[0]?.exists || false;

    // Check if imageUrl column exists
    const imageUrlCheck = await db.$queryRawUnsafe(`
      SELECT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public'
        AND table_name = 'attribute_values' 
        AND column_name = 'imageUrl'
      ) as exists;
    `) as Array<{ exists: boolean }>;

    const imageUrlExists = imageUrlCheck[0]?.exists || false;

    if (colorsExists && imageUrlExists) {
      return; // Columns already exist
    }

    logger.info('Adding missing colors/imageUrl columns...');

    // Add colors column if it doesn't exist
    if (!colorsExists) {
      await db.$executeRawUnsafe(`
        ALTER TABLE "attribute_values" ADD COLUMN IF NOT EXISTS "colors" JSONB DEFAULT '[]'::jsonb;
      `);
      logger.info('Added "colors" column');
    }

    // Add imageUrl column if it doesn't exist
    if (!imageUrlExists) {
      await db.$executeRawUnsafe(`
        ALTER TABLE "attribute_values" ADD COLUMN IF NOT EXISTS "imageUrl" TEXT;
      `);
      logger.info('Added "imageUrl" column');
    }

    // Create index if it doesn't exist
    await db.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "attribute_values_colors_idx" 
      ON "attribute_values" USING GIN ("colors");
    `);

    logger.info('Migration completed successfully!');
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('Migration error', { error: errorMessage });
    throw error; // Re-throw to handle in calling code
  }
}





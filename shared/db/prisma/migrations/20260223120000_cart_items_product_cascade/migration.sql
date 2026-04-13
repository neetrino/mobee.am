-- AlterTable: cart_items: allow deleting a product by cascading delete to cart_items
ALTER TABLE "cart_items" DROP CONSTRAINT IF EXISTS "cart_items_productId_fkey";
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_productId_fkey" 
  FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

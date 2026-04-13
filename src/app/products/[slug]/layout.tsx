import type { Metadata } from "next";
import { productsService } from "@/lib/services/products.service";

const DEFAULT_TITLE = "Product";
const SITE_NAME = "WhiteShop.am";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  try {
    const product = await productsService.findBySlug(slug, "en");
    const title = product.seo?.title || product.title || DEFAULT_TITLE;
    const description = product.seo?.description || product.description || null;
    const firstImage =
      Array.isArray(product.media) && product.media.length > 0
        ? String(product.media[0])
        : null;

    return {
      title: `${title} | ${SITE_NAME}`,
      description: description ?? undefined,
      openGraph: {
        title,
        description: description ?? undefined,
        ...(firstImage && { images: [{ url: firstImage, alt: title }] }),
        type: "website",
      },
      twitter: {
        card: "summary_large_image",
        title,
        description: description ?? undefined,
        ...(firstImage && { images: [firstImage] }),
      },
    };
  } catch {
    return {
      title: `${DEFAULT_TITLE} | ${SITE_NAME}`,
    };
  }
}

export default function ProductSlugLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

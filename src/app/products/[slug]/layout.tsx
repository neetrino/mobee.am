import type { Metadata } from "next";
import { getCachedProductBySlug } from "@/lib/services/products-slug-cached";
import {
  SITE_APP_ICON_HEIGHT_PX,
  SITE_APP_ICON_PATH,
  SITE_APP_ICON_WIDTH_PX,
  SITE_BRAND_NAME,
} from "@/lib/brand.constants";

const DEFAULT_TITLE = "Product";
const SITE_NAME = SITE_BRAND_NAME;

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  try {
    const { result: product } = await getCachedProductBySlug(slug, "en");
    const title = product.seo?.title || product.title || DEFAULT_TITLE;
    const description = product.seo?.description || product.description || null;
    const firstImage =
      Array.isArray(product.media) && product.media.length > 0
        ? String(product.media[0])
        : null;
    const previewImage = firstImage
      ? { url: firstImage, alt: title }
      : {
          url: SITE_APP_ICON_PATH,
          width: SITE_APP_ICON_WIDTH_PX,
          height: SITE_APP_ICON_HEIGHT_PX,
          alt: SITE_BRAND_NAME,
        };

    return {
      title: `${title} | ${SITE_NAME}`,
      description: description ?? undefined,
      openGraph: {
        title,
        description: description ?? undefined,
        images: [previewImage],
        type: "website",
      },
      twitter: {
        card: "summary_large_image",
        title,
        description: description ?? undefined,
        images: [previewImage.url],
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

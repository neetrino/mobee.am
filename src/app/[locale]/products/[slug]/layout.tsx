import type { Metadata } from "next";
import { getCachedProductBySlug } from "@/lib/services/products-slug-cached";
import { getSiteAssetUrl } from "@/lib/site-url";
import {
  SITE_BRAND_NAME,
  SITE_SHARE_IMAGE_HEIGHT_PX,
  SITE_SHARE_IMAGE_PATH,
  SITE_SHARE_IMAGE_WIDTH_PX,
} from "@/lib/brand.constants";

export const dynamic = "force-dynamic";

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
          url: getSiteAssetUrl(SITE_SHARE_IMAGE_PATH),
          width: SITE_SHARE_IMAGE_WIDTH_PX,
          height: SITE_SHARE_IMAGE_HEIGHT_PX,
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

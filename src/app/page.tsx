import dynamic from 'next/dynamic';
import { HeroCarousel } from '../components/HeroCarousel';
import { TopCategories } from '../components/TopCategories';
import { FeaturedIntroHeading } from '../components/FeaturedIntroHeading';
import { HomeProductSections } from '../components/FeaturedProductsTabs';

const PartnerLogosSection = dynamic(
  () =>
    import('../components/PartnerLogosSection').then((m) => ({
      default: m.PartnerLogosSection,
    })),
  {
    loading: () => (
      <div
        className="mx-auto h-24 w-full max-w-6xl animate-pulse rounded-lg bg-gray-100"
        aria-hidden
      />
    ),
  },
);

export default async function HomePage() {

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-white">
      {/* Hero Section - Full Width */}
      <section className="bg-white">
        <HeroCarousel />
      </section>

      {/* Top Categories */}
      <TopCategories />

      <FeaturedIntroHeading />

      {/* Stacked curated home product sections */}
      <HomeProductSections />

      <PartnerLogosSection />
    </div>
  );
}


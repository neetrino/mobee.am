import { HeroCarousel } from '../components/HeroCarousel';
import { TopCategories } from '../components/TopCategories';
import { FeaturedIntroHeading } from '../components/FeaturedIntroHeading';
import { HomeProductSections } from '../components/FeaturedProductsTabs';
import { PartnerLogosSection } from '../components/PartnerLogosSection';

export default async function HomePage() {

  return (
    <div className="min-h-screen">
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


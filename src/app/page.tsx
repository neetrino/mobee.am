import { HeroCarousel } from '../components/HeroCarousel';
import { FeaturesSection } from '../components/FeaturesSection';
import { TopCategories } from '../components/TopCategories';
import { FeaturedIntroHeading } from '../components/FeaturedIntroHeading';
import { FeaturedProductsTabs } from '../components/FeaturedProductsTabs';
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

      {/* Featured Products with Tabs */}
      <FeaturedProductsTabs />

      <PartnerLogosSection />

      {/* Features Section */}
      <FeaturesSection />
    </div>
  );
}


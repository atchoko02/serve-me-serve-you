import { HeroSection } from '../components/landing/HeroSection';
import { ProblemStatement } from '../components/landing/ProblemStatement';
import { Features } from '../components/landing/Features';
import { HowItWorks } from '../components/landing/HowItWorks';
import { BusinessValue } from '../components/landing/BusinessValue';
import { FinalCTA } from '../components/landing/FinalCTA';
import { Footer } from '../components/landing/Footer';

export function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground transition-colors">
      <HeroSection />
      <ProblemStatement />
      <Features />
      <HowItWorks />
      <BusinessValue />
      <FinalCTA />
      <Footer />
    </div>
  );
}

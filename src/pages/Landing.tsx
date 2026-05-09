import React from 'react';
import Navbar from '@/components/Navbar';
import Hero from '@/components/landing/Hero';
import Features from '@/components/landing/Features';
import HowItWorks from '@/components/landing/HowItWorks';
import Integrations from '@/components/landing/Integrations';
import CTASection from '@/components/landing/CTASection';
import Footer from '@/components/Footer';

const Landing: React.FC = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar variant="landing" />
      <Hero />
      <Features />
      <HowItWorks />
      <Integrations />
      <CTASection />
      <Footer />
    </div>
  );
};

export default Landing;

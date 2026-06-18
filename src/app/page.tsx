import Hero from "@/components/sections/Hero";
import Features from "@/components/sections/Features";
import HowItWorks from "@/components/sections/HowItWorks";
import LatestPosts from "@/components/sections/LatestPosts";
import CTA from "@/components/sections/CTA";

export default function HomePage() {
  return (
    <div className="overflow-x-clip">
      <Hero />
      <Features />
      <HowItWorks />
      <LatestPosts />
      <CTA />
    </div>
  );
}

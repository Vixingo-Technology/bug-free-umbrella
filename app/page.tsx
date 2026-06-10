import Navbar from "@/components/navbar";
import Hero from "@/components/hero";
import About from "@/components/about";
import Benefits from "@/components/benefits";
import Journey from "@/components/journey";
import Techniques from "@/components/techniques";
import Events from "@/components/events";
import Branches from "@/components/branches";
import Gallery from "@/components/gallery";
import Testimonials from "@/components/testimonials";
import CTA from "@/components/cta";
import Footer from "@/components/footer";

export default function Home() {
  return (
    <main className="min-h-screen bg-bg-deep w-full overflow-hidden">
      <Navbar />
      <Hero />
      <About />
      <Benefits />
      <Journey />
      <Techniques />
      <Events />
      <Branches />
      <Gallery />
      <Testimonials />
      <CTA />
      <Footer />
    </main>
  );
}
